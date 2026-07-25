<template>
  <view class="bgm-root">
    <!-- 浮动圆钮：单击切换播放；长按打开选曲 -->
    <view
      class="bgm-fab"
      :class="{ playing: playing }"
      :style="{ bottom: bottom + 'rpx' }"
      @click="onFabTap()"
      @longpress="openPanel()"
    >
      <text class="bgm-fab-icon">{{ playing ? '♪' : '♫' }}</text>
      <view v-if="playing" class="bgm-fab-ring" />
    </view>

    <!-- 选曲面板 -->
    <view v-if="showPanel" class="bgm-mask" @click="closePanel()">
      <view class="bgm-panel" :class="{ dark: dark }" @click.stop="noop()">
        <view class="bgm-panel-handle" />
        <text class="bgm-panel-title" :style="{ color: accent }">背景音乐</text>
        <text class="bgm-panel-hint">点选曲目试听 · 也可点右下角按钮播放/暂停</text>

        <view class="bgm-track-list">
          <view
            v-for="t in tracks"
            :key="t.key"
            class="bgm-track"
            :class="{ active: currentKey === t.key }"
            :style="currentKey === t.key ? { borderColor: accent, background: accent + '1F' } : {}"
            @click="onPickTrack(t.key)"
          >
            <text class="bgm-track-name">{{ t.name }}</text>
            <text
              v-if="currentKey === t.key && playing"
              class="bgm-track-state"
              :style="{ color: accent }"
            >播放中</text>
            <text
              v-else-if="currentKey === t.key"
              class="bgm-track-state muted"
            >已选</text>
          </view>
        </view>

        <!-- 音量 -->
        <view class="bgm-vol-row">
          <text class="bgm-vol-label">音量</text>
          <slider
            class="bgm-vol-slider"
            :value="Math.round(volume * 100)"
            :min="0"
            :max="100"
            :activeColor="accent"
            block-size="18"
            @changing="onVol"
            @change="onVol"
          />
        </view>

        <view class="bgm-actions">
          <view class="bgm-btn" :style="{ background: accent }" @click="onToggle()">
            <text class="bgm-btn-text">{{ loading ? '加载中…' : (playing ? '暂停' : '播放') }}</text>
          </view>
          <view class="bgm-btn ghost" @click="closePanel()">
            <text class="bgm-btn-text ghost-text" :style="{ color: accent }">收起</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { useBgm } from '@/composables/useBgm';

const props = defineProps({
  // 空字符串 = 使用曲目列表第一首
  defaultTrack: { type: String, default: '' },
  accent: { type: String, default: '#7B4E9E' },
  dark: { type: Boolean, default: false },
  bottom: { type: Number, default: 180 },
});

const bgm = useBgm({ defaultTrack: props.defaultTrack, volume: 0.6 });
const playing = bgm.playing;
const currentKey = bgm.currentKey;
const volume = bgm.volume;
const loading = bgm.loading;
const lastError = bgm.lastError;
const tracks = bgm.tracks;
const showPanel = ref(false);

function noop() {}

function openPanel() {
  showPanel.value = true;
}

function closePanel() {
  showPanel.value = false;
}

async function onFabTap() {
  // 单击：切换播放；未选曲时自动播第一首
  const ok = await bgm.toggle();
  if (!ok && lastError.value) {
    uni.showToast({ title: lastError.value, icon: 'none' });
    showPanel.value = true;
  }
}

async function onPickTrack(key) {
  const ok = await bgm.play(key);
  if (!ok) {
    uni.showToast({ title: lastError.value || '播放失败', icon: 'none' });
  }
}

async function onToggle() {
  const ok = await bgm.toggle();
  if (!ok && lastError.value) {
    uni.showToast({ title: lastError.value, icon: 'none' });
  }
}

function onVol(e) {
  bgm.setVolume((e.detail?.value || 0) / 100);
}

defineExpose({ bgm });
</script>

<style scoped lang="scss">
/* 浮动圆钮 */
.bgm-fab {
  position: fixed;
  right: 28rpx;
  width: 92rpx;
  height: 92rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.bgm-fab:active {
  transform: scale(0.92);
}
.bgm-fab.playing {
  background: #ffffff;
}

.bgm-fab-icon {
  font-size: 40rpx;
  line-height: 1;
  color: #7b4e9e;
}

/* 旋转光环 */
.bgm-fab-ring {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  bottom: -6rpx;
  left: -6rpx;
  border-radius: 50%;
  border: 3rpx solid rgba(123, 78, 158, 0.5);
  border-top-color: rgba(123, 78, 158, 0.95);
  animation: bgm-spin 2.4s linear infinite;
}
@keyframes bgm-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 选曲面板 */
.bgm-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 300;
  display: flex;
  align-items: flex-end;
}

.bgm-panel {
  width: 100%;
  border-radius: 32rpx 32rpx 0 0;
  padding: 16rpx 32rpx 60rpx;
  background: #ffffff;
  box-sizing: border-box;
}
.bgm-panel.dark {
  background: #1a2c3d;
}

.bgm-panel-handle {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: rgba(150, 150, 150, 0.35);
  margin: 0 auto 24rpx;
}

.bgm-panel-title {
  display: block;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 8rpx;
}

.bgm-panel-hint {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: #999;
  margin-bottom: 24rpx;
}

.bgm-track-list {
  display: flex;
  flex-direction: column;
  margin-bottom: 24rpx;
}

.bgm-track {
  display: flex;
  align-items: center;
  padding: 22rpx 24rpx;
  margin-bottom: 12rpx;
  border-radius: 18rpx;
  background: rgba(123, 78, 158, 0.06);
  border: 2rpx solid transparent;
  box-sizing: border-box;
}
.bgm-track:last-child {
  margin-bottom: 0;
}
.bgm-track:active {
  opacity: 0.75;
}

.bgm-track-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}
.bgm-panel.dark .bgm-track-name {
  color: #eef4f2;
}

.bgm-track-state {
  font-size: 20rpx;
  font-weight: 600;
  margin-left: 18rpx;
}
.bgm-track-state.muted {
  color: #999;
  font-weight: 400;
}

.bgm-vol-row {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.bgm-vol-label {
  font-size: 24rpx;
  color: #666;
  width: 80rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
}
.bgm-vol-slider {
  flex: 1;
}

.bgm-actions {
  display: flex;
}
.bgm-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
}
.bgm-btn:last-child {
  margin-right: 0;
}
.bgm-btn:active {
  opacity: 0.85;
}
.bgm-btn.ghost {
  background: rgba(123, 78, 158, 0.1);
}
.bgm-btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
.bgm-btn-text.ghost-text {
  color: #7b4e9e;
}
</style>
