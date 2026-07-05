const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads/ohcards');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '30d',   // 浏览器缓存30天，同一张图片只下载一次
  immutable: true  // 告诉浏览器文件不会变，跳过304协商请求
}));

app.use('/api/upload', require('./routes/upload'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/about', require('./routes/about'));
app.use('/api/consultants', require('./routes/consultants'));
app.use('/api/news', require('./routes/news'));
app.use('/api/booking', require('./routes/booking'));
app.use('/api/ohcard', require('./routes/ohcard'));
app.use('/api/assessment', require('./routes/assessment'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/homework', require('./routes/homework'));
app.use('/api/crisis', require('./routes/crisis'));
app.use('/api/terms', require('./routes/terms'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/coupons', require('./routes/coupons'));

require('./socket/rooms')(io);

// 启动订单超时取消定时任务
const { startExpireJob } = require('./jobs/expireOrders');
startExpireJob();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
