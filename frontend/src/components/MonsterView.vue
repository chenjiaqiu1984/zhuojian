<template>
  <view class="monster-view">
    <image
      v-for="slot in visibleSlots"
      :key="slot"
      class="mv-part"
      :class="{ 'mv-active': slot === activeSlot }"
      :src="partUrl(slot, parts[slot])"
      mode="widthFix"
      :style="styleOf(slot)"
    />
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { LAYER_ORDER, layoutOf, partUrl } from '@/utils/monsterParts';

const props = defineProps({
  // 部件对象 { body, eyes, nose, mouth, horn, wing, tail, glasses, transforms }
  parts: { type: Object, default: () => ({}) },
  // 当前选中高亮的槽位（编辑器用）
  activeSlot: { type: String, default: '' },
});

const visibleSlots = computed(() => LAYER_ORDER.filter(s => props.parts && props.parts[s]));

function styleOf(slot) {
  const l = layoutOf(slot, props.parts.transforms);
  return [
    `left:${l.left}%`,
    `top:${l.top}%`,
    `width:${l.width}%`,
    `z-index:${l.z}`,
    `transform:translate(-50%,-50%) rotate(${l.rot}deg)`,
  ].join(';');
}
</script>

<style scoped lang="scss">
.monster-view {
  position: relative;
  width: 100%;
  height: 100%;
}

.mv-part {
  position: absolute;
  height: auto;
  /* widthFix：高度按宽自适应 */
}

.mv-active {
  outline: 2rpx dashed rgba(123,78,158,0.9);
  outline-offset: 2rpx;
}
</style>
