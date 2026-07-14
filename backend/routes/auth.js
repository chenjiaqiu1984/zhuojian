const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');
const ROLE_MAP = { '超级管理员': 'super_admin', '管理员': 'admin', '咨询师': 'consultant', '普通用户': 'user' };
const { sendSms } = require('../services/sms');
const { getPhoneByCode } = require('../services/wechat');
const { grantWelcomeCoupon } = require('./coupons');
const smsRateLimit = require('../middleware/smsRateLimit');
const captchaCheck = require('../middleware/captchaCheck');
const { create: createCaptcha } = require('../services/captcha');

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

function makeToken(u, rememberMe = false) {
  return jwt.sign({ id: u.id, username: u.username, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: rememberMe ? '30d' : '7d' });
}

function safeUser(u) {
  const role = ROLE_MAP[u.role] || u.role;
  return { id: u.id, username: u.username, phone: u.phone, email: u.email, role, status: u.status || 'active', name: u.name, avatar: u.avatar, termsAcceptedAt: u.termsAcceptedAt, termsVersion: u.termsVersion || '1.0', privacyVersion: u.privacyVersion || '1.0', hasPassword: !!u.password };
}

router.get('/captcha', (req, res) => {
  res.json(createCaptcha());
});

router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    const isPhone = /^1[3-9]\d{9}$/.test(username);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
    const where = isPhone ? { phone: username } : isEmail ? { email: username } : { username };
    const user = await prisma.user.findUnique({ where });
    if (!user || !user.password || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: '用户名或密码错误' });
    if (user.status === 'suspended') return res.status(403).json({ error: '账号已被封禁，请联系客服' });
    res.json({ token: makeToken(user, !!rememberMe), user: safeUser(user) });
  } catch { res.status(500).json({ error: '服务器错误' }); }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, name, phone, termsAccepted } = req.body;
    if (!username || !password) return res.status(400).json({ error: '参数不完整' });
    const data = {
      username, password: bcrypt.hashSync(password, 10), name, phone,
      ...(termsAccepted ? { termsAcceptedAt: new Date(), termsVersion: '1.0', privacyVersion: '1.0' } : {})
    };
    const user = await prisma.user.create({ data });
    grantWelcomeCoupon(user.id); // 注册送8折券（静默，不影响注册响应）
    res.json({ id: user.id });
  } catch { res.status(409).json({ error: '用户名已存在' }); }
});

router.post('/send-sms', smsRateLimit, captchaCheck, async (req, res) => {
  const { phone } = req.body;
  if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式错误' });
  const code = await saveCode(phone, 'sms');
  try { await sendSms(phone, code, 'login'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

router.post('/login-phone', async (req, res) => {
  const { phone, code, rememberMe } = req.body;
  if (!await verifyCode(phone, code, 'sms')) return res.status(400).json({ error: '验证码错误或已过期' });
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({ data: { phone, status: 'pending' } });
    grantWelcomeCoupon(user.id);
  }
  if (user.status === 'suspended') return res.status(403).json({ error: '账号已被封禁，请联系客服' });
  res.json({ token: makeToken(user, !!rememberMe), user: safeUser(user) });
});

// 微信手机号快速验证 + wx.login 一键登录
// phoneCode: getPhoneNumber 组件返回的 code（换手机号）
// loginCode: wx.login() 返回的 code（换 openid，用于绑定微信身份）
router.post('/login-phone-wechat', async (req, res) => {
  const { code: phoneCode, loginCode } = req.body;
  if (!phoneCode) return res.status(400).json({ error: '缺少 code 参数' });
  try {
    const phone = await getPhoneByCode(phoneCode);

    // 如果同时传了 loginCode，用它换 openid（绑定微信身份）
    let openid = null;
    if (loginCode) {
      const appid = process.env.WX_APPID, secret = process.env.WX_SECRET;
      if (appid && secret) {
        const r = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${loginCode}&grant_type=authorization_code`);
        const data = await r.json();
        if (!data.errcode) openid = data.openid;
      }
    }

    // 优先按手机号找用户，其次按 openid
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user && openid) user = await prisma.user.findUnique({ where: { wechatOpenid: openid } });

    if (!user) {
      // 新用户：同时绑定手机号 + openid（如果有）
      user = await prisma.user.create({
        data: { phone, status: 'pending', ...(openid ? { wechatOpenid: openid } : {}) }
      });
      grantWelcomeCoupon(user.id);
    } else {
      // 已有用户：补绑空缺的字段
      const updates = {};
      if (!user.phone && phone)   updates.phone = phone;
      if (!user.wechatOpenid && openid) updates.wechatOpenid = openid;
      if (Object.keys(updates).length) {
        user = await prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    if (user.status === 'suspended') return res.status(403).json({ error: '账号已被封禁，请联系客服' });

    // 一键登录默认 30 天免登录
    res.json({ token: makeToken(user, true), user: safeUser(user) });
  } catch (e) {
    console.error('[login-phone-wechat]', e.message);
    res.status(400).json({ error: e.message || '获取手机号失败，请重试' });
  }
});

router.post('/login-wechat', async (req, res) => {
  const { code } = req.body;
  const appid = process.env.WX_APPID, secret = process.env.WX_SECRET;
  if (!appid || !secret) return res.status(503).json({ error: '微信登录未配置' });
  try {
    const r = await fetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`);
    const data = await r.json();
    if (data.errcode) {
      console.error('[wx-login] jscode2session error:', data.errcode, data.errmsg, '| code prefix:', code?.slice(0, 8));
      return res.status(400).json({ error: data.errmsg, errcode: data.errcode });
    }
    let user = await prisma.user.findUnique({ where: { wechatOpenid: data.openid } });
    if (!user) {
      user = await prisma.user.create({ data: { wechatOpenid: data.openid, status: 'pending' } });
      grantWelcomeCoupon(user.id);
    }
    if (user.status === 'suspended') return res.status(403).json({ error: '账号已被封禁，请联系客服' });
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
    if (!user) {
      user = await prisma.user.create({ data: { qqOpenid: openid, status: 'pending' } });
      grantWelcomeCoupon(user.id);
    }
    if (user.status === 'suspended') return res.status(403).json({ error: '账号已被封禁，请联系客服' });
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

// 完善账号信息：接受协议 + 设置昵称 + 设置密码，将 status 改为 active
// 适用于通过短信/微信/QQ 登录但尚未完善信息的 pending 用户
router.put('/complete-setup', require('../middleware/auth').authMiddleware, async (req, res) => {
  try {
    const { name, username, password, termsAccepted } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: '请输入昵称' });
    if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' });
    if (!termsAccepted) return res.status(400).json({ error: '请先同意用户协议和隐私政策' });

    const data = {
      name: name.trim(),
      password: bcrypt.hashSync(password, 10),
      termsAcceptedAt: new Date(),
      termsVersion: '1.0',
      privacyVersion: '1.0',
      status: 'active',
    };
    if (username && username.trim()) {
      // 检查用户名是否已被占用（排除自己）
      const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existing && existing.id !== req.user.id) return res.status(409).json({ error: '用户名已被占用' });
      data.username = username.trim();
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    // 重新生成 token（payload 包含 name）
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (e) {
    console.error('[complete-setup]', e);
    res.status(500).json({ error: '保存失败，请重试' });
  }
});

router.post('/send-bind-sms', smsRateLimit, captchaCheck, require('../middleware/auth').authMiddleware, async (req, res) => {
  const { phone } = req.body;
  if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式错误' });
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return res.status(400).json({ error: '该手机号已被绑定' });
  const code = await saveCode(phone, 'bind-sms');
  try { await sendSms(phone, code, 'login'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

// 更换手机号：向新手机号发送验证码（需已登录）
router.post('/send-change-phone', smsRateLimit, captchaCheck, require('../middleware/auth').authMiddleware, async (req, res) => {
  const { phone } = req.body;
  if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '手机号格式错误' });
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing && existing.id !== req.user.id) return res.status(400).json({ error: '该手机号已被其他账号绑定' });
  const code = await saveCode(phone, 'change-phone');
  try { await sendSms(phone, code, 'changePhone'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

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

router.post('/send-reset', smsRateLimit, captchaCheck, async (req, res) => {
  const { target } = req.body;
  if (!/^1[3-9]\d{9}$/.test(target)) return res.status(400).json({ error: '请输入手机号' });
  const user = await prisma.user.findUnique({ where: { phone: target } });
  if (!user) return res.status(404).json({ error: '该手机号未注册' });
  const code = await saveCode(target, 'reset');
  try { await sendSms(target, code, 'reset'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message || '发送失败' }); }
});

router.post('/reset-password', async (req, res) => {
  const { target, code, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '新密码至少6位' });
  if (!await verifyCode(target, code, 'reset')) return res.status(400).json({ error: '验证码错误或已过期' });
  if (!/^1[3-9]\d{9}$/.test(target)) return res.status(400).json({ error: '手机号格式错误' });
  await prisma.user.update({ where: { phone: target }, data: { password: bcrypt.hashSync(newPassword, 10) } });
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
