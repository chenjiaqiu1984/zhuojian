<template>
  <view class="island-map" :style="{ height: viewH + 'px' }">
    <!-- #ifdef MP-WEIXIN -->
    <cover-view class="island-brand island-brand--cover">
      <cover-image class="island-brand-logo" :src="LOGO_SRC" />
    </cover-view>
    <cover-view v-if="showBack" class="island-toolbar island-toolbar--cover">
      <cover-view class="island-chip island-chip--cover" @click="emit('navigate', '/pages/about/index')">
        <cover-view class="island-chip-text">关于我们</cover-view>
      </cover-view>
      <cover-view class="island-chip island-chip--cover" @click="emit('back')">
        <cover-view class="island-chip-text">进入主页</cover-view>
      </cover-view>
    </cover-view>
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <view class="island-brand">
      <image class="island-brand-logo" :src="LOGO_SRC" mode="aspectFit" />
    </view>
    <view v-if="showBack" class="island-toolbar">
      <view class="island-chip" @click="emit('navigate', '/pages/about/index')">
        <text class="island-chip-text">关于我们</text>
      </view>
      <view class="island-chip" @click="emit('back')">
        <text class="island-chip-text">进入主页</text>
      </view>
    </view>
    <!-- #endif -->

    <!-- 一屏等比缩放，不滚动 -->
    <view class="island-stage">
      <view
        class="island-canvas"
        :style="{
          width: imgW + 'px',
          height: imgH + 'px',
          left: offsetX + 'px',
          top: offsetY + 'px',
        }"
      >
        <!-- 静态封面：加载中 / 视频失败 / 弹层时兜底 -->
        <image
          class="island-img"
          :src="imgSrc"
          mode="scaleToFill"
          :style="{ width: imgW + 'px', height: imgH + 'px' }"
          @error="onImgError"
        />
        <!-- 循环短视频底图（远程，不占主包） -->
        <video
          v-if="videoActive"
          id="islandMistVideo"
          class="island-video"
          :src="videoSrc"
          :poster="imgSrc"
          :style="{ width: imgW + 'px', height: imgH + 'px' }"
          autoplay
          loop
          muted
          :controls="false"
          :show-center-play-btn="false"
          :show-play-btn="false"
          :show-fullscreen-btn="false"
          :show-progress="false"
          :show-loading="false"
          :enable-progress-gesture="false"
          :show-mute-btn="false"
          object-fit="fill"
          playsinline
          webkit-playsinline
          @error="onVideoError"
          @play="onVideoPlay"
        />

        <!-- #ifdef MP-WEIXIN -->
        <!-- 视频为原生组件，热区需 cover-view 才能点到 -->
        <cover-view
          v-for="spot in spots"
          :key="'cv-' + spot.id"
          class="hotspot hotspot--cover"
          :class="{ 'hotspot--active': activeId === spot.id }"
          :style="spotHitStyle(spot)"
          @click.stop="onSpot(spot)"
        >
          <cover-view class="marker marker--cover">
            <cover-view class="marker-core marker-core--cover" />
          </cover-view>
          <cover-view
            class="marker-label marker-label--cover"
            :class="'marker-label--' + (spot.labelSide || 'bottom')"
          >
            <cover-view class="marker-label-text">{{ spot.name }}</cover-view>
          </cover-view>
        </cover-view>
        <!-- #endif -->

        <!-- #ifndef MP-WEIXIN -->
        <view
          v-for="spot in spots"
          :key="spot.id"
          class="hotspot"
          :class="{ 'hotspot--active': activeId === spot.id }"
          :style="spotHitStyle(spot)"
          @click.stop="onSpot(spot)"
        >
          <view class="marker">
            <view class="marker-ring" />
            <view class="marker-core" />
          </view>
          <view
            class="marker-label"
            :class="'marker-label--' + (spot.labelSide || 'bottom')"
          >
            <text class="marker-label-text">{{ spot.name }}</text>
          </view>
        </view>
        <!-- #endif -->
      </view>
    </view>

    <!-- 功能介绍弹窗 -->
    <view v-if="panelSpot" class="intro-mask" @click="closePanel">
      <view class="intro-card" @click.stop>
        <text class="intro-place">{{ panelSpot.place }} · {{ panelSpot.tip }}</text>
        <text class="intro-name">{{ panelSpot.name }}</text>
        <view class="intro-line" />
        <text class="intro-desc">{{ panelSpot.desc }}</text>
        <view class="intro-actions">
          <view class="intro-btn intro-btn--ghost" @click="closePanel">
            <text class="intro-btn-ghost-text">再逛逛</text>
          </view>
          <view class="intro-btn intro-btn--primary" @click="goPanel">
            <text class="intro-btn-primary-text">{{ panelSpot.cta }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 进入：雨雾淡出，显出心镜岛 -->
    <view class="enter-mist" :class="{ 'enter-mist--hide': !enterMist }">
      <view class="enter-mist-layer enter-mist-layer--a" />
      <view class="enter-mist-layer enter-mist-layer--b" />
      <view class="enter-rain">
        <view v-for="n in 12" :key="n" class="rain-drop" :style="rainStyle(n)" />
      </view>
    </view>

    <view class="cloud-mask" :class="{ 'cloud-mask--show': cloudShow }">
      <view class="cloud cloud-a" />
      <view class="cloud cloud-b" />
      <view class="cloud cloud-c" />
      <view class="cloud cloud-d" />
    </view>

    <!-- 备案号叠在图上 -->
    <!-- #ifdef MP-WEIXIN -->
    <cover-view v-if="showBack" class="island-beian island-beian--cover">
      <cover-view class="island-beian-pill island-beian-pill--cover">
        <cover-view class="island-beian-text" @click="emit('icp')">苏ICP备2026043098号</cover-view>
        <cover-view class="island-beian-sep">·</cover-view>
        <cover-view class="island-beian-text" @click="emit('beian')">苏公网安备32010402002563号</cover-view>
      </cover-view>
    </cover-view>
    <!-- #endif -->
    <!-- #ifndef MP-WEIXIN -->
    <view v-if="showBack" class="island-beian">
      <view class="island-beian-pill">
        <text class="island-beian-text" @click.stop="emit('icp')">苏ICP备2026043098号</text>
        <text class="island-beian-sep">·</text>
        <image class="island-beian-icon" :src="BEIAN_SRC" mode="aspectFit" @click.stop="emit('beian')" />
        <text class="island-beian-text" @click.stop="emit('beian')">苏公网安备32010402002563号</text>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { getWindowSize } from '../utils/windowSize';
import { islandApi } from '../api/index';
import { DEFAULT_ISLAND_SPOTS, normalizeIslandSpots } from '../utils/islandSpots';
import { staticUrl, remoteUrl } from '../config';

const props = defineProps({
  height: { type: Number, default: 0 },
  showBack: { type: Boolean, default: false },
});

const emit = defineEmits(['navigate', 'back', 'icp', 'beian']);

/** 竖版原图宽/高 */
const IMG_RATIO = 768 / 1376;
const IMG_JPG = staticUrl('/static/island/island-mist.jpg');
const VIDEO_MP4 = remoteUrl('/static/island/island-mist.mp4');
const LOGO_SRC = staticUrl('/static/logo.jpg');
const BEIAN_SRC = staticUrl('/static/beian.png');

const spots = ref(normalizeIslandSpots(DEFAULT_ISLAND_SPOTS));

async function loadSpots() {
  try {
    const data = await islandApi.get();
    spots.value = normalizeIslandSpots(data?.spots);
  } catch (e) {
    // silent fallback to defaults
  }
}

const cloudShow = ref(false);
const enterMist = ref(true);
const activeId = ref('');
const viewH = ref(500);
const viewW = ref(375);
const imgW = ref(375);
const imgH = ref(Math.round(375 / IMG_RATIO));
const offsetX = ref(0);
const offsetY = ref(0);
const navigating = ref(false);
const imgSrc = ref(IMG_JPG);
const videoSrc = ref(VIDEO_MP4);
const videoFailed = ref(false);
const videoPlaying = ref(false);
const panelSpot = ref(null);

/** 弹层/转场时关掉原生 video，避免挡住 view；失败时只留静图 */
const videoActive = computed(() => (
  !videoFailed.value
  && !enterMist.value
  && !panelSpot.value
  && !cloudShow.value
  && !!videoSrc.value
));


function rainStyle(n) {
  const left = 4 + (n * 7.5) % 92;
  const delay = ((n * 0.13) % 1.2).toFixed(2);
  const dur = (0.9 + (n % 5) * 0.12).toFixed(2);
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${dur}s`,
  };
}

function layout() {
  const { windowWidth, windowHeight } = getWindowSize();
  const winW = windowWidth || 375;
  const h = props.height > 0 ? props.height : (windowHeight || 600);
  viewW.value = winW;
  viewH.value = h;

  // contain：整图缩进一屏，不裁切、不滚动
  let w = winW;
  let ih = w / IMG_RATIO;
  if (ih > h) {
    ih = h;
    w = ih * IMG_RATIO;
  }
  imgW.value = Math.round(w);
  imgH.value = Math.round(ih);
  offsetX.value = Math.round((winW - w) / 2);
  offsetY.value = Math.round((h - ih) / 2);
}

function onImgError() {
  uni.showToast({ title: '岛图加载失败', icon: 'none' });
}

function onVideoError() {
  videoFailed.value = true;
  videoPlaying.value = false;
}

function onVideoPlay() {
  videoPlaying.value = true;
}

function spotHitStyle(spot) {
  const hit = spot.hit || 10;
  return {
    left: `${spot.cx - hit}%`,
    top: `${spot.cy - hit}%`,
    width: `${hit * 2}%`,
    height: `${hit * 2}%`,
  };
}

function onSpot(spot) {
  if (navigating.value || enterMist.value) return;
  activeId.value = spot.id;
  panelSpot.value = spot;
}

function closePanel() {
  panelSpot.value = null;
  activeId.value = '';
}

function goPanel() {
  const spot = panelSpot.value;
  if (!spot || navigating.value) return;
  navigating.value = true;
  panelSpot.value = null;
  cloudShow.value = true;
  // 云雾遮满后再跳转
  setTimeout(() => {
    emit('navigate', spot.url);
    setTimeout(() => {
      cloudShow.value = false;
      activeId.value = '';
      navigating.value = false;
    }, 400);
  }, 720);
}

function playEnterMist() {
  enterMist.value = true;
  setTimeout(() => {
    enterMist.value = false;
  }, 1400);
}

onMounted(() => {
  layout();
  playEnterMist();
  loadSpots();
});
watch(() => props.height, layout);
</script>

<style scoped lang="scss">
.island-map {
  position: relative;
  width: 100%;
  background: #d7e8ef;
  overflow: hidden;
}

.island-brand {
  position: absolute;
  top: 12rpx;
  left: 20rpx;
  z-index: 10;
  width: 96rpx;
  height: 96rpx;
  border-radius: 22rpx;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4rpx 12rpx rgba(28, 42, 39, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}
.island-brand-logo {
  width: 82rpx;
  height: 82rpx;
}
.island-brand--cover {
  overflow: hidden;
}

.island-toolbar {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
}
.island-chip {
  padding: 8rpx 20rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.65);
  &:active { opacity: 0.75; }
}
.island-chip-text {
  font-size: 22rpx;
  color: rgba(28, 42, 39, 0.82);
  letter-spacing: 0.08em;
  text-shadow: 0 1rpx 2rpx rgba(255, 255, 255, 0.55);
}
.island-chip--cover {
  display: inline-block;
}

.island-beian {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16rpx;
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 0 16rpx;
  pointer-events: none;
}
.island-beian-pill {
  pointer-events: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  max-width: 100%;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 4rpx 14rpx rgba(28, 42, 39, 0.12);
}
.island-beian-icon {
  width: 22rpx;
  height: 22rpx;
  flex-shrink: 0;
}
.island-beian-sep {
  font-size: 18rpx;
  color: rgba(28, 42, 39, 0.45);
  flex-shrink: 0;
}
.island-beian-text {
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #1c2a27;
  white-space: nowrap;
  font-family: $zj-font-serif;
  &:active { opacity: 0.7; }
}
.island-beian--cover {
  pointer-events: auto;
}
.island-beian-pill--cover {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.island-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.island-canvas {
  position: absolute;
  overflow: hidden;
}

.island-img {
  display: block;
  vertical-align: top;
  position: relative;
  z-index: 0;
}

.island-video {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  /* 避免抢点击：热区在上层 / cover-view */
  pointer-events: none;
}

.hotspot {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hotspot--cover {
  /* cover-view 布局能力有限，用绝对定位热区 */
  display: block;
}

.marker {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  z-index: 2;
}

.marker--cover {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20rpx;
  height: 20rpx;
  margin-left: -10rpx;
  margin-top: -10rpx;
}

.marker-core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12rpx;
  height: 12rpx;
  margin: -6rpx 0 0 -6rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.62);
  border: 2rpx solid rgba(74, 138, 122, 0.7);
  box-shadow: 0 2rpx 8rpx rgba(28, 42, 39, 0.18);
}

.marker-core--cover {
  left: 4rpx;
  top: 4rpx;
  margin: 0;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.75);
  border: 2rpx solid rgba(74, 138, 122, 0.75);
}

.marker-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 22rpx;
  height: 22rpx;
  margin: -11rpx 0 0 -11rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(255, 255, 255, 0.38);
  animation: marker-breathe 2.4s ease-in-out infinite;
}

.hotspot--active .marker-core {
  background: rgba(74, 138, 122, 0.8);
  border-color: rgba(255, 255, 255, 0.9);
}

.marker-label {
  position: absolute;
  z-index: 3;
  pointer-events: none;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 4rpx 14rpx rgba(28, 42, 39, 0.12);
  backdrop-filter: blur(6px);
}

.marker-label--cover {
  pointer-events: none;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  background-color: rgba(255, 255, 255, 0.7);
}
.marker-label-text {
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #1c2a27;
  white-space: nowrap;
  font-family: $zj-font-serif;
}

.marker-label--bottom {
  top: calc(50% + 18rpx);
  left: 50%;
  transform: translateX(-50%);
}
.marker-label--top {
  bottom: calc(50% + 18rpx);
  left: 50%;
  transform: translateX(-50%);
}
.marker-label--left {
  right: calc(50% + 18rpx);
  top: 50%;
  transform: translateY(-50%);
}
.marker-label--right {
  left: calc(50% + 18rpx);
  top: 50%;
  transform: translateY(-50%);
}

@keyframes marker-breathe {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.7); opacity: 0.12; }
}

/* 介绍弹窗 */
.intro-mask {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(26, 46, 53, 0.38);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 36rpx 48rpx;
  box-sizing: border-box;
}

.intro-card {
  width: 100%;
  max-width: 640rpx;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 28rpx;
  padding: 40rpx 36rpx 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(28, 42, 39, 0.16);
  box-sizing: border-box;
}

.intro-place {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.28em;
  color: #9bbcb4;
  margin-bottom: 12rpx;
}

.intro-name {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #1c2a27;
  letter-spacing: 0.16em;
  font-family: $zj-font-serif;
  margin-bottom: 20rpx;
}

.intro-line {
  width: 48rpx;
  height: 3rpx;
  background: linear-gradient(90deg, #4a8a7a, transparent);
  margin-bottom: 22rpx;
}

.intro-desc {
  display: block;
  font-size: 26rpx;
  line-height: 1.75;
  color: #4a5751;
  letter-spacing: 0.04em;
  margin-bottom: 36rpx;
}

.intro-actions {
  display: flex;
  gap: 20rpx;
}

.intro-btn {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 44rpx;
  &:active { opacity: 0.88; }
}

.intro-btn--ghost {
  background: #f5f7f6;
  border: 1rpx solid #e8efed;
}
.intro-btn-ghost-text {
  font-size: 26rpx;
  color: #617870;
  letter-spacing: 0.08em;
}

.intro-btn--primary {
  background: linear-gradient(135deg, #4a8a7a, #3a6e80);
  box-shadow: 0 8rpx 20rpx rgba(74, 138, 122, 0.28);
}
.intro-btn-primary-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.1em;
}

.cloud-mask {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.45s ease;
  overflow: hidden;
}
.cloud-mask--show {
  opacity: 1;
  pointer-events: auto;
}

.cloud {
  position: absolute;
  width: 160%;
  height: 60%;
  border-radius: 50%;
  filter: blur(32px);
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(197, 221, 232, 0.72) 42%, transparent 72%);
}
.cloud-a {
  top: -18%;
  left: -55%;
  animation: drift-a 0.85s ease-in forwards;
}
.cloud-b {
  top: 18%;
  left: -60%;
  height: 65%;
  animation: drift-b 0.85s ease-in forwards;
}
.cloud-c {
  bottom: -18%;
  left: -50%;
  animation: drift-c 0.85s ease-in forwards;
}
.cloud-d {
  top: 8%;
  left: -70%;
  height: 70%;
  opacity: 0.85;
  animation: drift-b 0.95s ease-in forwards;
}

@keyframes drift-a {
  from { transform: translateX(0); }
  to { transform: translateX(70%); }
}
@keyframes drift-b {
  from { transform: translateX(0); }
  to { transform: translateX(85%); }
}
@keyframes drift-c {
  from { transform: translateX(0); }
  to { transform: translateX(75%); }
}

/* 进入雨雾 */
.enter-mist {
  position: absolute;
  inset: 0;
  z-index: 45;
  pointer-events: none;
  opacity: 1;
  transition: opacity 1.1s ease;
}
.enter-mist--hide {
  opacity: 0;
}
.enter-mist-layer {
  position: absolute;
  inset: -10%;
  background: radial-gradient(ellipse at 50% 40%, rgba(255, 255, 255, 0.82) 0%, rgba(215, 232, 239, 0.75) 40%, rgba(197, 221, 232, 0.55) 70%, transparent 100%);
  filter: blur(18px);
}
.enter-mist-layer--a {
  animation: mist-drift 1.4s ease-out forwards;
}
.enter-mist-layer--b {
  opacity: 0.7;
  transform: scale(1.1);
  animation: mist-drift-rev 1.4s ease-out forwards;
}
.enter-rain {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.rain-drop {
  position: absolute;
  top: -12%;
  width: 2rpx;
  height: 56rpx;
  border-radius: 2rpx;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation-name: rain-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes rain-fall {
  from { transform: translateY(0); opacity: 0.55; }
  to { transform: translateY(120vh); opacity: 0; }
}
@keyframes mist-drift {
  from { transform: translateY(0) scale(1); opacity: 1; }
  to { transform: translateY(-8%) scale(1.05); opacity: 0.15; }
}
@keyframes mist-drift-rev {
  from { transform: translateX(0) scale(1.05); opacity: 0.85; }
  to { transform: translateX(6%) scale(1.12); opacity: 0.1; }
}
</style>
