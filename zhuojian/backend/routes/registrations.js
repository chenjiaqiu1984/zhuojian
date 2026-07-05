const express = require('express');
const prisma = require('../db/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

router.post('/', async (req, res) => {
  const { phone, newsId, source } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ error: '请输入有效的手机号' });
  await prisma.activityRegistration.create({ data: { phone, newsId: newsId ? Number(newsId) : null, source: source || null } });
  res.json({ ok: true });
});

router.get('/', ...requireRole('admin'), async (req, res) => {
  const { newsId } = req.query;
  const where = newsId ? { newsId: Number(newsId) } : {};
  res.json(await prisma.activityRegistration.findMany({ where, orderBy: { createdAt: 'desc' } }));
});

module.exports = router;
