<template>
  <view class="share-moments-btn" @click="onClick()">
    <slot>
      <text class="share-moments-text">{{ label }}</text>
    </slot>
  </view>
</template>

<script setup>
import { openShareMoments } from '../utils/shareMoments';

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  label: { type: String, default: '分享到朋友圈' },
});

function onClick() {
  openShareMoments({ title: props.title, subtitle: props.subtitle });
}
</script>

<style scoped lang="scss">
.share-moments-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-moments-text {
  font-size: 28rpx;
  color: #4A8A7A;
  font-weight: 600;
}
</style>
