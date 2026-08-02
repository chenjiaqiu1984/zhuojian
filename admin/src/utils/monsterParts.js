/**
 * 管理端怪兽部件预览（与前端 monsterParts 布局一致）
 * 资源来自 frontend/src/pages/monster/static/monster-v2
 */
const PART_ASSETS = import.meta.glob(
  '../../../frontend/src/pages/monster/static/monster-v2/**/*.png',
  { eager: true, query: '?url', import: 'default' },
);

const PART_URL_MAP = Object.create(null);
for (const [key, url] of Object.entries(PART_ASSETS)) {
  const m = key.match(/monster-v2\/([^/]+)\/([^/]+)\.png$/);
  if (m) PART_URL_MAP[`${m[1]}/${m[2]}`] = url;
}

export const LAYER_ORDER = ['wing', 'tail', 'body', 'eyes', 'nose', 'mouth', 'horn', 'glasses'];

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

export function partUrl(slot, id) {
  if (!id) return '';
  return PART_URL_MAP[`${slot}/${id}`] || '';
}

export function parseParts(str) {
  try {
    const d = typeof str === 'string' ? JSON.parse(str) : str;
    return d && typeof d === 'object' ? d : {};
  } catch {
    return {};
  }
}

function resolveTransform(slot, transforms) {
  const base = LAYOUT[slot] || { x: 50, y: 50 };
  const t = (transforms && transforms[slot]) || {};
  return {
    x: t.x != null ? t.x : base.x,
    y: t.y != null ? t.y : base.y,
    scale: t.scale != null ? t.scale : 1,
    rot: t.rot != null ? t.rot : 0,
  };
}

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

/** 手绘路径绘制到 canvas */
export function renderMonsterCanvas(canvas, drawingData, size = 280) {
  let data = drawingData;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return false; }
  }
  if (!data?.paths?.length) return false;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#FDFAFF';
  ctx.fillRect(0, 0, size, size);
  const scale = size / 600;
  for (const path of data.paths) {
    if (!path.points || path.points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = path.color || '#333';
    ctx.lineWidth = Math.max(0.5, (path.width || 6) * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(path.points[0].x * scale, path.points[0].y * scale);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x * scale, path.points[i].y * scale);
    }
    ctx.stroke();
  }
  return true;
}
