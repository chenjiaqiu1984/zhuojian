const express = require('express');
const prisma = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { createJsapiOrder, parseNotify, refund } = require('../services/wechatpay');

const router = express.Router();

// 生成商户订单号：时间戳 + 用户ID + 随机4位
function genOrderNo(userId) {
  const ts = Date.now().toString();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ZJ${ts}${userId}${rand}`;
}

// 回调地址（生产环境需改为真实域名）
function notifyUrl() {
  const base = process.env.PAY_NOTIFY_BASE || `http://localhost:${process.env.PORT || 3000}`;
  return `${base}/api/payment/notify`;
}

// ── 创建预约订单并发起支付 ────────────────────────────────────────
// POST /api/payment/booking/:bookingId
router.post('/booking/:bookingId', authMiddleware, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const userId = req.user.id;
    const openid = req.user.wechatOpenid;

    if (!openid) return res.status(400).json({ error: '需要微信登录才能支付' });

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { consultant: true }
    });
    if (!booking) return res.status(404).json({ error: '预约不存在' });
    if (booking.userId !== userId) return res.status(403).json({ error: '权限不足' });

    // 如果已有有效订单直接返回
    const existing = await prisma.order.findFirst({
      where: { bookingId, status: { in: ['pending', 'paid'] } }
    });
    if (existing?.status === 'paid') return res.status(400).json({ error: '该预约已支付' });
    if (existing?.status === 'pending' && existing.expireAt > new Date()) {
      // 重用已有订单
      const { payParams } = await createJsapiOrder({
        orderNo: existing.orderNo,
        amount: existing.amount,
        desc: `卓见心理咨询 - ${booking.consultant.name}`,
        openid,
        notifyUrl: notifyUrl(),
      });
      return res.json({ orderNo: existing.orderNo, payParams });
    }

    const amount = booking.consultant.price; // 单位：分
    if (!amount || amount <= 0) return res.status(400).json({ error: '咨询师未设置价格' });

    const orderNo = genOrderNo(userId);
    const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟

    // 先创建订单记录
    const order = await prisma.order.create({
      data: { orderNo, userId, bookingId, amount, expireAt }
    });

    // 调微信下单
    const { prepayId, payParams } = await createJsapiOrder({
      orderNo,
      amount,
      desc: `卓见心理咨询 - ${booking.consultant.name}`,
      openid,
      notifyUrl: notifyUrl(),
    });

    await prisma.order.update({ where: { id: order.id }, data: { prepayId } });

    res.json({ orderNo, payParams });
  } catch (err) {
    console.error('[payment] create order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 微信支付回调通知 ──────────────────────────────────────────────
// POST /api/payment/notify
router.post('/notify', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const body = JSON.parse(req.body.toString());
    const result = await parseNotify(req.headers, body);

    if (result.trade_state === 'SUCCESS') {
      const order = await prisma.order.findUnique({ where: { orderNo: result.out_trade_no } });
      if (order && order.status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'paid',
            transactionId: result.transaction_id,
            paidAt: new Date(),
          }
        });
        // 支付成功后自动确认预约
        if (order.bookingId) {
          await prisma.booking.update({
            where: { id: order.bookingId },
            data: { status: 'confirmed' }
          });
        }
      }
    }

    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (err) {
    console.error('[payment] notify error:', err.message);
    res.status(500).json({ code: 'FAIL', message: err.message });
  }
});

// ── 查询订单状态 ──────────────────────────────────────────────────
// GET /api/payment/order/:orderNo
router.get('/order/:orderNo', authMiddleware, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderNo: req.params.orderNo },
    select: { orderNo: true, status: true, amount: true, paidAt: true }
  });
  if (!order) return res.status(404).json({ error: '订单不存在' });
  res.json(order);
});

// ── 申请退款（管理员或取消预约时触发）────────────────────────────
// POST /api/payment/refund/:orderNo
router.post('/refund/:orderNo', authMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderNo: req.params.orderNo } });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status !== 'paid') return res.status(400).json({ error: '订单未支付，无需退款' });
    if (order.userId !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: '权限不足' });

    const { refundRatio = 1 } = req.body; // 1=全退, 0.7=退70%
    const refundAmount = Math.floor(order.amount * refundRatio);
    const refundNo = `RF${order.orderNo}`;

    await refund({
      transactionId: order.transactionId,
      refundNo,
      refundAmount,
      totalAmount: order.amount,
      reason: req.body.reason || '用户取消预约',
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'refunded' }
    });

    res.json({ ok: true, refundAmount });
  } catch (err) {
    console.error('[payment] refund error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
