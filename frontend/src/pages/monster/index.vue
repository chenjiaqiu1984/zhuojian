<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-blob" />
      <view class="hero-content">
        <text class="hero-eyebrow">情绪探索</text>
        <text class="hero-title">怪兽小屋</text>
        <text class="hero-sub">画出内心的小怪兽，每天陪它慢慢长大</text>
      </view>
    </view>

    <!-- 小屋房间背景装饰 -->
    <view class="room-scene">
      <view class="room-wall" />
      <view class="room-floor" />
      <view class="room-deco room-deco-window">
        <view class="window-frame">
          <view class="window-pane" />
          <view class="window-cross-h" />
          <view class="window-cross-v" />
          <view class="window-curtain-l" />
          <view class="window-curtain-r" />
        </view>
        <view class="window-sill" />
      </view>
      <view class="room-deco room-deco-shelf">
        <view class="shelf-board" />
        <view class="shelf-item shelf-item-1" />
        <view class="shelf-item shelf-item-2" />
        <view class="shelf-item shelf-item-3" />
      </view>
      <view class="room-deco room-deco-plant">
        <view class="plant-pot" />
        <view class="plant-stem" />
        <view class="plant-leaf plant-leaf-l" />
        <view class="plant-leaf plant-leaf-r" />
        <view class="plant-leaf plant-leaf-top" />
      </view>
      <view class="room-deco room-deco-rug" />
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="state-wrap">
      <view class="skeleton-card" v-for="i in 4" :key="i">
        <view class="skeleton-visual" />
        <view class="skeleton-line w60" />
        <view class="skeleton-line w40" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="monsters.length === 0" class="empty-wrap fade-in">
      <view class="empty-circle">
        <ZjIcon class="empty-emoji" name="paw-print" :size="96" color="#9BBCB4" />
      </view>
      <text class="empty-title">小屋还空着</text>
      <text class="empty-desc">创建你的第一只怪兽，让它住进来吧</text>
      <view class="empty-btn" @click="goCreate">
        <text class="empty-btn-text">创建我的第一只怪兽</text>
      </view>
    </view>

    <!-- 怪兽网格 -->
    <view v-else class="grid-wrap fade-in">
      <view
        class="monster-card"
        v-for="(m, idx) in monsters"
        :key="m.id"
        @click="goDetail(m.id)"
      >
        <!-- 已喂食标记 -->
        <view v-if="isFedToday(m.lastFedAt)" class="fed-badge">
          <text class="fed-badge-text">今日已喂</text>
        </view>

        <!-- 怪兽视觉区 -->
        <view class="card-visual" :style="{ background: `${m.color}15` }">
          <view class="card-glow" :style="{ background: `radial-gradient(circle at 50% 60%, ${m.color}25 0%, transparent 68%)` }" />

          <!-- 地板阴影 -->
          <view class="card-shadow" :style="{ background: `radial-gradient(ellipse, ${m.color}20 0%, transparent 70%)` }" />

          <!-- 浮动怪兽容器 -->
          <view class="float-wrap" :class="`float-${idx % 3}`" :style="{ filter: growthFilter(m.totalDays) }">
            <!-- 部件拼装 -->
            <view v-if="m.drawingType === 'parts'" class="parts-preview">
              <image v-if="partsOf(m).body"  class="pp-body"  :src="`/static/monster/body/${partsOf(m).body}.svg`"   mode="aspectFit" />
              <image v-if="partsOf(m).tail"  class="pp-tail"  :src="`/static/monster/tail/${partsOf(m).tail}.svg`"   mode="aspectFit" />
              <image v-if="partsOf(m).horn"  class="pp-horn"  :src="`/static/monster/horn/${partsOf(m).horn}.svg`"   mode="aspectFit" />
              <image v-if="partsOf(m).eyes"  class="pp-eyes"  :src="`/static/monster/eyes/${partsOf(m).eyes}.svg`"   mode="aspectFit" />
              <image v-if="partsOf(m).mouth" class="pp-mouth" :src="`/static/monster/mouth/${partsOf(m).mouth}.svg`" mode="aspectFit" />
            </view>
            <!-- Canvas 手绘（缩略） -->
            <view v-else class="canvas-thumb">
              <canvas :canvas-id="`thumb-${m.id}`" :id="`thumb-${m.id}`" class="thumb-canvas" />
            </view>
          </view>
        </view>

        <!-- 信息区 -->
        <view class="card-info">
          <text class="card-name">{{ m.name }}</text>
          <view class="card-meta">
            <view class="emotion-tag" :style="{ background: `${m.color}18`, color: m.color }">
              <text class="emotion-tag-text">{{ m.emotion }}</text>
            </view>
            <view v-if="m.streak > 0" class="streak-wrap">
              <ZjIcon class="streak-icon" name="flame" :size="24" color="#4A8A7A" />
              <text class="streak-text">{{ m.streak }} 天</text>
            </view>
            <text v-else class="streak-text">尚未签到</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: growthPct(m.totalDays) + '%', background: m.color }" />
          </view>
          <text class="progress-label">{{ growthStage(m.totalDays) }}</text>
        </view>
      </view>
    </view>

    <!-- FAB 新建按钮 -->
    <view v-if="!loading && monsters.length > 0" class="fab" @click="goCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { monsterApi } from '@/api';
import ZjIcon from '../../components/ZjIcon.vue';

const monsters = ref([]);
const loading = ref(true);

onMounted(async () => {
  await load();
});

async function load() {
  loading.value = true;
  try {
    monsters.value = await monsterApi.list();
    await nextTick();
    monsters.value.forEach(m => {
      if (m.drawingType === 'canvas') drawThumb(m);
    });
  } catch (e) {
    if (e.__authRedirect) return;
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function drawThumb(m) {
  try {
    const data = JSON.parse(m.drawingData);
    if (!data.paths) return;
    const ctx = uni.createCanvasContext(`thumb-${m.id}`);
    ctx.fillStyle = '#FDFAFF';
    ctx.fillRect(0, 0, 280, 280);
    const scale = 280 / 600;
    for (const path of data.paths) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path.points[0].x * scale, path.points[0].y * scale);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x * scale, path.points[i].y * scale);
      }
      ctx.stroke();
    }
    ctx.draw();
  } catch {}
}

function partsOf(m) {
  try { return JSON.parse(m.drawingData); } catch { return {}; }
}

function goCreate() { uni.navigateTo({ url: '/pages/monster/create' }); }
function goDetail(id) { uni.navigateTo({ url: `/pages/monster/detail?id=${id}` }); }

function isFedToday(lastFedAt) {
  if (!lastFedAt) return false;
  return new Date(lastFedAt).toDateString() === new Date().toDateString();
}

function growthFilter(days) {
  if (days <= 2) return 'saturate(0) brightness(0.65)';
  if (days <= 6) return 'saturate(0.4)';
  if (days <= 13) return 'saturate(0.8)';
  return 'saturate(1.2) brightness(1.05)';
}

function growthPct(days) { return Math.min(100, Math.round((days / 30) * 100)); }

function growthStage(days) {
  if (days === 0) return '刚刚诞生';
  if (days <= 2) return '灰色幼苗';
  if (days <= 6) return '初显色彩';
  if (days <= 13) return '活力成长';
  return '饱满鲜艳';
}
</script>

<style scoped lang="scss">
$purple: #7B4E9E;
$purple-light: #EDE5F5;
$text-main: #1C1030;
$text-sub: #6A5A8A;
$text-muted: #A898C8;
$bg: #F5F3FA;
$white: #FFFFFF;

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 140rpx;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.3s $zj-ease-out both;
}

/* Hero */
.hero {
  position: relative;
  padding: 96rpx 48rpx 80rpx;
  overflow: hidden;
  background: linear-gradient(155deg, #7B4E9E 0%, #4A2870 100%);
}
.hero-glow {
  display: none;
}
.hero-blob {
  display: none;
}
.hero-content { position: relative; z-index: 1; text-align: center; }
.hero-eyebrow {
  display: block; font-size: 20rpx; letter-spacing: 0.34em;
  color: rgba(255,255,255,0.65); margin-bottom: 28rpx;
}
.hero-title {
  display: block; font-size: 66rpx; font-weight: 600; color: #FFFFFF;
  letter-spacing: 0.06em; line-height: 1.18; margin-bottom: 24rpx;
  font-family: $zj-font-display;
}
.hero-sub {
  display: block; font-size: 26rpx; color: rgba(255,255,255,0.78);
  line-height: 1.9; letter-spacing: 0.03em;
}

/* ── 房间场景 ── */
.room-scene {
  position: relative;
  height: 220rpx;
  margin: 0 28rpx;
  overflow: hidden;
}

.room-wall {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #EFE8F8 0%, #E4D8F2 100%);
  border-radius: 0 0 0 0;
}

.room-floor {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 56rpx;
  background: linear-gradient(180deg, #D6C8EC 0%, #C8B8E4 100%);
  border-top: 2rpx solid rgba(123,78,158,0.15);
}

/* 窗户 */
.room-deco-window {
  position: absolute;
  top: 24rpx;
  left: 40rpx;
}
.window-frame {
  width: 120rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #D4ECFF 0%, #B8DAFF 100%);
  border-radius: 8rpx 8rpx 4rpx 4rpx;
  border: 4rpx solid rgba(123,78,158,0.3);
  position: relative;
  overflow: hidden;
}
.window-pane {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 60%);
}
.window-cross-h {
  position: absolute; top: 50%; left: 0; right: 0;
  height: 3rpx; background: rgba(123,78,158,0.25); transform: translateY(-50%);
}
.window-cross-v {
  position: absolute; left: 50%; top: 0; bottom: 0;
  width: 3rpx; background: rgba(123,78,158,0.25); transform: translateX(-50%);
}
.window-curtain-l {
  position: absolute; top: 0; left: 0; bottom: 0;
  width: 22rpx;
  background: linear-gradient(180deg, #C8A0E0 0%, #B088D0 100%);
  border-radius: 0 0 8rpx 0;
}
.window-curtain-r {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: 22rpx;
  background: linear-gradient(180deg, #C8A0E0 0%, #B088D0 100%);
  border-radius: 0 0 0 8rpx;
}
.window-sill {
  height: 10rpx;
  background: rgba(123,78,158,0.3);
  border-radius: 0 0 6rpx 6rpx;
  width: 132rpx;
  margin-left: -6rpx;
}

/* 搁架 */
.room-deco-shelf {
  position: absolute;
  top: 30rpx;
  right: 36rpx;
}
.shelf-board {
  width: 180rpx;
  height: 12rpx;
  background: linear-gradient(180deg, #C8A8E0 0%, #B090CC 100%);
  border-radius: 4rpx;
  box-shadow: 0 4rpx 8rpx rgba(74,40,112,0.15);
}
.shelf-item {
  position: absolute;
  bottom: 12rpx;
  border-radius: 6rpx 6rpx 3rpx 3rpx;
}
.shelf-item-1 {
  left: 16rpx;
  width: 28rpx; height: 44rpx;
  background: linear-gradient(180deg, #F0A0B0 0%, #D88098 100%);
}
.shelf-item-2 {
  left: 56rpx;
  width: 22rpx; height: 34rpx;
  background: linear-gradient(180deg, #A0C8F0 0%, #78A8D8 100%);
}
.shelf-item-3 {
  left: 90rpx;
  width: 36rpx; height: 52rpx;
  background: linear-gradient(180deg, #A0E0C0 0%, #70C098 100%);
}

/* 植物 */
.room-deco-plant {
  position: absolute;
  bottom: 56rpx;
  right: 44rpx;
}
.plant-pot {
  width: 44rpx; height: 36rpx;
  background: linear-gradient(180deg, #D4956A 0%, #B87040 100%);
  border-radius: 4rpx 4rpx 10rpx 10rpx;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    top: -5rpx; left: -4rpx; right: -4rpx;
    height: 10rpx;
    background: #C08050;
    border-radius: 4rpx;
  }
}
.plant-stem {
  position: absolute;
  bottom: 36rpx; left: 50%;
  width: 4rpx; height: 48rpx;
  background: #5A9A5A;
  transform: translateX(-50%);
}
.plant-leaf {
  position: absolute;
  width: 36rpx; height: 22rpx;
  background: linear-gradient(135deg, #6AB86A 0%, #4A9A4A 100%);
  border-radius: 50% 50% 50% 10%;
}
.plant-leaf-l {
  bottom: 70rpx; left: -30rpx;
  transform: rotate(-40deg);
}
.plant-leaf-r {
  bottom: 64rpx; left: 14rpx;
  transform: rotate(30deg) scaleX(-1);
}
.plant-leaf-top {
  bottom: 84rpx; left: -8rpx;
  transform: rotate(-10deg);
  width: 30rpx; height: 18rpx;
}

/* 地毯 */
.room-deco-rug {
  position: absolute;
  bottom: 56rpx;
  left: 50%; transform: translateX(-50%);
  width: 260rpx; height: 28rpx;
  background: repeating-linear-gradient(
    90deg,
    #C8A0D8 0rpx, #C8A0D8 20rpx,
    #B088C8 20rpx, #B088C8 40rpx,
    #D0B0E0 40rpx, #D0B0E0 60rpx
  );
  border-radius: 14rpx;
  opacity: 0.7;
}

/* 骨架屏 */
.state-wrap {
  padding: 32rpx 28rpx 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx;
}
.skeleton-card {
  background: $white; border-radius: 24rpx;
  padding: 20rpx; display: flex; flex-direction: column; gap: 14rpx;
}
.skeleton-visual {
  width: 100%; height: 180rpx; border-radius: 16rpx;
  background: linear-gradient(90deg, #EDE5F5 25%, #F5EFF9 50%, #EDE5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-line {
  height: 20rpx; border-radius: 10rpx; background: #EDE5F5;
  &.w60 { width: 60%; } &.w40 { width: 40%; }
}

/* 空状态 */
.empty-wrap {
  padding: 80rpx 60rpx 0;
  display: flex; flex-direction: column; align-items: center; gap: 20rpx;
}
.empty-circle {
  width: 160rpx; height: 160rpx; border-radius: 50%;
  background: linear-gradient(135deg, #EDE5F5 0%, #D8C8F0 100%);
  display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx;
}
.empty-emoji { width: 96rpx; }
.empty-title {
  display: block; font-size: 34rpx; font-weight: 700; color: $text-main;
  font-family: "Noto Serif SC", serif;
}
.empty-desc {
  display: block; font-size: 26rpx; color: $text-muted;
  text-align: center; line-height: 1.7;
}
.empty-btn {
  margin-top: 12rpx; padding: 26rpx 56rpx;
  background: linear-gradient(135deg, #7B4E9E 0%, #4A2870 100%);
  border-radius: 50rpx; box-shadow: 0 8rpx 24rpx rgba(123,78,158,0.30);
  transition: opacity 0.2s $zj-ease-out, transform 0.2s $zj-ease-out;
  &:hover { opacity: 0.90; }
  &:active { transform: scale(0.97); }
}
.empty-btn-text { font-size: 28rpx; font-weight: 600; color: white; }

/* 怪兽网格 */
.grid-wrap {
  padding: 24rpx 28rpx 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx;
}

.monster-card {
  background: $zj-card-bg; border-radius: 24rpx; overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(74,40,112,0.08);
  border: 1rpx solid $purple-light; position: relative;
  transition: box-shadow 0.2s $zj-ease-out, transform 0.2s $zj-ease-out;
  &:hover { transform: translateY(-2rpx); box-shadow: 0 8rpx 32rpx rgba(74,40,112,0.16); }
  &:active { transform: scale(0.97); }
}

.fed-badge {
  position: absolute; top: 14rpx; right: 14rpx; z-index: 10;
  background: rgba(255,255,255,0.92); border-radius: 20rpx;
  padding: 6rpx 14rpx; box-shadow: 0 2rpx 8rpx rgba(74,40,112,0.12);
}
.fed-badge-text { font-size: 18rpx; color: $purple; font-weight: 600; }

.card-visual {
  width: 100%; height: 220rpx; position: relative;
  display: flex; align-items: flex-end; justify-content: center;
  overflow: hidden; padding-bottom: 16rpx;
}
.card-glow { position: absolute; inset: 0; pointer-events: none; }

.card-shadow {
  position: absolute;
  bottom: 10rpx; left: 50%; transform: translateX(-50%);
  width: 140rpx; height: 24rpx;
  border-radius: 50%;
  pointer-events: none;
}

/* 浮动动画 */
.float-wrap {
  position: relative; z-index: 2;
  width: 160rpx; height: 160rpx;
  display: flex; align-items: center; justify-content: center;
  transition: filter 0.6s ease;
}

@keyframes float0 {
  0%, 100% { transform: translateY(0rpx); }
  50% { transform: translateY(-12rpx); }
}
@keyframes float1 {
  0%, 100% { transform: translateY(-6rpx); }
  50% { transform: translateY(6rpx); }
}
@keyframes float2 {
  0%, 100% { transform: translateY(-4rpx); }
  50% { transform: translateY(-16rpx); }
}

.float-0 { animation: float0 3.2s ease-in-out infinite; }
.float-1 { animation: float1 3.8s ease-in-out infinite; }
.float-2 { animation: float2 2.9s ease-in-out infinite; }

/* 部件预览 */
.parts-preview {
  width: 160rpx; height: 160rpx; position: relative;
}
.pp-body  { position: absolute; width: 120rpx; height: 120rpx; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.pp-tail  { position: absolute; bottom: 8rpx; right: 4rpx; width: 52rpx; height: 52rpx; }
.pp-horn  { position: absolute; top: 4rpx; left: 50%; transform: translateX(-50%); width: 52rpx; height: 40rpx; }
.pp-eyes  { position: absolute; top: 48rpx; left: 50%; transform: translateX(-50%); width: 100rpx; height: 32rpx; }
.pp-mouth { position: absolute; top: 88rpx; left: 50%; transform: translateX(-50%); width: 80rpx; height: 32rpx; }

/* Canvas 缩略 */
.canvas-thumb {
  width: 140rpx; height: 140rpx;
  border-radius: 16rpx; overflow: hidden;
  background: #FDFAFF;
  border: 1rpx solid $purple-light;
}
.thumb-canvas { width: 140rpx; height: 140rpx; display: block; }

/* 信息区 */
.card-info { padding: 16rpx 18rpx 20rpx; }
.card-name {
  display: block; font-size: 28rpx; font-weight: 700; color: $text-main;
  font-family: "Noto Serif SC", serif; margin-bottom: 10rpx;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-meta { display: flex; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.emotion-tag { border-radius: 10rpx; padding: 4rpx 12rpx; }
.emotion-tag-text { font-size: 20rpx; font-weight: 600; }
.streak-wrap { display: flex; align-items: center; gap: 6rpx; }
.streak-icon { flex-shrink: 0; }
.streak-text { font-size: 20rpx; color: $text-muted; }
.progress-track {
  height: 6rpx; background: $purple-light; border-radius: 6rpx;
  overflow: hidden; margin-bottom: 8rpx;
}
.progress-fill { height: 100%; border-radius: 6rpx; transition: width 0.6s ease; }
.progress-label { display: block; font-size: 19rpx; color: $text-muted; }

/* FAB */
.fab {
  position: fixed; right: 40rpx; bottom: 96rpx;
  width: 104rpx; height: 104rpx; border-radius: 50%;
  background: linear-gradient(135deg, #7B4E9E 0%, #4A2870 100%);
  box-shadow: 0 8rpx 28rpx rgba(123,78,158,0.40);
  display: flex; align-items: center; justify-content: center; z-index: 100;
  transition: opacity 0.2s $zj-ease-out, transform 0.2s $zj-ease-out;
  &:hover { opacity: 0.90; }
  &:active { transform: scale(0.92); }
}
.fab-icon { font-size: 54rpx; color: white; font-weight: 300; line-height: 1; margin-top: -4rpx; }
</style>
