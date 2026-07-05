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

router.get('/stats', requireRole('admin'), async (req, res) => {
  const [total, byPage, byEvent, recent] = await Promise.all([
    prisma.eventLog.count(),
    prisma.eventLog.groupBy({ by: ['page'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.eventLog.groupBy({ by: ['event'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.eventLog.findMany({ take: 50, orderBy: { createdAt: 'desc' }, select: { id: true, userId: true, event: true, page: true, data: true, createdAt: true } })
  ]);
  res.json({ total, byPage, byEvent, recent });
});

module.exports = router;
