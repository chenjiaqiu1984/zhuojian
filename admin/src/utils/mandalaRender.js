/**
 * 将曼达拉 drawingData 绘制到 HTMLCanvasElement（与前端 gallery/draw 逻辑对齐）
 */
const SHAPE_MODES = new Set(['rect', 'square', 'diamond', 'circle', 'semicircle']);

function rotatePoint(p, cx, cy, angle) {
  const dx = p.x - cx;
  const dy = p.y - cy;
  return {
    x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

function scalePoint(p, scale) {
  return { x: p.x * scale, y: p.y * scale };
}

function drawShape(ctx, type, start, end, cx, cy, rotAngle) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (type === 'rect') {
    const pts = [
      { x: start.x, y: start.y },
      { x: start.x + dx, y: start.y },
      { x: start.x + dx, y: start.y + dy },
      { x: start.x, y: start.y + dy },
    ].map((p) => rotatePoint(p, cx, cy, rotAngle));
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  } else if (type === 'square') {
    const half = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const pts = [
      { x: mx - half, y: my - half },
      { x: mx + half, y: my - half },
      { x: mx + half, y: my + half },
      { x: mx - half, y: my + half },
    ].map((p) => rotatePoint(p, cx, cy, rotAngle));
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  } else if (type === 'diamond') {
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const rx = Math.abs(dx) / 2;
    const ry = Math.abs(dy) / 2;
    const pts = [
      { x: mx, y: my - ry },
      { x: mx + rx, y: my },
      { x: mx, y: my + ry },
      { x: mx - rx, y: my },
    ].map((p) => rotatePoint(p, cx, cy, rotAngle));
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  } else if (type === 'circle') {
    const r = Math.sqrt(dx * dx + dy * dy);
    const rc = rotatePoint(start, cx, cy, rotAngle);
    ctx.arc(rc.x, rc.y, r, 0, Math.PI * 2);
  } else if (type === 'semicircle') {
    const r = Math.sqrt(dx * dx + dy * dy);
    const baseAngle = Math.atan2(dy, dx);
    const rc = rotatePoint(start, cx, cy, rotAngle);
    const startA = baseAngle + rotAngle;
    ctx.arc(rc.x, rc.y, r, startA, startA + Math.PI);
    ctx.closePath();
  }
}

function drawPath(ctx, path, cx, cy, count, scale) {
  if (!path.points || path.points.length < 1) return;
  const pts = path.points.map((p) => scalePoint(p, scale));
  const lw = Math.max(0.5, (path.width || 6) * scale);
  const color = path.color || '#333';

  for (let seg = 0; seg < count; seg++) {
    const angle = (Math.PI * 2 * seg) / count;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.type === 'arc' && pts.length >= 3) {
      const p0 = rotatePoint(pts[0], cx, cy, angle);
      const p1 = rotatePoint(pts[1], cx, cy, angle);
      const p2 = rotatePoint(pts[2], cx, cy, angle);
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
    } else if (SHAPE_MODES.has(path.type) && pts.length >= 2) {
      drawShape(ctx, path.type, pts[0], pts[1], cx, cy, angle);
    } else {
      const p0 = rotatePoint(pts[0], cx, cy, angle);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < pts.length; i++) {
        const p = rotatePoint(pts[i], cx, cy, angle);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string|object} drawingData
 * @param {number} [size=480]
 * @returns {boolean} 是否绘制成功
 */
export function renderMandala(canvas, drawingData, size = 480) {
  let data = drawingData;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return false; }
  }
  if (!data || !Array.isArray(data.paths)) return false;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const srcW = data.canvasSize?.w || 600;
  const srcH = data.canvasSize?.h || 600;
  const scale = size / Math.max(srcW, srcH);
  const cx = size / 2;
  const cy = size / 2;
  const count = data.symmetry ? (data.symmetryCount || 8) : 1;

  ctx.fillStyle = data.bg || '#FDF8F2';
  ctx.fillRect(0, 0, size, size);

  for (const path of data.paths) {
    drawPath(ctx, path, cx, cy, count, scale);
  }
  return true;
}
