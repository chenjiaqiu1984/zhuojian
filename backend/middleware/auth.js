const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'zhuojian_secret_2024';

const ROLE_MAP = { '超级管理员': 'super_admin', '管理员': 'admin', '咨询师': 'consultant', '普通用户': 'user' };

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未授权' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    if (ROLE_MAP[req.user.role]) req.user.role = ROLE_MAP[req.user.role];
    next();
  } catch {
    res.status(401).json({ error: 'token无效' });
  }
}

function requireRole(...roles) {
  // super_admin inherits all admin privileges
  const expanded = roles.includes('admin') && !roles.includes('super_admin')
    ? [...roles, 'super_admin'] : roles;
  return [authMiddleware, (req, res, next) => {
    if (!expanded.includes(req.user.role)) return res.status(403).json({ error: '权限不足' });
    next();
  }];
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  next();
}

module.exports = { authMiddleware, requireRole, optionalAuth, JWT_SECRET };
