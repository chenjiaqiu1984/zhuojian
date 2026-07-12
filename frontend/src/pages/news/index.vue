<template>
  <view class="page">

    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-glow hero-glow--b" />
      <view class="hero-content">
        <text class="hero-eyebrow">内容中心</text>
        <text class="hero-title">知识 · 洞见</text>
        <text class="hero-sub">心理科普与行业动态，助你探索内心</text>
      </view>
      <view class="hero-arc" />
    </view>

    <!-- Tabs -->
    <view class="tabs-wrap">
      <scroll-view scroll-x class="tabs-scroll">
        <view class="tabs">
          <view
            v-for="t in TAB_LIST"
            :key="t.key"
            :class="['tab', type === t.key && 'tab--active']"
            @click="switchTab(t.key)"
          >
            <text class="tab-label">{{ t.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="status-center">
      <text class="status-txt">加载中...</text>
    </view>

    <!-- List -->
    <view v-else-if="list.length" class="list">
      <view
        v-for="n in list"
        :key="n.id"
        class="card"
        @click="nav(n.id)"
      >
        <!-- Left: text content -->
        <view class="card-main">
          <view class="type-inline">
            <text class="type-inline-txt">{{ typeLabel(n.type) }}</text>
          </view>
          <text class="card-title">{{ n.title }}</text>
          <text v-if="n.summary" class="card-summary">{{ n.summary }}</text>
          <view class="card-footer">
            <text class="card-date">{{ fmt(n.createdAt) }}</text>
            <view class="action-bar">
              <!-- Like -->
              <view class="action-btn" @click.stop="toggleLike(n)">
                <view :class="['action-icon-wrap', n.isLiked && 'action-icon-wrap--liked']">
                  <view class="icon-like" />
                </view>
                <text :class="['action-num', n.isLiked && 'action-num--liked']">{{ n.likeCount || 0 }}</text>
              </view>
              <!-- Favorite -->
              <view class="action-btn" @click.stop="toggleFavorite(n)">
                <view :class="['action-icon-wrap', n.isFavorited && 'action-icon-wrap--fav']">
                  <view class="icon-star" />
                </view>
                <text :class="['action-num', n.isFavorited && 'action-num--fav']">{{ n.favoriteCount || 0 }}</text>
              </view>
              <!-- Share -->
              <view class="action-btn" @click.stop="share(n)">
                <view class="action-icon-wrap">
                  <view class="icon-share" />
                </view>
                <text class="action-num">分享</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Right: thumbnail (widthFix keeps original aspect ratio) -->
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
      <text class="empty-txt">{{ type === 'favorites' ? '还没有收藏的内容' : '暂无内容，敬请期待' }}</text>
    </view>

  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { newsApi } from '../../api/index';
import { track } from '../../utils/track';

const TAB_LIST = [
  { key: '', label: '全部' },
  { key: 'news', label: '新闻' },
  { key: 'psychology', label: '心理科普' },
  { key: 'favorites', label: '收藏' },
];

const TYPE_LABELS = {
  news: '新闻',
  activity: '活动',
  psychology: '心理科普',
  exam: '考级报名',
  training: '培训课程',
};

const list = ref([]);
const type = ref('');
const loading = ref(true);

function typeLabel(t) { return TYPE_LABELS[t] || '新闻'; }

async function load() {
  loading.value = true;
  try {
    if (type.value === 'favorites') {
      list.value = await newsApi.favorites();
    } else {
      const res = await newsApi.list(type.value ? { type: type.value } : {});
      list.value = res?.items || [];
    }
  } catch {
    list.value = [];
    if (type.value === 'favorites') uni.showToast({ title: '请先登录', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function switchTab(key) {
  type.value = key;
  load();
}

onMounted(() => { track('page_view', '/pages/news/index'); load(); });

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
}

function nav(id) {
  track('article_click', '/pages/news/index', { id });
  uni.navigateTo({ url: `/pages/news/detail?id=${id}` });
}

async function toggleLike(n) {
  try {
    const r = await newsApi.like(n.id);
    track('article_like', '/pages/news/index', { id: n.id, liked: r.isLiked });
    n.isLiked = r.isLiked;
    n.likeCount = r.likeCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

async function toggleFavorite(n) {
  try {
    const r = await newsApi.favorite(n.id);
    track('article_favorite', '/pages/news/index', { id: n.id, favorited: r.isFavorited });
    n.isFavorited = r.isFavorited;
    n.favoriteCount = r.favoriteCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

function share(n) {
  const url = `${window.location.origin}${window.location.pathname}#/pages/news/detail?id=${n.id}`;
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) });
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
$amber:      #E6A23C;
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

  &--active {
    border-bottom-color: $teal;
  }
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

/* Left content */
.card-main {
  flex: 1;
  min-width: 0;
}

/* Right thumbnail */
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
}

.type-inline-txt {
  font-size: 20rpx;
  font-weight: 700;
  color: $teal;
  letter-spacing: 0.04em;
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
}

.card-date {
  font-size: 22rpx;
  color: $muted;
}

/* Action bar */
.action-bar {
  display: flex;
  gap: 24rpx;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;

  &:active { opacity: 0.7; }
}

.action-icon-wrap {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #F2F6F5;
  display: flex;
  align-items: center;
  justify-content: center;

  &--liked { background: rgba(74,138,122,0.12); }
  &--fav   { background: rgba(230,162,60,0.12); }
}

.icon-like {
  width: 18rpx;
  height: 16rpx;
  border: 2rpx solid $muted;
  border-radius: 3rpx 3rpx 2rpx 2rpx;

  .action-icon-wrap--liked & { border-color: $teal; background: $teal; }
}

.icon-star {
  width: 18rpx;
  height: 18rpx;
  background: $muted;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);

  .action-icon-wrap--fav & { background: $amber; }
}

.icon-share {
  width: 16rpx;
  height: 16rpx;
  border: 2rpx solid $muted;
  border-radius: 50%;
}

.action-num {
  font-size: 20rpx;
  color: $muted;

  &--liked { color: $teal; font-weight: 600; }
  &--fav   { color: $amber; font-weight: 600; }
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
