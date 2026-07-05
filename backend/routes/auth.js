const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');
const { sendSms } = require('../services/sms');
const { sendEmail } = require('../services/email');

const router = express.Router();

function genCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function saveCode(target, type) {
  const code = genCode();
  await prisma.verifyCode.deleteMany({ where: { target, type } });
  await prisma.verifyCode.create({ data: { target, code, type, expiresAt: BigInt(Date.now() + 5 * 60 * 1000) } });
  return code;
}

async function verifyCode(target, code, type) {
  const row = await prisma.verifyCode.findFirst({ where: { target, type, used: 0 }, orderBy: { id: 'desc' } });
  if (!row || row.code !== code || Date.now() > Number(row.expiresAt)) return false;
  await prisma.verifyCode.update({ where: { id: row.id }, data: { used: 1 } });
  return true;
}

function makeToken(u) {
  return jwt.sign({ id: u.id, username: u.username, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' });
}

function safeUser(u) {
  return { id: u.id, username: u.username, phone: u.phone, email: u.email, role: u.role, name: u.name, avatar: u.avatar, termsAcceptedAt: u.termsAcceptedAt };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const isPhone = /^1[3-9]\d{9}$/.test(username);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
    const where = isPhone ? { phone: username } : isEmail ? { email: username } : { username };
    const user = await prisma.user.findUnique({ where });
    if (!user || !user.password || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: '用户名或密码错误' });
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch { res.status(500).json({ error: '服务器错误' }); }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, phone, termsAccepted } = req.body;
    if (!username || !password) return res.status(400).json({ error: '参数不完整' });
    const data = {
      username, password: bcrypt.hashSync(password, 10), name, phone,
      ...(termsAccepted ? { termsAcceptedAt: new Date() } : {})
    };
    const user = await prisma.user.create({ data });
    res.json({ id: user.id });
  } catch { res.status(409).json({ error: '用户名已存在' }); }
});

router.post('/send-sms', async (req, res) => {
  const { phone } = req.body;
  if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式错误' });
  const code = await saveCode(phone, 'sms');
  try { await sendSms(phone, code); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

router.post('/login-phone', async (req, res) => {
  const { phone, code, termsAccepted } = req.body;
  if (!await verifyCode(phone, code, 'sms')) return res.status(400).json({ error: '验证码错误或已过期' });
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({ data: { phone, ...(termsAccepted ? { termsAcceptedAt: new Date() } : {}) } });
  } else if (termsAccepted && !user.termsAcceptedAt) {
    user = await prisma.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date() } });
  }
  res.json({ token: makeToken(user), user: safeUser(user) });
});

router.post('/send-email', async (req, res) => {
  const { email } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '邮箱格式错误' });
  const code = await saveCode(email, 'email');
  try { await sendEmail(email, code); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

router.post('/login-email', async (req, res) => {
  const { email, code, termsAccepted } = req.body;
  if (!await verifyCode(email, code, 'email')) return res.status(400).json({ error: '验证码错误或已过期' });
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, ...(termsAccepted ? { termsAcceptedAt: new Date() } : {}) } });
  } else if (termsAccepted && !user.termsAcceptedAt) {
    user = await prisma.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date() } });
  }
  res.json({ token: makeToken(user), user: safeUser(user) });
});

router.post('/login-wechat', async (req, res) => {
  const { code } = req.body;
  const appid = process.env.WX_APPID, secret = process.env.WX_SECRET;
  if (!appid || !secret) return res.status(503).json({ error: '微信登录未配置' });
  try {
    const r = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`);
    const data = await r.json();
    if (data.errcode) return res.status(400).json({ error: data.errmsg });
    let user = await prisma.user.findUnique({ where: { wechatOpenid: data.openid } });
    if (!user) user = await prisma.user.create({ data: { wechatOpenid: data.openid } });
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch { res.status(500).json({ error: '微信登录失败' }); }
});

router.post('/login-qq', async (req, res) => {
  const { access_token } = req.body;
  if (!process.env.QQ_APPID) return res.status(503).json({ error: 'QQ登录未配置' });
  try {
    const r = await fetch(`https://graph.qq.com/oauth2.0/me?access_token=${access_token}&fmt=json`);
    const { openid } = await r.json();
    let user = await prisma.user.findUnique({ where: { qqOpenid: openid } });
    if (!user) user = await prisma.user.create({ data: { qqOpenid: openid } });
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch { res.status(500).json({ error: 'QQ登录失败' }); }
});

router.put('/profile', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { name, avatar, termsAcceptedAt } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (avatar !== undefined) data.avatar = avatar;
  if (termsAcceptedAt !== undefined) data.termsAcceptedAt = new Date(termsAcceptedAt);
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ user: safeUser(user) });
});

router.post('/send-bind-sms', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { phone } = req.body;
  if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式错误' });
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return res.status(400).json({ error: '该手机号已被绑定' });
  const code = await saveCode(phone, 'bind-sms');
  try { await sendSms(phone, code); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

// 更换手机号：向新手机号发送验证码（需已登录）
router.post('/send-change-phone', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { phone } = req.body;
  if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式错误' });
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing && existing.id !== req.user.id) return res.status(400).json({ error: '该手机号已被其他账号绑定' });
  const code = await saveCode(phone, 'change-phone');
  try { await sendSms(phone, code); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

// 更换手机号：验证验证码并更新（需已登录）
router.post('/change-phone', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { phone, code } = req.body;
  if (!await verifyCode(phone, code, 'change-phone')) return res.status(400).json({ error: '验证码错误或已过期' });
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing && existing.id !== req.user.id) return res.status(400).json({ error: '该手机号已被其他账号绑定' });
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { phone } });
  res.json({ user: safeUser(user) });
});

router.post('/bind-phone', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { phone, code } = req.body;
  if (!await verifyCode(phone, code, 'bind-sms')) return res.status(400).json({ error: '验证码错误或已过期' });
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return res.status(400).json({ error: '该手机号已被绑定' });
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { phone } });
  res.json({ user: safeUser(user) });
});

router.post('/send-bind-email', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { email } = req.body;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: '邮箱格式错误' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: '该邮箱已被绑定' });
  const code = await saveCode(email, 'bind-email');
  try { await sendEmail(email, code); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

router.post('/bind-email', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { email, code } = req.body;
  if (!await verifyCode(email, code, 'bind-email')) return res.status(400).json({ error: '验证码错误或已过期' });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: '该邮箱已被绑定' });
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { email } });
  res.json({ user: safeUser(user) });
});

router.post('/send-reset', async (req, res) => {
  const { target } = req.body;
  const isPhone = /^1[3-9]\d{9}$/.test(target);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  if (!isPhone && !isEmail) return res.status(400).json({ error: '请输入手机号或邮箱' });
  const user = isPhone
    ? await prisma.user.findUnique({ where: { phone: target } })
    : await prisma.user.findUnique({ where: { email: target } });
  if (!user) return res.status(404).json({ error: '该账号不存在' });
  const code = await saveCode(target, 'reset');
  try {
    if (isPhone) await sendSms(target, code);
    else await sendEmail(target, code);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

router.post('/reset-password', async (req, res) => {
  const { target, code, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '新密码至少6位' });
  if (!await verifyCode(target, code, 'reset')) return res.status(400).json({ error: '验证码错误或已过期' });
  const isPhone = /^1[3-9]\d{9}$/.test(target);
  const where = isPhone ? { phone: target } : { email: target };
  await prisma.user.update({ where, data: { password: bcrypt.hashSync(newPassword, 10) } });
  res.json({ ok: true });
});

router.put('/password', require('../middleware/auth').authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '新密码至少6位' });
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.password && !bcrypt.compareSync(oldPassword || '', user.password))
    return res.status(400).json({ error: '原密码错误' });
  await prisma.user.update({ where: { id: req.user.id }, data: { password: bcrypt.hashSync(newPassword, 10) } });
  res.json({ ok: true });
});

module.exports = router;
