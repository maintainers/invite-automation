const { Octokit } = require("octokit");
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  appId: process.env.APP_ID
})
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 * 
 * 
 */

async function checkForEmployee(user) {
  let employeeStatus
  const result = await octokit.request('GET /orgs/{org}/teams/{team_slug}/memberships/{username}', {
    org: 'github',
    team_slug: 'employees',
    username: user
  }).catch(err => {
    if (err.status === 404) {
      console.log('user is not an employee')
      employeeStatus = false
    }
  });
  if (result) {
    if (result.status === 200) {
      console.log("user is employee of github", result.status);
      return true;
    }
  }
  return employeeStatus;
}

async function addUserToTeam(user, employeeStatus) {
  const team_slug = employeeStatus ? 'github-employees' : 'members';
  console.log(team_slug, 'team slug');
  const result = await octokit.request('PUT /orgs/{org}/teams/{team_slug}/memberships/{username}', {
    org: 'maintainers',
    team_slug: team_slug,
    username: user,
    role: 'member'
  }).catch(err => {
    if (err.status === 403) {
      console.log(`Forbidden ${err.status}`)
    }
    if (err.status === 422) {
      console.log(`Unprocessable Entity ${err.status}`);
    }
  }
  );
  if (result) {
    if (result.status === 200) {
      console.log("user added to team", result.status);
    }
  }
}

async function openIssue(user) {
  const result = await octokit.request('POST /repos/{owner}/{repo}/issues', {
    owner: 'maintainers',
    repo: 'invite-automation',
    labels: ['pending-invitation'],
    title: `Pending invitation request for: @${user}`,
    body: `Please take actions on adding the requested user to this repo:
    
- [ ] Assign this ticket to the correct user
- [ ] Confirm that @${user} should be added as a member
- [ ] Send an invite
*This issue body is just a placeholder and will change as this project grows*`,
  }).catch(err => {
    if (err.status === 403) {
      console.log(`Forbidden ${err.status}`)
    }
    if (err.status === 422) {
      console.log(`Unprocessable Entity ${err.status}`);
    }
  }
  );

  if (result === 201) {
    console.log("opened an issue", result);
  }
}

async function assignTeams(user) {
  const result = await octokit.request("GET /orgs/{org}/members/{username}", {
    username: user,
    org: "maintainers",
  }).catch(err => {
    if (err.status === 404) {
      console.log("user is not a team member but part of the org", err.status);
      openIssue(user);
    }
  });

  if (result) {
    if (result.status === 204) {
      console.log("user is part of org", result);
      const employeeStatus = await checkForEmployee(user);
      console.log(employeeStatus, 'employee status');
      addUserToTeam(user, result);

    }
    if (result.status === 302) {
      console.log("user is not part of org", result);
      openIssue(user);
    }
  }
}

module.exports = (app) => {
  app.on("star", async (context) => {
    app.log.info(`the user is ${context.payload.sender.login}`)
    const user = context.payload.sender.login
    app.log.info('opening an issue')
    if (user) {
      await assignTeams(user)
    }
  });
};