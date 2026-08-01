<template>
  <view class="island-map" :style="{ height: viewH + 'px' }">
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
        <image
          class="island-img"
          :src="imgSrc"
          mode="scaleToFill"
          :style="{ width: imgW + 'px', height: imgH + 'px' }"
          @error="onImgError"
        />
        <!-- App 原生 video 会盖住 WebView，且挂载/循环时常闪黑；小程序同理已关闭 -->
        <!-- #ifdef H5 -->
        <video
          v-if="videoActive"
          id="islandMistVideo"
          class="island-video"
          :class="{ 'island-video--ready': videoPlaying }"
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
        <!-- #endif -->

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
            <view class="marker-label-text">{{ spot.name }}</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="enterMist" class="enter-mist">
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

    <view v-if="panelSpot" class="intro-mask">
      <view class="intro-mask-backdrop" @tap="closePanel()" />
      <view class="intro-card">
        <view class="intro-place">{{ panelSpot.place }} · {{ panelSpot.tip }}</view>
        <view class="intro-name">{{ panelSpot.name }}</view>
        <view class="intro-line" />
        <view class="intro-desc">{{ panelSpot.desc }}</view>
        <view class="intro-actions">
          <view class="intro-btn intro-btn--ghost" @tap="closePanel()">
            <view class="intro-btn-ghost-text">再逛逛</view>
          </view>
          <view class="intro-btn intro-btn--primary" @tap="goPanel()">
            <view class="intro-btn-primary-text">{{ panelSpot.cta }}</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 顶栏/备案放最后，保证可点击 -->
    <view class="island-brand">
      <image class="island-brand-logo" :src="LOGO_SRC" mode="aspectFit" />
    </view>
    <view v-if="showBack" class="island-toolbar">
      <view class="island-chip" @tap="onAboutTap()">
        <view class="island-chip-text">关于我们</view>
      </view>
      <view class="island-chip" @tap="onBackTap()">
        <view class="island-chip-text">进入主页</view>
      </view>
    </view>
    <view v-if="showBack && !panelSpot" class="island-beian">
      <view class="island-beian-pill">
        <view class="island-beian-text" @tap="onIcpTap()">苏ICP备2026043098号</view>
        <view class="island-beian-sep">·</view>
        <image class="island-beian-icon" :src="BEIAN_SRC" mode="aspectFit" @tap="onBeianTap()" />
        <view class="island-beian-text" @tap="onBeianTap()">苏公网安备32010402002563号</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { getWindowSize } from '../utils/windowSize';
import { islandApi } from '../api/index';
import { DEFAULT_ISLAND_SPOTS, normalizeIslandSpots } from '../utils/islandSpots';
import { normalizeIslandUrl, pageNav } from '../utils/islandNav';
import { openIcp, openBeian } from '../utils/openBeian';
import { staticUrl, remoteUrl } from '../config';

const props = defineProps({
  height: { type: Number, default: 0 },
  showBack: { type: Boolean, default: false },
});

const emit = defineEmits(['navigate', 'icp', 'beian']);

const IMG_RATIO = 768 / 1376;
const IMG_JPG = remoteUrl('/static/island/island-mist.jpg');
const VIDEO_MP4 = remoteUrl('/static/island/island-mist.mp4');
const LOGO_SRC = staticUrl('/static/logo.jpg');
const BEIAN_SRC = staticUrl('/static/beian.png');

const spots = ref(normalizeIslandSpots(DEFAULT_ISLAND_SPOTS));

async function loadSpots() {
  try {
    const data = await islandApi.get();
    const next = normalizeIslandSpots(data?.spots);
    // 配置未变时不替换引用，避免热点节点整表重绘闪一下
    if (JSON.stringify(next) === JSON.stringify(spots.value)) return;
    spots.value = next;
  } catch (e) {
    // silent fallback
  }
}

const cloudShow = ref(false);
const enterMist = ref(true);
const activeId = ref('');
const viewH = ref(500);
const imgW = ref(375);
const imgH = ref(Math.round(375 / IMG_RATIO));
const offsetX = ref(0);
const offsetY = ref(0);
const imgSrc = ref(IMG_JPG);
const videoSrc = ref(VIDEO_MP4);
const videoFailed = ref(false);
const videoPlaying = ref(false);
const panelSpot = ref(null);

// H5：入场雾散去后叠视频；弹窗打开时仍保留节点，避免反复挂载闪一下
const videoActive = computed(() => (
  !videoFailed.value
  && !enterMist.value
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
  viewH.value = h;

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
  if (enterMist.value) return;
  activeId.value = spot.id;
  panelSpot.value = spot;
}

function onAboutTap() {
  // 与热区一致：点击回调里同步跳转
  pageNav('/pages/about/index');
  emit('navigate', '/pages/about/index');
}

function onBackTap() {
  // 进入功能导航主页（非 Tab）
  pageNav('/pages/home/index');
  emit('navigate', '/pages/home/index');
}

function onIcpTap() {
  openIcp();
  emit('icp');
}

function onBeianTap() {
  openBeian();
  emit('beian');
}

function closePanel() {
  panelSpot.value = null;
  activeId.value = '';
}

function goPanel() {
  const spot = panelSpot.value;
  if (!spot) return;
  const url = normalizeIslandUrl(spot.url);
  if (!url) {
    uni.showToast({ title: '暂未配置跳转页面', icon: 'none' });
    return;
  }
  panelSpot.value = null;
  activeId.value = '';
  // 小程序须在点击回调里同步跳转
  pageNav(url);
  emit('navigate', url);
}

let enterMistTimer = null;
let enterMistPlayed = false;

function playEnterMist() {
  // 同一次页面生命周期只播一次，避免 Tab 来回切换反复白雾闪屏
  if (enterMistPlayed) {
    enterMist.value = false;
    return;
  }
  enterMistPlayed = true;
  enterMist.value = true;
  if (enterMistTimer) clearTimeout(enterMistTimer);
  enterMistTimer = setTimeout(() => {
    enterMist.value = false;
    enterMistTimer = null;
  }, 1400);
}

onMounted(() => {
  layout();
  playEnterMist();
  loadSpots();
});
watch(() => props.height, (h, prev) => {
  if (Math.abs((h || 0) - (prev || 0)) < 2) return;
  layout();
});
</script>

<style scoped lang="scss">
.island-map {
  position: relative;
  width: 100%;
  background: #d7e8ef;
  overflow: hidden;
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
  position: relative;
  z-index: 0;
}

.island-video {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.45s ease;
}
.island-video--ready {
  opacity: 1;
}

.hotspot {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.marker {
  position: relative;
  width: 20rpx;
  height: 20rpx;
  z-index: 2;
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
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50% { transform: scale(1.35); opacity: 0.22; }
}

.enter-mist {
  position: absolute;
  inset: 0;
  z-index: 45;
  pointer-events: none;
  opacity: 1;
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

.intro-mask {
  position: absolute;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 36rpx 48rpx;
  box-sizing: border-box;
}

.intro-mask-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(26, 46, 53, 0.38);
}

.intro-card {
  position: relative;
  z-index: 1;
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

.island-brand {
  position: absolute;
  top: 12rpx;
  left: 20rpx;
  z-index: 400;
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

.island-toolbar {
  position: absolute;
  top: 16rpx;
  right: 20rpx;
  z-index: 400;
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
}

.island-beian {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 400;
  display: flex;
  justify-content: center;
  padding: 0 16rpx 4rpx;
  pointer-events: none;
}
.island-beian-pill {
  pointer-events: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
  max-width: 100%;
  padding: 8rpx 18rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.65);
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
  color: rgba(28, 42, 39, 0.82);
  white-space: nowrap;
  font-family: $zj-font-serif;
  letter-spacing: 0.04em;
  &:active { opacity: 0.75; }
}

.cloud {
  position: absolute;
  width: 160%;
  height: 60%;
  border-radius: 50%;
  filter: blur(32px);
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.95) 0%, rgba(197, 221, 232, 0.72) 42%, transparent 72%);
}
.cloud-a { top: -18%; left: -55%; animation: drift-a 0.85s ease-in forwards; }
.cloud-b { top: 18%; left: -60%; height: 65%; animation: drift-b 0.85s ease-in forwards; }
.cloud-c { bottom: -18%; left: -50%; animation: drift-c 0.85s ease-in forwards; }
.cloud-d { top: 8%; left: -70%; height: 70%; opacity: 0.85; animation: drift-b 0.95s ease-in forwards; }

@keyframes drift-a { from { transform: translateX(0); } to { transform: translateX(70%); } }
@keyframes drift-b { from { transform: translateX(0); } to { transform: translateX(85%); } }
@keyframes drift-c { from { transform: translateX(0); } to { transform: translateX(75%); } }
@keyframes rain-fall { from { transform: translateY(0); opacity: 0.55; } to { transform: translateY(120vh); opacity: 0; } }
@keyframes mist-drift { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(-8%) scale(1.05); opacity: 0.15; } }
@keyframes mist-drift-rev { from { transform: translateX(0) scale(1.05); opacity: 0.85; } to { transform: translateX(6%) scale(1.12); opacity: 0.1; } }
</style>
