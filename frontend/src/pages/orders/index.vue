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
          <text class="consultant-name">{{ o.booking?.consultant?.name || '未知咨询师' }}</text>
          <text class="order-status">已支付</text>
        </view>
        <view class="order-row">
          <text class="label">预约时间</text>
          <text class="value">{{ formatTime(o.booking?.slot?.startTime) }}</text>
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
          <text class="label">支付时间</text>
          <text class="value">{{ formatTime(o.paidAt) }}</text>
        </view>
        <view class="order-row">
          <text class="label">订单编号</text>
          <text class="value order-no">{{ o.orderNo }}</text>
        </view>
        <view class="order-footer">
          <text class="delete-btn" @click="confirmDelete(o.orderNo)">删除记录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { paymentApi } from '../../api/index';

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

function formatTime(t) {
  if (!t) return '-';
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

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
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 20rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #F0F4F2;
  }
  .consultant-name { font-size: 30rpx; font-weight: 600; color: #1C2A27; }
  .order-status { font-size: 22rpx; color: #4A8A7A; background: #EDF4F0; padding: 4rpx 16rpx; border-radius: 20rpx; }

  .order-row {
    display: flex; justify-content: space-between; align-items: center; padding: 10rpx 0;
  }
  .label { font-size: 26rpx; color: #8A9E97; }
  .value { font-size: 26rpx; color: #1C2A27; }
  .amount { color: #4A8A7A; font-weight: 600; }
  .order-no { font-size: 22rpx; color: #B0B8B5; }

  .order-footer {
    margin-top: 16rpx; padding-top: 16rpx; border-top: 1rpx solid #F0F4F2;
    display: flex; justify-content: flex-end;
  }
  .delete-btn { font-size: 26rpx; color: #C83232; padding: 8rpx 20rpx; }
}
</style>
