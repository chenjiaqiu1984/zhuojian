<template>
  <view class="page">
    <view class="coming-wrap">
      <text class="coming-title">画布功能开发中</text>
      <text class="coming-desc">心情：{{ mood || '未选择' }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const mood = ref('');

onMounted(() => {
  const pages = getCurrentPages();
  const cur = pages[pages.length - 1];
  mood.value = cur?.options?.mood || '';
});
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
