<template>
  <view class="island-page" :style="{ height: viewH + 'px' }">
    <IslandMap :height="viewH" @navigate="onNavigate" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import IslandMap from '../../components/IslandMap.vue';

const TAB_PATHS = new Set([
  '/pages/index/index',
  '/pages/consultants/index',
  '/pages/ohcard/index',
  '/pages/assessment/index',
  '/pages/profile/index',
]);

const viewH = ref(600);

onLoad(() => {
  // 回到首页岛模式，保留底部 Tab
  try { uni.setStorageSync('zj_open_island', '1'); } catch (e) {}
  uni.switchTab({ url: '/pages/index/index' });
});

function onNavigate(url) {
  if (TAB_PATHS.has(url)) uni.switchTab({ url });
  else uni.navigateTo({ url });
}
</script>

<style scoped>
.island-page {
  width: 100%;
  background: #d7e8ef;
}
</style>
