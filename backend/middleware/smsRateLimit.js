// 短信接口双重限流：同一手机号每小时最多5次，同一IP每小时最多10次
const prisma = require('../db/database');
const phoneMap = new Map();
const ipMap    = new Map();

const PHONE_LIMIT    = 5;
const IP_LIMIT       = 10;
const WINDOW_MS      = 60 * 60 * 1000; // 1小时

function cleanup(map) {
  const now = Date.now();
  for (const [key, { resetAt }] of map) {
    if (now > resetAt) map.delete(key);
  }
}

function check(map, key, limit) {
  cleanup(map);
  const now  = Date.now();
  const entry = map.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + WINDOW_MS; }
  if (entry.count >= limit) return { ok: false, resetAt: entry.resetAt };
  entry.count++;
  map.set(key, entry);
  return { ok: true };
}

function smsRateLimit(req, res, next) {
  const phone = req.body?.phone || req.body?.target;
  const ip    = req.ip || req.socket.remoteAddress;

  const ipResult = check(ipMap, ip, IP_LIMIT);
  if (!ipResult.ok)
    return res.status(429).json({ error: '当前网络短信请求次数过多，请稍后再试', resetAt: ipResult.resetAt });

  if (phone) {
    // 管理员账户不受手机号限流约束
    prisma.user.findUnique({ where: { phone }, select: { role: true } }).then(u => {
      if (u?.role === 'admin') return next();
      const phoneResult = check(phoneMap, phone, PHONE_LIMIT);
      if (!phoneResult.ok)
        return res.status(429).json({ error: '该号码验证码发送次数已达上限', resetAt: phoneResult.resetAt });
      next();
    }).catch(() => {
      const phoneResult = check(phoneMap, phone, PHONE_LIMIT);
      if (!phoneResult.ok)
        return res.status(429).json({ error: '该号码验证码发送次数已达上限', resetAt: phoneResult.resetAt });
      next();
    });
    return;
  }

  next();
}

module.exports = smsRateLimit;
