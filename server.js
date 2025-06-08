const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

let users = {}; // { username: { password, balance, history: [] } }
let onlineUsers = {}; // { socket.id: username }
let gameState = {
    phase: 'betting', // 'betting' | 'flying' | 'ended'
    counter: 1.0,
    randomStop: Math.random() * (10 - 0.1) + 0.8,
    startTime: Date.now(),
    bets: {} // { username: betAmount }
};

function broadcastOnlineUsers() {
    io.emit('onlineUsers', Object.values(onlineUsers));
}

function broadcastGameState() {
    io.emit('gameState', gameState);
}

io.on('connection', (socket) => {
    // Gửi bảng xếp hạng khi có client kết nối
    socket.emit('leaderboard', getLeaderboard());

    // Đăng ký tài khoản mới
    socket.on('register', ({ username, password }, callback) => {
        if (users[username]) {
            callback({ success: false, message: 'Tài khoản đã tồn tại' });
        } else {
            users[username] = { password, balance: 3000000, history: [] };
            callback({ success: true, user: users[username] });
            io.emit('leaderboard', getLeaderboard());
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
            onlineUsers[socket.id] = username;
            broadcastOnlineUsers();
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

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        broadcastOnlineUsers();
    });

    // Đặt cược
    socket.on('placeBet', ({ username, betAmount }) => {
        if (gameState.phase === 'betting') {
            gameState.bets[username] = betAmount;
            broadcastGameState();
        }
    });

    // Rút tiền (cash out)
    socket.on('cashOut', ({ username, multiplier }) => {
        if (gameState.phase === 'flying' && gameState.bets[username]) {
            // Xử lý trả thưởng, cập nhật balance...
            // Gửi lại trạng thái game và user
            broadcastGameState();
            io.emit('userUpdate', { username, user: users[username] });
        }
    });

    // Gửi trạng thái game và online khi client yêu cầu
    socket.on('getGameState', () => {
        socket.emit('gameState', gameState);
        socket.emit('onlineUsers', Object.values(onlineUsers));
    });
});

// Vòng lặp game chung cho tất cả client
setInterval(() => {
    if (gameState.phase === 'betting') {
        // Đếm ngược đặt cược, sau đó chuyển sang flying
        if (Date.now() - gameState.startTime > 8000) {
            gameState.phase = 'flying';
            gameState.counter = 1.0;
            gameState.randomStop = Math.random() * (10 - 0.1) + 0.8;
            gameState.startTime = Date.now();
            broadcastGameState();
        }
    } else if (gameState.phase === 'flying') {
        // Tăng hệ số, kiểm tra nổ
        gameState.counter += 0.02;
        if (gameState.counter >= gameState.randomStop) {
            gameState.phase = 'ended';
            broadcastGameState();
            setTimeout(() => {
                // Reset game
                gameState.phase = 'betting';
                gameState.counter = 1.0;
                gameState.bets = {};
                gameState.startTime = Date.now();
                broadcastGameState();
            }, 4000);
        } else {
            broadcastGameState();
        }
    }
}, 100);

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

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});