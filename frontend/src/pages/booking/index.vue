<template>
  <view class="page">
    <u-tabs :list="tabs" :current="tab" @click="tab = $event.index" />
    <view v-if="!store.isLoggedIn()" class="empty">
      <u-empty text="请先登录查看预约" mode="auth" />
      <view class="login-btn" @click="uni.navigateTo({url:'/pages/login/index'})"><text class="login-btn-text">去登录</text></view>
    </view>
    <view v-else>
      <view class="booking-card" v-for="b in filtered" :key="b.id">
        <view class="b-header">
          <text class="b-name b-name-link" @click="uni.navigateTo({url:`/pages/consultants/detail?id=${b.consultantId}`})">{{b.consultant_name}} ›</text>
          <u-tag :text="statusLabel[b.status]" :type="statusType[b.status]" />
        </view>
        <text class="b-time">预约时间：{{b.start_time}} - {{b.end_time}}</text>
        <text class="b-created">操作时间：{{fmt(b.createdAt)}}</text>
        <text v-if="b.message" class="b-msg">{{b.message}}</text>
        <view class="b-actions" v-if="b.status === 'pending_payment'">
          <view class="act-btn act-btn--primary" @click="goToPay(b)">去支付</view>
          <view class="act-btn act-btn--danger-plain" @click="cancel(b)">取消预约</view>
        </view>
        <view class="b-actions" v-else-if="b.status === 'pending'">
          <view class="act-btn act-btn--success-plain" v-if="isConsultant" @click="confirmBooking(b)">确认预约</view>
          <view class="act-btn act-btn--warning-plain" @click="reschedule(b)">修改时间</view>
          <view class="act-btn act-btn--danger-plain" @click="cancel(b)">取消预约</view>
        </view>
        <view class="b-actions" v-else-if="['cancelled','completed'].includes(b.status)">
          <view class="act-btn act-btn--danger-plain" @click="deleteBooking(b)">删除</view>
        </view>
      </view>
      <u-empty v-if="!filtered.length" text="暂无预约记录" mode="data" />
    </view>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('booking/index'));
// #endif

import { ref, computed, onMounted } from 'vue';
import { bookingApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { track } from '../../utils/track';

const store = useUserStore();
const bookings = ref([]);
const tab = ref(0);
const isConsultant = computed(() => store.user?.role === 'consultant');
const tabs = [{ name: '全部' }, { name: '待支付' }, { name: '待确认' }, { name: '已确认' }, { name: '已取消' }];
const statusLabel = {
  pending_payment: '待支付',
  pending:         '待确认',
  confirmed:       '已确认',
  cancelled:       '已取消',
  completed:       '已完成'
};
const statusType = {
  pending_payment: 'error',
  pending:         'warning',
  confirmed:       'success',
  cancelled:       'error',
  completed:       'info'
};
const statusMap = [null, 'pending_payment', 'pending', 'confirmed', 'cancelled'];

const filtered = computed(() => {
  const s = statusMap[tab.value];
  return s ? bookings.value.filter(b => b.status === s) : bookings.value;
});

onMounted(async () => {
  if (!store.isLoggedIn()) return;
  try { bookings.value = await bookingApi.list(); } catch {}
});

async function confirmBooking(b) {
  try {
    await bookingApi.updateStatus(b.id, { status: 'confirmed' });
    b.status = 'confirmed';
    uni.showToast({ title: '已确认' });
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }); }
}

function goToPay(b) {
  const name         = encodeURIComponent(b.consultant_name || '');
  const time         = encodeURIComponent(b.start_time || '');
  const amount       = b.consultant_price || b.consultant?.price || 0;
  const discountRate = b.consultant_discount_rate ?? b.consultant?.discountRate ?? 1.0;
  uni.navigateTo({
    url: `/pages/payment/index?bookingId=${b.id}&consultantName=${name}&slotTime=${time}&amount=${amount}&discountRate=${discountRate}`
  });
}

function reschedule(b) {
  uni.navigateTo({ url: `/pages/consultants/detail?id=${b.consultantId}&reschedule=${b.id}` });
}

async function cancel(b) {
  uni.showModal({
    title: '确认取消',
    content: '取消后将触发退款（如已支付）。确认取消此预约？',
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        const res = await bookingApi.updateStatus(b.id, { status: 'cancelled' });
        track('booking_cancel', '/pages/booking/index');
        b.status = 'cancelled';
        if (res.refunded) {
          const amt = (res.refundAmount / 100).toFixed(2);
          uni.showToast({ title: `已取消，退款¥${amt}`, icon: 'none', duration: 3000 });
        } else if (res.refundError) {
          uni.showToast({ title: res.refundError, icon: 'none', duration: 4000 });
        } else {
          uni.showToast({ title: '已取消' });
        }
      } catch (e) {
        uni.showToast({ title: e?.error || '操作失败', icon: 'none' });
      }
    }
  });
}

async function deleteBooking(b) {
  try {
    await bookingApi.delete(b.id);
    bookings.value = bookings.value.filter(x => x.id !== b.id);
    uni.showToast({ title: '已删除' });
  } catch { uni.showToast({ title: '操作失败', icon: 'none' }); }
}

function fmt(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped lang="scss">
$primary: #4A8A7A;
$bg: #F0F4F3;
$text-main: #1C2A27;
$text-sub: #617870;
$text-muted: #9BBCB4;

.page { min-height: 100vh; background: $bg; }

.empty { padding: 80rpx 32rpx; display: flex; flex-direction: column; align-items: center; }
.login-btn {
  margin-top: 32rpx; background: #4A8A7A;
  padding: 22rpx 60rpx; border-radius: 14rpx; text-align: center;
}
.login-btn-text { color: #fff; font-size: 28rpx; font-weight: 600; }

.booking-card {
  background: #fff;
  margin: 16rpx 24rpx 0;
  padding: 28rpx 28rpx 24rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 14rpx rgba(74,138,122,0.07);
}

.b-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #EEF4F2;
}

.b-name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-main;
}

.b-name-link {
  color: $primary;
  font-weight: 700;
}

.b-time {
  font-size: 26rpx;
  color: $text-sub;
  display: block;
  margin-bottom: 8rpx;
  line-height: 1.6;
}

.b-created {
  font-size: 22rpx;
  color: $text-muted;
  display: block;
  margin-bottom: 8rpx;
}

.b-msg {
  font-size: 24rpx;
  color: #4A7BBA;
  display: block;
  margin-bottom: 10rpx;
  padding: 10rpx 16rpx;
  background: #F0F5FF;
  border-radius: 10rpx;
}

.b-actions {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #EEF4F2;
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.act-btn {
  font-size: 24rpx;
  font-weight: 600;
  padding: 12rpx 28rpx;
  border-radius: 12rpx;
  &--primary       { background: $primary; color: #fff; }
  &--danger-plain  { border: 1.5rpx solid #C03030; color: #C03030; background: #FFF5F5; }
  &--warning-plain { border: 1.5rpx solid #C88A2A; color: #C88A2A; background: #FFFBF0; }
  &--success-plain { border: 1.5rpx solid $primary; color: $primary; background: #EAF5F1; }
}
</style>
