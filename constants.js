require('dotenv').config()

const SLACK_OAUTH_TOKEN = process.env.OAUTH_TOKEN
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const BOT_SPAM_CHANNEL = '#test-bot'

module.exports= {
    SLACK_OAUTH_TOKEN,
    BOT_SPAM_CHANNEL,
    SLACK_SIGNING_SECRET
}
