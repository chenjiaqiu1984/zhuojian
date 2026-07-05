const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'zhuojian_secret_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未授权' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'token无效' });
  }
}

function requireRole(...roles) {
  return [authMiddleware, (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: '权限不足' });
    next();
  }];
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  next();
}

module.exports = { authMiddleware, requireRole, optionalAuth, JWT_SECRET };
