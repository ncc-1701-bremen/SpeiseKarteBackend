require('dotenv').config();
const PORT = process.env.PORT || 5000;
const REDIS_PW = process.env.REDIS_PW;
const MASTER = process.env.master || true;
const io = require('socket.io')();
const authIo = io.of('/authenticate')
const masterIo = io.of('/masterSocket')
const redis = require('socket.io-redis');
const redisClient = require('redis').createClient();

redisClient.auth(REDIS_PW);

io.adapter(redis({
  host: '127.0.0.1',
  port: 6379,
  password: REDIS_PW
}));

if(MASTER) {
  const fs = require('fs');
  const masterSocket = require('socket.io-client')('http://localhost:5000/masterSocket');

  // Register master server to listen for authentication events and dataChange events
  masterSocket.on('connect', ()=>{
    masterSocket.emit('authentication', {});
    masterSocket.on('authenticated', () => {
      masterSocket.on('dataChanged', () => {
        redisClient.get('speisekartenData', (err, result) => {
            io.sockets.emit('newData', JSON.parse(result));
            authIo.emit('newData', JSON.parse(result));
            fs.writeFile('speisekartenData.json', result, 'utf8');
        })
      })

      masterSocket.on('authenticateClient', (data)=>{

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
      io.sockets.emit('dataChanged');
    })
  })
}

require('socketio-auth')(authIo, {
  authenticate: function (socket, data, callback) {
    //get credentials sent by the client
    var username = data.username;
    var password = data.password;
    console.log(username, password)
    socket.on('response', ()=>console.log('OH SHIT!'))
    io.sockets.emit
    return callback(null, false)
  }
});

require('socketio-auth')(masterIo, {
  authenticate: function (socket, data, callback) {
    return callback(null, MASTER)
  }
});

io.on('connection', (client) => {
    io.sockets.emit('test', "oh yes!")
})

setInterval(()=> {
  io.sockets.emit('test', "oh yes!")
}, 1000);

setInterval(()=> {
  masterIo.emit('master', "HOLY SHIT!")
}, 1000);


authIo.on('response', ()=>console.log('OH SHIT!'))

io.listen(PORT);
