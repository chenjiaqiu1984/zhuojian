<template>
  <view class="island-hero" :class="customClass">
    <image class="island-hero__bg" :src="src" mode="aspectFill" />
    <view class="island-hero__dim" />
    <view class="island-hero__body">
      <slot />
    </view>
  </view>
</template>

<script setup>
defineProps({
  src: { type: String, required: true },
  customClass: { type: String, default: '' },
});
</script>

<style scoped lang="scss">
.island-hero {
  position: relative;
  overflow: hidden;
  background: #3a6e80;
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
  /* 淡遮罩，露出岛图细节 */
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
