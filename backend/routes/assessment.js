const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, requireRole, optionalAuth } = require('../middleware/auth');
const prisma = new PrismaClient();
const crypto = require('crypto');
const crisis = require('../services/crisisDetect');

// 量表结果等级含以下词时触发危机提示
const SEVERE_KEYWORDS = ['重度', '严重', '极重', '高危', '重型'];

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
    if (!Array.isArray(rule.dimensions) || !rule.dimensions.length) return { totalScore: 0, dimensions: null };
    const dims = {};
    for (const dim of rule.dimensions) {
      let sum = 0, cnt = 0;
      for (const on of (dim.questions || dim.items || [])) {
        const q = questions.find(q => q.orderNum === on);
        if (!q) continue;
        let v = answers[q.id] ?? 3;
        if (dim.reverse?.includes(on)) v = 6 - v;
        sum += v; cnt++;
      }
      dims[dim.code || dim.name] = cnt ? parseFloat((sum / cnt).toFixed(2)) : 0;
    }
    const vals = Object.values(dims);
    return { totalScore: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)), dimensions: dims };
  }
  if (rule.method === 'dimension_total') {
    const dims = {};
    for (const dim of rule.dimensions) {
      let sum = 0;
      const dimQs = dim.questions
        ? questions.filter(q => dim.questions.includes(q.orderNum))
        : questions.filter(q => q.dimension === dim.code);
      for (const q of dimQs) {
        let v = answers[q.id] ?? 0;
        if (dim.reverse?.includes(q.orderNum)) v = (dim.maxScore ?? 4) - v;
        sum += v;
      }
      dims[dim.code] = sum;
    }
    const total = Object.values(dims).reduce((a, b) => a + b, 0);
    return { totalScore: total, dimensions: dims };
  }
  if (rule.method === 'flow') {
    const qMap = Object.fromEntries(questions.map(q => [q.orderNum, q]));
    const resultMap = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:10};
    let cur = rule.start || 1;
    for (let i = 0; i < 50; i++) {
      const q = qMap[cur];
      if (!q) break;
      const chosen = answers[q.id];
      if (chosen === undefined) break;
      const opts = JSON.parse(q.options);
      const opt = opts.find(o => o.value === chosen);
      if (!opt?.next) break;
      if (/^[A-Z]$/.test(opt.next)) return { totalScore: resultMap[opt.next] ?? 1, dimensions: { result: opt.next } };
      cur = Number(opt.next.replace('q', ''));
    }
    return { totalScore: 0, dimensions: null };
  }
  if (rule.method === 'direct') {
    const v = Object.values(answers)[0] ?? 0;
    return { totalScore: v, dimensions: null };
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
  if (rule.method === 'mbti') {
    const counts = {};
    for (const q of questions) {
      const v = answers[q.id];
      if (v != null) counts[v] = (counts[v] || 0) + 1;
    }
    return { totalScore: 0, dimensions: counts };
  }
  // Fallback: sum by q.dimension when no method specified
  const dims = {};
  for (const q of questions) {
    const v = Number(answers[q.id]) || 0;
    if (q.dimension) dims[q.dimension] = (dims[q.dimension] || 0) + v;
  }
  if (Object.keys(dims).length > 0) {
    return { totalScore: Object.values(dims).reduce((a, b) => a + b, 0), dimensions: dims };
  }
  return { totalScore: 0, dimensions: null };
}

function determineLevel(totalScore, dimensions, scoringRule, interpretations) {
  const rule = JSON.parse(scoringRule);
  if (rule.method === 'dimension_category') return Object.values(dimensions).join('');
  if (rule.method === 'mbti') {
    const tieBreak = { E: 'I', S: 'N', T: 'F', J: 'P' };
    return ['E/I', 'S/N', 'T/F', 'J/P'].map(pair => {
      const [a, b] = pair.split('/');
      const ca = dimensions[a] || 0, cb = dimensions[b] || 0;
      return ca > cb ? a : cb > ca ? b : tieBreak[a];
    }).join('');
  }
  if (interpretations?.length) {
    const m = interpretations.find(i => !i.dimension && totalScore >= i.minScore && totalScore <= i.maxScore);
    if (m) return m.level || m.detail || '未知';
  }
  if (!rule.levels) return '未知';
  const lvl = rule.levels.find(l => totalScore >= l.min && totalScore <= l.max);
  return lvl ? lvl.level : '未知';
}

function getTypeDesc(scoringRule, interpretations, level) {
  const rule = JSON.parse(scoringRule);
  if (rule.method !== 'mbti' || !level) return null;
  const m = interpretations.find(i => i.dimension === level);
  return m?.level || null;
}

// dimension=null for overall; pass dimension name for per-dimension detail
function getDetail(score, scoringRule, interpretations, dimension = null) {
  const rule = JSON.parse(scoringRule);
  if (rule.method === 'mbti') {
    if (!dimension) return null;
    const m = interpretations.find(i => i.dimension === dimension);
    return m?.detail || null;
  }
  if (interpretations?.length) {
    const m = interpretations.find(i => (i.dimension ?? null) === dimension && score >= i.minScore && score <= i.maxScore);
    if (m) return m.detail;
  }
  if (dimension) return null;
  const lvl = rule.levels?.find(l => score >= l.min && score <= l.max);
  return lvl?.detail || null;
}

// GET /api/assessment/scales
router.get('/scales', async (req, res) => {
  const scales = await prisma.assessmentScale.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true, category: true, description: true, introduction: true, isPaid: true, price: true, totalQuestions: true, estimatedMinutes: true, usageCount: true }
  });
  res.json(scales);
});

// GET /api/assessment/scales/:id?age=25&gender=M
router.get('/scales/:id', async (req, res) => {
  const scale = await prisma.assessmentScale.findUnique({
    where: { id: Number(req.params.id) },
    include: { questions: { orderBy: { orderNum: 'asc' } } }
  });
  if (!scale) return res.status(404).json({ error: '量表不存在' });
  const { age, gender } = req.query;
  let questions = scale.questions;
  if (age || gender) {
    questions = questions.filter(q => {
      const ageOk = !age || ((q.ageMin == null || q.ageMin <= Number(age)) && (q.ageMax == null || q.ageMax >= Number(age)));
      const genderOk = !q.gender || !gender || q.gender === gender;
      return ageOk && genderOk;
    });
  }
  res.json({ ...scale, questions });
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
  const count = await prisma.assessmentResult.count({ where: { userId: req.user.id, scaleId: scale.id } });
  if (count < 100) return res.json({ canDo: true, reason: 'free' });
  res.json({ canDo: false, reason: 'repeat', price: scale.price || 900 });
});

// POST /api/assessment/submit
router.post('/submit', optionalAuth, async (req, res) => {
  try {
  const { scaleId, answers, voucherCode } = req.body;
  const userId = req.user?.id || null;

  const scale = await prisma.assessmentScale.findUnique({
    where: { id: Number(scaleId) },
    include: { questions: true }
  });
  if (!scale) return res.status(404).json({ error: '量表不存在' });

  const interpretations = await prisma.assessmentInterpretation.findMany({ where: { scaleId: scale.id } });
  const { totalScore, dimensions } = calcScore(answers, scale.questions, scale.scoringRule);
  const level = determineLevel(totalScore, dimensions, scale.scoringRule, interpretations);
  const detail = userId ? getDetail(totalScore, scale.scoringRule, interpretations, level) : null;

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
    const count = await prisma.assessmentResult.count({ where: { userId, scaleId: scale.id } });
    if (count >= 100) return res.status(402).json({ requirePayment: true, price: scale.price || 900, reason: 'repeat', message: '再次测评需要付费' });
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

  // Save per-question answers
  const questionMap = Object.fromEntries(scale.questions.map(q => [q.id, q]));
  await prisma.assessmentAnswer.createMany({
    data: Object.entries(answers)
      .filter(([qId]) => questionMap[Number(qId)])
      .map(([qId, score]) => ({ resultId: result.id, questionId: Number(qId), score: isNaN(Number(score)) ? 0 : Number(score) }))
  });

  // Clear saved progress
  await prisma.assessmentProgress.deleteMany({ where: { userId, scaleId: scale.id } });

  res.json({ score: totalScore, level, dimensions, detail, typeDesc: getTypeDesc(scale.scoringRule, interpretations, level), resultId: result.id, saved: true, crisis: SEVERE_KEYWORDS.some(w => (level || '').includes(w)) });
  if (SEVERE_KEYWORDS.some(w => (level || '').includes(w))) {
    crisis.record({ userId, source: `assessment:${scale.name}`, content: `${scale.name} - ${level}`, level: 'medium', matched: [level] });
  }
  } catch (e) {
    console.error('submit error:', e);
    res.status(500).json({ error: e.message || '提交失败，请稍后再试' });
  }
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
  const interpretations = await prisma.assessmentInterpretation.findMany({ where: { scaleId: result.scaleId } });
  const rule2 = JSON.parse(result.scale.scoringRule);
  const detail = getDetail(result.totalScore, result.scale.scoringRule, interpretations, rule2.method === 'mbti' ? result.level : null);
  const dimDetails = {};
  if (result.dimensions) {
    for (const [dim, score] of Object.entries(JSON.parse(result.dimensions))) {
      const d = getDetail(typeof score === 'number' ? score : 0, result.scale.scoringRule, interpretations, dim);
      if (d) dimDetails[dim] = d;
    }
  }
  const dims = result.dimensions ? JSON.parse(result.dimensions) : {};
  const hasAbnormal = interpretations.some(i => {
    if (i.isNormal !== 'N') return false;
    const score = i.dimension ? dims[i.dimension] : result.totalScore;
    return score !== undefined && score >= i.minScore && score <= i.maxScore;
  });
  const typeDesc = rule2.method === 'mbti' ? getTypeDesc(result.scale.scoringRule, interpretations, result.level) : null;
  res.json({ ...result, detail, typeDesc, dimDetails, hasAbnormal });
});

// GET /api/assessment/progress/:scaleId
router.get('/progress/:scaleId', authMiddleware, async (req, res) => {
  const progress = await prisma.assessmentProgress.findUnique({
    where: { userId_scaleId: { userId: req.user.id, scaleId: Number(req.params.scaleId) } }
  });
  res.json(progress ? { answers: JSON.parse(progress.answers), updatedAt: progress.updatedAt } : null);
});

// POST /api/assessment/progress
router.post('/progress', authMiddleware, async (req, res) => {
  const { scaleId, answers } = req.body;
  await prisma.assessmentProgress.upsert({
    where: { userId_scaleId: { userId: req.user.id, scaleId: Number(scaleId) } },
    update: { answers: JSON.stringify(answers) },
    create: { userId: req.user.id, scaleId: Number(scaleId), answers: JSON.stringify(answers) }
  });
  res.json({ ok: true });
});

// DELETE /api/assessment/progress/:scaleId
router.delete('/progress/:scaleId', authMiddleware, async (req, res) => {
  await prisma.assessmentProgress.deleteMany({ where: { userId: req.user.id, scaleId: Number(req.params.scaleId) } });
  res.json({ ok: true });
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

// GET /api/assessment/admin/scales/:id (full detail with questions)
router.get('/admin/scales/:id', ...requireRole('admin'), async (req, res) => {
  const scale = await prisma.assessmentScale.findUnique({
    where: { id: Number(req.params.id) },
    include: { questions: { orderBy: { orderNum: 'asc' } } }
  });
  if (!scale) return res.status(404).json({ error: '量表不存在' });
  res.json(scale);
});

// PUT /api/assessment/admin/scales/:id (full update with questions)
router.put('/admin/scales/:id', ...requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { questions, scoringRule, ...scaleData } = req.body;
  delete scaleData.id;
  if (scoringRule) scaleData.scoringRule = typeof scoringRule === 'string' ? scoringRule : JSON.stringify(scoringRule);
  if (questions) scaleData.totalQuestions = questions.length;
  await prisma.assessmentScale.update({ where: { id }, data: scaleData });
  if (questions) {
    await prisma.assessmentQuestion.deleteMany({ where: { scaleId: id } });
    await prisma.assessmentQuestion.createMany({
      data: questions.map(q => ({
        scaleId: id, orderNum: q.orderNum, content: q.content,
        options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
        dimension: q.dimension || null
      }))
    });
  }
  res.json({ ok: true });
});

// POST /api/assessment/admin/scales (create new scale)
router.post('/admin/scales', ...requireRole('admin'), async (req, res) => {
  const { questions, scoringRule, ...scaleData } = req.body;
  if (scoringRule) scaleData.scoringRule = typeof scoringRule === 'string' ? scoringRule : JSON.stringify(scoringRule);
  scaleData.totalQuestions = questions?.length || 0;
  const scale = await prisma.assessmentScale.create({ data: scaleData });
  if (questions?.length) {
    await prisma.assessmentQuestion.createMany({
      data: questions.map(q => ({
        scaleId: scale.id, orderNum: q.orderNum, content: q.content,
        options: typeof q.options === 'string' ? q.options : JSON.stringify(q.options),
        dimension: q.dimension || null
      }))
    });
  }
  res.json(scale);
});

// GET /api/assessment/admin/vouchers
router.get('/admin/vouchers', ...requireRole('admin'), async (req, res) => {
  const { q, page = 1, pageSize = 20, status } = req.query;
  const now = new Date();
  const where = {};
  if (q) where.code = { contains: q };
  if (status === 'unused') {
    where.usedBy = null;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  } else if (status === 'used') {
    where.usedBy = { not: null };
  } else if (status === 'expired') {
    where.usedBy = null;
    where.AND = [{ expiresAt: { not: null } }, { expiresAt: { lte: now } }];
  }
  const [total, items] = await Promise.all([
    prisma.assessmentVoucher.count({ where }),
    prisma.assessmentVoucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { scale: { select: { name: true } } },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize)
    })
  ]);
  res.json({ total, items });
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
  const { q, page = 1, pageSize = 20 } = req.query;
  const where = q ? { name: { contains: q } } : {};
  const [total, items] = await Promise.all([
    prisma.assessmentScale.count({ where }),
    prisma.assessmentScale.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize)
    })
  ]);
  res.json({ total, items });
});

// GET /api/assessment/admin/scales/:id/interpretations
router.get('/admin/scales/:id/interpretations', ...requireRole('admin'), async (req, res) => {
  const items = await prisma.assessmentInterpretation.findMany({ where: { scaleId: Number(req.params.id) }, orderBy: { id: 'asc' } });
  res.json(items);
});

// POST /api/assessment/admin/scales/:id/interpretations
router.post('/admin/scales/:id/interpretations', ...requireRole('admin'), async (req, res) => {
  const { dimension, minScore, maxScore, ageMin, ageMax, gender, level, detail } = req.body;
  const item = await prisma.assessmentInterpretation.create({
    data: { scaleId: Number(req.params.id), dimension: dimension || null, minScore, maxScore, ageMin: ageMin || null, ageMax: ageMax || null, gender: gender || null, level: level || null, detail }
  });
  res.json(item);
});

// DELETE /api/assessment/admin/interpretations/:id
router.delete('/admin/interpretations/:id', ...requireRole('admin'), async (req, res) => {
  await prisma.assessmentInterpretation.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// GET /api/assessment/my-vouchers - all vouchers pushed to current user
router.get('/my-vouchers', authMiddleware, async (req, res) => {
  const vouchers = await prisma.assessmentVoucher.findMany({
    where: { targetUserId: req.user.id },
    include: { scale: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(vouchers);
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

// POST /api/assessment/track/:id
router.post('/track/:id', async (req, res) => {
  await prisma.assessmentScale.updateMany({ where: { id: Number(req.params.id) }, data: { usageCount: { increment: 1 } } });
  res.json({ ok: true });
});

// GET /api/assessment/favorites
router.get('/favorites', authMiddleware, async (req, res) => {
  const favs = await prisma.assessmentFavorite.findMany({ where: { userId: req.user.id }, select: { scaleId: true } });
  res.json(favs.map(f => f.scaleId));
});

// POST /api/assessment/favorite/:id  (toggle)
router.post('/favorite/:id', authMiddleware, async (req, res) => {
  const key = { userId: req.user.id, scaleId: Number(req.params.id) };
  const existing = await prisma.assessmentFavorite.findUnique({ where: { userId_scaleId: key } });
  if (existing) {
    await prisma.assessmentFavorite.delete({ where: { userId_scaleId: key } });
    res.json({ favorited: false });
  } else {
    await prisma.assessmentFavorite.create({ data: key });
    res.json({ favorited: true });
  }
});

module.exports = router;
