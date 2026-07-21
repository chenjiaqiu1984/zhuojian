<template>
  <view class="page">
    <view v-if="status === 'checking'" class="state-box">
      <view class="spinner" />
      <text class="state-msg">正在确认支付结果…</text>
    </view>

    <view v-else-if="status === 'paid'" class="state-box success">
      <ZjIcon class="state-icon" name="circle-check" :size="96" color="#4A8A7A" />
      <text class="state-msg">支付成功</text>
      <text class="state-sub">预约已确认，感谢您的选择</text>
      <button class="action-btn" @click="goHome()">返回首页</button>
    </view>

    <view v-else class="state-box fail">
      <ZjIcon class="state-icon" name="circle-x" :size="96" color="#D9534F" />
      <text class="state-msg">支付未完成</text>
      <text class="state-sub">{{ errorMsg }}</text>
      <button class="action-btn" @click="goBack()">重新支付</button>
    </view>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('payment/result'));
// #endif

import { ref, onMounted } from 'vue';
import { paymentApi } from '../../api/index';
import ZjIcon from '../../components/ZjIcon.vue';

const status   = ref('checking');   // 'checking' | 'paid' | 'fail'
const errorMsg = ref('');
const orderNo  = ref('');

onMounted(async () => {
  let alipayTradeNo = null;
  let isAlipayReturn = false;

  // #ifdef H5
  const search = location.search || location.hash.split('?')[1] || '';
  const params = new URLSearchParams(search);
  orderNo.value = params.get('orderNo') || '';
  alipayTradeNo = params.get('trade_no');
  isAlipayReturn = !!(params.get('method') || alipayTradeNo);
  // #endif
  // #ifndef H5
  const pages = getCurrentPages();
  const opts  = pages[pages.length - 1]?.options || {};
  orderNo.value = opts.orderNo || '';
  // #endif

  if (!orderNo.value) {
    status.value   = 'fail';
    errorMsg.value = '缺少订单号';
    return;
  }

  // 支付宝同步回跳时先触发后端同步（验签 + 写库）
  if (isAlipayReturn) {
    try {
      const returnParams = Object.fromEntries(params.entries());
      const r = await paymentApi.syncAlipayReturn(orderNo.value, { tradeNo: alipayTradeNo, returnParams });
      if (r.status === 'paid') { status.value = 'paid'; return; }
    } catch(e) {
      if (e?.__authRedirect) return; // token 失效已跳转登录，不再轮询
    }
  }

  // 轮询最多 10 次，每次间隔 2s，等待后端异步回调写库
  for (let i = 0; i < 10; i++) {
    try {
      const order = await paymentApi.queryOrder(orderNo.value);
      if (order.status === 'paid') { status.value = 'paid'; return; }
    } catch { /* ignore */ }
    await sleep(2000);
  }

  status.value   = 'fail';
  errorMsg.value = '支付结果未收到，请稍后在“我的订单”中查看状态';
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function goHome() {
  uni.reLaunch({ url: '/pages/index/index' });
}
function goBack() {
  uni.navigateBack({ delta: 1 });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F5F7F6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 60rpx 40rpx;

  .state-icon { width: 96rpx; }
  .state-msg  { font-size: 40rpx; font-weight: 700; color: #1C2A27; }
  .state-sub  { font-size: 26rpx; color: #8A9E97; text-align: center; line-height: 1.6; }

  .action-btn {
    margin-top: 20rpx;
    background: #4A8A7A;
    color: #fff;
    font-size: 30rpx;
    border-radius: 50rpx;
    padding: 20rpx 80rpx;
  }
}

.spinner {
  width: 80rpx; height: 80rpx;
  border: 6rpx solid #D0E8E4;
  border-top-color: #4A8A7A;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
