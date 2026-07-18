<script setup>
import { onLaunch } from '@dcloudio/uni-app';
import { useUserStore } from './store/user';

onLaunch(() => {
  const store = useUserStore();
  store.init();
});
</script>

<template>
</template>

<style lang="scss">
@import 'uview-plus/index.scss';

// ── Google Fonts: Playfair Display ──
// #ifdef H5
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');
// #endif

page {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  background: $zj-bg;
  font-family: $zj-font-body;
  overflow-x: clip;
}

// 防横向滚动（H5）
// #ifdef H5
html, body {
  overflow-x: clip;
}
// #endif

// 全局键盘焦点环
*:focus-visible {
  outline: 2px solid $zj-teal;
  outline-offset: 2px;
}

// 减少动画（无障碍）
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
