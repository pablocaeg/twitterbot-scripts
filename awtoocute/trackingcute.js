const Twit = require('twit');
const fs = require('fs')

var T = new Twit({
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: '',
})

var shadowban

function getShadowban() {
    T.get('search/tweets', {q: "from:awtoocute", count: 1}, function(err, reply) {
        if (err) return console.log(err)
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
    }, 1000*15);
}, 1000);

