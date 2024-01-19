const Twit = require('twit');
const fs = require('fs')
const readline = require('readline');

var T = new Twit({
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: '',
})

global.seguidos = 0;
global.ids_seguidos = [];

var ftf_ratio = 15;
var T_Followers = 0;
var T_Follows = 0;
var shadowban = "false"
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
  T.get('users/show', {user_id: "1430475432239976451"}, function(err, reply) {
      if (err) return console.log(err);
      T_Followers = reply.followers_count
      T_Follows = reply.friends_count
  })
}

function curated_follow() {
  if (shadowban == "false") {
    T.get('friends/ids', {user_id: "1430475432239976451", stringify_ids: true}, function (err, reply) {
      if (err) {
        setTimeout(() => {
            curated_follow()
        }, randInterval(1000*60*10, 1000*60*15));
        return console.log(err);
      }
        following = reply.ids.slice();
    })
    // Obtenemos los últimos tweets y las cuentas que le han dado retweet, y seguimos a los usuarios.
    T.get('statuses/user_timeline', {user_id: "2210865044", include_rts: false, exclude_replies: true}, function(err, reply) {
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

function partial_unfollow(number_unfollow) {
  // Siguiendo
  T.get('friends/ids', {user_id: "1430475432239976451", stringify_ids: true}, function (err, reply) {
      if (err) return console.log("ERROR en: friends/ids\n");
      following = reply.ids.slice();

      // Seguidores
      T.get('followers/ids', {user_id: "1430475432239976451", stringify_ids: true}, function (err, reply) {
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

async function getFirstLine(pathToFile) {
    const readable = fs.createReadStream(pathToFile);
    const reader = readline.createInterface({ input: readable });
    const line = await new Promise((resolve) => {
      reader.on('line', (line) => {
        reader.close();
        resolve(line);
      });
    });
    readable.close();
    return line;
  }

async function post() {
    let frase = await getFirstLine("frases.txt")
    T.post('statuses/update', { status: frase}, function(err, reply) {
        if (err) return console.log(err)
        var fs = require('fs')
        fs.readFile("frases.txt", 'utf8', function(err, data)
        {
            if (err)
            {
              console.log(err)
            }
            var linesExceptFirst = data.split('\n').slice(1).join('\n');
            fs.writeFile("frases.txt", linesExceptFirst, function(err, data) { if (err) {/** check and handle err */} });
        });
    })
}

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

setInterval(() => {
  post()
}, 1000*60*60*3);