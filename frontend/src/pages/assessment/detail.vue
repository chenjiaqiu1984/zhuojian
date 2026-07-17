<template>
  <view class="page">
    <view v-if="loading" class="status-center"><text class="status-txt">加载中...</text></view>

    <!-- Instruction Page -->
    <view v-else-if="scale && showInstruction" class="inst-page">
      <view class="inst-hero">
        <view class="inst-hero-glow" />
        <view class="inst-hero-content">
          <text class="inst-eyebrow">开始前请阅读</text>
          <text class="inst-title">{{ scale.name }}</text>
          <view class="inst-pills">
            <text class="inst-pill">{{ questions.length }} 题</text>
            <text class="inst-pill-sep">·</text>
            <text class="inst-pill">约 {{ scale.estimatedMinutes }} 分钟</text>
          </view>
        </view>
      </view>
      <view class="inst-body">
        <view class="inst-card">
          <text class="inst-text">{{ scale.instruction }}</text>
        </view>
        <button class="btn-start" @click="startTest()">开始测评</button>
        <view class="data-notice">
          <text class="data-notice-icon">🔒</text>
          <text class="data-notice-text">您的测评数据将被加密保存，可能被用于咨询前的背景分析与专业解读，以帮助咨询师更好地了解您的状况。我们承诺严格保密，不向任何第三方泄露您的个人信息。</text>
        </view>
      </view>
    </view>

    <!-- Assessment in Progress -->
    <view v-else-if="scale">
      <view class="progress-wrap">
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: ((current + 1) / questions.length * 100) + '%' }"></view>
        </view>
        <view class="progress-row">
          <text class="progress-label">第 {{ current + 1 }} 题</text>
          <text class="progress-total">{{ current + 1 }} / {{ questions.length }}</text>
        </view>
      </view>

      <view v-if="current === 0 && scale.category !== 'fun'" class="guide-banner">
        <text class="guide-text">请根据最近两周的真实感受作答，选择第一反应最符合的选项。</text>
      </view>

      <view class="q-card" :key="questions[current].id">
        <text class="q-text">{{ questions[current].content }}</text>
        <view class="options">
          <view
            v-for="(opt, optIdx) in JSON.parse(questions[current].options)"
            :key="questions[current].id + '_' + optIdx"
            :class="['option', answers[questions[current].id] === opt.value && 'selected', optionsLocked && 'locked']"
            @click="select(questions[current].id, opt.value)"
          >
            <view :class="['opt-dot', answers[questions[current].id] === opt.value && 'opt-dot-on']"></view>
            <text class="opt-label">{{ opt.label }}</text>
          </view>
        </view>
      </view>

      <view v-if="!isFlow" class="nav-row">
        <button v-if="current > 0" class="btn-prev" @click="current--">上一题</button>
        <view v-else class="btn-spacer" />
        <button
          v-if="current < questions.length - 1"
          class="btn-next"
          :disabled="answers[questions[current].id] === undefined"
          @click="current < questions.length - 1 && current++"
        >下一题</button>
        <button
          v-else
          class="btn-submit"
          :disabled="!allAnswered || submitting"
          @click="trySubmit()"
        >{{ submitting ? '提交中...' : '提交测评' }}</button>
      </view>
    </view>

    <!-- Login Prompt -->
    <view v-if="showLoginPrompt" class="mask">
      <view class="modal">
        <text class="modal-title">登录后查看完整解析</text>
        <text class="modal-desc">登录用户可查看分数含义和专业解读</text>
        <button class="btn-modal-primary" @click="goLogin()">登录</button>
        <button class="btn-modal-secondary" @click="goRegister()">新用户注册</button>
        <text class="modal-skip" @click="showLoginPrompt=false">先测评，稍后登录</text>
      </view>
    </view>

    <!-- Pay Modal -->
    <view v-if="showPayModal" class="mask">
      <view class="modal">
        <text class="modal-title">{{ payInfo.reason === 'repeat' ? '再次测评' : '付费测评' }}</text>
        <text class="modal-desc">{{ payInfo.reason === 'repeat' ? '您已完成过本测评，再次测评需付费或使用兑换码' : '本测评为专业付费项目' }}</text>
        <text class="modal-price">¥{{ (payInfo.price / 100).toFixed(2) }}</text>
        <input v-model="voucherCode" placeholder="有兑换码？请输入" class="voucher-input" />
        <view class="modal-btns">
          <button class="btn-modal-secondary sm" @click="showPayModal=false">取消</button>
          <button v-if="voucherCode" class="btn-modal-primary sm" @click="submitWithVoucher()">使用兑换码</button>
          <button v-else class="btn-wechat sm" @click="handlePay()">去支付</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { assessmentApi } from '../../api/index.js';
import { useUserStore } from '../../store/user.js';
import { track } from '../../utils/track.js';

const props = defineProps(['id']);
const store = useUserStore();
const scale = ref(null);
const questions = ref([]);
const answers = ref({});
const current = ref(0);
const optionsLocked = ref(false);
let lockTimer = null;
watch(current, () => {
  if (lockTimer) clearTimeout(lockTimer);
  optionsLocked.value = true;
  lockTimer = setTimeout(() => optionsLocked.value = false, 500);
});
const loading = ref(true);
const submitting = ref(false);
const showPayModal = ref(false);
const showInstruction = ref(false);
const payInfo = ref({});
const voucherCode = ref('');
const showLoginPrompt = ref(false);

const isFlow = computed(() => {
  try { return JSON.parse(scale.value?.scoringRule || '{}').method === 'flow'; } catch { return false; }
});
const flowHistory = ref([]);

onMounted(async () => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  const id = page?.options?.id;
  try {
    const data = await assessmentApi.getScale(id);
    scale.value = data;
    questions.value = data.questions;
    track('scale_view', '/pages/assessment/detail', { scaleId: Number(id), scaleName: data.name });
    if (data.instruction) {
      showInstruction.value = true;
    } else {
      track('assessment_start', '/pages/assessment/detail', { scaleId: Number(id), scaleName: data.name });
    }
  } catch {}
  if (!store.isLoggedIn()) showLoginPrompt.value = true;
  loading.value = false;
});

function startTest() {
  track('assessment_start', '/pages/assessment/detail', { scaleId: scale.value.id, scaleName: scale.value.name });
  showInstruction.value = false;
}

function goLogin() { uni.navigateTo({ url: '/pages/login/index' }); }
function goRegister() { uni.navigateTo({ url: '/pages/register/index' }); }

onShow(() => {
  if (store.isLoggedIn()) showLoginPrompt.value = false;
});

const allAnswered = computed(() => questions.value.every(q => answers.value[q.id] !== undefined));

function select(qId, val) {
  if (optionsLocked.value) return;
  optionsLocked.value = true;
  answers.value = { ...answers.value, [qId]: val };
  if (isFlow.value) {
    const q = questions.value[current.value];
    const opts = JSON.parse(q.options);
    const opt = opts.find(o => o.value === val);
    if (!opt?.next) { setTimeout(() => optionsLocked.value = false, 500); return; }
    if (/^[A-Z]$/.test(opt.next)) {
      setTimeout(() => doSubmit(), 300);
    } else {
      const nextNum = Number(opt.next.replace('q', ''));
      const nextIdx = questions.value.findIndex(q => q.orderNum === nextNum);
      if (nextIdx !== -1) { flowHistory.value.push(current.value); setTimeout(() => current.value = nextIdx, 200); }
    }
    return;
  }
  if (current.value < questions.value.length - 1) {
    setTimeout(() => { if (current.value < questions.value.length - 1) current.value++; }, 200);
  }
}

async function trySubmit() {
  if (store.isLoggedIn()) {
    try {
      const access = await assessmentApi.checkAccess(scale.value.id);
      if (!access.canDo) {
        payInfo.value = access;
        showPayModal.value = true;
        return;
      }
    } catch {}
  }
  doSubmit();
}

async function doSubmit(voucher = '') {
  submitting.value = true;
  try {
    const res = await assessmentApi.submit({ scaleId: scale.value.id, answers: answers.value, voucherCode: voucher || undefined });
    if (res.requirePayment) {
      payInfo.value = res;
      showPayModal.value = true;
      submitting.value = false;
      return;
    }
    const params = res.resultId ? `resultId=${res.resultId}` : `score=${res.score}&level=${encodeURIComponent(res.level)}&scaleId=${scale.value.id}`;
    const crisisParam = res.crisis ? '&crisis=1' : '';
    track('assessment_submit', '/pages/assessment/detail', { scaleId: scale.value.id, scaleName: scale.value.name, level: res.level });
    assessmentApi.trackScale(scale.value.id).catch(() => {});
    uni.redirectTo({ url: `/pages/assessment/result?${params}${crisisParam}` });
  } catch (e) {
    uni.showToast({ title: e.error || '提交失败', icon: 'none' });
    submitting.value = false;
  }
}

async function submitWithVoucher() {
  showPayModal.value = false;
  doSubmit(voucherCode.value);
}

function handlePay() {
  uni.showToast({ title: '支付功能开发中，请联系管理员获取兑换码', icon: 'none', duration: 3000 });
}
</script>

<style scoped lang="scss">
$teal: #4A8A7A;
$teal-dark: #3A6E80;
$bg: #F5F7F6;
$text-1: #1C2A27;
$text-2: #617870;
$muted: #9BBCB4;
$border: #E8EFED;
$card-r: 24rpx;
$card-shadow: 0 4rpx 18rpx rgba(28,42,39,0.04);

.page { min-height: 100vh; background: $bg; }

/* Status */
.status-center { text-align: center; padding: 120rpx 0; }
.status-txt { font-size: 28rpx; color: $muted; }

/* Instruction Page */
.inst-page { min-height: 100vh; display: flex; flex-direction: column; }
.inst-hero {
  position: relative;
  padding: 80rpx 48rpx 60rpx;
  overflow: hidden;
  background: linear-gradient(135deg, $teal 0%, $teal-dark 100%);
}
.inst-hero-glow {
  position: absolute;
  top: -120rpx;
  right: -100rpx;
  width: 440rpx;
  height: 380rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, transparent 66%);
  pointer-events: none;
}
.inst-hero-content { position: relative; z-index: 1; }
.inst-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.34em;
  color: rgba(255,255,255,0.65);
  margin-bottom: 20rpx;
}
.inst-title {
  display: block;
  font-size: 52rpx;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
  margin-bottom: 28rpx;
  font-family: "Noto Serif SC", serif;
  letter-spacing: 0.04em;
}
.inst-pills { display: flex; align-items: center; gap: 16rpx; }
.inst-pill {
  font-size: 24rpx;
  color: rgba(255,255,255,0.78);
  background: rgba(255,255,255,0.15);
  padding: 8rpx 24rpx;
  border-radius: 32rpx;
}
.inst-pill-sep { font-size: 22rpx; color: rgba(255,255,255,0.4); }
.inst-body { flex: 1; padding: 40rpx 28rpx 48rpx; display: flex; flex-direction: column; }
.inst-card {
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  box-shadow: $card-shadow;
  padding: 40rpx 36rpx;
  flex: 1;
  margin-bottom: 40rpx;
}
.inst-text {
  display: block;
  font-size: 28rpx;
  color: $text-2;
  line-height: 2;
  white-space: pre-wrap;
}
.btn-start {
  background: $teal;
  color: #fff;
  border: none;
  border-radius: $card-r;
  padding: 0;
  height: 96rpx;
  font-size: 32rpx;
  font-weight: 600;
  width: 100%;
  letter-spacing: 0.06em;
  &:active { transform: scale(0.98); opacity: 0.92; }
}
.data-notice {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 28rpx;
  padding: 24rpx 28rpx;
  background: rgba(74,138,122,0.06);
  border: 1rpx solid rgba(74,138,122,0.18);
  border-radius: 16rpx;
}
.data-notice-icon {
  font-size: 28rpx;
  flex-shrink: 0;
  line-height: 1.6;
}
.data-notice-text {
  font-size: 22rpx;
  color: $text-2;
  line-height: 1.8;
  flex: 1;
}

/* Progress */
.progress-wrap { padding: 0 0 4rpx; }
.progress-bar { height: 6rpx; background: $border; }
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $teal, $teal-dark);
  transition: width 0.35s ease;
  border-radius: 0 4rpx 4rpx 0;
}
.progress-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 28rpx;
}
.progress-label { font-size: 24rpx; color: $teal; font-weight: 600; }
.progress-total { font-size: 22rpx; color: $muted; }

/* Guide */
.guide-banner {
  margin: 0 28rpx 8rpx;
  background: rgba(74,138,122,0.08);
  border-left: 6rpx solid rgba(74,138,122,0.5);
  border-radius: 0 16rpx 16rpx 0;
  padding: 24rpx 28rpx;
}
.guide-text { font-size: 24rpx; color: $text-2; line-height: 1.8; display: block; }

/* Question card */
.q-card {
  margin: 16rpx 28rpx;
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  box-shadow: $card-shadow;
  padding: 44rpx 36rpx 36rpx;
}
.q-text {
  display: block;
  font-size: 32rpx;
  color: $text-1;
  line-height: 1.75;
  margin-bottom: 40rpx;
  font-family: "Noto Serif SC", serif;
  letter-spacing: 0.02em;
}
.options { display: flex; flex-direction: column; gap: 20rpx; }
.option {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 32rpx;
  border: 1rpx solid $border;
  border-radius: 20rpx;
  background: #fff;
  transition: all 0.18s ease;
  &.selected {
    border-color: $teal;
    background: rgba(74,138,122,0.06);
  }
  &.locked { opacity: 0.5; pointer-events: none; }
  &:active { transform: scale(0.99); }
}
.opt-dot {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 3rpx solid $border;
  flex-shrink: 0;
  transition: all 0.18s ease;
  &.opt-dot-on {
    border-color: $teal;
    background: $teal;
    box-shadow: 0 0 0 6rpx rgba(74,138,122,0.15);
  }
}
.opt-label {
  font-size: 28rpx;
  color: $text-2;
  line-height: 1.5;
  .option.selected & { color: $teal; font-weight: 500; }
}

/* Nav */
.nav-row { margin: 24rpx 28rpx 40rpx; display: flex; gap: 20rpx; }
.btn-spacer { flex: 1; }
.btn-prev {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  border: 1rpx solid $border;
  background: #fff;
  color: $text-2;
}
.btn-next, .btn-submit {
  flex: 2;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  background: $teal;
  color: #fff;
  letter-spacing: 0.04em;
  &:disabled { opacity: 0.45; }
  &:active { opacity: 0.88; }
}

/* Modals */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal {
  background: #fff;
  border-radius: 32rpx;
  padding: 56rpx 48rpx 48rpx;
  width: 86%;
  text-align: center;
}
.modal-title {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: $text-1;
  font-family: "Noto Serif SC", serif;
  margin-bottom: 16rpx;
}
.modal-desc {
  display: block;
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.7;
  margin-bottom: 40rpx;
}
.modal-price {
  display: block;
  font-size: 56rpx;
  font-weight: 700;
  color: #D8693A;
  margin-bottom: 32rpx;
}
.btn-modal-primary {
  width: 100%;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  background: $teal;
  color: #fff;
  margin-bottom: 16rpx;
  letter-spacing: 0.04em;
}
.btn-modal-secondary {
  width: 100%;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  border: 1rpx solid $border;
  background: #fff;
  color: $text-2;
  &.sm { flex: 1; width: auto; }
}
.btn-wechat {
  flex: 2;
  height: 88rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  background: #07c160;
  color: #fff;
}
.modal-skip {
  display: block;
  font-size: 24rpx;
  color: $muted;
  margin-top: 28rpx;
}
.voucher-input {
  border: 1rpx solid $border;
  border-radius: 16rpx;
  padding: 0 28rpx;
  height: 80rpx;
  width: 100%;
  box-sizing: border-box;
  font-size: 26rpx;
  margin-bottom: 28rpx;
  color: $text-1;
}
.modal-btns { display: flex; gap: 20rpx; }
</style>
