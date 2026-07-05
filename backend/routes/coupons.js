const express = require('express');
const prisma = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── 工具：计算优惠券减免金额（分）────────────────────────────────
function calcDiscount(coupon, amount) {
  if (!coupon || coupon.type === 'activity') return 0;
  if (coupon.type === 'discount')   return Math.round(amount * (1 - coupon.value));
  if (coupon.type === 'direct')     return Math.round(coupon.value);
  if (coupon.type === 'threshold')  return amount >= coupon.threshold ? Math.round(coupon.value) : 0;
  return 0;
}
module.exports.calcDiscount = calcDiscount;

// ── 工具：向指定用户发放一张券 ───────────────────────────────────
async function grantCouponToUser(userId, couponId) {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || !coupon.isActive) return null;

  // 检查每人限领次数
  const held = await prisma.userCoupon.count({
    where: { userId, couponId, status: { not: 'expired' } }
  });
  if (held >= coupon.perUserLimit) return null;

  // 检查发行总量
  if (coupon.totalLimit !== null && coupon.usedCount >= coupon.totalLimit) return null;

  const uc = await prisma.userCoupon.create({
    data: { userId, couponId, status: 'available' }
  });
  return uc;
}
module.exports.grantCouponToUser = grantCouponToUser;

// ── 工具：注册赠券（欢迎8折券）────────────────────────────────────
async function grantWelcomeCoupon(userId) {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { code: 'WELCOME_DISCOUNT' } });
    if (coupon && coupon.isActive) await grantCouponToUser(userId, coupon.id);
  } catch {}
}
module.exports.grantWelcomeCoupon = grantWelcomeCoupon;

// ── 公开：活动券列表（用户可自领）───────────────────────────────
// GET /api/coupons/activity
router.get('/activity', async (req, res) => {
  try {
    const list = await prisma.coupon.findMany({
      where: { isPublic: 1, isActive: 1 },
      select: { id: true, code: true, name: true, description: true, type: true,
                value: true, threshold: true, scope: true, expireAt: true,
                totalLimit: true, usedCount: true, perUserLimit: true }
    });
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 用户：我的优惠券 ────────────────────────────────────────────
// GET /api/coupons/my
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const list = await prisma.userCoupon.findMany({
      where: { userId: req.user.id },
      include: { coupon: true },
      orderBy: { createdAt: 'desc' }
    });
    // 自动将已过期的券标记为 expired（懒更新）
    const now = new Date();
    const updated = list.map(uc => {
      if (uc.status === 'available' && uc.coupon.expireAt && uc.coupon.expireAt < now) {
        return { ...uc, status: 'expired' };
      }
      return uc;
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 用户：查询当前金额可用的券 ──────────────────────────────────
// GET /api/coupons/available?amount=5000
router.get('/available', authMiddleware, async (req, res) => {
  try {
    const amount = Number(req.query.amount) || 0;
    const list = await prisma.userCoupon.findMany({
      where: { userId: req.user.id, status: 'available' },
      include: { coupon: true }
    });
    const now = new Date();
    const result = list
      .filter(uc => !uc.coupon.expireAt || uc.coupon.expireAt > now)
      .map(uc => ({
        ...uc,
        discount: calcDiscount(uc.coupon, amount),
        applicable: calcDiscount(uc.coupon, amount) > 0 || uc.coupon.type === 'activity'
      }));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── 用户：领取活动券 / 输入兑换码 ──────────────────────────────
// POST /api/coupons/claim
router.post('/claim', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: '请输入券码' });

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) return res.status(404).json({ error: '券码无效或已失效' });
    if (!coupon.isPublic) return res.status(403).json({ error: '该券不支持自行领取' });

    const uc = await grantCouponToUser(req.user.id, coupon.id);
    if (!uc) return res.status(400).json({ error: '已达领取上限或券已发完' });

    res.json({ ok: true, userCoupon: { ...uc, coupon } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin：优惠券列表 ────────────────────────────────────────────
// GET /api/coupons
router.get('/', ...requireRole('admin'), async (req, res) => {
  try {
    const list = await prisma.coupon.findMany({ orderBy: { id: 'desc' } });
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin：创建优惠券模板 ────────────────────────────────────────
// POST /api/coupons
router.post('/', ...requireRole('admin'), async (req, res) => {
  try {
    const {
      code, name, description, type, value, threshold = 0,
      scope = 'consultation', isPublic = 0, perUserLimit = 1,
      totalLimit = null, expireAt = null
    } = req.body;
    if (!code || !name || !type || value === undefined)
      return res.status(400).json({ error: '缺少必填字段' });
    const coupon = await prisma.coupon.create({
      data: {
        code, name, description, type,
        value: Number(value), threshold: Number(threshold),
        scope, isPublic: Number(isPublic), perUserLimit: Number(perUserLimit),
        totalLimit: totalLimit ? Number(totalLimit) : null,
        expireAt: expireAt ? new Date(expireAt) : null,
        createdBy: req.user.id
      }
    });
    res.json(coupon);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: '券码已存在' });
    res.status(500).json({ error: err.message });
  }
});

// ── Admin：更新优惠券 ────────────────────────────────────────────
// PUT /api/coupons/:id
router.put('/:id', ...requireRole('admin'), async (req, res) => {
  try {
    const allow = ['name','description','value','threshold','scope','isPublic',
                   'perUserLimit','totalLimit','expireAt','isActive'];
    const data = {};
    allow.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    if (data.expireAt) data.expireAt = new Date(data.expireAt);
    await prisma.coupon.update({ where: { id: Number(req.params.id) }, data });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin：停用优惠券 ────────────────────────────────────────────
// DELETE /api/coupons/:id
router.delete('/:id', ...requireRole('admin'), async (req, res) => {
  try {
    await prisma.coupon.update({
      where: { id: Number(req.params.id) },
      data:  { isActive: 0 }
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin：发送优惠券给用户 ─────────────────────────────────────
// POST /api/coupons/:id/send
// body: { targets: 'all' | number[] }
//   'all'   = 发给所有用户
//   [1,2,3] = 发给指定用户 ID 列表
router.post('/:id/send', ...requireRole('admin'), async (req, res) => {
  try {
    const couponId = Number(req.params.id);
    const { targets } = req.body;
    if (!targets) return res.status(400).json({ error: '请指定发送对象' });

    let userIds = [];
    if (targets === 'all') {
      const users = await prisma.user.findMany({ select: { id: true } });
      userIds = users.map(u => u.id);
    } else if (Array.isArray(targets)) {
      userIds = targets.map(Number).filter(Boolean);
    } else {
      return res.status(400).json({ error: 'targets 格式错误' });
    }

    let granted = 0;
    for (const uid of userIds) {
      const uc = await grantCouponToUser(uid, couponId);
      if (uc) granted++;
    }

    // 更新已用数量快照（仅供展示，不影响校验逻辑）
    await prisma.coupon.update({
      where: { id: couponId },
      data:  { usedCount: { increment: 0 } } // 触发刷新，实际 usedCount 在使用时累增
    });

    res.json({ ok: true, granted, total: userIds.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin：查询用户持券记录 ─────────────────────────────────────
// GET /api/coupons/:id/users
router.get('/:id/users', ...requireRole('admin'), async (req, res) => {
  try {
    const list = await prisma.userCoupon.findMany({
      where: { couponId: Number(req.params.id) },
      include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
