const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();
const crypto = require('crypto');

function calcScore(answers, questions, scoringRule) {
  const rule = JSON.parse(scoringRule);
  if (rule.method === 'sum') {
    const total = questions.reduce((s, q) => s + (answers[q.id] ?? 0), 0);
    return { totalScore: total, dimensions: null };
  }
  if (rule.method === 'weighted_sum') {
    let total = questions.reduce((s, q) => {
      let v = answers[q.id] ?? 1;
      if (rule.reverseItems?.includes(q.orderNum)) v = 5 - v;
      return s + v;
    }, 0);
    return { totalScore: Math.round(total * (rule.multiplier || 1)), dimensions: null };
  }
  if (rule.method === 'dimension_sum') {
    const dims = {};
    for (const dim of rule.dimensions) {
      let sum = 0, cnt = 0;
      for (const on of dim.questions) {
        const q = questions.find(q => q.orderNum === on);
        if (!q) continue;
        let v = answers[q.id] ?? 3;
        if (dim.reverse?.includes(on)) v = 6 - v;
        sum += v; cnt++;
      }
      dims[dim.code] = cnt ? parseFloat((sum / cnt).toFixed(2)) : 0;
    }
    const vals = Object.values(dims);
    return { totalScore: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)), dimensions: dims };
  }
  if (rule.method === 'dimension_category') {
    const dims = {};
    for (const dim of rule.dimensions) {
      let aScore = 0, bScore = 0;
      for (const on of (dim.aQuestions || [])) {
        const q = questions.find(q => q.orderNum === on);
        if (q) aScore += answers[q.id] === 0 ? 1 : 0;
      }
      for (const on of (dim.bQuestions || [])) {
        const q = questions.find(q => q.orderNum === on);
        if (q) bScore += answers[q.id] === 1 ? 1 : 0;
      }
      dims[dim.code] = aScore >= bScore ? dim.aType : dim.bType;
    }
    return { totalScore: 0, dimensions: dims };
  }
  return { totalScore: 0, dimensions: null };
}

function determineLevel(totalScore, dimensions, scoringRule) {
  const rule = JSON.parse(scoringRule);
  if (rule.method === 'dimension_category') return Object.values(dimensions).join('');
  if (!rule.levels) return '未知';
  const lvl = rule.levels.find(l => totalScore >= l.min && totalScore <= l.max);
  return lvl ? lvl.level : '未知';
}

function getDetail(totalScore, dimensions, scoringRule) {
  const rule = JSON.parse(scoringRule);
  if (!rule.levels) return null;
  const lvl = rule.levels.find(l => totalScore >= l.min && totalScore <= l.max);
  return lvl?.detail || null;
}

// GET /api/assessment/scales
router.get('/scales', async (req, res) => {
  const scales = await prisma.assessmentScale.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, category: true, description: true, isPaid: true, price: true, totalQuestions: true, estimatedMinutes: true }
  });
  res.json(scales);
});

// GET /api/assessment/scales/:id
router.get('/scales/:id', async (req, res) => {
  const scale = await prisma.assessmentScale.findUnique({
    where: { id: Number(req.params.id) },
    include: { questions: { orderBy: { orderNum: 'asc' } } }
  });
  if (!scale) return res.status(404).json({ error: '量表不存在' });
  res.json(scale);
});

// GET /api/assessment/check-access/:scaleId (requires login)
router.get('/check-access/:scaleId', authMiddleware, async (req, res) => {
  const scale = await prisma.assessmentScale.findUnique({ where: { id: Number(req.params.scaleId) } });
  if (!scale) return res.status(404).json({ error: '量表不存在' });
  const pushed = await prisma.assessmentVoucher.findFirst({
    where: { targetUserId: req.user.id, usedBy: null, OR: [{ scaleId: null }, { scaleId: scale.id }] }
  });
  if (pushed && (!pushed.expiresAt || pushed.expiresAt > new Date())) {
    return res.json({ canDo: true, reason: 'pushed', voucherCode: pushed.code });
  }
  if (scale.isPaid) return res.json({ canDo: false, reason: 'paid', price: scale.price });
  const count = await prisma.assessmentResult.count({ where: { userId: req.user.id, scaleId: scale.id } });
  if (count === 0) return res.json({ canDo: true, reason: 'free' });
  res.json({ canDo: false, reason: 'repeat', price: scale.price || 900 });
});

// POST /api/assessment/submit
router.post('/submit', async (req, res) => {
  const { scaleId, answers, voucherCode } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zhuojian_secret_2024');
      userId = decoded.id;
    } catch {}
  }

  const scale = await prisma.assessmentScale.findUnique({
    where: { id: Number(scaleId) },
    include: { questions: true }
  });
  if (!scale) return res.status(404).json({ error: '量表不存在' });

  const { totalScore, dimensions } = calcScore(answers, scale.questions, scale.scoringRule);
  const level = determineLevel(totalScore, dimensions, scale.scoringRule);
  const detail = userId ? getDetail(totalScore, dimensions, scale.scoringRule) : null;

  // Access control
  let voucher = null;
  if (voucherCode) {
    voucher = await prisma.assessmentVoucher.findFirst({
      where: { code: voucherCode, usedBy: null, OR: [{ scaleId: null }, { scaleId: scale.id }], OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
    });
    if (!voucher) return res.status(400).json({ error: '兑换码无效或已使用' });
  }

  if (!userId) {
    return res.json({ score: totalScore, level, dimensions, saved: false, requireLogin: true });
  }

  // Auto-apply targeted voucher if no code provided
  if (!voucher) {
    const pushed = await prisma.assessmentVoucher.findFirst({
      where: { targetUserId: userId, usedBy: null, OR: [{ scaleId: null }, { scaleId: scale.id }] }
    });
    if (pushed && (!pushed.expiresAt || pushed.expiresAt > new Date())) voucher = pushed;
  }

  if (!voucher) {
    if (scale.isPaid) return res.status(402).json({ requirePayment: true, price: scale.price, message: '支付功能开发中，请使用兑换码' });
    const count = await prisma.assessmentResult.count({ where: { userId, scaleId: scale.id } });
    if (count > 0) return res.status(402).json({ requirePayment: true, price: scale.price || 900, reason: 'repeat', message: '再次测评需要付费' });
  }

  const result = await prisma.assessmentResult.create({
    data: {
      userId, scaleId: scale.id, answers: JSON.stringify(answers),
      totalScore, dimensions: dimensions ? JSON.stringify(dimensions) : null,
      level, voucherId: voucher?.id
    }
  });

  if (voucher) {
    await prisma.assessmentVoucher.update({ where: { id: voucher.id }, data: { usedBy: userId, usedAt: new Date() } });
  }

  res.json({ score: totalScore, level, dimensions, detail, resultId: result.id, saved: true });
});

// GET /api/assessment/results (requires login)
router.get('/results', authMiddleware, async (req, res) => {
  const results = await prisma.assessmentResult.findMany({
    where: { userId: req.user.id },
    include: { scale: { select: { name: true, code: true } } },
    orderBy: { completedAt: 'desc' }
  });
  res.json(results);
});

// GET /api/assessment/results/:id
router.get('/results/:id', authMiddleware, async (req, res) => {
  const result = await prisma.assessmentResult.findFirst({
    where: { id: Number(req.params.id), userId: req.user.id },
    include: { scale: true }
  });
  if (!result) return res.status(404).json({ error: '记录不存在' });
  const detail = getDetail(result.totalScore, result.dimensions ? JSON.parse(result.dimensions) : null, result.scale.scoringRule);
  res.json({ ...result, detail });
});

// POST /api/assessment/voucher/redeem
router.post('/voucher/redeem', authMiddleware, async (req, res) => {
  const { code, scaleId } = req.body;
  const voucher = await prisma.assessmentVoucher.findFirst({
    where: { code, usedBy: null, OR: [{ scaleId: null }, { scaleId: Number(scaleId) }] }
  });
  if (!voucher) return res.status(400).json({ error: '兑换码无效或已使用' });
  if (voucher.expiresAt && voucher.expiresAt < new Date()) return res.status(400).json({ error: '兑换码已过期' });
  res.json({ valid: true, voucherId: voucher.id });
});

// POST /api/assessment/pay/:scaleId
router.post('/pay/:scaleId', authMiddleware, async (req, res) => {
  const scale = await prisma.assessmentScale.findUnique({ where: { id: Number(req.params.scaleId) } });
  if (!scale) return res.status(404).json({ error: '量表不存在' });
  res.status(402).json({ price: scale.price || 900, currency: 'CNY', message: '支付功能开发中，请联系管理员获取兑换码' });
});

// PATCH /api/assessment/admin/scales/:id
router.patch('/admin/scales/:id', ...requireRole('admin'), async (req, res) => {
  const { isActive, price } = req.body;
  const data = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (price !== undefined) data.price = price;
  const scale = await prisma.assessmentScale.update({ where: { id: Number(req.params.id) }, data });
  res.json(scale);
});

// GET /api/assessment/admin/vouchers
router.get('/admin/vouchers', ...requireRole('admin'), async (req, res) => {
  const vouchers = await prisma.assessmentVoucher.findMany({
    orderBy: { createdAt: 'desc' },
    include: { scale: { select: { name: true } } }
  });
  res.json(vouchers);
});

// POST /api/assessment/admin/vouchers
router.post('/admin/vouchers', ...requireRole('admin'), async (req, res) => {
  const { count = 1, scaleId, expiresAt } = req.body;
  const data = Array.from({ length: Number(count) }, () => ({
    code: crypto.randomBytes(4).toString('hex').toUpperCase(),
    scaleId: scaleId ? Number(scaleId) : null,
    createdBy: req.user.id,
    expiresAt: expiresAt ? new Date(expiresAt) : null
  }));
  await prisma.assessmentVoucher.createMany({ data });
  res.json({ created: data.length, codes: data.map(d => d.code) });
});

// GET /api/assessment/admin/scales
router.get('/admin/scales', ...requireRole('admin'), async (req, res) => {
  const scales = await prisma.assessmentScale.findMany({ orderBy: { id: 'asc' } });
  res.json(scales);
});

// GET /api/assessment/my-available - free + pushed assessments for current user
router.get('/my-available', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const [allScales, doneRows, pushed] = await Promise.all([
    prisma.assessmentScale.findMany({ where: { isActive: true }, select: { id: true, name: true, category: true, description: true, totalQuestions: true, estimatedMinutes: true, isPaid: true } }),
    prisma.assessmentResult.findMany({ where: { userId }, select: { scaleId: true } }),
    prisma.assessmentVoucher.findMany({
      where: { targetUserId: userId, usedBy: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { scale: { select: { id: true, name: true, category: true, description: true, totalQuestions: true, estimatedMinutes: true } } }
    })
  ]);
  const doneIds = new Set(doneRows.map(r => r.scaleId));
  const pushedScaleIds = new Set(pushed.map(v => v.scaleId).filter(Boolean));
  const result = [];
  for (const v of pushed) {
    if (v.scale) result.push({ ...v.scale, reason: 'pushed', expiresAt: v.expiresAt });
    else {
      const s = allScales.find(s => !pushedScaleIds.has(s.id) && !doneIds.has(s.id));
      if (s) result.push({ ...s, reason: 'pushed', expiresAt: v.expiresAt });
    }
  }
  for (const s of allScales) {
    if (!s.isPaid && !doneIds.has(s.id) && !pushedScaleIds.has(s.id)) result.push({ ...s, reason: 'free' });
  }
  res.json(result);
});

// GET /api/assessment/push-search?phone=xxx
router.get('/push-search', authMiddleware, async (req, res) => {
  if (!['admin', 'consultant'].includes(req.user.role)) return res.status(403).json({ error: '权限不足' });
  const user = await prisma.user.findFirst({ where: { phone: req.query.phone }, select: { id: true, name: true, phone: true } });
  res.json(user || null);
});

// POST /api/assessment/push
router.post('/push', authMiddleware, async (req, res) => {
  if (!['admin', 'consultant'].includes(req.user.role)) return res.status(403).json({ error: '权限不足' });
  const { targetUserId, scaleId, expiresAt } = req.body;
  if (!targetUserId) return res.status(400).json({ error: '缺少目标用户' });
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  await prisma.assessmentVoucher.create({
    data: { code, scaleId: scaleId ? Number(scaleId) : null, createdBy: req.user.id, targetUserId: Number(targetUserId), expiresAt: expiresAt ? new Date(expiresAt) : null }
  });
  res.json({ ok: true });
});

module.exports = router;
