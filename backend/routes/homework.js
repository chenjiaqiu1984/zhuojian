const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');
const crisis = require('../services/crisisDetect');

const router = express.Router();
const auth = requireRole('user', 'admin', 'consultant');

router.get('/mood', ...auth, async (req, res) => {
  const list = await prisma.moodEntry.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(list);
});

router.post('/mood', ...auth, async (req, res) => {
  const { mood, note, tags } = req.body;
  const entry = await prisma.moodEntry.create({ data: { userId: req.user.id, mood: Number(mood), note, tags } });
  const cr = crisis.detect([note]);
  if (cr.triggered) crisis.record({ userId: req.user.id, source: 'mood', content: note, ...cr });
  res.json({ ...entry, crisis: cr.triggered });
});

router.delete('/mood/:id', ...auth, async (req, res) => {
  const e = await prisma.moodEntry.findUnique({ where: { id: Number(req.params.id) } });
  if (!e || e.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.moodEntry.delete({ where: { id: e.id } });
  res.json({ ok: true });
});

router.get('/cbt', ...auth, async (req, res) => {
  const list = await prisma.cbtRecord.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(list);
});

router.post('/cbt', ...auth, async (req, res) => {
  const { situation, autoThought, emotion, evidenceFor, evidenceAgainst, balancedThought, outcome } = req.body;
  const r = await prisma.cbtRecord.create({ data: { userId: req.user.id, situation, autoThought: autoThought || '', emotion: emotion || '', evidenceFor, evidenceAgainst, balancedThought, outcome } });
  const cr = crisis.detect([situation, autoThought, emotion, outcome]);
  if (cr.triggered) crisis.record({ userId: req.user.id, source: 'cbt', content: [situation, autoThought, emotion].join(' '), ...cr });
  res.json({ ...r, crisis: cr.triggered });
});

router.put('/cbt/:id', ...auth, async (req, res) => {
  const r = await prisma.cbtRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  const { situation, autoThought, emotion, evidenceFor, evidenceAgainst, balancedThought, outcome, notes } = req.body;
  await prisma.cbtRecord.update({ where: { id: r.id }, data: { situation, autoThought, emotion, evidenceFor, evidenceAgainst, balancedThought, outcome, notes } });
  res.json({ ok: true });
});

router.delete('/cbt/:id', ...auth, async (req, res) => {
  const r = await prisma.cbtRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.cbtRecord.delete({ where: { id: r.id } });
  res.json({ ok: true });
});

router.get('/dream', ...auth, async (req, res) => {
  const list = await prisma.dreamRecord.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(list);
});

router.post('/dream', ...auth, async (req, res) => {
  const { dreamContent, freeAssociation, interpretation } = req.body;
  const r = await prisma.dreamRecord.create({ data: { userId: req.user.id, dreamContent, freeAssociation, interpretation } });
  const cr = crisis.detect([dreamContent, freeAssociation, interpretation]);
  if (cr.triggered) crisis.record({ userId: req.user.id, source: 'dream', content: dreamContent, ...cr });
  res.json({ ...r, crisis: cr.triggered });
});

router.put('/dream/:id', ...auth, async (req, res) => {
  const r = await prisma.dreamRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  const { dreamContent, freeAssociation, interpretation, notes } = req.body;
  await prisma.dreamRecord.update({ where: { id: r.id }, data: { dreamContent, freeAssociation, interpretation, notes } });
  res.json({ ok: true });
});

router.delete('/dream/:id', ...auth, async (req, res) => {
  const r = await prisma.dreamRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.dreamRecord.delete({ where: { id: r.id } });
  res.json({ ok: true });
});

router.get('/iceberg', ...auth, async (req, res) => {
  const list = await prisma.icebergRecord.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(list);
});

router.post('/iceberg', ...auth, async (req, res) => {
  const { behavior, coping, feeling, feelingOfFeeling, belief, expectation, yearning, self } = req.body;
  const r = await prisma.icebergRecord.create({ data: { userId: req.user.id, behavior, coping, feeling, feelingOfFeeling, belief, expectation, yearning, self } });
  const cr = crisis.detect([feeling, feelingOfFeeling, belief, yearning, self]);
  if (cr.triggered) crisis.record({ userId: req.user.id, source: 'iceberg', content: [feeling, belief, yearning].join(' '), ...cr });
  res.json({ ...r, crisis: cr.triggered });
});

router.put('/iceberg/:id', ...auth, async (req, res) => {
  const r = await prisma.icebergRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  const { behavior, coping, feeling, feelingOfFeeling, belief, expectation, yearning, self, notes } = req.body;
  await prisma.icebergRecord.update({ where: { id: r.id }, data: { behavior, coping, feeling, feelingOfFeeling, belief, expectation, yearning, self, notes } });
  res.json({ ok: true });
});

router.delete('/iceberg/:id', ...auth, async (req, res) => {
  const r = await prisma.icebergRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.icebergRecord.delete({ where: { id: r.id } });
  res.json({ ok: true });
});

// ── Homework Help ─────────────────────────────────────────────────

router.get('/help/pending', ...requireRole('admin', 'consultant'), async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const where = isAdmin ? {} : { consultantId: req.user.id };
  const list = await prisma.homeworkHelp.findMany({ where, orderBy: { createdAt: 'desc' } });
  const enriched = await Promise.all(list.map(async h => {
    const user = await prisma.user.findUnique({ where: { id: h.userId }, select: { name: true, phone: true } });
    let record = null;
    if (h.recordType === 'dream') record = await prisma.dreamRecord.findUnique({ where: { id: h.recordId } });
    else if (h.recordType === 'iceberg') record = await prisma.icebergRecord.findUnique({ where: { id: h.recordId } });
    return { ...h, user, record };
  }));
  res.json(enriched);
});

router.get('/help', ...auth, async (req, res) => {
  const list = await prisma.homeworkHelp.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json(list);
});

router.post('/help', ...auth, async (req, res) => {
  const { consultantId, recordType, recordId } = req.body;
  const existing = await prisma.homeworkHelp.findFirst({ where: { userId: req.user.id, recordType, recordId: Number(recordId) } });
  if (existing) return res.status(400).json({ error: '已申请过' });
  const consultant = await prisma.consultant.findUnique({ where: { id: Number(consultantId) } });
  const r = await prisma.homeworkHelp.create({ data: { userId: req.user.id, consultantId: Number(consultantId), recordType, recordId: Number(recordId), price: consultant?.price || 0 } });
  res.json(r);
});

router.put('/help/:id/reply', ...requireRole('admin', 'consultant'), async (req, res) => {
  const r = await prisma.homeworkHelp.findUnique({ where: { id: Number(req.params.id) } });
  if (!r) return res.status(404).json({ error: '未找到' });
  await prisma.homeworkHelp.update({ where: { id: r.id }, data: { reply: req.body.reply, status: 'replied' } });
  res.json({ ok: true });
});

router.get('/rule', ...auth, async (req, res) => {
  const list = await prisma.ruleRecord.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(list);
});

router.post('/rule', ...auth, async (req, res) => {
  const { originalRule, context, source, originalFunction, cost, exceptions, newRule } = req.body;
  const r = await prisma.ruleRecord.create({ data: { userId: req.user.id, originalRule, context, source, originalFunction, cost, exceptions, newRule } });
  const cr = crisis.detect([originalRule, context, cost, newRule]);
  if (cr.triggered) crisis.record({ userId: req.user.id, source: 'rule', content: [originalRule, context].join(' '), ...cr });
  res.json({ ...r, crisis: cr.triggered });
});

router.put('/rule/:id', ...auth, async (req, res) => {
  const r = await prisma.ruleRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  const { originalRule, context, source, originalFunction, cost, exceptions, newRule, notes } = req.body;
  await prisma.ruleRecord.update({ where: { id: r.id }, data: { originalRule, context, source, originalFunction, cost, exceptions, newRule, notes } });
  res.json({ ok: true });
});

router.delete('/rule/:id', ...auth, async (req, res) => {
  const r = await prisma.ruleRecord.findUnique({ where: { id: Number(req.params.id) } });
  if (!r || r.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.ruleRecord.delete({ where: { id: r.id } });
  res.json({ ok: true });
});

module.exports = router;
