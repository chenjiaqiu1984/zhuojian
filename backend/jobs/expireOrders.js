/**
 * 订单过期处理
 * 每分钟扫描一次：将超时未支付的订单标记为 cancelled，
 * 并同步释放预约占用的时间段。
 */
const prisma = require('../db/database');

async function expireOrders() {
  const now = new Date();

  // 找所有超时且仍处于 pending 状态的订单
  const expired = await prisma.order.findMany({
    where: { status: 'pending', expireAt: { lt: now } },
    include: {
      booking: {
        include: { slot: true, secondSlot: true }
      }
    }
  });

  if (!expired.length) return;

  for (const order of expired) {
    await prisma.$transaction(async (tx) => {
      // 1. 标记订单为 cancelled
      await tx.order.update({
        where: { id: order.id },
        data:  { status: 'cancelled' }
      });

      if (!order.booking) return;

      // 2. 预约回到 cancelled
      await tx.booking.update({
        where: { id: order.booking.id },
        data:  { status: 'cancelled', message: '支付超时，预约已自动取消' }
      });

      // 3. 释放时间段
      const slotOps = [
        tx.timeSlot.update({ where: { id: order.booking.slotId }, data: { isBooked: 0 } })
      ];
      if (order.booking.secondSlotId) {
        slotOps.push(
          tx.timeSlot.update({ where: { id: order.booking.secondSlotId }, data: { isBooked: 0 } })
        );
      }
      await Promise.all(slotOps);
    });

    console.log(`[expireOrders] 订单 ${order.orderNo} 超时取消，预约 ${order.booking?.id} 已释放`);
  }
}

/** 启动定时任务，每 60 秒执行一次 */
function startExpireJob() {
  expireOrders().catch(e => console.error('[expireOrders] 初次运行失败:', e.message));
  return setInterval(() => {
    expireOrders().catch(e => console.error('[expireOrders] 执行失败:', e.message));
  }, 60 * 1000);
}

module.exports = { expireOrders, startExpireJob };
