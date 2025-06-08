const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = 1280;  // tăng chiều rộng
canvas.height = 480;  // tăng chiều cao

let speedX = 1.1; // Bay ngang chậm
let speedY = 0.05; // Bay lên rất nhẹ
let x = 0;
let y = canvas.height;
let dotPath = [];
let counter = 1.0;
let randomStop = Math.random() * (10 - 0.1) + 0.8;
let cashedOut = false;
let placedBet = false;
let isFlying = false;
let betHistory = [];
let betTimer = 8;
let canBet = true;
let lastFrameTime = performance.now();

const image = new Image();
image.src = './img/aviator_jogo.png';

let balanceAmount = document.getElementById('balance-amount');
let calculatedBalanceAmount = 0;
balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';

let betButton = document.getElementById('bet-button');
betButton.textContent = 'Đặt Cược';

let lastCounters = document.getElementById('last-counters');
let counterDepo = [1.01, 18.45, 2.02, 5.21, 1.22, 1.25, 2.03, 4.55, 65.11, 1.03];
let inputBox = document.getElementById('bet-input');
let increaseBetButton = document.getElementById('increase-bet');
const stopAutoButton = document.getElementById('stop-auto');

let messageField = document.getElementById('message');
let betTimerBar = document.getElementById('bet-timer-bar');
let betHistoryTable = document.getElementById('bet-history-table').getElementsByTagName('tbody')[0];

inputBox.value = '2.500';
messageField.textContent = 'Chờ vòng tiếp theo';

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseFormattedNumber(str) {
    return parseFloat(str.replace(/\./g, '')) || 0;
}

function updateCounterDepo() {
    lastCounters.innerHTML = counterDepo.map(i => {
        let classNameForCounter = i < 2 ? 'blueBorder' : i < 10 ? 'purpleBorder' : 'burgundyBorder';
        return `<p class="${classNameForCounter}">${i.toFixed(2)}x</p>`;
    }).join('');
}

function updateBetHistory(betAmount, multiplier, result) {
    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN');
    const row = betHistoryTable.insertRow(0);
    row.innerHTML = `
        <td>${time}</td>
        <td>${betAmount.toLocaleString('vi-VN')} VND</td>
        <td>${multiplier ? multiplier.toFixed(2) + 'x' : '-'}</td>
        <td>${result}</td>
    `;
    betHistory.unshift({ time, betAmount, multiplier, result });
    if (betHistory.length > 10) {
        betHistory.pop();
        betHistoryTable.deleteRow(-1);
    }
}

function updateBetTimer(deltaTime) {
    if (!isFlying && canBet) {
        betTimer -= deltaTime / 1000;
        if (betTimer < 0) betTimer = 0;
        betTimerBar.style.width = `${(betTimer / 8) * 100}%`;
        if (betTimer <= 0) {
            canBet = false;
            messageField.textContent = 'Hết thời gian đặt cược';
            // Ẩn thanh thời gian cược
            document.getElementById('bet-timer').style.display = 'none';
        }
    }
}

inputBox.addEventListener('input', () => {
    let value = inputBox.value.replace(/[^\d]/g, '');
    if (value) {
        inputBox.value = formatNumber(parseInt(value));
    }
});

inputBox.addEventListener('keydown', e => {
    if (['-', '+', 'e'].includes(e.key)) {
        e.preventDefault();
    }
});

increaseBetButton.addEventListener('click', () => {
    let currentBet = parseFormattedNumber(inputBox.value);
    currentBet += 2500;
    inputBox.value = formatNumber(currentBet);
});

let animationId;

let takeoffTime = 1.2; // giây đầu cất cánh
let takeoffElapsed = 0;

function draw(currentTime) {
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCounterDepo();
    updateBetTimer(deltaTime);

    // Khi hết thời gian đặt cược thì bắt đầu bay
    if (!isFlying && !canBet && counter === 1.0) {
        isFlying = true;
        takeoffElapsed = 0;
    }

    if (isFlying) {
        counter += deltaTime * 0.001 * 0.1; // giảm tốc độ tăng số
        document.getElementById('counter').textContent = counter.toFixed(2) + 'x';

        // Hiệu ứng cất cánh: tăng dần speedY trong takeoffTime đầu
        if (takeoffElapsed < takeoffTime) {
            takeoffElapsed += deltaTime / 1000;
            let progress = Math.min(takeoffElapsed / takeoffTime, 1);
            var currentSpeedY = speedY * progress;
        } else {
            var currentSpeedY = speedY;
        }

        x += speedX * (0.98 + 0.02 * Math.sin(counter));
        y -= currentSpeedY * (1 + 0.2 * Math.sin(x / 40));
        if (y < 50) y = 50;

        dotPath.push({ x, y });

        if (counter >= randomStop) {
            isFlying = false;
            if (placedBet && !cashedOut) {
                updateBetHistory(parseFormattedNumber(inputBox.value), null, `Thua ${inputBox.value} VND`);
                placedBet = false;
                betButton.textContent = 'Đặt Cược';
                messageField.textContent = 'Máy bay rơi! Đường dẫn đứt.';
                setBetInputEnabled(true);
            }
        }
    }

    // Vẽ đường bay
    const canvasOffsetX = canvas.width / 2 - x;
    const canvasOffsetY = canvas.height / 2 - y;
    ctx.save();
    ctx.translate(canvasOffsetX, canvasOffsetY);

    const pathLength = isFlying ? dotPath.length : Math.min(20, dotPath.length);
    for (let i = 1; i < pathLength; i++) {
        ctx.beginPath();
        ctx.strokeStyle = '#dc3545';
        ctx.moveTo(dotPath[dotPath.length - pathLength + i - 1].x, dotPath[dotPath.length - pathLength + i - 1].y);
        ctx.lineTo(dotPath[dotPath.length - pathLength + i].x, dotPath[dotPath.length - pathLength + i].y);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = '#dc3545';
    ctx.lineWidth = 5;
    ctx.arc(x, y, 1, 0, 2 * Math.PI);
    ctx.fill();

    ctx.drawImage(image, x - 42, y - 117, 278, 128); // tăng kích thước máy bay
    ctx.restore();

    if (!isFlying && counter >= randomStop) {
        cancelAnimationFrame(animationId);

        counterDepo.unshift(parseFloat(counter.toFixed(2)));
        if (counterDepo.length > 10) counterDepo.pop();

        setTimeout(() => {
            startRound();
        }, 3000);
        return;
    }

    animationId = requestAnimationFrame(draw);
}

betButton.addEventListener('click', () => {
    if (placedBet && canBet) {
        cancelBet();
    } else if (placedBet) {
        cashOut();
    } else {
        placeBet();
    }
});

function setBetInputEnabled(enabled) {
    inputBox.disabled = !enabled;
    increaseBetButton.disabled = !enabled;
}

function placeBet() {
    const betAmount = parseFormattedNumber(inputBox.value);
    if (placedBet || !inputBox.value || isNaN(betAmount) || isFlying || betAmount > calculatedBalanceAmount || !canBet) {
        messageField.textContent = canBet ? 'Chờ vòng tiếp theo' : 'Hết thời gian đặt cược';
        return;
    }

    if (!isFlying && canBet) {
        if (betAmount && betAmount <= calculatedBalanceAmount) {
            calculatedBalanceAmount -= betAmount;
            balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
            betButton.textContent = 'Hủy Cược';
            placedBet = true;
            messageField.textContent = 'Đã đặt cược';
            updateBetHistory(betAmount, null, 'Đang chờ');
            setBetInputEnabled(false);
        } else {
            messageField.textContent = 'Số dư không đủ để đặt cược';
        }
    } else {
        messageField.textContent = 'Chờ vòng tiếp theo';
    }
}

function cancelBet() {
    if (placedBet && canBet && !isFlying) {
        const betAmount = parseFormattedNumber(inputBox.value);
        calculatedBalanceAmount += betAmount;
        balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
        placedBet = false;
        betButton.textContent = 'Đặt Cược';
        messageField.textContent = 'Đã hủy cược';
        setBetInputEnabled(true);
        // Xóa lịch sử cược vừa thêm (nếu muốn)
        if (betHistoryTable.rows.length > 0 && betHistory[0]?.result === 'Đang chờ') {
            betHistoryTable.deleteRow(0);
            betHistory.shift();
        }
    }
}

function cashOut() {
    if (cashedOut || !placedBet) {
        messageField.textContent = 'Chờ vòng tiếp theo';
        return;
    }

    if (isFlying && counter < randomStop) {
        const betAmount = parseFormattedNumber(inputBox.value);
        const winnings = Math.floor(betAmount * counter);
        calculatedBalanceAmount += winnings;
        balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
        cashedOut = true;
        placedBet = false;
        betButton.textContent = 'Đặt Cược';
        messageField.textContent = `Rút tiền thành công: ${winnings.toLocaleString('vi-VN')} VND`;
        updateBetHistory(betAmount, counter, `Thắng ${winnings.toLocaleString('vi-VN')} VND`);
        setBetInputEnabled(true);
    } else {
        messageField.textContent = 'Không thể rút tiền lúc này';
    }
}

// Khởi động vòng chơi mới
function startRound() {
    counter = 1.0;
    x = 4; // lệch sang trái một chút (mặc định là 0)
    y = canvas.height - 6; // thấp hơn đáy canvas 60px (mặc định là canvas.height)
    dotPath = [];
    cashedOut = false;
    placedBet = false;
    isFlying = false;
    canBet = true;
    betTimer = 8;
    betTimerBar.style.width = '100%';

    // Kiểm tra nếu vòng trước không cược
    if (!placedBet) {
        noBetRounds++;
    } else {
        noBetRounds = 0;
    }

    // Nếu không cược liên tục 4-6 vòng, vòng tiếp theo sẽ nổ lớn
    if (noBetRounds >= 4 && Math.random() < 0.7) { // 70% xác suất
        forceBigExplosion = true;
        noBetRounds = 0; // reset lại sau khi đã kích hoạt
    } else {
        forceBigExplosion = false;
    }

    randomStop = getRandomStop();
    messageField.textContent = 'Chờ vòng tiếp theo';
    setBetInputEnabled(true);
    document.getElementById('bet-timer').style.display = 'block';
    lastFrameTime = performance.now();
    animationId = requestAnimationFrame(draw);
}

// --- Đăng nhập/Đăng ký dùng localStorage ---
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');
const authSubmit = document.getElementById('auth-submit');
const authMessage = document.getElementById('auth-message');
const toggleAuth = document.getElementById('toggle-auth');

let isLogin = true;
let currentUser = null;

// Chuyển đổi giữa đăng nhập và đăng ký
if (toggleAuth) {
    toggleAuth.onclick = () => {
        isLogin = !isLogin;
        authTitle.textContent = isLogin ? 'Đăng nhập' : 'Đăng ký';
        authSubmit.textContent = isLogin ? 'Đăng nhập' : 'Đăng ký';
        toggleAuth.textContent = isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập';
        authMessage.textContent = '';
    };
}

// Xử lý đăng nhập/đăng ký
const socket = io('https://demogameaviator.onrender.com'); // Đặt ở đầu file, dùng chung

if (authSubmit) {
    authSubmit.onclick = () => {
        const username = authUsername.value.trim();
        const password = authPassword.value.trim();
        if (!username || !password) {
            authMessage.textContent = 'Vui lòng nhập đầy đủ thông tin';
            return;
        }
        if (isLogin) {
            // Đăng nhập qua server
            socket.emit('login', { username, password }, (res) => {
                if (!res.success) {
                    authMessage.textContent = res.message || 'Sai tài khoản hoặc mật khẩu';
                    return;
                }
                // Lưu dữ liệu server trả về vào localStorage (nếu muốn)
                let users = JSON.parse(localStorage.getItem('aviator_users') || '{}');
                users[username] = {
                    password,
                    balance: res.user.balance,
                    history: res.user.history || []
                };
                localStorage.setItem('aviator_users', JSON.stringify(users));
                currentUser = username;
                calculatedBalanceAmount = res.user.balance;
                betHistory = res.user.history || [];
                balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
                updateBetHistoryTable();
                authModal.style.display = 'none';
                messageField.textContent = 'Chờ vòng tiếp theo';
                startRound();
            });
        } else {
            // Đăng ký mới lên server (dùng socket đã khai báo ở đầu file)
            socket.emit('register', { username, password }, (res) => {
                if (!res.success) {
                    authMessage.textContent = res.message || 'Tên đăng nhập đã tồn tại';
                    return;
                }
                let users = JSON.parse(localStorage.getItem('aviator_users') || '{}');
                users[username] = {
                    password,
                    balance: res.user.balance, // Lấy đúng từ server (0)
                    history: []
                };
                localStorage.setItem('aviator_users', JSON.stringify(users));
                authMessage.textContent = 'Đăng ký thành công! Vui lòng đăng nhập.';
                isLogin = true;
                authTitle.textContent = 'Đăng nhập';
                authSubmit.textContent = 'Đăng nhập';
                toggleAuth.textContent = 'Chưa có tài khoản? Đăng ký';
            });
        }
    };
}

// Lưu lại số dư và lịch sử khi có thay đổi
function saveUserData() {
    if (!currentUser) return;
    let users = JSON.parse(localStorage.getItem('aviator_users') || '{}');
    if (users[currentUser]) {
        users[currentUser].balance = calculatedBalanceAmount;
        users[currentUser].history = betHistory;
        localStorage.setItem('aviator_users', JSON.stringify(users));
    }
}

// Cập nhật lại bảng lịch sử cược khi đăng nhập
function updateBetHistoryTable() {
    if (!betHistoryTable) return;
    betHistoryTable.innerHTML = '';
    (betHistory || []).slice(0, 10).forEach(item => {
        const row = betHistoryTable.insertRow(-1);
        row.innerHTML = `
            <td>${item.time || ''}</td>
            <td>${item.betAmount ? item.betAmount.toLocaleString('vi-VN') + ' VND' : ''}</td>
            <td>${item.multiplier ? item.multiplier.toFixed(2) + 'x' : '-'}</td>
            <td>${item.result || ''}</td>
        `;
    });
}

// Gọi saveUserData() mỗi khi cập nhật số dư hoặc lịch sử cược
// Ví dụ: sau khi rút tiền, đặt cược, thắng/thua, v.v.
// Thêm saveUserData() vào các hàm sau:

// Sau khi cập nhật số dư hoặc lịch sử cược:
const _oldUpdateBetHistory = updateBetHistory;
updateBetHistory = function(betAmount, multiplier, result) {
    _oldUpdateBetHistory.call(this, betAmount, multiplier, result);
    saveUserData();
};

// Sau khi rút tiền hoặc thay đổi số dư, thêm saveUserData() vào cuối hàm cashOut, placeBet, v.v.
const _oldCashOut = cashOut;
cashOut = function() {
    _oldCashOut.call(this);
    saveUserData();
};
const _oldPlaceBet = placeBet;
placeBet = function() {
    _oldPlaceBet.call(this);
    saveUserData();
};

// Hiện modal khi chưa đăng nhập
window.addEventListener('DOMContentLoaded', () => {
    authModal.style.display = 'flex';
    // KHÔNG gọi startRound() ở đây!
});

const betAllButton = document.getElementById('bet-all');
if (betAllButton) {
    betAllButton.addEventListener('click', () => {
        inputBox.value = calculatedBalanceAmount.toLocaleString('vi-VN');
    });
}

const betHalfButton = document.getElementById('bet-half');
if (betHalfButton) {
    betHalfButton.addEventListener('click', () => {
        inputBox.value = Math.floor(calculatedBalanceAmount / 2).toLocaleString('vi-VN');
    });
}

const depositBtn = document.getElementById('deposit-btn');
const withdrawBtn = document.getElementById('withdraw-btn');
const bankAmountInput = document.getElementById('bank-amount');
const bankMessage = document.getElementById('bank-message');

if (depositBtn && withdrawBtn && bankAmountInput && bankMessage) {
    depositBtn.onclick = () => {
        let amount = parseInt(bankAmountInput.value.replace(/\D/g, ''));
        if (!amount || amount <= 0) {
            bankMessage.textContent = 'Vui lòng nhập số tiền hợp lệ!';
            return;
        }
        calculatedBalanceAmount += amount;
        balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
        bankMessage.textContent = `Nạp thành công ${amount.toLocaleString('vi-VN')} VND!`;
        bankAmountInput.value = '';
        saveUserData && saveUserData();
    };

    withdrawBtn.onclick = () => {
        let amount = parseInt(bankAmountInput.value.replace(/\D/g, ''));
        if (!amount || amount <= 0) {
            bankMessage.textContent = 'Vui lòng nhập số tiền hợp lệ!';
            return;
        }
        if (amount > calculatedBalanceAmount) {
            bankMessage.textContent = 'Số dư không đủ để rút!';
            return;
        }
        calculatedBalanceAmount -= amount;
        balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
        bankMessage.textContent = `Rút thành công ${amount.toLocaleString('vi-VN')} VND!`;
        bankAmountInput.value = '';
        saveUserData && saveUserData();
    };
}

const freeDepositBtn = document.getElementById('free-deposit-btn');
const freeWithdrawBtn = document.getElementById('free-withdraw-btn');
const freeBankMessage = document.getElementById('free-bank-message');
const withdrawTimer = document.getElementById('withdraw-timer');

if (freeDepositBtn && freeWithdrawBtn && freeBankMessage && withdrawTimer) {
    freeDepositBtn.onclick = () => {
        let users = JSON.parse(localStorage.getItem('aviator_users') || '{}');
        if (!currentUser) {
            freeBankMessage.textContent = 'Bạn cần đăng nhập!';
            return;
        }
        if (users[currentUser].freeDeposited) {
            freeBankMessage.textContent = 'Bạn đã nhận miễn phí 100,000 VND!';
            return;
        }
        calculatedBalanceAmount += 100000;
        balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
        users[currentUser].freeDeposited = true;
        localStorage.setItem('aviator_users', JSON.stringify(users));
        freeBankMessage.textContent = 'Đã cộng 100,000 VND vào tài khoản!';
        saveUserData && saveUserData();
    };

    freeWithdrawBtn.onclick = () => {
        if (!currentUser) {
            freeBankMessage.textContent = 'Bạn cần đăng nhập!';
            return;
        }
        freeWithdrawBtn.disabled = true;
        let timeLeft = 120; // 2 phút = 120 giây
        withdrawTimer.style.display = 'block';
        updateTimerText(timeLeft);
        freeBankMessage.textContent = 'Vui lòng chờ để nhận 100,000 VND hỗ trợ...';

        let timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerText(timeLeft);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                let users = JSON.parse(localStorage.getItem('aviator_users') || '{}');
                calculatedBalanceAmount += 100000;
                balanceAmount.textContent = calculatedBalanceAmount.toLocaleString('vi-VN') + ' VND';
                users[currentUser].freeSupport = (users[currentUser].freeSupport || 0) + 1;
                localStorage.setItem('aviator_users', JSON.stringify(users));
                freeBankMessage.textContent = 'Đã cộng 100,000 VND hỗ trợ vào tài khoản!';
                withdrawTimer.style.display = 'none';
                freeWithdrawBtn.disabled = false;
                saveUserData && saveUserData();
            }
        }, 1000);

        function updateTimerText(sec) {
            let m = Math.floor(sec / 60);
            let s = sec % 60;
            withdrawTimer.textContent = `Thời gian chờ: ${m}:${s.toString().padStart(2, '0')}`;
        }
    };
}

let noBetRounds = 0;
let forceBigExplosion = false;

function getRandomStop() {
    // Lấy thông tin tài khoản hiện tại
    let users = JSON.parse(localStorage.getItem('aviator_users') || '{}');
    let user = users && currentUser ? users[currentUser] : null;
    let totalBet = 0, totalWin = 0, totalLose = 0, winCount = 0, loseCount = 0;

    if (user && user.history) {
        user.history.forEach(item => {
            totalBet += item.betAmount || 0;
            if (item.result && item.result.startsWith('Thắng')) {
                winCount++;
                // Lấy số tiền thắng từ chuỗi kết quả
                let match = item.result.match(/Thắng ([\d.,]+)/);
                if (match) totalWin += parseInt(match[1].replace(/\D/g, ''));
            } else {
                loseCount++;
                totalLose += item.betAmount || 0;
            }
        });
    }

    let winRate = totalBet > 0 ? totalWin / totalBet : 0;
    let loseRate = totalBet > 0 ? totalLose / totalBet : 0;

    // Nếu tài khoản thắng quá nhiều (winRate > 1.2), tăng tỉ lệ nổ sớm dưới 2x lên 95%
    if (winRate > 1.2) {
        if (Math.random() < 0.95) {
            return Math.random() + 1; // 1.00x - <2.00x
        }
        // 5% còn lại random từ 2x đến 3x
        return Math.random() + 2; // 2.00x - <3.00x
    }

    // Nếu tài khoản thua nhiều (loseRate > 0.8 và loseCount > winCount), cho ăn vài tay cược nhỏ
    if (loseRate > 0.8 && loseCount > winCount) {
        if (Math.random() < 0.7) {
            return Math.random() * 2 + 2; // 2.00x - <4.00x (dễ vượt 2x, 3x)
        }
        // 30% còn lại random bình thường
    }

    // Bình thường: 90% nổ ở 1.00x - <3.00x, 10% còn lại random từ 3x đến 100x
    if (Math.random() < 0.90) {
        return Math.random() * 2 + 1; // 1.00x - <3.00x
    }
    // 10% còn lại: random từ 3x đến 100x
    return Math.random() * 97 + 3; // 3.00x - <100.00x
}

function generateRandomCounters(n = 10) {
    let arr = [];
    for (let i = 0; i < n; i++) {
        // Hệ số ngẫu nhiên từ 1.01x đến 100x, làm tròn 2 số lẻ
        let value = Math.random() < 0.7
            ? (Math.random() * 9 + 9.09) // 70% ra nhỏ (1.01-5x)
            : (Math.random() * 55 + 5);  // 30% ra lớn (5-100x)
        arr.push(Number(value.toFixed(2)));
    }
    return arr;
}

