<template>
  <view class="island-hero" :class="customClass">
    <image
      class="island-hero__bg"
      :src="resolvedSrc"
      mode="aspectFill"
      :lazy-load="false"
    />
    <view class="island-hero__dim" />
    <view class="island-hero__body">
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { remoteUrl } from '../config';

// 小程序默认样式隔离会导致插槽里的 .hero-* 吃不到组件内样式；文案样式已放 App.vue 全局
defineOptions({
  options: {
    styleIsolation: 'shared',
  },
});

const props = defineProps({
  src: { type: String, required: true },
  customClass: { type: String, default: '' },
});

// 大图走后端域名，避免打进小程序主包（2MB 限制）
const resolvedSrc = computed(() => remoteUrl(props.src));
</script>

<style scoped lang="scss">
.island-hero {
  position: relative;
  overflow: hidden;
  background: $zj-teal-dark;
  padding: 96rpx 48rpx 80rpx;
}
.island-hero__bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  display: block;
}
.island-hero__dim {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  background: linear-gradient(
    165deg,
    rgba(26, 46, 53, 0.28) 0%,
    rgba(58, 110, 128, 0.38) 45%,
    rgba(26, 46, 53, 0.45) 100%
  );
}
.island-hero__body {
  position: relative;
  z-index: 2;
}
</style>
