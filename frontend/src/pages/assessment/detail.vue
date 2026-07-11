<template>
  <view class="page">
    <view v-if="loading" class="center">加载中...</view>
    <view v-else-if="scale && showInstruction" class="instruction-page">
      <text class="inst-title">{{scale.name}}</text>
      <view class="inst-box">
        <text class="inst-text">{{scale.instruction}}</text>
      </view>
      <view class="inst-meta">
        <text>{{questions.length}} 题</text>
        <text>约 {{scale.estimatedMinutes}} 分钟</text>
      </view>
      <button class="btn-start" @click="startTest()">开始测评</button>
    </view>
    <view v-else-if="scale">
      <view class="progress-bar">
        <view class="progress-fill" :style="{width: ((current+1)/questions.length*100)+'%'}"></view>
      </view>
      <view class="progress-text">{{current+1}} / {{questions.length}}</view>

      <view v-if="current === 0 && scale.category !== 'fun'" class="guide-banner">
        <text class="guide-text">请根据你最近两周的真实感受作答，不要过多思考，选择第一反应最符合的选项。所有答案都是对的，诚实的作答才能帮助你真正了解自己。</text>
      </view>

      <view class="question-card">
        <text class="q-text">{{questions[current].content}}</text>
        <view class="options">
          <view
            v-for="opt in JSON.parse(questions[current].options)"
            :key="opt.value"
            :class="['option', answers[questions[current].id] === opt.value && 'selected', optionsLocked && 'locked']"
            @click="select(questions[current].id, opt.value)"
          >{{opt.label}}</view>
        </view>
      </view>

      <view v-if="!isFlow" class="nav-btns">
        <button v-if="current > 0" class="btn-prev" @click="current--">上一题</button>
        <button v-if="current < questions.length-1" class="btn-next" :disabled="answers[questions[current].id] === undefined" @click="current < questions.length-1 && current++">下一题</button>
        <button v-else class="btn-submit" :disabled="!allAnswered || submitting" @click="trySubmit()">{{submitting ? '提交中...' : '提交测评'}}</button>
      </view>
    </view>

    <!-- login prompt for non-logged-in users -->
    <view v-if="showLoginPrompt" class="login-mask">
      <view class="login-modal">
        <text class="lm-title">登录后查看完整解析</text>
        <text class="lm-desc">完成测评后，登录用户可查看分数含义和专业解读</text>
        <button class="lm-btn-login" @click="goLogin()">登录</button>
        <button class="lm-btn-reg" @click="goRegister()">新用户注册</button>
        <text class="lm-skip" @click="showLoginPrompt=false">先测评，稍后登录</text>
      </view>
    </view>

    <!-- voucher/pay modal -->
    <view v-if="showPayModal" class="modal-mask">
      <view class="modal">
        <text class="modal-title">{{payInfo.reason === 'repeat' ? '再次测评' : '付费测评'}}</text>
        <text class="modal-desc">{{payInfo.reason === 'repeat' ? '您已完成过本测评，再次测评需付费或使用兑换码' : '本测评为专业付费项目'}}</text>
        <text class="modal-price">¥{{(payInfo.price/100).toFixed(2)}}</text>
        <input v-model="voucherCode" placeholder="有兑换码？请输入" class="voucher-input" />
        <view class="modal-btns">
          <button class="btn-cancel" @click="showPayModal=false">取消</button>
          <button v-if="voucherCode" class="btn-confirm" @click="submitWithVoucher()">使用兑换码</button>
          <button v-else class="btn-pay" @click="handlePay()">去支付</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
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
watch(current, () => {
  optionsLocked.value = true;
  setTimeout(() => optionsLocked.value = false, 500);
}, { immediate: true });
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

const allAnswered = computed(() => questions.value.every(q => answers.value[q.id] !== undefined));

function select(qId, val) {
  if (optionsLocked.value) return;
  answers.value = { ...answers.value, [qId]: val };
  if (isFlow.value) {
    const q = questions.value[current.value];
    const opts = JSON.parse(q.options);
    const opt = opts.find(o => o.value === val);
    if (!opt?.next) return;
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

<style scoped>
.page { background: #f5f7fa; min-height: 100vh; padding-bottom: 30px; }
.guide-banner { margin: 12px; background: #e8f0fb; border-left: 4px solid #4A7BBA; border-radius: 0 8px 8px 0; padding: 14px 16px; }
.guide-text { font-size: 13px; color: #3a5f8a; line-height: 1.7; display: block; }
.center { text-align: center; padding: 60px; color: #999; }
.instruction-page { padding: 32px 20px; min-height: 100vh; background: #f5f7fa; display: flex; flex-direction: column; }
.inst-title { font-size: 20px; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 20px; }
.inst-box { background: #fff; border-radius: 12px; padding: 20px; flex: 1; margin-bottom: 20px; }
.inst-text { font-size: 14px; color: #444; line-height: 1.9; display: block; white-space: pre-wrap; }
.inst-meta { display: flex; gap: 16px; font-size: 13px; color: #9BBCB4; margin-bottom: 24px; }
.btn-start { background: #4A8A7A; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 16px; font-weight: 600; width: 100%; }
.progress-bar { height: 4px; background: #e0e0e0; }
.progress-fill { height: 4px; background: #4A7BBA; transition: width 0.3s; }
.progress-text { text-align: right; padding: 8px 16px; font-size: 12px; color: #999; }
.question-card { margin: 12px; background: #fff; border-radius: 12px; padding: 24px 16px; }
.q-text { font-size: 16px; color: #333; line-height: 1.7; display: block; margin-bottom: 20px; }
.options { display: flex; flex-direction: column; gap: 10px; }
.option { padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; color: #333; }
.option.selected { border-color: #4A7BBA; background: #e8f0fb; color: #4A7BBA; }
.option.locked { opacity: 0.5; pointer-events: none; }
.nav-btns { margin: 16px; display: flex; gap: 12px; }
.btn-prev, .btn-next, .btn-submit { flex: 1; padding: 12px; border-radius: 8px; font-size: 15px; border: none; }
.btn-prev { background: #f0f0f0; color: #666; }
.btn-next, .btn-submit { background: #4A7BBA; color: #fff; }
.btn-next:disabled, .btn-submit:disabled { opacity: 0.5; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.login-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 200; }
.login-modal { background: #fff; border-radius: 16px; padding: 28px 24px; width: 82%; text-align: center; }
.lm-title { font-size: 18px; font-weight: 600; display: block; margin-bottom: 8px; }
.lm-desc { font-size: 13px; color: #666; display: block; margin-bottom: 20px; line-height: 1.6; }
.lm-btn-login { width: 100%; background: #4A7BBA; color: #fff; border-radius: 8px; padding: 12px; font-size: 15px; border: none; margin-bottom: 10px; }
.lm-btn-reg { width: 100%; background: #f0f0f0; color: #333; border-radius: 8px; padding: 12px; font-size: 15px; border: none; margin-bottom: 14px; }
.lm-skip { font-size: 13px; color: #999; cursor: pointer; display: block; }
.modal { background: #fff; border-radius: 16px; padding: 24px; width: 80%; }
.modal-title { font-size: 18px; font-weight: 600; display: block; margin-bottom: 8px; }
.modal-desc { font-size: 14px; color: #666; display: block; margin-bottom: 12px; }
.modal-price { font-size: 24px; color: #e65100; font-weight: 700; display: block; margin-bottom: 16px; }
.voucher-input { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; width: 100%; margin-bottom: 16px; font-size: 14px; }
.modal-btns { display: flex; gap: 10px; }
.btn-cancel, .btn-confirm, .btn-pay { flex: 1; padding: 10px; border-radius: 8px; font-size: 14px; border: none; }
.btn-cancel { background: #f0f0f0; color: #666; }
.btn-confirm { background: #4A7BBA; color: #fff; }
.btn-pay { background: #07c160; color: #fff; }
</style>
