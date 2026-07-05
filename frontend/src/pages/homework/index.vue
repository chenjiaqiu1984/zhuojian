<template>
  <view class="page">
    <view class="tool-card" @click="nav('/pages/homework/mood')">
      <view class="icon-wrap" style="background:#4A8A7A">
        <text class="icon-text">📓</text>
      </view>
      <view class="info">
        <text class="name">情绪日记</text>
        <text class="desc">每日记录情绪变化，追踪心理状态</text>
      </view>
      <text class="arrow">›</text>
    </view>
    <view class="tool-card" @click="nav('/pages/homework/cbt')">
      <view class="icon-wrap" style="background:#3A6E80">
        <text class="icon-text">🧠</text>
      </view>
      <view class="info">
        <text class="name">认知记录表（CBT）</text>
        <text class="desc">识别并重构负性自动想法</text>
      </view>
      <text class="arrow">›</text>
    </view>
    <view class="tool-card" @click="nav('/pages/homework/dream')">
      <view class="icon-wrap" style="background:#5A4A7A">
        <text class="icon-text">🌙</text>
      </view>
      <view class="info">
        <text class="name">梦的工作记录</text>
        <text class="desc">记录梦境、自由联想与治疗师解释</text>
      </view>
      <text class="arrow">›</text>
    </view>
    <view class="tool-card" @click="nav('/pages/homework/iceberg')">
      <view class="icon-wrap" style="background:#2A5A7A">
        <text class="icon-text">🏔</text>
      </view>
      <view class="info">
        <text class="name">冰山模型自我分析</text>
        <text class="desc">探索规条背后的感受、期待与渴望</text>
      </view>
      <text class="arrow">›</text>
    </view>
    <view class="tool-card" @click="nav('/pages/homework/rule')">
      <view class="icon-wrap" style="background:#7A4A3A">
        <text class="icon-text">📜</text>
      </view>
      <view class="info">
        <text class="name">规条转换练习</text>
        <text class="desc">将刚性规条改写为有弹性的生活原则</text>
      </view>
      <text class="arrow">›</text>
    </view>
  </view>
</template>

<script setup>
function nav(url) { uni.navigateTo({ url }); }
</script>

<style scoped lang="scss">
.page { padding: 24rpx; background: #F5F7F6; min-height: 100vh; }
.tool-card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 20rpx; display: flex; align-items: center; gap: 24rpx; }
.icon-wrap { width: 96rpx; height: 96rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-text { font-size: 44rpx; }
.info { flex: 1; }
.name { font-size: 32rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 8rpx; }
.desc { font-size: 24rpx; color: #617870; line-height: 1.5; }
.arrow { font-size: 40rpx; color: #9BBCB4; }
</style>
