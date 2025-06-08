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

// Thêm biến quản lý ván chơi chung
let gameState = {
    roundActive: false,
    multiplier: 1.0,
    randomStop: Math.random() * (10 - 0.1) + 0.8,
    startTime: null
};

// Hàm bắt đầu ván mới
function startNewRound() {
    gameState.roundActive = true;
    gameState.multiplier = 1.0;
    gameState.randomStop = Math.random() * (10 - 0.1) + 0.8;
    gameState.startTime = Date.now();
    io.emit('roundStarted', {
        randomStop: gameState.randomStop,
        startTime: gameState.startTime
    });
}

// Hàm cập nhật hệ số và kết thúc ván
function updateRound() {
    if (!gameState.roundActive) return;
    const elapsed = (Date.now() - gameState.startTime) / 1000;
    // Công thức hệ số (có thể thay đổi)
    gameState.multiplier = Math.round((1 + elapsed * 0.15) * 100) / 100;
    io.emit('multiplierUpdate', { multiplier: gameState.multiplier });

    if (gameState.multiplier >= gameState.randomStop) {
        gameState.roundActive = false;
        io.emit('roundEnded', { multiplier: gameState.multiplier });
        setTimeout(startNewRound, 4000); // 4s sau bắt đầu ván mới
    }
}

// Cứ mỗi 100ms cập nhật hệ số cho tất cả client
setInterval(updateRound, 100);

io.on('connection', (socket) => {
    // Gửi bảng xếp hạng khi có client kết nối
    socket.emit('leaderboard', getLeaderboard());

    // Đăng ký tài khoản mới
    socket.on('register', async ({ username, password, email }, callback) => {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, email });
        await user.save();
        callback({ success: true, message: 'Đăng ký thành công' });
        io.emit('leaderboard', getLeaderboard());
    });

    // Đăng nhập
    socket.on('login', async ({ username, password }, callback) => {
        const user = await User.findOne({ username });
        if (!user) {
            callback({ success: false, message: 'Sai tài khoản' });
        } else {
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                callback({ success: false, message: 'Sai mật khẩu' });
            } else {
                const token = jwt.sign({ id: user._id }, 'SECRET_KEY');
                callback({ success: true, token });
            }
        }
    });

    // Cập nhật thông tin user (số dư, lịch sử cược)
    socket.on('updateUser', ({ username, balance, history }) => {
        if (users[username]) {
            users[username].balance = balance;
            users[username].history = history;
            io.emit('leaderboard', getLeaderboard());
        }
    });

    // Gửi lại bảng xếp hạng khi client yêu cầu
    socket.on('getLeaderboard', () => {
        socket.emit('leaderboard', getLeaderboard());
    });

    socket.emit('roundInfo', {
        roundActive: gameState.roundActive,
        multiplier: gameState.multiplier,
        randomStop: gameState.randomStop,
        startTime: gameState.startTime
    });
});

function getLeaderboard() {
    let leaderboard = [];
    for (let username in users) {
        let totalWin = 0;
        if (Array.isArray(users[username].history)) {
            users[username].history.forEach(item => {
                if (item.result && item.result.startsWith('Thắng')) {
                    let match = item.result.match(/Thắng ([\d.,]+)/);
                    if (match) totalWin += parseInt(match[1].replace(/\D/g, ''));
                }
            });
        }
        leaderboard.push({
            username,
            totalWin,
            balance: users[username].balance || 0
        });
    }
    leaderboard.sort((a, b) => {
        if (b.totalWin !== a.totalWin) return b.totalWin - a.totalWin;
        return b.balance - a.balance;
    });
    return leaderboard.slice(0, 10);
}

// Bắt đầu ván đầu tiên khi server khởi động
startNewRound();

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});