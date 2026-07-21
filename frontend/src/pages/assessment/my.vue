<template>
  <view class="page">

    <!-- Pushed -->
    <view class="section">
      <view class="sec-header">
        <view class="sec-bar" />
        <text class="sec-title">推送给我的测评</text>
      </view>
      <view v-if="pushed.length">
        <view v-for="s in pushed" :key="s.id" class="card pushed-card" @click="go(s)">
          <view class="card-top">
            <text class="card-name">{{ s.name }}</text>
            <view v-if="s.expiresAt" class="expire-badge">
              <text class="expire-txt">{{ fmt(s.expiresAt) }}截止</text>
            </view>
          </view>
          <text class="card-meta">{{ s.totalQuestions }}题 · 约{{ s.estimatedMinutes }}分钟</text>
          <view class="btn-go">
            <text class="btn-go-txt">开始测评</text>
            <text class="btn-go-arrow">›</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-wrap">
        <text class="empty-txt">暂无推送测评</text>
      </view>
    </view>

    <!-- Favorites -->
    <view class="section">
      <view class="sec-header">
        <view class="sec-bar" />
        <text class="sec-title">我的收藏</text>
      </view>
      <view v-if="favorites.length">
        <view v-for="s in favorites" :key="s.id" class="card" @click="go(s)">
          <view class="card-top">
            <text class="card-name">{{ s.name }}</text>
            <text class="fav-icon">★</text>
          </view>
          <text class="card-meta">{{ s.totalQuestions }}题 · 约{{ s.estimatedMinutes }}分钟</text>
        </view>
      </view>
      <view v-else class="empty-wrap">
        <text class="empty-txt">暂无收藏测评</text>
      </view>
    </view>

  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('assessment/my'));
// #endif

import { ref, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';
import { useUserStore } from '../../store/user.js';

const store = useUserStore();
const pushed = ref([]);
const favorites = ref([]);

function fmt(d) {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

function go(s) {
  assessmentApi.trackScale(s.id).catch(() => {});
  uni.navigateTo({ url: `/pages/assessment/detail?id=${s.id}` });
}

onMounted(async () => {
  const [avail, favIds, scales] = await Promise.allSettled([
    store.isLoggedIn() ? assessmentApi.myAvailable() : Promise.resolve([]),
    store.isLoggedIn() ? assessmentApi.getFavorites() : Promise.resolve([]),
    assessmentApi.getScales(),
  ]);
  if (avail.status === 'fulfilled')
    pushed.value = avail.value.filter(s => s.reason === 'pushed');
  if (favIds.status === 'fulfilled' && scales.status === 'fulfilled') {
    const ids = new Set(favIds.value);
    favorites.value = scales.value.filter(s => ids.has(s.id));
  }
});
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

.page { background: $bg; min-height: 100vh; padding-bottom: 80rpx; }

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
  font-weight: 600;
  color: $text-1;
  letter-spacing: 0.04em;
  font-family: "Noto Serif SC", serif;
}

.card {
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  box-shadow: $card-shadow;
  padding: 32rpx 28rpx;
  margin-bottom: 20rpx;
  &:active { transform: scale(0.99); }
}
.pushed-card { background: $zj-teal-light; }

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12rpx;
  gap: 16rpx;
}
.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-1;
  flex: 1;
  font-family: "Noto Serif SC", serif;
  letter-spacing: 0.02em;
  line-height: 1.4;
}
.fav-icon { font-size: 34rpx; color: #F5A623; flex-shrink: 0; }
.expire-badge {
  background: #FFF1EC;
  border-radius: 12rpx;
  padding: 6rpx 16rpx;
  flex-shrink: 0;
}
.expire-txt { font-size: 20rpx; color: #D8693A; font-weight: 500; }
.card-meta { display: block; font-size: 24rpx; color: $muted; margin-bottom: 20rpx; }
.btn-go {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $teal;
  border-radius: 16rpx;
  padding: 16rpx 0;
  gap: 8rpx;

  &:active { opacity: 0.88; }
}
.btn-go-txt { font-size: 26rpx; color: #fff; font-weight: 600; letter-spacing: 0.04em; }
.btn-go-arrow { font-size: 36rpx; color: rgba(255,255,255,0.8); line-height: 1; }

.empty-wrap { text-align: center; padding: 48rpx 0; }
.empty-txt { font-size: 26rpx; color: $muted; }
</style>
