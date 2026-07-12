const express = require('express');
const prisma = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { q, page = 1, pageSize = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const pageSizeNum = Math.max(1, parseInt(pageSize) || 20);
  const skip = (pageNum - 1) * pageSizeNum;

  const where = { isActive: 1 };
  if (q) {
    where.name = { contains: q };
  }

  const [total, consultants] = await Promise.all([
    prisma.consultant.count({ where }),
    prisma.consultant.findMany({ where, skip, take: pageSizeNum })
  ]);

  const min48h = new Date(Date.now() + 48 * 3600000).toISOString();
  const max7d  = new Date(Date.now() + (48 + 7 * 24) * 3600000).toISOString();
  const avail = await prisma.timeSlot.groupBy({
    by: ['consultantId'],
    where: { isBooked: 0, startTime: { gte: min48h, lte: max7d } },
    _count: true
  });
  const availSet = new Set(avail.filter(a => a._count > 0).map(a => a.consultantId));
  res.json({ total, items: consultants.map(c => ({ ...c, hasAvailableSlots: availSet.has(c.id) })) });
});

router.get('/my', authMiddleware, async (req, res) => {
  const c = await prisma.consultant.findUnique({ where: { userId: req.user.id } });
  if (!c) return res.status(404).json({ error: '未找到' });
  res.json(c);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: '无效的ID' });
  const min48h = new Date(Date.now() + 48 * 3600000).toISOString();
  const c = await prisma.consultant.findUnique({
    where: { id },
    include: { slots: { where: { startTime: { gt: min48h } }, orderBy: { startTime: 'asc' }, include: { booking: { select: { status: true } }, secondBookings: { select: { status: true } } } } }
  });
  if (!c) return res.status(404).json({ error: '未找到' });
  res.json(c);
});

router.post('/', ...requireRole('admin'), async (req, res) => {
  const c = await prisma.consultant.create({ data: req.body });
  res.json({ id: c.id });
});

router.put('/:id', authMiddleware, async (req, res) => {
  const c = await prisma.consultant.findUnique({ where: { id: Number(req.params.id) } });
  if (!c) return res.status(404).json({ error: '未找到' });
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && c.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.consultant.update({ where: { id: c.id }, data: req.body });
  res.json({ ok: true });
});

router.delete('/:id', ...requireRole('admin'), async (req, res) => {
  await prisma.consultant.update({ where: { id: Number(req.params.id) }, data: { isActive: 0 } });
  res.json({ ok: true });
});

router.get('/:id/week-slots', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.consultant.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ error: '未找到' });
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && c.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  const now = new Date().toISOString();
  const max = new Date(Date.now() + 8 * 86400000).toISOString();
  const slots = await prisma.timeSlot.findMany({ where: { consultantId: id, startTime: { gte: now, lte: max } }, orderBy: { startTime: 'asc' } });
  res.json(slots);
});

router.post('/:id/apply-template', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.consultant.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ error: '未找到' });
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && c.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  if (!c.weeklyTemplate) return res.status(400).json({ error: '未设置模板' });
  const tpl = JSON.parse(c.weeklyTemplate);
  const now = new Date();
  const newSlots = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const halfIndices = tpl[String(d.getDay())] || [];
    for (const hi of halfIndices) {
      const start = new Date(d); start.setHours(8 + Math.floor(hi / 2), (hi % 2) * 30, 0, 0);
      const end = new Date(start.getTime() + 30 * 60000);
      newSlots.push({ consultantId: id, startTime: start.toISOString(), endTime: end.toISOString() });
    }
  }
  const existing = await prisma.timeSlot.findMany({ where: { consultantId: id, startTime: { in: newSlots.map(s => s.startTime) } }, select: { startTime: true } });
  const existSet = new Set(existing.map(s => s.startTime));
  const toCreate = newSlots.filter(s => !existSet.has(s.startTime));
  if (toCreate.length) await prisma.timeSlot.createMany({ data: toCreate });
  res.json({ ok: true, created: toCreate.length });
});

router.post('/:id/slots', authMiddleware, async (req, res) => {
  const c = await prisma.consultant.findUnique({ where: { id: Number(req.params.id) } });
  if (!c) return res.status(404).json({ error: '未找到' });
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && c.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  const { slots } = req.body;
  await prisma.timeSlot.createMany({ data: slots.map(s => ({ consultantId: c.id, startTime: s.start_time, endTime: s.end_time })) });
  res.json({ ok: true });
});

router.delete('/slots/:slotId', authMiddleware, async (req, res) => {
  const slot = await prisma.timeSlot.findUnique({ where: { id: Number(req.params.slotId) }, include: { consultant: true } });
  if (!slot) return res.status(404).json({ error: '未找到' });
  if (slot.isBooked) return res.status(400).json({ error: '该时间段已有预约，无法删除' });
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && slot.consultant.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  await prisma.timeSlot.delete({ where: { id: slot.id } });
  res.json({ ok: true });
});

module.exports = router;
