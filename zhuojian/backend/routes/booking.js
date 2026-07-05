const express = require('express');
const prisma = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const { role, id } = req.user;
  let bookings;
  if (role === 'admin') {
    bookings = await prisma.booking.findMany({ include: { user: true, consultant: true, slot: true }, orderBy: { createdAt: 'desc' } });
  } else if (role === 'consultant') {
    const c = await prisma.consultant.findUnique({ where: { userId: id } });
    bookings = c ? await prisma.booking.findMany({ where: { consultantId: c.id }, include: { user: true, slot: true }, orderBy: { createdAt: 'desc' } }) : [];
  } else {
    bookings = await prisma.booking.findMany({ where: { userId: id }, include: { consultant: true, slot: true }, orderBy: { createdAt: 'desc' } });
  }
  res.json(bookings.map(b => ({
    ...b, user_name: b.user?.name, consultant_name: b.consultant?.name,
    start_time: b.slot?.startTime, end_time: b.slot?.endTime
  })));
});

router.post('/', authMiddleware, async (req, res) => {
  const { consultant_id, slot_id, second_slot_id, notes } = req.body;
  const activeCount = await prisma.booking.count({ where: { userId: req.user.id, status: { in: ['pending', 'confirmed'] } } });
  if (activeCount >= 3) return res.status(400).json({ error: '最多同时预约3个时间段' });

  const [slot, slot2, consultant] = await Promise.all([
    prisma.timeSlot.findFirst({ where: { id: Number(slot_id), isBooked: 0 } }),
    second_slot_id ? prisma.timeSlot.findFirst({ where: { id: Number(second_slot_id), isBooked: 0 } }) : null,
    prisma.consultant.findUnique({ where: { id: Number(consultant_id) }, select: { autoConfirm: true } })
  ]);
  if (!slot) return res.status(400).json({ error: '该时间段已被预约' });
  if (second_slot_id && !slot2) return res.status(400).json({ error: '第二个时间段已被预约' });
  const hoursUntil = (new Date(slot.startTime) - Date.now()) / 3600000;
  if (hoursUntil < 48) return res.status(400).json({ error: '须提前48小时预约' });

  const status = consultant?.autoConfirm ? 'confirmed' : 'pending';
  const updates = [
    prisma.booking.create({ data: { userId: req.user.id, consultantId: Number(consultant_id), slotId: Number(slot_id), secondSlotId: second_slot_id ? Number(second_slot_id) : null, notes, status } }),
    prisma.timeSlot.update({ where: { id: Number(slot_id) }, data: { isBooked: 1 } }),
    ...(slot2 ? [prisma.timeSlot.update({ where: { id: Number(second_slot_id) }, data: { isBooked: 1 } })] : [])
  ];
  await prisma.$transaction(updates);
  res.json({ ok: true });
});

router.put('/:id/status', authMiddleware, async (req, res) => {
  const { status, message } = req.body;
  const booking = await prisma.booking.findUnique({ where: { id: Number(req.params.id) }, include: { slot: true } });
  if (!booking) return res.status(404).json({ error: '未找到' });
  const { role, id } = req.user;
  if (role === 'user' && booking.userId !== id) return res.status(403).json({ error: '权限不足' });
  if (role === 'consultant') {
    const c = await prisma.consultant.findUnique({ where: { userId: id } });
    if (!c || booking.consultantId !== c.id) return res.status(403).json({ error: '权限不足' });
  }

  if (status === 'cancelled') {
    const hoursUntil = (new Date(booking.slot.startTime) - Date.now()) / 3600000;
    if (hoursUntil < 12) return res.status(400).json({ error: '距预约时间不足12小时，无法取消' });
    const msg = hoursUntil < 24 ? '已取消（距预约时间不足24小时，将扣除30%费用）' : (message || '已取消');
    const ops = [
      prisma.booking.update({ where: { id: booking.id }, data: { status, message: msg } }),
      prisma.timeSlot.update({ where: { id: booking.slotId }, data: { isBooked: 0 } }),
    ];
    if (booking.secondSlotId) ops.push(prisma.timeSlot.update({ where: { id: booking.secondSlotId }, data: { isBooked: 0 } }));
    await prisma.$transaction(ops);
  } else {
    await prisma.booking.update({ where: { id: booking.id }, data: { status, message } });
  }
  res.json({ ok: true });
});

module.exports = router;
