const PORT = process.env.PORT || 5000;
const io =  require('socket.io')();

io.on('connection', (client) => {
  setInterval(() => {
    client.emit('test', "oh yes!")
  }, 1000)
})

io.listen(PORT);
