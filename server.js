const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

let users = {}; // { username: { balance, history: [] } }

io.on('connection', (socket) => {
    // Gửi bảng xếp hạng khi có client kết nối
    socket.emit('leaderboard', getLeaderboard());

    // Nhận cập nhật từ client
    socket.on('updateUser', ({ username, balance, history }) => {
        users[username] = users[username] || { balance: 0, history: [] };
        users[username].balance = balance;
        users[username].history = history;
        io.emit('leaderboard', getLeaderboard());
    });

    // Gửi lại bảng xếp hạng khi client yêu cầu
    socket.on('getLeaderboard', () => {
        socket.emit('leaderboard', getLeaderboard());
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