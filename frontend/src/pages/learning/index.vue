<template>
  <view class="page">
    <view class="tabs">
      <view class="tab" :class="{ active: type === 'exam' }" @click="type = 'exam'; load()">考级报名</view>
      <view class="tab" :class="{ active: type === 'training' }" @click="type = 'training'; load()">培训课程</view>
    </view>
    <view class="item" v-for="n in list" :key="n.id" @click="nav(n.id)">
      <image v-if="n.coverImage" class="cover" :src="n.coverImage" mode="aspectFill" />
      <view class="info">
        <u-tag :text="type === 'exam' ? '考级' : '培训'" :type="type === 'exam' ? 'primary' : 'warning'" size="mini" />
        <text class="title">{{n.title}}</text>
        <text class="summary">{{n.summary}}</text>
        <text class="date">{{fmt(n.createdAt)}}</text>
      </view>
    </view>
    <u-empty v-if="!list.length" text="暂无内容" mode="data" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { newsApi } from '../../api/index';

const list = ref([]);
const type = ref('exam');

async function load() {
  try { list.value = await newsApi.list({ type: type.value }); } catch {}
}
onMounted(load);

function fmt(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }
function nav(id) { uni.navigateTo({ url: `/pages/news/detail?id=${id}` }); }
</script>

<style scoped lang="scss">
.page { padding: 0 24rpx; background: #F5F7F6; min-height: 100vh; }
.tabs { display: flex; gap: 24rpx; padding: 24rpx 0; }
.tab { font-size: 28rpx; color: #9BBCB4; padding-bottom: 8rpx; }
.tab.active { color: #4A8A7A; font-weight: 600; border-bottom: 4rpx solid #4A8A7A; }
.item { background: #fff; border-radius: 16rpx; margin-bottom: 20rpx; overflow: hidden; display: flex; }
.cover { width: 180rpx; height: 130rpx; flex-shrink: 0; }
.info { flex: 1; padding: 20rpx; display: flex; flex-direction: column; gap: 10rpx; }
.title { font-size: 30rpx; font-weight: 700; color: #1C2A27; line-height: 1.4; }
.summary { font-size: 24rpx; color: #617870; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.date { font-size: 22rpx; color: #9BBCB4; }
</style>
