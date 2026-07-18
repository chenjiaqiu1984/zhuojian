<template>
  <view class="page">

    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-glow hero-glow--b" />
      <view class="hero-content">
        <text class="hero-eyebrow">专业成长</text>
        <text class="hero-title">学习 · 进阶</text>
        <text class="hero-sub">考级报名与培训课程，助力专业技能提升</text>
      </view>
      <view class="hero-arc" />
    </view>

    <!-- Tabs -->
    <view class="tabs-wrap">
      <scroll-view scroll-x class="tabs-scroll">
        <view class="tabs">
          <view
            v-for="t in TAB_LIST"
            :key="t.value"
            :class="['tab', type === t.value && 'tab--active']"
            @click="switchTab(t.value)"
          >
            <text class="tab-label">{{ t.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="status-center">
      <view class="skeleton-list">
        <view v-for="i in 4" :key="i" class="skeleton-card">
          <view class="skeleton-main">
            <view class="skel skel-tag" />
            <view class="skel skel-title" />
            <view class="skel skel-title skel-title--short" />
            <view class="skel skel-body" />
            <view class="skel skel-date" />
          </view>
          <view class="skel skel-thumb" />
        </view>
      </view>
    </view>

    <!-- List -->
    <view v-else-if="list.length" class="list">
      <view
        v-for="n in list"
        :key="n.id"
        class="card"
        @click="nav(n.id)"
      >
        <view class="card-main">
          <view class="type-inline" :class="`type-inline--${n.type}`">
            <text class="type-inline-txt">{{ typeLabel(n.type) }}</text>
          </view>
          <text class="card-title">{{ n.title }}</text>
          <text v-if="n.summary" class="card-summary">{{ n.summary }}</text>
          <view class="card-footer">
            <text class="card-date">{{ fmt(n.createdAt) }}</text>
            <view v-if="n.endDate" :class="['deadline', isExpired(n.endDate) && 'deadline--expired']">
              <text class="deadline-txt">{{ deadlineLabel(n.endDate) }}</text>
            </view>
            <view v-else-if="n.type !== 'learning'" class="deadline deadline--open">
              <text class="deadline-txt">长期有效</text>
            </view>
          </view>
        </view>

        <image
          v-if="n.coverImage"
          class="card-thumb"
          :src="n.coverImage"
          mode="widthFix"
        />
      </view>
    </view>

    <!-- Empty -->
    <view v-else class="empty-box">
      <view class="empty-icon" />
      <text class="empty-txt">暂无内容，敬请期待</text>
    </view>

  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { newsApi } from '../../api/index';
import { track } from '../../utils/track';

const TAB_LIST = [
  { value: '', label: '全部' },
  { value: 'learning', label: '学习进阶' },
  { value: 'exam', label: '考级报名' },
  { value: 'training', label: '培训课程' },
];

const TYPE_LABELS = {
  learning: '学习进阶',
  exam: '考级报名',
  training: '培训课程',
};

const list = ref([]);
const type = ref('');
const loading = ref(true);

function typeLabel(t) { return TYPE_LABELS[t] || t; }

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
}

function isExpired(d) { return d && new Date(d) < new Date(); }

function deadlineLabel(d) {
  if (!d) return '';
  if (isExpired(d)) return '已截止';
  const dt = new Date(d);
  return `截止 ${dt.getMonth() + 1}月${dt.getDate()}日`;
}

async function load() {
  loading.value = true;
  try {
    if (type.value) {
      const res = await newsApi.list({ type: type.value });
      list.value = res?.items ?? [];
    } else {
      const [r1, r2, r3] = await Promise.all([
        newsApi.list({ type: 'learning' }),
        newsApi.list({ type: 'exam' }),
        newsApi.list({ type: 'training' }),
      ]);
      const items = (r) => r?.items ?? [];
      list.value = [...items(r1), ...items(r2), ...items(r3)]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (e) {
    console.error('[learning] load error', e);
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function switchTab(val) {
  type.value = val;
  load();
}

onMounted(() => {
  track('page_view', '/pages/learning/index');
  load();
});

function nav(id) {
  track('learning_click', '/pages/learning/index', { id });
  uni.navigateTo({ url: `/pages/news/detail?id=${id}` });
}
</script>

<style scoped lang="scss">
$teal:       #4A8A7A;
$teal-dark:  #3A6E80;
$teal-light: #EFF7F5;
$bg:         #F5F7F6;
$surface:    #ffffff;
$text-1:     #1C2A27;
$text-2:     #617870;
$muted:      #9BBCB4;
$border:     #E4EDEA;
$amber:      #E6A23C;
$amber-light:#FDF4E3;
$r-card:     20rpx;
$shadow:     0 4rpx 24rpx rgba(28,42,39,0.06);

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
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.68);
  margin-bottom: 24rpx;
}

.hero-title {
  display: block;
  font-size: 68rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.12em;
  line-height: 1.15;
  margin-bottom: 22rpx;
  font-family: "Noto Serif SC", serif;
}

.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.78);
  line-height: 1.85;
  letter-spacing: 0.04em;
}

.hero-arc {
  position: absolute;
  bottom: -2rpx;
  left: 0; right: 0;
  height: 48rpx;
  background: $bg;
  border-radius: 48rpx 48rpx 0 0;
}

/* ── Tabs ─────────────────────────────────────────────────────── */
.tabs-wrap {
  background: $surface;
  border-bottom: 1rpx solid $border;
  box-shadow: 0 2rpx 10rpx rgba(28,42,39,0.04);
}

.tabs-scroll { width: 100%; }

.tabs {
  display: inline-flex;
  padding: 0 16rpx;
}

.tab {
  padding: 26rpx 28rpx;
  border-bottom: 3rpx solid transparent;
  flex-shrink: 0;

  &--active { border-bottom-color: $teal; }
}

.tab-label {
  font-size: 28rpx;
  font-weight: 500;
  color: $muted;

  .tab--active & {
    color: $teal;
    font-weight: 700;
  }
}

/* ── Card list ────────────────────────────────────────────────── */
.list { padding: 24rpx 24rpx 0; }

.card {
  background: $surface;
  border-radius: $r-card;
  border: 1rpx solid $border;
  box-shadow: $shadow;
  margin-bottom: 24rpx;
  padding: 28rpx 28rpx 20rpx;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20rpx;

  &:active { transform: scale(0.99); opacity: 0.96; }
}

.card-main { flex: 1; min-width: 0; }

.card-thumb {
  width: 160rpx;
  flex-shrink: 0;
  border-radius: 12rpx;
  display: block;
}

/* Type tag */
.type-inline {
  display: inline-flex;
  background: $teal-light;
  border-radius: 8rpx;
  padding: 4rpx 16rpx;
  margin-bottom: 12rpx;

  &--exam    { background: rgba(74,123,186,0.10); }
  &--training { background: $amber-light; }
}

.type-inline-txt {
  font-size: 20rpx;
  font-weight: 700;
  color: $teal;
  letter-spacing: 0.04em;

  .type-inline--exam &    { color: #4A7BBA; }
  .type-inline--training & { color: $amber; }
}

/* Card content */
.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
  line-height: 1.5;
  letter-spacing: 0.01em;
  margin-bottom: 10rpx;
}

.card-summary {
  display: block;
  font-size: 24rpx;
  color: $text-2;
  line-height: 1.7;
  margin-bottom: 16rpx;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14rpx;
  border-top: 1rpx solid $border;
  gap: 12rpx;
}

.card-date {
  font-size: 22rpx;
  color: $muted;
  flex: 1;
}

/* Deadline badge */
.deadline {
  background: $amber-light;
  border-radius: 8rpx;
  padding: 4rpx 14rpx;
  flex-shrink: 0;

  &--open    { background: $teal-light; }
  &--expired { background: #F2F5F4; }
}

.deadline-txt {
  font-size: 20rpx;
  font-weight: 600;
  color: $amber;
  letter-spacing: 0.02em;

  .deadline--open &    { color: $muted; }
  .deadline--expired & { color: $muted; text-decoration: line-through; }
}

/* ── Skeleton loading ─────────────────────────────────────────── */
.skeleton-list { padding: 24rpx 24rpx 0; }

.skeleton-card {
  background: $surface;
  border-radius: $r-card;
  border: 1rpx solid $border;
  margin-bottom: 24rpx;
  padding: 28rpx;
  display: flex;
  gap: 20rpx;
}

.skeleton-main { flex: 1; min-width: 0; }

.skel {
  background: linear-gradient(90deg, #EEF1EF 25%, #E4EDEA 50%, #EEF1EF 75%);
  background-size: 200% 100%;
  border-radius: 8rpx;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skel-tag   { height: 28rpx; width: 120rpx; margin-bottom: 16rpx; }
.skel-title { height: 32rpx; width: 90%;    margin-bottom: 10rpx; }
.skel-title--short { width: 60%; }
.skel-body  { height: 24rpx; width: 80%;    margin-bottom: 20rpx; }
.skel-date  { height: 22rpx; width: 140rpx; }
.skel-thumb { width: 160rpx; height: 120rpx; border-radius: 12rpx; flex-shrink: 0; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── States ───────────────────────────────────────────────────── */
.status-center { text-align: center; padding: 100rpx 0; }
.status-txt { font-size: 28rpx; color: $muted; }

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 28rpx;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $border;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 44rpx;
    height: 44rpx;
    border: 4rpx solid $muted;
    border-radius: 50%;
  }
}

.empty-txt {
  font-size: 28rpx;
  color: $muted;
  letter-spacing: 0.04em;
}
</style>
