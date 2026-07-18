<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!vouchers.length" class="empty">暂无券码</view>
    <view v-else class="list">
      <view v-for="v in vouchers" :key="v.id" :class="['card', statusClass(v)]">
        <view class="card-top">
          <text class="scale-name">{{v.scale ? v.scale.name : '通用券'}}</text>
          <text :class="['status-tag', statusClass(v)]">{{statusLabel(v)}}</text>
        </view>
        <text class="code">{{v.code}}</text>
        <view class="card-bottom">
          <text class="meta">创建于 {{fmt(v.createdAt)}}</text>
          <text v-if="v.expiresAt" class="meta">截止 {{fmt(v.expiresAt)}}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';

const vouchers = ref([]);
const loading = ref(true);

function fmt(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function statusClass(v) {
  if (v.usedBy) return 'used';
  if (v.expiresAt && new Date(v.expiresAt) < new Date()) return 'expired';
  return 'valid';
}

function statusLabel(v) {
  if (v.usedBy) return '已使用';
  if (v.expiresAt && new Date(v.expiresAt) < new Date()) return '已过期';
  return '可使用';
}

onMounted(async () => {
  try { vouchers.value = await assessmentApi.myVouchers(); } catch {}
  loading.value = false;
});
</script>

<style scoped lang="scss">
.page { background: $zj-bg; min-height: 100vh; padding: 24rpx; }

.empty {
  text-align: center;
  padding: 160rpx;
  color: #9BBCB4;
  font-size: 28rpx;
}

.list { display: flex; flex-direction: column; gap: 16rpx; }

.card {
  background: #fff;
  border-radius: $zj-radius-card;
  padding: 28rpx 28rpx 24rpx;
  box-shadow: $zj-shadow-card;
}

.card.used {
  background: #F7F9F8;
  opacity: .65;
}

.card.expired {
  background: #FBF4F2;
  opacity: .65;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14rpx;
}

.scale-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C2A27;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 18rpx;
  border-radius: 20rpx;
  background: #EAF5F1;
  color: #4A8A7A;
  font-weight: 600;
}

.status-tag.used { background: #F0F0F0; color: #8A9E97; }
.status-tag.expired { background: #FFF0EE; color: #E07050; }

.code {
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 8rpx;
  color: #3A6E80;
  display: block;
  margin: 10rpx 0 16rpx;
}

.card-bottom {
  display: flex;
  gap: 24rpx;
  padding-top: 14rpx;
  border-top: 1rpx solid $zj-border;
}

.meta { font-size: 22rpx; color: #9BBCB4; }
</style>
