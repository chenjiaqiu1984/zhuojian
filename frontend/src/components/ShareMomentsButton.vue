<template>
  <view class="share-moments-btn" @click="onClick()">
    <slot>
      <text class="share-moments-text">{{ label }}</text>
    </slot>
  </view>
  <!-- #ifndef H5 -->
  <ShareMomentsModal />
  <!-- #endif -->
</template>

<script setup>
import { openShareMoments } from '../utils/shareMoments';
// #ifndef H5
import ShareMomentsModal from './ShareMomentsModal.vue';
// #endif

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  label: { type: String, default: '分享到朋友圈' },
  kind: { type: String, default: '' },
  cards: { type: Array, default: () => [] },
  assessment: { type: Object, default: null },
});

function onClick() {
  openShareMoments({
    title: props.title,
    subtitle: props.subtitle,
    kind: props.kind || undefined,
    cards: props.cards,
    assessment: props.assessment,
  });
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
