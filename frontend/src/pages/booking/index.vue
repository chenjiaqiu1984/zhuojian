<template>
  <view class="page">
    <u-tabs :list="tabs" :current="tab" @click="tab = $event.index" />
    <view v-if="!store.isLoggedIn()" class="empty">
      <u-empty text="请先登录查看预约" mode="auth" />
      <u-button type="primary" @click="uni.navigateTo({url:'/pages/login/index'})" style="margin-top:32rpx">去登录</u-button>
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
          <u-button size="mini" type="error" @click="goToPay(b)">去支付</u-button>
          <u-button size="mini" type="error" plain @click="cancel(b)">取消预约</u-button>
        </view>
        <view class="b-actions" v-else-if="b.status === 'pending'">
          <u-button size="mini" type="primary" plain @click="confirmBooking(b)" v-if="isConsultant">确认预约</u-button>
          <u-button size="mini" type="warning" plain @click="reschedule(b)">修改时间</u-button>
          <u-button size="mini" type="error" plain @click="cancel(b)">取消预约</u-button>
        </view>
        <view class="b-actions" v-else-if="['cancelled','completed'].includes(b.status)">
          <u-button size="mini" type="error" plain @click="deleteBooking(b)">删除</u-button>
        </view>
      </view>
      <u-empty v-if="!filtered.length" text="暂无预约记录" mode="data" />
    </view>
  </view>
</template>

<script setup>
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
  const amount       = b.consultant?.price || 0;
  const discountRate = b.consultant?.discountRate ?? 1.0;
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
.page { min-height: 100vh; }
.empty { padding: 80rpx 32rpx; display: flex; flex-direction: column; align-items: center; }
.booking-card { background: #fff; margin: 16rpx 24rpx; padding: 24rpx; border-radius: 16rpx; }
.b-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.b-name { font-size: 30rpx; font-weight: 600; color: #333; }
.b-name-link { color: #4A8A7A; }
.b-time { font-size: 24rpx; color: #666; display: block; margin-bottom: 4rpx; }
.b-created { font-size: 22rpx; color: #9BBCB4; display: block; margin-bottom: 8rpx; }
.b-msg { font-size: 24rpx; color: #4A7BBA; display: block; margin-bottom: 8rpx; }
.b-actions { margin-top: 12rpx; display: flex; gap: 16rpx; }
</style>
