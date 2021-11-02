require('dotenv').config()
const WebSocket = require('ws');
const express = require('express');

// install with: npm install @octokit/webhooks
const { Webhooks } = require("@octokit/webhooks");
const { Octokit } = require("octokit");

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

// setup the webhooks
const webhooks = new Webhooks({
  secret: process.env.WEBHOOK_SECRET,
});

webhooks.on("*", ({ id, name, payload }) => {
  const user = payload.sender.login
  console.log(user);

  // if user is part of org then add then to the member team id
  if (user) {
    assignTeams(user);
  }

  // message = output;
  
  // broadcast the message to all of the connected clients
  // wss is a server that contains clients which are an array
  // of all of the websocket connections
  if(wss && wss.clients) {
    wss.clients.forEach(client => {
      client.send(output)
    })
  }
});

webhooks.on("error", (error) => {
  console.log(`Error occured in "${error.event.name} handler: ${error.stack}"`);
});

// setup express
const app = express();

// add middleware to server the static files
app.use(express.static('client'))

// add middleware for the webhooks
app.use(webhooks.middleware)

//initialize the server to be used by the websockets
const server = app.listen(3000, () => console.log('Server started on port 3000'))

//add the WebSocket to the server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    //connection is up, let's add a simple simple event
    ws.on('message', (message) => {
        //log the received message and send it back to the client
        console.log('received: %s', message);
        ws.send(JSON.stringify(message));
    });

    //send immediately a feedback to the incoming connection    
    ws.send('Hi there, I am a WebSocket server');
});

async function assignTeams(user) {
  const {status} = await octokit.request("/orgs/{org}/members/{username}", {
    username: user,
    org: "maintainers",
  }).catch(err => { console.log(err) });

  if (status === 204) {
    console.log("user is part of org", status);
    const employeeStatus = await checkForEmployee(user);
    addUserToTeam(user, "Maintainers", employeeStatus);
    console.log(employeeStatus);
  }

  if (status === 404) {
    console.log("user is not a team member but part of the org", status);
  }

  if (status === 302) {
    console.log("user is not part of org", status);
  }
}

async function checkForEmployee(user) {
  const {status} = await octokit.request('GET /orgs/{org}/teams/{team_slug}/memberships/{username}', {
    org: 'github',
    team_slug: 'employees',
    username: user
  }).catch(err => { console.log(err) });

  if (status === 200) {
    console.log("user is employee of github", status);
    return true;
  }

  if (status === 404) {
    console.log("user is not an employee", status);
    // create an issue
    openIssue()
    console.log("created an issue")
  }

  return false;
}


async function openIssue() {
    const {status} = await octokit.request('POST /repos/{owner}/{repo}/issues', {
      owner: 'maintainers',
      repo: 'invite-automation',
      title: 'Add user to team',
      body: 'Should we add this user to the repo?',
    }).catch(err => { console.log(err) });

    if (status === 201) {
      console.log("opened an issue", status);
    }
    if (status === 403) {
      console.log("Forbidden", status);
    }
    if (status === 422) {
      console.log("Unprocessable Entity", status);
    }
}
async function addUserToTeam(user, team, employeeStatus) {
  const team_slug = employeeStatus ? 'github-employees' : 'members';
  const {status} = await octokit.request('PUT /orgs/{org}/teams/{team_slug}/memberships/{username}', {
    org: 'maintainers',
    team_slug: team_slug,
    username: user,
    role: 'member'
  }).catch(err => { console.log(err) });

  if (status === 200) {
    console.log("user is part of team", status);
  }

  if (status === 403) {
    console.log("Forbidden", status);
  }

  if (status === 422) {
    console.log("Unprocessable Entity", status);
  }
}
