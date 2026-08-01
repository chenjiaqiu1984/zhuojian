<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { useUserStore } from './store/user';
import { patchH5TabBarIcons, scheduleH5TabBarIcons } from './utils/tabBarIcons';
import ShareMomentsModal from './components/ShareMomentsModal.vue';

onLaunch(() => {
  // App 端 view 层读 locale 为 null 会白屏/跳转失败
  try {
    if (typeof uni.setLocale === 'function') uni.setLocale('zh-Hans');
  } catch {}
  const store = useUserStore();
  store.init();
  patchH5TabBarIcons();
  scheduleH5TabBarIcons();
  // showShareMenu 仅微信小程序支持；App 调用会抛 TypeError 中断启动
  // #ifdef MP-WEIXIN
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });
  // #endif
});

onShow(() => {
  scheduleH5TabBarIcons();
});
</script>

<template>
  <!-- 小程序等非 H5：App 可挂全局弹窗；H5 由 shareMoments.ensureShareMomentsHost 挂到 body -->
  <!-- #ifndef H5 -->
  <ShareMomentsModal />
  <!-- #endif -->
</template>

<style lang="scss">
@import 'uview-plus/index.scss';

// 不引用 fonts.googleapis.com：国内常触发 net::ERR_SSL_PROTOCOL_ERROR，且与业务无关
// Playfair 不可用时回退到 tokens 中的 Noto Serif SC / 系统衬线

page {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  background: $zj-bg;
  font-family: $zj-font-body;
  overflow-x: clip;
}

/* IslandHero 插槽文案：放全局，避免小程序组件样式隔离导致排版失效 */
.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}
.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.34em;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 28rpx;
}
.hero-title {
  display: block;
  font-size: 66rpx;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.06em;
  line-height: 1.18;
  margin-bottom: 24rpx;
  font-family: $zj-font-display;
}
.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.9;
  letter-spacing: 0.03em;
}

// 防横向滚动（H5 / App WebView）
// #ifdef H5 || APP-PLUS
html, body {
  overflow-x: clip;
}
uni-canvas {
  display: block;
  max-width: 100%;
  overflow: hidden;
}
// #endif

// 全局键盘焦点环
// #ifdef H5
*:focus-visible {
  outline: 2px solid $zj-teal;
  outline-offset: 2px;
}
// #endif

// 减少动画（无障碍）
// #ifdef H5
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
// #endif
</style>
