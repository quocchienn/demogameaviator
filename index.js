const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let onlinePlayers = [];

io.on('connection', (socket) => {
  // Khi người chơi đăng nhập
  socket.on('playerOnline', (username) => {
    if (!onlinePlayers.includes(username)) {
      onlinePlayers.push(username);
    }
    io.emit('updateOnlinePlayers', onlinePlayers);
  });

  // Khi người chơi ngắt kết nối
  socket.on('disconnect', () => {
    // Giả sử bạn lưu username trong socket
    if (socket.username) {
      onlinePlayers = onlinePlayers.filter(u => u !== socket.username);
      io.emit('updateOnlinePlayers', onlinePlayers);
    }
  });

  // Lưu username vào socket khi nhận sự kiện
  socket.on('setUsername', (username) => {
    socket.username = username;
  });
});

app.get('/online-players', (req, res) => {
  res.json(onlinePlayers);
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});