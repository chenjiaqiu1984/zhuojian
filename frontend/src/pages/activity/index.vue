<template>
  <view class="page">
    <view class="act-item" v-for="n in list" :key="n.id">
      <image v-if="n.coverImage" class="cover" :src="n.coverImage" mode="aspectFill" />
      <view class="info">
        <text class="title">{{n.title}}</text>
        <text class="summary">{{n.summary}}</text>
        <text class="date">{{fmt(n.createdAt)}}</text>
        <view class="btn" @click="nav(n.id)">查看详情 / 报名</view>
      </view>
    </view>
    <u-empty v-if="!list.length" text="暂无活动" mode="data" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { newsApi } from '../../api/index';

const list = ref([]);
onMounted(async () => {
  try { list.value = await newsApi.list({ type: 'activity' }); } catch {}
});

function fmt(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }
function nav(id) { uni.navigateTo({ url: `/pages/news/detail?id=${id}` }); }
</script>

<style scoped lang="scss">
.page { padding: 24rpx; background: #F5F7F6; min-height: 100vh; }
.act-item { background: #fff; border-radius: 16rpx; margin-bottom: 20rpx; overflow: hidden; }
.cover { width: 100%; height: 240rpx; }
.info { padding: 24rpx; display: flex; flex-direction: column; gap: 12rpx; }
.title { font-size: 32rpx; font-weight: 700; color: #1C2A27; }
.summary { font-size: 26rpx; color: #617870; line-height: 1.6; }
.date { font-size: 22rpx; color: #9BBCB4; }
.btn { background: #4A8A7A; color: #fff; text-align: center; padding: 18rpx; border-radius: 12rpx; font-size: 28rpx; font-weight: 600; margin-top: 8rpx; }
</style>
