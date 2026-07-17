<template>
  <view class="page">
    <view v-if="loading" class="status-center"><text class="status-txt">加载中...</text></view>
    <view v-else-if="!list.length" class="status-center"><text class="status-txt">暂无测评记录</text></view>
    <view v-else class="list">
      <view class="item" v-for="r in list" :key="r.id" @click="goDetail(r.id)">
        <view class="item-header">
          <view class="level-dot" :style="{ background: levelColor(r.level) }"></view>
          <text class="item-name">{{ r.scale?.name }}</text>
          <text :class="['level-badge', levelClass(r.level)]">{{ r.level || '已完成' }}</text>
        </view>
        <view class="item-meta">
          <text class="meta-score">{{ r.totalScore }} 分</text>
          <view class="meta-flex" />
          <text class="meta-date">{{ fmt(r.completedAt) }}</text>
        </view>
        <view v-if="r.dimensions" class="dim-strip">
          <view v-for="(val, key) in JSON.parse(r.dimensions)" :key="key" class="dim-pill">
            <text class="dim-key">{{ key }}</text>
            <text class="dim-val">{{ typeof val === 'number' ? val.toFixed(0) : val }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';
import { useUserStore } from '../../store/user.js';

const store = useUserStore();
const loading = ref(true);
const list = ref([]);

onMounted(async () => {
  if (!store.isLoggedIn()) { loading.value = false; return; }
  try { list.value = await assessmentApi.getResults(); } catch {}
  loading.value = false;
});

function fmt(d) { return new Date(d).toLocaleDateString('zh-CN'); }
function levelClass(l) {
  if (!l) return '';
  if (l.includes('重度')) return 'lvl-severe';
  if (l.includes('中度')) return 'lvl-moderate';
  if (l.includes('轻度') || l.includes('亚临床')) return 'lvl-mild';
  return 'lvl-none';
}
function levelColor(l) {
  if (!l) return '#4A8A7A';
  if (l.includes('重度')) return '#C03048';
  if (l.includes('中度')) return '#D8693A';
  if (l.includes('轻度') || l.includes('亚临床')) return '#E8A030';
  return '#4A8A7A';
}
function goDetail(id) { uni.navigateTo({ url: `/pages/assessment/result?resultId=${id}` }); }
</script>

<style scoped lang="scss">
$teal: #4A8A7A;
$bg: #F5F7F6;
$text-1: #1C2A27;
$text-2: #617870;
$muted: #9BBCB4;
$border: #E8EFED;
$card-r: 24rpx;
$card-shadow: 0 4rpx 18rpx rgba(28,42,39,0.04);

.page { background: $bg; min-height: 100vh; padding: 24rpx 28rpx 80rpx; }
.status-center { text-align: center; padding: 120rpx 0; }
.status-txt { font-size: 28rpx; color: $muted; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.item {
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  box-shadow: $card-shadow;
  padding: 32rpx 28rpx;
  &:active { transform: scale(0.99); }
}
.item-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.level-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex-shrink: 0;
}
.item-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-1;
  flex: 1;
  font-family: "Noto Serif SC", serif;
  letter-spacing: 0.02em;
}
.level-badge {
  font-size: 20rpx;
  padding: 4rpx 18rpx;
  border-radius: 20rpx;
  font-weight: 500;
  flex-shrink: 0;
  &.lvl-none { background: #E6F5F0; color: $teal; }
  &.lvl-mild { background: #FFF3E0; color: #E65100; }
  &.lvl-moderate { background: #FFE0B2; color: #BF360C; }
  &.lvl-severe { background: #FFCDD2; color: #B71C1C; }
}
.item-meta {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.meta-score { font-size: 26rpx; color: $teal; font-weight: 600; }
.meta-flex { flex: 1; }
.meta-date { font-size: 22rpx; color: $muted; }
.dim-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $border;
}
.dim-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: #EEF5F2;
  border-radius: 12rpx;
  padding: 6rpx 16rpx;
}
.dim-key { font-size: 20rpx; color: $text-2; }
.dim-val { font-size: 20rpx; color: $teal; font-weight: 600; }
</style>
