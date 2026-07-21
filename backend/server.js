require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// ── 安全头 ─────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS（仅允许已知前端域名）────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,https://www.joyineyes.xyz,https://joyineyes.xyz')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    // 开发环境放行 localhost / 127.0.0.1（任意端口）
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return cb(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    console.warn('[CORS blocked] origin:', origin);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── 全局限流（每IP每15分钟最多300次请求）────────────────────────
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
}));

// ── 请求体大小限制，防止超大负载攻击 ─────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV !== 'production'
      ? true
      : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '../uploads/ohcards');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '30d',
  immutable: true
}));
app.use('/static', express.static(path.join(__dirname, 'static'), {
  maxAge: '30d',
  immutable: true
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
app.use('/api/monster', require('./routes/monster'));
app.use('/api/mandala', require('./routes/mandala'));
app.use('/api/crisis', require('./routes/crisis'));
app.use('/api/terms', require('./routes/terms'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/users', require('./routes/users'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/breathing', require('./routes/breathing'));

require('./socket/rooms')(io);

// 启动订单超时取消定时任务
const { startExpireJob } = require('./jobs/expireOrders');
startExpireJob();

// 启动数据库自动备份（每4小时）
const { startBackupJob } = require('./jobs/backup');
startBackupJob();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
