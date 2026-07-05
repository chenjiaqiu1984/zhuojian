const express = require('express');
const prisma = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { createJsapiOrder, createH5Order, parseNotify, refund } = require('../services/wechatpay');
const { createAlipayOrder, verifyAlipayNotify } = require('../services/alipay');
const { calcDiscount } = require('./coupons');

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

// ── 验证并预消费优惠券 ────────────────────────────────────────────
// 返回 { couponDiscount, userCouponId } 并将券状态改为 used
// 若 userCouponId 未传 / 无效则返回 { couponDiscount: 0, userCouponId: null }
async function consumeCoupon(userId, userCouponId, amount) {
  if (!userCouponId) return { couponDiscount: 0, userCouponId: null };
  const uc = await prisma.userCoupon.findUnique({
    where: { id: Number(userCouponId) },
    include: { coupon: true }
  });
  if (!uc || uc.userId !== userId || uc.status !== 'available') {
    return { couponDiscount: 0, userCouponId: null };
  }
  if (uc.coupon.expireAt && uc.coupon.expireAt < new Date()) {
    return { couponDiscount: 0, userCouponId: null };
  }
  const discount = calcDiscount(uc.coupon, amount);
  // 立即标记为已使用（下单即消费，防止重复使用）
  await prisma.userCoupon.update({
    where: { id: uc.id },
    data:  { status: 'used', usedAt: new Date() }
  });
  await prisma.coupon.update({
    where: { id: uc.coupon.id },
    data:  { usedCount: { increment: 1 } }
  });
  return { couponDiscount: discount, userCouponId: uc.id };
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

    const originalPrice = booking.consultant.price; // 单位：分
    if (!originalPrice || originalPrice <= 0) return res.status(400).json({ error: '咨询师未设置价格' });

    // 应用咨询师折扣率
    const rate   = booking.consultant.discountRate ?? 1.0;
    const priceAfterDiscount = Math.round(originalPrice * rate);
    const originalAmount = rate < 1.0 ? originalPrice : null;

    // 应用优惠券
    const { couponDiscount, userCouponId } = await consumeCoupon(
      userId, req.body.userCouponId, priceAfterDiscount
    );
    const amount = Math.max(1, priceAfterDiscount - couponDiscount);

    const orderNo = genOrderNo(userId);
    const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15分钟

    // 先创建订单记录
    const order = await prisma.order.create({
      data: { orderNo, userId, bookingId, amount, originalAmount,
              discountRate: rate, couponDiscount, userCouponId, expireAt }
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
      const order = await prisma.order.findUnique({
        where: { orderNo: result.out_trade_no },
        include: { booking: { include: { consultant: { select: { autoConfirm: true } } } } }
      });
      if (order && order.status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'paid', transactionId: result.transaction_id, paidAt: new Date() }
        });
        if (order.bookingId) {
          // 支付成功后：autoConfirm=true 直接确认，否则进入待确认
          const nextStatus = order.booking?.consultant?.autoConfirm ? 'confirmed' : 'pending';
          await prisma.booking.update({
            where: { id: order.bookingId },
            data: { status: nextStatus }
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

    // 退款成功后恢复优惠券（让用户可再次使用）
    if (order.userCouponId) {
      await prisma.userCoupon.update({
        where: { id: order.userCouponId },
        data:  { status: 'available', usedAt: null, usedOrderId: null }
      });
      await prisma.coupon.update({
        where: { id: (await prisma.userCoupon.findUnique({ where: { id: order.userCouponId }, select: { couponId: true } })).couponId },
        data:  { usedCount: { decrement: 1 } }
      });
    }

    res.json({ ok: true, refundAmount });
  } catch (err) {
    console.error('[payment] refund error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 微信 H5 支付（手机浏览器）────────────────────────────────────
// POST /api/payment/h5/:bookingId
router.post('/h5/:bookingId', authMiddleware, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const userId    = req.user.id;
    // 获取客户端 IP（微信 H5 必填）
    const clientIp  = req.headers['x-forwarded-for']?.split(',')[0].trim()
                   || req.socket.remoteAddress
                   || '127.0.0.1';

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { consultant: true }
    });
    if (!booking)              return res.status(404).json({ error: '预约不存在' });
    if (booking.userId !== userId) return res.status(403).json({ error: '权限不足' });

    const existing = await prisma.order.findFirst({
      where: { bookingId, status: { in: ['pending', 'paid'] } }
    });
    if (existing?.status === 'paid') return res.status(400).json({ error: '该预约已支付' });
    if (existing?.status === 'pending') {
      await prisma.order.update({ where: { id: existing.id }, data: { status: 'cancelled' } });
    }

    const originalPrice = booking.consultant.price;
    if (!originalPrice || originalPrice <= 0) return res.status(400).json({ error: '咨询师未设置价格' });

    const rate           = booking.consultant.discountRate ?? 1.0;
    const priceAfterDiscount = Math.round(originalPrice * rate);
    const originalAmount = rate < 1.0 ? originalPrice : null;

    const { couponDiscount, userCouponId } = await consumeCoupon(
      userId, req.body.userCouponId, priceAfterDiscount
    );
    const amount = Math.max(1, priceAfterDiscount - couponDiscount);

    const orderNo = genOrderNo(userId);
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.order.create({ data: { orderNo, userId, bookingId, amount, originalAmount,
      discountRate: rate, couponDiscount, userCouponId, expireAt } });

    const { mwebUrl } = await createH5Order({
      orderNo,
      amount,
      desc:      `卓见心理咨询 - ${booking.consultant.name}`,
      clientIp,
      notifyUrl: notifyUrl(),
    });

    res.json({ orderNo, mwebUrl });
  } catch (err) {
    console.error('[payment] h5 order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 支付宝 WAP 支付 ────────────────────────────────────────────────
// POST /api/payment/alipay/:bookingId
router.post('/alipay/:bookingId', authMiddleware, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const userId    = req.user.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { consultant: true }
    });
    if (!booking)              return res.status(404).json({ error: '预约不存在' });
    if (booking.userId !== userId) return res.status(403).json({ error: '权限不足' });

    const existing = await prisma.order.findFirst({
      where: { bookingId, status: { in: ['pending', 'paid'] } }
    });
    if (existing?.status === 'paid') return res.status(400).json({ error: '该预约已支付' });
    if (existing?.status === 'pending') {
      await prisma.order.update({ where: { id: existing.id }, data: { status: 'cancelled' } });
    }

    const originalPrice = booking.consultant.price;
    if (!originalPrice || originalPrice <= 0) return res.status(400).json({ error: '咨询师未设置价格' });

    const rate           = booking.consultant.discountRate ?? 1.0;
    const priceAfterDiscount = Math.round(originalPrice * rate);
    const originalAmount = rate < 1.0 ? originalPrice : null;

    const { couponDiscount, userCouponId } = await consumeCoupon(
      userId, req.body.userCouponId, priceAfterDiscount
    );
    const amount = Math.max(1, priceAfterDiscount - couponDiscount);

    const orderNo  = genOrderNo(userId);
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.order.create({ data: { orderNo, userId, bookingId, amount, originalAmount,
      discountRate: rate, couponDiscount, userCouponId, expireAt } });

    const base      = process.env.PAY_NOTIFY_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const { payUrl } = await createAlipayOrder({
      orderNo,
      amount,
      desc:       `卓见心理咨询 - ${booking.consultant.name}`,
      notifyUrl:  `${base}/api/payment/alipay/notify`,
      returnUrl:  `${base}/payment/result?orderNo=${orderNo}`,
    });

    res.json({ orderNo, payUrl });
  } catch (err) {
    console.error('[payment] alipay order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 支付宝异步回调 ────────────────────────────────────────────────
// POST /api/payment/alipay/notify
router.post('/alipay/notify', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const data = verifyAlipayNotify(req.body);
    if (data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED') {
      const order = await prisma.order.findUnique({
        where: { orderNo: data.out_trade_no },
        include: { booking: { include: { consultant: { select: { autoConfirm: true } } } } }
      });
      if (order && order.status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'paid', transactionId: data.trade_no, paidAt: new Date() }
        });
        if (order.bookingId) {
          const nextStatus = order.booking?.consultant?.autoConfirm ? 'confirmed' : 'pending';
          await prisma.booking.update({
            where: { id: order.bookingId },
            data:  { status: nextStatus }
          });
        }
      }
    }
    res.send('success'); // 支付宝要求返回纯文本 "success"
  } catch (err) {
    console.error('[payment] alipay notify error:', err.message);
    res.send('fail');
  }
});

module.exports = router;
