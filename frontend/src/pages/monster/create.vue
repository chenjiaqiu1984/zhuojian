<template>
  <view class="page">
    <!-- 步骤条 -->
    <view class="steps-bar">
      <view class="step" :class="{ active: step === 1, done: step > 1 }">
        <view class="step-dot">
          <ZjIcon v-if="step > 1" name="check" :size="24" color="#fff" />
          <text v-else class="step-num">1</text>
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
        <!-- 预览 / 编辑画布：可直接拖动部件 -->
        <view class="preview-outer">
          <view
            class="preview-box"
            @touchstart="e => onStageTouchStart(e)"
            @touchmove.stop.prevent="e => onStageTouchMove(e)"
            @touchend="e => onStageTouchEnd(e)"
            @mousedown="e => onStageMouseDown(e)"
            @mousemove="e => onStageMouseMove(e)"
            @mouseup="e => onStageMouseUp(e)"
            @mouseleave="e => onStageMouseUp(e)"
            @click="onPreviewTap()"
            @dblclick="openFullscreen()"
          >
            <view class="preview-glow" />
            <MonsterView :parts="parts" :active-slot="activeSlot" />
          </view>
          <view class="stage-hint">
            <text class="stage-hint-text">拖动部件可移动位置 · 双击画布可全屏编辑</text>
          </view>
        </view>

        <!-- 选中部件的调节面板 -->
        <view v-if="activeSlot" class="adjust-panel">
          <view class="adjust-head">
            <text class="adjust-title">调整：{{ labelOf(activeSlot) }}</text>
            <view class="adjust-reset" @click="e => resetActive(e)">
              <text class="adjust-reset-text">复位</text>
            </view>
          </view>
          <view class="adjust-row">
            <text class="adjust-label">大小</text>
            <slider class="adjust-slider" :value="activeScale" :min="30" :max="200" :step="1"
              activeColor="#7B4E9E" block-size="20" @changing="e => onScaleSlide(e)" @change="e => onScaleSlide(e)" />
            <text class="adjust-val">{{ activeScale }}%</text>
          </view>
          <view class="adjust-row">
            <text class="adjust-label">旋转</text>
            <slider class="adjust-slider" :value="activeRot" :min="-180" :max="180" :step="1"
              activeColor="#7B4E9E" block-size="20" @changing="e => onRotSlide(e)" @change="e => onRotSlide(e)" />
            <text class="adjust-val">{{ activeRot }}°</text>
          </view>
        </view>

        <view class="tools-row">
          <view class="tool-btn" @click="e => randomize(e)">
            <text class="tool-btn-text">🎲 随机一只</text>
          </view>
          <view class="tool-btn" @click="e => resetAllLayout(e)">
            <text class="tool-btn-text">↺ 复位全部</text>
          </view>
        </view>

        <!-- 部件列表 -->
        <view v-for="part in PART_DEFS" :key="part.key" class="section-block">
          <text class="section-label">{{ part.label }}</text>
          <view class="chips-row">
            <view v-if="part.optional" class="part-chip" :class="{ selected: parts[part.key] === '' }" @click="selectPart(part.key, '')">
              <text class="chip-none">无</text>
            </view>
            <view
              v-for="item in part.items" :key="item"
              class="part-chip"
              :class="{ selected: parts[part.key] === item, active: activeSlot === part.key && parts[part.key] === item }"
              @click="selectPart(part.key, item)"
            >
              <image :src="partUrl(part.key, item)" mode="aspectFit" class="chip-img" />
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
            @touchstart.prevent="e => onTouchStart(e)"
            @touchmove.prevent="e => onTouchMove(e)"
            @touchend="e => onTouchEnd(e)"
            @mousedown="e => onMouseDown(e)"
            @mousemove="e => onMouseMove(e)"
            @mouseup="e => onMouseUp(e)"
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
            <view class="clear-btn" @click="e => clearCanvas(e)">
              <text class="clear-text">清空</text>
            </view>
          </view>
        </view>
      </view>

      <view class="bottom-bar">
        <view class="btn-primary" @click="e => goStep2(e)">
          <text class="btn-text">下一步：命名怪兽</text>
          <text class="btn-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 全屏编辑：双击拼装画布进入，可大范围拖动部件 -->
    <view v-if="fullscreen" class="fs-mask">
      <view
        class="fs-stage"
        @touchstart="e => onStageTouchStart(e)"
        @touchmove.stop.prevent="e => onStageTouchMove(e)"
        @touchend="e => onStageTouchEnd(e)"
        @mousedown="e => onStageMouseDown(e)"
        @mousemove="e => onStageMouseMove(e)"
        @mouseup="e => onStageMouseUp(e)"
        @mouseleave="e => onStageMouseUp(e)"
      >
        <MonsterView :parts="parts" :active-slot="activeSlot" />
      </view>

      <!-- 顶部工具条 -->
      <view class="fs-topbar">
        <text class="fs-title">拖动部件调整位置</text>
        <view class="fs-close" @click="closeFullscreen()">
          <text class="fs-close-text">完成 ✕</text>
        </view>
      </view>

      <!-- 底部：选中部件的缩放/旋转 -->
      <view v-if="activeSlot" class="fs-adjust">
        <view class="fs-adjust-head">
          <text class="fs-adjust-title">调整：{{ labelOf(activeSlot) }}</text>
          <view class="fs-reset" @click="resetActive()">
            <text class="fs-reset-text">复位</text>
          </view>
        </view>
        <view class="fs-adjust-row">
          <text class="fs-adjust-label">大小</text>
          <slider class="fs-slider" :value="activeScale" :min="30" :max="200" :step="1"
            activeColor="#B57BCA" block-size="22" @changing="e => onScaleSlide(e)" @change="e => onScaleSlide(e)" />
          <text class="fs-adjust-val">{{ activeScale }}%</text>
        </view>
        <view class="fs-adjust-row">
          <text class="fs-adjust-label">旋转</text>
          <slider class="fs-slider" :value="activeRot" :min="-180" :max="180" :step="1"
            activeColor="#B57BCA" block-size="22" @changing="e => onRotSlide(e)" @change="e => onRotSlide(e)" />
          <text class="fs-adjust-val">{{ activeRot }}°</text>
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
          placeholder="如：焦虑怪、小悲伤…"
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
        <view class="btn-primary" :class="{ disabled: !canSave }" @click="e => save(e)">
          <text class="btn-text">创建怪兽</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('monster/create'));
// #endif

import { ref, reactive, computed, onMounted } from 'vue';
import { monsterApi } from '@/api';
import ZjIcon from '../../components/ZjIcon.vue';
import MonsterView from '../../components/MonsterView.vue';
import { PART_DEFS, defaultParts, defaultTransforms, partUrl, bodyColor, LAYOUT, LAYER_ORDER, layoutOf } from '@/utils/monsterParts';

const step = ref(1);
const drawMode = ref('parts');
const fullscreen = ref(false);

const COLORS = ['#E74C3C','#E67E22','#F1C40F','#2ECC71','#3498DB','#9B59B6','#E91E8C','#1ABC9C','#F06292','#00BCD4','#8BC34A','#FF7043'];
const BRUSH_SIZES = [3, 6, 11, 18];

const EMOTIONS = [
  { key: '焦虑', label: '焦虑', icon: '😰' },
  { key: '悲伤', label: '悲伤', icon: '😢' },
  { key: '愤怒', label: '愤怒', icon: '😠' },
  { key: '恐惧', label: '恐惧', icon: '😨' },
  { key: '孤独', label: '孤独', icon: '😔' },
  { key: '其他', label: '其他', icon: '👾' },
];

// 位图部件拼装（monster-v2）：固定配色、身体自带四肢、无换色
const parts = reactive(defaultParts());

// 随机生成一只怪兽：必选槽必出，可选槽随机（含"无"），并复位布局
function randomize() {
  PART_DEFS.forEach(p => {
    const pool = p.optional ? ['', ...p.items] : p.items;
    parts[p.key] = pool[Math.floor(Math.random() * pool.length)];
  });
  parts.transforms = defaultTransforms();
}

// ── 部件编辑（拖动 / 缩放 / 旋转）────────────────────────────────────────────
const activeSlot = ref('');

function labelOf(slot) {
  return PART_DEFS.find(p => p.key === slot)?.label || slot;
}

function ensureTransform(slot) {
  if (!parts.transforms) parts.transforms = defaultTransforms();
  if (!parts.transforms[slot]) {
    parts.transforms[slot] = { ...(LAYOUT[slot] ? { x: LAYOUT[slot].x, y: LAYOUT[slot].y } : { x: 50, y: 50 }), scale: 1, rot: 0 };
  }
  return parts.transforms[slot];
}

// 选择部件：赋值并设为当前编辑对象
function selectPart(key, val) {
  parts[key] = val;
  if (val) {
    ensureTransform(key);
    activeSlot.value = key;
  } else if (activeSlot.value === key) {
    activeSlot.value = '';
  }
}

const activeScale = computed(() => activeSlot.value ? Math.round((ensureTransform(activeSlot.value).scale || 1) * 100) : 100);
const activeRot = computed(() => activeSlot.value ? Math.round(ensureTransform(activeSlot.value).rot || 0) : 0);

function onScaleSlide(e) {
  if (!activeSlot.value) return;
  ensureTransform(activeSlot.value).scale = (e.detail.value || 100) / 100;
}
function onRotSlide(e) {
  if (!activeSlot.value) return;
  ensureTransform(activeSlot.value).rot = e.detail.value || 0;
}

function resetActive() {
  if (!activeSlot.value) return;
  const base = LAYOUT[activeSlot.value] || { x: 50, y: 50 };
  parts.transforms[activeSlot.value] = { x: base.x, y: base.y, scale: 1, rot: 0 };
}

function resetAllLayout() {
  parts.transforms = defaultTransforms();
}

// ── 舞台拖动：命中最上层部件后拖动其中心 ───────────────────────────────────
let stageRect = null;
let dragging = null; // { slot }
let stageInited = false;

function refreshStageRect(cb) {
  // 全屏时拖动舞台是 .fs-stage，普通模式是 .preview-box
  const sel = fullscreen.value ? '.fs-stage' : '.preview-box';
  uni.createSelectorQuery().select(sel).boundingClientRect(rect => {
    if (rect && rect.width > 0) stageRect = rect;
    if (cb) cb();
  }).exec();
}

// 双击检测：小程序没有 dblclick 事件，用两次 tap 间隔手动判定（H5 的 dblclick 也会触发，
// 但都调 openFullscreen 且有 fullscreen 守卫，重复调用无副作用）
let lastTapTime = 0;
function onPreviewTap() {
  const now = Date.now();
  if (now - lastTapTime < 300) {
    lastTapTime = 0;
    openFullscreen();
  } else {
    lastTapTime = now;
  }
}

// 进入/退出全屏：切换后舞台尺寸变了，重置测量标记让下次拖动重新取 rect
function openFullscreen() {
  fullscreen.value = true;
  stageInited = false;
  stageRect = null;
}
function closeFullscreen() {
  fullscreen.value = false;
  stageInited = false;
  stageRect = null;
}

function stagePos(clientX, clientY) {
  if (!stageRect) return null;
  return {
    x: ((clientX - stageRect.left) / stageRect.width) * 100,
    y: ((clientY - stageRect.top) / stageRect.height) * 100,
  };
}

// 命中测试：从最上层往下找，落在部件包围盒内的第一个
function hitTest(px, py) {
  const slots = LAYER_ORDER.filter(s => parts[s]).reverse();
  for (const slot of slots) {
    const l = layoutOf(slot, parts.transforms);
    // 用 width 百分比估算半宽；高度按经验取宽的 0.9，命中框稍放宽
    const halfW = l.width / 2 * 1.15;
    const halfH = l.width / 2 * 1.0 + 4;
    if (px >= l.left - halfW && px <= l.left + halfW && py >= l.top - halfH && py <= l.top + halfH) {
      return slot;
    }
  }
  return '';
}

function beginDrag(clientX, clientY) {
  const p = stagePos(clientX, clientY);
  if (!p) return;
  const slot = hitTest(p.x, p.y);
  if (slot) {
    activeSlot.value = slot;
    ensureTransform(slot);
    dragging = { slot };
  }
}

function moveDrag(clientX, clientY) {
  if (!dragging) return;
  const p = stagePos(clientX, clientY);
  if (!p) return;
  const t = ensureTransform(dragging.slot);
  t.x = Math.max(0, Math.min(100, p.x));
  t.y = Math.max(0, Math.min(100, p.y));
}

function endDrag() { dragging = null; }

function onStageTouchStart(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  const cx = t.clientX ?? t.pageX ?? 0;
  const cy = t.clientY ?? t.pageY ?? 0;
  if (!stageInited) { refreshStageRect(() => { stageInited = true; beginDrag(cx, cy); }); }
  else beginDrag(cx, cy);
}
function onStageTouchMove(e) {
  const t = e.touches && e.touches[0];
  if (!t) return;
  moveDrag(t.clientX ?? t.pageX ?? 0, t.clientY ?? t.pageY ?? 0);
}
function onStageTouchEnd() { endDrag(); }

function onStageMouseDown(e) {
  if (!stageInited) { refreshStageRect(() => { stageInited = true; beginDrag(e.clientX, e.clientY); }); }
  else beginDrag(e.clientX, e.clientY);
}
function onStageMouseMove(e) { if (dragging) moveDrag(e.clientX, e.clientY); }
function onStageMouseUp() { endDrag(); }

const brushColor = ref('#9B59B6');
const brushSize = ref(6);
const isEraser = ref(false);
const canvasPaths = ref([]);
let currentPath = null;
let ctx = null;
let isMouseDown = false;

const form = reactive({ name: '', emotion: '', color: '#9B59B6' });
const canSave = computed(() => form.name.trim() && form.emotion);

// canvas 位置/尺寸缓存（跨平台，用 selectorQuery 替代 document）
let canvasRect = null;

function refreshCanvasRect(cb) {
  const query = uni.createSelectorQuery();
  query.select('#monsterCanvas').boundingClientRect(rect => {
    if (rect && rect.width > 0) canvasRect = rect;
    if (cb) cb();
  }).exec();
}

onMounted(() => {
  ctx = uni.createCanvasContext('monsterCanvas');
  // 延迟测量，等布局完成
  setTimeout(() => refreshCanvasRect(), 120);
});

// 从触摸/鼠标事件提取相对 canvas 的坐标
function getTouchPos(e) {
  const t = e.touches[0];
  if (canvasRect) {
    // 小程序 touch 用 pageX/pageY；H5 用 clientX/clientY
    const px = t.clientX ?? t.pageX ?? t.x ?? 0;
    const py = t.clientY ?? t.pageY ?? t.y ?? 0;
    return { x: px - canvasRect.left, y: py - canvasRect.top };
  }
  return { x: t.x ?? 0, y: t.y ?? 0 };
}

function getMousePos(e) {
  if (canvasRect) {
    return { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top };
  }
  return { x: e.offsetX ?? 0, y: e.offsetY ?? 0 };
}

function startPath(pos) {
  currentPath = {
    color: isEraser.value ? '#FFFFFF' : brushColor.value,
    width: isEraser.value ? brushSize.value * 4 : brushSize.value,
    points: [pos],
  };
  canvasPaths.value.push(currentPath);
}

function addPoint(pos) {
  if (!currentPath) return;
  currentPath.points.push(pos);
  redrawCanvas();
}

function onTouchStart(e) {
  if (!canvasRect) { refreshCanvasRect(() => startPath(getTouchPos(e))); return; }
  startPath(getTouchPos(e));
}
function onTouchMove(e) { addPoint(getTouchPos(e)); }
function onTouchEnd() { currentPath = null; }

function onMouseDown(e) {
  isMouseDown = true;
  if (!canvasRect) { refreshCanvasRect(() => startPath(getMousePos(e))); return; }
  startPath(getMousePos(e));
}
function onMouseMove(e) { if (isMouseDown) addPoint(getMousePos(e)); }
function onMouseUp() { isMouseDown = false; currentPath = null; }

function getCanvasSize() {
  if (canvasRect) return { w: canvasRect.width, h: canvasRect.height };
  return { w: 600, h: 600 };
}

function redrawCanvas() {
  if (!ctx) return;
  const { w, h } = getCanvasSize();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#FDFAFF';
  ctx.fillRect(0, 0, w, h);
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
    const { w, h } = getCanvasSize();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FDFAFF';
    ctx.fillRect(0, 0, w, h);
    ctx.draw();
  }
}

function goStep2() {
  if (drawMode.value === 'canvas' && canvasPaths.value.length === 0) {
    uni.showToast({ title: '请先画出你的怪兽', icon: 'none' });
    return;
  }
  if (drawMode.value === 'parts') form.color = bodyColor(parts.body);
  step.value = 2;
}

async function save() {
  if (!canSave.value) return;
  const drawingData = drawMode.value === 'parts'
    ? JSON.stringify({ ...parts, type: 'parts' })
    : JSON.stringify({ type: 'canvas', paths: canvasPaths.value });
  const color = drawMode.value === 'parts' ? bodyColor(parts.body) : form.color;

  uni.showLoading({ title: '创建中…' });
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
  width: 560rpx;
  height: 560rpx;
  border-radius: 28rpx;
  position: relative;
  overflow: visible;
  background: linear-gradient(160deg, #F3ECFB 0%, #E9DEF6 100%);
  border: 1rpx solid rgba(123,78,158,0.12);
}

.preview-outer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 24rpx;
  padding: 40rpx 0 24rpx;
}

.preview-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 46%, rgba(255,255,255,0.55) 0%, transparent 64%);
  border-radius: 28rpx;
}

.stage-hint {
  text-align: center;
}
.stage-hint-text {
  font-size: 20rpx;
  color: $text-muted;
}

/* 选中部件调节面板 */
.adjust-panel {
  background: $white;
  border-radius: 20rpx;
  padding: 20rpx 22rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid $purple-light;
  box-shadow: 0 2rpx 12rpx rgba(123,78,158,0.07);
}
.adjust-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.adjust-title {
  font-size: 24rpx;
  font-weight: 600;
  color: $purple;
}
.adjust-reset {
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  background: $purple-light;
  &:active { opacity: 0.7; }
}
.adjust-reset-text { font-size: 20rpx; color: $purple; }
.adjust-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
}
.adjust-label {
  font-size: 22rpx;
  color: $text-sub;
  width: 64rpx;
  flex-shrink: 0;
}
.adjust-slider {
  flex: 1;
  margin: 4rpx 0;
}
.adjust-val {
  font-size: 20rpx;
  color: $text-muted;
  width: 72rpx;
  text-align: right;
  flex-shrink: 0;
}

/* 工具行 */
.tools-row {
  display: flex;
  gap: 14rpx;
  margin-bottom: 28rpx;
}
.tool-btn {
  flex: 1;
  padding: 16rpx 0;
  border-radius: 16rpx;
  background: $white;
  border: 1rpx solid $purple-light;
  box-shadow: 0 2rpx 10rpx rgba(123,78,158,0.08);
  text-align: center;
  &:active { transform: scale(0.97); }
}
.tool-btn-text {
  font-size: 24rpx;
  color: $purple;
  font-weight: 600;
}

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
  width: 104rpx;
  height: 92rpx;
  border-radius: 16rpx;
  background: linear-gradient(160deg, #F7F2FC 0%, #EFE6F8 100%);
  border: 2rpx solid $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &.selected {
    border: 2rpx solid $purple;
    background: rgba(123,78,158,0.1);
    box-shadow: 0 0 0 3rpx rgba(123,78,158,0.15);
  }
  &.active {
    border: 2rpx solid $purple;
    box-shadow: 0 0 0 4rpx rgba(123,78,158,0.25);
  }
}

.chip-img { width: 80rpx; height: 76rpx; }
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
  height: 780rpx;
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

/* ── 全屏编辑 ── */
.fs-mask {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: linear-gradient(160deg, #F3ECFB 0%, #E4D6F4 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 拖动舞台占满可视区域，让部件有更大移动空间 */
.fs-stage {
  position: absolute;
  top: 120rpx;
  left: 40rpx;
  right: 40rpx;
  bottom: 260rpx;
  border-radius: 24rpx;
  background: radial-gradient(circle at 50% 42%, rgba(255,255,255,0.6) 0%, transparent 66%);
}

.fs-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  padding-top: env(safe-area-inset-top);
}
.fs-title {
  font-size: 26rpx;
  color: $text-sub;
  font-weight: 600;
}
.fs-close {
  padding: 14rpx 28rpx;
  border-radius: 40rpx;
  background: $purple;
  box-shadow: 0 4rpx 16rpx rgba(123,78,158,0.3);
  &:active { transform: scale(0.95); }
}
.fs-close-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

.fs-adjust {
  position: absolute;
  left: 24rpx;
  right: 24rpx;
  bottom: 40rpx;
  background: $white;
  border-radius: 24rpx;
  padding: 24rpx 26rpx;
  box-shadow: 0 6rpx 24rpx rgba(123,78,158,0.16);
}
.fs-adjust-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.fs-adjust-title {
  font-size: 26rpx;
  font-weight: 600;
  color: $purple;
}
.fs-reset {
  padding: 8rpx 22rpx;
  border-radius: 20rpx;
  background: $purple-light;
  &:active { opacity: 0.7; }
}
.fs-reset-text { font-size: 22rpx; color: $purple; }
.fs-adjust-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.fs-adjust-label {
  font-size: 24rpx;
  color: $text-sub;
  width: 68rpx;
  flex-shrink: 0;
}
.fs-slider {
  flex: 1;
  margin: 6rpx 0;
}
.fs-adjust-val {
  font-size: 22rpx;
  color: $text-muted;
  width: 76rpx;
  text-align: right;
  flex-shrink: 0;
}
</style>
