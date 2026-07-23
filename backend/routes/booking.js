const express = require('express');
const prisma = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { refund: wxRefund } = require('../services/wechatpay');
const { alipayRefund } = require('../services/alipay');

const router = express.Router();

router.get('/admin', authMiddleware, requireRole(['admin', 'super_admin']), async (req, res) => {
  const { q, status, page = 1, pageSize = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const where = {};
  if (status) where.status = status;

  if (q) {
    where.OR = [
      { consultant: { name: { contains: q } } },
      { user: { name: { contains: q } } },
      { user: { phone: { contains: q } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip,
      take,
      include: { user: true, consultant: true, slot: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({
    total,
    items: items.map(b => ({
      ...b,
      user_name: b.user?.name,
      user_phone: b.user?.phone,
      consultant_name: b.consultant?.name,
      start_time: b.slot?.startTime,
      end_time: b.slot?.endTime,
    })),
  });
});

router.get('/', authMiddleware, async (req, res) => {
  const { role, id } = req.user;
  let bookings;
  if (role === 'admin' || role === 'super_admin') {
    bookings = await prisma.booking.findMany({ include: { user: true, consultant: true, slot: true }, orderBy: { createdAt: 'desc' } });
  } else if (role === 'consultant') {
    const c = await prisma.consultant.findUnique({ where: { userId: id } });
    bookings = c ? await prisma.booking.findMany({ where: { consultantId: c.id }, include: { user: true, slot: true }, orderBy: { createdAt: 'desc' } }) : [];
  } else {
    bookings = await prisma.booking.findMany({ where: { userId: id }, include: { consultant: true, slot: true }, orderBy: { createdAt: 'desc' } });
  }
  res.json(bookings.map(b => ({
    ...b, user_name: b.user?.name, consultant_name: b.consultant?.name,
    consultant_price: b.consultant?.price ?? 0,
    consultant_discount_rate: b.consultant?.discountRate ?? 1.0,
    start_time: b.slot?.startTime, end_time: b.slot?.endTime
  })));
});

router.post('/', authMiddleware, async (req, res) => {
  const { consultant_id, slot_id, second_slot_id, notes } = req.body;
  const activeCount = await prisma.booking.count({
    where: { userId: req.user.id, status: { in: ['pending_payment', 'pending', 'confirmed'] } }
  });
  if (activeCount >= 3) return res.status(400).json({ error: '最多同时预约3个时间段' });

  try {
    if (notes && String(notes).trim()) {
      const { assertTextSafe } = require('../services/contentSafe');
      await assertTextSafe(String(notes).trim(), req.user.id, 2);
    }
  } catch (err) {
    const { handleContentError } = require('../services/contentSafe');
    if (handleContentError(res, err)) return;
    throw err;
  }

  const [slot, slot2, consultant] = await Promise.all([
    prisma.timeSlot.findFirst({ where: { id: Number(slot_id), isBooked: 0 } }),
    second_slot_id ? prisma.timeSlot.findFirst({ where: { id: Number(second_slot_id), isBooked: 0 } }) : null,
    prisma.consultant.findUnique({
      where: { id: Number(consultant_id) },
      select: { autoConfirm: true, price: true }
    })
  ]);
  if (!slot) return res.status(400).json({ error: '该时间段已被预约' });
  if (second_slot_id && !slot2) return res.status(400).json({ error: '第二个时间段已被预约' });
  const hoursUntil = (new Date(slot.startTime) - Date.now()) / 3600000;
  if (hoursUntil < 48) return res.status(400).json({ error: '须提前48小时预约' });

  // 有价格则等待支付；免费才直接 pending/confirmed
  const needPay = consultant?.price > 0;
  const status = needPay ? 'pending_payment'
    : (consultant?.autoConfirm ? 'confirmed' : 'pending');

  // 清除该槽位上已取消/过期的旧预约（slotId 有唯一约束，不清除会导致 P2002）
  const slotIds = [Number(slot_id), ...(second_slot_id ? [Number(second_slot_id)] : [])];
  await prisma.booking.deleteMany({
    where: { slotId: { in: slotIds }, status: { in: ['cancelled'] } }
  });

  const updates = [
    prisma.booking.create({
      data: {
        userId: req.user.id,
        consultantId: Number(consultant_id),
        slotId: Number(slot_id),
        secondSlotId: second_slot_id ? Number(second_slot_id) : null,
        notes,
        status
      }
    }),
    prisma.timeSlot.update({ where: { id: Number(slot_id) }, data: { isBooked: 1 } }),
    ...(slot2 ? [prisma.timeSlot.update({ where: { id: Number(second_slot_id) }, data: { isBooked: 1 } })] : [])
  ];
  let booking;
  try {
    [booking] = await prisma.$transaction(updates);
  } catch (e) {
    if (e?.code === 'P2002') return res.status(400).json({ error: '该时间段已被预约' });
    throw e;
  }
  res.json({ ok: true, id: booking.id, needPay, status });
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
    // pending_payment 状态（尚未支付）：直接取消，无时间限制
    if (booking.status === 'pending_payment') {
      const ops = [
        prisma.booking.update({ where: { id: booking.id }, data: { status: 'cancelled', message: '用户取消' } }),
        prisma.timeSlot.update({ where: { id: booking.slotId }, data: { isBooked: 0 } }),
      ];
      if (booking.secondSlotId) ops.push(prisma.timeSlot.update({ where: { id: booking.secondSlotId }, data: { isBooked: 0 } }));
      await prisma.$transaction(ops);
    } else {
      const hoursUntil = (new Date(booking.slot.startTime) - Date.now()) / 3600000;
      if (hoursUntil < 24) return res.status(400).json({ error: '距预约时间不足24小时，不予退款且无法取消' });
      const refundRatio = hoursUntil >= 48 ? 1 : 0.5;
      const msg = hoursUntil < 48 ? '已取消（距预约时间不足48小时，退款50%）' : (message || '已取消');
      const ops = [
        prisma.booking.update({ where: { id: booking.id }, data: { status, message: msg } }),
        prisma.timeSlot.update({ where: { id: booking.slotId }, data: { isBooked: 0 } }),
      ];
      if (booking.secondSlotId) ops.push(prisma.timeSlot.update({ where: { id: booking.secondSlotId }, data: { isBooked: 0 } }));
      await prisma.$transaction(ops);

      // 触发已支付订单退款
      const paidOrder = await prisma.order.findFirst({
        where: { bookingId: booking.id, status: 'paid' }
      });
      if (paidOrder) {
        const refundAmount = Math.floor(paidOrder.amount * refundRatio);
        const refundNo = `RF${paidOrder.orderNo}`;
        try {
          if (paidOrder.payType === 'alipay') {
            await alipayRefund({ tradeNo: paidOrder.transactionId, refundAmount, outRequestNo: refundNo });
          } else {
            await wxRefund({ transactionId: paidOrder.transactionId, refundNo, refundAmount, totalAmount: paidOrder.amount });
          }
          await prisma.order.update({ where: { id: paidOrder.id }, data: { status: 'refunded' } });
          if (paidOrder.userCouponId) {
            const uc = await prisma.userCoupon.findUnique({ where: { id: paidOrder.userCouponId }, select: { couponId: true } });
            await prisma.userCoupon.update({ where: { id: paidOrder.userCouponId }, data: { status: 'available', usedAt: null } });
            if (uc) await prisma.coupon.update({ where: { id: uc.couponId }, data: { usedCount: { decrement: 1 } } });
          }
          return res.json({ ok: true, refunded: true, refundAmount });
        } catch (refundErr) {
          console.error('[booking cancel] refund failed:', refundErr.message);
          return res.json({ ok: true, refunded: false, refundError: '取消成功，退款处理失败，请联系客服' });
        }
      }
    }
  } else {
    await prisma.booking.update({ where: { id: booking.id }, data: { status, message } });
  }
  res.json({ ok: true });
});

router.put('/:id/reschedule', authMiddleware, async (req, res) => {
  const { slot_id, second_slot_id } = req.body;
  const booking = await prisma.booking.findUnique({ where: { id: Number(req.params.id) } });
  if (!booking) return res.status(404).json({ error: '未找到' });
  const { role, id } = req.user;
  if (role === 'user' && booking.userId !== id) return res.status(403).json({ error: '权限不足' });
  if (role === 'consultant') {
    const c = await prisma.consultant.findUnique({ where: { userId: id } });
    if (!c || booking.consultantId !== c.id) return res.status(403).json({ error: '权限不足' });
  }
  if (!['pending', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: '无法修改' });

  const newSlot = await prisma.timeSlot.findFirst({ where: { id: Number(slot_id), isBooked: 0 } });
  if (!newSlot) return res.status(400).json({ error: '该时间段已被预约' });
  const newSlot2 = second_slot_id ? await prisma.timeSlot.findFirst({ where: { id: Number(second_slot_id), isBooked: 0 } }) : null;

  const ops = [
    prisma.timeSlot.update({ where: { id: booking.slotId }, data: { isBooked: 0 } }),
    prisma.timeSlot.update({ where: { id: Number(slot_id) }, data: { isBooked: 1 } }),
    prisma.booking.update({ where: { id: booking.id }, data: { slotId: Number(slot_id), secondSlotId: second_slot_id ? Number(second_slot_id) : null, status: 'pending' } }),
  ];
  if (booking.secondSlotId) ops.unshift(prisma.timeSlot.update({ where: { id: booking.secondSlotId }, data: { isBooked: 0 } }));
  if (second_slot_id && newSlot2) ops.push(prisma.timeSlot.update({ where: { id: Number(second_slot_id) }, data: { isBooked: 1 } }));
  await prisma.$transaction(ops);
  res.json({ ok: true });
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const booking = await prisma.booking.findUnique({ where: { id: Number(req.params.id) } });
  if (!booking) return res.status(404).json({ error: '未找到' });
  if (booking.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  if (!['cancelled', 'completed'].includes(booking.status)) return res.status(400).json({ error: '只能删除已取消或已完成的预约' });
  await prisma.booking.delete({ where: { id: booking.id } });
  res.json({ ok: true });
});

module.exports = router;
