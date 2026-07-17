<template>
  <view class="page">

    <!-- 订单摘要卡 -->
    <view class="summary-card">
      <view class="summary-badge">
        <text class="summary-badge-text">{{ isActivity ? '活动报名' : '咨询预约' }}</text>
      </view>

      <text class="summary-name" v-if="isActivity">{{ activityName }}</text>

      <!-- 活动退款须知 -->
      <view class="refund-block" v-if="isActivity">
        <text class="refund-label">退款政策</text>
        <view class="refund-rules" v-if="activityRefund.isPermanent">
          <view class="refund-rule">
            <view class="rule-dot rule-dot--green" />
            <text class="rule-text">长期有效活动，随时可全额退款</text>
          </view>
        </view>
        <view class="refund-rules" v-else>
          <view class="refund-rule">
            <view class="rule-dot rule-dot--green" />
            <text class="rule-text"><text class="rule-time">{{ activityRefund.deadline48h }}</text> 前取消，全额退款</text>
          </view>
          <view class="refund-rule">
            <view class="rule-dot rule-dot--amber" />
            <text class="rule-text"><text class="rule-time">{{ activityRefund.deadline24h }}</text> 前取消，退款 50%</text>
          </view>
          <view class="refund-rule">
            <view class="rule-dot rule-dot--red" />
            <text class="rule-text"><text class="rule-time">{{ activityRefund.deadline24h }}</text> 后取消，不予退款</text>
          </view>
        </view>
        <text class="refund-consent">如有特殊情况请联系客服：345958875@qq.com</text>
        <text class="refund-consent">点击「立即支付」即表示同意以上退款规则</text>
      </view>

      <template v-else>
        <text class="summary-name">{{ consultantName }}</text>
        <text class="summary-time">{{ slotTime }}</text>
      </template>

      <!-- 退费须知 -->
      <view class="refund-block" v-if="!isActivity">
        <text class="refund-label">退款政策</text>
        <view class="refund-rules">
          <view class="refund-rule">
            <view class="rule-dot rule-dot--green" />
            <text class="rule-text"><text class="rule-time">{{ refundDeadline48h }}</text> 前取消，全额退款</text>
          </view>
          <view class="refund-rule">
            <view class="rule-dot rule-dot--amber" />
            <text class="rule-text"><text class="rule-time">{{ refundDeadline24h }}</text> 前取消，退款 50%</text>
          </view>
          <view class="refund-rule">
            <view class="rule-dot rule-dot--red" />
            <text class="rule-text"><text class="rule-time">{{ refundDeadline24h }}</text> 后取消，不予退款</text>
          </view>
        </view>
        <text class="refund-consent">如有特殊情况请联系客服：345958875@qq.com</text>
        <text class="refund-consent">点击「立即支付」即表示同意以上退款规则</text>
      </view>

      <view class="summary-divider" />

      <!-- 金额 -->
      <view class="amount-section">
        <text class="amount-label">应付金额</text>
        <view class="amount-display">
          <text class="amount-strike" v-if="discountRate < 1.0">¥{{ (amount / 100).toFixed(2) }}</text>
          <view class="amount-main">
            <text class="amount-currency">¥</text>
            <text class="amount-value">{{ (finalAmount / 100).toFixed(2) }}</text>
          </view>
          <view class="discount-chip" v-if="discountRate < 1.0">
            <text class="discount-chip-text">{{ Math.round(discountRate * 10) }}折</text>
          </view>
        </view>
      </view>

      <!-- 优惠券减免 -->
      <view class="savings-row" v-if="selectedCouponDiscount > 0 && !usePackage">
        <text class="savings-label">优惠券减免</text>
        <text class="savings-value">-¥{{ (selectedCouponDiscount / 100).toFixed(2) }}</text>
      </view>
    </view>

    <!-- 倒计时 -->
    <view class="timer-bar" v-if="countdown > 0">
      <view class="timer-dot" />
      <text class="timer-text">请在 <text class="timer-count">{{ timerText }}</text> 内完成支付</text>
    </view>
    <view class="timer-bar timer-bar--expired" v-else-if="orderNo">
      <view class="timer-dot" />
      <text class="timer-text">订单已超时，请重新预约</text>
    </view>

    <!-- 支付方式 -->
    <view class="section-block">
      <text class="section-label">支付方式</text>
      <view class="method-group">
        <view
          class="method-item"
          :class="{ 'method-item--active': payMethod === 'wechat' }"
          @click="payMethod = 'wechat'"
        >
          <view class="method-icon method-icon--wechat">
            <text class="method-icon-text">微</text>
          </view>
          <text class="method-name">微信支付</text>
          <view class="method-radio" :class="{ 'method-radio--on': payMethod === 'wechat' }">
            <view class="method-radio-dot" v-if="payMethod === 'wechat'" />
          </view>
        </view>
        <view
          v-if="isH5"
          class="method-item"
          :class="{ 'method-item--active': payMethod === 'alipay' }"
          @click="payMethod = 'alipay'"
        >
          <view class="method-icon method-icon--alipay">
            <text class="method-icon-text">支</text>
          </view>
          <text class="method-name">支付宝</text>
          <view class="method-radio" :class="{ 'method-radio--on': payMethod === 'alipay' }">
            <view class="method-radio-dot" v-if="payMethod === 'alipay'" />
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="section-block" v-if="!isActivity && !usePackage && availableCoupons.length > 0">
      <view class="section-header">
        <text class="section-label">优惠券</text>
        <text class="section-count">{{ availableCoupons.length }} 张可用</text>
      </view>
      <view class="coupon-group">
        <view
          v-for="uc in availableCoupons"
          :key="uc.id"
          class="coupon-item"
          :class="{ 'coupon-item--active': selectedCouponId === uc.id, 'coupon-item--disabled': !uc.applicable }"
          @click="uc.applicable && selectCoupon(uc.id)"
        >
          <view class="coupon-badge" :class="{ 'coupon-badge--dim': !uc.applicable }">
            <text class="coupon-badge-text" v-if="uc.applicable && uc.discount > 0">省¥{{ (uc.discount / 100).toFixed(0) }}</text>
            <text class="coupon-badge-text" v-else>券</text>
          </view>
          <view class="coupon-info">
            <text class="coupon-name">{{ uc.coupon.name }}</text>
            <text class="coupon-desc" v-if="uc.coupon.description">{{ uc.coupon.description }}</text>
            <text class="coupon-unavail" v-if="!uc.applicable">
              {{ uc.coupon.type === 'threshold' ? `满¥${(uc.coupon.threshold/100).toFixed(0)}可用` : '不适用当前订单' }}
            </text>
          </view>
          <view class="method-radio" :class="{ 'method-radio--on': selectedCouponId === uc.id }">
            <view class="method-radio-dot" v-if="selectedCouponId === uc.id" />
          </view>
        </view>
        <view
          class="coupon-item coupon-item--plain"
          :class="{ 'coupon-item--active': selectedCouponId === null }"
          @click="selectedCouponId = null"
        >
          <text class="coupon-none-text">不使用优惠券</text>
          <view class="method-radio" :class="{ 'method-radio--on': selectedCouponId === null }">
            <view class="method-radio-dot" v-if="selectedCouponId === null" />
          </view>
        </view>
      </view>
    </view>

    <!-- 套餐 -->
    <view class="section-block" v-if="!isActivity && activePackages.length > 0">
      <text class="section-label">套餐次数</text>
      <view class="method-group">
        <view
          v-for="up in activePackages"
          :key="up.id"
          class="method-item"
          :class="{ 'method-item--active': usePackage && selectedPackageId === up.id }"
          @click="selectPackage(up.id)"
        >
          <view class="pkg-info">
            <text class="method-name">{{ up.package.name }}</text>
            <text class="pkg-remain">剩余 {{ up.totalSessions - up.usedSessions }} 次</text>
          </view>
          <view class="method-radio" :class="{ 'method-radio--on': usePackage && selectedPackageId === up.id }">
            <view class="method-radio-dot" v-if="usePackage && selectedPackageId === up.id" />
          </view>
        </view>
        <view
          class="method-item"
          :class="{ 'method-item--active': !usePackage }"
          @click="usePackage = false; selectedPackageId = null"
        >
          <text class="method-name">单次支付</text>
          <view class="method-radio" :class="{ 'method-radio--on': !usePackage }">
            <view class="method-radio-dot" v-if="!usePackage" />
          </view>
        </view>
      </view>
    </view>

    <!-- 底部操作区 -->
    <view class="footer">
      <button
        class="pay-btn"
        :class="{ 'pay-btn--disabled': loading || countdown <= 0 }"
        :disabled="loading || countdown <= 0"
        @click="doPay()"
      >
        <text v-if="loading">处理中</text>
        <text v-else-if="usePackage">使用套餐预约</text>
        <text v-else>立即支付 ¥{{ (finalAmount / 100).toFixed(2) }}</text>
      </button>
      <text class="cancel-link" v-if="!isActivity" @click="cancel()">取消预约</text>
    </view>

    <!-- 二维码弹窗 -->
    <view v-if="showQrModal" class="qr-overlay" @click.self="closeQrModal">
      <view class="qr-panel">
        <view class="qr-header">
          <text class="qr-title">{{ qrTitle }}</text>
          <view class="qr-close-btn" @click="closeQrModal">
            <text class="qr-close-x">×</text>
          </view>
        </view>
        <view class="qr-frame">
          <image class="qr-img" :src="qrDataUrl" mode="aspectFit" />
        </view>
        <text class="qr-hint">请使用微信扫码完成支付，支付成功后自动跳转</text>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import QRCode from 'qrcode';
import { paymentApi, bookingApi, packageApi, couponApi } from '../../api/index';
import { requireActive } from '../../utils/requireActive';

// uni-app 路由页面通过 URL query 传参，不能用 defineProps 接收
// 改为本地 ref，在 onMounted 里从 query 读取
const bookingId      = ref(0);
const newsId         = ref(0);          // 活动支付时使用
const activityName   = ref('');
const activityEndDate = ref('');        // 活动截止日期，空=长期有效
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

// 活动退款规则：基于 endDate 计算截止时间
const activityRefund = computed(() => {
  if (!activityEndDate.value) {
    // 长期有效
    return { isPermanent: true, lines: [] };
  }
  const base = new Date(activityEndDate.value);
  const d48 = new Date(base.getTime() - 48 * 3600 * 1000);
  const d24 = new Date(base.getTime() - 24 * 3600 * 1000);
  return {
    isPermanent: false,
    deadline48h: fmtDatetime(d48),
    deadline24h: fmtDatetime(d24),
  };
});
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
  if (!requireActive()) return;
  // 从页面 query 读取参数（uni-app H5 / 小程序均兼容）
  const pages = getCurrentPages();
  const cur   = pages[pages.length - 1];
  // 小程序优先用 cur.options（原生参数对象，最可靠）；H5 用 fullPath 或 hash
  let p = null;
  // #ifndef H5
  p = cur?.options || {};
  // #endif
  // #ifdef H5
  const fullPathQuery = cur?.$page?.fullPath?.split('?')[1];
  if (fullPathQuery) {
    p = Object.fromEntries(new URLSearchParams(fullPathQuery));
  } else {
    p = cur?.options || {};
  }
  // #endif
  if (p) {
    if (p.bookingId)      bookingId.value      = Number(p.bookingId);
    if (p.newsId)         newsId.value         = Number(p.newsId);
    if (p.activityName)   activityName.value   = decodeURIComponent(p.activityName);
    if (p.endDate)        activityEndDate.value = decodeURIComponent(p.endDate);
    if (p.consultantName) consultantName.value = decodeURIComponent(p.consultantName);
    if (p.slotTime)       slotTime.value       = decodeURIComponent(p.slotTime);
    if (p.amount)         amount.value         = Number(p.amount);
    if (p.discountRate)   discountRate.value   = Number(p.discountRate);
  }

  // 从 storage 补充完整参数（活动报名场景下 URL 可能因长度限制被截断）
  try {
    const stored = uni.getStorageSync('_paymentParams');
    if (stored) {
      const sp = JSON.parse(stored);
      // URL 参数完整时以 URL 为准，URL 被截断时（newsId=0）直接用 storage
      if (sp.newsId && (!newsId.value || newsId.value === sp.newsId)) {
        if (!newsId.value)          newsId.value         = sp.newsId;
        if (!activityName.value && sp.activityName) activityName.value = sp.activityName;
        if (!activityEndDate.value && sp.endDate)   activityEndDate.value = sp.endDate;
        if (!amount.value && sp.amount)             amount.value = Number(sp.amount);
      }
      uni.removeStorageSync('_paymentParams');
    }
  } catch {}
  // H5 兜底：从 hash URL 直接读参数（应对 $page/options 读取失败的场景）
  // #ifdef H5
  if (!newsId.value && !bookingId.value) {
    const hash = window.location.hash;
    const q = hash.indexOf('?');
    if (q !== -1) {
      const hp = new URLSearchParams(hash.slice(q + 1));
      if (hp.get('newsId'))         newsId.value         = Number(hp.get('newsId'));
      if (hp.get('bookingId'))      bookingId.value      = Number(hp.get('bookingId'));
      if (hp.get('activityName'))   activityName.value   = decodeURIComponent(hp.get('activityName'));
      if (hp.get('endDate'))        activityEndDate.value = decodeURIComponent(hp.get('endDate'));
      if (hp.get('consultantName')) consultantName.value = decodeURIComponent(hp.get('consultantName'));
      if (hp.get('slotTime'))       slotTime.value       = decodeURIComponent(hp.get('slotTime'));
      if (hp.get('amount'))         amount.value         = Number(hp.get('amount'));
      if (hp.get('discountRate'))   discountRate.value   = Number(hp.get('discountRate'));
    }
  }
  // #endif

  // 参数读取失败（如从支付页返回时页面栈丢失参数），直接退出避免显示错误金额
  if (amount.value <= 0 && !usePackage.value) {
    uni.navigateBack({ delta: 1 });
    return;
  }

  startCountdown();
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
  if (!requireActive()) return;
  if (!isActivity.value && !bookingId.value) {
    uni.showToast({ title: '预约信息异常，请重新预约', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    if (isActivity.value) {
      if (!isH5) {
        await doActivityWechatMiniApp();
      } else if (!isMobile()) {
        payMethod.value === 'alipay' ? await doActivityAlipayDesktop() : await doActivityWechatDesktop();
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
  qrDataUrl.value = await QRCode.toDataURL(data.codeUrl, { width: 220, margin: 1 });
  qrTitle.value = '微信扫码支付';
  qrOrderNo.value = data.orderNo;
  showQrModal.value = true;
  startQrPoll(data.orderNo);
}
async function doActivityAlipay() {
  const data = await paymentApi.createActivityOrder(newsId.value, { payMethod: 'alipay' });
  orderNo.value = data.orderNo;
  document.write(data.payUrl);
}
async function doActivityAlipayDesktop() {
  const data = await paymentApi.createActivityOrder(newsId.value, { payMethod: 'alipay-pc' });
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
  if (isActivity.value && newsId.value) {
    try {
      const key = 'registeredActivities';
      const stored = JSON.parse(uni.getStorageSync(key) || '[]');
      if (!stored.includes(newsId.value)) stored.push(newsId.value);
      uni.setStorageSync(key, JSON.stringify(stored));
    } catch {}
  }
  uni.showToast({ title: '报名成功', icon: 'success' });
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
$teal:        #4A8A7A;
$teal-dark:   #3A7060;
$teal-light:  #EFF7F5;
$bg:          #F2F5F4;
$surface:     #ffffff;
$text-1:      #1C2A27;
$text-2:      #617870;
$text-3:      #9BBCB4;
$border:      #E4EDEA;
$amber:       #B87C0E;
$red:         #C03030;
$r-card:      20rpx;
$r-inner:     14rpx;

.page {
  min-height: 100vh;
  background: $bg;
  padding: 48rpx 0 180rpx;
}

/* ── Summary card ─────────────────────────────────────────────── */
.summary-card {
  margin: 0 24rpx 20rpx;
  background: $surface;
  border-radius: $r-card;
  padding: 36rpx 36rpx 32rpx;
  box-shadow: 0 4rpx 28rpx rgba(28,42,39,0.08);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4rpx;
    background: linear-gradient(90deg, $teal 0%, #72C2AE 100%);
  }
}

.summary-badge {
  display: inline-flex;
  background: $teal-light;
  border-radius: 8rpx;
  padding: 6rpx 18rpx;
  margin-bottom: 20rpx;
}

.summary-badge-text {
  font-size: 20rpx;
  font-weight: 600;
  color: $teal;
  letter-spacing: 0.07em;
}

.summary-name {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: $text-1;
  line-height: 1.4;
  margin-bottom: 8rpx;
}

.summary-time {
  display: block;
  font-size: 26rpx;
  color: $text-2;
  margin-bottom: 4rpx;
}

/* Refund policy */
.refund-block {
  margin: 28rpx 0 0;
  background: #F7FAF9;
  border-radius: $r-inner;
  border: 1rpx solid $border;
  padding: 24rpx 28rpx;
}

.refund-label {
  display: block;
  font-size: 19rpx;
  font-weight: 700;
  color: $text-3;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 16rpx;
}

.refund-rules {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 16rpx;
}

.refund-rule {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.rule-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  flex-shrink: 0;
  &--green { background: $teal; }
  &--amber { background: $amber; }
  &--red   { background: $red; }
}

.rule-text {
  font-size: 23rpx;
  color: $text-2;
  line-height: 1.5;
}

.rule-time {
  font-weight: 600;
  color: $text-1;
}

.refund-consent {
  font-size: 20rpx;
  color: $text-3;
  line-height: 1.6;
}

/* Divider */
.summary-divider {
  height: 1rpx;
  background: $border;
  margin: 28rpx 0 24rpx;
}

/* Amount */
.amount-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.amount-label {
  font-size: 26rpx;
  color: $text-2;
  padding-bottom: 8rpx;
}

.amount-display {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.amount-strike {
  font-size: 26rpx;
  color: $text-3;
  text-decoration: line-through;
}

.amount-main {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}

.amount-currency {
  font-size: 30rpx;
  font-weight: 700;
  color: $teal;
}

.amount-value {
  font-size: 64rpx;
  font-weight: 800;
  color: $teal;
  line-height: 1;
  letter-spacing: -0.02em;
}

.discount-chip {
  background: #FEEFEC;
  border-radius: 8rpx;
  padding: 5rpx 14rpx;
  align-self: center;
}

.discount-chip-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #C03A2A;
}

/* Coupon savings */
.savings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx dashed $border;
}

.savings-label { font-size: 24rpx; color: $text-2; }
.savings-value { font-size: 26rpx; font-weight: 700; color: #C03A2A; }

/* ── Timer bar ────────────────────────────────────────────────── */
.timer-bar {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin: 0 24rpx 20rpx;
  padding: 18rpx 28rpx;
  background: #FFFBF0;
  border-radius: $r-inner;
  border: 1rpx solid #F0DFA0;
}

.timer-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: $amber;
  flex-shrink: 0;
}

.timer-text {
  font-size: 24rpx;
  color: $amber;
}

.timer-count {
  font-weight: 700;
}

.timer-bar--expired {
  background: #FFF4F4;
  border-color: #F5BABA;
  .timer-dot { background: $red; }
  .timer-text { color: $red; }
}

/* ── Section blocks ───────────────────────────────────────────── */
.section-block {
  margin: 0 24rpx 20rpx;
  background: $surface;
  border-radius: $r-card;
  padding: 32rpx 36rpx;
  box-shadow: 0 2rpx 16rpx rgba(28,42,39,0.05);
}

.section-label {
  display: block;
  font-size: 21rpx;
  font-weight: 700;
  color: $text-3;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  margin-bottom: 20rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;

  .section-label { margin-bottom: 0; }
}

.section-count {
  font-size: 20rpx;
  font-weight: 600;
  color: $teal;
  background: $teal-light;
  padding: 5rpx 16rpx;
  border-radius: 20rpx;
}

/* ── Method items (payment, package) ─────────────────────────── */
.method-group {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  border-radius: $r-inner;
  border: 2rpx solid $border;
  background: $surface;

  &--active {
    border-color: $teal;
    background: $teal-light;
  }

  &:active { opacity: 0.85; }
}

.method-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--wechat { background: #07C160; }
  &--alipay { background: #1677FF; }
}

.method-icon-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
}

.method-name {
  font-size: 30rpx;
  font-weight: 500;
  color: $text-1;
  flex: 1;
}

.pkg-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.pkg-remain {
  font-size: 22rpx;
  color: $teal;
}

/* Radio circle */
.method-radio {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid $border;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--on { border-color: $teal; }
}

.method-radio-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: $teal;
}

/* ── Coupon items ─────────────────────────────────────────────── */
.coupon-group {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.coupon-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  border-radius: $r-inner;
  border: 2rpx solid $border;

  &--active {
    border-color: $teal;
    background: $teal-light;
  }

  &--disabled { opacity: 0.48; }

  &--plain { padding: 24rpx 28rpx; }
}

.coupon-badge {
  width: 88rpx;
  height: 68rpx;
  background: $teal;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--dim { background: $text-3; }
}

.coupon-badge-text {
  font-size: 20rpx;
  font-weight: 700;
  color: #fff;
  text-align: center;
  line-height: 1.3;
}

.coupon-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5rpx;
}

.coupon-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-1;
}

.coupon-desc {
  font-size: 21rpx;
  color: $text-2;
}

.coupon-unavail {
  font-size: 21rpx;
  color: $text-3;
}

.coupon-none-text {
  font-size: 28rpx;
  color: $text-2;
  flex: 1;
}

/* ── Footer ───────────────────────────────────────────────────── */
.footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: $surface;
  border-top: 1rpx solid $border;
  box-shadow: 0 -8rpx 40rpx rgba(28,42,39,0.07);
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.pay-btn {
  width: 100%;
  height: 96rpx;
  background: $teal;
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 48rpx;
  letter-spacing: 0.04em;
  border: none;

  &--disabled,
  &[disabled] {
    background: #C0D0CD;
    color: rgba(255,255,255,0.65);
  }

  &:active:not([disabled]) {
    opacity: 0.88;
    transform: scale(0.99);
  }
}

.cancel-link {
  font-size: 26rpx;
  color: $text-3;
}

/* ── QR overlay ───────────────────────────────────────────────── */
.qr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10,18,16,0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.qr-panel {
  background: $surface;
  border-radius: 24rpx;
  padding: 40rpx 48rpx 44rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 420rpx;
  box-shadow: 0 32rpx 80rpx rgba(10,18,16,0.30);
}

.qr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 32rpx;
}

.qr-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
}

.qr-close-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #F0F4F2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:active { opacity: 0.7; }
}

.qr-close-x {
  font-size: 36rpx;
  color: $text-2;
  line-height: 1;
  font-weight: 300;
}

.qr-frame {
  padding: 16rpx;
  border: 1rpx solid $border;
  border-radius: 16rpx;
  margin-bottom: 28rpx;
}

.qr-img {
  width: 220px;
  height: 220px;
  display: block;
}

.qr-hint {
  font-size: 22rpx;
  color: $text-2;
  text-align: center;
  line-height: 1.7;
  max-width: 340rpx;
}
</style>
