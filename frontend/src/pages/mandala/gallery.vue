<template>
  <view class="page">
    <view class="coming-wrap">
      <text class="coming-title">我的画廊</text>
      <text class="coming-desc">暂无作品，快去创作第一幅吧</text>
    </view>
  </view>
</template>

<script setup>
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F5F7F6;
  display: flex;
  align-items: center;
  justify-content: center;
}
.coming-wrap {
  text-align: center;
  padding: 60rpx;
}
.coming-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #1C2A27;
  margin-bottom: 16rpx;
}
.coming-desc {
  display: block;
  font-size: 26rpx;
  color: #9BBCB4;
}
</style>
