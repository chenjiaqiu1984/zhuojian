const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, event, page, data } = req.body;
  try {
    await prisma.eventLog.create({ data: { userId: userId || null, event, page, data: data || null } });
  } catch {}
  res.json({ ok: true });
});

router.get('/ohcard-ranks', async (req, res) => {
  const rows = await prisma.eventLog.findMany({ where: { event: 'ohcard_open' }, select: { data: true } });
  const counts = {};
  rows.forEach(r => {
    try {
      const { cat, id, name } = JSON.parse(r.data);
      const key = `${cat}::${id ?? name}`;
      if (!counts[key]) counts[key] = { cat, id, name, count: 0 };
      counts[key].count++;
    } catch {}
  });
  res.json(Object.values(counts).sort((a, b) => b.count - a.count));
});

router.get('/stats', ...requireRole('admin'), async (req, res) => {
  const [total, byPage, byEvent, recent, homeworkCounts] = await Promise.all([
    prisma.eventLog.count(),
    prisma.eventLog.groupBy({ by: ['page'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.eventLog.groupBy({ by: ['event'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.eventLog.findMany({ take: 50, orderBy: { createdAt: 'desc' }, select: { id: true, userId: true, event: true, page: true, data: true, createdAt: true } }),
    Promise.all(['mood','cbt','dream','iceberg','rule'].map(async p => ({
      page: p,
      count: await prisma.eventLog.count({ where: { event: 'homework_save', page: p } })
    })))
  ]);
  res.json({ total, byPage, byEvent, recent, homeworkCounts });
});

router.get('/assessment-stats', ...requireRole('admin'), async (req, res) => {
  const [totalCompletions, completionsByScale, levelCounts, eventRows, scales] = await Promise.all([
    prisma.eventLog.count(),
    prisma.assessmentResult.groupBy({ by: ['scaleId'], _count: { id: true } }),
    prisma.assessmentResult.groupBy({ by: ['level'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 15 }),
    prisma.eventLog.findMany({
      where: { event: { in: ['scale_view', 'assessment_start', 'assessment_submit'] } },
      select: { event: true, data: true }
    }),
    prisma.assessmentScale.findMany({ select: { id: true, name: true } })
  ]);

  const scaleMap = Object.fromEntries(scales.map(s => [s.id, s.name]));
  const completionMap = Object.fromEntries(completionsByScale.map(r => [r.scaleId, r._count.id]));
  const perScale = {};
  for (const row of eventRows) {
    try {
      const { scaleId } = JSON.parse(row.data || '{}');
      if (!scaleId) continue;
      if (!perScale[scaleId]) perScale[scaleId] = { scaleId, views: 0, starts: 0, submits: 0 };
      if (row.event === 'scale_view') perScale[scaleId].views++;
      else if (row.event === 'assessment_start') perScale[scaleId].starts++;
      else if (row.event === 'assessment_submit') perScale[scaleId].submits++;
    } catch {}
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const dailyRows = await prisma.assessmentResult.findMany({
    where: { completedAt: { gte: since } },
    select: { completedAt: true }
  });
  const daily = {};
  dailyRows.forEach(r => {
    const day = r.completedAt.toISOString().slice(0, 10);
    daily[day] = (daily[day] || 0) + 1;
  });

  const totalAssessmentCompletions = completionsByScale.reduce((s, r) => s + r._count.id, 0);
  const scaleStats = Object.values(perScale).map(s => ({
    ...s,
    name: scaleMap[s.scaleId] || `量表${s.scaleId}`,
    completions: completionMap[s.scaleId] || 0
  })).sort((a, b) => b.completions - a.completions);

  res.json({ totalCompletions: totalAssessmentCompletions, scaleStats, levelCounts, daily });
});

module.exports = router;
