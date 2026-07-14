<template>
  <view class="page">
    <view v-if="loading" class="empty"><text class="empty-text">加载中...</text></view>
    <view v-else-if="orders.length === 0" class="empty">
      <text class="empty-icon">🧾</text>
      <text class="empty-text">暂无订单记录</text>
    </view>
    <view v-else class="list">
      <view class="order-card" v-for="o in orders" :key="o.orderNo">
        <view class="order-head">
          <view class="order-title-row">
            <view class="order-type-tag" :class="isActivity(o) ? 'tag--activity' : 'tag--consult'">
              <text class="tag-text">{{ isActivity(o) ? '活动报名' : '咨询预约' }}</text>
            </view>
            <text class="order-name">{{ o.news?.title || o.booking?.consultant?.name || (isActivity(o) ? '活动报名' : '未知') }}</text>
          </view>
          <view class="status-badge" :class="statusClass(o)">
            <text class="status-text">{{ statusLabel(o) }}</text>
          </view>
        </view>

        <view class="order-row" v-if="!isActivity(o) && o.booking?.slot?.startTime">
          <text class="label">预约时间</text>
          <text class="value">{{ formatTime(o.booking.slot.startTime) }}</text>
        </view>
        <view class="order-row">
          <text class="label">支付金额</text>
          <text class="value amount">¥{{ (o.amount / 100).toFixed(2) }}</text>
        </view>
        <view class="order-row">
          <text class="label">支付方式</text>
          <text class="value">{{ o.payType === 'alipay' ? '支付宝' : '微信支付' }}</text>
        </view>
        <view class="order-row">
          <text class="label">{{ o.status === 'paid' ? '支付时间' : '下单时间' }}</text>
          <text class="value">{{ formatTime(o.status === 'paid' ? o.paidAt : o.createdAt) }}</text>
        </view>
        <view class="order-row">
          <text class="label">订单编号</text>
          <text class="value order-no">{{ o.orderNo }}</text>
        </view>

        <!-- 退款规则（已支付订单显示） -->
        <view class="refund-policy" v-if="o.status === 'paid'">
          <view class="refund-policy-title">
            <text class="refund-policy-title-text">退款规则</text>
          </view>
          <view class="refund-rule-row">
            <view class="rule-dot rule-dot--green" />
            <text class="refund-rule-text">距{{ isActivity(o) ? '活动' : '预约' }}时间 48 小时以上，全额退款</text>
          </view>
          <view class="refund-rule-row">
            <view class="rule-dot rule-dot--amber" />
            <text class="refund-rule-text">距{{ isActivity(o) ? '活动' : '预约' }}时间 24–48 小时内，退款 50%</text>
          </view>
          <view class="refund-rule-row">
            <view class="rule-dot rule-dot--red" />
            <text class="refund-rule-text">距{{ isActivity(o) ? '活动' : '预约' }}时间 24 小时内，不予退款</text>
          </view>
          <view class="refund-rule-row" v-if="isActivity(o) && !o.news?.endDate">
            <view class="rule-dot rule-dot--green" />
            <text class="refund-rule-text">长期有效活动，随时可全额退款</text>
          </view>
          <text class="refund-contact">如有特殊情况，请发送邮件至客服：</text>
          <text class="refund-email" @click="copyEmail">345958875@qq.com</text>
        </view>

        <view class="order-footer">
          <text
            v-if="isActivity(o)"
            class="action-btn"
            @click="navActivity(o.news?.id || o.newsId)"
          >查看活动</text>
          <text
            v-else-if="o.booking?.consultant?.id"
            class="action-btn"
            @click="navConsultant(o.booking.consultant.id)"
          >查看咨询师</text>
          <text
            v-if="o.status === 'paid' && canRefund(o)"
            class="refund-btn"
            @click="showRefundInfo(o)"
          >申请退款</text>
          <text
            v-if="o.status === 'paid'"
            class="delete-btn"
            @click="confirmDelete(o.orderNo)"
          >删除记录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { paymentApi } from '../../api/index';

const SUPPORT_EMAIL = '345958875@qq.com';

const loading = ref(true);
const orders  = ref([]);

onMounted(async () => {
  try {
    orders.value = await paymentApi.listOrders();
  } catch (e) {
    uni.showToast({ title: e?.error || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

function isActivity(o) {
  return !!(o.newsId || o.news) || o.bookingId == null;
}

function statusLabel(o) {
  const now = new Date();
  if (o.status === 'paid')      return '已支付';
  if (o.status === 'refunded')  return '已退款';
  if (o.status === 'cancelled') return '已取消';
  if (o.expireAt && new Date(o.expireAt) < now) return '已过期';
  return '待支付';
}

function statusClass(o) {
  const now = new Date();
  if (o.status === 'paid')     return 'status--paid';
  if (o.status === 'refunded') return 'status--refunded';
  if (o.status === 'cancelled' || (o.expireAt && new Date(o.expireAt) < now)) return 'status--dead';
  return 'status--pending';
}

function formatTime(t) {
  if (!t) return '-';
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

// 获取退款基准时间：活动取 endDate，咨询取 slot.startTime，null 表示长期有效
function refundBaseTime(o) {
  if (isActivity(o)) {
    return o.news?.endDate ? new Date(o.news.endDate) : null;
  }
  return o.booking?.slot?.startTime ? new Date(o.booking.slot.startTime) : null;
}

// 距退款基准时间还有多少小时（正数=未到，负数=已过）
function hoursUntilBase(o) {
  const base = refundBaseTime(o);
  if (!base) return Infinity; // 长期有效，始终可全额退款
  return (base.getTime() - Date.now()) / 3600000;
}

function canRefund(o) {
  return o.status === 'paid';
}

// 计算退款比例和说明
function refundRatioText(o) {
  const h = hoursUntilBase(o);
  if (h === Infinity) return { ratio: 1,   label: '长期有效活动，可全额退款' };
  if (h > 48)         return { ratio: 1,   label: '距活动/预约时间超过 48 小时，可全额退款' };
  if (h > 24)         return { ratio: 0.5, label: '距活动/预约时间不足 48 小时，可退款 50%' };
  return                     { ratio: 0,   label: '距活动/预约时间不足 24 小时，不予退款' };
}

function showRefundInfo(o) {
  const { ratio, label } = refundRatioText(o);
  const refundAmount = (Math.floor(o.amount * ratio) / 100).toFixed(2);

  if (ratio === 0) {
    uni.showModal({
      title: '无法退款',
      content: `${label}。\n\n如有特殊情况，请发送邮件至客服：\n${SUPPORT_EMAIL}`,
      confirmText: '复制邮箱',
      cancelText: '知道了',
      success: ({ confirm }) => { if (confirm) copyEmail(); }
    });
    return;
  }

  uni.showModal({
    title: '申请退款',
    content: `${label}，预计退款 ¥${refundAmount}。\n\n确认申请退款吗？`,
    confirmText: '确认退款',
    confirmColor: '#C83232',
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        await paymentApi.refund(o.orderNo, { refundRatio: ratio });
        const idx = orders.value.findIndex(x => x.orderNo === o.orderNo);
        if (idx !== -1) orders.value[idx] = { ...orders.value[idx], status: 'refunded' };
        uni.showToast({ title: '退款申请已提交', icon: 'success' });
      } catch (e) {
        const msg = e?.error || '退款失败，请联系客服';
        uni.showModal({
          title: '退款失败',
          content: `${msg}\n\n客服邮箱：${SUPPORT_EMAIL}`,
          confirmText: '复制邮箱',
          cancelText: '关闭',
          success: ({ confirm }) => { if (confirm) copyEmail(); }
        });
      }
    }
  });
}

function copyEmail() {
  uni.setClipboardData({
    data: SUPPORT_EMAIL,
    success: () => uni.showToast({ title: '邮箱已复制', icon: 'success' })
  });
}

function navActivity(id) {
  uni.navigateTo({ url: `/pages/news/detail?id=${id}` });
}

function navConsultant(id) {
  uni.navigateTo({ url: `/pages/consultants/detail?id=${id}` });
}

function confirmDelete(orderNo) {
  uni.showModal({
    title: '确认删除',
    content: '删除后该订单记录将无法恢复，确认删除吗？',
    confirmColor: '#C83232',
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        await paymentApi.deleteOrder(orderNo);
        orders.value = orders.value.filter(o => o.orderNo !== orderNo);
        uni.showToast({ title: '已删除', icon: 'success' });
      } catch (e) {
        uni.showToast({ title: e?.error || '删除失败', icon: 'none' });
      }
    }
  });
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; padding: 24rpx; padding-bottom: 60rpx; }

.empty { display: flex; flex-direction: column; align-items: center; padding: 120rpx 32rpx; gap: 20rpx; }
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #9BBCB4; }

.list { display: flex; flex-direction: column; gap: 20rpx; }

.order-card {
  background: #fff; border-radius: 16rpx; padding: 28rpx 24rpx;

  .order-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #F0F4F2;
    gap: 16rpx;
  }

  .order-title-row {
    display: flex; flex-direction: column; gap: 8rpx; flex: 1; min-width: 0;
  }

  .order-type-tag {
    display: inline-flex; align-self: flex-start;
    padding: 4rpx 14rpx; border-radius: 8rpx;
    &.tag--activity { background: #EAF4EE; }
    &.tag--consult  { background: #EEF0FA; }
  }
  .tag-text {
    font-size: 20rpx; font-weight: 600;
    .tag--activity & { color: #3A8A5A; }
    .tag--consult &  { color: #4A5AA8; }
  }

  .order-name {
    font-size: 28rpx; font-weight: 600; color: #1C2A27;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .status-badge {
    flex-shrink: 0; padding: 4rpx 16rpx; border-radius: 20rpx;
    &.status--paid     { background: #EDF4F0; }
    &.status--pending  { background: #FFF8E6; }
    &.status--refunded { background: #F5F0FF; }
    &.status--dead     { background: #F2F2F2; }
  }
  .status-text {
    font-size: 22rpx;
    .status--paid &     { color: #4A8A7A; }
    .status--pending &  { color: #C88A2A; }
    .status--refunded & { color: #7A4AC8; }
    .status--dead &     { color: #999; }
  }

  .order-row {
    display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0;
  }
  .label { font-size: 26rpx; color: #8A9E97; }
  .value { font-size: 26rpx; color: #1C2A27; }
  .amount { color: #4A8A7A; font-weight: 600; }
  .order-no { font-size: 22rpx; color: #B0B8B5; }

  /* 退款规则块 */
  .refund-policy {
    margin: 16rpx 0 0;
    padding: 20rpx 24rpx;
    background: #F7FAF9;
    border-radius: 12rpx;
    border: 1rpx solid #E4EDEA;
  }
  .refund-policy-title { margin-bottom: 14rpx; }
  .refund-policy-title-text {
    font-size: 20rpx; font-weight: 700; color: #9BBCB4;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .refund-rule-row {
    display: flex; align-items: center; gap: 12rpx; margin-bottom: 10rpx;
  }
  .rule-dot {
    width: 8rpx; height: 8rpx; border-radius: 50%; flex-shrink: 0;
    &--green { background: #4A8A7A; }
    &--amber { background: #B87C0E; }
    &--red   { background: #C03030; }
  }
  .refund-rule-text { font-size: 23rpx; color: #617870; line-height: 1.5; }
  .refund-contact {
    display: block; margin-top: 14rpx;
    font-size: 21rpx; color: #9BBCB4; line-height: 1.6;
  }
  .refund-email {
    display: block; font-size: 23rpx; color: #4A8A7A;
    font-weight: 600; margin-top: 4rpx;
  }

  .order-footer {
    margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #F0F4F2;
    display: flex; justify-content: flex-end; gap: 24rpx;
  }
  .action-btn { font-size: 26rpx; color: #4A8A7A; padding: 8rpx 20rpx; }
  .refund-btn { font-size: 26rpx; color: #C83232; padding: 8rpx 20rpx; }
  .delete-btn { font-size: 26rpx; color: #B0B8B5; padding: 8rpx 20rpx; }
}
</style>
