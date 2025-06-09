const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

mongoose.connect('mongodb+srv://chienq895:123@cluster0.t9nx9uy.mongodb.net/aviator?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB Atlas connected!'))
  .catch(err => console.error(err));

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    balance: Number,
    history: Array
});
const User = mongoose.model('User', userSchema);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
    // Đăng ký
    socket.on('register', async ({ username, password }, callback) => {
        const existing = await User.findOne({ username });
        if (existing) {
            callback({ success: false, message: 'Tài khoản đã tồn tại' });
        } else {
            const user = new User({ username, password, balance: 3000000, history: [] });
            await user.save();
            callback({ success: true, user });
        }
    });

    // Đăng nhập
    socket.on('login', async ({ username, password }, callback) => {
        const user = await User.findOne({ username });
        if (!user) {
            callback({ success: false, message: 'Tài khoản không tồn tại' });
        } else if (user.password !== password) {
            callback({ success: false, message: 'Sai mật khẩu' });
        } else {
            callback({ success: true, user });
        }
    });

    // Cập nhật user
    socket.on('updateUser', async ({ username, balance, history }) => {
        await User.updateOne({ username }, { balance, history });
        io.emit('leaderboard', await getLeaderboard());
    });

    // Gửi bảng xếp hạng
    socket.on('getLeaderboard', async () => {
        socket.emit('leaderboard', await getLeaderboard());
    });

    // Gửi bảng xếp hạng khi client kết nối
    getLeaderboard().then(lb => socket.emit('leaderboard', lb));
});

async function getLeaderboard() {
    const users = await User.find({});
    let leaderboard = users.map(user => {
        let totalWin = 0;
        if (Array.isArray(user.history)) {
            user.history.forEach(item => {
                if (item.result && item.result.startsWith('Thắng')) {
                    let match = item.result.match(/Thắng ([\d.,]+)/);
                    if (match) totalWin += parseInt(match[1].replace(/\D/g, ''));
                }
            });
        }
        return {
            username: user.username,
            totalWin,
            balance: user.balance || 0
        };
    });
    leaderboard.sort((a, b) => {
        if (b.totalWin !== a.totalWin) return b.totalWin - a.totalWin;
        return b.balance - a.balance;
    });
    return leaderboard.slice(0, 10);
}

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});