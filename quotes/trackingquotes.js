const Twit = require('twit');
const fs = require('fs')

var T = new Twit({
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: '',
})

var shadowban = "false"

function getShadowban() {
    T.get('search/tweets', {q: "from:parapensart", count: 1}, function(err, reply) {
        if (err) return console.log(err)
        console.log("Checking shadowban of 'parapensart'")
        if (reply.statuses.length > 0) {
            shadowban = "false";
        } else {
            shadowban = "true";
        }
    })
}

function toTxt(text) {
    fs.writeFile("shadowban.txt", text, function(err) {
        if(err) {
            return console.log(err);
        }
    });
}

setTimeout(function(){
    setInterval(() => {
        getShadowban()
        setTimeout(() => {
            toTxt(shadowban)  
        }, 1500);
    }, 1000*60*60);
}, 1000);
