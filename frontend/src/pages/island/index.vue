<template>
  <view class="island-page" :style="{ height: viewH + 'px' }">
    <IslandMap :height="viewH" @navigate="onNavigate" />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import IslandMap from '../../components/IslandMap.vue';

const viewH = ref(600);

onLoad(() => {
  // 回到首页岛模式，保留底部 Tab
  try { uni.setStorageSync('zj_open_island', '1'); } catch (e) {}
  uni.switchTab({ url: '/pages/index/index' });
});

function onNavigate() {
  // 跳转已在 IslandMap 内同步完成，此处仅保留接口兼容
}
</script>

<style scoped>
.island-page {
  width: 100%;
  background: #d7e8ef;
}
</style>
