<template>
  <view class="page">
    <!-- 顶部 -->
    <view class="top-bar">
      <view class="icon-btn" @click="uni.navigateBack()">
        <text class="icon-text">←</text>
      </view>
      <text class="top-title">我的成就</text>
      <view style="width:64rpx" />
    </view>

    <!-- 进度概览 -->
    <view class="summary-card" v-if="!loading">
      <text class="summary-num">{{ gotCount }}</text>
      <text class="summary-label">个成就已解锁</text>
    </view>

    <!-- 分类 tab -->
    <scroll-view scroll-x class="tab-scroll">
      <view class="tab-row">
        <view
          v-for="cat in CATS" :key="cat.key"
          class="tab-item"
          :class="{ active: activeTab === cat.key }"
          @click="activeTab = cat.key"
        >
          <text>{{ cat.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 成就列表 -->
    <scroll-view scroll-y class="list-scroll">
      <view class="achievement-grid" v-if="!loading && filteredList.length">
        <view
          v-for="a in filteredList" :key="a.key"
          class="achievement-card unlocked"
          @click="showDetail(a)"
        >
          <view class="ach-icon-wrap" :style="`background:${typeColor(a.type)}22; border-color:${typeColor(a.type)}`">
            <text class="ach-icon">{{ a.icon }}</text>
            <view class="ach-glow" :style="`background:${typeColor(a.type)}44`" />
          </view>
          <text class="ach-name" :style="`color:${typeColor(a.type)}`">{{ a.name }}</text>
          <text class="ach-desc">{{ a.unlockedAt ? formatDate(a.unlockedAt) : '已解锁' }}</text>
        </view>
      </view>
      <view v-if="!loading && !filteredList.length" class="empty-wrap">
        <text class="empty-icon">🔍</text>
        <text class="empty-text">继续使用平台功能，解锁隐藏成就</text>
      </view>
      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中…</text>
      </view>
    </scroll-view>

    <!-- 详情弹层 -->
    <view v-if="detail" class="detail-mask" @click="detail = null">
      <view class="detail-card" @click.stop>
        <view class="detail-icon-wrap" :style="detail.unlocked ? `background:${typeColor(detail.type)}22; border-color:${typeColor(detail.type)}` : ''">
          <text class="detail-icon">{{ detail.unlocked ? detail.icon : '🔒' }}</text>
        </view>
        <text class="detail-name">{{ detail.name }}</text>
        <text class="detail-desc">{{ detail.desc }}</text>
        <text v-if="detail.unlocked && detail.unlockedAt" class="detail-date">解锁于 {{ formatDate(detail.unlockedAt) }}</text>
        <text v-if="!detail.unlocked" class="detail-hint">继续使用平台功能解锁此成就</text>

        <!-- 分享按钮（仅已解锁） -->
        <button v-if="detail.unlocked" class="share-btn" open-type="share" @click="onShareAchievement(detail)">
          分享给朋友
        </button>
        <view class="detail-close" @click="detail = null">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { SERVER } from '../../config';

const loading   = ref(true);
const list      = ref([]);
const total     = ref(0);
const gotCount  = ref(0);
const activeTab = ref('all');
const detail    = ref(null);

const CATS = [
  { key: 'all',        label: '全部' },
  { key: 'ohcard',     label: '🃏 OH卡' },
  { key: 'assessment', label: '🧠 测评' },
  { key: 'breathing',  label: '🌬️ 呼吸' },
  { key: 'mandala',    label: '🎨 曼陀罗' },
  { key: 'homework',   label: '📓 咨询工具' },
  { key: 'activity',   label: '🎪 活动' },
  { key: 'profile',    label: '✨ 个人' },
  { key: 'order',      label: '🎁 下单' },
  { key: 'login',      label: '🔥 登录' },
  { key: 'combo',      label: '🌈 综合' },
];

const TYPE_COLORS = {
  ohcard:     '#7B5EA7',
  assessment: '#4A90D9',
  breathing:  '#4AB8A0',
  mandala:    '#E57373',
  homework:   '#66BB6A',
  activity:   '#FF7043',
  profile:    '#4AB8A0',
  order:      '#F5A623',
  login:      '#FF7043',
  combo:      '#8B6FCB',
};

function typeColor(type) {
  return TYPE_COLORS[type] || '#4A7A9E';
}

const filteredList = computed(() => {
  const unlocked = list.value.filter(a => a.unlocked);
  if (activeTab.value === 'all') return unlocked;
  return unlocked.filter(a => a.type === activeTab.value);
});

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function showDetail(a) {
  detail.value = a;
}

function onShareAchievement(a) {
  // 分享内容在 onShareAppMessage 中处理
}

onMounted(async () => {
  try {
    const token = uni.getStorageSync('token');
    const res   = await uni.request({
      url:    `${SERVER}/api/achievements/my`,
      method: 'GET',
      header: { Authorization: `Bearer ${token}` },
    });
    if (res.data?.ok) {
      list.value     = res.data.list;
      total.value    = res.data.total;
      gotCount.value = res.data.gotCount;
    }
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped lang="scss">
$bg:      #0D1821;
$surface: #162230;
$text1:   #EEF4F2;
$text2:   #8DAAB8;

.page {
  min-height: 100vh;
  background: $bg;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
}
.icon-btn {
  width: 64rpx; height: 64rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: center;
}
.icon-text { color: $text1; font-size: 36rpx; }
.top-title { color: $text1; font-size: 34rpx; font-weight: 600; }

.summary-card {
  margin: 16rpx 32rpx 24rpx;
  background: $surface;
  border-radius: 24rpx;
  padding: 32rpx 40rpx;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}
.summary-num   { color: #F5A623; font-size: 56rpx; font-weight: 700; }
.summary-label { color: $text2; font-size: 26rpx; margin-left: 4rpx; }

.tab-scroll { padding: 0 24rpx; margin-bottom: 16rpx; }
.tab-row { display: flex; gap: 16rpx; padding: 4rpx 8rpx; }
.tab-item {
  padding: 12rpx 28rpx;
  border-radius: 40rpx;
  background: $surface;
  color: $text2;
  font-size: 26rpx;
  white-space: nowrap;
  flex-shrink: 0;
  &.active { background: #4A7A9E; color: $text1; }
}

.list-scroll { flex: 1; padding: 0 24rpx 40rpx; }
.achievement-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
}

.achievement-card {
  background: $surface;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 20rpx;
}
.empty-icon { font-size: 64rpx; }
.empty-text { color: $text2; font-size: 26rpx; text-align: center; }

.ach-icon-wrap {
  width: 88rpx; height: 88rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  position: relative;
  overflow: hidden;
}
.ach-glow {
  position: absolute; inset: 0;
  border-radius: 50%;
  pointer-events: none;
}
.ach-icon  { font-size: 40rpx; position: relative; z-index: 1; }
.ach-name  { font-size: 24rpx; color: $text2; font-weight: 600; text-align: center; line-height: 1.3; }
.ach-desc  { font-size: 20rpx; color: $text2; opacity: 0.6; text-align: center; line-height: 1.4; }

.loading-wrap { display: flex; justify-content: center; padding: 80rpx 0; }
.loading-text { color: $text2; font-size: 28rpx; }

/* 详情弹层 */
.detail-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.detail-card {
  background: #1A2D3E;
  border-radius: 32rpx;
  padding: 48rpx 40rpx;
  width: 560rpx;
  display: flex; flex-direction: column; align-items: center; gap: 16rpx;
}
.detail-icon-wrap {
  width: 120rpx; height: 120rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8rpx;
}
.detail-icon  { font-size: 56rpx; }
.detail-name  { color: #EEF4F2; font-size: 36rpx; font-weight: 700; }
.detail-desc  { color: #8DAAB8; font-size: 28rpx; text-align: center; line-height: 1.5; }
.detail-date  { color: #F5A623; font-size: 24rpx; }
.detail-hint  { color: #8DAAB8; font-size: 24rpx; opacity: 0.7; }

.share-btn {
  margin-top: 8rpx;
  width: 100%;
  background: #4A7A9E;
  color: #fff;
  border: none;
  border-radius: 16rpx;
  padding: 20rpx 0;
  font-size: 28rpx;
  text-align: center;
}
.detail-close {
  color: #8DAAB8;
  font-size: 26rpx;
  padding: 12rpx 40rpx;
  margin-top: 4rpx;
}
</style>
