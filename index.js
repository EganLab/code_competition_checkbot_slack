const { WebClient } = require('@slack/web-api');
// const { SLACK_OAUTH_TOKEN, SLACK_SIGNING_SECRET } = require ('./constants')
const { createEventAdapter } = require('@slack/events-api');
const axios = require('axios')
const fs = require('fs')

const port = process.env.SLACK_PORT || 3001;

const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const slackClient = new WebClient(process.env.SLACK_OAUTH_TOKEN);

slackEvents.on('app_mention', (event) => {
  console.log(`Got message from user ${event.user}: ${event.text}`);
  (async () => {
    try {
      handleMessage(event.text, event.channel, event.user);
    } catch (error) {
      console.log(error.data)
    }
  })();
});

slackEvents.on('error', console.error);

slackEvents.start(port).then(() => {
  console.log(`Server started on port ${port}`)
});

async function sendMessage(channel, message) {
    await slackClient.chat.postMessage({
        channel: channel,
        text: message,
    })
}

// Respons to Data
function handleMessage(message, channel, user) {
  if (message.includes(' name ')) {
    register(message, channel, user);
  } else if (message.includes(' time ')) {
    getTime(message, channel);
  } else if (message.includes(' remove ')) {
    removeUser(message, channel, user);
  } else if (message.includes(' help')) {
    runHelp(channel);
  }
}

async function removeUser (message, channel, user) {
  if (user === 'U02RU8F6EVC') {
    let username = message.split(' ')[2]
    var dataJson = require('./data.json')
    if (username in dataJson) {
      delete dataJson[username];
      fs.writeFileSync("./data.json", JSON.stringify(dataJson, null, 2), 'utf-8')
      await sendMessage(channel, `Remove successfully !!`)
    } else {
      await sendMessage(channel, `Oops! It looks like you entered wrong username!!`)
    }
  } else {
    await sendMessage(channel, `U don't have permission to remove user`)
  }
}


async function getTime (message, channel) {
  let username = message.split(' ')[2]
  var dataJson = require('./data.json')
  !!dataJson[username]
  ? await sendMessage(channel, `User *${username}* has leveled up at ${dataJson[username].updated_at}`)
  : await sendMessage(channel, `User *${username}* does not exist`)
}

async function register (message, channel, slackUser) {
  let username = message.split(' ')[2]
  let result = await getRank(username, slackUser)
  if(result !== 'error'){
    await sendMessage(channel, result)
  } else {
    await sendMessage(channel, `Oops! It looks like you entered wrong username !!`)
  }
}

async function getRank(username, slackUser) {
  try {
    const res = await axios.get(`https://code.viblo.asia/api/users/${username}/profile`)
    const {data} = res
    let {user} = data
    user.score = data.progress.score
    user.slackUser = slackUser

    var dataJson = require('./data.json')
    if (!(username in dataJson)) {
      dataJson[username] = user
      fs.writeFileSync("./data.json", JSON.stringify(dataJson, null, 2), 'utf-8')
    }
    var info = `*Register successfully* : ${user.name}`
    return info
  } catch (error) {
    console.log(error)
    return "error"
  }
}

// Show Help Text
async function runHelp(channel) {
  const params = {
    icon_emoji: ':question:'
  };

  await sendMessage(
    channel,
    'Type @CodeCompetitionBot name:<your viblo code username> to register. Example `@CodeCompetitionBot name dohoang`',
    params
  );
}

async function cronjob() {
  var dataJson = require('./data.json')

  var newDataJson = new Object();
  (await Promise.allSettled(Object.keys(dataJson).map( async username => await axios.get(`https://code.viblo.asia/api/users/${username}/profile`))))
  .forEach(async p => {
    if (p.status !== 'fulfilled') {
      console.error('farmUpdater error', p.reason)
    } else {
      const {data} = p.value
      let {user} = data
      user.score = data.progress.score
      user.slackUser = dataJson[user.username].slackUser
      newDataJson[user.username] = user
      if(newDataJson[user.username].rank !== dataJson[user.username].rank) {
        await sendMessage('code-competition', `Congratulations <@${user.slackUser}> has leveled up to level ${newDataJson[user.username].rank}`)
      }
    }
  });

  fs.writeFileSync("./data.json", JSON.stringify(newDataJson, null, 2), 'utf-8')
}

setInterval(async () => {
  await cronjob();
}, 1000 * 60 * 5); // 10 minutes