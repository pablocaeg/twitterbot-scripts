const Reddit = require('reddit')
const Twit = require('twit');
const imageToBase64 = require('image-to-base64');
const fs = require('fs')
const imageDownloader = require("image-downloader");

const reddit = new Reddit({
    username: '',
    password: '',
    appId: '',
    appSecret: '',
    userAgent: ''
})

var T = new Twit({
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: '',
})

global.seguidos = 0;
global.ids_seguidos = [];

var ftf_ratio = 20;
var T_Followers = 0;
var T_Follows = 0;
var shadowban = "false"

global.img = [];
global.followers = [];
global.following = [];

function readfromTxt() {
    fs.readFile('shadowban.txt', 'utf8' , (err, data) => {
        if (err) {
          console.error(err)
          return
        }
        shadowban = data
      })
}

function randCode() {
    code = Math.random().toString(36).substring(7);
    return code;
}

function randInterval(min, max) {
    let difference = max - min;
    let rand = Math.random();
    rand = Math.floor( rand * difference);
    rand = rand + min;
    return rand;
}

function getSmallest(arr){
    var smallest = arr[0];
    for(var i=1; i<arr.length; i++){
        if(arr[i] < smallest){
            smallest = arr[i];   
        }
    }
    smallest_index = arr.indexOf(smallest)-1
    return smallest_index
}


function get_stats() {
    T.get('users/show', {user_id: "1499796501341609989"}, function(err, reply) {
        if (err) return console.log(err);
        T_Followers = reply.followers_count
        T_Follows = reply.friends_count
    })
}

// FOLLOW

function curated_follow() {
    if (shadowban == "false") {
        T.get('friends/ids', {user_id: "1499796501341609989", stringify_ids: true}, function (err, reply) {
            if (err) {
                setTimeout(() => {
                    curated_follow()
                }, randInterval(1000*60*10, 1000*60*15));
                return console.log(err);
            }
            following = reply.ids.slice();
        })
        // Obtenemos los últimos tweets y las cuentas que le han dado retweet, y seguimos a los usuarios.
        T.get('statuses/user_timeline', {user_id: "1412129178820902913", include_rts: false, exclude_replies: true}, function(err, reply) {
            if (err) {
                setTimeout(() => {
                    curated_follow()
                }, randInterval(1000*60*10, 1000*60*15));
                return console.log(err);
            }
            let index = 0
            let last_tweet = ""
            for (let i=0;i<15;i++) {
                if (reply[i].retweet_count > 25) {
                    index = i;
                    last_tweet = reply[i].id_str;
                    break;
                }
            }
            T.get('statuses/retweets', {id: last_tweet, count: 100}, function(err, data) {
                if (err) {
                    setTimeout(() => {
                        curated_follow()
                    }, randInterval(1000*60*10, 1000*60*15));
                    return console.log(err);
                }
                var num_rts;
                let array_min = []
                if (reply[index].retweet_count > 100) {
                    num_rts = 100;
                } else {
                    num_rts = reply[index].retweet_count
                }
                for (let j=1;j<num_rts;j++) {
                    if (typeof data[j] !== 'undefined' && !(following.includes(data[j].user.id_str))) {
                        array_min.push(data[j].user.id_str)
                        array_min.push((data[j].user.followers_count/data[j].user.friends_count));
                    }
                }
                let picked_index = getSmallest(array_min)
                T.post('friendships/create', {user_id: array_min[picked_index]}, function(err) {
                    if (err) {
                        setTimeout(() => {
                            curated_follow()
                        }, randInterval(1000*60*10, 1000*60*15));
                        return console.log(err)
                    } else {
                        console.log("(!)" + "Se han seguido a un nuevo usuario con id: " + array_min[picked_index] + '\n');
                        setTimeout(() => {
                            curated_follow()
                        }, randInterval(1000*60*10, 1000*60*15));
                    }
                })
            })
        })
    } else {
        setTimeout(() => {
          curated_follow()
        }, randInterval(1000*60*10, 1000*60*15));
    }
}

// UNFOLLOW

function partial_unfollow(number_unfollow) {
    // Siguiendo
    T.get('friends/ids', {user_id: "1499796501341609989", stringify_ids: true}, function (err, reply) {
        if (err) return console.log("ERROR en: friends/ids\n");
        following = reply.ids.slice();

        // Seguidores
        T.get('followers/ids', {user_id: "1499796501341609989", stringify_ids: true}, function (err, reply) {
            if (err) return console.log("ERROR en followers/ids\n");
            followers = reply.ids.slice();
            let not_following_back = []
            not_following_back = following.filter(x => !followers.includes(x));

            for (let i=not_following_back.length-1;i>(not_following_back.length-number_unfollow);i--) {
                    T.post('friendships/destroy', {user_id: not_following_back[i]});
                    ids_seguidos.push(" " + not_following_back[i].toString());
                    seguidos++;
            }
            console.log("(X)" + ' Se han dejado de seguir a un total de ' + seguidos + " cuentas, con IDs: " + ids_seguidos + '\n');
            ids_seguidos = []
            seguidos = 0;
        })
    })
}

const options = {
    url: "",
    dest: "../../upload.jpg",
};

async function startReddit() {
    res = await reddit.get('/r/aww/hot', {
        limit: '50',
    })
    for (i=1; i<49; i++) {
        if (res.data.children[i].data.post_hint == "image" && !(res.data.children[i].data.url.includes("gif"))) {
           img.push(res.data.children[i].data.url)
        }
    }
}

async function startImg() {
    options.url = img[0]

    imageDownloader
    .image(options)
    .then(({ filename }) => {
        console.log("file saved" + filename);
        img.shift()
    })
    .catch((err) => {
        img.shift()
        console.error(err)}
        );
}

async function uploadTweet() {
    if (fs.existsSync("upload.jpg")) {
        imageToBase64("upload.jpg") // Path to the image
        .then(
            (response) => {
                T.post('media/upload', { media: response}, function(err, reply) {
                    if (err) {
                        if (fs.existsSync("upload.jpg")) {
                            fs.unlinkSync("upload.jpg")
                        }
                        return console.log(err)
                    }
                    T.post('statuses/update', { status: "", media_ids: reply.media_id_string }, function(err) {
                        if (err) {
                            if (fs.existsSync("upload.jpg")) {
                                fs.unlinkSync("upload.jpg")
                            }
                            return console.log(err)
                        }
                        if (fs.existsSync("upload.jpg")) {
                            fs.unlinkSync("upload.jpg")
                        }
                        console.log("Tweet posteado correctamente.\n")
                    })
                })
            }
        )
        .catch(
            (error) => {
                if (fs.existsSync("upload.jpg")) {
                    fs.unlinkSync("upload.jpg")
                }
                console.log(error); // Logs an error if there was one
            }
        )
    }
}

// AUTOMATED

startReddit()

setInterval(() => {
    startReddit()
}, 1000*60*60*24);

setInterval(() => {
    if(img.length>0) {
        setTimeout(function() {
            startImg()
        }, 1000*5);
        setTimeout(function() {
            uploadTweet()
        }, 1000*10);
    }
}, 1000*60*60*4);

setInterval(() => {
    readfromTxt()
}, 1000*60*60);

setTimeout(() => {
        curated_follow()
}, randInterval(1000*60*10, 1000*60*15));
    
setInterval(() => {
    get_stats()
}, 1000*60*60);

setTimeout(function(){
    setInterval(function(){
        if (shadowban == "false") {
            if (((T_Followers/T_Follows)*100)<ftf_ratio) {
                partial_unfollow(7)
            }
        } else {
            partial_unfollow(5)
        }
    }, 1000*60*60)
}, 1000*60*5);
