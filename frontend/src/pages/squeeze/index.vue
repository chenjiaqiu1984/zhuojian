<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="icon-btn" @click="onBack">
        <text class="icon-text">←</text>
      </view>
      <text class="top-title">解压捏捏乐</text>
      <view class="top-right">
        <view class="mode-btn" @click="showModeSheet = true">
          <text class="mode-btn-text">{{ currentMode.label }}</text>
          <text class="mode-btn-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 页头卡片 -->
    <view class="hero-card">
      <view class="hero-glow" />
      <text class="hero-emoji">{{ currentMode.emoji }}</text>
      <text class="hero-title">{{ currentMode.title }}</text>
      <text class="hero-desc">{{ currentMode.desc }}</text>
      <view class="hero-stats">
        <view class="stat-item">
          <text class="stat-num">{{ poppedCount }}</text>
          <text class="stat-label">已解压</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ totalCount - poppedCount }}</text>
          <text class="stat-label">剩余</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ comboCount }}</text>
          <text class="stat-label">连击</text>
        </view>
      </view>
    </view>

    <!-- Canvas 区域 -->
    <view class="canvas-wrap">
      <canvas
        canvas-id="squeezeCanvas"
        class="squeeze-canvas"
        :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @click="onCanvasClick"
      />
      <!-- 全部完成遮罩 -->
      <view v-if="isAllPopped" class="done-overlay">
        <text class="done-emoji">🎉</text>
        <text class="done-title">全部解压完成！</text>
        <text class="done-sub">感觉轻松多了吗？</text>
        <view class="done-btn" @click="resetBubbles">
          <text class="done-btn-text">再来一次</text>
        </view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view class="footer-btn secondary" @click="resetBubbles">
        <text class="footer-btn-text">重置</text>
      </view>
      <view class="footer-btn primary" @click="popAll">
        <text class="footer-btn-text">一键全破</text>
      </view>
    </view>

    <!-- 模式选择弹层 -->
    <view v-if="showModeSheet" class="sheet-mask" @click="showModeSheet = false">
      <view class="sheet" @click.stop>
        <view class="sheet-handle" />
        <text class="sheet-title">选择解压模式</text>
        <view class="mode-list">
          <view
            v-for="m in MODES"
            :key="m.key"
            class="mode-item"
            :class="{ active: modeKey === m.key }"
            @click="switchMode(m.key)"
          >
            <text class="mode-item-emoji">{{ m.emoji }}</text>
            <view class="mode-item-info">
              <text class="mode-item-title">{{ m.title }}</text>
              <text class="mode-item-desc">{{ m.desc }}</text>
            </view>
            <text v-if="modeKey === m.key" class="mode-item-check">✓</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';

// ── 常量 ──────────────────────────────────────────────────────────────────
const MODES = [
  {
    key: 'bubble',
    label: '泡泡纸',
    emoji: '🫧',
    title: '泡泡纸',
    desc: '手指戳破每一个泡泡，听"噗"的一声',
    cols: 7,
    rows: 9,
    minR: 26,
    maxR: 34,
    color: 'rgba(147,210,255,0.55)',
    stroke: '#4fc3f7',
    highlight: 'rgba(255,255,255,0.85)',
    poppedColor: 'rgba(200,230,255,0.18)',
    poppedStroke: 'rgba(79,195,247,0.25)',
  },
  {
    key: 'jelly',
    label: '果冻球',
    emoji: '🍬',
    title: '果冻球',
    desc: '圆润Q弹的果冻，戳一戳超解压',
    cols: 5,
    rows: 7,
    minR: 36,
    maxR: 46,
    color: 'rgba(255,180,230,0.60)',
    stroke: '#f06292',
    highlight: 'rgba(255,255,255,0.80)',
    poppedColor: 'rgba(255,180,230,0.15)',
    poppedStroke: 'rgba(240,98,146,0.20)',
  },
  {
    key: 'star',
    label: '爆破星',
    emoji: '⭐',
    title: '爆破星',
    desc: '金色星星，点击爆破超爽',
    cols: 5,
    rows: 8,
    minR: 30,
    maxR: 40,
    color: 'rgba(255,220,80,0.70)',
    stroke: '#f9a825',
    highlight: 'rgba(255,255,255,0.75)',
    poppedColor: 'rgba(255,220,80,0.12)',
    poppedStroke: 'rgba(249,168,37,0.20)',
  },
];

// ── 状态 ──────────────────────────────────────────────────────────────────
const modeKey = ref('bubble');
const showModeSheet = ref(false);
const bubbles = ref([]);
const comboCount = ref(0);
const comboTimer = ref(null);

const canvasW = ref(375);
const canvasH = ref(520);
const canvasTop = ref(0);
const canvasLeft = ref(0);

// 动画粒子列表（独立于 bubbles，避免响应式开销）
let particles = [];
let animFrameId = null;

const currentMode = computed(() => MODES.find(m => m.key === modeKey.value));
const poppedCount = computed(() => bubbles.value.filter(b => b.popped).length);
const totalCount = computed(() => bubbles.value.length);
const isAllPopped = computed(() => totalCount.value > 0 && poppedCount.value === totalCount.value);

// ── 初始化 ────────────────────────────────────────────────────────────────
onMounted(() => {
  const info = uni.getSystemInfoSync();
  const marginPx = Math.round(24 * info.windowWidth / 750) * 2;
  canvasW.value = info.windowWidth - marginPx;
  canvasH.value = Math.floor(info.windowHeight * 0.52);
  nextTick(() => {
    uni.createSelectorQuery().select('.squeeze-canvas').boundingClientRect(rect => {
      if (rect && rect.width > 0) {
        // 用实际渲染尺寸作为绘图坐标系，确保泡泡铺满整个 canvas
        canvasW.value = rect.width;
        canvasH.value = rect.height;
        canvasTop.value = rect.top;
        canvasLeft.value = rect.left;
      }
      initBubbles();
    }).exec();
  });
});

function initBubbles() {
  const mode = currentMode.value;
  const list = [];
  const cellW = canvasW.value / mode.cols;
  const cellH = canvasH.value / mode.rows;

  for (let row = 0; row < mode.rows; row++) {
    for (let col = 0; col < mode.cols; col++) {
      const cx = cellW * col + cellW / 2;
      const cy = cellH * row + cellH / 2;
      const r = mode.minR + Math.floor((row * mode.cols + col) % 7) * ((mode.maxR - mode.minR) / 6);
      list.push({ x: cx, y: cy, r, popped: false, scale: 1 });
    }
  }
  bubbles.value = list;
  nextTick(() => drawBubbles());
}

function resetBubbles() {
  comboCount.value = 0;
  particles = [];
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  initBubbles();
}

// ── 绘制 ──────────────────────────────────────────────────────────────────
function drawBubbles() {
  const mode = currentMode.value;
  const ctx = uni.createCanvasContext('squeezeCanvas');
  ctx.clearRect(0, 0, canvasW.value, canvasH.value);

  bubbles.value.forEach(b => {
    if (!b.popped) {
      const r = b.r * (b.scale ?? 1);
      // 外圈柔光
      ctx.beginPath();
      ctx.arc(b.x, b.y, r + 4, 0, 2 * Math.PI);
      ctx.setFillStyle(mode.color.replace(/[\d.]+\)$/, '0.18)'));
      ctx.fill();
      // 主体
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, 2 * Math.PI);
      ctx.setFillStyle(mode.color);
      ctx.fill();
      ctx.setStrokeStyle(mode.stroke);
      ctx.setLineWidth(2);
      ctx.stroke();
      // 高光
      ctx.beginPath();
      ctx.arc(b.x - r * 0.28, b.y - r * 0.3, r * 0.22, 0, 2 * Math.PI);
      ctx.setFillStyle(mode.highlight);
      ctx.fill();
      // 小高光点
      ctx.beginPath();
      ctx.arc(b.x - r * 0.44, b.y - r * 0.44, r * 0.08, 0, 2 * Math.PI);
      ctx.setFillStyle('rgba(255,255,255,0.95)');
      ctx.fill();
    } else {
      // 已破：小凹坑
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.38, 0, 2 * Math.PI);
      ctx.setFillStyle(mode.poppedColor);
      ctx.fill();
      ctx.setStrokeStyle(mode.poppedStroke);
      ctx.setLineWidth(1);
      ctx.stroke();
    }
  });

  // 1. 冲击波环（底层）
  particles.filter(p => p.type === 'wave').forEach(p => {
    const t = 1 - p.life / p.maxLife;
    const alpha = (1 - t) * 0.55;
    const r = p.r0 + p.r0 * t * 1.8;
    if (alpha <= 0.01) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.setStrokeStyle(p.color.replace(/[\d.]+\)$/, alpha.toFixed(2) + ')'));
    ctx.setLineWidth(p.lineW * (1 - t * 0.7));
    ctx.stroke();
  });

  // 2. 膨胀光球
  particles.filter(p => p.type === 'burst').forEach(p => {
    const t = 1 - p.life / p.maxLife;
    const alpha = (1 - t) * (1 - t) * 0.65;
    const r = p.r0 * (1 + t * 0.65);
    if (alpha <= 0.02) return;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.setFillStyle(p.color.replace(/[\d.]+\)$/, alpha.toFixed(2) + ')'));
    ctx.fill();
  });

  // 3. 液体水珠
  particles.filter(p => p.type === 'drop').forEach(p => {
    const alpha = Math.min(1, (p.life / p.maxLife) * 1.5);
    if (alpha <= 0.02) return;
    const r = p.r * (0.3 + 0.7 * (p.life / p.maxLife));
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
    ctx.setFillStyle(p.color.replace(/[\d.]+\)$/, (alpha * 0.88).toFixed(2) + ')'));
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x - r * 0.28, p.y - r * 0.28, r * 0.30, 0, 2 * Math.PI);
    ctx.setFillStyle('rgba(255,255,255,' + (alpha * 0.55).toFixed(2) + ')');
    ctx.fill();
  });

  // 4. 闪光碎片（短线）
  particles.filter(p => p.type === 'spark').forEach(p => {
    const alpha = p.life / p.maxLife;
    if (alpha <= 0.02) return;
    const len = p.len * alpha;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * len, p.y + Math.sin(p.angle) * len);
    ctx.setStrokeStyle('rgba(255,255,255,' + (alpha * 0.92).toFixed(2) + ')');
    ctx.setLineWidth(1.4);
    ctx.stroke();
  });

  ctx.draw();
}

function hexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function spawnParticles(b) {
  const mode = currentMode.value;
  const strokeRgba = mode.stroke.startsWith('#') ? hexToRgba(mode.stroke, 0.8) : mode.stroke;

  // 膨胀光球
  particles.push({ type: 'burst', x: b.x, y: b.y, r0: b.r * 1.05, life: 10, maxLife: 10, color: mode.color });

  // 冲击波环（2层）
  particles.push({ type: 'wave', x: b.x, y: b.y, r0: b.r * 0.9, lineW: 3, life: 18, maxLife: 18, color: strokeRgba });
  particles.push({ type: 'wave', x: b.x, y: b.y, r0: b.r * 1.5, lineW: 1.5, life: 26, maxLife: 26, color: strokeRgba });

  // 液体水珠（8颗）
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const speed = b.r * (0.07 + Math.random() * 0.11);
    const life = 22 + Math.floor(Math.random() * 12);
    particles.push({
      type: 'drop', x: b.x, y: b.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - b.r * 0.04,
      r: b.r * (0.10 + Math.random() * 0.14),
      life, maxLife: life, color: mode.color,
    });
  }

  // 闪光碎片（6条）
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
    const life = 10 + Math.floor(Math.random() * 8);
    particles.push({
      type: 'spark',
      x: b.x + Math.cos(angle) * b.r * 0.5,
      y: b.y + Math.sin(angle) * b.r * 0.5,
      vx: Math.cos(angle) * b.r * 0.09,
      vy: Math.sin(angle) * b.r * 0.09,
      angle, len: b.r * (0.18 + Math.random() * 0.20),
      life, maxLife: life,
    });
  }

  // 白色亮点（3颗）
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = b.r * (0.05 + Math.random() * 0.09);
    const life = 10 + Math.floor(Math.random() * 6);
    particles.push({
      type: 'drop', x: b.x, y: b.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: b.r * 0.07, life, maxLife: life,
      color: 'rgba(255,255,255,0.95)',
    });
  }
}

function tickParticles() {
  if (particles.length === 0) { animFrameId = null; return; }
  particles.forEach(p => {
    if (p.type === 'drop') {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.22; p.vx *= 0.97;
    }
    if (p.type === 'spark') {
      p.x += p.vx; p.y += p.vy;
    }
    p.life -= 1;
  });
  particles = particles.filter(p => p.life > 0);
  drawBubbles();
  animFrameId = requestAnimationFrame(tickParticles);
}

function startParticleAnim() {
  if (animFrameId) return;
  animFrameId = requestAnimationFrame(tickParticles);
}

// ── 触摸交互 ──────────────────────────────────────────────────────────────
function onTouchStart(e) {
  handleTouch(e);
}

function onTouchMove(e) {
  handleTouch(e);
}

// H5 鼠标点击
function onCanvasClick(e) {
  const detail = e.detail || e;
  const x = (detail.x ?? detail.offsetX ?? 0) - canvasLeft.value;
  const y = (detail.y ?? detail.offsetY ?? 0) - canvasTop.value;
  popAt(x, y);
}

function handleTouch(e) {
  const touches = e.touches;
  if (!touches || touches.length === 0) return;
  for (let ti = 0; ti < touches.length; ti++) {
    const t = touches[ti];
    const x = (t.pageX ?? t.clientX ?? t.x) - canvasLeft.value;
    const y = (t.pageY ?? t.clientY ?? t.y) - canvasTop.value;
    popAt(x, y);
  }
}

function popAt(x, y) {
  const list = bubbles.value;
  for (let i = 0; i < list.length; i++) {
    if (list[i].popped) continue;
    const dx = x - list[i].x;
    const dy = y - list[i].y;
    if (dx * dx + dy * dy <= list[i].r * list[i].r) {
      const b = list[i];
      // 先生成粒子
      spawnParticles(b);
      // 标记破裂
      b.popped = true;
      bubbles.value = [...list];
      triggerVibration();
      updateCombo();
      // 启动粒子动画循环
      startParticleAnim();
      return;
    }
  }
}

function triggerVibration() {
  // #ifndef H5
  wx.vibrateShort({ type: 'light', fail: () => {} });
  // #endif
}

function updateCombo() {
  comboCount.value += 1;
  clearTimeout(comboTimer.value);
  comboTimer.value = setTimeout(() => {
    comboCount.value = 0;
  }, 1200);
}

// ── 一键全破 ──────────────────────────────────────────────────────────────
function popAll() {
  const list = bubbles.value.map(b => ({ ...b, popped: true }));
  bubbles.value = list;
  drawBubbles();
  // #ifndef H5
  wx.vibrateLong({ fail: () => {} });
  // #endif
}

// ── 切换模式 ──────────────────────────────────────────────────────────────
function switchMode(key) {
  modeKey.value = key;
  showModeSheet.value = false;
  comboCount.value = 0;
  particles = [];
  if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
  nextTick(() => initBubbles());
}

// ── 返回 ──────────────────────────────────────────────────────────────────
function onBack() {
  uni.navigateBack();
}
</script>

<style scoped lang="scss">
$teal: #4A8A7A;
$teal-dark: #3A6E80;
$purple: #7B4E9E;
$bg: #F5F7F6;
$text-1: #1C2A27;
$text-2: #617870;
$muted: #9BBCB4;
$border: #E8EFED;
$card-r: 24rpx;
$card-shadow: 0 4rpx 18rpx rgba(28,42,39,0.06);

.page {
  min-height: 100vh;
  background: $bg;
  display: flex;
  flex-direction: column;
}

/* ── 顶部栏 ── */
.top-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx 12rpx;
  background: #fff;
  border-bottom: 1rpx solid $border;
}
.icon-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  &:active { background: $bg; }
}
.icon-text { font-size: 36rpx; color: $text-1; }
.top-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: 800;
  color: $text-1;
  letter-spacing: 0.02em;
  font-family: "Noto Serif SC", serif;
}
.top-right { width: 120rpx; display: flex; justify-content: flex-end; }
.mode-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: $bg;
  border-radius: 20rpx;
  padding: 10rpx 18rpx;
  &:active { opacity: 0.75; }
}
.mode-btn-text { font-size: 22rpx; color: $text-2; font-weight: 600; }
.mode-btn-arrow { font-size: 26rpx; color: $muted; }

/* ── 页头卡片 ── */
.hero-card {
  position: relative;
  overflow: hidden;
  margin: 20rpx 24rpx 0;
  border-radius: $card-r;
  background: linear-gradient(135deg, $purple 0%, #9B6EC0 100%);
  padding: 32rpx 32rpx 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(123,78,158,0.28);
}
.hero-glow {
  position: absolute;
  top: -80rpx;
  right: -80rpx;
  width: 320rpx;
  height: 280rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.14) 0%, transparent 70%);
  pointer-events: none;
}
.hero-emoji {
  display: block;
  font-size: 56rpx;
  margin-bottom: 12rpx;
}
.hero-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: #fff;
  font-family: "Noto Serif SC", serif;
  margin-bottom: 8rpx;
}
.hero-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.78);
  line-height: 1.6;
  margin-bottom: 24rpx;
}
.hero-stats {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255,255,255,0.12);
  border-radius: 16rpx;
  padding: 16rpx 0;
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}
.stat-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #fff;
  letter-spacing: -1rpx;
}
.stat-label {
  font-size: 20rpx;
  color: rgba(255,255,255,0.68);
}
.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background: rgba(255,255,255,0.22);
}

/* ── Canvas 区域 ── */
.canvas-wrap {
  position: relative;
  margin: 20rpx 24rpx 0;
  border-radius: $card-r;
  background: #fff;
  box-shadow: $card-shadow;
  overflow: hidden;
  flex: 1;
}
.squeeze-canvas {
  display: block;
}

/* 完成遮罩 */
.done-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.92);
  gap: 16rpx;
}
.done-emoji { font-size: 80rpx; }
.done-title {
  font-size: 40rpx;
  font-weight: 800;
  color: $text-1;
  font-family: "Noto Serif SC", serif;
}
.done-sub { font-size: 26rpx; color: $text-2; }
.done-btn {
  margin-top: 12rpx;
  background: $purple;
  border-radius: 44rpx;
  padding: 20rpx 60rpx;
  &:active { opacity: 0.85; }
}
.done-btn-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.04em;
}

/* ── 底部操作 ── */
.footer {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx 40rpx;
  background: #fff;
  border-top: 1rpx solid $border;
}
.footer-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.85; }
}
.footer-btn.secondary {
  background: $bg;
  border: 1rpx solid $border;
}
.footer-btn.primary {
  background: linear-gradient(135deg, $purple, #9B6EC0);
  box-shadow: 0 4rpx 16rpx rgba(123,78,158,0.30);
}
.footer-btn-text {
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.footer-btn.secondary .footer-btn-text { color: $text-1; }
.footer-btn.primary .footer-btn-text { color: #fff; }

/* ── 模式弹层 ── */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.42);
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.sheet {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 16rpx 32rpx 60rpx;
}
.sheet-handle {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: $border;
  margin: 0 auto 28rpx;
}
.sheet-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: $text-1;
  margin-bottom: 24rpx;
  font-family: "Noto Serif SC", serif;
}
.mode-list { display: flex; flex-direction: column; gap: 12rpx; }
.mode-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 20rpx;
  border-radius: 20rpx;
  border: 2rpx solid $border;
  &:active { background: $bg; }
  &.active {
    border-color: $purple;
    background: rgba(123,78,158,0.05);
  }
}
.mode-item-emoji { font-size: 44rpx; flex-shrink: 0; }
.mode-item-info { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
.mode-item-title { font-size: 28rpx; font-weight: 700; color: $text-1; }
.mode-item-desc { font-size: 22rpx; color: $text-2; line-height: 1.5; }
.mode-item-check { font-size: 28rpx; color: $purple; font-weight: 800; }
</style>
