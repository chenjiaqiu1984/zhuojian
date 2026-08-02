<template>
  <view class="island-hero" :class="customClass">
    <image
      class="island-hero__bg"
      :src="resolvedSrc"
      mode="aspectFill"
      :lazy-load="false"
    />
    <!-- App/小程序原生 video 会盖住按钮；与 IslandMap 一致，仅 H5 叠循环底图 -->
    <!-- #ifdef H5 -->
    <video
      v-if="videoActive"
      class="island-hero__video"
      :class="{ 'island-hero__video--ready': videoPlaying }"
      :src="resolvedVideo"
      :poster="resolvedSrc"
      autoplay
      loop
      muted
      :controls="false"
      :show-center-play-btn="false"
      :show-play-btn="false"
      :show-fullscreen-btn="false"
      :show-progress="false"
      :show-loading="false"
      :enable-progress-gesture="false"
      :show-mute-btn="false"
      object-fit="cover"
      playsinline
      webkit-playsinline
      @error="onVideoError"
      @play="onVideoPlay"
    />
    <!-- #endif -->
    <view class="island-hero__dim" />
    <view class="island-hero__body">
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { remoteUrl } from '../config';

// 小程序默认样式隔离会导致插槽里的 .hero-* 吃不到组件内样式；文案样式已放 App.vue 全局
defineOptions({
  options: {
    styleIsolation: 'shared',
  },
});

const props = defineProps({
  src: { type: String, required: true },
  /** 可选循环底图视频（远程路径，如 /static/island/entry.mp4）；失败回退静图 */
  video: { type: String, default: '' },
  customClass: { type: String, default: '' },
});

// 大图/视频走后端域名，避免打进小程序主包（2MB 限制）
const resolvedSrc = computed(() => remoteUrl(props.src));
const resolvedVideo = computed(() => (props.video ? remoteUrl(props.video) : ''));

const videoFailed = ref(false);
const videoPlaying = ref(false);
const videoActive = computed(() => !videoFailed.value && !!resolvedVideo.value);

function onVideoError() {
  videoFailed.value = true;
  videoPlaying.value = false;
}

function onVideoPlay() {
  videoPlaying.value = true;
}
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
.island-hero__video {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  display: block;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.45s ease;
}
.island-hero__video--ready {
  opacity: 1;
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
