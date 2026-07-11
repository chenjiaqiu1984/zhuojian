<template>
  <view class="page">
    <!-- 订单信息 -->
    <view class="order-card">
      <text class="order-title">确认支付</text>
      <view class="order-row" v-if="isActivity">
        <text class="label">活动名称</text>
        <text class="value">{{ activityName }}</text>
      </view>
      <template v-else>
        <view class="order-row">
          <text class="label">咨询师</text>
          <text class="value">{{ consultantName }}</text>
        </view>
        <view class="order-row">
          <text class="label">预约时间</text>
          <text class="value">{{ slotTime }}</text>
        </view>
      </template>

      <!-- 退费须知（内嵌于订单卡片，仅预约支付显示） -->
      <view class="refund-policy" v-if="!isActivity">
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
      <!-- 金额分层展示 -->
      <view class="order-row amount-row">
        <text class="label">应付金额</text>
        <view class="amount-group">
          <text class="original-price" v-if="discountRate < 1.0">
            ¥{{ (amount / 100).toFixed(2) }}
          </text>
          <text class="amount">¥{{ (finalAmount / 100).toFixed(2) }}</text>
          <text class="discount-tag" v-if="discountRate < 1.0">
            {{ Math.round(discountRate * 10) }}折
          </text>
        </view>
      </view>
      <!-- 优惠券减免明细 -->
      <view class="order-row savings-row" v-if="selectedCouponDiscount > 0 && !usePackage">
        <text class="label">优惠券减免</text>
        <text class="savings">-¥{{ (selectedCouponDiscount / 100).toFixed(2) }}</text>
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

    <!-- 优惠券选择（有可用券时显示，活动支付不用券） -->
    <view class="pay-card" v-if="!isActivity && !usePackage && availableCoupons.length > 0">
      <view class="pay-item coupon-header">
        <text class="pay-icon">🎟️</text>
        <text class="pay-name">优惠券</text>
        <text class="coupon-count">{{ availableCoupons.length }} 张可用</text>
      </view>
      <view
        v-for="uc in availableCoupons"
        :key="uc.id"
        class="pay-item"
        :class="{ active: selectedCouponId === uc.id, disabled: !uc.applicable }"
        @click="uc.applicable && selectCoupon(uc.id)"
      >
        <view class="coupon-info">
          <text class="coupon-name">{{ uc.coupon.name }}</text>
          <text class="coupon-desc" v-if="uc.coupon.description">{{ uc.coupon.description }}</text>
          <text class="coupon-save green" v-if="uc.applicable && uc.discount > 0">
            可省 ¥{{ (uc.discount / 100).toFixed(2) }}
          </text>
          <text class="coupon-save gray" v-else-if="!uc.applicable">
            {{ uc.coupon.type === 'threshold'
              ? `满¥${(uc.coupon.threshold/100).toFixed(0)}可用`
              : '不适用当前订单' }}
          </text>
        </view>
        <text class="pay-check" v-if="selectedCouponId === uc.id">✓</text>
      </view>
      <!-- 不用券 -->
      <view
        class="pay-item"
        :class="{ active: selectedCouponId === null }"
        @click="selectedCouponId = null"
      >
        <text class="pay-icon">🚫</text>
        <text class="pay-name">不使用优惠券</text>
        <text class="pay-check" v-if="selectedCouponId === null">✓</text>
      </view>
    </view>

    <!-- 套餐选项（有可用套餐时显示，活动支付不用套餐） -->
    <view class="pay-card" v-if="!isActivity && activePackages.length > 0">
      <view class="pay-item package-header">
        <text class="pay-icon">🎁</text>
        <text class="pay-name">使用套餐次数</text>
      </view>
      <view
        v-for="up in activePackages"
        :key="up.id"
        class="pay-item"
        :class="{ active: usePackage && selectedPackageId === up.id }"
        @click="selectPackage(up.id)"
      >
        <view class="pkg-info">
          <text class="pkg-name">{{ up.package.name }}</text>
          <text class="pkg-remain">剩余 {{ up.totalSessions - up.usedSessions }} 次</text>
        </view>
        <text class="pay-check" v-if="usePackage && selectedPackageId === up.id">✓</text>
      </view>
      <!-- 不使用套餐 -->
      <view
        class="pay-item"
        :class="{ active: !usePackage }"
        @click="usePackage = false; selectedPackageId = null"
      >
        <text class="pay-icon">💳</text>
        <text class="pay-name">不使用套餐，单次支付</text>
        <text class="pay-check" v-if="!usePackage">✓</text>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="footer">
      <button class="pay-btn" :disabled="loading || countdown <= 0" @click="doPay()">
        <template v-if="loading">处理中...</template>
        <template v-else-if="usePackage">使用套餐预约（免支付）</template>
        <template v-else>立即支付 ¥{{ (finalAmount / 100).toFixed(2) }}</template>
      </button>
      <text class="cancel-link" v-if="!isActivity" @click="cancel()">取消预约</text>
    </view>
    <!-- 电脑端扫码弹窗 -->
    <view v-if="showQrModal" class="qr-mask" @click.self="closeQrModal">
      <view class="qr-box">
        <text class="qr-title">{{ qrTitle }}</text>
        <image class="qr-img" :src="qrDataUrl" mode="aspectFit" />
        <text class="qr-hint">请使用微信扫码完成支付，支付成功后自动跳转</text>
        <text class="qr-close" @click="closeQrModal()">取消</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import QRCode from 'qrcode';
import { paymentApi, bookingApi, packageApi, couponApi } from '../../api/index';

// uni-app 路由页面通过 URL query 传参，不能用 defineProps 接收
// 改为本地 ref，在 onMounted 里从 query 读取
const bookingId      = ref(0);
const newsId         = ref(0);          // 活动支付时使用
const activityName   = ref('');
const consultantName = ref('');
const slotTime       = ref('');
const amount         = ref(0);
const discountRate   = ref(1.0);
const isActivity     = computed(() => newsId.value > 0);

const loading           = ref(false);
const orderNo           = ref('');
const payMethod         = ref('wechat');
const countdown         = ref(15 * 60);
const myPackages        = ref([]);
const usePackage        = ref(false);
const selectedPackageId = ref(null);
const availableCoupons  = ref([]);      // { id, coupon, discount, applicable }
const selectedCouponId  = ref(null);    // 选中的 UserCoupon.id（null=不用券）
let timer = null;
let pollTimer = null;

// 是否手机浏览器（Windows/Mac/Linux 桌面端明确排除）
function isMobile() {
  const ua = navigator.userAgent;
  if (/Windows NT|Macintosh|X11; Linux x86_64/i.test(ua)) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

// QR 码弹窗状态
const showQrModal   = ref(false);
const qrDataUrl     = ref('');
const qrTitle       = ref('');
const qrOrderNo     = ref('');

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

// 折后实付金额（分，不含券）
const discountedAmount = computed(() =>
  Math.round(amount.value * discountRate.value)
);

// 当前选中券的减免金额
const selectedCouponDiscount = computed(() => {
  if (!selectedCouponId.value) return 0;
  const uc = availableCoupons.value.find(c => c.id === selectedCouponId.value);
  return uc?.discount ?? 0;
});

// 最终实付（折扣 + 券减，最低1分）
const finalAmount = computed(() =>
  Math.max(1, discountedAmount.value - selectedCouponDiscount.value)
);

// 有剩余次数且未过期的套餐
const activePackages = computed(() =>
  myPackages.value.filter(up =>
    up.status === 'active' &&
    up.usedSessions < up.totalSessions &&
    (!up.expireAt || new Date(up.expireAt) > new Date())
  )
);

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

onMounted(async () => {
  // 从页面 query 读取参数（uni-app H5 / 小程序均兼容）
  const pages = getCurrentPages();
  const cur   = pages[pages.length - 1];
  const query = cur?.$page?.fullPath?.split('?')[1] || cur?.options;
  if (query) {
    const p = typeof query === 'string'
      ? Object.fromEntries(new URLSearchParams(query))
      : query;
    if (p.bookingId)      bookingId.value      = Number(p.bookingId);
    if (p.newsId)         newsId.value         = Number(p.newsId);
    if (p.activityName)   activityName.value   = decodeURIComponent(p.activityName);
    if (p.consultantName) consultantName.value = decodeURIComponent(p.consultantName);
    if (p.slotTime)       slotTime.value       = decodeURIComponent(p.slotTime);
    if (p.amount)         amount.value         = Number(p.amount);
    if (p.discountRate)   discountRate.value   = Number(p.discountRate);
  }
  startCountdown();
  // 并行加载套餐和优惠券（静默失败）
  try {
    const [pkgs, coupons] = await Promise.all([
      packageApi.my(),
      couponApi.available(Math.round(amount.value * discountRate.value)),
    ]);
    myPackages.value = pkgs;
    availableCoupons.value = coupons;
    // 优先套餐；若无套餐，自动选中第一张适用券
    if (activePackages.value.length > 0) {
      usePackage.value        = true;
      selectedPackageId.value = activePackages.value[0].id;
    } else {
      const first = coupons.find(c => c.applicable);
      if (first) selectedCouponId.value = first.id;
    }
  } catch {}
});

onUnmounted(() => { clearInterval(timer); clearInterval(pollTimer); });

function startCountdown() {
  timer = setInterval(() => {
    if (countdown.value > 0) countdown.value--;
    else clearInterval(timer);
  }, 1000);
}

// ── 选择优惠券 ───────────────────────────────────────────────────
function selectCoupon(id) {
  selectedCouponId.value = selectedCouponId.value === id ? null : id;
}

// ── 选择套餐 ─────────────────────────────────────────────────────
function selectPackage(id) {
  usePackage.value        = true;
  selectedPackageId.value = id;
  selectedCouponId.value  = null; // 使用套餐时不用券
}

// ── 主支付入口 ────────────────────────────────────────────────────
async function doPay() {
  if (loading.value) return;
  loading.value = true;
  try {
    if (isActivity.value) {
      if (!isH5) {
        await doActivityWechatMiniApp();
      } else if (!isMobile()) {
        payMethod.value === 'alipay' ? await doAlipayDesktop() : await doActivityWechatDesktop();
      } else {
        payMethod.value === 'alipay' ? await doActivityAlipay() : await doActivityWechatH5();
      }
    } else if (usePackage.value && selectedPackageId.value) {
      await doUsePackage();
    } else if (isH5) {
      if (!isMobile()) {
        // 电脑浏览器：微信扫码 / 支付宝 PC
        payMethod.value === 'alipay' ? await doAlipayDesktop() : await doWechatDesktop();
      } else {
        payMethod.value === 'alipay' ? await doAlipayH5() : await doWechatH5();
      }
    } else {
      await doWechatMiniApp();
    }
  } catch (e) {
    if (e?.__authRedirect) return;
    const msg = e?.error || e?.message || '支付失败，请重试';
    console.error('[doPay error]', e);
    uni.showModal({ title: '支付失败', content: msg, showCancel: false });
  } finally {
    loading.value = false;
  }
}

// ── 套餐次数预约（不需要支付）────────────────────────────────────
async function doUsePackage() {
  await packageApi.use(selectedPackageId.value, { bookingId: bookingId.value });
  onPaySuccess();
}

// ── 桌面端微信扫码支付 ────────────────────────────────────────────
async function doWechatDesktop() {
  const data = await paymentApi.createNativeOrder(bookingId.value, { userCouponId: selectedCouponId.value });
  orderNo.value = data.orderNo;
  qrDataUrl.value = await QRCode.toDataURL(data.codeUrl, { width: 220, margin: 1 });
  qrTitle.value = '微信扫码支付';
  qrOrderNo.value = data.orderNo;
  showQrModal.value = true;
  startQrPoll(data.orderNo);
}

// ── 桌面端支付宝 PC 支付 ──────────────────────────────────────────
async function doAlipayDesktop() {
  const data = await paymentApi.createAlipayPcOrder(bookingId.value, { userCouponId: selectedCouponId.value });
  orderNo.value = data.orderNo;
  document.write(data.payUrl);
}

// ── 轮询支付结果（扫码支付用）────────────────────────────────────
function startQrPoll(no) {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const r = await paymentApi.queryOrder(no);
      if (r.status === 'paid') {
        clearInterval(pollTimer);
        showQrModal.value = false;
        onPaySuccess();
      }
    } catch {}
  }, 2000);
}

function closeQrModal() {
  showQrModal.value = false;
  clearInterval(pollTimer);
}
async function doActivityWechatMiniApp() {
  const data = await paymentApi.createActivityOrder(newsId.value, { payMethod: 'wxpay' });
  orderNo.value = data.orderNo;
  const p = data.payParams;
  await new Promise((resolve, reject) => {
    uni.requestPayment({ provider: 'wxpay', timeStamp: p.timeStamp, nonceStr: p.nonceStr, package: p.package, signType: p.signType || 'RSA', paySign: p.paySign, success: resolve, fail: reject });
  });
  onPaySuccess();
}
async function doActivityWechatH5() {
  const data = await paymentApi.createActivityOrder(newsId.value, { payMethod: 'native' });
  orderNo.value = data.orderNo;
  qrOrderNo.value = data.orderNo;
  location.href = data.codeUrl;
  startQrPoll(data.orderNo);
}
async function doActivityAlipay() {
  const data = await paymentApi.createActivityOrder(newsId.value, { payMethod: 'alipay' });
  orderNo.value = data.orderNo;
  document.write(data.payUrl);
}
async function doActivityWechatDesktop() {
  const data = await paymentApi.createActivityOrder(newsId.value, { payMethod: 'native' });
  orderNo.value = data.orderNo;
  qrDataUrl.value = await QRCode.toDataURL(data.codeUrl, { width: 220, margin: 1 });
  qrTitle.value = '微信扫码支付';
  qrOrderNo.value = data.orderNo;
  showQrModal.value = true;
  startQrPoll(data.orderNo);
}

// ── 小程序微信 JSAPI ──────────────────────────────────────────────
async function doWechatMiniApp() {
  const data = await paymentApi.createBookingOrder(bookingId.value, { userCouponId: selectedCouponId.value });
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

// ── 微信支付（手机浏览器，扫码支付）─────────────────────────────
async function doWechatH5() {
  const data = await paymentApi.createNativeOrder(bookingId.value, { userCouponId: selectedCouponId.value });
  orderNo.value = data.orderNo;
  qrOrderNo.value = data.orderNo;
  qrDataUrl.value = await QRCode.toDataURL(data.codeUrl, { width: 220, margin: 1 });
  qrTitle.value = '微信扫码支付';
  showQrModal.value = true;
  startQrPoll(data.orderNo);
}

// ── 支付宝 WAP 支付（跳转支付宝 App / 网页）──────────────────────
async function doAlipayH5() {
  const data = await paymentApi.createAlipayOrder(bookingId.value, { userCouponId: selectedCouponId.value });
  orderNo.value = data.orderNo;
  // payUrl 是含自动提交 <script> 的 HTML 表单，document.write 才能执行内嵌脚本跳转支付宝
  document.write(data.payUrl);
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
  .amount-row { margin-top: 8rpx; align-items: flex-end; }
  .amount-group { display: flex; align-items: baseline; gap: 10rpx; }
  .amount { font-size: 48rpx; font-weight: 700; color: #4A8A7A; }
  .original-price { font-size: 26rpx; color: #B0B8B5; text-decoration: line-through; }
  .discount-tag {
    font-size: 20rpx; font-weight: 600; color: #fff;
    background: #E05A4A; border-radius: 8rpx; padding: 2rpx 10rpx;
  }

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
    &.active   { background: #F5FBF9; }
    &.disabled { opacity: .45; }
    &.package-header, &.coupon-header { background: #F5FBF9; border-radius: 20rpx 20rpx 0 0; }
    .coupon-count { font-size: 22rpx; color: #4A8A7A; margin-left: auto; }
    .coupon-info  { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
    .coupon-name  { font-size: 28rpx; color: #1C2A27; font-weight: 500; }
    .coupon-desc  { font-size: 20rpx; color: #8A9E97; }
    .coupon-save  { font-size: 22rpx; font-weight: 600;
      &.green { color: #4A8A7A; }
      &.gray  { color: #B0B8B5; }
    }
    .pkg-info   { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
    .pkg-name   { font-size: 28rpx; color: #1C2A27; font-weight: 500; }
    .pkg-remain { font-size: 22rpx; color: #4A8A7A; }
  }
  & + .pay-card { margin-top: 16rpx; }
}

.order-card .savings-row { padding: 6rpx 0; }
.order-card .savings { font-size: 26rpx; font-weight: 600; color: #E05A4A; }

.qr-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center; z-index: 999;
}
.qr-box {
  background: #fff; border-radius: 20rpx; padding: 48rpx 56rpx;
  display: flex; flex-direction: column; align-items: center; gap: 24rpx;
  min-width: 380rpx;
}
.qr-title { font-size: 32rpx; font-weight: 700; color: #1C2A27; }
.qr-img   { width: 220px; height: 220px; }
.qr-hint  { font-size: 22rpx; color: #8A9E97; text-align: center; line-height: 1.6; }
.qr-close { font-size: 26rpx; color: #C83232; margin-top: 8rpx; cursor: pointer; }

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
