const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

let users = {}; // { username: { password, balance, history: [] } }

io.on('connection', (socket) => {
    // Đăng ký tài khoản mới
    socket.on('register', ({ username, password }, callback) => {
        if (users[username]) {
            callback({ success: false, message: 'Tài khoản đã tồn tại' });
        } else {
            users[username] = { password, balance: 3000000, history: [] };
            callback({ success: true, user: users[username] });
        }
    });

    // Đăng nhập
    socket.on('login', ({ username, password }, callback) => {
        if (!users[username]) {
            callback({ success: false, message: 'Tài khoản không tồn tại' });
        } else if (users[username].password !== password) {
            callback({ success: false, message: 'Sai mật khẩu' });
        } else {
            callback({ success: true, user: users[username] });
        }
    });

    // Cập nhật thông tin user (số dư, lịch sử cược)
    socket.on('updateUser', ({ username, balance, history }) => {
        if (users[username]) {
            users[username].balance = balance;
            users[username].history = history;
        }
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});