<template>
  <view class="page" :style="{ height: pageH }">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="icon-btn" @click="onBack()">
        <text class="icon-text">←</text>
      </view>
      <text class="top-title">解压捏捏乐</text>
      <view class="top-right">
        <view class="mode-btn" @click="showModeSheet = true">
          <text class="mode-btn-text">{{ currentCount.label }}</text>
          <text class="mode-btn-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 页头卡片 -->
    <view class="hero-card">
      <view class="hero-glow" />
      <text class="hero-emoji">🫧</text>
      <text class="hero-title">解压泡泡</text>
      <text class="hero-desc">五彩泡泡随机铺开，手指戳破每一个</text>
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
      <!-- #ifdef MP-WEIXIN -->
      <canvas
        type="2d"
        id="squeezeCanvas"
        canvas-id="squeezeCanvas"
        class="squeeze-canvas"
        @touchstart="onTouchStart($event)"
        @touchmove="onTouchMove($event)"
        @click="onCanvasClick($event)"
      />
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <canvas
        type="2d"
        id="squeezeCanvas"
        canvas-id="squeezeCanvas"
        class="squeeze-canvas"
        :hidpi="false"
      />
      <!-- #endif -->
      <!-- 全部完成遮罩 -->
      <view v-if="isAllPopped" class="done-overlay">
        <text class="done-emoji">🎉</text>
        <text class="done-title">全部解压完成！</text>
        <text class="done-sub">感觉轻松多了吗？</text>
        <view class="done-btn" @click="resetBubbles()">再来一次</view>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="footer">
      <view class="footer-btn secondary" @click="resetBubbles()">重置</view>
      <view class="footer-btn primary" @click="popAll()">一键全破</view>
    </view>

    <!-- 模式选择弹层 -->
    <view v-if="showModeSheet" class="sheet-mask" @click="showModeSheet = false">
      <view class="sheet" @click.stop>
        <view class="sheet-handle" />
        <text class="sheet-title">选择泡泡数量</text>
        <view class="mode-list">
          <view
            v-for="c in COUNTS"
            :key="c.key"
            class="mode-item"
            :class="{ active: bubbleCount === c.key }"
            @click="switchCount(c.key)"
          >
            <text class="mode-item-emoji">🫧</text>
            <view class="mode-item-info">
              <text class="mode-item-title">{{ c.label }}</text>
              <text class="mode-item-desc">{{ c.desc }}</text>
            </view>
            <text v-if="bubbleCount === c.key" class="mode-item-check">✓</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, getCurrentInstance } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useCanvas2d } from '@/composables/useCanvas2d';
import { getViewportHeight, bindViewportHeight } from '@/utils/viewport';
import { raf } from '@/utils/raf';

// #ifndef H5
defineOptions({
  onShareAppMessage() {
    return { title: '我在卓见心理玩解压捏捏乐，超解压！快来试试', path: '/pages/squeeze/index' };
  },
  onShareTimeline() {
    return { title: '卓见心理解压捏捏乐 — 戳破泡泡，释放压力' };
  },
});
// #endif

const pageInstance = getCurrentInstance();

function createPageQuery() {
  const query = uni.createSelectorQuery();
  const scope = pageInstance?.proxy || pageInstance;
  return scope ? query.in(scope) : query;
}
// ── 常量 ──────────────────────────────────────────────────────────────────
// 数量档位：可配置。球的大小由数量自动推算，使总面积约占画布的 80%
const COUNTS = [
  { key: 60,  label: '60 个',  desc: '大颗粒，戳起来更过瘾' },
  { key: 80,  label: '80 个',  desc: '大小适中，经典解压手感' },
  { key: 100, label: '100 个', desc: '小而密，连戳超爽' },
];

// 目标覆盖率：所有球面积之和 ≈ 画布面积的比例
// 有重力后球会往下掉、堆到底部，局部密度远高于此值；过高必重叠
// #ifdef MP-WEIXIN
const FILL_RATIO = 0.40; // 小程序求解力弱，略疏一点避免底部折叠
// #endif
// #ifndef MP-WEIXIN
const FILL_RATIO = 0.48;
// #endif

// 随机配色调色板（每个球随机取一种）
const PALETTE = [
  { h: 205, s: 90, l: 68 }, // 蓝
  { h: 330, s: 82, l: 72 }, // 粉
  { h: 45,  s: 95, l: 62 }, // 金黄
  { h: 160, s: 65, l: 60 }, // 青绿
  { h: 265, s: 70, l: 72 }, // 紫
  { h: 15,  s: 88, l: 68 }, // 橙红
  { h: 190, s: 75, l: 62 }, // 青
  { h: 110, s: 60, l: 62 }, // 草绿
];

// ── 状态 ──────────────────────────────────────────────────────────────────
const bubbleCount = ref(80);
const showModeSheet = ref(false);
const comboCount = ref(0);
const comboTimer = ref(null);
const poppedCount = ref(0);
const totalCount = ref(0);

const canvasW = ref(0);
const canvasH = ref(0);
const canvasTop = ref(0);
const canvasLeft = ref(0);

// 页面高度：移动端浏览器地址栏让 100vh 比可视区大，底部会溢出。
// 参照 legal/terms.vue 用 windowHeight 注入真实可视高度。首帧兜底 100vh。
const pageH = ref('100vh');

// 泡泡/粒子/水渍均用普通数组，避免 Vue 响应式在物理循环里拖慢小程序
let bubbleList = [];
let particles = [];
let stains = [];
let animFrameId = null;
// Canvas 2D（同层渲染）：ctx 与 canvas node 全程复用。
// 相比老版 createCanvasContext + ctx.draw()（每帧跨桥序列化全部命令），
// Canvas 2D 在渲染线程直接绘制，无桥开销，性能高一个数量级。
let squeezeCtx = null;
let canvasNode = null;   // mp Canvas 2D 的 canvas 节点，用于 requestAnimationFrame
let dpr = 1;

// 平台 rAF：mp 用 canvas.requestAnimationFrame，H5 用全局 rAF。
function nextFrame(fn) {
  return canvas2d.nextFrame(fn);
}
function cancelFrame(id) {
  canvas2d.cancelFrame(id);
}

const canvas2d = useCanvas2d({
  selector: '#squeezeCanvas',
  getLogicalSize: () => (
    canvasW.value > 0 && canvasH.value > 0
      ? { w: canvasW.value, h: canvasH.value }
      : null
  ),
  onReady: ({ canvas, ctx, dpr: d, canvasSize }) => {
    canvasNode = canvas;
    squeezeCtx = ctx;
    dpr = d;
    // 节点查询已给出逻辑尺寸时先写入，避免 sync 失败导致不生成球
    if (canvasSize?.w > 0 && canvasSize?.h > 0) {
      canvasW.value = canvasSize.w;
      canvasH.value = canvasSize.h;
      lastLayoutW = canvasSize.w;
      lastLayoutH = canvasSize.h;
    }
    syncCanvasRect(() => {
      if (canvasW.value < 1 || canvasH.value < 1) {
        const size = canvas2d.getSize();
        if (size.w > 0 && size.h > 0) {
          canvasW.value = size.w;
          canvasH.value = size.h;
        }
      }
      // init 时已按逻辑尺寸设好 buffer，尺寸未变则不再 remeasure（避免清屏闪烁）
      if (sizeChangedEnough(canvasW.value, canvasH.value)) {
        canvas2d.remeasureAndResize(() => (
          canvasW.value > 0 && canvasH.value > 0
            ? { w: canvasW.value, h: canvasH.value }
            : null
        ));
        lastLayoutW = canvasW.value;
        lastLayoutH = canvasH.value;
      }
      if (!bubblesReady) {
        initBubbles();
      }
      startPhysics();
      // #ifdef H5
      requestAnimationFrame(() => bindH5Pointer());
      // #endif
    });
  },
  onFail: () => {
    uni.showToast({ title: '画布加载失败，请重试', icon: 'none' });
  },
});

function syncCanvasRect(done) {
  createPageQuery()
    .select('#squeezeCanvas')
    .boundingClientRect((rect) => {
      if (rect && rect.width > 0) {
        canvasTop.value = rect.top;
        canvasLeft.value = rect.left;
        canvasW.value = rect.width;
        canvasH.value = rect.height;
      }
      done?.();
    })
    .exec();
}

// #ifdef H5
let h5MouseDown = false;

function h5PopFromEvent(e) {
  const p = canvas2d.localFromMouseEvent(e);
  popAt(p.x, p.y);
}

function h5PopFromTouch(touch) {
  const p = canvas2d.clientToLocal(touch.clientX ?? 0, touch.clientY ?? 0);
  popAt(p.x, p.y);
}

function bindH5Pointer() {
  canvas2d.bindPointer({
    onMouseDown: (e) => {
      h5MouseDown = true;
      h5PopFromEvent(e);
    },
    onMouseMove: (e) => {
      if (h5MouseDown) h5PopFromEvent(e);
    },
    onMouseUp: () => { h5MouseDown = false; },
    onTouchStart: (e) => {
      const t = e.touches?.[0];
      if (t) h5PopFromTouch(t);
    },
    onTouchMove: (e) => {
      const t = e.touches?.[0];
      if (t) h5PopFromTouch(t);
    },
  });
}
// #endif

// 破裂音效：三种声音，每种建一个小音频池支持快速连戳重叠
const POP_SOUNDS = ['/static/squeeze/pop1.wav', '/static/squeeze/pop2.wav', '/static/squeeze/pop3.wav'];
let soundPools = [];
let soundIdx = 0;

function initSounds() {
  soundPools = POP_SOUNDS.map(src => {
    const pool = [];
    for (let i = 0; i < 3; i++) {
      const a = uni.createInnerAudioContext();
      a.src = src;
      a.volume = 0.6;
      pool.push(a);
    }
    return pool;
  });
}

function destroySounds() {
  soundPools.forEach(pool => pool.forEach(a => { try { a.destroy(); } catch (e) {} }));
  soundPools = [];
}

const currentCount = computed(() => COUNTS.find(c => c.key === bubbleCount.value) || COUNTS[1]);
const isAllPopped = computed(() => totalCount.value > 0 && poppedCount.value === totalCount.value);

function syncBubbleStats() {
  totalCount.value = bubbleList.length;
  let popped = 0;
  for (let i = 0; i < bubbleList.length; i++) {
    if (bubbleList[i].popped) popped++;
  }
  poppedCount.value = popped;
}

// HSL → RGB（uni canvas 的 setFillStyle 不认 hsla，必须转成 rgba）
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(f(0) * 255),
    Math.round(f(8) * 255),
    Math.round(f(4) * 255),
  ];
}

// 由色相生成一个球的整套配色（全部输出 rgba 字符串）
function makeColor(hue) {
  const p = PALETTE[hue % PALETTE.length];
  const [r, g, b]    = hslToRgb(p.h, p.s, p.l);
  const [dr, dg, db] = hslToRgb(p.h, p.s, Math.max(30, p.l - 22));
  return {
    fill:         `rgba(${r},${g},${b},0.62)`,
    fillSoft:     `rgba(${r},${g},${b},0.18)`,
    stroke:       `rgba(${dr},${dg},${db},0.9)`,
    poppedFill:   `rgba(${r},${g},${b},0.14)`,
    poppedStroke: `rgba(${dr},${dg},${db},0.22)`,
    splash:       `rgba(${r},${g},${b},1)`,   // 水渍基色（绘制时再叠 alpha）
  };
}

// ── 初始化 ────────────────────────────────────────────────────────────────
let unbindViewport = null;
/** 防止 onMounted / onShow / 布局重试并发多次重建球 */
let layoutToken = 0;
let bubblesReady = false;
let lastLayoutW = 0;
let lastLayoutH = 0;

function sizeChangedEnough(w, h) {
  return Math.abs(w - lastLayoutW) > 2 || Math.abs(h - lastLayoutH) > 2;
}

function layoutCanvas(done, retry = 0) {
  const token = layoutToken;
  createPageQuery().select('.canvas-wrap').boundingClientRect(rect => {
    if (token !== layoutToken) return; // 已被更新的布局请求取消
    if (rect && rect.width > 0 && rect.height > 0) {
      canvasW.value = rect.width;
      canvasH.value = rect.height;
      canvasTop.value = rect.top;
      canvasLeft.value = rect.left;
      done?.();
      return;
    }
    // flex 布局首帧高度常为 0，延迟重试
    if (retry < 8) {
      setTimeout(() => layoutCanvas(done, retry + 1), retry === 0 ? 50 : 100);
      return;
    }
    done?.();
  }).exec();
}

/**
 * @param {{ forceBubbles?: boolean }} [opts]
 * forceBubbles：用户重置/切数量时强制重建；普通布局变化不重建已有球
 */
function relayoutPage(opts = {}) {
  const { forceBubbles = false } = opts;
  layoutToken += 1;
  const token = layoutToken;
  pageH.value = getViewportHeight() + 'px';
  nextTick(() => {
    raf(() => {
      if (token !== layoutToken) return;
      layoutCanvas(() => {
        if (token !== layoutToken) return;
        if (!canvas2d.getCanvas()) {
          canvas2d.init();
          return;
        }
        const w = canvasW.value;
        const h = canvasH.value;
        if (w < 1 || h < 1) return;

        const needResize = sizeChangedEnough(w, h);
        if (needResize) {
          canvas2d.remeasureAndResize(() => ({ w, h }));
          lastLayoutW = w;
          lastLayoutH = h;
        }

        // 仅首次就绪、尺寸明显变化、或显式强制时重建球，避免反复 init 造成抖动
        if (forceBubbles || !bubblesReady || needResize) {
          initBubbles();
        }
        // #ifdef H5
        bindH5Pointer();
        // #endif
      });
    });
  });
}

onMounted(() => {
  initSounds();
  relayoutPage();
  // H5 视口变化才需要重布局；微信 bindViewportHeight 为空操作
  unbindViewport = bindViewportHeight(() => relayoutPage());
});

onShow(() => {
  // 已初始化则只唤醒物理，不重建球（onMounted+onShow 双触发是抖动主因）
  if (bubblesReady && canvas2d.getCanvas()) {
    startPhysics();
    return;
  }
  relayoutPage();
});

// ── 物理参数 ──
// 球有重力，会自然往下掉、堆积到底部，像装在盒子里的一堆小球。
// 戳破时的爆炸推力让邻近球被推开、互相碰撞挤压、撞边回弹，
// 每个球带弹簧形变（果冻般抖动、回弹过冲），落定后被重力压在底部堆叠静止。
const GRAVITY      = 0.28;   // 每帧重力加速度（向下，调小让下落柔和、堆叠更稳）
const RESTITUTION  = 0.22;   // 回弹系数（略低，堆叠更快安定）
const FRICTION     = 0.985;  // 空气阻力
const REST_EPS     = 0.55;
const WALL_FRICTION = 0.82;
const SQUASH_K     = 0.22;
const SQUASH_DAMP  = 0.82;
const SOLVER_ITERS = 6;      // 堆叠需要足够迭代才能分离
const POS_PERCENT  = 0.85;   // 位置修正比例（留一点给后续迭代收敛）
const POS_SLOP     = 0.35;   // 允许的微小重叠（像素），避免数值抖动
// #ifdef MP-WEIXIN
const MP_SOLVER_ITERS = 7;
// #endif

let physicsId = null;
let lastTouchPopTs = 0;

function initBubbles() {
  const N = bubbleCount.value;
  const W = canvasW.value;
  const H = canvasH.value;
  if (W < 1 || H < 1 || N < 1) return;
  const list = [];

  const avgR = Math.sqrt((FILL_RATIO * W * H) / (N * Math.PI));
  const rMin = avgR * 0.78;
  const rMax = avgR * 1.18;

  // 从上方散开生成，减少开局就挤在底部的重叠
  for (let i = 0; i < N; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const spanY = Math.max(H * 0.55, r * 4);
    list.push({
      x: r + Math.random() * (W - 2 * r),
      y: r + Math.random() * spanY,
      r,
      vx: (Math.random() - 0.5) * 1.2,
      vy: Math.random() * 1.2,
      mass: r * r,
      invMass: 1 / (r * r),
      popped: false,
      scale: 1,
      squash: 0,
      squashV: 0,
      nx: 0, ny: 1,
      resting: false,
      supported: false,
      color: makeColor(Math.floor(Math.random() * PALETTE.length)),
    });
  }
  bubbleList = list;
  bubblesReady = true;
  lastLayoutW = W;
  lastLayoutH = H;
  syncBubbleStats();
  for (let k = 0; k < 20; k++) {
    resolveCollisions();
    clampBubblesToBounds();
  }
  startPhysics();
}

function resetBubbles() {
  comboCount.value = 0;
  particles = [];
  stains = [];
  stopAllAnim();
  bubblesReady = false;
  initBubbles();
}

// ── 物理引擎 ──────────────────────────────────────────────────────────────

/** 把球钳回画布内，避免碰撞修正把球推出地板导致底部重叠 */
function clampBubblesToBounds() {
  const W = canvasW.value;
  const H = canvasH.value;
  const list = bubbleList;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (b.popped) continue;
    if (b.x < b.r) b.x = b.r;
    else if (b.x > W - b.r) b.x = W - b.r;
    if (b.y < b.r) b.y = b.r;
    else if (b.y > H - b.r) b.y = H - b.r;
  }
}

/**
 * 圆-圆分离：贴地时优先水平推开（竖直修正会被地板钳回，是底部折叠主因）；
 * 贴墙时把修正权重分给可动的一侧。
 */
function resolveCollisions() {
  const list = bubbleList;
  const W = canvasW.value;
  const H = canvasH.value;
  const floorY = H - 0.5;
  const n = list.length;

  // 自下而上处理，先稳住底层再解上层
  const order = [];
  for (let i = 0; i < n; i++) if (!list[i].popped) order.push(i);
  order.sort((ia, ib) => list[ib].y - list[ia].y);

  for (let oi = 0; oi < order.length; oi++) {
    const i = order[oi];
    const a = list[i];
    for (let oj = oi + 1; oj < order.length; oj++) {
      const j = order[oj];
      const b = list[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const minDist = a.r + b.r;
      let dist2 = dx * dx + dy * dy;

      // 已分离的双静止球：只传播支撑
      if (a.resting && b.resting && dist2 >= minDist * minDist) {
        const contact = minDist + 2;
        if (dist2 <= contact * contact) {
          const dist = Math.sqrt(dist2) || 0.01;
          const ny = dy / dist;
          if (ny > 0.45) { if (b.supported || b.y + b.r >= floorY) a.supported = true; }
          else if (ny < -0.45) { if (a.supported || a.y + a.r >= floorY) b.supported = true; }
        }
        continue;
      }

      if (dist2 >= minDist * minDist) continue;

      let dist = Math.sqrt(dist2);
      if (dist < 1e-5) {
        dx = (i + j) % 2 === 0 ? 1 : -1;
        dy = 0.02;
        dist = Math.sqrt(dx * dx + dy * dy);
      }
      let nx = dx / dist;
      let ny = dy / dist;
      const overlap = minDist - dist;
      const corrAmt = (overlap - POS_SLOP) * POS_PERCENT;
      if (corrAmt <= 0) continue;

      const aFloor = a.y + a.r >= floorY;
      const bFloor = b.y + b.r >= floorY;
      const aWall = a.x <= a.r + 0.5 || a.x >= W - a.r - 0.5;
      const bWall = b.x <= b.r + 0.5 || b.x >= W - b.r - 0.5;

      // 两球都贴地：竖直分离会被钳回，强制改成水平推开
      if (aFloor && bFloor) {
        nx = dx >= 0 ? 1 : -1;
        if (Math.abs(dx) < 0.5) nx = (i < j) ? 1 : -1;
        ny = 0;
      } else if (aFloor && ny > 0.15) {
        // a 贴地，不能往下推 a，把法线偏水平并主要移动 b
        const hx = dx >= 0 ? 1 : -1;
        nx = nx * 0.35 + hx * 0.65;
        ny = Math.min(ny, 0.25);
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        nx /= len; ny /= len;
      } else if (bFloor && ny < -0.15) {
        const hx = dx >= 0 ? 1 : -1;
        nx = nx * 0.35 + hx * 0.65;
        ny = Math.max(ny, -0.25);
        const len = Math.sqrt(nx * nx + ny * ny) || 1;
        nx /= len; ny /= len;
      }

      if (ny > 0.45) { if (b.supported || bFloor) a.supported = true; }
      else if (ny < -0.45) { if (a.supported || aFloor) b.supported = true; }

      // 墙/地板约束：被挡住的一侧少动或不动
      let wA = a.invMass;
      let wB = b.invMass;
      if (aFloor && ny < -0.2) wA *= 0.05;
      if (bFloor && ny > 0.2) wB *= 0.05;
      if (aWall && ((a.x <= a.r + 0.5 && nx < 0) || (a.x >= W - a.r - 0.5 && nx > 0))) wA *= 0.05;
      if (bWall && ((b.x <= b.r + 0.5 && nx > 0) || (b.x >= W - b.r - 0.5 && nx < 0))) wB *= 0.05;
      const wSum = wA + wB || 1;

      a.x -= nx * corrAmt * (wA / wSum);
      a.y -= ny * corrAmt * (wA / wSum);
      b.x += nx * corrAmt * (wB / wSum);
      b.y += ny * corrAmt * (wB / wSum);

      if (a.resting) a.resting = false;
      if (b.resting) b.resting = false;

      const invSum = a.invMass + b.invMass;
      const dvx = b.vx - a.vx;
      const dvy = b.vy - a.vy;
      const vn = dvx * nx + dvy * ny;
      if (vn < 0) {
        const jimp = -(1 + RESTITUTION) * vn / invSum;
        a.vx -= jimp * nx * a.invMass;
        a.vy -= jimp * ny * a.invMass;
        b.vx += jimp * nx * b.invMass;
        b.vy += jimp * ny * b.invMass;
        if (-vn > 2.5) {
          const impact = Math.min(0.35, (-vn - 2.5) * 0.035);
          if (impact > a.squash) { a.squash = impact; a.nx = -nx; a.ny = -ny; a.squashV = 0; }
          if (impact > b.squash) { b.squash = impact; b.nx = nx; b.ny = ny; b.squashV = 0; }
        }
      }
    }
  }
}

function stepPhysics() {
  const W = canvasW.value;
  const H = canvasH.value;
  const list = bubbleList;
  let moving = false;

  for (const b of list) {
    b.supported = false;
    if (b.popped) {
      b.squash += b.squashV;
      b.squashV = (b.squashV - b.squash * SQUASH_K) * 0.7;
      if (Math.abs(b.squash) < 0.005) { b.squash = 0; b.squashV = 0; }
      continue;
    }

    if (b.resting) {
      b.vx = 0;
      b.vy = 0;
      continue;
    }

    b.vy += GRAVITY;
    b.vx *= FRICTION;
    b.vy *= FRICTION;
    b.x += b.vx;
    b.y += b.vy;

    if (b.x - b.r < 0)  { b.x = b.r;     hitWall(b, Math.abs(b.vx), 1, 0); b.vx = Math.abs(b.vx) * RESTITUTION; b.vy *= WALL_FRICTION; }
    if (b.x + b.r > W)  { b.x = W - b.r; hitWall(b, Math.abs(b.vx), 1, 0); b.vx = -Math.abs(b.vx) * RESTITUTION; b.vy *= WALL_FRICTION; }
    if (b.y - b.r < 0)  { b.y = b.r;     hitWall(b, Math.abs(b.vy), 0, 1); b.vy = Math.abs(b.vy) * RESTITUTION; b.vx *= WALL_FRICTION; }
    if (b.y + b.r > H)  {
      b.y = H - b.r;
      hitWall(b, Math.abs(b.vy), 0, 1);
      if (b.vy > 1.0) b.vy = -b.vy * RESTITUTION; else b.vy = 0;
      b.vx *= WALL_FRICTION;
    }
  }

  let solverIters = SOLVER_ITERS;
  // #ifdef MP-WEIXIN
  solverIters = MP_SOLVER_ITERS;
  // #endif
  for (let k = 0; k < solverIters; k++) {
    resolveCollisions();
    clampBubblesToBounds();
  }

  for (const b of list) {
    if (b.popped) continue;
    b.squashV += -b.squash * SQUASH_K;
    b.squashV *= SQUASH_DAMP;
    b.squash  += b.squashV;
    if (Math.abs(b.squash) < 0.004 && Math.abs(b.squashV) < 0.004) { b.squash = 0; b.squashV = 0; }

    const onFloor = b.y + b.r >= H - 0.6;
    const supported = onFloor || b.supported;
    const slow = Math.abs(b.vx) < REST_EPS && Math.abs(b.vy) < REST_EPS + GRAVITY;
    if (supported && slow) {
      b.vx = 0; b.vy = 0;
      b.resting = true;
    } else {
      b.resting = false;
    }
    if (!b.resting || Math.abs(b.squash) > 0.01 || Math.abs(b.squashV) > 0.01) moving = true;
  }

  if (!moving) {
    for (let i = 0; i < list.length && !moving; i++) {
      const a = list[i];
      if (a.popped) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.popped) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.r + b.r;
        if (dx * dx + dy * dy < (minDist - POS_SLOP) * (minDist - POS_SLOP)) {
          a.resting = false;
          b.resting = false;
          moving = true;
          break;
        }
      }
    }
  }

  return moving;
}

// 撞墙触发形变：沿墙法线压扁
function hitWall(b, speed, nx, ny) {
  // 只有快速撞墙才压扁；落地/靠边的慢速接触不形变，避免堆在底部的球被压扁抖动
  if (speed <= 2.2) return;
  const impact = Math.min(0.4, (speed - 2.2) * 0.04);
  if (impact > Math.abs(b.squash)) { b.squash = impact; b.nx = nx; b.ny = ny; b.squashV = 0; }
}

function tickPhysics() {
  const moving = stepPhysics();
  const hasParticles = particles.length > 0;
  const hasStains = stains.length > 0;
  if (hasParticles) advanceParticles();
  if (hasStains) advanceStains();
  drawBubbles();
  // 仍在运动 / 有粒子 / 有水渍未干 → 继续循环；否则停下省电
  if (moving || hasParticles || stains.length > 0) {
    physicsId = nextFrame(tickPhysics);
  } else {
    physicsId = null;
    drawBubbles(); // 定格最终静止状态
  }
}

function startPhysics() {
  if (physicsId) return;
  physicsId = nextFrame(tickPhysics);
}

function stopAllAnim() {
  if (physicsId)  { cancelFrame(physicsId);  physicsId = null; }
  if (animFrameId) { cancelFrame(animFrameId); animFrameId = null; }
}

// ── 绘制 ──────────────────────────────────────────────────────────────────
function drawBubbleBody(ctx, b, col) {
  const r = b.r * (b.scale ?? 1);
  const sq = b.squash || 0;

  // 反光亮点始终画：不要按 resting 切换画法，否则静止抖动时亮点会闪
  const along = 1 - sq;
  const perp = 1 + sq;
  const ang = Math.atan2(b.ny, b.nx);
  const deform = Math.abs(sq) > 0.002;

  ctx.save();
  ctx.translate(b.x, b.y);
  if (deform) {
    ctx.rotate(ang);
    ctx.scale(along, perp);
    ctx.rotate(-ang);
  }

  // #ifndef MP-WEIXIN
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, 6.283185307);
  ctx.fillStyle = col.fillSoft;
  ctx.fill();
  // #endif

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 6.283185307);
  ctx.fillStyle = col.fill;
  ctx.fill();
  ctx.strokeStyle = col.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 高光（固定相对球心，不随 resting 变化）
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.3, r * 0.22, 0, 6.283185307);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-r * 0.44, -r * 0.44, r * 0.08, 0, 6.283185307);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.restore();
}

function drawBubbles() {
  try {
    const ctx = squeezeCtx;
    if (!ctx) return;
    const W = canvasW.value;
    const H = canvasH.value;
    ctx.clearRect(0, 0, W, H);

  for (let si = 0; si < stains.length; si++) {
    const s = stains[si];
    const a = s.alpha * s.baseAlpha;
    if (a <= 0.01) continue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, 6.283185307);
    ctx.fillStyle = s.renderFill ?? s.color;
    ctx.fill();
  }

  for (let i = 0; i < bubbleList.length; i++) {
    const b = bubbleList[i];
    if (!b.popped) drawBubbleBody(ctx, b, b.color);
  }

  for (let pi = 0; pi < particles.length; pi++) {
    const p = particles[pi];
    if (p.type === 'wave') {
      const t = 1 - p.life / p.maxLife;
      const alpha = (1 - t) * 0.55;
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r0 + p.r0 * t * 1.8, 0, 6.283185307);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.lineW * (1 - t * 0.7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.type === 'burst') {
      const t = 1 - p.life / p.maxLife;
      const alpha = (1 - t) * (1 - t) * 0.65;
      if (alpha <= 0.02) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r0 * (1 + t * 0.65), 0, 6.283185307);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'drop') {
      const alpha = Math.min(1, (p.life / p.maxLife) * 1.5);
      if (alpha <= 0.02) continue;
      const r = p.r * (0.3 + 0.7 * (p.life / p.maxLife));
      ctx.globalAlpha = alpha * 0.88;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 6.283185307);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
      // #ifndef MP-WEIXIN
      ctx.beginPath();
      ctx.arc(p.x - r * 0.28, p.y - r * 0.28, r * 0.30, 0, 6.283185307);
      ctx.fillStyle = 'rgba(255,255,255,' + (alpha * 0.55).toFixed(2) + ')';
      ctx.fill();
      // #endif
    } else if (p.type === 'spark') {
      const alpha = p.life / p.maxLife;
      if (alpha <= 0.02) continue;
      const len = p.len * alpha;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * len, p.y + Math.sin(p.angle) * len);
      ctx.strokeStyle = 'rgba(255,255,255,' + (alpha * 0.92).toFixed(2) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  } catch (e) {
    uni.showToast({ title: '画布加载失败，请重试', icon: 'none' });
  }
}

function spawnParticles(b) {
  const col = b.color;

  particles.push({ type: 'burst', x: b.x, y: b.y, r0: b.r * 1.05, life: 10, maxLife: 10, color: col.fill });
  particles.push({ type: 'wave', x: b.x, y: b.y, r0: b.r * 0.9, lineW: 3, life: 18, maxLife: 18, color: col.stroke });
  // #ifndef MP-WEIXIN
  particles.push({ type: 'wave', x: b.x, y: b.y, r0: b.r * 1.5, lineW: 1.5, life: 26, maxLife: 26, color: col.stroke });
  // #endif

  let dropCount = 8;
  // #ifdef MP-WEIXIN
  dropCount = 4;
  // #endif
  for (let i = 0; i < dropCount; i++) {
    const angle = (i / dropCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const speed = b.r * (0.07 + Math.random() * 0.11);
    const life = 22 + Math.floor(Math.random() * 12);
    particles.push({
      type: 'drop', x: b.x, y: b.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - b.r * 0.04,
      r: b.r * (0.10 + Math.random() * 0.14),
      life, maxLife: life, color: col.fill,
    });
  }

  let sparkCount = 6;
  // #ifdef MP-WEIXIN
  sparkCount = 3;
  // #endif
  for (let i = 0; i < sparkCount; i++) {
    const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.4;
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

  // #ifndef MP-WEIXIN
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
  // #endif
}

// 仅推进粒子状态（绘制与循环由统一的物理循环负责）
function advanceParticles() {
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
}

// ── 触摸交互 ──────────────────────────────────────────────────────────────
function onTouchStart(e) {
  handleTouch(e);
}

function onTouchMove(e) {
  handleTouch(e);
}

// 点击 / 触摸（H5 / 小程序统一逻辑）
function onCanvasClick(e) {
  const detail = e.detail || e;
  const x = detail.x ?? detail.offsetX ?? e.offsetX ?? 0;
  const y = detail.y ?? detail.offsetY ?? e.offsetY ?? 0;
  popAt(x, y);
}

function handleTouch(e) {
  const touches = e.touches;
  if (!touches || touches.length === 0) return;
  const now = Date.now();
  // #ifdef MP-WEIXIN
  if (now - lastTouchPopTs < 50) return;
  lastTouchPopTs = now;
  // #endif
  for (let ti = 0; ti < touches.length; ti++) {
    const t = touches[ti];
    const x = (t.clientX ?? t.x) - canvasLeft.value;
    const y = (t.clientY ?? t.y) - canvasTop.value;
    popAt(x, y);
  }
}

function popAt(x, y) {
  const list = bubbleList;
  for (let i = 0; i < list.length; i++) {
    if (list[i].popped) continue;
    const dx = x - list[i].x;
    const dy = y - list[i].y;
    if (dx * dx + dy * dy <= list[i].r * list[i].r) {
      const b = list[i];
      // 先生成粒子
      spawnParticles(b);
      // 随机飞溅的水渍
      spawnStains(b);
      // 对邻近未破的球施加爆炸径向推力（越近越强）
      applyExplosion(b);
      // 标记破裂
      b.popped = true;
      syncBubbleStats();
      triggerVibration();
      playPopSound();
      updateCombo();
      // 启动/唤醒物理循环
      startPhysics();
      return;
    }
  }
}

// 爆炸推力：以破裂点为中心，向外推开周围球
function applyExplosion(center) {
  const radius = center.r * 5.5;      // 影响范围
  const impulse = center.mass * 9;    // 冲量 ∝ 破裂球质量（大球炸得更猛）
  for (const b of bubbleList) {
    if (b.popped || b === center) continue;
    const dx = b.x - center.x;
    const dy = b.y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    if (dist > radius) continue;
    const falloff = (1 - dist / radius) * (1 - dist / radius); // 平方衰减，更自然
    const nx = dx / dist;
    const ny = dy / dist;
    // 冲量 → 速度：轻球被吹得更远（除以质量）
    const dv = impulse * falloff * b.invMass;
    b.vx += nx * dv;
    b.vy += ny * dv;
    b.resting = false; // 唤醒，否则下一帧仍跳过积分
    // 冲击波挤压：法线朝外，越近越强
    const impact = Math.min(0.5, falloff * 0.5);
    if (impact > b.squash) { b.squash = impact; b.nx = nx; b.ny = ny; b.squashV = 0; }
  }
}

// 生成随机飞溅的水渍：中心一大滩 + 周围若干飞溅小点，各自随机停留时长后变干
function spawnStains(b) {
  const color = b.color.splash;
  let n = 4 + Math.floor(Math.random() * 4);
  // #ifdef MP-WEIXIN
  n = 2 + Math.floor(Math.random() * 2);
  // #endif
  const mkRender = (alpha, baseAlpha) =>
    color.replace(/[\d.]+\)$/, (alpha * baseAlpha).toFixed(2) + ')');
  stains.push({
    x: b.x, y: b.y,
    r: b.r * (0.5 + Math.random() * 0.2),
    vx: 0, vy: 0,
    color,
    baseAlpha: 0.32,
    alpha: 1,
    renderFill: mkRender(1, 0.32),
    hold: 120 + Math.floor(Math.random() * 180),
    dryRate: 0.008 + Math.random() * 0.012,
  });
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = b.r * (0.15 + Math.random() * 0.45);
    stains.push({
      x: b.x, y: b.y,
      r: b.r * (0.12 + Math.random() * 0.26),
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      color,
      baseAlpha: 0.28,
      alpha: 1,
      renderFill: mkRender(1, 0.28),
      hold: 90 + Math.floor(Math.random() * 210),
      dryRate: 0.010 + Math.random() * 0.02,
      settle: 0.82 + Math.random() * 0.08,
    });
  }
}

// 推进水渍：先飞溅铺开，停留一段随机时间后逐渐变干（alpha 衰减）消失
function advanceStains() {
  const W = canvasW.value, H = canvasH.value;
  for (const s of stains) {
    if (s.vx || s.vy) {
      s.x += s.vx; s.y += s.vy;
      s.vx *= (s.settle || 0.85);
      s.vy *= (s.settle || 0.85);
      if (Math.abs(s.vx) < 0.05 && Math.abs(s.vy) < 0.05) { s.vx = 0; s.vy = 0; }
      s.x = Math.max(s.r, Math.min(W - s.r, s.x));
      s.y = Math.max(s.r, Math.min(H - s.r, s.y));
    }
    if (s.hold > 0) s.hold -= 1;
    else s.alpha -= s.dryRate;
    const a = s.alpha * s.baseAlpha;
    s.renderFill = s.color.replace(/[\d.]+\)$/, a.toFixed(2) + ')');
  }
  stains = stains.filter(s => s.alpha > 0.01);
}

// 随机播放两三种破裂音效之一。每种音效准备一个音频池以支持快速连戳重叠播放。
function playPopSound() {
  const arr = soundPools[Math.floor(Math.random() * soundPools.length)];
  if (!arr || !arr.length) return;
  // 找一个空闲的（或直接取下一个）实例，seek 到 0 重播
  const ctx = arr[soundIdx % arr.length];
  soundIdx++;
  try {
    ctx.stop();
    ctx.seek(0);
    ctx.play();
  } catch (e) { /* ignore */ }
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
  for (const b of bubbleList) { if (!b.popped) spawnStains(b); }
  for (const b of bubbleList) { b.popped = true; }
  syncBubbleStats();
  playPopSound();
  startPhysics();   // 让水渍飞溅并逐渐变干
  // #ifndef H5
  wx.vibrateLong({ fail: () => {} });
  // #endif
}

// ── 切换数量 ──────────────────────────────────────────────────────────────
function switchCount(key) {
  bubbleCount.value = key;
  showModeSheet.value = false;
  comboCount.value = 0;
  particles = [];
  stains = [];
  stopAllAnim();
  bubblesReady = false;
  nextTick(() => initBubbles());
}

// ── 返回 ──────────────────────────────────────────────────────────────────
function onBack() {
  uni.navigateBack();
}

onUnmounted(() => {
  unbindViewport?.();
  stopAllAnim();
  clearTimeout(comboTimer.value);
  destroySounds();
  canvas2d.destroy();
  squeezeCtx = null;
  canvasNode = null;
  bubblesReady = false;
  lastLayoutW = 0;
  lastLayoutH = 0;
});
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
  height: 100vh;
  max-width: 100vw;
  overflow: hidden;
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
  margin: 20rpx 24rpx 0;
  border-radius: $card-r;
  background: linear-gradient(135deg, $purple 0%, #9B6EC0 100%);
  padding: 32rpx 32rpx 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(123,78,158,0.28);
}
.hero-glow {
  display: none;
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
  font-family: $zj-font-display;
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
  background: $zj-card-bg;
  box-shadow: $card-shadow;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.squeeze-canvas {
  display: block;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
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
  border: none;
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
  flex-shrink: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom, 0px));
  background: #fff;
  border-top: 1rpx solid $border;
}
.footer-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  border: none;
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
