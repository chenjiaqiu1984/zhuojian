<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon />
    </view>
    <view v-else-if="list.length === 0" class="empty-wrap">
      <u-empty text="暂无套餐，快去购买吧" mode="data" />
      <u-button type="primary" size="small" style="margin-top:32rpx"
        @click="uni.navigateTo({ url: '/pages/admin/packages' })">
        查看套餐
      </u-button>
    </view>
    <view v-else>
      <view class="pkg-card" v-for="up in list" :key="up.id">
        <view class="pkg-header">
          <text class="pkg-name">{{ up.package.name }}</text>
          <text class="pkg-status" :class="up.status">{{ statusLabel[up.status] }}</text>
        </view>
        <!-- 进度条 -->
        <view class="progress-row">
          <view class="progress-bar">
            <view
              class="progress-fill"
              :style="{ width: usedPct(up) + '%', background: up.status === 'active' ? '#4A8A7A' : '#B0C9C4' }"
            />
          </view>
          <text class="progress-text">
            已用 {{ up.usedSessions }} / {{ up.totalSessions }} 次
          </text>
        </view>
        <!-- 详情行 -->
        <view class="detail-row">
          <text class="detail-item">
            剩余 <text class="highlight">{{ up.totalSessions - up.usedSessions }}</text> 次
          </text>
          <text class="detail-item" v-if="up.expireAt">
            到期 {{ fmtDate(up.expireAt) }}
          </text>
          <text class="detail-item" v-else>长期有效</text>
        </view>
        <text class="paid-tip">实付 ¥{{ (up.paidAmount / 100).toFixed(2) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { packageApi } from '../../api/index';

const list    = ref([]);
const loading = ref(true);

const statusLabel = {
  active:    '使用中',
  exhausted: '已用完',
  expired:   '已过期',
};

const usedPct = up =>
  up.totalSessions > 0 ? Math.round((up.usedSessions / up.totalSessions) * 100) : 0;

function fmtDate(str) {
  const d = new Date(str);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

onMounted(async () => {
  try {
    list.value = await packageApi.my();
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; padding: 24rpx; }

.loading-wrap, .empty-wrap {
  display: flex; flex-direction: column; align-items: center; padding: 120rpx 0;
}

.pkg-card {
  background: #fff; border-radius: 20rpx; padding: 36rpx;
  margin-bottom: 20rpx;

  .pkg-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24rpx;
  }
  .pkg-name { font-size: 30rpx; font-weight: 700; color: #1C2A27; }
  .pkg-status {
    font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx;
    &.active    { background: #E8F5F1; color: #4A8A7A; }
    &.exhausted { background: #F0F0F0; color: #8A9E97; }
    &.expired   { background: #FFF0F0; color: #C83232; }
  }

  .progress-row {
    display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx;
    .progress-bar {
      flex: 1; height: 12rpx; background: #EEF2F0; border-radius: 6rpx; overflow: hidden;
      .progress-fill { height: 100%; border-radius: 6rpx; transition: width .3s; }
    }
    .progress-text { font-size: 22rpx; color: #8A9E97; flex-shrink: 0; }
  }

  .detail-row {
    display: flex; gap: 32rpx; margin-bottom: 12rpx;
    .detail-item { font-size: 24rpx; color: #8A9E97; }
    .highlight { color: #4A8A7A; font-weight: 700; }
  }

  .paid-tip { font-size: 22rpx; color: #B0B8B5; }
}
</style>
