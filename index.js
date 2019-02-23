const PORT = process.env.PORT || 5000;
const io = require('socket.io')();
const redis =  require('socket.io-redis');

io.adapter(redis({
  host: '127.0.0.1',
  port: 6379
}));

io.on('connection', (client) => {
    io.sockets.emit('test', "oh yes!")
})

io.listen(PORT);
