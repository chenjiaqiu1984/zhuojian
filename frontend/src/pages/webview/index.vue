<template>
  <web-view v-if="src" :src="src" />
  <view v-else class="empty">
    <view class="empty-text">链接无效</view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const src = ref('');

onLoad((query) => {
  const raw = query?.url ? decodeURIComponent(String(query.url)) : '';
  src.value = raw.startsWith('http') ? raw : '';
});
</script>

<style scoped>
.empty {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7f6;
}
.empty-text {
  font-size: 28rpx;
  color: #617870;
}
</style>
