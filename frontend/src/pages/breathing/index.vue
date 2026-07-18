<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="icon-btn" @click="onBack">
        <text class="icon-text">←</text>
      </view>
      <text class="top-title">呼吸球</text>
      <view class="top-right-btns">
        <view class="top-icon-btn" @click="showStyleSheet = true">
          <text class="top-icon-text">🎨</text>
        </view>
        <view v-if="!fromSelect" class="mode-picker-btn" @click="showModeSheet = true">
          <text class="mode-picker-label">{{ currentMode.name }}</text>
          <text class="mode-picker-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 主体区域 -->
    <view class="body">
      <!-- 引导词 -->
      <view class="guide-wrap">
        <text class="guide-text" :class="{ visible: guideText }">{{ guideText }}</text>
      </view>

      <!-- 呼吸球 -->
      <view class="ball-wrap">
        <view class="ball-glow" :style="glowStyle" />
        <view class="ball-ring" :style="ringStyle" />
        <!-- 样式：水波纹 -->
        <view v-if="ballStyleKey === 'ripple'" class="ball-ripple-outer" :style="rippleOuterStyle" />
        <view class="ball" :style="ballStyle">
          <text class="ball-count">{{ displayCount }}</text>
        </view>
      </view>

      <!-- 阶段提示文字 -->
      <view class="phase-label-wrap">
        <text class="phase-label">{{ phaseLabel }}</text>
      </view>

      <!-- 进度点 -->
      <view class="dots-wrap">
        <view
          v-for="i in activeSteps[phaseIndex].duration"
          :key="i"
          class="dot"
          :class="{ active: i <= dotActive }"
          :style="dotActiveStyle"
        />
      </view>

      <!-- 课程段落进度 -->
      <view v-if="isProgramMode" class="program-progress">
        <view v-for="(s, i) in currentProgram.stages" :key="i" class="prog-stage-wrap">
          <view class="prog-stage-bar" :class="{ done: i < programStageIndex, current: i === programStageIndex }">
            <view class="prog-stage-fill" :style="i === programStageIndex ? { width: stageProgress + '%' } : {}" />
          </view>
          <text class="prog-stage-name">{{ s.label }}</text>
        </view>
      </view>

      <!-- 轮次 -->
      <text class="round-text">
        <template v-if="isProgramMode">{{ currentProgram.stages[programStageIndex].label }} · 第 {{ round }} / {{ currentStageRounds }} 轮</template>
        <template v-else>第 {{ round }} / {{ totalRounds }} 轮</template>
      </text>
    </view>

    <!-- 底部控制 -->
    <view class="footer">
      <!-- 课程模式：周期选择 -->
      <view v-if="isProgramMode" class="duration-row">
        <view
          v-for="c in [1, 2, 3]"
          :key="c"
          class="duration-btn"
          :class="{ active: selectedCycles === c }"
          @click="onPickCycles(c)"
        >
          <text class="duration-text">{{ c }} 周期</text>
        </view>
      </view>
      <!-- 单一模式：时长选择 -->
      <view v-else class="duration-row">
        <view
          v-for="d in DURATION_OPTIONS"
          :key="d.value"
          class="duration-btn"
          :class="{ active: selectedDuration === d.value }"
          @click="onPickDuration(d.value)"
        >
          <text class="duration-text">{{ d.label }}</text>
        </view>
      </view>

      <view class="ctrl-btn" :class="{ running: isRunning }" :style="ctrlBtnStyle" @click="togglePlay">
        <text class="ctrl-icon">{{ isRunning ? '⏸' : '▶' }}</text>
        <text class="ctrl-label">{{ isRunning ? '暂停' : (isPaused ? '继续' : '开始') }}</text>
      </view>
    </view>

    <!-- 模式选择弹层 -->
    <view v-if="showModeSheet" class="sheet-mask" @click="showModeSheet = false">
      <view class="sheet" @click.stop>
        <text class="sheet-title">选择呼吸模式</text>

        <!-- 课程组合 -->
        <text class="sheet-section-label">🌿 呼吸课程</text>
        <view
          v-for="p in PROGRAMS"
          :key="p.key"
          class="sheet-item program-item"
          :class="{ active: isProgramMode && programKey === p.key }"
          @click="pickProgram(p.key)"
        >
          <view class="program-emoji-wrap">
            <text class="program-emoji">{{ p.emoji }}</text>
          </view>
          <view class="sheet-item-left">
            <view class="program-title-row">
              <text class="sheet-item-name">{{ p.name }}</text>
              <text class="program-duration-tag">{{ p.totalMin }} 分钟</text>
            </view>
            <text class="sheet-item-desc">{{ p.desc }}</text>
            <view class="program-stages">
              <text v-for="(s, i) in p.stages" :key="i" class="program-stage-tag">{{ s.label }}</text>
            </view>
          </view>
          <text v-if="isProgramMode && programKey === p.key" class="sheet-check">✓</text>
        </view>

        <!-- 分隔 -->
        <view class="sheet-divider" />

        <!-- 单一模式 -->
        <text class="sheet-section-label">🎯 单一模式</text>
        <view
          v-for="m in MODES"
          :key="m.key"
          class="sheet-item"
          :class="{ active: !isProgramMode && modeKey === m.key }"
          @click="pickMode(m.key)"
        >
          <view class="sheet-item-left">
            <text class="sheet-item-name">{{ m.name }}</text>
            <text class="sheet-item-desc">{{ m.desc }}</text>
          </view>
          <text v-if="!isProgramMode && modeKey === m.key" class="sheet-check">✓</text>
        </view>
      </view>
    </view>

    <!-- 外观选择弹层 -->
    <view v-if="showStyleSheet" class="sheet-mask" @click="showStyleSheet = false">      <view class="sheet" @click.stop>
        <text class="sheet-title">外观设置</text>

        <!-- 球样式 -->
        <text class="sheet-section-label">球体样式</text>
        <view class="style-row">
          <view
            v-for="s in BALL_STYLES"
            :key="s.key"
            class="style-card"
            :class="{ active: ballStyleKey === s.key }"
            @click="ballStyleKey = s.key"
          >
            <view class="style-preview" :style="stylePreview(s.key)" />
            <text class="style-card-label">{{ s.label }}</text>
          </view>
        </view>

        <!-- 颜色 -->
        <text class="sheet-section-label">主题颜色</text>
        <view class="color-row">
          <view
            v-for="c in COLOR_PRESETS"
            :key="c.value"
            class="color-swatch"
            :class="{ active: customColor === c.value }"
            :style="{ background: c.value }"
            @click="customColor = c.value"
          >
            <text v-if="customColor === c.value" class="color-check">✓</text>
          </view>
        </view>

        <view class="sheet-confirm-btn" @click="showStyleSheet = false">
          <text class="sheet-confirm-text">确定</text>
        </view>
      </view>
    </view>
  </view>

    <!-- 练习完成弹窗 -->
    <view v-if="showFinishModal" class="sheet-mask" @click.stop>
      <view class="sheet finish-sheet">
        <text class="finish-emoji">🎉</text>
        <text class="finish-title">练习完成</text>
        <text class="finish-sub">坚持呼吸练习，让身心更健康</text>
        <view class="finish-stats">
          <view class="finish-stat">
            <text class="finish-stat-num">{{ finishInfo.rounds }}</text>
            <text class="finish-stat-label">轮</text>
          </view>
          <view class="finish-stat-divider" />
          <view class="finish-stat">
            <text class="finish-stat-num">{{ Math.round((finishInfo.durationSec||0)/60) || 1 }}</text>
            <text class="finish-stat-label">分钟</text>
          </view>
        </view>
        <button class="finish-share-btn" open-type="share">分享给朋友</button>
        <view class="finish-close-btn" @click="showFinishModal = false">继续练习</view>
      </view>
    </view>

    <!-- 成就解锁弹窗 -->
    <view v-if="showAchievement && newAchievements[achievementIdx]" class="sheet-mask" @click.stop>
      <view class="sheet achievement-sheet">
        <text class="ach-unlock-tag">成就解锁</text>
        <text class="ach-unlock-icon">{{ newAchievements[achievementIdx].icon }}</text>
        <text class="ach-unlock-name">{{ newAchievements[achievementIdx].name }}</text>
        <text class="ach-unlock-desc">{{ newAchievements[achievementIdx].desc }}</text>
        <view class="ach-unlock-btn" @click="onNextAchievement">
          {{ achievementIdx < newAchievements.length - 1 ? '下一个 →' : '太棒了！' }}
        </view>
      </view>
    </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SERVER } from '../../config';

const fromSelect = ref(false);

// 成就弹窗
const newAchievements = ref([]);
const showAchievement = ref(false);
const achievementIdx  = ref(0);

// 练习完成弹窗
const showFinishModal = ref(false);
const finishInfo      = ref({ mode: '', rounds: 0, durationSec: 0 });

// ── 球体样式 ──────────────────────────────────────────────────
const BALL_STYLES = [
  { key: 'solid',   label: '纯色' },
  { key: 'glass',   label: '玻璃' },
  { key: 'ripple',  label: '水波' },
  { key: 'nebula',  label: '星云' },
];

const COLOR_PRESETS = [
  { value: '#4A7A9E' },
  { value: '#3A7E8A' },
  { value: '#6A5ACD' },
  { value: '#4AB8A0' },
  { value: '#E57373' },
  { value: '#F5A623' },
  { value: '#A0C4A0' },
  { value: '#B57BCA' },
  { value: '#4A90D9' },
  { value: '#E8705A' },
];

// 每个阶段的引导词
const GUIDE_WORDS = {
  in:   ['慢慢吸气…', '深深地吸入…', '让气息充满胸腔…', '鼻子缓缓吸气…'],
  hold: ['轻轻屏住…', '保持住…', '沉静地停留…'],
  out:  ['缓缓呼出…', '慢慢地释放…', '将气息轻轻呼出…', '让身体放松…'],
  rest: ['自然放松…', '静静休息…'],
};

// ── 呼吸课程定义 ──────────────────────────────────────────────
const PROGRAMS = [
  {
    key: 'sleep',
    name: '入睡准备',
    emoji: '🌙',
    desc: '渐进放松神经系统，帮助身心平静进入睡眠',
    totalMin: 12,
    color: '#6A5ACD',
    stages: [
      { label: '热身', rounds: 10, mode: '4-4-4', hint: '让身体慢慢安静下来…' },
      { label: '深化', rounds: 10, mode: '4-2-6', hint: '延长呼气，激活副交感神经…' },
      { label: '沉降', rounds: 8,  mode: '4-7-8', hint: '深度放松，让意识慢慢沉入…' },
    ],
  },
  {
    key: 'focus',
    name: '专注启动',
    emoji: '🎯',
    desc: '唤醒注意力，进入清醒专注的工作状态',
    totalMin: 8,
    color: '#3A7E8A',
    stages: [
      { label: '激活', rounds: 10, mode: '4-4-4', hint: '均匀呼吸，稳定注意力…' },
      { label: '强化', rounds: 12, mode: '5-5',   hint: '心率同调，进入心流…' },
      { label: '锁定', rounds: 10, mode: '4-4-4', hint: '保持清醒，专注当下…' },
    ],
  },
  {
    key: 'anxiety',
    name: '焦虑急救',
    emoji: '🫧',
    desc: '快速平复紧张情绪，降低焦虑和压力反应',
    totalMin: 7,
    color: '#4AB8A0',
    stages: [
      { label: '稳定', rounds: 10, mode: '4-4-4', hint: '先稳住呼吸节奏…' },
      { label: '释放', rounds: 8,  mode: '4-7-8', hint: '用呼气释放紧绷感…' },
      { label: '平复', rounds: 12, mode: '5-5',   hint: '回归平静，感受当下…' },
    ],
  },
  {
    key: 'meditation',
    name: '冥想入定',
    emoji: '🧘',
    desc: '逐步引导进入深度冥想，扩展觉察与专注',
    totalMin: 16,
    color: '#B57BCA',
    stages: [
      { label: '收心', rounds: 10, mode: '4-4-4', hint: '将注意力收回到呼吸…' },
      { label: '沉淀', rounds: 12, mode: '5-5',   hint: '随着呼吸，思绪慢慢沉淀…' },
      { label: '扩展', rounds: 8,  mode: '4-7-8', hint: '在静默中扩展觉察…' },
      { label: '安住', rounds: 12, mode: '5-5',   hint: '安住于此刻，不迎不拒…' },
    ],
  },
  {
    key: 'morning',
    name: '晨间唤醒',
    emoji: '🌅',
    desc: '温和激活身体与大脑，迎接充满活力的一天',
    totalMin: 7,
    color: '#F5A623',
    stages: [
      { label: '苏醒', rounds: 10, mode: '4-4-4', hint: '轻柔地唤醒身体…' },
      { label: '注入', rounds: 12, mode: '5-5',   hint: '深呼吸，为身体注入氧气…' },
      { label: '振奋', rounds: 10, mode: '4-4-4', hint: '感受清醒与能量…' },
    ],
  },
];

const MODES = [
  {
    key: '4-7-8',
    name: '4-7-8 放松',
    desc: '吸气4秒・屏息7秒・呼气8秒，深度放松神经',
    color: '#4A7A9E',
    steps: [
      { label: '吸气', duration: 4, phase: 'in'   },
      { label: '屏息', duration: 7, phase: 'hold'  },
      { label: '呼气', duration: 8, phase: 'out'   },
    ],
  },
  {
    key: '4-4-4',
    name: '4-4-4 专注',
    desc: '均匀三段，稳定注意力，适合工作前准备',
    color: '#3A7E8A',
    steps: [
      { label: '吸气', duration: 4, phase: 'in'   },
      { label: '屏息', duration: 4, phase: 'hold'  },
      { label: '呼气', duration: 4, phase: 'out'   },
    ],
  },
  {
    key: '4-2-6',
    name: '4-2-6 助眠',
    desc: '延长呼气激活副交感神经，帮助入睡',
    color: '#6A5ACD',
    steps: [
      { label: '吸气', duration: 4, phase: 'in'   },
      { label: '屏息', duration: 2, phase: 'hold'  },
      { label: '呼气', duration: 6, phase: 'out'   },
    ],
  },
  {
    key: '5-5',
    name: '5-5 心率同调',
    desc: '吸气5秒・呼气5秒，改善心率变异性',
    color: '#4AB8A0',
    steps: [
      { label: '吸气', duration: 5, phase: 'in'   },
      { label: '呼气', duration: 5, phase: 'out'   },
    ],
  },
];

const DURATION_OPTIONS = [
  { label: '3 分钟',  value: 3  },
  { label: '5 分钟',  value: 5  },
  { label: '10 分钟', value: 10 },
];

// ── 状态 ───────────────────────────────────────────────────────
const modeKey           = ref('4-7-8');
const isProgramMode     = ref(false);
const programKey        = ref('sleep');
const programStageIndex = ref(0);
const selectedDuration  = ref(5);
const selectedCycles    = ref(1);  // 课程周期数（1/2/3）
const showModeSheet     = ref(false);
const showStyleSheet    = ref(false);
const isRunning         = ref(false);
const isPaused          = ref(false);
const ballStyleKey      = ref('solid');
const customColor       = ref('#4A7A9E');

// 动画状态
const ballScale  = ref(0.55);
const phaseIndex = ref(0);
const elapsed    = ref(0);
const round      = ref(1);
const guideText  = ref('');

// ── 计算属性 ──────────────────────────────────────────────────
const currentMode    = computed(() => MODES.find(m => m.key === modeKey.value));
const currentProgram = computed(() => PROGRAMS.find(p => p.key === programKey.value));

// 当前实际执行的 steps（课程模式取当前段的 mode）
const activeSteps = computed(() => {
  if (isProgramMode.value) {
    const stage = currentProgram.value.stages[programStageIndex.value];
    return MODES.find(m => m.key === stage.mode).steps;
  }
  return currentMode.value.steps;
});

const activeColor = computed(() => {
  const base = isProgramMode.value ? currentProgram.value.color : customColor.value;
  if (!isRunning.value && !isPaused.value) return base;
  // ballScale 范围 0.55~1.0，映射到明暗：吸气亮，呼气暗
  const t = (ballScale.value - 0.55) / 0.45; // 0~1
  return t > 0.5 ? lighten(base, (t - 0.5) * 0.36) : darken(base, (0.5 - t) * 0.28);
});

// 当前段总轮数（乘以周期数）
const currentStageRounds = computed(() => {
  if (!isProgramMode.value) return totalRounds.value;
  return currentProgram.value.stages[programStageIndex.value].rounds * selectedCycles.value;
});

// 课程整体进度（用于段落进度条）
const stageProgress = computed(() => {
  const total = currentStageRounds.value;
  const cur   = round.value - 1 + Math.min(elapsed.value / (activeSteps.value.reduce((s, st) => s + st.duration, 0) || 1), 1) / total;
  return Math.min(100, (cur / total) * 100);
});

const totalRounds = computed(() => {
  const cycleDur = currentMode.value.steps.reduce((s, st) => s + st.duration, 0);
  return Math.max(1, Math.round((selectedDuration.value * 60) / cycleDur));
});

const phaseLabel = computed(() => {
  if (!isRunning.value && !isPaused.value) return '准备好了吗？';
  return activeSteps.value[phaseIndex.value].label;
});

const displayCount = computed(() => {
  if (!isRunning.value && !isPaused.value) return '';
  const step = activeSteps.value[phaseIndex.value];
  return String(Math.max(1, Math.ceil(step.duration - elapsed.value)));
});

const dotActive = computed(() => Math.ceil(elapsed.value + 0.01));

// 根据 ballStyleKey 生成球的样式
const ballStyle = computed(() => {
  const s = ballScale.value;
  const c = activeColor.value;
  let bg = '';
  if (ballStyleKey.value === 'solid') {
    bg = `radial-gradient(circle at 36% 32%, ${lighten(c, 0.42)} 0%, ${c} 55%, ${darken(c, 0.18)} 100%)`;
  } else if (ballStyleKey.value === 'glass') {
    bg = `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55) 0%, ${c}CC 40%, ${darken(c, 0.22)}EE 100%)`;
  } else if (ballStyleKey.value === 'ripple') {
    bg = `radial-gradient(circle at 50% 50%, ${lighten(c, 0.3)} 0%, ${c} 60%, ${darken(c, 0.15)} 100%)`;
  } else if (ballStyleKey.value === 'nebula') {
    bg = `radial-gradient(circle at 40% 35%, ${lighten(c, 0.55)} 0%, ${c} 35%, ${darken(c, 0.1)} 60%, ${darken(c, 0.3)} 100%)`;
  }
  const extra = ballStyleKey.value === 'glass'
    ? 'backdrop-filter: blur(8px);'
    : '';
  return `transform: scale(${s}); background: ${bg}; ${extra}`;
});

const ringStyle = computed(() => {
  const s = ballScale.value;
  const c = activeColor.value;
  const opacity = 0.18 + (s - 0.55) * 0.45;
  const dashed = ballStyleKey.value === 'ripple' ? 'border-style: dashed;' : '';
  return `transform: scale(${s * 1.18}); border-color: ${c}; opacity: ${opacity.toFixed(2)}; ${dashed}`;
});

const glowStyle = computed(() => {
  const s = ballScale.value;
  const c = activeColor.value;
  const size = 480 + (s - 0.55) * 560;
  const op   = ballStyleKey.value === 'nebula'
    ? (0.18 + (s - 0.55) * 0.32).toFixed(2)
    : (0.12 + (s - 0.55) * 0.24).toFixed(2);
  return `width: ${size}rpx; height: ${size}rpx; background: radial-gradient(ellipse at center, ${c}55 0%, transparent 68%); opacity: ${op};`;
});

// 水波纹外圈样式
const rippleOuterStyle = computed(() => {
  const s = ballScale.value;
  const c = activeColor.value;
  const op = (0.08 + (s - 0.55) * 0.18).toFixed(2);
  return `transform: scale(${s * 1.45}); border-color: ${c}; opacity: ${op};`;
});

// 进度点激活颜色
const dotActiveStyle = computed(() => '');

// 开始按钮颜色
const ctrlBtnStyle = computed(() => {
  if (isRunning.value) return '';
  return `background: ${activeColor.value}; box-shadow: 0 8rpx 32rpx ${activeColor.value}60;`;
});

// 样式预览（弹层里的小圆）
function stylePreview(key) {
  const c = activeColor.value;
  if (key === 'solid')  return `background: radial-gradient(circle at 36% 32%, ${lighten(c,0.42)} 0%, ${c} 60%, ${darken(c,0.18)} 100%)`;
  if (key === 'glass')  return `background: radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55) 0%, ${c}CC 50%, ${darken(c,0.22)}EE 100%)`;
  if (key === 'ripple') return `background: ${c}; border: 3rpx dashed ${lighten(c,0.4)}`;
  if (key === 'nebula') return `background: radial-gradient(circle at 40% 35%, ${lighten(c,0.55)} 0%, ${c} 45%, ${darken(c,0.3)} 100%)`;
  return `background: ${c}`;
}

// ── 动画引擎 ──────────────────────────────────────────────────
let rafId        = null;
let lastTime     = null;
let guideTimer   = null;
let lastPhaseIdx = -1;

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function targetScale(phase) {
  if (phase === 'in')   return 1.0;
  if (phase === 'out')  return 0.55;
  if (phase === 'hold') return 1.0;
  if (phase === 'rest') return 0.55;
  return 0.55;
}

function startScale(phase) {
  if (phase === 'in')   return 0.55;
  if (phase === 'out')  return 1.0;
  if (phase === 'hold') return 1.0;
  if (phase === 'rest') return 0.55;
  return 0.55;
}

// 切换引导词：从对应阶段随机选一句，2.2 秒后淡出
function updateGuide(phase) {
  if (guideTimer) { clearTimeout(guideTimer); guideTimer = null; }
  const pool = GUIDE_WORDS[phase] || [];
  if (!pool.length) { guideText.value = ''; return; }
  guideText.value = pool[Math.floor(Math.random() * pool.length)];
  guideTimer = setTimeout(() => { guideText.value = ''; }, 2200);
}

function tick(ts) {
  if (!isRunning.value) return;

  if (lastTime === null) { lastTime = ts; }
  const dt = Math.min((ts - lastTime) / 1000, 0.1);
  lastTime = ts;

  const steps = activeSteps.value;
  const step  = steps[phaseIndex.value];
  elapsed.value += dt;

  if (phaseIndex.value !== lastPhaseIdx) {
    lastPhaseIdx = phaseIndex.value;
    updateGuide(step.phase);
  }

  const progress  = Math.min(elapsed.value / step.duration, 1);
  const eased     = easeInOut(progress);
  const from      = startScale(step.phase);
  const to        = targetScale(step.phase);
  ballScale.value = from + (to - from) * eased;

  if (elapsed.value >= step.duration) {
    elapsed.value -= step.duration;
    const nextIdx = phaseIndex.value + 1;
    if (nextIdx >= steps.length) {
      phaseIndex.value = 0;
      const stageRounds = isProgramMode.value
        ? currentProgram.value.stages[programStageIndex.value].rounds
        : totalRounds.value;
      if (round.value >= stageRounds) {
        if (isProgramMode.value) {
          const nextStage = programStageIndex.value + 1;
          if (nextStage >= currentProgram.value.stages.length) {
            finishSession();
            return;
          }
          // 切换到下一段，显示提示
          const nextStageDef = currentProgram.value.stages[nextStage];
          programStageIndex.value = nextStage;
          round.value = 1;
          lastPhaseIdx = -1;
          uni.showToast({ title: nextStageDef.hint, icon: 'none', duration: 2500 });
        } else {
          finishSession();
          return;
        }
      } else {
        round.value += 1;
      }
    } else {
      phaseIndex.value = nextIdx;
    }
  }

  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  try {
    lastTime     = null;
    lastPhaseIdx = -1;
    rafId        = requestAnimationFrame(tick);
  } catch (e) {
    uni.showToast({ title: '动画启动失败，请重试', icon: 'none' });
    isRunning.value = false;
  }
}

function stopLoop() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (guideTimer) { clearTimeout(guideTimer); guideTimer = null; }
  lastTime = null;
}

function resetState() {
  stopLoop();
  phaseIndex.value        = 0;
  elapsed.value           = 0;
  round.value             = 1;
  programStageIndex.value = 0;
  selectedCycles.value    = 1;
  ballScale.value         = 0.55;
  guideText.value         = '';
  isRunning.value         = false;
  isPaused.value          = false;
}

function finishSession() {
  stopLoop();
  const durationSec = Math.round(
    activeSteps.value.reduce((s, st) => s + st.duration, 0) * (round.value - 1)
  );
  const modeKey_ = isProgramMode.value ? programKey.value : modeKey.value;

  isRunning.value  = false;
  isPaused.value   = false;
  ballScale.value  = 0.55;
  phaseIndex.value = 0;
  elapsed.value    = 0;
  round.value      = 1;
  guideText.value  = '';

  // 记录历史 + 检查成就
  const token = uni.getStorageSync('token');
  if (token) {
    uni.request({
      url:    `${SERVER}/api/breathing/finish`,
      method: 'POST',
      header: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data:   { mode: modeKey_, isProgramMode: isProgramMode.value, rounds: round.value, durationSec },
      success: (res) => {
        if (res.data?.newAchievements?.length) {
          newAchievements.value = res.data.newAchievements;
          achievementIdx.value  = 0;
          showAchievement.value = true;
        }
      },
    });
  }

  // 完成弹窗
  finishInfo.value = { mode: modeKey_, rounds: round.value, durationSec };
  showFinishModal.value = true;
}

// ── 控件 ─────────────────────────────────────────────────────
function togglePlay() {
  if (isRunning.value) {
    // 暂停
    stopLoop();
    isRunning.value = false;
    isPaused.value  = true;
  } else {
    isRunning.value = true;
    isPaused.value  = false;
    startLoop();
  }
}

function onPickDuration(val) {
  if (isRunning.value || isPaused.value) {
    uni.showModal({
      title: '重置练习',
      content: '更改时长将重置当前练习，确定吗？',
      success: (res) => {
        if (!res.confirm) return;
        resetState();
        selectedDuration.value = val;
      },
    });
  } else {
    selectedDuration.value = val;
  }
}

function onPickCycles(val) {
  if (isRunning.value || isPaused.value) {
    uni.showModal({
      title: '重置练习',
      content: '更改周期将重置当前练习，确定吗？',
      success: (res) => {
        if (!res.confirm) return;
        resetState();
        selectedCycles.value = val;
      },
    });
  } else {
    selectedCycles.value = val;
  }
}

function pickMode(key) {
  if (isRunning.value || isPaused.value) {
    uni.showModal({
      title: '切换模式',
      content: '切换模式将重置当前练习，确定吗？',
      success: (res) => {
        if (!res.confirm) return;
        resetState();
        isProgramMode.value = false;
        modeKey.value = key;
        showModeSheet.value = false;
      },
    });
  } else {
    isProgramMode.value = false;
    modeKey.value = key;
    showModeSheet.value = false;
  }
}

function pickProgram(key) {
  if (isRunning.value || isPaused.value) {
    uni.showModal({
      title: '切换课程',
      content: '切换课程将重置当前练习，确定吗？',
      success: (res) => {
        if (!res.confirm) return;
        resetState();
        isProgramMode.value = true;
        programKey.value    = key;
        showModeSheet.value = false;
      },
    });
  } else {
    isProgramMode.value = true;
    programKey.value    = key;
    showModeSheet.value = false;
  }
}

function onBack() {
  if (isRunning.value || isPaused.value) {
    uni.showModal({
      title: '离开练习',
      content: '练习尚未结束，确定要离开吗？',
      success: (res) => { if (res.confirm) { resetState(); uni.navigateBack(); } },
    });
  } else {
    uni.navigateBack();
  }
}

// ── 颜色工具 ─────────────────────────────────────────────────
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const l = v => Math.min(255, Math.round(v + (255 - v) * amt));
  return `rgb(${l(r)},${l(g)},${l(b)})`;
}
function darken(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const d = v => Math.max(0, Math.round(v * (1 - amt)));
  return `rgb(${d(r)},${d(g)},${d(b)})`;
}

onMounted(() => {  const pages = getCurrentPages();
  const page  = pages[pages.length - 1];
  const opts  = page.$page?.options ?? page.options ?? {};
  const { type, key } = opts;
  if (type && key) {
    fromSelect.value = true;
    if (type === 'program') {
      isProgramMode.value = true;
      programKey.value    = key;
    } else {
      isProgramMode.value = false;
      modeKey.value       = key;
    }
  }
});

function onNextAchievement() {
  if (achievementIdx.value < newAchievements.value.length - 1) {
    achievementIdx.value++;
  } else {
    showAchievement.value = false;
    newAchievements.value = [];
  }
}

onUnmounted(() => stopLoop());
</script>

<style scoped lang="scss">
$bg:       #0D1821;
$surface:  #162230;
$text-1:   #EEF4F2;
$text-2:   #8DAAB8;
$accent:   #4A7A9E;

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
  padding: 20rpx 32rpx;
  gap: 20rpx;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { opacity: 0.6; }
}

.icon-text {
  font-size: 30rpx;
  color: $text-1;
}

.top-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: $text-1;
  letter-spacing: 0.05em;
  font-family: "Noto Serif SC", serif;
}

.top-right-btns {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.top-icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.6; }
}

.top-icon-text {
  font-size: 32rpx;
}

.mode-picker-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 24rpx;
  background: rgba(255,255,255,0.07);
  border-radius: 40rpx;
  &:active { opacity: 0.65; }
}

.mode-picker-label {
  font-size: 22rpx;
  color: $text-2;
}

.mode-picker-arrow {
  font-size: 26rpx;
  color: $text-2;
}

/* ── 主体 ── */
.body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40rpx;
  padding: 0 40rpx 40rpx;
}

/* ── 引导词 ── */
.guide-wrap {
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-text {
  font-size: 28rpx;
  color: rgba(238,244,242,0);
  letter-spacing: 0.12em;
  font-family: "Noto Serif SC", serif;
  font-weight: 300;
  transition: color 0.5s;

  &.visible {
    color: rgba(238,244,242,0.65);
  }
}

/* ── 球 ── */
.ball-wrap {
  position: relative;
  width: 480rpx;
  height: 480rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ball-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  transition: width 0.1s, height 0.1s, opacity 0.1s;
}

.ball-ring {
  position: absolute;
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  border: 3rpx solid $accent;
  pointer-events: none;
  transition: transform 0.08s, opacity 0.08s;
  will-change: transform;
}

.ball-ripple-outer {
  position: absolute;
  width: 360rpx;
  height: 360rpx;
  border-radius: 50%;
  border: 2rpx solid $accent;
  pointer-events: none;
  transition: transform 0.08s, opacity 0.08s;
  will-change: transform;
}

.ball {
  position: relative;
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 0 60rpx rgba(74,122,158,0.35),
    0 0 120rpx rgba(74,122,158,0.15),
    inset 0 -20rpx 40rpx rgba(0,0,0,0.18);
  transition: transform 0.08s, background 0.4s;
  will-change: transform;
}

.ball-count {
  font-size: 80rpx;
  font-weight: 200;
  color: rgba(255,255,255,0.92);
  letter-spacing: -0.02em;
  font-family: "Noto Serif SC", serif;
  line-height: 1;
}

/* ── 阶段文字 ── */
.phase-label-wrap {
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phase-label {
  font-size: 36rpx;
  color: $text-1;
  font-weight: 300;
  letter-spacing: 0.18em;
  font-family: "Noto Serif SC", serif;
}

/* ── 进度点 ── */
.dots-wrap {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 20rpx;
}

.dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.16);
  transition: background 0.25s, transform 0.25s;

  &.active {
    background: $accent;
    transform: scale(1.35);
  }
}

/* ── 轮次 ── */
.round-text {
  font-size: 24rpx;
  color: $text-2;
  letter-spacing: 0.06em;
}

/* ── 底部 ── */
.footer {
  flex-shrink: 0;
  padding: 0 40rpx 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: $surface;
  border-radius: 50rpx;
  padding: 8rpx 12rpx;
}

.duration-btn {
  padding: 12rpx 32rpx;
  border-radius: 40rpx;
  transition: background 0.2s $zj-ease-out;

  &.active { background: $accent; }
  &:hover  { background: rgba(255,255,255,0.08); }
  &:active  { opacity: 0.7; }
}

.duration-text {
  font-size: 26rpx;
  color: $text-2;
  letter-spacing: 0.04em;

  .active & { color: #FFFFFF; font-weight: 600; }
}

.ctrl-btn {
  width: 280rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: $accent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: 0 8rpx 32rpx rgba(74,122,158,0.38);
  transition: transform 0.15s, background 0.3s, box-shadow 0.3s;

  &.running {
    background: rgba(255,255,255,0.1) !important;
    box-shadow: none !important;
    border: 1rpx solid rgba(255,255,255,0.12);
  }

  &:active { transform: scale(0.95); }
}

.ctrl-icon  { font-size: 36rpx; color: #FFFFFF; }
.ctrl-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 0.08em;
}

/* ── 弹层通用 ── */
.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: #1A2C3D;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 32rpx 60rpx;
}

.sheet-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-1;
  text-align: center;
  margin-bottom: 32rpx;
  letter-spacing: 0.05em;
}

/* 模式列表 */
.sheet-section-label {
  display: block;
  font-size: 20rpx;
  font-weight: 600;
  color: $text-2;
  letter-spacing: 0.12em;
  margin: 8rpx 0 16rpx;
}

.sheet-divider {
  height: 1rpx;
  background: rgba(255,255,255,0.08);
  margin: 20rpx 0;
}

.program-item {
  align-items: flex-start;
  gap: 16rpx;
}

.program-emoji-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  background: rgba(255,255,255,0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.program-emoji { font-size: 32rpx; }

.program-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}

.program-duration-tag {
  font-size: 18rpx;
  color: $text-2;
  background: rgba(255,255,255,0.07);
  border-radius: 20rpx;
  padding: 2rpx 12rpx;
}

.program-stages {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 10rpx;
}

.program-stage-tag {
  font-size: 18rpx;
  color: $text-2;
  background: rgba(255,255,255,0.06);
  border-radius: 20rpx;
  padding: 2rpx 14rpx;
}

/* 课程段落进度 */
.program-progress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: 100%;
  padding: 0 20rpx;
}

.prog-stage-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.prog-stage-bar {
  width: 100%;
  height: 6rpx;
  border-radius: 3rpx;
  background: rgba(255,255,255,0.10);
  overflow: hidden;
  position: relative;

  &.done .prog-stage-fill {
    width: 100%;
    background: rgba(255,255,255,0.55);
  }

  &.current { background: rgba(255,255,255,0.15); }
}

.prog-stage-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: $accent;
  border-radius: 3rpx;
  transition: width 0.3s;
  width: 0%;
}

.prog-stage-name {
  font-size: 18rpx;
  color: $text-2;
  letter-spacing: 0.04em;
}

.sheet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  margin-bottom: 12rpx;
  background: rgba(255,255,255,0.04);
  transition: background 0.15s $zj-ease-out;

  &.active { background: rgba(74,122,158,0.22); }
  &:hover  { background: rgba(255,255,255,0.07); }
  &:active  { opacity: 0.7; }
}

.sheet-item-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.sheet-item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-1;
}

.sheet-item-desc {
  font-size: 22rpx;
  color: $text-2;
  line-height: 1.5;
}

.sheet-check {
  font-size: 32rpx;
  color: $accent;
  font-weight: 700;
}

/* 外观弹层 */
.sheet-section-label {
  display: block;
  font-size: 22rpx;
  color: $text-2;
  letter-spacing: 0.08em;
  margin-bottom: 20rpx;
  margin-top: 8rpx;
}

.style-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 36rpx;
}

.style-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 10rpx;
  border-radius: 20rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid transparent;
  transition: border-color 0.2s, background 0.2s;

  &.active {
    border-color: $accent;
    background: rgba(74,122,158,0.15);
  }

  &:active { opacity: 0.7; }
}

.style-preview {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
}

.style-card-label {
  font-size: 22rpx;
  color: $text-2;

  .active & { color: $text-1; }
}

.color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.color-swatch {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid transparent;
  box-sizing: border-box;
  transition: transform 0.15s, border-color 0.15s;

  &.active {
    border-color: #FFFFFF;
    transform: scale(1.18);
  }

  &:active { transform: scale(0.92); }
}

.color-check {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 700;
}

.sheet-confirm-btn {
  height: 88rpx;
  border-radius: 44rpx;
  background: $accent;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;
  &:active { opacity: 0.8; }
}

.sheet-confirm-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 0.08em;
}

/* ── 练习完成弹窗 ── */
.finish-sheet {
  text-align: center;
  padding: 48rpx 40rpx;
}
.finish-emoji { font-size: 72rpx; display: block; margin-bottom: 16rpx; }
.finish-title { display: block; color: #EEF4F2; font-size: 40rpx; font-weight: 700; margin-bottom: 8rpx; }
.finish-sub   { display: block; color: #8DAAB8; font-size: 26rpx; margin-bottom: 32rpx; }
.finish-stats {
  display: flex; align-items: center; justify-content: center; gap: 0;
  background: rgba(255,255,255,0.05); border-radius: 20rpx;
  padding: 24rpx 40rpx; margin-bottom: 32rpx;
}
.finish-stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
.finish-stat-num   { color: #4AB8A0; font-size: 52rpx; font-weight: 700; }
.finish-stat-label { color: #8DAAB8; font-size: 24rpx; margin-top: 4rpx; }
.finish-stat-divider { width: 2rpx; height: 60rpx; background: rgba(255,255,255,0.1); }
.finish-share-btn {
  width: 100%; background: #4A7A9E; color: #fff;
  border: none; border-radius: 16rpx; padding: 20rpx 0;
  font-size: 28rpx; margin-bottom: 16rpx;
}
.finish-close-btn {
  color: #8DAAB8; font-size: 26rpx; padding: 12rpx 0;
}

/* ── 成就解锁弹窗 ── */
.achievement-sheet {
  text-align: center;
  padding: 48rpx 40rpx;
}
.ach-unlock-tag {
  display: inline-block; background: #F5A62320; color: #F5A623;
  font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 20rpx;
  margin-bottom: 24rpx; border: 1rpx solid #F5A62340;
}
.ach-unlock-icon { display: block; font-size: 80rpx; margin-bottom: 16rpx; }
.ach-unlock-name { display: block; color: #EEF4F2; font-size: 36rpx; font-weight: 700; margin-bottom: 8rpx; }
.ach-unlock-desc { display: block; color: #8DAAB8; font-size: 26rpx; margin-bottom: 32rpx; }
.ach-unlock-btn {
  background: linear-gradient(135deg, #F5A623, #FFD166);
  color: #1A1A1A; font-size: 28rpx; font-weight: 600;
  padding: 20rpx 60rpx; border-radius: 16rpx; display: inline-block;
}
</style>
