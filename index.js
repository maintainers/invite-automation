module.exports = invite;

const handleStarringRepo = require("./webhook-handlers/handle-starring.js");
const handleCommentingOnIssue = require("./webhook-handlers/handle-comments-on-issue.js");

/**
 * @param {import('probot').Probot} app
 */
function invite(app) {
  // listen to all relevant star event actions
  app.on(
    [
      "star",
    ],
    handleStarringRepo.bind(null, app)
  );

  app.on(
    [
      "issue_comment.created",
    ],
    handleCommentingOnIssue.bind(null, app)
  );
}