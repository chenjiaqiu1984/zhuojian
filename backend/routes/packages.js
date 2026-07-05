const express = require('express');
const prisma = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── 公开：获取启用中的套餐列表 ──────────────────────────────────
// GET /api/packages
router.get('/', async (req, res) => {
  try {
    const packages = await prisma.consultPackage.findMany({
      where: { isActive: 1 },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 用户：查询自己持有的套餐 ────────────────────────────────────
// GET /api/packages/my
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const list = await prisma.userPackage.findMany({
      where: { userId: req.user.id },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 用户：购买套餐（创建支付订单，支付成功后发放 UserPackage）──
// POST /api/packages/:id/buy
router.post('/:id/buy', authMiddleware, async (req, res) => {
  try {
    const pkg = await prisma.consultPackage.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!pkg || !pkg.isActive) return res.status(404).json({ error: '套餐不存在或已下架' });

    // 套餐价格 = 咨询师原价 × 购买次数（amount 由前端传入，后端仅做保存）
    // 调用方需传 { amount } 单位：分
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: '请传入套餐金额' });

    const ts   = Date.now().toString();
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const orderNo  = `PKG${ts}${req.user.id}${rand}`;
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    // 创建订单，payType=package，bookingId=null
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId:       req.user.id,
        amount,
        payType:      'package',
        expireAt,
        discountRate: 1.0,
        // userPackageId 在支付成功回调后更新
      },
    });

    res.json({ orderNo, packageId: pkg.id, totalSessions: pkg.sessions + pkg.bonusSessions });
  } catch (err) {
    console.error('[packages] buy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 用户：使用套餐次数预约（无需支付，直接扣减）────────────────
// POST /api/packages/use/:userPackageId
router.post('/use/:userPackageId', authMiddleware, async (req, res) => {
  try {
    const up = await prisma.userPackage.findUnique({
      where: { id: Number(req.params.userPackageId) },
    });
    if (!up)                         return res.status(404).json({ error: '套餐不存在' });
    if (up.userId !== req.user.id)   return res.status(403).json({ error: '权限不足' });
    if (up.status !== 'active')      return res.status(400).json({ error: '套餐已失效' });
    if (up.usedSessions >= up.totalSessions)
      return res.status(400).json({ error: '套餐次数已用完' });
    if (up.expireAt && up.expireAt < new Date())
      return res.status(400).json({ error: '套餐已过期' });

    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: '请传入 bookingId' });

    // 验证预约归属
    const booking = await prisma.booking.findUnique({
      where: { id: Number(bookingId) },
      include: { consultant: { select: { autoConfirm: true } } },
    });
    if (!booking)                   return res.status(404).json({ error: '预约不存在' });
    if (booking.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });

    const newUsed = up.usedSessions + 1;
    const newStatus = newUsed >= up.totalSessions ? 'exhausted' : 'active';

    await prisma.$transaction([
      // 扣减次数
      prisma.userPackage.update({
        where: { id: up.id },
        data:  { usedSessions: newUsed, status: newStatus },
      }),
      // 确认预约
      prisma.booking.update({
        where: { id: Number(bookingId) },
        data:  {
          status: booking.consultant?.autoConfirm ? 'confirmed' : 'pending',
        },
      }),
    ]);

    res.json({ ok: true, usedSessions: newUsed, remaining: up.totalSessions - newUsed });
  } catch (err) {
    console.error('[packages] use error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Admin：创建套餐 ──────────────────────────────────────────────
// POST /api/packages
router.post('/', ...requireRole('admin'), async (req, res) => {
  try {
    const { name, sessions, bonusSessions = 0, description, sortOrder = 0 } = req.body;
    if (!name || !sessions) return res.status(400).json({ error: '请填写套餐名称和次数' });
    const pkg = await prisma.consultPackage.create({
      data: { name, sessions: Number(sessions), bonusSessions: Number(bonusSessions), description, sortOrder: Number(sortOrder) },
    });
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin：更新套餐 ──────────────────────────────────────────────
// PUT /api/packages/:id
router.put('/:id', ...requireRole('admin'), async (req, res) => {
  try {
    const { name, sessions, bonusSessions, description, sortOrder, isActive } = req.body;
    const data = {};
    if (name         !== undefined) data.name          = name;
    if (sessions     !== undefined) data.sessions      = Number(sessions);
    if (bonusSessions !== undefined) data.bonusSessions = Number(bonusSessions);
    if (description  !== undefined) data.description   = description;
    if (sortOrder    !== undefined) data.sortOrder      = Number(sortOrder);
    if (isActive     !== undefined) data.isActive       = Number(isActive);
    await prisma.consultPackage.update({ where: { id: Number(req.params.id) }, data });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin：删除（软删除=停用）套餐 ──────────────────────────────
// DELETE /api/packages/:id
router.delete('/:id', ...requireRole('admin'), async (req, res) => {
  try {
    await prisma.consultPackage.update({
      where: { id: Number(req.params.id) },
      data:  { isActive: 0 },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin：发放套餐给用户（支付成功后或手动补发）────────────────
// POST /api/packages/grant
router.post('/grant', ...requireRole('admin'), async (req, res) => {
  try {
    const { userId, packageId, expireDays } = req.body;
    const pkg = await prisma.consultPackage.findUnique({ where: { id: Number(packageId) } });
    if (!pkg) return res.status(404).json({ error: '套餐不存在' });

    const expireAt = expireDays ? new Date(Date.now() + Number(expireDays) * 86400000) : null;
    const up = await prisma.userPackage.create({
      data: {
        userId:        Number(userId),
        packageId:     pkg.id,
        totalSessions: pkg.sessions + pkg.bonusSessions,
        paidAmount:    0,
        expireAt,
      },
    });
    res.json(up);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
