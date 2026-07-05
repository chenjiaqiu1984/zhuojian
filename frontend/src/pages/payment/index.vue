<template>
  <view class="page">
    <!-- 订单信息 -->
    <view class="order-card">
      <text class="order-title">确认支付</text>
      <view class="order-row">
        <text class="label">咨询师</text>
        <text class="value">{{ consultantName }}</text>
      </view>
      <view class="order-row">
        <text class="label">预约时间</text>
        <text class="value">{{ slotTime }}</text>
      </view>
      <view class="order-divider" />
      <view class="order-row amount-row">
        <text class="label">应付金额</text>
        <text class="amount">¥{{ (amount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 倒计时 -->
    <view class="timer-tip" v-if="countdown > 0">
      <text class="timer-icon">⏱</text>
      <text>请在 {{ timerText }} 内完成支付，超时订单自动取消</text>
    </view>
    <view class="timer-tip expired" v-else-if="orderNo">
      <text>订单已超时，请重新预约</text>
    </view>

    <!-- 支付方式 -->
    <view class="pay-card">
      <view class="pay-item active">
        <text class="pay-icon">💚</text>
        <text class="pay-name">微信支付</text>
        <text class="pay-check">✓</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer">
      <button class="pay-btn" :disabled="loading || countdown <= 0" @click="doPay">
        {{ loading ? '处理中...' : `立即支付 ¥${(amount / 100).toFixed(2)}` }}
      </button>
      <text class="cancel-link" @click="cancel">取消预约</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { paymentApi, bookingApi } from '../../api/index';

const props = defineProps({ bookingId: Number, consultantName: String, slotTime: String, amount: Number });

const loading = ref(false);
const orderNo = ref('');
const countdown = ref(15 * 60); // 15分钟，单位秒
let timer = null;

const timerText = computed(() => {
  const m = Math.floor(countdown.value / 60);
  const s = countdown.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

onMounted(async () => {
  // 如果页面通过 navigateTo query 传参，从 query 读取
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  const query = cur?.$page?.fullPath?.split('?')[1];
  if (query) {
    const p = Object.fromEntries(new URLSearchParams(query));
    if (p.bookingId) props.bookingId = Number(p.bookingId);
    if (p.consultantName) props.consultantName = decodeURIComponent(p.consultantName);
    if (p.slotTime) props.slotTime = decodeURIComponent(p.slotTime);
    if (p.amount) props.amount = Number(p.amount);
  }
  startCountdown();
});

onUnmounted(() => clearInterval(timer));

function startCountdown() {
  timer = setInterval(() => {
    if (countdown.value > 0) countdown.value--;
    else clearInterval(timer);
  }, 1000);
}

async function doPay() {
  if (loading.value) return;
  loading.value = true;
  try {
    const data = await paymentApi.createBookingOrder(props.bookingId);
    orderNo.value = data.orderNo;
    const payParams = data.payParams;

    // 调起微信支付
    await new Promise((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        timeStamp: payParams.timeStamp,
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType || 'RSA',
        paySign: payParams.paySign,
        success: resolve,
        fail: reject,
      });
    });

    // 支付成功
    uni.showToast({ title: '支付成功', icon: 'success' });
    clearInterval(timer);
    setTimeout(() => uni.navigateBack({ delta: 2 }), 1500);
  } catch (e) {
    if (e?.errMsg?.includes('cancel')) {
      uni.showToast({ title: '已取消支付', icon: 'none' });
    } else {
      uni.showToast({ title: e?.error || e?.errMsg || '支付失败', icon: 'none' });
    }
  } finally {
    loading.value = false;
  }
}

async function cancel() {
  uni.showModal({
    title: '确认取消',
    content: '取消后将释放该时间段，确认取消预约吗？',
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        await bookingApi.updateStatus(props.bookingId, { status: 'cancelled' });
        uni.showToast({ title: '已取消', icon: 'success' });
        setTimeout(() => uni.navigateBack({ delta: 2 }), 1200);
      } catch (e) {
        uni.showToast({ title: e?.error || '操作失败', icon: 'none' });
      }
    }
  });
}
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; padding-bottom: 160rpx; }

.order-card {
  background: #fff; margin: 24rpx; border-radius: 20rpx; padding: 40rpx 36rpx;
  .order-title { font-size: 36rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 32rpx; }
  .order-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; }
  .label { font-size: 28rpx; color: #8A9E97; }
  .value { font-size: 28rpx; color: #1C2A27; }
  .order-divider { height: 1rpx; background: #EEF2F0; margin: 16rpx 0; }
  .amount-row { margin-top: 8rpx; }
  .amount { font-size: 48rpx; font-weight: 700; color: #4A8A7A; }
}

.timer-tip {
  display: flex; align-items: center; gap: 10rpx;
  margin: 0 24rpx 16rpx; padding: 20rpx 28rpx;
  background: #FFF8E6; border-radius: 12rpx;
  font-size: 24rpx; color: #C8821A;
  .timer-icon { font-size: 28rpx; }
  &.expired { background: #FFF0F0; color: #C83232; }
}

.pay-card {
  background: #fff; margin: 0 24rpx; border-radius: 20rpx; padding: 8rpx 0;
  .pay-item {
    display: flex; align-items: center; gap: 20rpx;
    padding: 28rpx 36rpx;
    .pay-icon { font-size: 44rpx; }
    .pay-name { font-size: 30rpx; color: #1C2A27; flex: 1; }
    .pay-check { font-size: 32rpx; color: #4A8A7A; font-weight: 700; }
  }
}

.footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #fff; padding: 24rpx 32rpx 48rpx;
  display: flex; flex-direction: column; align-items: center; gap: 20rpx;
  box-shadow: 0 -2rpx 20rpx rgba(0,0,0,.08);

  .pay-btn {
    width: 100%; background: #4A8A7A; color: #fff;
    font-size: 32rpx; font-weight: 600; border-radius: 50rpx; height: 96rpx;
    &[disabled] { background: #B0C9C4; }
  }
  .cancel-link { font-size: 26rpx; color: #8A9E97; }
}
</style>
