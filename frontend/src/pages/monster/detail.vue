<template>
  <view class="page">
    <view v-if="monster">
      <!-- 顶部展示区 -->
      <view class="monster-hero" :style="{ background: `linear-gradient(155deg, ${monster.color}28 0%, ${monster.color}0A 100%)` }">
        <view class="hero-glow" :style="{ background: `radial-gradient(circle at 70% 30%, ${monster.color}30 0%, transparent 65%)` }" />

        <!-- 怪兽视觉 -->
        <view class="visual-wrap" :style="{ filter: growthFilter }">
          <view v-if="monster.drawingType === 'parts'" class="parts-view">
            <image v-if="partsData.body" class="p-body" :src="`/static/monster/body/${partsData.body}.svg`" mode="aspectFit" />
            <image v-if="partsData.tail" class="p-tail" :src="`/static/monster/tail/${partsData.tail}.svg`" mode="aspectFit" />
            <image v-if="partsData.horn" class="p-horn" :src="`/static/monster/horn/${partsData.horn}.svg`" mode="aspectFit" />
            <image v-if="partsData.eyes" class="p-eyes" :src="`/static/monster/eyes/${partsData.eyes}.svg`" mode="aspectFit" />
            <image v-if="partsData.mouth" class="p-mouth" :src="`/static/monster/mouth/${partsData.mouth}.svg`" mode="aspectFit" />
          </view>
          <view v-else class="canvas-view">
            <canvas canvas-id="detailCanvas" class="detail-canvas" />
          </view>
        </view>

        <!-- 阶段标签 -->
        <view class="stage-pill" :style="{ background: monster.color }">
          <text class="stage-text">{{ stageLabel }}</text>
        </view>
      </view>

      <!-- 基础信息卡 -->
      <view class="info-card">
        <view class="info-header">
          <view class="info-left">
            <text class="monster-name">{{ monster.name }}</text>
            <view class="emotion-pill" :style="{ background: `${monster.color}18`, color: monster.color }">
              <text class="emotion-pill-text">{{ monster.emotion }}</text>
            </view>
          </view>
          <view class="del-btn" @click="confirmDelete">
            <text class="del-text">删除</text>
          </view>
        </view>

        <!-- 成长数据 -->
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{ monster.totalDays }}</text>
            <text class="stat-label">累计天数</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-value streak">{{ monster.streak }}</text>
            <text class="stat-label">连续签到</text>
          </view>
          <view class="stat-divider" />
          <view class="stat-item">
            <text class="stat-value">{{ progressPct }}%</text>
            <text class="stat-label">成长进度</text>
          </view>
        </view>

        <!-- 进度条 -->
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: progressPct + '%', background: monster.color }" />
        </view>
        <text class="progress-hint">{{ progressHint }}</text>
      </view>

      <!-- 今日喂食卡 -->
      <view class="feed-card">
        <!-- 已喂食 -->
        <view v-if="fedToday" class="fed-state">
          <view class="fed-icon-wrap">
            <text class="fed-icon">✨</text>
          </view>
          <view class="fed-body">
            <text class="fed-title">今天已经喂过啦</text>
            <text v-if="todayLog && todayLog.note" class="fed-note">{{ todayLog.note }}</text>
            <text v-else class="fed-note muted">明天记得再来陪它</text>
          </view>
        </view>

        <!-- 未喂食 -->
        <view v-else class="unfed-state" @click="openFeedPopup">
          <view class="unfed-icon-wrap" :style="{ background: `${monster.color}18` }">
            <text class="unfed-icon">🍭</text>
          </view>
          <view class="unfed-body">
            <text class="unfed-title">今天还没喂食</text>
            <text class="unfed-hint">点击滋养你的怪兽</text>
          </view>
          <view class="arrow-wrap">
            <text class="arrow-text">›</text>
          </view>
        </view>
      </view>

      <!-- 成长日记 -->
      <view class="logs-wrap">
        <text class="logs-title">成长日记</text>

        <view v-if="feedLogs.length === 0" class="logs-empty">
          <text class="logs-empty-text">还没有日记，快去喂食吧</text>
        </view>

        <view v-else class="logs-list">
          <view class="log-item" v-for="(log, i) in feedLogs" :key="log.id">
            <view class="log-line-wrap">
              <view class="log-dot" :style="{ background: monster.color }" />
              <view v-if="i < feedLogs.length - 1" class="log-line" />
            </view>
            <view class="log-body">
              <text class="log-date">{{ formatDate(log.createdAt) }}</text>
              <text v-if="log.note" class="log-note">{{ log.note }}</text>
              <text v-else class="log-note muted">默默陪伴了一天</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 喂食弹窗 -->
    <uni-popup ref="feedPopupRef" type="bottom" :is-mask-click="true">
      <view class="feed-popup">
        <view class="popup-handle" />
        <text class="popup-title">今天想对怪兽说什么？</text>
        <textarea
          v-model="feedNote"
          class="feed-textarea"
          placeholder="写下今天的心情，或就这样静静陪着它..."
          placeholder-style="color: #B8A8D8"
          maxlength="200"
        />
        <text class="feed-count">{{ feedNote.length }}/200</text>
        <view class="popup-btns">
          <view class="popup-cancel" @click="closeFeedPopup">
            <text class="popup-cancel-text">取消</text>
          </view>
          <view class="popup-confirm" :style="{ background: monster?.color || '#7B4E9E' }" @click="doFeed">
            <text class="popup-confirm-text">喂食</text>
          </view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { monsterApi } from '@/api';

const monster = ref(null);
const feedLogs = ref([]);
const showFeedPopup = ref(false);
const feedNote = ref('');
const feedPopupRef = ref(null);

watch(showFeedPopup, val => {
  if (val) feedPopupRef.value?.open();
  else feedPopupRef.value?.close();
});

function openFeedPopup() { showFeedPopup.value = true; }
function closeFeedPopup() { showFeedPopup.value = false; }

const partsData = computed(() => {
  if (!monster.value || monster.value.drawingType !== 'parts') return {};
  try { return JSON.parse(monster.value.drawingData); } catch { return {}; }
});

const growthFilter = computed(() => {
  const d = monster.value?.totalDays || 0;
  if (d <= 2) return 'saturate(0) brightness(0.65)';
  if (d <= 6) return 'saturate(0.4)';
  if (d <= 13) return 'saturate(0.8)';
  return 'saturate(1.2) brightness(1.05)';
});

const stageLabel = computed(() => {
  const d = monster.value?.totalDays || 0;
  if (d === 0) return '刚刚诞生';
  if (d <= 2) return '灰色幼苗';
  if (d <= 6) return '初显色彩';
  if (d <= 13) return '活力成长';
  return '饱满鲜艳';
});

const progressPct = computed(() => Math.min(100, Math.round(((monster.value?.totalDays || 0) / 30) * 100)));

const progressHint = computed(() => {
  const d = monster.value?.totalDays || 0;
  if (d >= 30) return '已完全成长，继续陪伴它吧';
  return `再陪伴 ${30 - d} 天，怪兽将完全成长`;
});

const fedToday = computed(() => {
  if (!monster.value?.lastFedAt) return false;
  return new Date(monster.value.lastFedAt).toDateString() === new Date().toDateString();
});

const todayLog = computed(() => {
  if (!fedToday.value) return null;
  const today = new Date().toDateString();
  return feedLogs.value.find(l => new Date(l.createdAt).toDateString() === today) || null;
});

function formatDate(dt) {
  const d = new Date(dt);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

async function load() {
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  const id = cur.options?.id;
  if (!id) return;
  try {
    const data = await monsterApi.detail(Number(id));
    monster.value = data;
    feedLogs.value = data.feedLogs || [];
    if (data.drawingType === 'canvas') {
      await nextTick();
      replayCanvas(data.drawingData);
    }
  } catch (e) {
    if (e.__authRedirect) return;
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
}

function replayCanvas(str) {
  try {
    const data = JSON.parse(str);
    if (!data.paths) return;
    const ctx = uni.createCanvasContext('detailCanvas');
    ctx.fillStyle = '#FDFAFF';
    ctx.fillRect(0, 0, 560, 560);
    for (const path of data.paths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
      ctx.stroke();
    }
    ctx.draw();
  } catch {}
}

async function doFeed() {
  closeFeedPopup();
  uni.showLoading({ title: '喂食中...' });
  try {
    const updated = await monsterApi.feed(monster.value.id, { note: feedNote.value.trim() || null });
    monster.value = { ...monster.value, ...updated };
    feedLogs.value.unshift({ id: Date.now(), note: feedNote.value.trim() || null, createdAt: new Date().toISOString() });
    feedNote.value = '';
    uni.hideLoading();
    uni.showToast({ title: '怪兽很开心！', icon: 'success' });
  } catch (e) {
    uni.hideLoading();
    if (e.__authRedirect) return;
    uni.showToast({ title: e.error || '喂食失败', icon: 'none' });
  }
}

async function confirmDelete() {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除「${monster.value.name}」吗？删除后无法恢复。`,
    confirmColor: '#E74C3C',
    success: async res => {
      if (!res.confirm) return;
      try {
        await monsterApi.del(monster.value.id);
        uni.showToast({ title: '已删除', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 1000);
      } catch (e) {
        if (e.__authRedirect) return;
        uni.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  });
}

onMounted(load);
</script>

<style scoped lang="scss">
$text-main: #1C1030;
$text-sub: #6A5A8A;
$text-muted: #A898C8;
$purple: #7B4E9E;
$purple-light: #EDE5F5;
$bg: #F5F3FA;
$white: #FFFFFF;

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 60rpx;
}

/* 顶部展示区 */
.monster-hero {
  padding: 56rpx 40rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.visual-wrap {
  width: 320rpx;
  height: 320rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: filter 0.6s ease;
  z-index: 1;
}

.parts-view {
  width: 100%;
  height: 100%;
  position: relative;
}

.p-body { position: absolute; width: 240rpx; height: 240rpx; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.p-tail { position: absolute; bottom: 18rpx; right: 8rpx; width: 90rpx; height: 90rpx; }
.p-horn { position: absolute; top: 8rpx; left: 50%; transform: translateX(-50%); width: 90rpx; height: 72rpx; }
.p-eyes { position: absolute; top: 84rpx; left: 50%; transform: translateX(-50%); width: 186rpx; height: 60rpx; }
.p-mouth { position: absolute; top: 154rpx; left: 50%; transform: translateX(-50%); width: 150rpx; height: 60rpx; }

.canvas-view {
  width: 100%;
  height: 100%;
  border-radius: 20rpx;
  overflow: hidden;
  background: $white;
}

.detail-canvas { width: 320rpx; height: 320rpx; }

.stage-pill {
  margin-top: 22rpx;
  padding: 10rpx 28rpx;
  border-radius: 30rpx;
  z-index: 1;
}

.stage-text {
  font-size: 22rpx;
  color: white;
  font-weight: 600;
}

/* 信息卡 */
.info-card {
  margin: 20rpx 28rpx 0;
  background: $white;
  border-radius: 28rpx;
  padding: 30rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(74,40,112,0.07);
  border: 1rpx solid $purple-light;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 26rpx;
}

.info-left { flex: 1; }

.monster-name {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: $text-main;
  font-family: "Noto Serif SC", serif;
  margin-bottom: 10rpx;
}

.emotion-pill {
  display: inline-block;
  padding: 6rpx 18rpx;
  border-radius: 12rpx;
}

.emotion-pill-text { font-size: 22rpx; font-weight: 600; }

.del-btn {
  padding: 10rpx 16rpx;
}

.del-text {
  font-size: 24rpx;
  color: #E74C3C;
}

/* 数据行 */
.stats-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: $text-main;
  line-height: 1.1;
  margin-bottom: 6rpx;

  &.streak { color: #E67E22; }
}

.stat-label {
  display: block;
  font-size: 20rpx;
  color: $text-muted;
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: $purple-light;
}

.progress-track {
  height: 10rpx;
  background: $purple-light;
  border-radius: 10rpx;
  overflow: hidden;
  margin-bottom: 10rpx;
}

.progress-fill {
  height: 100%;
  border-radius: 10rpx;
  transition: width 0.8s ease;
}

.progress-hint {
  display: block;
  font-size: 21rpx;
  color: $text-muted;
}

/* 喂食卡 */
.feed-card {
  margin: 16rpx 28rpx 0;
  background: $white;
  border-radius: 28rpx;
  padding: 26rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(74,40,112,0.07);
  border: 1rpx solid $purple-light;
}

.fed-state {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.fed-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(46,204,113,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fed-icon { font-size: 36rpx; }

.fed-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #27AE60;
  margin-bottom: 6rpx;
}

.fed-note {
  display: block;
  font-size: 24rpx;
  color: $text-sub;
  line-height: 1.5;

  &.muted { color: $text-muted; }
}

.unfed-state {
  display: flex;
  align-items: center;
  gap: 20rpx;

  &:active { opacity: 0.75; }
}

.unfed-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.unfed-icon { font-size: 36rpx; }

.unfed-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-main;
  margin-bottom: 6rpx;
}

.unfed-hint {
  display: block;
  font-size: 23rpx;
  color: $text-muted;
}

.arrow-wrap {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  flex-shrink: 0;
}

.arrow-text {
  font-size: 34rpx;
  color: $purple;
  font-weight: 300;
  line-height: 1;
}

/* 成长日记 */
.logs-wrap {
  margin: 24rpx 28rpx 0;
}

.logs-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: $text-main;
  font-family: "Noto Serif SC", serif;
  margin-bottom: 20rpx;
}

.logs-empty-text {
  font-size: 26rpx;
  color: $text-muted;
}

.logs-list {
  display: flex;
  flex-direction: column;
}

.log-item {
  display: flex;
  gap: 18rpx;
  padding-bottom: 28rpx;
}

.log-line-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 4rpx;
}

.log-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.log-line {
  flex: 1;
  width: 2rpx;
  background: $purple-light;
  margin-top: 6rpx;
}

.log-body { flex: 1; }

.log-date {
  display: block;
  font-size: 21rpx;
  color: $text-muted;
  margin-bottom: 6rpx;
}

.log-note {
  display: block;
  font-size: 26rpx;
  color: $text-main;
  line-height: 1.6;

  &.muted { color: $text-muted; font-style: italic; }
}

/* 喂食弹窗 */
.feed-popup {
  background: $white;
  border-radius: 40rpx 40rpx 0 0;
  padding: 20rpx 36rpx 80rpx;
}

.popup-handle {
  width: 64rpx;
  height: 7rpx;
  border-radius: 7rpx;
  background: #DDD8E8;
  margin: 0 auto 36rpx;
}

.popup-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: $text-main;
  text-align: center;
  margin-bottom: 28rpx;
  font-family: "Noto Serif SC", serif;
}

.feed-textarea {
  width: 100%;
  height: 200rpx;
  background: #F8F5FC;
  border-radius: 20rpx;
  padding: 22rpx;
  font-size: 28rpx;
  color: $text-main;
  box-sizing: border-box;
  line-height: 1.7;
  border: 1rpx solid $purple-light;
}

.feed-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: $text-muted;
  margin-top: 8rpx;
  margin-bottom: 20rpx;
}

.popup-btns {
  display: flex;
  gap: 14rpx;
}

.popup-cancel {
  flex: 1;
  height: 92rpx;
  border-radius: 46rpx;
  background: $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active { opacity: 0.75; }
}

.popup-cancel-text {
  font-size: 28rpx;
  color: $text-sub;
}

.popup-confirm {
  flex: 2;
  height: 92rpx;
  border-radius: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(123,78,158,0.28);

  &:active { opacity: 0.85; }
}

.popup-confirm-text {
  font-size: 30rpx;
  font-weight: 600;
  color: white;
}
</style>
