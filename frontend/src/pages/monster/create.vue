<template>
  <view class="page">
    <!-- 步骤条 -->
    <view class="steps-bar">
      <view class="step" :class="{ active: step === 1, done: step > 1 }">
        <view class="step-dot">
          <text class="step-num">{{ step > 1 ? '✓' : '1' }}</text>
        </view>
        <text class="step-label">绘制怪兽</text>
      </view>
      <view class="step-line" :class="{ active: step > 1 }" />
      <view class="step" :class="{ active: step === 2 }">
        <view class="step-dot">
          <text class="step-num">2</text>
        </view>
        <text class="step-label">命名情绪</text>
      </view>
    </view>

    <!-- Step 1 绘制 -->
    <view v-if="step === 1">
      <!-- 模式 Tab -->
      <view class="tab-bar">
        <view class="tab" :class="{ active: drawMode === 'parts' }" @click="drawMode = 'parts'">
          <text class="tab-text">拼装部件</text>
        </view>
        <view class="tab" :class="{ active: drawMode === 'canvas' }" @click="drawMode = 'canvas'">
          <text class="tab-text">自由手绘</text>
        </view>
      </view>

      <!-- 部件拼装 -->
      <view v-if="drawMode === 'parts'" class="parts-wrap">
        <!-- 预览 -->
        <view class="preview-outer">
          <view class="preview-box" :style="{ background: `${parts.color}14` }">
            <view class="preview-glow" :style="{ background: `radial-gradient(circle, ${parts.color}28 0%, transparent 68%)` }" />
            <image v-if="parts.body" class="p-body" :src="`/static/monster/body/${parts.body}.svg`" mode="aspectFit" />
            <image v-if="parts.tail" class="p-tail" :src="`/static/monster/tail/${parts.tail}.svg`" mode="aspectFit" />
            <image v-if="parts.horn" class="p-horn" :src="`/static/monster/horn/${parts.horn}.svg`" mode="aspectFit" />
            <image v-if="parts.eyes" class="p-eyes" :src="`/static/monster/eyes/${parts.eyes}.svg`" mode="aspectFit" />
            <image v-if="parts.mouth" class="p-mouth" :src="`/static/monster/mouth/${parts.mouth}.svg`" mode="aspectFit" />
          </view>
        </view>

        <!-- 颜色 -->
        <view class="section-block">
          <text class="section-label">主题颜色</text>
          <view class="color-row">
            <view
              v-for="c in COLORS" :key="c"
              class="color-dot"
              :class="{ selected: parts.color === c }"
              :style="{ background: c }"
              @click="parts.color = c"
            />
          </view>
        </view>

        <!-- 身体 -->
        <view class="section-block">
          <text class="section-label">身体形状</text>
          <view class="chips-row">
            <view v-for="b in BODIES" :key="b" class="part-chip" :class="{ selected: parts.body === b }" @click="parts.body = b">
              <image :src="`/static/monster/body/${b}.svg`" mode="aspectFit" class="chip-img" />
            </view>
          </view>
        </view>

        <!-- 眼睛 -->
        <view class="section-block">
          <text class="section-label">眼睛</text>
          <view class="chips-row">
            <view v-for="e in EYES" :key="e" class="part-chip" :class="{ selected: parts.eyes === e }" @click="parts.eyes = e">
              <image :src="`/static/monster/eyes/${e}.svg`" mode="aspectFit" class="chip-img" />
            </view>
          </view>
        </view>

        <!-- 嘴巴 -->
        <view class="section-block">
          <text class="section-label">嘴巴</text>
          <view class="chips-row">
            <view v-for="m in MOUTHS" :key="m" class="part-chip" :class="{ selected: parts.mouth === m }" @click="parts.mouth = m">
              <image :src="`/static/monster/mouth/${m}.svg`" mode="aspectFit" class="chip-img" />
            </view>
          </view>
        </view>

        <!-- 角 -->
        <view class="section-block">
          <text class="section-label">角（可选）</text>
          <view class="chips-row">
            <view class="part-chip" :class="{ selected: parts.horn === '' }" @click="parts.horn = ''">
              <text class="chip-none">无</text>
            </view>
            <view v-for="h in HORNS" :key="h" class="part-chip" :class="{ selected: parts.horn === h }" @click="parts.horn = h">
              <image :src="`/static/monster/horn/${h}.svg`" mode="aspectFit" class="chip-img" />
            </view>
          </view>
        </view>

        <!-- 尾巴 -->
        <view class="section-block">
          <text class="section-label">尾巴（可选）</text>
          <view class="chips-row">
            <view class="part-chip" :class="{ selected: parts.tail === '' }" @click="parts.tail = ''">
              <text class="chip-none">无</text>
            </view>
            <view v-for="t in TAILS" :key="t" class="part-chip" :class="{ selected: parts.tail === t }" @click="parts.tail = t">
              <image :src="`/static/monster/tail/${t}.svg`" mode="aspectFit" class="chip-img" />
            </view>
          </view>
        </view>
      </view>

      <!-- 自由手绘 -->
      <view v-else class="canvas-wrap">
        <view class="canvas-box">
          <canvas
            canvas-id="monsterCanvas"
            id="monsterCanvas"
            class="draw-canvas"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
          />
        </view>

        <view class="canvas-tools">
          <view class="section-block">
            <text class="section-label">画笔颜色</text>
            <view class="color-row">
              <view
                v-for="c in COLORS" :key="c"
                class="color-dot"
                :class="{ selected: !isEraser && brushColor === c }"
                :style="{ background: c }"
                @click="brushColor = c; isEraser = false"
              />
              <view class="color-dot eraser-dot" :class="{ selected: isEraser }" @click="isEraser = true">
                <text class="eraser-text">橡</text>
              </view>
            </view>
          </view>

          <view class="section-block brush-row">
            <text class="section-label">笔刷粗细</text>
            <view class="brush-sizes">
              <view
                v-for="s in BRUSH_SIZES" :key="s"
                class="brush-dot"
                :class="{ selected: brushSize === s }"
                :style="{ width: s * 2 + 'rpx', height: s * 2 + 'rpx', background: isEraser ? '#CCC' : brushColor }"
                @click="brushSize = s"
              />
            </view>
            <view class="clear-btn" @click="clearCanvas">
              <text class="clear-text">清空</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="btn-primary" @click="goStep2">
          <text class="btn-text">下一步：命名怪兽</text>
          <text class="btn-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- Step 2 命名 -->
    <view v-if="step === 2" class="step2-wrap">
      <!-- 名字 -->
      <view class="field-card">
        <text class="field-label">给你的怪兽起个名字</text>
        <input
          v-model="form.name"
          class="field-input"
          placeholder="如：焦虑怪、小悲伤..."
          maxlength="12"
          placeholder-style="color: #C0B0D8"
        />
        <text class="field-count">{{ form.name.length }}/12</text>
      </view>

      <!-- 情绪 -->
      <view class="field-card">
        <text class="field-label">这只怪兽代表什么情绪？</text>
        <view class="emotion-grid">
          <view
            v-for="e in EMOTIONS" :key="e.key"
            class="emotion-chip"
            :class="{ selected: form.emotion === e.key }"
            @click="form.emotion = e.key"
          >
            <text class="emotion-emoji">{{ e.icon }}</text>
            <text class="emotion-name">{{ e.label }}</text>
          </view>
        </view>
      </view>

      <!-- Canvas 模式主题色 -->
      <view v-if="drawMode === 'canvas'" class="field-card">
        <text class="field-label">怪兽的主题色</text>
        <view class="color-row large-dots">
          <view
            v-for="c in COLORS" :key="c"
            class="color-dot large"
            :class="{ selected: form.color === c }"
            :style="{ background: c }"
            @click="form.color = c"
          />
        </view>
      </view>

      <view class="bottom-bar double">
        <view class="btn-secondary" @click="step = 1">
          <text class="btn-text">返回修改</text>
        </view>
        <view class="btn-primary" :class="{ disabled: !canSave }" @click="save">
          <text class="btn-text">创建怪兽</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { monsterApi } from '@/api';

const step = ref(1);
const drawMode = ref('parts');

const COLORS = ['#E74C3C','#E67E22','#F1C40F','#2ECC71','#3498DB','#9B59B6','#E91E8C','#1ABC9C'];
const BODIES = ['body_01','body_02','body_03','body_04'];
const EYES = ['eyes_01','eyes_02','eyes_03','eyes_04','eyes_05'];
const MOUTHS = ['mouth_01','mouth_02','mouth_03','mouth_04','mouth_05'];
const HORNS = ['horn_01','horn_02','horn_03'];
const TAILS = ['tail_01','tail_02','tail_03'];
const BRUSH_SIZES = [3, 6, 11, 18];

const EMOTIONS = [
  { key: '焦虑', label: '焦虑', icon: '😰' },
  { key: '悲伤', label: '悲伤', icon: '😢' },
  { key: '愤怒', label: '愤怒', icon: '😠' },
  { key: '恐惧', label: '恐惧', icon: '😨' },
  { key: '孤独', label: '孤独', icon: '😔' },
  { key: '其他', label: '其他', icon: '👾' },
];

const parts = reactive({ body: 'body_01', eyes: 'eyes_01', mouth: 'mouth_01', horn: '', tail: '', color: '#9B59B6' });
const brushColor = ref('#9B59B6');
const brushSize = ref(6);
const isEraser = ref(false);
const canvasPaths = ref([]);
let currentPath = null;
let ctx = null;

const form = reactive({ name: '', emotion: '', color: '#9B59B6' });
const canSave = computed(() => form.name.trim() && form.emotion);

onMounted(() => { ctx = uni.createCanvasContext('monsterCanvas'); });

function getPos(e) {
  const t = e.touches[0];
  return { x: t.x, y: t.y };
}

function onTouchStart(e) {
  const pos = getPos(e);
  currentPath = {
    color: isEraser.value ? '#FFFFFF' : brushColor.value,
    width: isEraser.value ? brushSize.value * 4 : brushSize.value,
    points: [pos],
  };
  canvasPaths.value.push(currentPath);
}

function onTouchMove(e) {
  if (!currentPath) return;
  currentPath.points.push(getPos(e));
  redrawCanvas();
}

function onTouchEnd() { currentPath = null; }

function redrawCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, 600, 600);
  ctx.fillStyle = '#FDFAFF';
  ctx.fillRect(0, 0, 600, 600);
  for (const path of canvasPaths.value) {
    if (path.points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
    ctx.stroke();
  }
  ctx.draw();
}

function clearCanvas() {
  canvasPaths.value = [];
  currentPath = null;
  if (ctx) {
    ctx.clearRect(0, 0, 600, 600);
    ctx.fillStyle = '#FDFAFF';
    ctx.fillRect(0, 0, 600, 600);
    ctx.draw();
  }
}

function goStep2() {
  if (drawMode.value === 'canvas' && canvasPaths.value.length === 0) {
    uni.showToast({ title: '请先画出你的怪兽', icon: 'none' });
    return;
  }
  if (drawMode.value === 'parts') form.color = parts.color;
  step.value = 2;
}

async function save() {
  if (!canSave.value) return;
  const drawingData = drawMode.value === 'parts'
    ? JSON.stringify({ type: 'parts', ...parts })
    : JSON.stringify({ type: 'canvas', paths: canvasPaths.value });
  const color = drawMode.value === 'parts' ? parts.color : form.color;

  uni.showLoading({ title: '创建中...' });
  try {
    await monsterApi.create({ name: form.name.trim(), emotion: form.emotion, color, drawingData, drawingType: drawMode.value });
    uni.hideLoading();
    uni.showToast({ title: '怪兽诞生了！', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1200);
  } catch (e) {
    uni.hideLoading();
    if (e.__authRedirect) return;
    uni.showToast({ title: e.error || '创建失败', icon: 'none' });
  }
}
</script>

<style scoped lang="scss">
$purple: #7B4E9E;
$purple-light: #EDE5F5;
$text-main: #1C1030;
$text-sub: #6A5A8A;
$text-muted: #A898C8;
$bg: #F5F3FA;
$white: #FFFFFF;

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 160rpx;
}

/* 步骤条 */
.steps-bar {
  display: flex;
  align-items: center;
  padding: 40rpx 80rpx 28rpx;
  gap: 0;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
}

.step-dot {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;

  .step.active & { background: $purple; }
  .step.done & { background: #2ECC71; }
}

.step-num {
  font-size: 24rpx;
  font-weight: 700;
  color: $text-muted;

  .step.active & { color: white; }
  .step.done & { color: white; }
}

.step-label {
  font-size: 22rpx;
  color: $text-muted;

  .step.active & { color: $purple; font-weight: 600; }
}

.step-line {
  flex: 1;
  height: 3rpx;
  background: $purple-light;
  margin: 0 16rpx 26rpx;
  &.active { background: $purple; }
}

/* Tab */
.tab-bar {
  display: flex;
  margin: 8rpx 28rpx 24rpx;
  background: $purple-light;
  border-radius: 20rpx;
  padding: 6rpx;
  gap: 4rpx;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 16rpx;

  &.active {
    background: $white;
    box-shadow: 0 2rpx 10rpx rgba(123,78,158,0.14);
  }
}

.tab-text {
  font-size: 26rpx;
  color: $text-muted;

  .tab.active & { color: $purple; font-weight: 600; }
}

/* 部件区 */
.parts-wrap { padding: 0 28rpx; }

.preview-outer {
  display: flex;
  justify-content: center;
  margin-bottom: 32rpx;
}

.preview-box {
  width: 260rpx;
  height: 260rpx;
  border-radius: 28rpx;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1rpx solid rgba(123,78,158,0.12);
}

.preview-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.p-body { position: absolute; width: 190rpx; height: 190rpx; }
.p-tail { position: absolute; bottom: 16rpx; right: 8rpx; width: 76rpx; height: 76rpx; }
.p-horn { position: absolute; top: 8rpx; width: 72rpx; height: 56rpx; }
.p-eyes { position: absolute; top: 66rpx; width: 150rpx; height: 46rpx; }
.p-mouth { position: absolute; top: 122rpx; width: 122rpx; height: 46rpx; }

/* 公共 section */
.section-block {
  margin-bottom: 28rpx;
}

.section-label {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: $text-sub;
  margin-bottom: 14rpx;
  letter-spacing: 0.02em;
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  &.large-dots { gap: 20rpx; }
}

.color-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  border: 3rpx solid transparent;
  box-sizing: border-box;
  transition: transform 0.15s;

  &.selected {
    border-color: $text-main;
    transform: scale(1.12);
  }

  &.large { width: 64rpx; height: 64rpx; }
}

.eraser-dot {
  background: $white;
  border: 2rpx solid #D8CDE8;
  display: flex;
  align-items: center;
  justify-content: center;
  &.selected { border: 3rpx solid $text-main; }
}

.eraser-text { font-size: 18rpx; color: $text-muted; }

.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.part-chip {
  width: 96rpx;
  height: 76rpx;
  border-radius: 16rpx;
  background: $white;
  border: 2rpx solid $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &.selected {
    border: 2rpx solid $purple;
    background: rgba(123,78,158,0.06);
  }
}

.chip-img { width: 68rpx; height: 60rpx; }
.chip-none { font-size: 22rpx; color: $text-muted; }

/* Canvas */
.canvas-wrap { padding: 0 28rpx; }

.canvas-box {
  border-radius: 24rpx;
  overflow: hidden;
  background: #FDFAFF;
  box-shadow: 0 4rpx 20rpx rgba(123,78,158,0.10);
  margin-bottom: 24rpx;
  border: 1rpx solid $purple-light;
}

.draw-canvas {
  width: 100%;
  height: 520rpx;
  display: block;
}

.canvas-tools {}

.brush-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16rpx;
}

.brush-sizes {
  display: flex;
  align-items: center;
  gap: 18rpx;
  flex: 1;
}

.brush-dot {
  border-radius: 50%;
  border: 2rpx solid transparent;
  min-width: 12rpx;
  min-height: 12rpx;
  &.selected { border-color: $text-main; }
}

.clear-btn {
  padding: 10rpx 20rpx;
  border-radius: 14rpx;
  background: rgba(231,76,60,0.08);
}

.clear-text { font-size: 22rpx; color: #E74C3C; }

/* Step 2 */
.step2-wrap { padding: 16rpx 28rpx 0; }

.field-card {
  background: $white;
  border-radius: 24rpx;
  padding: 30rpx 28rpx 26rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 4rpx 16rpx rgba(123,78,158,0.06);
  border: 1rpx solid #EDE5F5;
  position: relative;
}

.field-label {
  display: block;
  font-size: 27rpx;
  font-weight: 600;
  color: $text-main;
  margin-bottom: 20rpx;
}

.field-input {
  width: 100%;
  height: 76rpx;
  border-bottom: 2rpx solid $purple-light;
  font-size: 30rpx;
  color: $text-main;
  padding: 0;
  box-sizing: border-box;
}

.field-count {
  position: absolute;
  right: 28rpx;
  bottom: 28rpx;
  font-size: 20rpx;
  color: $text-muted;
}

.emotion-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;
}

.emotion-chip {
  padding: 18rpx 8rpx;
  border-radius: 18rpx;
  background: #F8F4FC;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  border: 2rpx solid transparent;

  &.selected {
    background: rgba(123,78,158,0.08);
    border-color: $purple;
  }

  &:active { transform: scale(0.97); }
}

.emotion-emoji { font-size: 42rpx; }
.emotion-name { font-size: 22rpx; color: $text-sub; }

/* 底部按钮 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 18rpx 28rpx 44rpx;
  background: rgba(245,243,250,0.96);
  border-top: 1rpx solid $purple-light;
  display: flex;
  gap: 14rpx;

  &.double { }
}

.btn-primary {
  flex: 1;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #7B4E9E 0%, #4A2870 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  box-shadow: 0 8rpx 24rpx rgba(123,78,158,0.28);

  &.disabled { opacity: 0.42; }
  &:active:not(.disabled) { transform: scale(0.97); }
}

.btn-secondary {
  padding: 0 32rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;

  .btn-text { color: $text-sub; }
  &:active { transform: scale(0.97); }
}

.btn-text {
  font-size: 28rpx;
  font-weight: 600;
  color: white;
}

.btn-arrow {
  font-size: 32rpx;
  color: rgba(255,255,255,0.80);
  line-height: 1;
}
</style>
