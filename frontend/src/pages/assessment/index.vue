<template>
  <view class="page">

    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-glow hero-glow--b" />
      <view class="hero-content">
        <text class="hero-eyebrow">心理测评中心</text>
        <text class="hero-title">了解自己</text>
        <text class="hero-sub">让测评成为认识自己的镜子</text>
      </view>
      <view class="hero-arc" />
    </view>

    <!-- Recommended -->
    <view v-if="topScales.length" class="section">
      <view class="sec-header">
        <view class="sec-bar" />
        <text class="sec-title">热门推荐</text>
      </view>
      <scroll-view scroll-x class="top-scroll">
        <view class="top-list">
          <view
            v-for="(s, i) in topScales"
            :key="s.id"
            class="top-card"
            :style="{ background: TOP_GRADS[i % TOP_GRADS.length] }"
            @click="go(s)"
          >
            <view class="top-card-inner">
              <text class="top-name">{{ s.name }}</text>
              <view class="top-footer">
                <text class="top-meta">{{ s.totalQuestions }}题 · {{ s.estimatedMinutes }}分钟</text>
                <view class="top-count-pill">
                  <text class="top-count-txt">{{ s.usageCount }}次</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Search -->
    <view class="search-wrap">
      <view class="search-bar">
        <text class="search-icon">&#xe621;</text>
        <input
          :value="keyword"
          @input="keyword = $event.detail.value"
          placeholder="搜索量表名称..."
          placeholder-class="ph"
        />
      </view>
    </view>

    <!-- Scenario chips -->
    <scroll-view v-if="allScenarios.length" scroll-x class="chip-bar">
      <view class="chip-list">
        <view :class="['chip', !activeScenario && 'chip--active']" @click="activeScenario=''">全部</view>
        <view
          v-for="t in allScenarios"
          :key="t"
          :class="['chip', activeScenario === t && 'chip--active']"
          @click="activeScenario = t"
        >{{ t }}</view>
      </view>
    </scroll-view>

    <!-- Tabs -->
    <view class="tabs-wrap">
      <scroll-view scroll-x class="tabs-scroll">
        <view class="tabs">
          <view
            v-for="t in tabs"
            :key="t.key"
            :class="['tab', activeTab === t.key && 'tab--active']"
            @click="activeTab = t.key"
          >
            <text class="tab-label">{{ t.label }}</text>
            <text class="tab-count">{{ t.count }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- List -->
    <view v-if="loading" class="status-center"><text class="status-txt">加载中...</text></view>
    <view v-else class="list">
      <view
        v-for="s in filtered"
        :key="s.id"
        class="card"
        @click="go(s)"
      >
        <!-- Category accent line -->
        <view class="card-accent" :style="{ background: catColor(s.category) }" />

        <view class="card-body">
          <view class="card-top">
            <text class="card-name">{{ s.name }}</text>
            <view class="card-right">
              <!-- Fav -->
              <view :class="['fav-btn', favoriteIds.has(s.id) && 'fav-btn--on']" @click.stop="toggleFav(s.id)">
                <view class="fav-star" />
              </view>
              <!-- Badge -->
              <view :class="['badge', s.isPaid ? 'badge--paid' : 'badge--free']">
                <text class="badge-txt">{{ s.isPaid ? '付费' : '免费' }}</text>
              </view>
            </view>
          </view>

          <text v-if="s.description" class="card-desc">{{ s.description }}</text>

          <view v-if="parsedScenarios(s).length" class="s-tags">
            <view
              v-for="t in parsedScenarios(s)"
              :key="t"
              class="s-tag"
              :style="{ color: catColor(s.category), background: catLight(s.category) }"
            >
              <text class="s-tag-txt">{{ t }}</text>
            </view>
          </view>

          <view class="card-meta">
            <view class="meta-group">
              <text class="meta-txt">{{ s.totalQuestions }}题</text>
              <view class="meta-dot" />
              <text class="meta-txt">{{ s.estimatedMinutes }}分钟</text>
              <view class="meta-dot" />
              <text class="meta-txt">{{ s.usageCount }}次</text>
            </view>
            <text v-if="s.isPaid" class="meta-price">¥{{ (s.price / 100).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <view v-if="!filtered.length" class="status-center">
        <text class="status-txt">暂无相关测评</text>
      </view>
    </view>

  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';
import { useUserStore } from '../../store/user.js';
import { track } from '../../utils/track.js';

const TOP_GRADS = [
  'linear-gradient(135deg, #4A8A7A, #3A6E80)',
  'linear-gradient(135deg, #3A6E80, #4A7BBA)',
  'linear-gradient(135deg, #4A7BBA, #7A68BE)',
  'linear-gradient(135deg, #3A8070, #2A6070)',
  'linear-gradient(135deg, #6A8070, #4A8A7A)',
];

const CAT = {
  clinical:    { border: '#4A7BBA', light: '#EBF2FF' },
  personality: { border: '#8468BE', light: '#F0EBFF' },
  children:    { border: '#4A8A7A', light: '#E6F5F0' },
  diagnostic:  { border: '#3A6E80', light: '#E4EDF2' },
  psychiatric: { border: '#B85C78', light: '#FFECF0' },
  fun:         { border: '#D8693A', light: '#FFF1EC' },
};

const CATEGORY_LABELS = {
  all: '全部', children: '儿童类', clinical: '临床类',
  diagnostic: '诊断类', personality: '人格类', psychiatric: '精神科', fun: '趣味',
};

const store = useUserStore();
const activeTab = ref('all');
const activeScenario = ref('');
const keyword = ref('');
const scales = ref([]);
const favoriteIds = ref(new Set());
const loading = ref(true);

function catColor(cat) { return (CAT[cat] || CAT.clinical).border; }
function catLight(cat) { return (CAT[cat] || CAT.clinical).light; }
function parsedScenarios(s) {
  try { return JSON.parse(s.scenarios || '[]'); } catch { return []; }
}

const allScenarios = computed(() => {
  const set = new Set();
  scales.value.forEach(s => parsedScenarios(s).forEach(t => set.add(t)));
  return [...set];
});

const topScales = computed(() =>
  [...scales.value].filter(s => s.usageCount > 0).sort((a, b) => b.usageCount - a.usageCount).slice(0, 5)
);

const tabs = computed(() => {
  const usage = {};
  const counts = {};
  scales.value.forEach(s => {
    counts[s.category] = (counts[s.category] || 0) + 1;
    usage[s.category] = (usage[s.category] || 0) + (s.usageCount || 0);
  });
  const cats = Object.keys(counts).sort((a, b) => (usage[b] || 0) - (usage[a] || 0));
  return [
    { key: 'all', label: '全部', count: scales.value.length },
    ...cats.map(k => ({ key: k, label: CATEGORY_LABELS[k] || k, count: counts[k] })),
  ];
});

const filtered = computed(() => {
  let list = scales.value;
  if (activeTab.value !== 'all') list = list.filter(s => s.category === activeTab.value);
  if (activeScenario.value) list = list.filter(s => parsedScenarios(s).includes(activeScenario.value));
  if (keyword.value.trim()) list = list.filter(s => s.name.includes(keyword.value.trim()));
  return list;
});

onMounted(async () => {
  track('page_view', '/pages/assessment/index');
  try { scales.value = await assessmentApi.getScales(); } catch {}
  if (store.isLoggedIn()) {
    const ids = await assessmentApi.getFavorites().catch(() => []);
    favoriteIds.value = new Set(ids);
  }
  loading.value = false;
});

async function go(s) {
  track('scale_click', '/pages/assessment/index', { id: s.id, name: s.name });
  assessmentApi.trackScale(s.id).catch(() => {});
  uni.navigateTo({ url: `/pages/assessment/detail?id=${s.id}` });
}

async function toggleFav(id) {
  if (!store.isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  const res = await assessmentApi.toggleFavorite(id);
  track('scale_favorite', '/pages/assessment/index', { id, favorited: res.favorited });
  const next = new Set(favoriteIds.value);
  res.favorited ? next.add(id) : next.delete(id);
  favoriteIds.value = next;
}
</script>

<style scoped lang="scss">
$teal:       #4A8A7A;
$teal-dark:  #3A6E80;
$teal-light: #EFF7F5;
$bg:         #F2F5F4;
$surface:    #ffffff;
$text-1:     #1C2A27;
$text-2:     #617870;
$muted:      #9BBCB4;
$border:     #E4EDEA;
$r-card:     24rpx;
$shadow-card: 0 4rpx 24rpx rgba(28,42,39,0.06);

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 80rpx;
}

/* ── Hero ─────────────────────────────────────────────────────── */
.hero {
  position: relative;
  padding: 88rpx 48rpx 96rpx;
  overflow: hidden;
  background: linear-gradient(140deg, $teal 0%, $teal-dark 100%);
}

.hero-glow {
  position: absolute;
  top: -160rpx;
  right: -100rpx;
  width: 560rpx;
  height: 480rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 65%);
  pointer-events: none;

  &--b {
    top: auto;
    bottom: -200rpx;
    left: -140rpx;
    right: auto;
    width: 400rpx;
    height: 360rpx;
    background: radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 65%);
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.34em;
  color: rgba(255,255,255,0.68);
  margin-bottom: 24rpx;
  text-transform: uppercase;
}

.hero-title {
  display: block;
  font-size: 68rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.12em;
  line-height: 1.15;
  margin-bottom: 22rpx;
}

.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.78);
  line-height: 1.85;
  letter-spacing: 0.04em;
}

/* Arc separator */
.hero-arc {
  position: absolute;
  bottom: -2rpx;
  left: 0; right: 0;
  height: 48rpx;
  background: $bg;
  border-radius: 48rpx 48rpx 0 0;
}

/* ── Section header ───────────────────────────────────────────── */
.section { padding: 44rpx 28rpx 0; }

.sec-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.sec-bar {
  width: 6rpx;
  height: 30rpx;
  border-radius: 4rpx;
  background: $teal;
  flex-shrink: 0;
}

.sec-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
  letter-spacing: 0.03em;
}

/* ── Top scroll cards ─────────────────────────────────────────── */
.top-scroll { width: 100%; }
.top-list { display: inline-flex; gap: 20rpx; padding-bottom: 8rpx; }

.top-card {
  width: 280rpx;
  height: 172rpx;
  border-radius: $r-card;
  flex-shrink: 0;
  overflow: hidden;
  position: relative;

  &:active { transform: scale(0.97); opacity: 0.92; }
}

.top-card-inner {
  position: absolute;
  inset: 0;
  padding: 28rpx 28rpx 26rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.18) 100%);
}

.top-name {
  font-size: 29rpx;
  font-weight: 700;
  color: rgba(255,255,255,0.97);
  line-height: 1.45;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.top-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.top-meta {
  font-size: 21rpx;
  color: rgba(255,255,255,0.72);
}

.top-count-pill {
  background: rgba(255,255,255,0.2);
  border-radius: 20rpx;
  padding: 4rpx 14rpx;
}

.top-count-txt {
  font-size: 19rpx;
  color: rgba(255,255,255,0.9);
  font-weight: 600;
}

/* ── Search ───────────────────────────────────────────────────── */
.search-wrap { padding: 28rpx 28rpx 0; }

.search-bar {
  background: $surface;
  border-radius: 44rpx;
  padding: 0 32rpx;
  border: 1rpx solid $border;
  box-shadow: $shadow-card;
  display: flex;
  align-items: center;
  gap: 16rpx;

  input {
    flex: 1;
    height: 80rpx;
    font-size: 28rpx;
    color: $text-1;
    background: transparent;
    border: none;
  }
}

.search-icon {
  font-size: 32rpx;
  color: $muted;
  flex-shrink: 0;
}

.ph { color: $muted; }

/* ── Scenario chips ───────────────────────────────────────────── */
.chip-bar { padding: 24rpx 28rpx 0; }
.chip-list { display: inline-flex; gap: 14rpx; padding-bottom: 4rpx; }

.chip {
  font-size: 24rpx;
  font-weight: 500;
  padding: 10rpx 28rpx;
  border-radius: 32rpx;
  background: $surface;
  color: $text-2;
  white-space: nowrap;
  border: 1rpx solid $border;
  flex-shrink: 0;

  &--active {
    background: $teal;
    color: #fff;
    border-color: $teal;
    font-weight: 600;
  }

  &:active { opacity: 0.8; }
}

/* ── Tabs ─────────────────────────────────────────────────────── */
.tabs-wrap {
  background: $surface;
  margin-top: 28rpx;
  border-bottom: 1rpx solid $border;
  box-shadow: 0 2rpx 10rpx rgba(28,42,39,0.04);
}

.tabs-scroll { width: 100%; }

.tabs {
  display: inline-flex;
  padding: 0 16rpx;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 26rpx 22rpx;
  border-bottom: 3rpx solid transparent;
  flex-shrink: 0;

  &--active {
    border-bottom-color: $teal;
  }
}

.tab-label {
  font-size: 27rpx;
  font-weight: 500;
  color: $text-2;

  .tab--active & {
    color: $teal;
    font-weight: 700;
  }
}

.tab-count {
  font-size: 19rpx;
  background: #EEF5F2;
  color: $muted;
  padding: 2rpx 10rpx;
  border-radius: 16rpx;

  .tab--active & {
    background: rgba(74,138,122,0.13);
    color: $teal;
  }
}

/* ── Card list ────────────────────────────────────────────────── */
.list { padding: 24rpx 28rpx; }

.card {
  background: $surface;
  border-radius: $r-card;
  border: 1rpx solid $border;
  box-shadow: $shadow-card;
  margin-bottom: 24rpx;
  overflow: hidden;
  position: relative;

  &:active { transform: scale(0.99); opacity: 0.96; }
}

/* Thin category accent line at top */
.card-accent {
  height: 4rpx;
  width: 100%;
}

.card-body {
  padding: 28rpx 30rpx 28rpx;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14rpx;
}

.card-name {
  font-size: 33rpx;
  font-weight: 700;
  color: $text-1;
  flex: 1;
  padding-right: 16rpx;
  line-height: 1.45;
  letter-spacing: 0.02em;
}

.card-right {
  display: flex;
  gap: 14rpx;
  align-items: center;
  flex-shrink: 0;
  padding-top: 4rpx;
}

/* Fav button */
.fav-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #F2F6F5;

  &--on {
    background: #FFF6E8;
    .fav-star { background: #F5A623; }
  }
}

.fav-star {
  width: 24rpx;
  height: 24rpx;
  background: #C8D8D2;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

/* Badge */
.badge {
  display: flex;
  align-items: center;
  padding: 5rpx 18rpx;
  border-radius: 20rpx;
}

.badge-txt {
  font-size: 20rpx;
  font-weight: 600;
}

.badge--free {
  background: $teal-light;
  .badge-txt { color: $teal; }
}

.badge--paid {
  background: #FFF1EC;
  .badge-txt { color: #D8693A; }
}

/* Card content */
.card-desc {
  display: block;
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.8;
  margin-bottom: 16rpx;
}

.s-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.s-tag {
  display: flex;
  align-items: center;
  border-radius: 12rpx;
  padding: 5rpx 16rpx;
}

.s-tag-txt {
  font-size: 20rpx;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Card meta footer */
.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16rpx;
  border-top: 1rpx solid $border;
  margin-top: 4rpx;
}

.meta-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.meta-txt {
  font-size: 22rpx;
  color: $muted;
}

.meta-dot {
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: #C8D8D2;
  flex-shrink: 0;
}

.meta-price {
  font-size: 26rpx;
  color: #D8693A;
  font-weight: 700;
}

/* States */
.status-center { text-align: center; padding: 100rpx 0; }
.status-txt { font-size: 28rpx; color: $muted; }
</style>
