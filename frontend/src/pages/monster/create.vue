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
        <!-- 预览 -->
        <view class="preview-outer">
          <view class="preview-box" :style="{ background: `${parts.color}18` }">
            <view class="preview-glow" :style="{ background: `radial-gradient(circle, ${parts.color}30 0%, transparent 68%)` }" />
            <!-- 尾巴和脚在身体后面渲染 -->
            <view v-if="parts.tail" class="p-tail" v-html="partSvg('tail')" />
            <view v-if="parts.legs" class="p-legs" v-html="partSvg('legs')" />
            <view v-if="parts.legs && getPartTexture('legs')" class="p-legs p-texture-layer" v-html="partTextureSvg('legs')" />
            <!-- 身体 -->
            <view v-if="parts.arms" class="p-arms" v-html="partSvg('arms')" />
            <view v-if="parts.arms && getPartTexture('arms')" class="p-arms p-texture-layer" v-html="partTextureSvg('arms')" />
            <view v-if="parts.body" class="p-body" v-html="partSvg('body')" />
            <view v-if="parts.body && getPartTexture('body')" class="p-body p-texture-layer" v-html="partTextureSvg('body')" />
            <!-- 面部在身体前面 -->
            <view v-if="parts.horn" class="p-horn" v-html="partSvg('horn')" />
            <view v-if="parts.eyes" class="p-eyes" v-html="partSvg('eyes')" />
            <view v-if="parts.mouth" class="p-mouth" v-html="partSvg('mouth')" />
          </view>
        </view>

        <!-- 全局颜色 + 材质 面板（跟随 activePart） -->
        <view class="style-panel">
          <view class="style-panel-title">
            <text class="style-panel-hint" v-if="activePart">正在编辑：{{ PART_DEFS.find(p=>p.key===activePart)?.label }}</text>
            <text class="style-panel-hint" v-else>选择一个部件后可设置颜色和材质</text>
            <view v-if="activePart" class="apply-all-btn" @click="applyStyleToAll">
              <text class="apply-all-text">应用到全部</text>
            </view>
          </view>
          <view class="color-row" style="margin-bottom:16rpx">
            <view v-for="c in COLORS" :key="c"
              class="color-dot"
              :class="{ selected: activePart && getPartColor(activePart) === c }"
              :style="{ background: c }"
              @click="setPartColor(c)"
            />
          </view>
          <view class="chips-row">
            <view v-for="tx in TEXTURES" :key="tx.key"
              class="texture-chip"
              :class="{ selected: activePart && getPartTexture(activePart) === tx.key }"
              @click="setPartTexture(tx.key)"
            >
              <view v-if="tx.key === ''" class="texture-preview texture-none"><text class="chip-none">无</text></view>
              <view v-else class="texture-preview"><image :src="`/static/monster/texture/${tx.key}.svg`" mode="aspectFit" class="texture-img" /></view>
              <text class="texture-label">{{ tx.label }}</text>
            </view>
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
              :class="{ selected: parts[part.key] === item, active: activePart === part.key && parts[part.key] === item }"
              @click="selectPart(part.key, item)"
            >
              <image :src="`/static/monster/${part.key}/${item}.svg`" mode="aspectFit" class="chip-img" />
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
            @touchstart.prevent="onTouchStart"
            @touchmove.prevent="onTouchMove"
            @touchend="onTouchEnd"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
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
        <view class="btn-primary" :class="{ disabled: !canSave }" @click="save">
          <text class="btn-text">创建怪兽</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { monsterApi } from '@/api';
import ZjIcon from '../../components/ZjIcon.vue';

const step = ref(1);
const drawMode = ref('parts');

const COLORS = ['#E74C3C','#E67E22','#F1C40F','#2ECC71','#3498DB','#9B59B6','#E91E8C','#1ABC9C','#F06292','#00BCD4','#8BC34A','#FF7043'];
const BODIES = ['body_01','body_02','body_03','body_04','body_05','body_06','body_07','body_08'];
const EYES = ['eyes_01','eyes_02','eyes_03','eyes_04','eyes_05','eyes_06','eyes_07','eyes_08','eyes_09'];
const MOUTHS = ['mouth_01','mouth_02','mouth_03','mouth_04','mouth_05','mouth_06','mouth_07','mouth_08','mouth_09'];
const HORNS = ['horn_01','horn_02','horn_03','horn_04','horn_05'];
const TAILS = ['tail_01','tail_02','tail_03','tail_04','tail_05'];
const ARMS = ['arms_01','arms_02','arms_03','arms_04','arms_05','arms_06'];
const LEGS = ['legs_01','legs_02','legs_03','legs_04','legs_05','legs_06'];
const TEXTURES = [
  { key: '', label: '无' },
  { key: 'stripe', label: '条纹' },
  { key: 'dots', label: '波点' },
  { key: 'scales', label: '鳞片' },
  { key: 'fluffy', label: '毛茸' },
  { key: 'sparkle', label: '闪光' },
  { key: 'crack', label: '裂纹' },
];
const BRUSH_SIZES = [3, 6, 11, 18];

const EMOTIONS = [
  { key: '焦虑', label: '焦虑', icon: '😰' },
  { key: '悲伤', label: '悲伤', icon: '😢' },
  { key: '愤怒', label: '愤怒', icon: '😠' },
  { key: '恐惧', label: '恐惧', icon: '😨' },
  { key: '孤独', label: '孤独', icon: '😔' },
  { key: '其他', label: '其他', icon: '👾' },
];

const PART_DEFS = [
  { key: 'body',  label: '身体', optional: false, items: BODIES },
  { key: 'eyes',  label: '眼睛', optional: false, items: EYES },
  { key: 'mouth', label: '嘴巴', optional: false, items: MOUTHS },
  { key: 'horn',  label: '角',   optional: true,  items: HORNS },
  { key: 'tail',  label: '尾巴', optional: true,  items: TAILS },
  { key: 'arms',  label: '手',   optional: true,  items: ARMS },
  { key: 'legs',  label: '脚',   optional: true,  items: LEGS },
];

// 每个部件的颜色和材质独立存储
const partColors = reactive({ body: '#9B59B6', eyes: '#9B59B6', mouth: '#9B59B6', horn: '#9B59B6', tail: '#9B59B6', arms: '#9B59B6', legs: '#9B59B6' });
const partTextures = reactive({ body: '', eyes: '', mouth: '', horn: '', tail: '', arms: '', legs: '' });

const parts = reactive({
  body: 'body_01', eyes: 'eyes_01', mouth: 'mouth_01',
  horn: '', tail: '', arms: '', legs: '',
  color: '#9B59B6', texture: '',
});

// 当前正在编辑的部件
const activePart = ref('body');

function selectPart(key, val) {
  parts[key] = val;
  if (val) activePart.value = key;
}

function getPartColor(key) {
  return partColors[key] || parts.color;
}

function getPartTexture(key) {
  return partTextures[key] !== undefined ? partTextures[key] : parts.texture;
}

function setPartColor(c) {
  if (!activePart.value) return;
  partColors[activePart.value] = c;
  parts.color = c;
}

function setPartTexture(tx) {
  if (!activePart.value) return;
  partTextures[activePart.value] = tx;
}

function applyStyleToAll(c) {
  const color = activePart.value ? partColors[activePart.value] : parts.color;
  const texture = activePart.value ? partTextures[activePart.value] : parts.texture;
  PART_DEFS.forEach(p => {
    partColors[p.key] = color;
    partTextures[p.key] = texture;
  });
  parts.color = color;
  parts.texture = texture;
}

function applyColorToAll(c) {
  PART_DEFS.forEach(p => { partColors[p.key] = c; });
  parts.color = c;
}

function applyTextureToAll(tx) {
  PART_DEFS.forEach(p => { partTextures[p.key] = tx; });
  parts.texture = tx;
}

// SVG 内联缓存
const svgCache = reactive({});

async function loadSvg(path) {
  if (svgCache[path]) return;
  try {
    const res = await fetch(`/static/monster/${path}.svg`);
    const text = await res.text();
    svgCache[path] = text; // reactive 赋值会触发重渲染
  } catch (e) { /* ignore */ }
}

function coloredSvg(type, name, color) {
  const key = `${type}/${name}`;
  const raw = svgCache[key]; // 访问 reactive 属性，建立依赖
  if (!raw) { loadSvg(key); return ''; }
  return raw.replace(/currentColor/g, color || parts.color);
}

function partSvg(key) {
  if (!parts[key]) return '';
  const type = key; // body, eyes, mouth, etc.
  const name = parts[key];
  const cacheKey = `${type}/${name}`;
  const raw = svgCache[cacheKey]; // 建立响应式依赖
  if (!raw) { loadSvg(cacheKey); return ''; }
  return raw.replace(/currentColor/g, getPartColor(key));
}

function partTextureSvg(key) {
  const tx = getPartTexture(key);
  if (!tx) return '';
  const cacheKey = `texture/${tx}`;
  const raw = svgCache[cacheKey]; // 建立响应式依赖
  if (!raw) { loadSvg(cacheKey); return ''; }
  return raw;
}

// 预加载当前选中的部件
watch(() => [parts.body, parts.eyes, parts.mouth, parts.horn, parts.tail, parts.arms, parts.legs, parts.texture], () => {
  if (parts.body) loadSvg(`body/${parts.body}`);
  if (parts.eyes) loadSvg(`eyes/${parts.eyes}`);
  if (parts.mouth) loadSvg(`mouth/${parts.mouth}`);
  if (parts.horn) loadSvg(`horn/${parts.horn}`);
  if (parts.tail) loadSvg(`tail/${parts.tail}`);
  if (parts.arms) loadSvg(`arms/${parts.arms}`);
  if (parts.legs) loadSvg(`legs/${parts.legs}`);
  PART_DEFS.forEach(p => {
    const tx = getPartTexture(p.key);
    if (tx) loadSvg(`texture/${tx}`);
  });
}, { immediate: true });
const brushColor = ref('#9B59B6');
const brushSize = ref(6);
const isEraser = ref(false);
const canvasPaths = ref([]);
let currentPath = null;
let ctx = null;
let isMouseDown = false;

const form = reactive({ name: '', emotion: '', color: '#9B59B6' });
const canSave = computed(() => form.name.trim() && form.emotion);

onMounted(() => {
  ctx = uni.createCanvasContext('monsterCanvas');
});

function getTouchPos(e) {
  const t = e.touches[0];
  const el = document.getElementById('monsterCanvas');
  if (el) {
    const rect = el.getBoundingClientRect();
    // uni-app canvas 内部坐标与 CSS 像素一致（H5），不需要缩放
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  return { x: t.x, y: t.y };
}

function getMousePos(e) {
  const el = document.getElementById('monsterCanvas');
  if (el) {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  return { x: e.offsetX, y: e.offsetY };
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

function onTouchStart(e) { startPath(getTouchPos(e)); }
function onTouchMove(e) { addPoint(getTouchPos(e)); }
function onTouchEnd() { currentPath = null; }

function onMouseDown(e) { isMouseDown = true; startPath(getMousePos(e)); }
function onMouseMove(e) { if (isMouseDown) addPoint(getMousePos(e)); }
function onMouseUp() { isMouseDown = false; currentPath = null; }

function getCanvasSize() {
  const el = document.getElementById('monsterCanvas');
  if (el) return { w: el.offsetWidth, h: el.offsetHeight };
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
  if (drawMode.value === 'parts') form.color = parts.color;
  step.value = 2;
}

async function save() {
  if (!canSave.value) return;
  const drawingData = drawMode.value === 'parts'
    ? JSON.stringify({ type: 'parts', ...parts })
    : JSON.stringify({ type: 'canvas', paths: canvasPaths.value });
  const color = drawMode.value === 'parts' ? parts.color : form.color;

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
  width: 320rpx;
  height: 320rpx;
  border-radius: 28rpx;
  position: relative;
  overflow: visible;
  border: 1rpx solid rgba(123,78,158,0.12);
}

.preview-outer {
  display: flex;
  justify-content: center;
  margin-bottom: 24rpx;
  padding: 40rpx 0 24rpx;
}

.preview-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.p-body { position: absolute; width: 210rpx; height: 210rpx; top: 50%; left: 50%; transform: translate(-50%, -46%); }
.p-tail { position: absolute; width: 90rpx; height: 90rpx; bottom: 30rpx; right: 10rpx; }
.p-horn { position: absolute; top: 14rpx; left: 50%; transform: translateX(-50%); width: 80rpx; height: 64rpx; }
.p-eyes { position: absolute; top: 90rpx; left: 50%; transform: translateX(-50%); width: 160rpx; height: 50rpx; }
.p-mouth { position: absolute; top: 148rpx; left: 50%; transform: translateX(-50%); width: 130rpx; height: 50rpx; }
.p-arms { position: absolute; top: 120rpx; left: 50%; transform: translateX(-50%); width: 280rpx; height: 64rpx; }
.p-legs { position: absolute; bottom: 10rpx; left: 50%; transform: translateX(-50%); width: 150rpx; height: 64rpx; }

.p-body, .p-tail, .p-horn, .p-eyes, .p-mouth {
  display: flex;
  align-items: center;
  justify-content: center;
  :deep(svg) { width: 100%; height: 100%; }
}

.p-texture-layer {
  opacity: 0.45;
  mix-blend-mode: overlay;
  pointer-events: none;
  :deep(svg) { width: 100%; height: 100%; }
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

.style-panel {
  background: $white;
  border-radius: 20rpx;
  padding: 20rpx 20rpx 16rpx;
  margin-bottom: 24rpx;
  border: 1rpx solid $purple-light;
  box-shadow: 0 2rpx 12rpx rgba(123,78,158,0.07);
}

.style-panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.style-panel-hint {
  font-size: 22rpx;
  color: $text-muted;
}

.apply-all-btn {
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  background: $purple-light;
}

.apply-all-text {
  font-size: 20rpx;
  color: $purple;
}

.part-chip.active {
  border: 2rpx solid $purple;
  background: rgba(123,78,158,0.1);
  box-shadow: 0 0 0 3rpx rgba(123,78,158,0.2);
}

.part-override-panel {
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  background: rgba(123,78,158,0.05);
  border-radius: 16rpx;
  border: 1rpx solid $purple-light;
}

.override-label {
  display: block;
  font-size: 22rpx;
  color: $text-muted;
  margin-bottom: 10rpx;
}

.part-detail-toggle {
  margin-top: 10rpx;
  display: inline-flex;
  padding: 6rpx 0;
}

.part-detail-text {
  font-size: 22rpx;
  color: $purple;
}

.override-reset, .override-reset-tx {
  background: $white;
  border: 2rpx solid $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;
}

.part-label-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin-bottom: 14rpx;

  .section-label { margin-bottom: 0; }
}

.part-color-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.part-color-dot {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid transparent;
  box-sizing: border-box;
  transition: transform 0.12s;

  &.selected {
    border-color: $text-main;
    transform: scale(1.18);
  }
}

.p-texture {
  opacity: 0.6;
  mix-blend-mode: multiply;
}

.texture-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  cursor: pointer;

  &.selected .texture-preview {
    border: 2rpx solid $purple;
    background: rgba(123,78,158,0.06);
  }
}

.texture-preview {
  width: 80rpx;
  height: 64rpx;
  border-radius: 14rpx;
  background: $white;
  border: 2rpx solid $purple-light;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.texture-none {
  background: $white;
}

.texture-img {
  width: 72rpx;
  height: 58rpx;
}

.texture-label {
  font-size: 20rpx;
  color: $text-muted;
}



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
