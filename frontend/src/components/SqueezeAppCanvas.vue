<template>
  <!-- App 专用：renderjs 在视图层创建真实 HTML canvas（官方推荐，避开 nodeId / getContext 崩溃） -->
  <view
    :id="hostId"
    class="host"
    :bridge="bridge"
    :change:bridge="canvasRj.onBridge"
    @touchstart.prevent="canvasRj.onTouch"
    @touchmove.prevent="canvasRj.onTouch"
  />
</template>

<script>
/**
 * 逻辑层只负责下发指令 / 接收统计；绘制与物理全部在 renderjs。
 * callMethod 只能调本组件 options API 的 methods。
 */
export default {
  name: 'SqueezeAppCanvas',
  props: {
    bubbleCount: { type: Number, default: 80 },
    /** 递增以触发 action：reset | popAll */
    actionId: { type: Number, default: 0 },
    action: { type: String, default: 'idle' },
  },
  emits: ['ready', 'fail', 'stats', 'pop'],
  data() {
    return {
      hostId: 'squeezeRjHost_' + Date.now().toString(36),
      bridge: {
        seq: 0,
        count: 80,
        action: 'init',
        hostId: '',
      },
    };
  },
  watch: {
    bubbleCount: {
      immediate: true,
      handler(v) {
        this.pushBridge('reset', v);
      },
    },
    actionId() {
      if (this.action === 'reset' || this.action === 'popAll') {
        this.pushBridge(this.action, this.bubbleCount);
      }
    },
  },
  mounted() {
    this.pushBridge('init', this.bubbleCount);
  },
  methods: {
    pushBridge(action, count) {
      this.bridge = {
        seq: Date.now(),
        count: Number(count) || 80,
        action,
        hostId: this.hostId,
      };
    },
    onRenderReady() {
      this.$emit('ready');
    },
    onRenderFail() {
      this.$emit('fail');
    },
    onRenderStats(payload) {
      this.$emit('stats', payload);
    },
    onRenderPop() {
      this.$emit('pop');
    },
  },
};
</script>

<script module="canvasRj" lang="renderjs">
const PALETTE = [
  { h: 205, s: 90, l: 68 },
  { h: 330, s: 82, l: 72 },
  { h: 45, s: 95, l: 62 },
  { h: 160, s: 65, l: 60 },
  { h: 265, s: 70, l: 72 },
  { h: 15, s: 88, l: 68 },
  { h: 190, s: 75, l: 62 },
  { h: 110, s: 60, l: 62 },
];

function makeColor(i) {
  const p = PALETTE[i % PALETTE.length];
  return {
    fill: `hsl(${p.h},${p.s}%,${p.l}%)`,
    fillSoft: `hsla(${p.h},${p.s}%,${p.l}%,0.18)`,
    stroke: `hsl(${p.h},${Math.max(40, p.s - 15)}%,${Math.max(35, p.l - 18)}%)`,
    splash: `hsla(${p.h},${p.s}%,${p.l}%,0.35)`,
  };
}

export default {
  data() {
    return {
      canvas: null,
      ctx: null,
      W: 0,
      H: 0,
      bubbles: [],
      particles: [],
      stains: [],
      rafId: null,
      owner: null,
      lastSeq: 0,
      hostId: '',
      combo: 0,
      comboTs: 0,
      bootTries: 0,
    };
  },
  mounted() {
    setTimeout(() => this.boot(), 80);
    setTimeout(() => { if (!this.ctx) this.boot(); }, 280);
    setTimeout(() => { if (!this.ctx) this.boot(); }, 600);
  },
  methods: {
    onBridge(newVal, _oldVal, ownerInstance) {
      this.owner = ownerInstance;
      if (!newVal || newVal.seq === this.lastSeq) return;
      this.lastSeq = newVal.seq;
      if (newVal.hostId) this.hostId = newVal.hostId;
      if (!this.ctx) {
        this.boot(() => this.applyAction(newVal));
        return;
      }
      this.applyAction(newVal);
    },

    applyAction(cmd) {
      if (!cmd) return;
      if (cmd.action === 'init' || cmd.action === 'reset') {
        this.initBubbles(cmd.count || 80);
      } else if (cmd.action === 'popAll') {
        this.popAll();
      }
    },

    findHost() {
      if (this.hostId) {
        const el = document.getElementById(this.hostId);
        if (el) return el;
      }
      const list = document.querySelectorAll('.host');
      return list.length ? list[list.length - 1] : null;
    },

    ensureCanvas(host) {
      let canvas = host.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
        host.appendChild(canvas);
      }
      return canvas;
    },

    boot(done) {
      const host = this.findHost();
      if (!host) {
        this.bootTries += 1;
        if (this.bootTries < 12) {
          setTimeout(() => this.boot(done), 100);
          return;
        }
        if (this.owner) this.owner.callMethod('onRenderFail');
        return;
      }
      const canvas = this.ensureCanvas(host);
      const rect = host.getBoundingClientRect
        ? host.getBoundingClientRect()
        : { width: host.clientWidth || 300, height: host.clientHeight || 400 };
      const W = Math.max(1, Math.floor(rect.width || host.clientWidth || 0));
      const H = Math.max(1, Math.floor(rect.height || host.clientHeight || 0));
      if (W < 8 || H < 8) {
        this.bootTries += 1;
        if (this.bootTries < 16) setTimeout(() => this.boot(done), 120);
        else if (this.owner) this.owner.callMethod('onRenderFail');
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      let ctx = null;
      try {
        ctx = canvas.getContext('2d');
      } catch (e) {
        ctx = null;
      }
      if (!ctx) {
        if (this.owner) this.owner.callMethod('onRenderFail');
        return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      this.canvas = canvas;
      this.ctx = ctx;
      this.W = W;
      this.H = H;
      this.bootTries = 0;
      if (this.owner) this.owner.callMethod('onRenderReady');
      if (!this.bubbles.length) this.initBubbles(80);
      done && done();
    },

    emitStats() {
      if (!this.owner) return;
      const total = this.bubbles.length;
      const popped = this.bubbles.filter((b) => b.popped).length;
      this.owner.callMethod('onRenderStats', {
        total,
        popped,
        remain: total - popped,
        combo: this.combo,
      });
    },

    initBubbles(N) {
      const W = this.W;
      const H = this.H;
      if (!this.ctx || W < 1 || H < 1) return;
      N = Math.max(20, Math.min(160, Number(N) || 80));
      const fill = 0.48;
      const avgR = Math.sqrt((fill * W * H) / (N * Math.PI));
      const rMin = avgR * 0.78;
      const rMax = avgR * 1.18;
      const list = [];
      const spanY = Math.max(H * 0.55, avgR * 4);
      const yBase = Math.max(avgR, H - spanY - avgR);
      for (let i = 0; i < N; i++) {
        const r = rMin + Math.random() * (rMax - rMin);
        list.push({
          x: r + Math.random() * (W - 2 * r),
          y: yBase + Math.random() * Math.max(r, H - r - yBase),
          r,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0,
          mass: r * r,
          invMass: 1 / (r * r),
          popped: false,
          squash: 0,
          squashV: 0,
          nx: 0,
          ny: 1,
          resting: false,
          supported: false,
          color: makeColor(Math.floor(Math.random() * PALETTE.length)),
        });
      }
      this.bubbles = list;
      this.particles = [];
      this.stains = [];
      this.combo = 0;
      for (let k = 0; k < 24; k++) this.resolve();
      for (let s = 0; s < 280; s++) {
        if (!this.step()) break;
      }
      this.bubbles.forEach((b) => {
        if (b.popped) return;
        b.vx = 0; b.vy = 0; b.resting = true; b.squash = 0; b.squashV = 0;
      });
      this.draw();
      this.emitStats();
      this.startLoop();
    },

    clamp() {
      const { W, H, bubbles } = this;
      for (const b of bubbles) {
        if (b.popped) continue;
        if (b.x < b.r) b.x = b.r;
        else if (b.x > W - b.r) b.x = W - b.r;
        if (b.y < b.r) b.y = b.r;
        else if (b.y > H - b.r) b.y = H - b.r;
      }
    },

    resolve() {
      const list = this.bubbles;
      const { W, H } = this;
      const floorY = H - 0.5;
      const order = [];
      for (let i = 0; i < list.length; i++) if (!list[i].popped) order.push(i);
      order.sort((ia, ib) => list[ib].y - list[ia].y);
      for (let oi = 0; oi < order.length; oi++) {
        const a = list[order[oi]];
        for (let oj = oi + 1; oj < order.length; oj++) {
          const b = list[order[oj]];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          const minDist = a.r + b.r;
          let dist2 = dx * dx + dy * dy;
          if (dist2 >= minDist * minDist) continue;
          let dist = Math.sqrt(dist2) || 0.01;
          if (dist < 1e-5) { dx = 1; dy = 0.02; dist = Math.sqrt(dx * dx + dy * dy); }
          const nx = dx / dist;
          const ny = dy / dist;
          const corr = (minDist - dist - 0.35) * 0.85;
          if (corr <= 0) continue;
          const aFloor = a.y + a.r >= floorY;
          const bFloor = b.y + b.r >= floorY;
          let wA = a.invMass;
          let wB = b.invMass;
          if (aFloor && ny < -0.2) wA *= 0.05;
          if (bFloor && ny > 0.2) wB *= 0.05;
          const wSum = wA + wB || 1;
          a.x -= nx * corr * (wA / wSum);
          a.y -= ny * corr * (wA / wSum);
          b.x += nx * corr * (wB / wSum);
          b.y += ny * corr * (wB / wSum);
          a.resting = false;
          b.resting = false;
          const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vn < 0) {
            const j = -(1.22) * vn / (a.invMass + b.invMass);
            a.vx -= j * nx * a.invMass;
            a.vy -= j * ny * a.invMass;
            b.vx += j * nx * b.invMass;
            b.vy += j * ny * b.invMass;
          }
        }
      }
      this.clamp();
    },

    step() {
      const { W, H, bubbles } = this;
      let moving = false;
      const G = 0.28;
      for (const b of bubbles) {
        b.supported = false;
        if (b.popped || b.resting) continue;
        b.vy += G;
        b.vx *= 0.985;
        b.vy *= 0.985;
        b.x += b.vx;
        b.y += b.vy;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.22; }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.22; }
        if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) * 0.22; }
        if (b.y + b.r > H) {
          b.y = H - b.r;
          if (b.vy > 1) b.vy = -b.vy * 0.22; else b.vy = 0;
          b.vx *= 0.82;
        }
      }
      for (let k = 0; k < 5; k++) this.resolve();
      for (const b of bubbles) {
        if (b.popped) continue;
        b.squashV += -b.squash * 0.22;
        b.squashV *= 0.82;
        b.squash += b.squashV;
        if (Math.abs(b.squash) < 0.004) { b.squash = 0; b.squashV = 0; }
        const onFloor = b.y + b.r >= H - 0.6;
        const slow = Math.abs(b.vx) < 0.55 && Math.abs(b.vy) < 0.85;
        if (onFloor && slow) { b.vx = 0; b.vy = 0; b.resting = true; }
        else b.resting = false;
        if (!b.resting || Math.abs(b.squash) > 0.01) moving = true;
      }
      return moving;
    },

    drawBubble(b) {
      const ctx = this.ctx;
      const r = b.r;
      const sq = b.squash || 0;
      ctx.save();
      ctx.translate(b.x, b.y);
      if (Math.abs(sq) > 0.002) {
        const ang = Math.atan2(b.ny, b.nx);
        ctx.rotate(ang);
        ctx.scale(1 - sq, 1 + sq);
        ctx.rotate(-ang);
      }
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = b.color.fillSoft;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = b.color.fill;
      ctx.fill();
      ctx.strokeStyle = b.color.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.28, -r * 0.3, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fill();
      ctx.restore();
    },

    draw() {
      const ctx = this.ctx;
      if (!ctx) return;
      const { W, H } = this;
      ctx.clearRect(0, 0, W, H);
      for (const s of this.stains) {
        if (s.alpha <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color.replace(/[\d.]+\)$/, (s.alpha * 0.3).toFixed(2) + ')');
        ctx.fill();
      }
      for (const b of this.bubbles) {
        if (!b.popped) this.drawBubble(b);
      }
      for (const p of this.particles) {
        const t = p.life / p.maxLife;
        if (t <= 0.02) continue;
        if (p.type === 'drop') {
          ctx.globalAlpha = Math.min(1, t * 1.4);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * (0.3 + 0.7 * t), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.globalAlpha = 1;
        } else if (p.type === 'wave') {
          ctx.globalAlpha = t * 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r0 * (1 + (1 - t) * 1.6), 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    },

    advanceFx() {
      for (const p of this.particles) {
        if (p.type === 'drop') {
          p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.vx *= 0.97;
        }
        p.life -= 1;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const s of this.stains) {
        if (s.vx || s.vy) {
          s.x += s.vx; s.y += s.vy;
          s.vx *= 0.85; s.vy *= 0.85;
          if (Math.abs(s.vx) < 0.05) s.vx = 0;
          if (Math.abs(s.vy) < 0.05) s.vy = 0;
        }
        if (s.hold > 0) s.hold -= 1;
        else s.alpha -= s.dryRate;
      }
      this.stains = this.stains.filter((s) => s.alpha > 0.01);
    },

    loop() {
      const moving = this.step();
      this.advanceFx();
      this.draw();
      if (moving || this.particles.length || this.stains.length) {
        this.rafId = requestAnimationFrame(() => this.loop());
      } else {
        this.rafId = null;
        this.draw();
      }
    },

    startLoop() {
      if (this.rafId) return;
      this.rafId = requestAnimationFrame(() => this.loop());
    },

    popAt(x, y) {
      for (const b of this.bubbles) {
        if (b.popped) continue;
        const dx = x - b.x;
        const dy = y - b.y;
        if (dx * dx + dy * dy > b.r * b.r) continue;
        b.popped = true;
        this.particles.push({
          type: 'wave', x: b.x, y: b.y, r0: b.r, life: 18, maxLife: 18, color: b.color.stroke,
        });
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          this.particles.push({
            type: 'drop',
            x: b.x, y: b.y,
            vx: Math.cos(ang) * b.r * 0.09,
            vy: Math.sin(ang) * b.r * 0.09 - b.r * 0.03,
            r: b.r * 0.12,
            life: 24, maxLife: 24,
            color: b.color.fill,
          });
        }
        this.stains.push({
          x: b.x, y: b.y, r: b.r * 0.55, vx: 0, vy: 0,
          color: b.color.splash, alpha: 1, hold: 100, dryRate: 0.01,
        });
        const radius = b.r * 5.5;
        const impulse = b.mass * 9;
        for (const o of this.bubbles) {
          if (o.popped || o === b) continue;
          const ox = o.x - b.x;
          const oy = o.y - b.y;
          const dist = Math.sqrt(ox * ox + oy * oy) || 0.01;
          if (dist > radius) continue;
          const fall = (1 - dist / radius);
          const fall2 = fall * fall;
          o.vx += (ox / dist) * impulse * fall2 * o.invMass;
          o.vy += (oy / dist) * impulse * fall2 * o.invMass;
          o.resting = false;
          o.squash = Math.min(0.45, fall2 * 0.45);
          o.nx = ox / dist; o.ny = oy / dist; o.squashV = 0;
        }
        const now = Date.now();
        this.combo = (now - this.comboTs < 900) ? this.combo + 1 : 1;
        this.comboTs = now;
        this.emitStats();
        if (this.owner) this.owner.callMethod('onRenderPop');
        this.startLoop();
        return;
      }
    },

    popAll() {
      for (const b of this.bubbles) {
        if (b.popped) continue;
        b.popped = true;
        this.stains.push({
          x: b.x, y: b.y, r: b.r * 0.45, vx: 0, vy: 0,
          color: b.color.splash, alpha: 1, hold: 60, dryRate: 0.015,
        });
      }
      this.emitStats();
      this.startLoop();
    },

    onTouch(e) {
      if (!this.ctx || !this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const touches = (e.touches && e.touches.length) ? e.touches : (e.changedTouches || [e]);
      for (let i = 0; i < touches.length; i++) {
        const t = touches[i];
        const x = (t.clientX ?? t.pageX ?? t.x ?? 0) - rect.left;
        const y = (t.clientY ?? t.pageY ?? t.y ?? 0) - rect.top;
        this.popAt(x, y);
      }
      if (e.preventDefault) e.preventDefault();
    },
  },
};
</script>

<style scoped>
.host {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  position: relative;
  overflow: hidden;
}
</style>
