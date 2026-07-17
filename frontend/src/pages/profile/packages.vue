<template>
  <view class="page">
    <view v-if="loading" class="loading-wrap">
      <u-loading-icon />
    </view>
    <view v-else-if="list.length === 0" class="empty-wrap">
      <u-empty text="暂无套餐，快去购买吧" mode="data" />
      <view class="action-btn action-btn--primary" style="margin-top:32rpx" @click="uni.navigateTo({ url: '/pages/admin/packages' })"><text class="action-btn-text">查看套餐</text></view>
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
$primary: #4A8A7A;
$bg: #F0F4F3;
$text-main: #1C2A27;
$text-muted: #9BBCB4;
$text-sub: #8A9E97;

.page { min-height: 100vh; background: $bg; padding: 24rpx; }

.loading-wrap, .empty-wrap {
  display: flex; flex-direction: column; align-items: center; padding: 120rpx 0;
}
.action-btn {
  text-align: center; padding: 20rpx 40rpx; border-radius: 14rpx;
  &--primary { background: #4A8A7A; }
}
.action-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }

.pkg-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(74,138,122,0.07);

  .pkg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28rpx;
  }

  .pkg-name {
    font-size: 30rpx;
    font-weight: 700;
    color: $text-main;
    letter-spacing: 0.02em;
  }

  .pkg-status {
    font-size: 22rpx;
    padding: 6rpx 18rpx;
    border-radius: 20rpx;
    font-weight: 600;
    &.active    { background: #E8F5F1; color: $primary; }
    &.exhausted { background: #F0F0F0; color: $text-sub; }
    &.expired   { background: #FFF0F0; color: #C83232; }
  }

  .progress-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 20rpx;

    .progress-bar {
      flex: 1;
      height: 10rpx;
      background: #EEF4F2;
      border-radius: 8rpx;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        border-radius: 8rpx;
        transition: width .4s ease;
      }
    }

    .progress-text { font-size: 22rpx; color: $text-sub; flex-shrink: 0; }
  }

  .detail-row {
    display: flex;
    gap: 32rpx;
    margin-bottom: 14rpx;
    padding-top: 4rpx;

    .detail-item { font-size: 24rpx; color: $text-sub; }
    .highlight { color: $primary; font-weight: 700; font-size: 28rpx; }
  }

  .paid-tip {
    font-size: 22rpx;
    color: $text-muted;
    padding-top: 12rpx;
    border-top: 1rpx solid #F0F4F3;
    margin-top: 4rpx;
  }
}
</style>
