<template>
  <view class="page">
    <view v-if="loading" class="center">加载中...</view>
    <view v-else>
      <view class="score-card">
        <text class="scale-name">{{scaleName}}</text>
        <text v-if="!isFunQuiz" class="score">{{displayScore}}</text>
        <text v-if="isLoggedIn" :class="['level', levelClass]">{{level}}</text>
        <text v-if="isLoggedIn && mbtiTypeName" class="mbti-name">{{mbtiTypeName}}</text>
        <text v-if="isLoggedIn && typeDesc" class="type-desc">{{typeDesc}}</text>
        <text v-if="!isLoggedIn" class="level lvl-locked" @click="goLogin()">登录查看结论 →</text>
        <text class="date">{{date}}</text>
      </view>

      <view v-if="orderedDimensions" class="dims-card">
        <text class="section-title">维度得分</text>
        <view v-for="(val, key) in orderedDimensions" :key="key" :class="['dim-item', mbtiWinners.has(key) ? 'dim-winner' : '', dimDetails[key]?.includes('重度') ? 'dim-severe' : dimDetails[key]?.includes('中度') ? 'dim-moderate' : '']">
          <view class="dim-row">
            <text class="dim-name">{{key}}</text>
            <text class="dim-val">{{typeof val === 'number' ? val.toFixed(0) : val}}</text>
          </view>
          <text v-if="dimDetails[key]" class="dim-detail">{{dimDetails[key]}}</text>
        </view>
      </view>

      <view class="detail-card">
        <text class="section-title">{{mbtiTypeName ? '职业建议' : '详细解析'}}</text>
        <view v-if="!isLoggedIn" class="blur-wrap">
          <text class="detail-text muted">登录后可查看分数含义及专业解读</text>
          <view class="login-row">
            <button class="btn-login" @click="goLogin()">登录</button>
            <button class="btn-register" @click="goRegister()">注册</button>
          </view>
        </view>
        <text v-else-if="detail" class="detail-text">{{detail}}</text>
        <text v-else class="detail-text muted">暂无解析内容</text>
      </view>

      <view v-if="hollandCareer && isLoggedIn" class="holland-card">
        <text class="section-title">职业参考（{{hollandCode}}型）</text>
        <text class="holland-text">{{hollandCareer}}</text>
      </view>

      <view v-if="showConsultant" class="consult-card">
        <text class="consult-text">您的测评结果提示某些方面值得关注，建议与专业咨询师进一步交流，获得个性化的支持与建议。</text>
        <button class="consult-btn" @click="goConsult()">预约专业咨询</button>
      </view>

      <view class="btns">
        <button class="btn-history" @click="goHistory()">历史记录</button>
        <button class="btn-retry" @click="goBack()">回到测评列表</button>
      </view>
    </view>
    <CrisisAlert ref="crisisRef" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';
import { useUserStore } from '../../store/user.js';
import CrisisAlert from '../../components/CrisisAlert.vue';

const store = useUserStore();
const isLoggedIn = computed(() => store.isLoggedIn());
const crisisRef = ref(null);

const loading = ref(true);
const isFunQuiz = ref(false);
const scoringRule = ref({});
const scaleName = ref('');
const displayScore = ref(0);
const level = ref('');
const detail = ref('');
const typeDesc = ref('');
const dimensions = ref(null);
const dimDetails = ref({});
const hasAbnormal = ref(false);
const date = ref('');

const MBTI_NAMES = {ISTJ:'内倾感觉思维判断',ISFJ:'内倾感觉情感判断',INFJ:'内倾直觉情感判断',INTJ:'内倾直觉思维判断',ISTP:'内倾感觉思维知觉',ISFP:'内倾感觉情感知觉',INFP:'内倾直觉情感知觉',INTP:'内倾直觉思维知觉',ESTP:'外倾感觉思维知觉',ESFP:'外倾感觉情感知觉',ENFP:'外倾直觉情感知觉',ENTP:'外倾直觉思维知觉',ESTJ:'外倾感觉思维判断',ESFJ:'外倾感觉情感判断',ENFJ:'外倾直觉情感判断',ENTJ:'外倾直觉思维判断'};
const mbtiTypeName = computed(() => MBTI_NAMES[level.value] || '');

const MBTI_DIM_ORDER = ['E','I','S','N','T','F','J','P'];
const MBTI_PAIRS = [['E','I'],['S','N'],['T','F'],['J','P']];

const orderedDimensions = computed(() => {
  if (!dimensions.value) return null;
  const keys = Object.keys(dimensions.value);
  const isMbti = keys.every(k => MBTI_DIM_ORDER.includes(k));
  if (!isMbti) return dimensions.value;
  return Object.fromEntries(MBTI_DIM_ORDER.filter(k => k in dimensions.value).map(k => [k, dimensions.value[k]]));
});

const mbtiWinners = computed(() => {
  if (!dimensions.value) return new Set();
  return new Set(MBTI_PAIRS.map(([a, b]) => {
    const va = dimensions.value[a] ?? 0, vb = dimensions.value[b] ?? 0;
    return va >= vb ? a : b;
  }));
});

// Holland
const hollandCode = computed(() => {
  if (!dimensions.value || !scoringRule.value?.careers) return '';
  return Object.entries(dimensions.value)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k[0])
    .join('');
});
const hollandCareer = computed(() => {
  const c = scoringRule.value?.careers;
  if (!c || !hollandCode.value) return '';
  const code = hollandCode.value;
  return c[code] || c[code.slice(0, 2)] || '';
});

const levelClass = computed(() => {
  if (level.value.includes('重度') || level.value.includes('重度')) return 'lvl-severe';
  if (level.value.includes('中度')) return 'lvl-moderate';
  if (level.value.includes('轻度') || level.value.includes('亚临床')) return 'lvl-mild';
  return 'lvl-none';
});

onMounted(async () => {
  const pages = getCurrentPages();
  const opts = pages[pages.length - 1]?.options || {};
  if (opts.crisis === '1') {
    setTimeout(() => crisisRef.value?.show(), 800); // 稍延迟，等结果渲染完
  }

  if (opts.resultId) {
    try {
      const r = await assessmentApi.getResult(opts.resultId);
      const rule = JSON.parse(r.scale?.scoringRule || '{}');
      scoringRule.value = rule;
      isFunQuiz.value = rule.method === 'direct' || rule.method === 'flow' || rule.method === 'mbti';
      scaleName.value = r.scale?.name || '';
      displayScore.value = r.totalScore;
      level.value = r.level;
      detail.value = r.detail || '';
      typeDesc.value = r.typeDesc || '';
      dimensions.value = r.dimensions ? JSON.parse(r.dimensions) : null;
      dimDetails.value = r.dimDetails || {};
      hasAbnormal.value = r.hasAbnormal || false;
      date.value = new Date(r.completedAt).toLocaleDateString('zh-CN');
    } catch {
      // fallback to URL params if result fetch fails
      displayScore.value = Number(opts.score) || 0;
      level.value = decodeURIComponent(opts.level || '');
    }
  } else {
    displayScore.value = opts.score || 0;
    level.value = decodeURIComponent(opts.level || '');
  }
  loading.value = false;
});

const showConsultant = computed(() =>
  hasAbnormal.value || level.value.includes('中度') || level.value.includes('重度')
);

function goBack() { uni.switchTab({ url: '/pages/assessment/index' }); }

function goConsult() {
  uni.switchTab({ url: '/pages/consultants/index' });
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/index' });
}

function goRegister() {
  uni.navigateTo({ url: '/pages/register/index' });
}

function goHistory() {
  if (!isLoggedIn.value) return goLogin();
  uni.navigateTo({ url: '/pages/assessment/results' });
}
</script>

<style scoped>
.page { background: #f5f7fa; min-height: 100vh; padding-bottom: 40px; }
.center { text-align: center; padding: 60px; color: #999; }

@keyframes revealUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.score-card { animation: revealUp 0.5s ease both; }
.dims-card  { animation: revealUp 0.5s ease 0.15s both; }
.detail-card { animation: revealUp 0.5s ease 0.28s both; }
.holland-card { animation: revealUp 0.5s ease 0.38s both; }
.consult-card { animation: revealUp 0.5s ease 0.45s both; }
.btns { animation: revealUp 0.5s ease 0.5s both; }

.score-card { background: linear-gradient(135deg, #4A7BBA, #5a9fd4); margin: 16px; border-radius: 16px; padding: 30px 20px; text-align: center; color: #fff; }
.scale-name { font-size: 14px; opacity: 0.85; display: block; margin-bottom: 16px; }
.score { font-size: 56px; font-weight: 700; display: block; }
.level { display: inline-block; padding: 4px 16px; border-radius: 20px; font-size: 14px; margin: 12px 0; }
.lvl-none { background: rgba(255,255,255,0.3); }
.lvl-mild { background: #fff3e0; color: #e65100; }
.lvl-moderate { background: #ffe0b2; color: #bf360c; }
.lvl-severe { background: #ffcdd2; color: #b71c1c; }
.mbti-name { font-size: 13px; opacity: 0.9; display: block; margin-top: 4px; }
.type-desc { font-size: 13px; opacity: 0.85; display: block; margin-top: 6px; text-align: left; white-space: pre-line; }
.date { font-size: 12px; opacity: 0.7; display: block; margin-top: 8px; }
.dims-card, .detail-card { background: #fff; margin: 12px 16px; border-radius: 12px; padding: 16px; }
.section-title { font-size: 15px; font-weight: 600; color: #333; display: block; margin-bottom: 12px; }
.dim-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.dim-item { margin-bottom: 4px; border-radius: 8px; }
.dim-moderate { background: #fff8e1; }
.dim-severe { background: #ffebee; }
.dim-winner { background: #e8f4fd; }
.dim-detail { font-size: 12px; color: #777; line-height: 1.6; display: block; padding: 6px 0 10px; border-bottom: 1px solid #f5f5f5; }
.dim-name { font-size: 14px; color: #555; }
.dim-val { font-size: 14px; color: #4A7BBA; font-weight: 600; }
.blur-wrap { text-align: center; padding: 20px 0; }
.login-row { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }
.btn-login { background: #4A7BBA; color: #fff; border-radius: 8px; padding: 10px 24px; font-size: 14px; border: none; }
.btn-register { background: #f0f0f0; color: #333; border-radius: 8px; padding: 10px 24px; font-size: 14px; border: none; }
.lvl-locked { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.85); font-size: 13px; cursor: pointer; }
.detail-text { font-size: 14px; color: #444; line-height: 1.8; display: block; }
.muted { color: #999; }
.consult-card { background: #fff8e1; margin: 12px 16px; border-radius: 12px; padding: 16px; border-left: 4px solid #f59e0b; }
.consult-text { font-size: 14px; color: #92400e; line-height: 1.6; display: block; margin-bottom: 12px; }
.consult-btn { background: #f59e0b; color: #fff; border-radius: 8px; padding: 10px; font-size: 14px; border: none; width: 100%; }
.btns { margin: 16px; margin-bottom: 32px; display: flex; gap: 12px; }
.btn-history, .btn-retry { flex: 1; padding: 12px; border-radius: 8px; font-size: 15px; border: none; }
.btn-history { background: #f0f0f0; color: #666; }
.btn-retry { background: #4A7BBA; color: #fff; }
.holland-card { background: #fff; margin: 12px 16px; border-radius: 12px; padding: 16px; border-left: 4px solid #4A7BBA; }
.holland-text { font-size: 13px; color: #444; line-height: 1.8; display: block; }
</style>
