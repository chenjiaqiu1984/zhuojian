<template>
  <view class="page">
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-blob" />
      <view class="hero-content">
        <text class="hero-eyebrow">正念练习</text>
        <text class="hero-title">呼吸球</text>
        <text class="hero-sub">跟随呼吸节律，让身心回归平静</text>
      </view>
    </view>
    <view class="coming-wrap">
      <view class="coming-circle">
        <text class="coming-emoji">🫧</text>
      </view>
      <text class="coming-title">即将开放</text>
      <text class="coming-desc">正念呼吸球功能正在精心打磨中，敬请期待</text>
    </view>
  </view>
</template>

<script setup></script>

<style scoped lang="scss">
$bg: #F5F7F6;
$text-1: #1C2A27;
$text-muted: #9BBCB4;

.page {
  min-height: 100vh;
  background: $bg;
}

.hero {
  position: relative;
  padding: 96rpx 48rpx 80rpx;
  overflow: hidden;
  background: linear-gradient(155deg, #4A7A9E 0%, #2A4E7A 100%);
}

.hero-glow {
  position: absolute;
  top: -160rpx;
  right: -120rpx;
  width: 560rpx;
  height: 480rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, transparent 66%);
  pointer-events: none;
}

.hero-blob {
  position: absolute;
  bottom: -80rpx;
  left: -60rpx;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%);
  pointer-events: none;
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
  font-family: "Noto Serif SC", serif;
}

.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.78);
  line-height: 1.9;
  letter-spacing: 0.03em;
}

.coming-wrap {
  padding: 120rpx 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.coming-circle {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #D0DFF0 0%, #B0C8E8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.coming-emoji { font-size: 80rpx; }

.coming-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: $text-1;
  font-family: "Noto Serif SC", serif;
}

.coming-desc {
  display: block;
  font-size: 26rpx;
  color: $text-muted;
  text-align: center;
  line-height: 1.7;
}
</style>
