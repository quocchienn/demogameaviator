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
let currentRound = {
    roundId: 0,
    multiplier: 1.00,
    isRunning: false,
    startTime: null,
    randomStop: 0,
    cashedOut: {} // { username: { bet, cashOutAt, win } }
};

// Định kỳ tạo ván mới và broadcast hệ số
function startNewRound() {
    currentRound.roundId++;
    currentRound.isRunning = true;
    currentRound.startTime = Date.now();
    currentRound.multiplier = 1.00;
    currentRound.randomStop = Math.random() * (10 - 1.1) + 1.1;
    currentRound.cashedOut = {};
    io.emit('newRound', {
        roundId: currentRound.roundId,
        randomStop: currentRound.randomStop
    });

    let interval = setInterval(() => {
        if (!currentRound.isRunning) return clearInterval(interval);
        currentRound.multiplier += 0.01;
        io.emit('multiplier', currentRound.multiplier.toFixed(2));
        if (currentRound.multiplier >= currentRound.randomStop) {
            currentRound.isRunning = false;
            io.emit('roundEnd', currentRound.multiplier.toFixed(2));
            clearInterval(interval);
            setTimeout(startNewRound, 4000); // 4s sau bắt đầu ván mới
        }
    }, 50);
}
setTimeout(startNewRound, 2000);

io.on('connection', (socket) => {
    // Gửi bảng xếp hạng và danh sách online khi có client kết nối
    socket.emit('leaderboard', getLeaderboard());
    socket.emit('onlineUsers', Object.values(onlineUsers));

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
            onlineUsers[socket.id] = username;
            io.emit('onlineUsers', Object.values(onlineUsers));
            callback({ success: true, user: users[username] });
        }
    });

    // Đăng xuất hoặc disconnect
    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('onlineUsers', Object.values(onlineUsers));
    });

    // Cập nhật thông tin user (số dư, lịch sử cược)
    socket.on('updateUser', ({ username, balance, history }) => {
        if (users[username]) {
            users[username].balance = balance;
            users[username].history = history;
            io.emit('leaderboard', getLeaderboard());
        }
    });

    // Đặt cược và cashout
    socket.on('placeBet', ({ username, bet }) => {
        if (!currentRound.isRunning) return;
        if (!currentRound.cashedOut[username]) {
            currentRound.cashedOut[username] = { bet, cashOutAt: null, win: 0 };
        }
    });
    socket.on('cashOut', ({ username, atMultiplier }) => {
        if (!currentRound.isRunning) return;
        if (currentRound.cashedOut[username] && !currentRound.cashedOut[username].cashOutAt) {
            currentRound.cashedOut[username].cashOutAt = atMultiplier;
            currentRound.cashedOut[username].win = Math.floor(currentRound.cashedOut[username].bet * atMultiplier);
        }
    });

    // Gửi lại bảng xếp hạng khi client yêu cầu
    socket.on('getLeaderboard', () => {
        socket.emit('leaderboard', getLeaderboard());
    });

    // Gửi trạng thái ván hiện tại khi client yêu cầu
    socket.on('getCurrentRound', () => {
        socket.emit('currentRound', currentRound);
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

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});