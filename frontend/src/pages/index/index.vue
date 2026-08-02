<template>
  <view class="island-page">
    <IslandMap
      :height="islandH"
      show-back
      @navigate="onIslandNav"
      @icp="openIcp"
      @beian="openBeian"
    />
    <TermsConfirmModal ref="termsModalRef" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import TermsConfirmModal from '../../components/TermsConfirmModal.vue';
import IslandMap from '../../components/IslandMap.vue';
import { getWindowSize } from '../../utils/windowSize';
import { openIcp, openBeian } from '../../utils/openBeian';
import { runDailyGate } from '../../utils/dailyGate';

// #ifndef H5
import { buildTimelineShare } from '../../utils/mpShare';

defineOptions({
  onShareAppMessage() {
    return { title: '卓见心理 — 专业心理服务平台', path: '/pages/index/index' };
  },
  onShareTimeline() {
    return buildTimelineShare('卓见心理 — 一对一咨询 · 心理测评 · 自助工具');
  },
});
// #endif

const termsModalRef = ref(null);
const islandH = ref(500);

function calcIslandH() {
  const { windowHeight } = getWindowSize();
  const next = Math.max(320, windowHeight || 600);
  // 忽略 1px 级抖动，避免反复改尺寸触发重排闪烁
  if (Math.abs(next - islandH.value) < 2) return;
  islandH.value = next;
}

function onIslandNav() {
  // 跳转已在 IslandMap 内同步完成
}

async function maybeDailyGate() {
  // 冷启动 / 当日首次进入：未抽卡则去自动抽卡；已抽过留在心镜岛
  const result = await runDailyGate({ onDrawn: 'stay' });
  if (result !== 'daily') {
    setTimeout(() => { termsModalRef.value?.check(); }, 400);
  }
}

onShow(() => {
  uni.setNavigationBarTitle({ title: '心镜岛' });
  calcIslandH();
  maybeDailyGate();
});

onMounted(() => {
  calcIslandH();
  uni.setNavigationBarTitle({ title: '心镜岛' });
  setTimeout(() => calcIslandH(), 50);
});
</script>

<style scoped lang="scss">
.island-page {
  width: 100%;
  background: #d7e8ef;
  overflow: hidden;
}
</style>
