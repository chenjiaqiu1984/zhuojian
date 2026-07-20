<template>
  <view class="bgm-root">
    <!-- 浮动圆钮 -->
    <view class="bgm-fab" :class="{ playing: bgm.playing.value }" :style="`bottom:${bottom}rpx`" @click="onFabTap()">
      <text class="bgm-fab-icon">{{ bgm.playing.value ? '🎵' : '🔇' }}</text>
      <!-- 播放时的旋转光环 -->
      <view v-if="bgm.playing.value" class="bgm-fab-ring" />
    </view>

    <!-- 选曲面板 -->
    <view v-if="showPanel" class="bgm-mask" @click="showPanel = false">
      <view class="bgm-panel" :style="panelStyle" @click.stop>
        <view class="bgm-panel-handle" />
        <text class="bgm-panel-title">背景音乐</text>

        <view class="bgm-track-list">
          <view
            v-for="t in bgm.tracks"
            :key="t.key"
            class="bgm-track"
            :class="{ active: bgm.currentKey.value === t.key }"
            @click="onPickTrack(t.key)"
          >
            <text class="bgm-track-icon">{{ t.icon }}</text>
            <text class="bgm-track-name">{{ t.name }}</text>
            <text v-if="bgm.currentKey.value === t.key && bgm.playing.value" class="bgm-track-state">播放中</text>
            <text v-else-if="bgm.currentKey.value === t.key" class="bgm-track-state muted">已选</text>
          </view>
        </view>

        <!-- 音量 -->
        <view class="bgm-vol-row">
          <text class="bgm-vol-label">🔈 音量</text>
          <slider class="bgm-vol-slider" :value="Math.round(bgm.volume.value * 100)" :min="0" :max="100"
            :activeColor="accent" block-size="18" @changing="e => onVol(e)" @change="e => onVol(e)" />
        </view>

        <view class="bgm-actions">
          <view class="bgm-btn" @click="bgm.toggle()">
            <text class="bgm-btn-text">{{ bgm.playing.value ? '⏸ 暂停' : '▶ 播放' }}</text>
          </view>
          <view class="bgm-btn ghost" @click="showPanel = false">
            <text class="bgm-btn-text ghost-text">收起</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useBgm } from '@/composables/useBgm';

const props = defineProps({
  // 默认曲目
  defaultTrack: { type: String, default: 'meditation' },
  // 主题强调色（跟随所在页面）
  accent: { type: String, default: '#7B4E9E' },
  // 深色面板（呼吸页深色主题用）
  dark: { type: Boolean, default: false },
  // 浮钮距底部距离（rpx），避免与不同页面底部工具栏重叠
  bottom: { type: Number, default: 180 },
});

const bgm = useBgm({ defaultTrack: props.defaultTrack, volume: 0.6 });
const showPanel = ref(false);

const panelStyle = computed(() => props.dark
  ? 'background:#1A2C3D;'
  : 'background:#FFFFFF;');

// 点击浮钮：未展开则展开面板；正在播放时也展开（方便切换/停）
function onFabTap() {
  showPanel.value = true;
}

function onPickTrack(key) {
  bgm.select(key);
  if (!bgm.playing.value) bgm.play(key); // 选择即试听
}

function onVol(e) {
  bgm.setVolume((e.detail.value || 0) / 100);
}

// 暴露给父组件（页面卸载/暂停时可调用）
defineExpose({ bgm });
</script>

<style scoped lang="scss">
.bgm-root { }

/* 浮动圆钮 */
.bgm-fab {
  position: fixed;
  right: 28rpx;
  bottom: 180rpx;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  &:active { transform: scale(0.92); }
  &.playing { background: #FFFFFF; }
}

.bgm-fab-icon { font-size: 40rpx; line-height: 1; }

/* 旋转光环 */
.bgm-fab-ring {
  position: absolute;
  inset: -6rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(123,78,158,0.5);
  border-top-color: rgba(123,78,158,0.95);
  animation: bgm-spin 2.4s linear infinite;
}
@keyframes bgm-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* 选曲面板 */
.bgm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 300;
  display: flex;
  align-items: flex-end;
}

.bgm-panel {
  width: 100%;
  border-radius: 32rpx 32rpx 0 0;
  padding: 16rpx 32rpx 60rpx;
}

.bgm-panel-handle {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: rgba(150,150,150,0.35);
  margin: 0 auto 24rpx;
}

.bgm-panel-title {
  display: block;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #8a7; /* 占位，被下方覆盖 */
  color: #7B4E9E;
  margin-bottom: 24rpx;
}

.bgm-track-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.bgm-track {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 22rpx 24rpx;
  border-radius: 18rpx;
  background: rgba(123,78,158,0.06);
  border: 2rpx solid transparent;
  &.active {
    border-color: rgba(123,78,158,0.6);
    background: rgba(123,78,158,0.12);
  }
  &:active { opacity: 0.75; }
}

.bgm-track-icon { font-size: 36rpx; }
.bgm-track-name { flex: 1; font-size: 28rpx; color: #333; font-weight: 600; }
.bgm-track-state { font-size: 20rpx; color: #7B4E9E; font-weight: 600; }
.bgm-track-state.muted { color: #999; font-weight: 400; }

.bgm-vol-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.bgm-vol-label { font-size: 24rpx; color: #666; width: 110rpx; flex-shrink: 0; }
.bgm-vol-slider { flex: 1; }

.bgm-actions {
  display: flex;
  gap: 16rpx;
}
.bgm-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  background: linear-gradient(135deg, #7B4E9E, #9B6EC0);
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.85; }
  &.ghost { background: rgba(123,78,158,0.1); }
}
.bgm-btn-text { font-size: 28rpx; font-weight: 600; color: #fff; }
.bgm-btn-text.ghost-text { color: #7B4E9E; }
</style>
