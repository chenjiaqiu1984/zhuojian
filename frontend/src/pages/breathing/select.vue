<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="icon-btn" @click="onBack()">
        <text class="icon-text">←</text>
      </view>
      <text class="top-title">正念呼吸</text>
      <view style="width: 64rpx;" />
    </view>

    <!-- Hero -->
    <view class="hero">
      <text class="hero-title">选择你的练习</text>
      <text class="hero-sub">根据当下状态，找到最适合的呼吸方式</text>
    </view>

    <!-- 呼吸课程 -->
    <view class="section">
      <view class="section-label-row">
        <ZjIcon name="sprout" :size="32" color="#4A8A7A" />
        <text class="section-label">场景课程</text>
      </view>
      <text class="section-hint">多段渐进，完整体验</text>
      <view class="program-list">
        <view
          v-for="p in PROGRAMS"
          :key="p.key"
          class="program-card"
          :class="{ selected: selectedType === 'program' && selectedKey === p.key }"
          :style="selectedType === 'program' && selectedKey === p.key ? { borderColor: p.color } : {}"
          @click="select('program', p.key)"
        >
          <view class="program-left">
            <view class="program-icon-wrap" :style="{ background: p.color + '18' }">
              <ZjIcon :name="p.icon" :size="40" :color="p.color" />
            </view>
            <view class="program-info">
              <text class="program-name">{{ p.name }}</text>
              <text class="program-desc">{{ p.desc }}</text>
              <view class="program-tags">
                <text v-for="(s, i) in p.stages" :key="i" class="program-tag">{{ s.label }}</text>
                <text class="program-tag program-tag--time">{{ p.totalMin }}分钟</text>
              </view>
            </view>
          </view>
          <view class="check-circle" :style="selectedType === 'program' && selectedKey === p.key ? { background: p.color, borderColor: p.color } : {}">
            <text v-if="selectedType === 'program' && selectedKey === p.key" class="check-icon">✓</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 单一模式 -->
    <view class="section">
      <view class="section-label-row">
        <ZjIcon name="aperture" :size="32" color="#4A8A7A" />
        <text class="section-label">单一模式</text>
      </view>
      <text class="section-hint">自由练习，随时开始</text>
      <view class="mode-grid">
        <view
          v-for="m in MODES"
          :key="m.key"
          class="mode-card"
          :class="{ selected: selectedType === 'mode' && selectedKey === m.key }"
          :style="selectedType === 'mode' && selectedKey === m.key ? { borderColor: m.color, background: m.color + '12' } : {}"
          @click="select('mode', m.key)"
        >
          <view class="mode-icon-wrap" :style="{ background: m.color + '18' }">
            <ZjIcon :name="m.icon" :size="36" :color="m.color" />
          </view>
          <text class="mode-name">{{ m.name }}</text>
          <text class="mode-desc">{{ m.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 底部开始按钮 -->
    <view class="footer">
      <view
        class="start-btn"
        :class="{ disabled: !selectedKey }"
        :style="selectedKey ? { background: activeColor } : {}"
        @click="onStart()"
      >
        <text class="start-text" @click="onStart()">{{ selectedKey ? '开始练习' : '请先选择练习' }}</text>
        <text v-if="selectedKey" class="start-arrow" @click="onStart()">→</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import ZjIcon from '../../components/ZjIcon.vue';

// #ifndef H5
defineOptions({
  onShareAppMessage() {
    return { title: '我在用卓见心理做正念呼吸练习，一起来放松吧', path: '/pages/breathing/select' };
  },
  onShareTimeline() {
    return { title: '卓见心理正念呼吸 — 找到属于你的呼吸节奏' };
  },
});
// #endif

const PROGRAMS = [
  { key: 'sleep',      name: '入睡准备',   icon: 'moon',       desc: '渐进放松神经系统，帮助身心平静进入睡眠', totalMin: 12, color: '#6A5ACD', stages: [{ label: '热身' }, { label: '深化' }, { label: '沉降' }] },
  { key: 'focus',      name: '专注启动',   icon: 'aperture',   desc: '唤醒注意力，进入清醒专注的工作状态',     totalMin: 8,  color: '#3A7E8A', stages: [{ label: '激活' }, { label: '强化' }, { label: '锁定' }] },
  { key: 'anxiety',    name: '焦虑急救',   icon: 'droplets',   desc: '快速平复紧张情绪，降低焦虑和压力反应',   totalMin: 7,  color: '#4AB8A0', stages: [{ label: '稳定' }, { label: '释放' }, { label: '平复' }] },
  { key: 'meditation', name: '冥想入定',   icon: 'umbrella',   desc: '逐步引导进入深度冥想，扩展觉察与专注',   totalMin: 16, color: '#B57BCA', stages: [{ label: '收心' }, { label: '沉淀' }, { label: '扩展' }, { label: '安住' }] },
  { key: 'morning',    name: '晨间唤醒',   icon: 'zap',        desc: '温和激活身体与大脑，迎接充满活力的一天', totalMin: 7,  color: '#F5A623', stages: [{ label: '苏醒' }, { label: '注入' }, { label: '振奋' }] },
  { key: 'exam',       name: '考前冷静训练', icon: 'aperture', desc: '稳定心率、集中注意，降低应激反应，从容应考', totalMin: 8,  color: '#3A8AC9', stages: [{ label: '稳定' }, { label: '释压' }, { label: '聚焦' }] },
  { key: 'stage',      name: '演讲/上台前', icon: 'activity',  desc: '快速沉稳，缓解怯场，让声音和身体都稳下来', totalMin: 6,  color: '#4A7A9E', stages: [{ label: '沉稳' }, { label: '松肩' }, { label: '登场' }] },
  { key: 'anger',      name: '愤怒平复',   icon: 'droplets',   desc: '延长呼气降低生理唤醒，让怒火慢慢降温',   totalMin: 7,  color: '#E8705A', stages: [{ label: '降温' }, { label: '松开' }, { label: '回稳' }] },
  { key: 'deepsleep',  name: '睡前深度放松', icon: 'moon',     desc: '更长的呼气节奏，深度放松身心，滑入沉睡', totalMin: 14, color: '#5A6FCD', stages: [{ label: '卸力' }, { label: '沉降' }, { label: '入眠' }] },
];

const MODES = [
  { key: '4-7-8', name: '4-7-8 放松', icon: 'droplets',   desc: '吸气4秒・屏息7秒・呼气8秒，深度放松神经',    color: '#4A7A9E' },
  { key: '4-4-4', name: '4-4-4 专注', icon: 'aperture',   desc: '均匀三段，稳定注意力，适合工作前准备',        color: '#3A7E8A' },
  { key: '4-2-6', name: '4-2-6 助眠', icon: 'moon',       desc: '延长呼气激活副交感神经，帮助入睡',            color: '#6A5ACD' },
  { key: '5-5',   name: '5-5 心率同调', icon: 'activity', desc: '吸气5秒・呼气5秒，改善心率变异性',          color: '#4AB8A0' },
];

const selectedType = ref('');
const selectedKey  = ref('');

const activeColor = computed(() => {
  if (!selectedKey.value) return '#4A7A9E';
  if (selectedType.value === 'program') {
    return PROGRAMS.find(p => p.key === selectedKey.value)?.color || '#4A7A9E';
  }
  return MODES.find(m => m.key === selectedKey.value)?.color || '#4A7A9E';
});

function select(type, key) {
  selectedType.value = type;
  selectedKey.value  = key;
}

function onStart() {
  if (!selectedKey.value) return;
  uni.navigateTo({
    url: `/pages/breathing/index?type=${selectedType.value}&key=${selectedKey.value}`,
  });
}

function onBack() {
  uni.navigateBack();
}
</script>

<style scoped lang="scss">
$teal: #3A7E8A;
$bg: #F5F7F6;
$text-1: #1C2A27;
$text-2: #617870;
$muted: #9BBCB4;
$border: #E8EFED;
$card-r: 20rpx;

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 40rpx;
}

/* ── 顶部栏 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx 12rpx;
  background: #fff;
  border-bottom: 1rpx solid $border;
}
.icon-btn {
  width: 64rpx; height: 64rpx;
  display: flex; align-items: center; justify-content: center;
  border-radius: 16rpx;
  &:active { background: $bg; }
}
.icon-text { font-size: 36rpx; color: $text-1; }
.top-title {
  font-size: 32rpx; font-weight: 800; color: $text-1;
  letter-spacing: 0.02em; font-family: $zj-font-display;
}

/* ── Hero ── */
.hero {
  padding: 48rpx 40rpx 36rpx;
  background: linear-gradient(155deg, #3A7E8A 0%, #1E5870 100%);
}
.hero-title {
  display: block;
  font-size: 52rpx; font-weight: 700; color: #fff;
  font-family: $zj-font-display;
  margin-bottom: 12rpx;
}
.hero-sub {
  display: block;
  font-size: 26rpx; color: rgba(255,255,255,0.78);
  line-height: 1.7;
}

/* ── Section ── */
.section {
  padding: 40rpx 28rpx 0;
}
.section-label-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 6rpx;
}
.section-label {
  font-size: 28rpx; font-weight: 700; color: $text-1;
}
.section-hint {
  display: block;
  font-size: 22rpx; color: $muted;
  margin-bottom: 24rpx;
}

/* ── 课程卡片 ── */
.program-list { display: flex; flex-direction: column; gap: 16rpx; }
.program-card {
  background: #fff;
  border-radius: $card-r;
  border: 2rpx solid $border;
  padding: 28rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  transition: border-color 0.2s $zj-ease-out, box-shadow 0.2s $zj-ease-out;
  box-shadow: $zj-shadow-card;

  &.selected { box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.10); }
  &:active { transform: scale(0.99); }
}
.program-left {
  flex: 1; display: flex; align-items: flex-start; gap: 20rpx;
}
.program-icon-wrap {
  width: 72rpx; height: 72rpx; border-radius: 18rpx;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.program-info { flex: 1; }
.program-name {
  display: block; font-size: 28rpx; font-weight: 700; color: $text-1;
  margin-bottom: 6rpx;
}
.program-desc {
  display: block; font-size: 22rpx; color: $text-2; line-height: 1.6;
  margin-bottom: 12rpx;
}
.program-tags { display: flex; flex-wrap: wrap; gap: 8rpx; }
.program-tag {
  font-size: 18rpx; color: $muted;
  background: $bg; border-radius: 20rpx;
  padding: 2rpx 14rpx;
  &--time { color: $teal; }
}
.check-circle {
  width: 44rpx; height: 44rpx; border-radius: 50%;
  border: 2rpx solid $border;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, border-color 0.2s;
}
.check-icon { font-size: 22rpx; color: #fff; font-weight: 700; }

/* ── 模式网格 ── */
.mode-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx;
}
.mode-card {
  background: #fff; border-radius: $card-r;
  border: 2rpx solid $border;
  padding: 24rpx 20rpx;
  box-shadow: $zj-shadow-card;
  transition: border-color 0.2s $zj-ease-out, background 0.2s $zj-ease-out;

  &.selected { box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.10); }
  &:active { transform: scale(0.97); }
}
.mode-icon-wrap {
  width: 64rpx; height: 64rpx; border-radius: 16rpx;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16rpx;
}
.mode-name {
  display: block; font-size: 26rpx; font-weight: 700; color: $text-1;
  margin-bottom: 8rpx;
}
.mode-desc {
  display: block; font-size: 20rpx; color: $text-2; line-height: 1.6;
}

/* ── 底部按钮 ── */
.footer {
  padding: 40rpx 28rpx 48rpx;
}
.start-btn {
  height: 96rpx; border-radius: 48rpx;
  background: #C8D8D2;
  display: flex; align-items: center; justify-content: center;
  gap: 12rpx;
  transition: background 0.3s $zj-ease-out, box-shadow 0.3s $zj-ease-out;
  box-shadow: 0 6rpx 24rpx rgba(0,0,0,0.12);

  &:active:not(.disabled) { opacity: 0.88; }
  &.disabled { box-shadow: none; }
}
.start-text {
  font-size: 30rpx; font-weight: 700; color: #fff; letter-spacing: 0.04em;
}
.start-arrow { font-size: 30rpx; color: rgba(255,255,255,0.85); }
</style>
