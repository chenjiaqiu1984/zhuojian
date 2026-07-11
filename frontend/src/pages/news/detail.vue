<template>
  <view v-if="notFound" style="padding:80rpx;text-align:center;color:#999;font-size:28rpx">内容已下线或不存在</view>
  <view class="page" v-else-if="news">
    <image v-if="news.coverImage" class="cover" :src="news.coverImage" mode="aspectFill" />
    <view v-if="news.videoUrl" class="video-wrap">
      <video class="video" :src="news.videoUrl" controls />
    </view>
    <view class="body">
      <text class="title">{{news.title}}</text>
      <view class="meta-row">
        <u-tag :text="news.type === 'activity' ? '活动' : news.type === 'psychology' ? '心理科普' : '新闻'" :type="news.type === 'activity' ? 'success' : news.type === 'psychology' ? 'warning' : 'primary'" size="mini" />
        <text class="date">{{fmt(news.createdAt)}}</text>
        <text v-if="news.author" class="author">{{news.author}}</text>
      </view>
      <view class="content" v-html="safeContent" />
    </view>

    <view class="action-bar">
      <view class="action-btn" @click="toggleLike()">
        <u-icon :name="news.isLiked ? 'thumb-up-fill' : 'thumb-up'" :color="news.isLiked ? '#4A8A7A' : '#999'" size="44" />
        <text :class="['action-label', news.isLiked && 'active']">{{news.likeCount || 0}}</text>
      </view>
      <view class="action-btn" @click="toggleFavorite()">
        <u-icon :name="news.isFavorited ? 'star-fill' : 'star'" :color="news.isFavorited ? '#E6A23C' : '#999'" size="44" />
        <text :class="['action-label', news.isFavorited && 'active-fav']">{{news.favoriteCount || 0}}</text>
      </view>
      <view class="action-btn" @click="share()">
        <u-icon name="share" color="#999" size="44" />
        <text class="action-label">转发</text>
      </view>
    </view>

    <view class="comment-section">
      <text class="section-title">留言</text>
      <view class="comment-input-row">
        <input class="comment-input" v-model="commentText" placeholder="写下你的留言..." />
        <text class="send-btn" @click="submitComment()">发送</text>
      </view>
      <view class="comment-list">
        <view class="comment-item" v-for="c in comments" :key="c.id" :class="{ reply: c.parentId }">
          <view class="comment-meta">
            <text class="comment-who">{{c.parentId ? '管理员回复' : '我'}}</text>
            <text class="comment-time">{{fmt(c.createdAt)}}</text>
            <text class="del-btn" v-if="!c.parentId" @click="delComment(c.id)">删除</text>
          </view>
          <text class="comment-content">{{c.content}}</text>
        </view>
      </view>
    </view>
  </view>
  <u-loading-page :loading="loading" />
</template>

<script setup>
import {ref, onMounted, computed, watch } from 'vue';
import DOMPurify from 'dompurify';
import { newsApi } from '../../api/index';


const loading = ref(true);
const news = ref(null);
const notFound = ref(false);
const comments = ref([]);
const commentText = ref('');
let newsId = null;

const safeContent = computed(() =>
  news.value?.content ? DOMPurify.sanitize(news.value.content, { USE_PROFILES: { html: true } }) : ''
);

onMounted(async () => {
  const pages = getCurrentPages();
  newsId = pages[pages.length - 1]?.options?.id;
  if (!newsId) {
    const hash = window.location.hash;
    const q = hash.indexOf('?');
    if (q !== -1) newsId = new URLSearchParams(hash.slice(q + 1)).get('id');
  }
  try {
    news.value = await newsApi.get(newsId);
    loadComments();
  } catch {
    notFound.value = true;
  } finally { loading.value = false; }
});

async function loadComments() {
  try { comments.value = await newsApi.getComments(newsId); } catch {}
}

function fmt(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }

async function toggleLike() {
  try {
    const r = await newsApi.like(news.value.id);
    news.value.isLiked = r.isLiked; news.value.likeCount = r.likeCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

async function toggleFavorite() {
  try {
    const r = await newsApi.favorite(news.value.id);
    news.value.isFavorited = r.isFavorited; news.value.favoriteCount = r.favoriteCount;
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

function share() {
  const url = `${window.location.origin}${window.location.pathname}#/pages/news/detail?id=${newsId}`;
  uni.setClipboardData({ data: url, success: () => uni.showToast({ title: '链接已复制', icon: 'none' }) });
}

async function submitComment() {
  const text = commentText.value.trim();
  if (!text) return;
  if (text.length > 500) return uni.showToast({ title: '留言不超过500字', icon: 'none' });
  try {
    await newsApi.addComment(newsId, text);
    commentText.value = '';
    loadComments();
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
}

async function delComment(id) {
  try { await newsApi.deleteComment(id); loadComments(); } catch {}
}
</script>

<style scoped lang="scss">
.cover { width: 100%; height: 350rpx; }
.video-wrap { padding: 24rpx; background: #000; }
.video { width: 100%; height: 400rpx; }
.body { padding: 32rpx; padding-bottom: 0; }
.title { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 16rpx; }
.meta-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.date, .author { font-size: 24rpx; color: #999; }
.content { font-size: 28rpx; color: #444; line-height: 1.8; overflow-x: auto; }
.content :deep(table) { border-collapse: collapse; width: 100%; }
.content :deep(td), .content :deep(th) { border: 1px solid #ddd; padding: 8px; text-align: left; }
.content :deep(img) { max-width: 100%; height: auto; }
.content :deep(p) { margin: 8px 0; }
.action-bar { display: flex; gap: 48rpx; justify-content: center; padding: 32rpx; border-top: 1rpx solid #f0f0f0; margin-top: 32rpx; }
.action-btn { display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.action-label { font-size: 24rpx; color: #999; }
.active { color: #4A8A7A; }
.active-fav { color: #E6A23C; }
.comment-section { padding: 32rpx; border-top: 1rpx solid #f0f0f0; }
.section-title { font-size: 30rpx; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 20rpx; }
.comment-input-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.comment-input { flex: 1; border: 1rpx solid #e0e0e0; border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; }
.send-btn { background: #4A8A7A; color: #fff; border-radius: 12rpx; padding: 16rpx 28rpx; font-size: 26rpx; white-space: nowrap; }
.comment-item { padding: 20rpx; background: #f9f9f9; border-radius: 12rpx; margin-bottom: 16rpx; }
.comment-item.reply { background: #eef6f4; margin-left: 32rpx; }
.comment-meta { display: flex; align-items: center; gap: 16rpx; margin-bottom: 8rpx; }
.comment-who { font-size: 24rpx; font-weight: 600; color: #4A8A7A; }
.comment-time { font-size: 22rpx; color: #999; flex: 1; }
.del-btn { font-size: 22rpx; color: #f56c6c; }
.comment-content { font-size: 26rpx; color: #444; line-height: 1.6; display: block; }
</style>
