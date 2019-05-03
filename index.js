require('dotenv').config();
const PORT = process.env.PORT || 5000;
const REDIS_PW = process.env.REDIS_PW;
const MASTER = process.env.master || true;
const io = require('socket.io')();
const authIo = io.of('/authenticate')
const masterIo = io.of('/masterSocket')
const redis = require('socket.io-redis');
const redisClient = require('redis').createClient();
const AuthentificationManager = require('./AuthentificationManager');
const authManager = new AuthentificationManager(redisClient);

redisClient.auth(REDIS_PW);
let speisekartenData = null;

io.adapter(redis({
  host: '127.0.0.1',
  port: 6379,
  password: REDIS_PW
}));

if(MASTER) {
  const fs = require('fs');
  const masterSocket = require('socket.io-client')('http://localhost:' + PORT + '/masterSocket');

  // Register master server to listen for authentication events and dataChange events
  masterSocket.on('connect', ()=>{
    masterSocket.emit('authentication', {});
    masterSocket.on('authenticated', () => {
      masterSocket.on('dataChanged', (data) => {
        const name = data.username;
        authManager.checkAuthorization({username: data.username, password: null, token: data.authToken}, () => {
          redisClient.get('speisekartenData', (err, result) => {
              result = JSON.parse(result)
              result[name] = data.data;
              speisekartenData = result;
              io.sockets.in(name).emit('newData', result[name]);
              authIo.to(name).emit('newData', result[name]);
              redisClient.set('speisekartenData', JSON.stringify(result));
              fs.writeFile('speisekartenData.json', JSON.stringify(result), 'utf8', ()=>{});
          })
        })
      })

      masterSocket.on('authenticateClient', (data, callback)=>{
        if(data && callback) {
          authManager.checkAuthorization(data, callback);
        }
      })

      masterSocket.on('master', data => console.log(data))
    })
  })

  // Loading the data into the redis store on startup
  fs.readFile('speisekartenData.json', 'utf8', (err, data) => {
    redisClient.set('speisekartenData', data, (err) => {
      if (err) {
        console.log('error while setting redis data');
        return;
      }
      //masterIo.emit('dataChanged', data);
    })
  })
} else {
  redisClient.get('speisekartenData', (err, result) => {
    if (err) {
      console.log('error while setting redis data');
      return;
    }
    speisekartenData = JSON.parse(result);
  })
}

redisClient.watch('speisekartenData', () => {
  redisClient.get('speisekartenData', (err, result) => {
    if (err) {
      console.log('error while setting redis data');
      return;
    }
    speisekartenData = JSON.parse(result);
  })
})

require('socketio-auth')(authIo, {
  authenticate: function (socket, data, callback) {
    //get credentials sent by the client

    if (Object.keys(masterIo.connected).length === 1) {
      masterIo.connected[Object.keys(masterIo.connected)[0]].emit('authenticateClient',
        data,
        function(success, token, reason) {
          console.log(reason)
          if(success) {
            callback(token, success, reason);
            socket.join(data.username);
            socket.emit('authToken', token);
            socket.emit('newData', speisekartenData[data.username]);
            // TODO: Implement data updates from authenticated client
            socket.on('changeData', (data) => {
              masterIo.emit('dataChanged', data);
            });
          } else {
            callback(new Error(reason));
          }
      })
    }
  },
  timeout: 5000
});

require('socketio-auth')(masterIo, {
  authenticate: function (socket, data, callback) {
    return callback(null, MASTER)
  }
});

io.on('connection', (client) => {
    client.on('register', (data) => {
      if (data && data.username) {
        client.emit('newData', speisekartenData[data.username]);
        client.join(data.username);
      }
    })
})

io.listen(PORT);

const jssha = require('jssha');

const shaObj = new jssha("SHA-256", "TEXT");
shaObj.update("df78af8787h4jfmlkksd9s" + "default");
authManager.registerNewUser({password: shaObj.getHash("HEX"), username: "default"}, (success, reason)=>console.log(reason));
