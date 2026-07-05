<template>
  <view class="page">
    <view class="tabs">
      <view class="tab" :class="{ active: type === '' }" @click="type = ''; load()">全部</view>
      <view class="tab" :class="{ active: type === 'news' }" @click="type = 'news'; load()">新闻</view>
<view class="tab" :class="{ active: type === 'psychology' }" @click="type = 'psychology'; load()">心理科普</view>
      <view class="tab" :class="{ active: type === 'favorites' }" @click="type = 'favorites'; load()">收藏</view>
    </view>
    <view class="news-item" v-for="n in list" :key="n.id">
      <view style="display:flex;gap:0" @click="nav(n.id)">
        <image v-if="n.coverImage" class="cover" :src="n.coverImage" mode="aspectFill" />
        <view class="info">
          <u-tag :text="n.type === 'activity' ? '活动' : n.type === 'psychology' ? '心理科普' : '新闻'" :type="n.type === 'activity' ? 'success' : n.type === 'psychology' ? 'warning' : 'primary'" size="mini" />
          <text class="title">{{n.title}}</text>
          <text class="summary">{{n.summary}}</text>
          <text class="date">{{fmt(n.createdAt)}}</text>
        </view>
      </view>
      <view class="action-bar">
        <view class="action-btn" @click.stop="toggleLike(n)">
          <text class="action-icon" :style="n.isLiked ? 'color:#4A8A7A' : ''">👍</text>
          <text :class="['action-label', n.isLiked && 'active']">{{n.likeCount || 0}}</text>
        </view>
        <view class="action-btn" @click.stop="toggleFavorite(n)">
          <text class="action-icon" :style="n.isFavorited ? 'color:#E6A23C' : ''">⭐</text>
          <text :class="['action-label', n.isFavorited && 'active-fav']">{{n.favoriteCount || 0}}</text>
        </view>
        <view class="action-btn" @click.stop="share(n)">
          <text class="action-icon">🔗</text>
          <text class="action-label">转发</text>
        </view>
      </view>
    </view>
    <u-empty v-if="!list.length" text="暂无内容" mode="data" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { newsApi } from '../../api/index';
import { track } from '../../utils/track';

const list = ref([]);
const type = ref('');

async function load() {
  try {
    list.value = type.value === 'favorites'
      ? await newsApi.favorites()
      : await newsApi.list(type.value ? { type: type.value } : {});
  } catch { if (type.value === 'favorites') uni.showToast({ title: '请先登录', icon: 'none' }); }
}
onMounted(() => { track('page_view', '/pages/news/index'); load(); });

function fmt(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }
function nav(id) { track('article_click', '/pages/news/index', { id }); uni.navigateTo({ url: `/pages/news/detail?id=${id}` }); }

async function toggleLike(n) {
  try {
    const r = await newsApi.like(n.id);
    track('article_like', '/pages/news/index', { id: n.id, liked: r.isLiked });
    n.isLiked = r.isLiked; n.likeCount = r.likeCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

async function toggleFavorite(n) {
  try {
    const r = await newsApi.favorite(n.id);
    track('article_favorite', '/pages/news/index', { id: n.id, favorited: r.isFavorited });
    n.isFavorited = r.isFavorited; n.favoriteCount = r.favoriteCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

function share(n) {
  const url = `${window.location.origin}${window.location.pathname}#/pages/news/detail?id=${n.id}`;
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) });
}
</script>

<style scoped lang="scss">
.page { padding: 0 24rpx; background: #F5F7F6; min-height: 100vh; }
.tabs { display: flex; gap: 24rpx; padding: 24rpx 0; }
.tab { font-size: 28rpx; color: #9BBCB4; padding-bottom: 8rpx; }
.tab.active { color: #4A8A7A; font-weight: 600; border-bottom: 4rpx solid #4A8A7A; }
.news-item { background: #fff; border-radius: 16rpx; margin-bottom: 20rpx; overflow: hidden; }
.cover { width: 180rpx; height: 130rpx; border-radius: 0; flex-shrink: 0; }
.info { flex: 1; padding: 20rpx; display: flex; flex-direction: column; gap: 10rpx; }
.title { font-size: 30rpx; font-weight: 700; color: #1C2A27; letter-spacing: -0.3rpx; line-height: 1.4; }
.summary { font-size: 24rpx; color: #617870; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.date { font-size: 22rpx; color: #9BBCB4; }
.action-bar { display: flex; gap: 48rpx; padding: 16rpx 24rpx; border-top: 1rpx solid #f0f0f0; }
.action-btn { display: flex; align-items: center; gap: 8rpx; }
.action-label { font-size: 24rpx; color: #999; }
.active { color: #4A8A7A; }
.active-fav { color: #E6A23C; }
</style>
