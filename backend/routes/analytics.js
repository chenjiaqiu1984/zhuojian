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

module.exports = router;
