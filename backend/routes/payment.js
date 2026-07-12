const express = require('express');
const prisma = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { createJsapiOrder, createH5Order, createNativeOrder, parseNotify, refund, queryWechatOrder } = require('../services/wechatpay');
const { createAlipayOrder, createAlipayPcOrder, verifyAlipayNotify, alipayRefund, queryAlipayOrder } = require('../services/alipay');
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
router.post('/notify', async (req, res) => {
  try {
    const body = req.body;
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

// ── 用户订单列表 ──────────────────────────────────────────────────
// GET /api/payment/orders
router.get('/orders', authMiddleware, async (req, res) => {
  const where = req.user.role === 'admin' || req.user.role === 'super_admin'
    ? {}
    : { userId: req.user.id, status: 'paid' };
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, orderNo: true, amount: true, status: true,
      payType: true, transactionId: true, paidAt: true, createdAt: true,
      user:    { select: { id: true, name: true, username: true } },
      booking: { select: { id: true, slot: { select: { startTime: true } }, consultant: { select: { name: true } } } }
    }
  });
  res.json(orders);
});

// ── 管理员订单列表（分页 + 搜索）────────────────────────────────
// GET /api/payment/admin/orders
router.get('/admin/orders', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin')
    return res.status(403).json({ error: '权限不足' });

  const { q, status, page = 1, pageSize = 20 } = req.query;
  const take = Math.min(Number(pageSize) || 20, 100);
  const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { orderNo: { contains: q } },
      { user: { name:     { contains: q } } },
      { user: { username: { contains: q } } },
      { user: { phone:    { contains: q } } },
    ];
  }

  const select = {
    id: true, orderNo: true, amount: true, status: true,
    payType: true, transactionId: true, paidAt: true, createdAt: true,
    user:    { select: { id: true, name: true, username: true, phone: true } },
    booking: { select: { id: true, slot: { select: { startTime: true } }, consultant: { select: { name: true } } } }
  };

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, select }),
  ]);

  res.json({ total, items });
});

// ── 删除订单记录（用户隐藏已付款订单）────────────────────────────
// DELETE /api/payment/order/:orderNo
router.delete('/order/:orderNo', authMiddleware, async (req, res) => {
  const order = await prisma.order.findUnique({ where: { orderNo: req.params.orderNo } });
  if (!order) return res.status(404).json({ error: '订单不存在' });
  if (order.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
  if (order.status !== 'paid') return res.status(400).json({ error: '只能删除已支付的订单' });
  await prisma.order.delete({ where: { orderNo: req.params.orderNo } });
  res.json({ ok: true });
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

// ── 支付宝同步回跳后手动同步状态 ─────────────────────────────────
// POST /api/payment/sync-return/:orderNo
// 前端拿到支付宝 returnUrl 里的 trade_no，调此接口补写 transactionId 并标为 paid
router.post('/sync-return/:orderNo', authMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNo: req.params.orderNo },
      include: { booking: { include: { consultant: { select: { autoConfirm: true } } } } }
    });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.userId !== req.user.id) return res.status(403).json({ error: '权限不足' });
    if (order.status === 'paid') return res.json({ status: 'paid' });

    const { tradeNo, returnParams } = req.body;

    let paid = false;
    let finalTradeNo = tradeNo;

    // 优先：验证支付宝同步回跳签名（不需要外部网络请求，最可靠）
    if (returnParams && returnParams.sign) {
      try {
        // 剔除我们自己追加到 returnUrl 里的自定义参数，支付宝签名中不含这些字段
        const { orderNo: _omit, ...alipayReturnParams } = returnParams;
        verifyAlipayNotify(alipayReturnParams);
        // 签名有效，直接信任
        paid = true;
        finalTradeNo = returnParams.trade_no || tradeNo;
      } catch (verifyErr) {
        console.error('[payment] return signature verify failed:', verifyErr.message);
      }
    }

    // 降级：向支付宝查询确认
    if (!paid) {
      let result = null;
      try {
        result = await queryAlipayOrder(order.orderNo);
        paid = result?.trade_status === 'TRADE_SUCCESS' || result?.trade_status === 'TRADE_FINISHED';
        if (paid) finalTradeNo = result.trade_no || tradeNo;
      } catch (qErr) {
        console.error('[payment] queryAlipayOrder by orderNo failed:', qErr.message);
      }

      if (!paid && tradeNo) {
        try {
          const r2 = await queryAlipayOrder(null, tradeNo);
          if (r2?.trade_status === 'TRADE_SUCCESS' || r2?.trade_status === 'TRADE_FINISHED') {
            paid = true;
            finalTradeNo = r2.trade_no || tradeNo;
          }
        } catch (qErr2) {
          console.error('[payment] queryAlipayOrder by tradeNo failed:', qErr2.message);
        }
      }
    }

    if (!paid) return res.json({ status: order.status });
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'paid',
        transactionId: finalTradeNo || order.transactionId,
        paidAt: order.paidAt || new Date(),
      }
    });

    if (order.bookingId) {
      const nextStatus = order.booking?.consultant?.autoConfirm ? 'confirmed' : 'pending';
      await prisma.booking.update({ where: { id: order.bookingId }, data: { status: nextStatus } });
    }

    res.json({ status: 'paid' });
  } catch (err) {
    console.error('[payment] sync-return error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


router.post('/refund/:orderNo', authMiddleware, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { orderNo: req.params.orderNo } });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status !== 'paid') return res.status(400).json({ error: '订单未支付，无需退款' });
    if (order.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin')
      return res.status(403).json({ error: '权限不足' });

    const { refundRatio = 1 } = req.body; // 1=全退, 0.7=退70%
    const refundAmount = Math.floor(order.amount * refundRatio);
    const refundNo = `RF${order.orderNo}`;

    if (order.payType === 'alipay') {
      await alipayRefund({
        tradeNo: order.transactionId,
        refundAmount,
        outRequestNo: refundNo,
        reason: req.body.reason || '用户取消预约',
      });
    } else {
      await refund({
        transactionId: order.transactionId,
        refundNo,
        refundAmount,
        totalAmount: order.amount,
        reason: req.body.reason || '用户取消预约',
      });
    }

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
      discountRate: rate, couponDiscount, userCouponId, expireAt, payType: 'wxpay' } });

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
      discountRate: rate, couponDiscount, userCouponId, expireAt, payType: 'alipay' } });

    const base      = process.env.PAY_NOTIFY_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const { payUrl } = await createAlipayOrder({
      orderNo,
      amount,
      desc:       `卓见心理咨询 - ${booking.consultant.name}`,
      notifyUrl:  `${base}/api/payment/alipay/notify`,
      returnUrl:  `${base}/#/pages/payment/result?orderNo=${orderNo}`,
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

// ── 活动报名支付 ──────────────────────────────────────────────────
// POST /api/payment/activity/:newsId
router.post('/activity/:newsId', authMiddleware, async (req, res) => {
  try {
    const newsId   = Number(req.params.newsId);
    const userId   = req.user.id;
    const { payMethod } = req.body;

    const news = await prisma.news.findUnique({ where: { id: newsId } });
    if (!news) return res.status(404).json({ error: '活动不存在' });

    // 使用数据库中的实际价格（分），未设置价格时最低收取1分
    const amount   = (news.isPaid && news.price > 0) ? news.price : 1;
    const orderNo  = genOrderNo(userId);
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    const isAlipay = payMethod === 'alipay' || payMethod === 'alipay-pc';
    await prisma.order.create({ data: { orderNo, userId, amount, expireAt, payType: isAlipay ? 'alipay' : 'wxpay' } });

    const base = process.env.PAY_NOTIFY_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const desc  = `活动报名 - ${news.title}`;

    if (payMethod === 'alipay') {
      const { payUrl } = await createAlipayOrder({ orderNo, amount, desc, notifyUrl: `${base}/api/payment/alipay/notify`, returnUrl: `${base}/#/pages/payment/result?orderNo=${orderNo}` });
      return res.json({ orderNo, payUrl });
    }
    if (payMethod === 'alipay-pc') {
      const { payUrl } = await createAlipayPcOrder({ orderNo, amount, desc, notifyUrl: `${base}/api/payment/alipay/notify`, returnUrl: `${base}/#/pages/payment/result?orderNo=${orderNo}` });
      return res.json({ orderNo, payUrl });
    }
    if (payMethod === 'native') {
      const { codeUrl } = await createNativeOrder({ orderNo, amount, desc, notifyUrl: notifyUrl() });
      return res.json({ orderNo, codeUrl });
    }
    if (payMethod === 'h5') {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      const { mwebUrl } = await createH5Order({ orderNo, amount, desc, clientIp, notifyUrl: notifyUrl() });
      return res.json({ orderNo, mwebUrl });
    }
    // 小程序 jsapi
    const openid = req.user.wechatOpenid;
    if (!openid) return res.status(400).json({ error: '需要微信登录才能支付' });
    const { prepayId, payParams } = await createJsapiOrder({ orderNo, amount, desc, openid, notifyUrl: notifyUrl() });
    await prisma.order.update({ where: { orderNo }, data: { prepayId } });
    res.json({ orderNo, payParams });
  } catch (err) {
    console.error('[payment] activity order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 管理员查询第三方支付状态 ──────────────────────────────────────
// GET /api/payment/query/:orderNo
router.get('/query/:orderNo', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ error: '权限不足' });
  const order = await prisma.order.findUnique({
    where: { orderNo: req.params.orderNo },
    select: { id: true, orderNo: true, amount: true, status: true, payType: true, transactionId: true }
  });
  if (!order) return res.status(404).json({ error: '订单不存在' });

  try {
    let result;
    if (order.payType === 'alipay') {
      result = await queryAlipayOrder(order.orderNo);
    } else {
      result = await queryWechatOrder(order.orderNo);
    }

    // 第三方确认已支付，同步交易号和支付时间到本地
    const syncData = {};
    if (order.payType === 'alipay') {
      const paid = result.trade_status === 'TRADE_SUCCESS' || result.trade_status === 'TRADE_FINISHED';
      if (paid) {
        if (result.trade_no && !order.transactionId) syncData.transactionId = result.trade_no;
        if (result.gmt_payment && !order.paidAt) syncData.paidAt = new Date(result.gmt_payment);
        if (order.status !== 'paid') syncData.status = 'paid';
      }
    } else {
      if (result.trade_state === 'SUCCESS') {
        if (result.transaction_id && !order.transactionId) syncData.transactionId = result.transaction_id;
        if (result.success_time && !order.paidAt) syncData.paidAt = new Date(result.success_time);
        if (order.status !== 'paid') syncData.status = 'paid';
      }
    }

    if (Object.keys(syncData).length > 0) {
      await prisma.order.update({ where: { id: order.id }, data: syncData });
      Object.assign(order, syncData);
    }

    res.json({ order, queryResult: result, synced: Object.keys(syncData) });
  } catch (e) {
    res.status(500).json({ error: e.message, order });
  }
});

// ── 微信 Native 扫码支付（电脑浏览器）────────────────────────────
// POST /api/payment/native/:bookingId
router.post('/native/:bookingId', authMiddleware, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const userId    = req.user.id;
    const booking   = await prisma.booking.findUnique({ where: { id: bookingId }, include: { consultant: true } });
    if (!booking)              return res.status(404).json({ error: '预约不存在' });
    if (booking.userId !== userId) return res.status(403).json({ error: '权限不足' });

    const existing = await prisma.order.findFirst({ where: { bookingId, status: { in: ['pending', 'paid'] } } });
    if (existing?.status === 'paid') return res.status(400).json({ error: '该预约已支付' });

    const rate  = booking.consultant.discountRate ?? 1.0;
    const priceAfterDiscount = Math.round(booking.consultant.price * rate);
    const { couponDiscount, userCouponId } = await consumeCoupon(userId, req.body.userCouponId, priceAfterDiscount);
    const amount  = Math.max(1, priceAfterDiscount - couponDiscount);
    const orderNo = existing?.orderNo || genOrderNo(userId);
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    if (!existing) {
      await prisma.order.create({ data: { orderNo, userId, bookingId, amount, discountRate: rate,
        couponDiscount, userCouponId, expireAt, payType: 'wxpay' } });
    }
    const { codeUrl } = await createNativeOrder({
      orderNo, amount,
      desc: `卓见心理咨询 - ${booking.consultant.name}`,
      notifyUrl: notifyUrl(),
    });
    res.json({ orderNo, codeUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 支付宝 PC 支付（电脑浏览器）──────────────────────────────────
// POST /api/payment/alipay-pc/:bookingId
router.post('/alipay-pc/:bookingId', authMiddleware, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const userId    = req.user.id;
    const booking   = await prisma.booking.findUnique({ where: { id: bookingId }, include: { consultant: true } });
    if (!booking)              return res.status(404).json({ error: '预约不存在' });
    if (booking.userId !== userId) return res.status(403).json({ error: '权限不足' });

    const existing = await prisma.order.findFirst({ where: { bookingId, status: { in: ['pending', 'paid'] } } });
    if (existing?.status === 'paid') return res.status(400).json({ error: '该预约已支付' });
    if (existing?.status === 'pending') {
      await prisma.order.update({ where: { id: existing.id }, data: { status: 'cancelled' } });
    }

    const rate  = booking.consultant.discountRate ?? 1.0;
    const priceAfterDiscount = Math.round(booking.consultant.price * rate);
    const { couponDiscount, userCouponId } = await consumeCoupon(userId, req.body.userCouponId, priceAfterDiscount);
    const amount  = Math.max(1, priceAfterDiscount - couponDiscount);
    const orderNo = genOrderNo(userId);
    const expireAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.order.create({ data: { orderNo, userId, bookingId, amount, discountRate: rate,
      couponDiscount, userCouponId, expireAt, payType: 'alipay' } });

    const base = process.env.PAY_NOTIFY_BASE || `http://localhost:${process.env.PORT || 3000}`;
    const { payUrl } = await createAlipayPcOrder({
      orderNo, amount,
      desc: `卓见心理咨询 - ${booking.consultant.name}`,
      notifyUrl:  `${base}/api/payment/alipay/notify`,
      returnUrl:  `${base}/#/pages/payment/result?orderNo=${orderNo}`,
    });
    res.json({ orderNo, payUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
