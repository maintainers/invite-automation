module.exports = handleCommentingOnIssue;
const { Octokit } = require("@octokit/core");
const { createPullRequest } = require("octokit-plugin-create-pull-request");
// require getFile from handle-files.js

const handleFiles = require('../file-handlers/handle-files.js')
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 * 
 * 
 */
async function pendingApprovalComment(octokit, context) {
    const issueNumber = context.payload.issue.number
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: 'maintainers',
        repo: 'invite-automation',
        issue_number: issueNumber,
        body: `We received your request to join the maintainers org. Please wait for an admin to approve your request.`
    }).catch(async (err) => {
        if (err) {
            console.log(err.status, err);
        }
    });
}

async function checkCommentBody(comment, octokit, context) {
    const commentBody = comment.body.toUpperCase();
    const issueNumber = context.payload.issue.number

    // use regex to only get the users name from the title
    const pendingMaintainerArray = context.payload.issue.title.match(/\@(.*)/)
    const pendingMaintainerHandle = pendingMaintainerArray[0]
    const pendingMaintainerUsername = pendingMaintainerArray[1]

    if (commentBody === 'APPROVED') {
        console.log('invitation approved')
        const result = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: 'maintainers',
            repo: 'invite-automation',
            issue_number: issueNumber,
            body: `Congratulations ${pendingMaintainerHandle}! Your request has been approved. It may take 48 hours for you to be added to the organization. Thank you for your patience.`
        }).catch(async (err) => {
            if (err) {
                console.log(err.status, err);
            }
        });
        if (result && result.status === 201) {
            console.log('retrieving file contents')
            await handleFiles(octokit, pendingMaintainerUsername)
        }
    } else {
        console.log('this pending invitation is not yet approved')

    }
}

async function checkCommentAuthor(comment, octokit, context) {
    const admins = ['karasowles', 'bdougie', 'blackgirlbytes'];
    const pendingMaintainerArray = context.payload.issue.title.match(/\@(.*)/)
    const pendingMaintainerUsername = pendingMaintainerArray[1]


    const commentAuthor = comment.user.login
    if (admins.includes(commentAuthor)) {
        console.log('an admin commented on this issue')
        await checkCommentBody(comment, octokit, context)
    } else if (commentAuthor === pendingMaintainerUsername) {
        console.log('this is not a comment from an admin')
        await pendingApprovalComment(octokit, context)
    }
}


async function handleCommentingOnIssue(app, context) {
    const MyOctokit = Octokit.plugin(createPullRequest);
    const { personalAccessTokenData } = await require("./ssm-handler");
    const octokit = new MyOctokit({
        // pass in GitHub personal access token
        auth: await personalAccessTokenData,
    });

    console.log(await personalAccessTokenData)
    const comment = context.payload.comment
    await checkCommentAuthor(comment, octokit, context)
}
