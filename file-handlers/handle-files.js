module.exports = handleFiles;

async function getFileContents(octokit, repo) {
    console.log('getting file contents from entitlements repo')
    let encodedContent;
    const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'github',
        repo: repo,
        path: 'github.com/maintainers/org/member.txt'
    }).catch(async (err) => {
        if (err) {
            console.log(err.status, err);
        }
    });

    if (result) {
        encodedContent = result.data.content
    }
    return encodedContent;
}

async function getLatestBlobSha(octokit, repo) {
    console.log('getting latest blob sha from devrel repo')
    let blobSha;
    const result = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: 'github',
        repo: repo,
        path: 'automation/maintainers/members.txt'
    }).catch(async (err) => {
        if (err) {
            console.log(err.status, err);
        }
    });
    if (result) {
        blobSha = result.data.sha
    }
    return blobSha
}

async function commitLatestFileToDevRelRepo(octokit, repo, encodedContent, blobSha) {
    console.log('committing to devrel repo')
    const result = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner: 'github',
        repo: repo,
        path: 'automation/maintainers/members.txt',
        message: 'updated members.txt to latest version',
        content: encodedContent,
        sha: blobSha,
        author: {
            name: 'blackgirlbytes',
            email: 'blackgirlbytes@github.com',
        },
        committer: {
            name: 'blackgirlbytes',
            email: 'blackgirlbytes@github.com',
        },
    }).catch(async (err) => {
        if (err) {
            console.log(err.status, err);
        }
    });
    return result.data.commit.sha
}

async function decodeFileContents(encodedFileContents) {
    const decoded = Buffer.from(encodedFileContents, 'base64').toString('utf-8');
    return decoded
}

async function transformFileContentsIntoArray(decodedString) {
    const decodedArray = decodedString.split("username = ");
    let arrayOfMembers = decodedArray.slice(1, decodedArray.length - 1);
    return arrayOfMembers
}

async function groupMembersByLetter(arrayOfMembers) {
    const membersGroupedByLetter = arrayOfMembers.reduce((result, word) => {
        // get the first letter. (this assumes no empty words in the list)
        const letter = word[0].toLowerCase();
        // ensure the result has an entry for this letter
        result[letter] = result[letter] || [];
        // add the word to the letter index
        result[letter].push(word);
        // return the updated result
        return result;
    }, {})
    return membersGroupedByLetter
}

async function addNewMember(membersGroupedByLetter, pendingMaintainerUsername) {
    const newMember = pendingMaintainerUsername + '\n'
    const firstLetter = newMember[0].toLowerCase()
    membersGroupedByLetter[firstLetter] = membersGroupedByLetter[firstLetter] || []
    membersGroupedByLetter[firstLetter].push(newMember)

    return membersGroupedByLetter
}

async function transformArrayIntoFile(listWithNewMember, decodedString) {
    const updatedMemberArray = Object.values(listWithNewMember).reduce((result, value) => {
        return result.concat(value)
    }
        , [])

    const decodedArray = decodedString.split("username = ");
    updatedMemberArray.unshift(decodedArray[0])
    updatedMemberArray.push(decodedArray[decodedArray.length - 1])

    // // turn into a string
    const updatedFileContents = updatedMemberArray.join('username = ')
    // Create buffer object, specifying utf8 as encoding
    console.log('updated file contents', updatedFileContents)
    return updatedFileContents
}

async function createPullRequestToDevRel(octokit, updatedFileContents, pendingMaintainerUsername) {
    //remove space and symbols from date object javascript
    const timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9]/g, '')
    await octokit.createPullRequest({
        owner: "github",
        repo: "devrel",
        title: `add-${pendingMaintainerUsername}-to-members.txt`,
        body: `add-${pendingMaintainerUsername}-to-members.txt in entitlements`,
        base: "main",
        head: `add-${pendingMaintainerUsername}-${timestamp}`,
        changes: [
            {
                files: {
                    "automation/maintainers/members.txt": ({ exists, encoding, content }) => {
                        // do not create the file if it does not exist
                        if (!exists) return null;
                        let randomWord = Buffer.from(updatedFileContents, "utf8").toString('base64');
                        return Buffer.from(randomWord, encoding)
                            .toString("utf-8")
                    },
                },
                commit:
                    `adding ${pendingMaintainerUsername} to maintainers org`,
            },
        ],
    }
    ).catch(async (err) => {
        if (err) {
            console.log(err.status, err);
        }
    }
    );
}

async function handleFiles(octokit, pendingMaintainerUsername) {
    const encodedFileContents = await getFileContents(octokit, 'entitlements')
    const blobSha = await getLatestBlobSha(octokit, 'devrel')
    if (encodedFileContents && blobSha) {
        await commitLatestFileToDevRelRepo(octokit, 'devrel', encodedFileContents, blobSha);
        const decodedString = await decodeFileContents(encodedFileContents);
        const arrayOfMembers = await transformFileContentsIntoArray(decodedString);
        const membersGroupedByLetter = await groupMembersByLetter(arrayOfMembers);
        const listWithNewMember = await addNewMember(membersGroupedByLetter, pendingMaintainerUsername)
        const updatedFileContents = await transformArrayIntoFile(listWithNewMember, decodedString)
        await createPullRequestToDevRel(octokit, updatedFileContents, pendingMaintainerUsername)
    }
}