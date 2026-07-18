<template>
  <view class="page">
    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-blob" />
      <view class="hero-content">
        <text class="hero-eyebrow">正念冥想</text>
        <text class="hero-title">曼达拉</text>
        <text class="hero-sub">用色彩与图案探索内心的平静与秩序</text>
      </view>
      <!-- 音乐控制 -->
      <view class="music-btn" @click="toggleMusic">
        <view class="music-icon" :class="{ playing: isPlaying }">
          <view class="bar b1" />
          <view class="bar b2" />
          <view class="bar b3" />
          <view class="bar b4" />
        </view>
        <text class="music-label">{{ isPlaying ? '暂停音乐' : '播放音乐' }}</text>
      </view>
    </view>

    <!-- 引导词 -->
    <view class="guide-section">
      <view class="guide-card" v-for="(item, i) in guideItems" :key="i" :class="`card-${i}`">
        <view class="guide-icon-wrap">
          <text class="guide-icon">{{ item.icon }}</text>
        </view>
        <view class="guide-text-wrap">
          <text class="guide-title">{{ item.title }}</text>
          <text class="guide-desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 情绪签到 -->
    <view class="mood-section">
      <text class="section-title">你现在感觉如何？</text>
      <text class="section-sub">选择此刻最贴近你的心情</text>
      <view class="mood-row">
        <view
          v-for="m in moods" :key="m.key"
          class="mood-item"
          :class="{ selected: selectedMood === m.key }"
          @click="selectedMood = m.key"
        >
          <text class="mood-emoji">{{ m.emoji }}</text>
          <text class="mood-label">{{ m.label }}</text>
        </view>
      </view>
    </view>

    <!-- 开始按钮 -->
    <view class="cta-section">
      <view class="cta-btn" @click="onStart">
        <text class="cta-text">开始创作</text>
        <text class="cta-arrow">→</text>
      </view>
      <view class="gallery-btn" @click="onGallery">
        <text class="gallery-text">我的画廊</text>
      </view>
    </view>

    <!-- 底部留白 -->
    <view style="height: 60rpx;" />
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// 免版权背景音乐（Pixabay）
const MUSIC_LIST = [
  {
    title: '冥想颂钵',
    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_1e5a7cb82c.mp3',
  },
  {
    title: '自然钢琴',
    url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    title: '禅意流水',
    url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c518c3e5e6.mp3',
  },
];

const guideItems = [
  {
    icon: '🌿',
    title: '放慢呼吸',
    desc: '找一个安静的地方，轻闭双眼，深吸一口气，感受此刻的宁静。',
  },
  {
    icon: '🎨',
    title: '随心填色',
    desc: '没有对错，没有评判。选择让你感到舒适的颜色，让笔触自由流淌。',
  },
  {
    icon: '✨',
    title: '专注当下',
    desc: '将注意力带入每一笔的轨迹，感受色彩与内心情绪的流动与共鸣。',
  },
];

const moods = [
  { key: 'happy',   emoji: '😊', label: '快乐' },
  { key: 'calm',    emoji: '😌', label: '平静' },
  { key: 'sad',     emoji: '😢', label: '悲伤' },
  { key: 'angry',   emoji: '😡', label: '愤怒' },
  { key: 'anxious', emoji: '😨', label: '焦虑' },
];

const selectedMood = ref('');
const isPlaying = ref(false);
let audioCtx = null;
let currentTrack = 0;

function createAudio() {
  if (audioCtx) return;
  audioCtx = uni.createInnerAudioContext();
  audioCtx.loop = true;
  audioCtx.src = MUSIC_LIST[currentTrack].url;
  audioCtx.onEnded(() => {
    currentTrack = (currentTrack + 1) % MUSIC_LIST.length;
    audioCtx.src = MUSIC_LIST[currentTrack].url;
    audioCtx.play();
  });
  audioCtx.onError((e) => {
    console.warn('音频加载失败', e);
    isPlaying.value = false;
  });
}

function toggleMusic() {
  createAudio();
  if (isPlaying.value) {
    audioCtx.pause();
    isPlaying.value = false;
  } else {
    audioCtx.play();
    isPlaying.value = true;
  }
}

function onStart() {
  uni.navigateTo({
    url: `/pages/mandala/draw?mood=${selectedMood.value}`,
  });
}

function onGallery() {
  uni.navigateTo({ url: '/pages/mandala/gallery' });
}

onUnmounted(() => {
  if (audioCtx) {
    audioCtx.stop();
    audioCtx.destroy();
    audioCtx = null;
  }
  isPlaying.value = false;
});
</script>

<style scoped lang="scss">
$teal: #3A6E80;
$teal-dark: #1E5870;
$bg: #F5F7F6;
$text-1: #1C2A27;
$text-muted: #9BBCB4;
$card-bg: #FFFFFF;

.page {
  min-height: 100vh;
  background: $bg;
}

/* ── Hero ── */
.hero {
  position: relative;
  padding: 96rpx 48rpx 88rpx;
  overflow: hidden;
  background: linear-gradient(155deg, #3A7E8A 0%, #1E5870 100%);
}

.hero-glow {
  display: none;
}

.hero-blob {
  display: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.34em;
  color: rgba(255,255,255,0.65);
  margin-bottom: 28rpx;
}

.hero-title {
  display: block;
  font-size: 66rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 0.06em;
  line-height: 1.18;
  margin-bottom: 24rpx;
  font-family: $zj-font-display;
}

.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.78);
  line-height: 1.9;
  letter-spacing: 0.03em;
}

/* 音乐按钮 */
.music-btn {
  position: relative;
  z-index: 1;
  margin-top: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  cursor: pointer;
}

.music-icon {
  display: flex;
  align-items: flex-end;
  gap: 3rpx;
  height: 28rpx;

  .bar {
    width: 5rpx;
    border-radius: 3rpx;
    background: rgba(255,255,255,0.7);
    animation: none;
  }
  .b1 { height: 12rpx; }
  .b2 { height: 20rpx; }
  .b3 { height: 16rpx; }
  .b4 { height: 24rpx; }

  &.playing .b1 { animation: bar1 0.8s ease-in-out infinite alternate; }
  &.playing .b2 { animation: bar2 0.9s ease-in-out infinite alternate; }
  &.playing .b3 { animation: bar3 0.7s ease-in-out infinite alternate; }
  &.playing .b4 { animation: bar4 1.0s ease-in-out infinite alternate; }
}

@keyframes bar1 { from { height: 8rpx; } to { height: 22rpx; } }
@keyframes bar2 { from { height: 16rpx; } to { height: 28rpx; } }
@keyframes bar3 { from { height: 10rpx; } to { height: 20rpx; } }
@keyframes bar4 { from { height: 18rpx; } to { height: 28rpx; } }

.music-label {
  font-size: 22rpx;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.05em;
}

/* ── 引导词 ── */
.guide-section {
  padding: 48rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.guide-card {
  background: $zj-card-bg;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  box-shadow: 0 2rpx 16rpx rgba(58,110,128,0.07);
  transition: box-shadow 0.2s $zj-ease-out, transform 0.2s $zj-ease-out;

  &:hover { transform: translateY(-2rpx); box-shadow: $zj-shadow-card-hover; }
  &:active { transform: scale(0.98); }
}

.guide-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8F4F0 0%, #C8E4DC 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.guide-icon {
  font-size: 36rpx;
}

.guide-text-wrap {
  flex: 1;
}

.guide-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-1;
  margin-bottom: 8rpx;
}

.guide-desc {
  display: block;
  font-size: 24rpx;
  color: #5A8080;
  line-height: 1.75;
}

/* ── 情绪签到 ── */
.mood-section {
  margin: 40rpx 32rpx 0;
  background: $card-bg;
  border-radius: 28rpx;
  padding: 36rpx 28rpx;
  box-shadow: 0 2rpx 16rpx rgba(58,110,128,0.07);
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $text-1;
  margin-bottom: 8rpx;
}

.section-sub {
  display: block;
  font-size: 24rpx;
  color: $text-muted;
  margin-bottom: 28rpx;
}

.mood-row {
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
}

.mood-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 4rpx;
  border-radius: 20rpx;
  border: 2rpx solid transparent;
  background: #F5F7F6;
  transition: all 0.2s;

  &.selected {
    background: linear-gradient(135deg, #E0F2EE 0%, #C6E8DF 100%);
    border-color: #3A7E8A;
  }

  &:active { transform: scale(0.94); }
}

.mood-emoji {
  font-size: 40rpx;
}

.mood-label {
  font-size: 20rpx;
  color: #5A8080;
  letter-spacing: 0.05em;
}

/* ── CTA ── */
.cta-section {
  margin: 40rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.cta-btn {
  height: 100rpx;
  border-radius: 50rpx;
  background: linear-gradient(135deg, #3A7E8A 0%, #1E5870 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 10rpx 32rpx rgba(30,88,112,0.30);

  &:active { transform: scale(0.97); }
}

.cta-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 0.06em;
}

.cta-arrow {
  font-size: 32rpx;
  color: rgba(255,255,255,0.75);
}

.gallery-btn {
  height: 88rpx;
  border-radius: 44rpx;
  border: 2rpx solid #C0D8DC;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active { transform: scale(0.97); }
}

.gallery-text {
  font-size: 28rpx;
  color: $teal;
  letter-spacing: 0.05em;
}
</style>
