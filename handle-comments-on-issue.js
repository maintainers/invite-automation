module.exports = handleCommentingOnIssue;
const { Octokit } = require("@octokit/core");
const { createAppAuth } = require("@octokit/auth-app");
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 * 
 * 
 */
// create a commit
// async function createCommit(octokit, context) {
//     await octokit.request('/repos/{owner}/{repo}/git/commits', {
//         owner: context.payload.repository.owner.login,
//         repo: context.payload.repository.name,
//         message: 'This is a test commit',
//         tree: context.payload.repository.default_branch,
//         parents: [context.payload.comment.commit_id]
//     })
// }
async function checkCommentBody(comment, octokit, context) {
    const commentBody = comment.body.toUpperCase();
    const issueNumber = context.payload.issue.number
    if (commentBody === 'APPROVED') {
        console.log('invitation approved')
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: 'maintainers',
            repo: 'invite-automation',
            issue_number: issueNumber,
            body: 'Congratulations! Your request has been approved. It may take 48 hours for you to be added to the organization. Thank you for your patience.'
        })
        console.log('opening a pull request')
        // open a pull request
        // await createCommit(octokit, context)
    } else {
        console.log('this pending invitation is not yet approved')
    }
}

async function checkCommentAuthor(comment, octokit, context) {
    const admins = ['karasowles', 'bdougie', 'blackgirlbytes'];
    const commentAuthor = comment.user.login
    if (admins.includes(commentAuthor)) {
        await checkCommentBody(comment, octokit, context)
    } else {
        console.log('this user has no approval privileges')
    }
}

async function handleCommentingOnIssue(app, context) {
    const { appIdData, privateKeyData, clientIdData, clientSecretData } = await require("./ssm-handler");
    const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: await appIdData,
            privateKey: await privateKeyData,
            clientId: await clientIdData,
            clientSecret: await clientSecretData,
            installationId: context.payload.installation.id
        },
    });
    const comment = context.payload.comment
    await checkCommentAuthor(comment, octokit, context)
}
