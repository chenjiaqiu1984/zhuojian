<template>
  <view class="page">
    <view v-if="loading" class="status-center"><text class="status-txt">加载中...</text></view>
    <view v-else>

      <!-- Score Card (Hero) -->
      <view class="score-hero">
        <view class="score-hero-glow" />
        <view class="score-hero-content">
          <text class="scale-label">{{ scaleName }}</text>
          <text v-if="!isFunQuiz" class="score-num">{{ displayScore }}</text>
          <view v-if="isLoggedIn && level" :class="['level-badge', levelClass]">
            <text class="level-txt">{{ level }}</text>
          </view>
          <text v-if="isLoggedIn && mbtiTypeName" class="mbti-name">{{ mbtiTypeName }}</text>
          <text v-if="isLoggedIn && typeDesc" class="type-desc">{{ typeDesc }}</text>
          <text v-if="!isLoggedIn" class="level-locked" @click="goLogin()">登录查看结论</text>
          <text class="score-date">{{ date }}</text>
        </view>
      </view>

      <!-- Dimensions -->
      <view v-if="orderedDimensions" class="card">
        <view class="sec-header">
          <view class="sec-bar" />
          <text class="sec-title">维度得分</text>
        </view>
        <view class="dim-list">
          <view
            v-for="(val, key) in orderedDimensions"
            :key="key"
            :class="['dim-item', mbtiWinners.has(key) ? 'dim-winner' : '', dimDetails[key]?.includes('重度') ? 'dim-severe' : dimDetails[key]?.includes('中度') ? 'dim-moderate' : '']"
          >
            <view class="dim-row">
              <text class="dim-name">{{ key }}</text>
              <view class="dim-bar-wrap">
                <view class="dim-bar-track">
                  <view
                    class="dim-bar-fill"
                    :style="{ width: dimBarWidth(val), background: dimBarColor(key) }"
                  ></view>
                </view>
                <text class="dim-val">{{ typeof val === 'number' ? val.toFixed(0) : val }}</text>
              </view>
            </view>
            <text v-if="dimDetails[key]" class="dim-detail">{{ dimDetails[key] }}</text>
          </view>
        </view>
      </view>

      <!-- Detail / Career -->
      <view class="card">
        <view class="sec-header">
          <view class="sec-bar" />
          <text class="sec-title">{{ mbtiTypeName ? '职业建议' : '详细解析' }}</text>
        </view>
        <view v-if="!isLoggedIn" class="login-prompt">
          <text class="login-hint">登录后可查看分数含义及专业解读</text>
          <view class="login-btns">
            <button class="btn-primary" @click="goLogin()">登录</button>
            <button class="btn-secondary" @click="goRegister()">注册</button>
          </view>
        </view>
        <text v-else-if="detail" class="detail-text">{{ detail }}</text>
        <text v-else class="detail-text muted">暂无解析内容</text>
      </view>

      <!-- Holland Career -->
      <view v-if="hollandCareer && isLoggedIn" class="card card-accent">
        <view class="sec-header">
          <view class="sec-bar" />
          <text class="sec-title">职业参考（{{ hollandCode }} 型）</text>
        </view>
        <text class="detail-text">{{ hollandCareer }}</text>
      </view>

      <!-- Consult -->
      <view v-if="showConsultant" class="consult-card">
        <view class="consult-icon-wrap">
          <text class="consult-icon">咨</text>
        </view>
        <view class="consult-body">
          <text class="consult-title">建议专业支持</text>
          <text class="consult-text">您的测评结果提示某些方面值得关注，建议与专业咨询师进一步交流，获得个性化的支持与建议。</text>
          <button class="consult-btn" @click="goConsult()">预约专业咨询</button>
        </view>
      </view>

      <!-- Actions -->
      <view class="action-row">
        <button class="btn-secondary" @click="goHistory()">历史记录</button>
        <button class="btn-primary" @click="goBack()">返回列表</button>
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

// #ifndef H5
defineOptions({
  onShareAppMessage() {
    const pages = getCurrentPages();
    const name = pages[pages.length - 1]?.$vm?.scaleName;
    const title = name
      ? `我完成了「${name}」测评，快来试试`
      : '我完成了一项心理测评，快来试试';
    return { title, path: `/pages/assessment/index` };
  },
  onShareTimeline() {
    const pages = getCurrentPages();
    const name = pages[pages.length - 1]?.$vm?.scaleName;
    const title = name
      ? `我完成了「${name}」测评 — 卓见心理`
      : '卓见心理测评 — 了解真实的自己';
    return { title };
  },
});
// #endif

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

const maxDimVal = computed(() => {
  if (!dimensions.value) return 1;
  const vals = Object.values(dimensions.value).filter(v => typeof v === 'number');
  return Math.max(...vals, 1);
});

function dimBarWidth(val) {
  if (typeof val !== 'number') return '20%';
  return Math.max(Math.min((val / maxDimVal.value) * 100, 100), 4) + '%';
}

function dimBarColor(key) {
  if (mbtiWinners.value.has(key)) return '#4A8A7A';
  return '#9BBCB4';
}

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
  if (level.value.includes('重度')) return 'lvl-severe';
  if (level.value.includes('中度')) return 'lvl-moderate';
  if (level.value.includes('轻度') || level.value.includes('亚临床')) return 'lvl-mild';
  return 'lvl-none';
});

onMounted(async () => {
  const pages = getCurrentPages();
  const opts = pages[pages.length - 1]?.options || {};
  if (opts.crisis === '1') {
    setTimeout(() => crisisRef.value?.show(), 800);
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
function goConsult() { uni.switchTab({ url: '/pages/consultants/index' }); }
function goLogin() { uni.navigateTo({ url: '/pages/login/index' }); }
function goRegister() { uni.navigateTo({ url: '/pages/register/index' }); }
function goHistory() {
  if (!isLoggedIn.value) return goLogin();
  uni.navigateTo({ url: '/pages/assessment/results' });
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

@keyframes revealUp {
  from { opacity: 0; transform: translateY(32rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

.page {
  background: $bg;
  min-height: 100vh;
  padding-bottom: 80rpx;
}
.status-center { text-align: center; padding: 120rpx 0; }
.status-txt { font-size: 28rpx; color: $muted; }

/* Score hero */
.score-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, $teal 0%, $teal-dark 100%);
  padding: 80rpx 48rpx 64rpx;
  text-align: center;
  animation: revealUp 0.5s ease both;
}
.score-hero-glow {
  position: absolute;
  top: -140rpx;
  right: -100rpx;
  width: 500rpx;
  height: 440rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, transparent 66%);
  pointer-events: none;
}
.score-hero-content { position: relative; z-index: 1; }
.scale-label {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.06em;
  margin-bottom: 24rpx;
}
.score-num {
  display: block;
  font-size: 120rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 24rpx;
  letter-spacing: -0.02em;
}
.level-badge {
  display: inline-block;
  padding: 8rpx 32rpx;
  border-radius: 32rpx;
  margin-bottom: 16rpx;
  &.lvl-none { background: rgba(255,255,255,0.25); }
  &.lvl-mild { background: rgba(255,243,224,0.9); }
  &.lvl-moderate { background: rgba(255,224,178,0.9); }
  &.lvl-severe { background: rgba(255,205,210,0.9); }
}
.level-txt {
  font-size: 26rpx;
  font-weight: 600;
  .lvl-none & { color: rgba(255,255,255,0.95); }
  .lvl-mild & { color: #E65100; }
  .lvl-moderate & { color: #BF360C; }
  .lvl-severe & { color: #B71C1C; }
}
.mbti-name {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.85);
  margin-top: 8rpx;
}
.type-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.78);
  margin-top: 12rpx;
  text-align: left;
  white-space: pre-line;
  line-height: 1.8;
}
.level-locked {
  display: inline-block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.18);
  padding: 10rpx 32rpx;
  border-radius: 32rpx;
  margin-bottom: 16rpx;
}
.score-date {
  display: block;
  font-size: 22rpx;
  color: rgba(255,255,255,0.55);
  margin-top: 16rpx;
}

/* Cards */
.card {
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  box-shadow: $card-shadow;
  margin: 24rpx 28rpx 0;
  padding: 36rpx 32rpx;
  animation: revealUp 0.5s ease 0.1s both;
  &:nth-child(3) { animation-delay: 0.2s; }
  &:nth-child(4) { animation-delay: 0.3s; }
}
.card-accent { border-left: 6rpx solid $teal; }

.sec-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.sec-bar {
  width: 6rpx;
  height: 30rpx;
  border-radius: 4rpx;
  background: $teal;
  flex-shrink: 0;
}
.sec-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-1;
  letter-spacing: 0.04em;
  font-family: "Noto Serif SC", serif;
}

/* Dimensions */
.dim-list { display: flex; flex-direction: column; gap: 4rpx; }
.dim-item {
  padding: 16rpx 12rpx;
  border-radius: 12rpx;
  &.dim-winner { background: rgba(74,138,122,0.06); }
  &.dim-moderate { background: rgba(255,180,80,0.08); }
  &.dim-severe { background: rgba(220,80,80,0.07); }
}
.dim-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.dim-name {
  font-size: 26rpx;
  color: $text-2;
  width: 80rpx;
  flex-shrink: 0;
}
.dim-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.dim-bar-track {
  flex: 1;
  height: 10rpx;
  background: $border;
  border-radius: 6rpx;
  overflow: hidden;
}
.dim-bar-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.6s ease;
}
.dim-val {
  font-size: 26rpx;
  color: $teal;
  font-weight: 600;
  width: 60rpx;
  text-align: right;
  flex-shrink: 0;
}
.dim-detail {
  display: block;
  font-size: 22rpx;
  color: $muted;
  line-height: 1.6;
  padding: 10rpx 12rpx 4rpx;
}

/* Detail */
.detail-text {
  display: block;
  font-size: 28rpx;
  color: $text-2;
  line-height: 1.9;
  &.muted { color: $muted; }
}
.login-prompt { text-align: center; padding: 16rpx 0; }
.login-hint { display: block; font-size: 26rpx; color: $muted; margin-bottom: 32rpx; line-height: 1.7; }
.login-btns { display: flex; gap: 24rpx; justify-content: center; }
.btn-primary {
  padding: 0 60rpx;
  height: 80rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  background: $teal;
  color: #fff;
  flex: 1;
}
.btn-secondary {
  padding: 0 60rpx;
  height: 80rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  border: 1rpx solid $border;
  background: #fff;
  color: $text-2;
  flex: 1;
}

/* Consult card */
.consult-card {
  margin: 24rpx 28rpx 0;
  background: #FFF8EC;
  border-radius: $card-r;
  border: 1rpx solid #FFE8B0;
  padding: 36rpx 32rpx;
  display: flex;
  gap: 28rpx;
  align-items: flex-start;
  animation: revealUp 0.5s ease 0.38s both;
}
.consult-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #F59E0B;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.consult-icon { font-size: 28rpx; color: #fff; font-weight: 700; }
.consult-body { flex: 1; }
.consult-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #92400E;
  margin-bottom: 12rpx;
  font-family: "Noto Serif SC", serif;
}
.consult-text {
  display: block;
  font-size: 24rpx;
  color: #A0602A;
  line-height: 1.75;
  margin-bottom: 24rpx;
}
.consult-btn {
  height: 72rpx;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  border: none;
  background: #F59E0B;
  color: #fff;
  width: 100%;
}

/* Actions */
.action-row {
  margin: 28rpx 28rpx 0;
  display: flex;
  gap: 20rpx;
  animation: revealUp 0.5s ease 0.46s both;
}
</style>
