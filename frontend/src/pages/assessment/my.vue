<template>
  <view class="page">
    <view class="section">
      <text class="title">推送给我的测评</text>
      <view v-if="pushed.length">
        <view v-for="s in pushed" :key="s.id" class="card pushed" @click="go(s)">
          <text class="name">{{s.name}}</text>
          <text v-if="s.expiresAt" class="expire">截止 {{fmt(s.expiresAt)}}</text>
          <text class="meta">{{s.totalQuestions}}题 · {{s.estimatedMinutes}}分钟</text>
          <view class="btn">开始测评</view>
        </view>
      </view>
      <view v-else class="empty">暂无推送测评</view>
    </view>

    <view class="section">
      <text class="title">我的收藏</text>
      <view v-if="favorites.length">
        <view v-for="s in favorites" :key="s.id" class="card" @click="go(s)">
          <text class="name">{{s.name}}</text>
          <text class="meta">{{s.totalQuestions}}题 · {{s.estimatedMinutes}}分钟</text>
        </view>
      </view>
      <view v-else class="empty">暂无收藏测评</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';

const pushed = ref([]);
const favorites = ref([]);

function fmt(d) {
  const dt = new Date(d);
  return `${dt.getMonth()+1}月${dt.getDate()}日`;
}

function go(s) {
  assessmentApi.trackScale(s.id).catch(() => {});
  uni.navigateTo({ url: `/pages/assessment/detail?id=${s.id}` });
}

onMounted(async () => {
  const [avail, favIds, scales] = await Promise.allSettled([
    assessmentApi.myAvailable(),
    assessmentApi.getFavorites(),
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

<style scoped>
.page { background: #F5F7F6; min-height: 100vh; padding: 16px; }
.section { margin-bottom: 24px; }
.title { font-size: 15px; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 10px; }
.card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 10px; }
.card.pushed { border-left: 3px solid #4A8A7A; }
.name { font-size: 15px; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 4px; }
.expire { font-size: 12px; color: #E07050; display: block; margin-bottom: 4px; }
.meta { font-size: 12px; color: #9BBCB4; display: block; margin-bottom: 10px; }
.btn { background: #4A8A7A; color: #fff; font-size: 13px; text-align: center; padding: 8px 0; border-radius: 8px; }
.empty { font-size: 13px; color: #9BBCB4; text-align: center; padding: 20px 0; }
</style>
