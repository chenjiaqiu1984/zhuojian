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

      <!-- 退费须知（内嵌于订单卡片） -->
      <view class="refund-policy">
        <view class="refund-title">
          <text class="refund-icon">📋</text>
          <text>退费须知 · 请提前3天预约</text>
        </view>
        <view class="refund-row">
          <text class="dot green">●</text>
          <text><text class="tag green">{{ refundDeadline48h }}</text> 前取消：<text class="tag green">全额退款</text></text>
        </view>
        <view class="refund-row">
          <text class="dot orange">●</text>
          <text><text class="tag orange">{{ refundDeadline24h }}</text> 前取消：<text class="tag orange">退款50%</text></text>
        </view>
        <view class="refund-row">
          <text class="dot red">●</text>
          <text><text class="tag red">{{ refundDeadline24h }}</text> 后取消：<text class="tag red">不予退款</text></text>
        </view>
        <text class="refund-agree">点击「立即支付」即表示同意以上退费规则</text>
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
      <view
        class="pay-item"
        :class="{ active: payMethod === 'wechat' }"
        @click="payMethod = 'wechat'"
      >
        <text class="pay-icon">💚</text>
        <text class="pay-name">微信支付</text>
        <text class="pay-check" v-if="payMethod === 'wechat'">✓</text>
      </view>
      <view
        class="pay-item"
        :class="{ active: payMethod === 'alipay' }"
        @click="payMethod = 'alipay'"
      >
        <text class="pay-icon">💙</text>
        <text class="pay-name">支付宝</text>
        <text class="pay-check" v-if="payMethod === 'alipay'">✓</text>
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

// uni-app 路由页面通过 URL query 传参，不能用 defineProps 接收
// 改为本地 ref，在 onMounted 里从 query 读取
const bookingId      = ref(0);
const consultantName = ref('');
const slotTime       = ref('');
const amount         = ref(0);

const loading   = ref(false);
const orderNo   = ref('');
const payMethod = ref('wechat');   // 'wechat' | 'alipay'
const countdown = ref(15 * 60);
let timer = null;

// 判断当前运行环境
// #ifdef H5
const isH5 = true;
// #endif
// #ifndef H5
const isH5 = false;
// #endif

const timerText = computed(() => {
  const m = Math.floor(countdown.value / 60);
  const s = countdown.value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
});

// 将 "YYYY-MM-DD HH:mm" 解析为时间戳（兼容 iOS Safari）
function parseSlotTime(str) {
  if (!str) return null;
  // 替换空格为 T，iOS Safari 不支持带空格的日期字符串
  const d = new Date(str.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

// 格式化为 "YYYY年MM月DD日 HH:mm"
function fmtDatetime(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 退款截止时间（基于预约时间向前推）
const refundDeadline48h = computed(() => {
  const d = parseSlotTime(slotTime.value);
  if (!d) return '';
  return fmtDatetime(new Date(d.getTime() - 48 * 60 * 60 * 1000));
});
const refundDeadline24h = computed(() => {
  const d = parseSlotTime(slotTime.value);
  if (!d) return '';
  return fmtDatetime(new Date(d.getTime() - 24 * 60 * 60 * 1000));
});

onMounted(() => {
  // 从页面 query 读取参数（uni-app H5 / 小程序均兼容）
  const pages = getCurrentPages();
  const cur   = pages[pages.length - 1];
  const query = cur?.$page?.fullPath?.split('?')[1] || cur?.options;
  if (query) {
    const p = typeof query === 'string'
      ? Object.fromEntries(new URLSearchParams(query))
      : query;
    if (p.bookingId)      bookingId.value      = Number(p.bookingId);
    if (p.consultantName) consultantName.value = decodeURIComponent(p.consultantName);
    if (p.slotTime)       slotTime.value       = decodeURIComponent(p.slotTime);
    if (p.amount)         amount.value         = Number(p.amount);
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

// ── 主支付入口 ────────────────────────────────────────────────────
async function doPay() {
  if (loading.value) return;
  loading.value = true;
  try {
    if (isH5) {
      payMethod.value === 'alipay' ? await doAlipayH5() : await doWechatH5();
    } else {
      await doWechatMiniApp();
    }
  } finally {
    loading.value = false;
  }
}

// ── 小程序微信 JSAPI ──────────────────────────────────────────────
async function doWechatMiniApp() {
  const data = await paymentApi.createBookingOrder(bookingId.value);
  orderNo.value = data.orderNo;
  const p = data.payParams;
  await new Promise((resolve, reject) => {
    uni.requestPayment({
      provider:   'wxpay',
      timeStamp:  p.timeStamp,
      nonceStr:   p.nonceStr,
      package:    p.package,
      signType:   p.signType || 'RSA',
      paySign:    p.paySign,
      success:    resolve,
      fail:       reject,
    });
  });
  onPaySuccess();
}

// ── 微信 H5 支付（手机浏览器跳转微信 App）────────────────────────
async function doWechatH5() {
  const data = await paymentApi.createH5Order(bookingId.value);
  orderNo.value = data.orderNo;
  // redirect_url：支付完成后微信跳回的页面
  const redirectUrl = encodeURIComponent(
    `${location.origin}/payment/result?orderNo=${data.orderNo}`
  );
  // 跳转到微信收银台，完成后回跳
  location.href = `${data.mwebUrl}&redirect_url=${redirectUrl}`;
  // 页面跳走了，不再执行后续逻辑；回跳后由 result 页查单确认状态
}

// ── 支付宝 WAP 支付（跳转支付宝 App / 网页）──────────────────────
async function doAlipayH5() {
  const data = await paymentApi.createAlipayOrder(bookingId.value);
  orderNo.value = data.orderNo;
  // payUrl 是支付宝返回的 GET 链接，直接跳转即可
  location.href = data.payUrl;
}

function onPaySuccess() {
  uni.showToast({ title: '支付成功', icon: 'success' });
  clearInterval(timer);
  setTimeout(() => uni.navigateBack({ delta: 2 }), 1500);
}

// ── 取消预约 ──────────────────────────────────────────────────────
async function cancel() {
  uni.showModal({
    title: '确认取消',
    content: '取消后将释放该时间段，确认取消预约吗？',
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        await bookingApi.updateStatus(bookingId.value, { status: 'cancelled' });
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

  .refund-policy {
    margin: 16rpx 0 4rpx;
    background: #F8FBFA; border-radius: 12rpx; padding: 20rpx 24rpx;

    .refund-title {
      display: flex; align-items: center; gap: 8rpx;
      font-size: 22rpx; font-weight: 600; color: #4A5A55;
      margin-bottom: 14rpx;
      .refund-icon { font-size: 24rpx; }
    }

    .refund-row {
      display: flex; align-items: center; gap: 10rpx;
      font-size: 22rpx; color: #4A5A55; padding: 5rpx 0; line-height: 1.5;
      .dot { font-size: 14rpx; flex-shrink: 0;
        &.green  { color: #4A8A7A; }
        &.orange { color: #C8821A; }
        &.red    { color: #C83232; }
      }
      .tag { font-weight: 600;
        &.green  { color: #4A8A7A; }
        &.orange { color: #C8821A; }
        &.red    { color: #C83232; }
      }
    }

    .refund-agree {
      margin-top: 12rpx; font-size: 20rpx; color: #A0AEA9; line-height: 1.5;
    }
  }
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
    border-bottom: 1rpx solid #F0F4F2;
    &:last-child { border-bottom: none; }
    .pay-icon { font-size: 44rpx; }
    .pay-name { font-size: 30rpx; color: #1C2A27; flex: 1; }
    .pay-check { font-size: 32rpx; color: #4A8A7A; font-weight: 700; }
    &.active { background: #F5FBF9; }
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
