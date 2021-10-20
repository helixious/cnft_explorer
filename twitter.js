import Twitter from 'twitter';
require('dotenv').config();

const {TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_API_TOKEN, TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET} = process.env;

var client = new Twitter({
    consumer_key: TWITTER_CONSUMER_KEY,
    consumer_secret: TWITTER_CONSUMER_SECRET,
    bearer_token: TWITTER_API_TOKEN,
    access_token_key: TWITTER_API_KEY,
    access_token_secret: TWITTER_API_SECRET
})

let params = {screen_name: '@BixbyCrypto'};


client.get('statuses/user_timeline', params, (errors, tweets, response) => {
    if(!errors) {
        console.log(tweets);
    } else {
        console.log(errors);
    }
})