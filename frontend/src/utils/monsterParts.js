// 怪兽部件（位图版 monster-v2）共享配置
// 完全替换旧的 SVG 换色方案：固定配色位图，身体自带四肢，新增鼻子，配饰拆为 角/翅膀/尾巴/眼镜 四槽。

const BASE = '/static/monster-v2';

// 各槽位可选数量（对应 static/monster-v2/<slot>/<slot>_NN.png）
const COUNTS = {
  body: 7,
  eyes: 8,
  nose: 11,
  mouth: 10,
  horn: 10,
  wing: 1,
  tail: 4,
  glasses: 2,
};

function ids(slot) {
  return Array.from({ length: COUNTS[slot] }, (_, i) => `${slot}_${String(i + 1).padStart(2, '0')}`);
}

// 部件定义（拼装面板按此顺序展示）
export const PART_DEFS = [
  { key: 'body',    label: '身体', optional: false, items: ids('body') },
  { key: 'eyes',    label: '眼睛', optional: false, items: ids('eyes') },
  { key: 'nose',    label: '鼻子', optional: true,  items: ids('nose') },
  { key: 'mouth',   label: '嘴巴', optional: false, items: ids('mouth') },
  { key: 'horn',    label: '角/头饰', optional: true, items: ids('horn') },
  { key: 'wing',    label: '翅膀', optional: true,  items: ids('wing') },
  { key: 'tail',    label: '尾巴', optional: true,  items: ids('tail') },
  { key: 'glasses', label: '眼镜', optional: true,  items: ids('glasses') },
];

// 每个身体的代表色（位图固定配色，用于卡片背景/进度条等 UI 强调色）
export const BODY_COLORS = {
  body_01: '#7FB539', // 绿
  body_02: '#D9502E', // 红龙
  body_03: '#4E9BD1', // 蓝
  body_04: '#7B5B43', // 棕
  body_05: '#8E5BB5', // 紫
  body_06: '#2E8B84', // 青龙
  body_07: '#E8A87C', // 桃
};

export function bodyColor(bodyId) {
  return BODY_COLORS[bodyId] || '#7B4E9E';
}

// 默认怪兽（新建时初始选择）
export function defaultParts() {
  return {
    type: 'parts',
    body: 'body_01',
    eyes: 'eyes_01',
    nose: '',
    mouth: 'mouth_01',
    horn: '',
    wing: '',
    tail: '',
    glasses: '',
    // 每个部件的位置/缩放/旋转（可在编辑器拖动调整）
    transforms: defaultTransforms(),
  };
}

// 部件图片 URL
export function partUrl(slot, id) {
  if (!id) return '';
  return `${BASE}/${slot}/${id}.png`;
}

// 图层渲染顺序（从后到前）。
export const LAYER_ORDER = ['wing', 'tail', 'body', 'eyes', 'nose', 'mouth', 'horn', 'glasses'];

// 每个槽位的默认布局（相对预览框百分比）：
//   x/y 部件中心位置，w 部件基础宽度，z 叠放层级。
// 身体自带头部，五官默认落在上半部"头部区"（y 30~52），而非画面正中。
// 用户可在编辑器里拖动/缩放，覆盖值存入 transforms。
export const LAYOUT = {
  wing:    { x: 50, y: 40, w: 92, z: 1 },
  tail:    { x: 75, y: 60, w: 30, z: 2 },
  body:    { x: 50, y: 56, w: 66, z: 3 },
  eyes:    { x: 50, y: 33, w: 40, z: 4 },
  nose:    { x: 50, y: 42, w: 13, z: 5 },
  mouth:   { x: 50, y: 48, w: 26, z: 6 },
  horn:    { x: 50, y: 13, w: 36, z: 7 },
  glasses: { x: 50, y: 33, w: 40, z: 8 },
};

// 默认变换：每个槽位 { x, y, scale, rot }，初始取 LAYOUT 的 x/y、scale=1、rot=0
export function defaultTransforms() {
  const t = {};
  for (const slot of LAYER_ORDER) {
    t[slot] = { x: LAYOUT[slot].x, y: LAYOUT[slot].y, scale: 1, rot: 0 };
  }
  return t;
}

// 合并已存变换与默认值（老数据/缺字段兜底）
export function resolveTransform(slot, transforms) {
  const base = LAYOUT[slot] || { x: 50, y: 50 };
  const t = (transforms && transforms[slot]) || {};
  return {
    x: t.x != null ? t.x : base.x,
    y: t.y != null ? t.y : base.y,
    scale: t.scale != null ? t.scale : 1,
    rot: t.rot != null ? t.rot : 0,
  };
}

// 计算某槽位最终渲染样式所需数值
export function layoutOf(slot, transforms) {
  const base = LAYOUT[slot] || { w: 30, z: 1 };
  const t = resolveTransform(slot, transforms);
  return {
    left: t.x,
    top: t.y,
    width: base.w * t.scale,
    rot: t.rot,
    z: base.z,
  };
}

// 解析怪兽存储的 drawingData
export function parseParts(str) {
  try {
    const d = typeof str === 'string' ? JSON.parse(str) : str;
    return d && typeof d === 'object' ? d : {};
  } catch {
    return {};
  }
}
