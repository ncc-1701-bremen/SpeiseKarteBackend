require('dotenv').config();
const PORT = process.env.PORT || 5000;
const REDIS_PW = process.env.REDIS_PW;
const io = require('socket.io')();
const authIo = io.of('/authenticate')
const redis =  require('socket.io-redis');

io.adapter(redis({
  host: '127.0.0.1',
  port: 6379,
  password: REDIS_PW
}));



require('socketio-auth')(authIo, {
  authenticate: function (socket, data, callback) {
    //get credentials sent by the client
    var username = data.username;
    var password = data.password;
    console.log(username, password)
    return callback(null, true)
  }
});

io.on('connection', (client) => {
    io.sockets.emit('test', "oh yes!")
})

setInterval(()=> {
  io.sockets.emit('test', "oh yes!")
}, 1000);

setInterval(()=> {
  authIo.emit('test', "for auth")
}, 1000);

io.listen(PORT);
