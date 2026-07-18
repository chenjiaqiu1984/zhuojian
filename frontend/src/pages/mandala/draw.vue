<template>
  <view class="page">
    <!-- 顶部工具栏 -->
    <view class="top-bar">
      <view class="top-left">
        <view class="icon-btn" @click="onBack">
          <text class="icon-text">←</text>
        </view>
      </view>
      <text class="top-title">曼达拉创作</text>
      <view class="top-right">
        <view class="sym-control">
          <view class="icon-btn sym-btn" :class="{ active: symmetry }" @click="symmetry = !symmetry">
            <text class="icon-text">✦</text>
          </view>
          <view v-if="symmetry" class="sym-count-row">
            <view
              v-for="n in SYM_OPTIONS" :key="n"
              class="sym-count-item"
              :class="{ active: symmetryCount === n }"
              @click="setSymmetryCount(n)"
            >
              <text class="sym-count-text">{{ n }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 画布区域 -->
    <view class="canvas-wrap">
      <view class="canvas-box" id="canvasBox">
        <canvas
          canvas-id="mandalaCanvas"
          id="mandalaCanvas"
          class="mandala-canvas"
          :style="canvasTransformStyle"
        />
        <!-- 手势捕获层，覆盖在 canvas 上方 -->
        <view
          class="gesture-layer"
          @touchstart.prevent="onTouchStart"
          @touchmove.prevent="onTouchMove"
          @touchend="onTouchEnd"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @wheel.prevent="onWheel"
          @dblclick="resetTransform"
        />
        <!-- 对称提示 -->
        <view v-if="symmetry" class="sym-badge">
          <text class="sym-badge-text">{{ symmetryCount }} 折对称</text>
        </view>
        <!-- 缩放比例提示（非1.0时显示） -->
        <view v-if="Math.abs(transform.scale - 1.0) > 0.05" class="zoom-badge">
          <text class="zoom-badge-text">{{ transform.scale.toFixed(1) }}x</text>
        </view>
      </view>
    </view>

    <!-- 底部工具面板 -->
    <view class="toolbar">
      <!-- 笔触模式行 -->
      <scroll-view scroll-x class="mode-scroll">
        <view class="mode-row">
          <view
            v-for="m in MODES" :key="m.key"
            class="mode-btn"
            :class="{ active: drawMode === m.key }"
            @click="setDrawMode(m.key)"
          >
            <text class="mode-icon">{{ m.icon }}</text>
            <text class="mode-label">{{ m.label }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 颜色行 -->
      <scroll-view scroll-x class="color-scroll">
        <view class="color-row">
          <view
            v-for="c in COLORS" :key="c"
            class="color-dot"
            :class="{ selected: !isEraser && brushColor === c }"
            :style="{ background: c }"
            @click="pickColor(c)"
          />
        </view>
      </scroll-view>

      <!-- 操作行 -->
      <view class="action-row">
        <!-- 画笔大小 -->
        <scroll-view scroll-x class="size-scroll">
          <view class="size-group">
            <view
              v-for="s in SIZES" :key="s"
              class="size-dot"
              :class="{ selected: brushSize === s && !isEraser }"
              :style="{ width: s * 3 + 'rpx', height: s * 3 + 'rpx', minWidth: s * 3 + 'rpx', background: brushColor }"
              @click="pickSize(s)"
            />
          </view>
        </scroll-view>

        <view class="divider-v" />

        <!-- 橡皮擦 -->
        <view class="tool-btn" :class="{ active: isEraser }" @click="isEraser = !isEraser">
          <text class="tool-icon">⌫</text>
        </view>

        <view class="divider-v" />

        <!-- 撤销 / 重做 -->
        <view class="tool-btn" :class="{ disabled: !canUndo }" @click="undo">
          <text class="tool-icon">↩</text>
        </view>
        <view class="tool-btn" :class="{ disabled: !canRedo }" @click="redo">
          <text class="tool-icon">↪</text>
        </view>

        <view class="divider-v" />

        <!-- 清空 -->
        <view class="tool-btn tool-btn--outline" @click="clearCanvas">
          <text class="tool-icon">🗑</text>
        </view>

        <!-- 重新开始 -->
        <view class="tool-btn tool-btn--danger" @click="resetCanvas">
          <text class="tool-icon">↺</text>
        </view>

        <view class="spacer" />

        <!-- 保存 -->
        <view class="save-btn" @click="onSave">
          <text class="save-text">保存</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const SYM_OPTIONS = [4, 6, 8, 10, 12];
const COLORS = [
  '#E8524A', '#F0843A', '#F5C842', '#7DC95E', '#4AB8A0',
  '#3A8AC9', '#6A5ACD', '#C45AB3', '#F48FB1', '#FFFFFF',
  '#D4A76A', '#8B5E3C', '#4A4A4A', '#1C1C1C',
];
const SIZES = [1, 2, 3, 5, 8, 12, 18, 26];
const MODES = [
  { key: 'free',      icon: '✏️', label: '自由' },
  { key: 'line',      icon: '╱',  label: '直线' },
  { key: 'arc',       icon: '◠',  label: '弧线' },
  { key: 'rect',      icon: '▭',  label: '矩形' },
  { key: 'square',    icon: '□',  label: '正方' },
  { key: 'diamond',   icon: '◇',  label: '菱形' },
  { key: 'circle',    icon: '○',  label: '圆形' },
  { key: 'semicircle',icon: '◑',  label: '半圆' },
];
const BG_COLOR = '#FDF8F2';
const MIN_SCALE = 0.5;
const MAX_SCALE = 4.0;

// ── 响应式状态 ──
const symmetryCount = ref(8);
const brushColor    = ref('#E8524A');
const brushSize     = ref(6);
const isEraser      = ref(false);
const symmetry      = ref(true);
const drawMode      = ref('free'); // 'free' | 'line' | 'arc'

// 变换状态
const transform = ref({ scale: 1.0, offsetX: 0, offsetY: 0 });

// 撤销/重做栈
const undoStack = ref([]);
const redoStack = ref([]);
const canUndo   = computed(() => undoStack.value.length > 0);
const canRedo   = computed(() => redoStack.value.length > 0);

// canvas transform style
const canvasTransformStyle = computed(() => {
  const { scale, offsetX, offsetY } = transform.value;
  return `transform: scale(${scale}) translate(${offsetX}px, ${offsetY}px); transform-origin: center center;`;
});

// ── 内部状态（非响应式）──
let paths       = [];   // Array<{type,color,width,eraser,points[]}>
let currentPath = null;
let ctx         = null;
let canvasSize  = { w: 600, h: 600 };
let isMouseDown = false;

// 直线/弧线预览状态
let previewStart  = null; // {x,y}
let previewCurrent = null; // {x,y}
let arcState      = 0;    // 0=等待起点, 1=等待终点（弧线专用）
let arcStart      = null;
let arcEnd        = null;

// 捏合手势状态
let lastPinchDist  = null;
let lastPinchMid   = null;

// 平移模式状态
let isPanMode        = false;
let panTimer         = null;
let panStartTouch    = null;
let lastPanTouch     = null;

// canvas 元素位置缓存（小程序端用 selectorQuery，H5 用 getBoundingClientRect）
let canvasRect = null;

onMounted(() => {
  const pages = getCurrentPages();
  const cur   = pages[pages.length - 1];
  setTimeout(() => { initCanvas(); }, 100);
});

onUnmounted(() => { ctx = null; });

// ── 初始化 ──
function initCanvas() {
  try {
    // #ifdef H5
    const el = document.getElementById('mandalaCanvas');
    if (el) {
      canvasSize = { w: el.offsetWidth, h: el.offsetHeight };
      canvasRect = el.getBoundingClientRect();
    }
    // #endif
    // #ifdef MP-WEIXIN
    const query = uni.createSelectorQuery();
    query.select('#mandalaCanvas').boundingClientRect(rect => {
      if (rect) {
        canvasSize = { w: rect.width, h: rect.height };
        canvasRect = rect;
      }
    }).exec();
    // #endif
    ctx = uni.createCanvasContext('mandalaCanvas');
    drawBackground();
    ctx.draw();
  } catch (e) {
    uni.showToast({ title: '画布加载失败，请重试', icon: 'none' });
  }
}

// 刷新 canvasRect（每次手势开始时调用以获取最新位置）
function refreshCanvasRect(cb) {
  // #ifdef H5
  const el = document.getElementById('mandalaCanvas');
  if (el) { canvasRect = el.getBoundingClientRect(); }
  if (cb) cb();
  // #endif
  // #ifdef MP-WEIXIN
  const query = uni.createSelectorQuery();
  query.select('#mandalaCanvas').boundingClientRect(rect => {
    if (rect) { canvasRect = rect; }
    if (cb) cb();
  }).exec();
  // #endif
}

// ── 坐标变换 ──
// 将绝对屏幕坐标转为 canvas 原始坐标系
function toCanvasCoord(clientX, clientY) {
  if (!canvasRect) return { x: clientX, y: clientY };
  const { scale, offsetX, offsetY } = transform.value;
  const cx = canvasRect.width  / 2;
  const cy = canvasRect.height / 2;
  // 转为相对 canvas-box 的局部坐标
  const localX = clientX - canvasRect.left;
  const localY = clientY - canvasRect.top;
  // 反算 CSS transform: scale(s) translate(ox, oy)，origin=center
  // 正变换: local' = (local - center) * s + center + s * offset
  // 反变换: local  = (local' - center) / s - offset + center
  const x = (localX - cx) / scale - offsetX + cx;
  const y = (localY - cy) / scale - offsetY + cy;
  // 映射到 canvas 像素坐标（canvas-box 尺寸 vs canvas 逻辑尺寸）
  const scaleX = canvasSize.w / canvasRect.width;
  const scaleY = canvasSize.h / canvasRect.height;
  return { x: x * scaleX, y: y * scaleY };
}

// 从 touch/mouse 事件提取绝对屏幕坐标
function getClientPos(touchOrEvent) {
  if (touchOrEvent.clientX !== undefined) {
    return { x: touchOrEvent.clientX, y: touchOrEvent.clientY };
  }
  // 小程序 touch：x/y 是相对页面坐标，需加上 canvasRect 的 top/left 偏移
  // 实际上小程序 touch.pageX/pageY 最可靠
  const px = touchOrEvent.pageX ?? touchOrEvent.x ?? 0;
  const py = touchOrEvent.pageY ?? touchOrEvent.y ?? 0;
  return { x: px, y: py };
}

// ── 触摸事件 ──
function onTouchStart(e) {
  refreshCanvasRect(() => {
    const touches = e.touches;
    if (touches.length === 2) {
      clearPanTimer();
      isPanMode = false;
      currentPath = null;
      lastPinchDist = getPinchDist(touches);
      lastPinchMid  = getPinchMid(touches);
      return;
    }
    lastPinchDist = null;
    const t = touches[0];
    const client = getClientPos(t);
    const canvasPos = toCanvasCoord(client.x, client.y);

    panStartTouch = { ...client };
    lastPanTouch  = { ...client };
    panTimer = setTimeout(() => {
      isPanMode = true;
      panTimer  = null;
    }, 200);

    handleDrawStart(canvasPos);
  });
}

function onTouchMove(e) {
  const touches = e.touches;

  if (touches.length === 2 && lastPinchDist !== null) {
    clearPanTimer();
    isPanMode = false;
    const newDist = getPinchDist(touches);
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.value.scale * newDist / lastPinchDist));
    transform.value = { ...transform.value, scale: newScale };
    lastPinchDist = newDist;
    return;
  }

  if (touches.length === 1) {
    const t = touches[0];
    const client = getClientPos(t);

    if (isPanMode) {
      const dx = (client.x - lastPanTouch.x) / transform.value.scale;
      const dy = (client.y - lastPanTouch.y) / transform.value.scale;
      transform.value = {
        ...transform.value,
        offsetX: transform.value.offsetX + dx,
        offsetY: transform.value.offsetY + dy,
      };
      lastPanTouch = { ...client };
      return;
    }

    if (panTimer && panStartTouch) {
      const dx = client.x - panStartTouch.x;
      const dy = client.y - panStartTouch.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) clearPanTimer();
    }

    const canvasPos = toCanvasCoord(client.x, client.y);
    handleDrawMove(canvasPos);
  }
}

function onTouchEnd(e) {
  clearPanTimer();
  isPanMode     = false;
  lastPinchDist = null;
  if (e.touches.length === 0) handleDrawEnd();
}

// ── 鼠标事件（H5）──
function onMouseDown(e) {
  // #ifdef H5
  isMouseDown = true;
  refreshCanvasRect(() => {
    const pos = toCanvasCoord(e.clientX, e.clientY);
    handleDrawStart(pos);
  });
  // #endif
}

function onMouseMove(e) {
  // #ifdef H5
  if (!isMouseDown) return;
  const pos = toCanvasCoord(e.clientX, e.clientY);
  handleDrawMove(pos);
  // #endif
}

function onMouseUp(e) {
  // #ifdef H5
  if (!isMouseDown) return;
  isMouseDown = false;
  handleDrawEnd();
  // #endif
}

// 鼠标滚轮缩放（H5）
function onWheel(e) {
  // #ifdef H5
  const delta  = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.value.scale * delta));
  transform.value = { ...transform.value, scale: newScale };
  // #endif
}

// 双击重置
function resetTransform() {
  transform.value = { scale: 1.0, offsetX: 0, offsetY: 0 };
}

// ── 绘画逻辑分派 ──
const SHAPE_MODES = new Set(['rect', 'square', 'diamond', 'circle', 'semicircle']);

function handleDrawStart(pos) {
  if (drawMode.value === 'free') {
    startFreePath(pos);
  } else if (drawMode.value === 'line') {
    previewStart   = pos;
    previewCurrent = pos;
    currentPath = null;
  } else if (drawMode.value === 'arc') {
    if (arcState === 0) {
      arcStart  = pos;
      arcEnd    = null;
      arcState  = 1;
      previewCurrent = pos;
    } else if (arcState === 1) {
      arcEnd = pos;
      const ctrl = midPoint(arcStart, pos);
      commitArcPath(arcStart, ctrl, arcEnd);
      arcState = 0; arcStart = null; arcEnd = null;
      previewStart = null; previewCurrent = null;
    }
  } else if (SHAPE_MODES.has(drawMode.value)) {
    previewStart   = pos;
    previewCurrent = pos;
    currentPath = null;
  }
}

function handleDrawMove(pos) {
  if (drawMode.value === 'free') {
    addFreePoint(pos);
  } else if (drawMode.value === 'line') {
    if (previewStart) { previewCurrent = pos; redrawCanvas(true); }
  } else if (drawMode.value === 'arc') {
    if (arcState === 1 && arcStart) { previewCurrent = pos; redrawCanvas(true); }
  } else if (SHAPE_MODES.has(drawMode.value)) {
    if (previewStart) { previewCurrent = pos; redrawCanvas(true); }
  }
}

function handleDrawEnd() {
  if (drawMode.value === 'free') {
    endFreePath();
  } else if (drawMode.value === 'line') {
    if (previewStart && previewCurrent) commitLinePath(previewStart, previewCurrent);
    previewStart = null; previewCurrent = null;
  } else if (SHAPE_MODES.has(drawMode.value)) {
    if (previewStart && previewCurrent) commitShapePath(drawMode.value, previewStart, previewCurrent);
    previewStart = null; previewCurrent = null;
  }
}

// ── 自由笔触 ──
function startFreePath(pos) {
  currentPath = {
    type:   'free',
    color:  isEraser.value ? BG_COLOR : brushColor.value,
    width:  isEraser.value ? brushSize.value * 4 : brushSize.value,
    eraser: isEraser.value,
    points: [pos],
  };
  paths.push(currentPath);
  redoStack.value = [];
}

function addFreePoint(pos) {
  if (!currentPath) return;
  currentPath.points.push(pos);
  redrawCanvas(false);
}

function endFreePath() {
  if (!currentPath) return;
  currentPath = null;
  pushUndo();
}

// ── 图形提交 ──
function commitShapePath(type, start, end) {
  paths.push({
    type,
    color:  isEraser.value ? BG_COLOR : brushColor.value,
    width:  isEraser.value ? brushSize.value * 4 : brushSize.value,
    eraser: isEraser.value,
    points: [start, end],
  });
  redoStack.value = [];
  pushUndo();
  redrawCanvas(false);
}
function commitLinePath(start, end) {
  paths.push({
    type:   'line',
    color:  isEraser.value ? BG_COLOR : brushColor.value,
    width:  isEraser.value ? brushSize.value * 4 : brushSize.value,
    eraser: isEraser.value,
    points: [start, end],
  });
  redoStack.value = [];
  pushUndo();
  redrawCanvas(false);
}

// ── 弧线提交 ──
function commitArcPath(start, ctrl, end) {
  paths.push({
    type:   'arc',
    color:  isEraser.value ? BG_COLOR : brushColor.value,
    width:  isEraser.value ? brushSize.value * 4 : brushSize.value,
    eraser: isEraser.value,
    points: [start, ctrl, end],
  });
  redoStack.value = [];
  pushUndo();
  redrawCanvas(false);
}

// ── 撤销栈 ──
function pushUndo() {
  undoStack.value.push(paths.map(p => ({ ...p, points: [...p.points] })));
  if (undoStack.value.length > 50) undoStack.value.shift();
}

// ── 绘制 ──
function drawBackground() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
  const cx     = canvasSize.w / 2;
  const cy     = canvasSize.h / 2;
  const radii  = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
  ctx.strokeStyle = 'rgba(180,160,140,0.18)';
  ctx.lineWidth   = 1;
  for (const r of radii) {
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cx, cy) * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (symmetry.value) {
    for (let i = 0; i < symmetryCount.value; i++) {
      const angle = (Math.PI * 2 * i) / symmetryCount.value;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * Math.min(cx, cy), cy + Math.sin(angle) * Math.min(cx, cy));
      ctx.stroke();
    }
  }
}

function drawPath(path) {
  if (!ctx) return;
  const cx    = canvasSize.w / 2;
  const cy    = canvasSize.h / 2;
  const count = symmetry.value ? symmetryCount.value : 1;
  // 线宽不跟随缩放变化：除以当前 scale
  const lw = path.width / transform.value.scale;

  if (path.type === 'free') {
    if (path.points.length < 2) return;
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      const first = rotatePoint(path.points[0], cx, cy, angle);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < path.points.length; i++) {
        const p = rotatePoint(path.points[i], cx, cy, angle);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  } else if (path.type === 'line') {
    if (path.points.length < 2) return;
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      const p0 = rotatePoint(path.points[0], cx, cy, angle);
      const p1 = rotatePoint(path.points[1], cx, cy, angle);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  } else if (path.type === 'arc') {
    if (path.points.length < 3) return;
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      const p0 = rotatePoint(path.points[0], cx, cy, angle);
      const p1 = rotatePoint(path.points[1], cx, cy, angle);
      const p2 = rotatePoint(path.points[2], cx, cy, angle);
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.stroke();
    }
  } else if (SHAPE_MODES.has(path.type)) {
    if (path.points.length < 2) return;
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      drawShape(ctx, path.type, path.points[0], path.points[1], cx, cy, angle);
      ctx.stroke();
    }
  }
}

// 绘制预览线（直线/弧线/图形 move 时）
function drawPreview() {
  if (!ctx) return;
  const cx    = canvasSize.w / 2;
  const cy    = canvasSize.h / 2;
  const count = symmetry.value ? symmetryCount.value : 1;
  const color = isEraser.value ? BG_COLOR : brushColor.value;
  const lw    = (isEraser.value ? brushSize.value * 4 : brushSize.value) / transform.value.scale;

  if (drawMode.value === 'line' && previewStart && previewCurrent) {
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.setLineDash([6, 4]);
      const p0 = rotatePoint(previewStart,   cx, cy, angle);
      const p1 = rotatePoint(previewCurrent, cx, cy, angle);
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (drawMode.value === 'arc' && arcState === 1 && arcStart && previewCurrent) {
    const ctrl = midPoint(arcStart, previewCurrent);
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.setLineDash([6, 4]);
      const p0 = rotatePoint(arcStart,       cx, cy, angle);
      const p1 = rotatePoint(ctrl,           cx, cy, angle);
      const p2 = rotatePoint(previewCurrent, cx, cy, angle);
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (SHAPE_MODES.has(drawMode.value) && previewStart && previewCurrent) {
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.setLineDash([6, 4]);
      drawShape(ctx, drawMode.value, previewStart, previewCurrent, cx, cy, angle);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ── 图形绘制辅助 ──
function drawShape(c, type, start, end, cx, cy, rotAngle) {
  // 先在原始坐标系计算图形顶点，再旋转
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (type === 'rect') {
    // 矩形：start 为一角，end 为对角
    const pts = [
      { x: start.x,       y: start.y },
      { x: start.x + dx,  y: start.y },
      { x: start.x + dx,  y: start.y + dy },
      { x: start.x,       y: start.y + dy },
    ];
    const rpts = pts.map(p => rotatePoint(p, cx, cy, rotAngle));
    c.moveTo(rpts[0].x, rpts[0].y);
    rpts.slice(1).forEach(p => c.lineTo(p.x, p.y));
    c.closePath();

  } else if (type === 'square') {
    // 正方形：以 start 为中心，dx 决定半边长
    const half = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
    const mx   = (start.x + end.x) / 2;
    const my   = (start.y + end.y) / 2;
    const pts  = [
      { x: mx - half, y: my - half },
      { x: mx + half, y: my - half },
      { x: mx + half, y: my + half },
      { x: mx - half, y: my + half },
    ];
    const rpts = pts.map(p => rotatePoint(p, cx, cy, rotAngle));
    c.moveTo(rpts[0].x, rpts[0].y);
    rpts.slice(1).forEach(p => c.lineTo(p.x, p.y));
    c.closePath();

  } else if (type === 'diamond') {
    // 菱形：以 start 为中心，dx/dy 为半轴
    const mx  = (start.x + end.x) / 2;
    const my  = (start.y + end.y) / 2;
    const rx  = Math.abs(dx) / 2;
    const ry  = Math.abs(dy) / 2;
    const pts = [
      { x: mx,      y: my - ry },
      { x: mx + rx, y: my },
      { x: mx,      y: my + ry },
      { x: mx - rx, y: my },
    ];
    const rpts = pts.map(p => rotatePoint(p, cx, cy, rotAngle));
    c.moveTo(rpts[0].x, rpts[0].y);
    rpts.slice(1).forEach(p => c.lineTo(p.x, p.y));
    c.closePath();

  } else if (type === 'circle') {
    // 圆形：以 start 为圆心，距离为半径
    const r   = Math.sqrt(dx * dx + dy * dy);
    const rc  = rotatePoint(start, cx, cy, rotAngle);
    // 旋转后圆心画圆（圆不需要旋转顶点）
    c.arc(rc.x, rc.y, r, 0, Math.PI * 2);

  } else if (type === 'semicircle') {
    // 半圆：start 为圆心，end 决定半径和朝向
    const r     = Math.sqrt(dx * dx + dy * dy);
    const baseAngle = Math.atan2(dy, dx);
    const rc    = rotatePoint(start, cx, cy, rotAngle);
    // 旋转后的朝向角度
    const startA = baseAngle + rotAngle;
    c.arc(rc.x, rc.y, r, startA, startA + Math.PI);
    c.closePath();
  }
}

function redrawCanvas(withPreview) {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
  drawBackground();
  for (const path of paths) {
    drawPath(path);
  }
  if (withPreview) drawPreview();
  ctx.draw();
}

// ── 工具函数 ──
function rotatePoint(p, cx, cy, angle) {
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

function midPoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function getPinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPinchMid(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function clearPanTimer() {
  if (panTimer) { clearTimeout(panTimer); panTimer = null; }
}

// ── 对称折数 ──
function setSymmetryCount(n) {
  symmetryCount.value = n;
  redrawCanvas(false);
}

// ── 模式切换 ──
function setDrawMode(mode) {
  drawMode.value = mode;
  arcState  = 0;
  arcStart  = null;
  arcEnd    = null;
  previewStart   = null;
  previewCurrent = null;
  currentPath    = null;
}

// ── 撤销 / 重做 ──
function undo() {
  if (!canUndo.value) return;
  redoStack.value.push(paths.map(p => ({ ...p, points: [...p.points] })));
  undoStack.value.pop();
  paths = undoStack.value.length > 0
    ? undoStack.value[undoStack.value.length - 1].map(p => ({ ...p, points: [...p.points] }))
    : [];
  redrawCanvas(false);
}

function redo() {
  if (!canRedo.value) return;
  const next = redoStack.value.pop();
  paths = next.map(p => ({ ...p, points: [...p.points] }));
  undoStack.value.push(next.map(p => ({ ...p, points: [...p.points] })));
  redrawCanvas(false);
}

// ── 清空 ──
function clearCanvas() {
  uni.showModal({
    title: '清空画布',
    content: '确定要清空当前作品吗？',
    success: (res) => {
      if (!res.confirm) return;
      pushUndo();
      paths       = [];
      currentPath = null;
      arcState    = 0;
      arcStart    = null;
      redoStack.value = [];
      redrawCanvas(false);
    },
  });
}

// ── 重新开始 ──
function resetCanvas() {
  uni.showModal({
    title: '重新开始',
    content: '将清空所有笔迹并恢复初始画布，确定吗？',
    success: (res) => {
      if (!res.confirm) return;
      paths           = [];
      currentPath     = null;
      arcState        = 0;
      arcStart        = null;
      arcEnd          = null;
      previewStart    = null;
      previewCurrent  = null;
      undoStack.value = [];
      redoStack.value = [];
      transform.value = { scale: 1.0, offsetX: 0, offsetY: 0 };
      redrawCanvas(false);
    },
  });
}

// ── 工具选择 ──
function pickColor(c) {
  brushColor.value = c;
  isEraser.value   = false;
}

function pickSize(s) {
  brushSize.value = s;
  isEraser.value  = false;
}

// ── 保存 ──
function onSave() {
  if (paths.length === 0) {
    uni.showToast({ title: '请先画点什么', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '保存中…' });
  uni.canvasToTempFilePath({
    canvasId: 'mandalaCanvas',
    fileType: 'jpg',
    quality:  0.92,
    success: (res) => {
      uni.hideLoading();
      // #ifdef MP-WEIXIN
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
        fail:    () => uni.showToast({ title: '保存失败',   icon: 'none'    }),
      });
      // #endif
      // #ifdef H5
      const a    = document.createElement('a');
      a.href     = res.tempFilePath;
      a.download = `曼达拉_${Date.now()}.jpg`;
      a.click();
      uni.showToast({ title: '已下载', icon: 'success' });
      // #endif
    },
    fail: () => {
      uni.hideLoading();
      uni.showToast({ title: '保存失败', icon: 'none' });
    },
  });
}

// ── 返回 ──
function onBack() {
  if (paths.length > 0) {
    uni.showModal({
      title:   '离开创作',
      content: '作品尚未保存，确定要离开吗？',
      success: (res) => { if (res.confirm) uni.navigateBack(); },
    });
  } else {
    uni.navigateBack();
  }
}
</script>

<style scoped lang="scss">
$bg:          #F5F7F6;
$teal:        #3A7E8A;
$text-1:      #1C2A27;
$text-muted:  #9BBCB4;
$toolbar-bg:  #FFFFFF;

.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg;
  overflow: hidden;
}

/* ── 顶部栏 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: $toolbar-bg;
  border-bottom: 1rpx solid #EEF2F1;
  flex-shrink: 0;
}

.top-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-1;
  letter-spacing: 0.04em;
}

.top-left,
.top-right {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.top-right {
  justify-content: flex-end;
  width: auto;
  gap: 8rpx;
}

.sym-control {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.sym-count-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #F0F4F3;
  border-radius: 24rpx;
  padding: 4rpx 8rpx;
}

.sym-count-item {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;

  &.active { background: $teal; }
  &:active { opacity: 0.7; }
}

.sym-count-text {
  font-size: 20rpx;
  color: $text-1;
  font-weight: 500;

  .active & { color: #FFFFFF; }
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #F0F4F3;
  display: flex;
  align-items: center;
  justify-content: center;

  &.active { background: #D0EBE8; }
  &:active { opacity: 0.7; }
}

.sym-btn.active .icon-text { color: $teal; }

.icon-text {
  font-size: 28rpx;
  color: $text-1;
}

/* ── 画布 ── */
.canvas-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  min-height: 0;
}

.canvas-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 680rpx;
  border-radius: 20rpx;
  overflow: visible;
  box-shadow: 0 4rpx 24rpx rgba(58, 126, 138, 0.12);
}

.mandala-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 20rpx;
  will-change: transform;
}

/* 手势捕获层：覆盖在 canvas 上方，完全透明 */
.gesture-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  background: transparent;
}

.sym-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: rgba(58, 126, 138, 0.75);
  border-radius: 20rpx;
  padding: 4rpx 16rpx;
  pointer-events: none;
  z-index: 20;
}

.sym-badge-text {
  font-size: 18rpx;
  color: #FFFFFF;
  letter-spacing: 0.05em;
}

.zoom-badge {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: rgba(58, 126, 138, 0.75);
  border-radius: 20rpx;
  padding: 4rpx 16rpx;
  pointer-events: none;
  z-index: 20;
}

.zoom-badge-text {
  font-size: 18rpx;
  color: #FFFFFF;
  letter-spacing: 0.05em;
}

/* ── 工具栏 ── */
.toolbar {
  flex-shrink: 0;
  background: $toolbar-bg;
  border-top: 1rpx solid #EEF2F1;
  padding: 12rpx 24rpx 32rpx;
}

/* 笔触模式行 */
.mode-scroll {
  width: 100%;
  margin-bottom: 14rpx;
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #F0F4F3;
  border-radius: 24rpx;
  padding: 6rpx 10rpx;
  white-space: nowrap;
}

.mode-btn {
  flex: 1;
  height: 56rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  transition: background 0.15s;

  &.active {
    background: $teal;

    .mode-icon,
    .mode-label { color: #FFFFFF; }
  }

  &:active { opacity: 0.7; }
}

.mode-icon {
  font-size: 24rpx;
  color: $text-1;
}

.mode-label {
  font-size: 22rpx;
  color: $text-1;
  font-weight: 500;
}

/* 颜色行 */
.color-scroll {
  width: 100%;
  margin-bottom: 14rpx;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 4rpx 2rpx;
  white-space: nowrap;
}

.color-dot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  flex-shrink: 0;
  border: 3rpx solid transparent;
  box-sizing: border-box;
  transition: transform 0.15s;

  &.selected {
    border-color: $teal;
    transform: scale(1.18);
    box-shadow: 0 0 0 4rpx rgba(58, 126, 138, 0.22);
  }

  &:active { transform: scale(0.92); }
}

/* 操作行 */
.action-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.size-group {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 0 4rpx;
  white-space: nowrap;
}

.size-scroll {
  flex: 1;
  min-width: 0;
}

.size-dot {
  border-radius: 50%;
  flex-shrink: 0;
  border: 3rpx solid transparent;
  box-sizing: border-box;
  transition: transform 0.15s;
  min-width: 12rpx;
  min-height: 12rpx;

  &.selected {
    border-color: $teal;
    box-shadow: 0 0 0 3rpx rgba(58, 126, 138, 0.22);
  }
}

.divider-v {
  width: 1rpx;
  height: 40rpx;
  background: #E5ECEB;
  margin: 0 4rpx;
  flex-shrink: 0;
}

.tool-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #F0F4F3;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.active  { background: #D0EBE8; }
  &.disabled { opacity: 0.35; }
  &:active:not(.disabled) { transform: scale(0.93); }

  // 清空按钮：描边风格，弱化视觉权重
  &--outline {
    background: transparent;
    border: 1rpx solid #C8D8D2;
  }

  // 重置按钮：轻红色，提示危险操作
  &--danger {
    background: rgba(231,76,60,0.08);
    .tool-icon { color: #E74C3C; }
  }
}

.tool-icon { font-size: 28rpx; }

.spacer { flex: 1; }

.save-btn {
  height: 64rpx;
  padding: 0 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #3A7E8A 0%, #1E5870 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(30, 88, 112, 0.28);
  flex-shrink: 0;

  &:active { transform: scale(0.96); }
}

.save-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 0.06em;
}
</style>
