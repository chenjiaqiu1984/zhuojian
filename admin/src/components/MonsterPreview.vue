<template>
  <div class="monster-preview" :style="{ background: bg }">
    <template v-if="mode === 'parts'">
      <img
        v-for="slot in visibleSlots"
        :key="slot"
        class="mv-part"
        :src="partUrl(slot, parts[slot])"
        :style="styleOf(slot)"
        alt=""
      />
      <div v-if="!visibleSlots.length" class="mv-empty">暂无部件数据</div>
    </template>
    <canvas v-else ref="canvasEl" class="mv-canvas" />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted } from 'vue';
import { LAYER_ORDER, layoutOf, partUrl, parseParts, renderMonsterCanvas } from '../utils/monsterParts.js';

const props = defineProps({
  drawingData: { type: [String, Object], default: null },
  drawingType: { type: String, default: 'parts' },
  color: { type: String, default: '#7B4E9E' },
  size: { type: Number, default: 280 },
});

const canvasEl = ref(null);
const parts = computed(() => parseParts(props.drawingData));
const mode = computed(() => {
  if (props.drawingType === 'canvas') return 'canvas';
  if (parts.value?.type === 'canvas' || parts.value?.paths) return 'canvas';
  return 'parts';
});
const visibleSlots = computed(() => LAYER_ORDER.filter((s) => parts.value && parts.value[s]));
const bg = computed(() => `${props.color || '#7B4E9E'}15`);

function styleOf(slot) {
  const l = layoutOf(slot, parts.value.transforms);
  return {
    left: `${l.left}%`,
    top: `${l.top}%`,
    width: `${l.width}%`,
    zIndex: l.z,
    transform: `translate(-50%, -50%) rotate(${l.rot}deg)`,
  };
}

async function paintCanvas() {
  if (mode.value !== 'canvas') return;
  await nextTick();
  if (!canvasEl.value) return;
  renderMonsterCanvas(canvasEl.value, props.drawingData || parts.value, props.size);
}

watch(() => [props.drawingData, props.drawingType, props.size], paintCanvas, { deep: true });
onMounted(paintCanvas);
</script>

<style scoped>
.monster-preview {
  position: relative;
  width: v-bind('size + "px"');
  height: v-bind('size + "px"');
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}
.mv-part {
  position: absolute;
  height: auto;
  pointer-events: none;
  user-select: none;
}
.mv-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.mv-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
}
</style>
