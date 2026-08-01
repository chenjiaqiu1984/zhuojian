<template>
  <!-- App 专用：renderjs 在视图层创建真实 HTML canvas -->
  <view
    :id="hostId"
    class="host"
    :style="hostStyle"
    :bridge="bridge"
    :change:bridge="canvasRj.onBridge"
    @touchstart.prevent="canvasRj.onTouchStart"
    @touchmove.prevent="canvasRj.onTouchMove"
    @touchend="canvasRj.onTouchEnd"
  />
</template>

<script>
export default {
  name: 'MandalaAppCanvas',
  props: {
    size: { type: Number, default: 320 },
    color: { type: String, default: '#E8524A' },
    brushSize: { type: Number, default: 6 },
    eraser: { type: Boolean, default: false },
    symmetry: { type: Boolean, default: true },
    symmetryCount: { type: Number, default: 8 },
    /** clear | undo | idle */
    action: { type: String, default: 'idle' },
    actionId: { type: Number, default: 0 },
  },
  emits: ['ready', 'fail', 'empty-change'],
  data() {
    return {
      hostId: 'mandalaRjHost_' + Date.now().toString(36),
      bridge: {
        seq: 0,
        size: 320,
        color: '#E8524A',
        brushSize: 6,
        eraser: false,
        symmetry: true,
        symmetryCount: 8,
        action: 'init',
        hostId: '',
      },
    };
  },
  computed: {
    hostStyle() {
      const s = Math.max(120, this.size || 320);
      return { width: s + 'px', height: s + 'px' };
    },
  },
  watch: {
    size: 'pushState',
    color: 'pushState',
    brushSize: 'pushState',
    eraser: 'pushState',
    symmetry: 'pushState',
    symmetryCount: 'pushState',
    actionId() {
      if (this.action === 'clear' || this.action === 'undo') {
        this.pushBridge(this.action);
      }
    },
  },
  mounted() {
    this.pushBridge('init');
  },
  methods: {
    pushState() {
      this.pushBridge('state');
    },
    pushBridge(action) {
      this.bridge = {
        seq: Date.now(),
        size: this.size,
        color: this.color,
        brushSize: this.brushSize,
        eraser: this.eraser,
        symmetry: this.symmetry,
        symmetryCount: this.symmetryCount,
        action,
        hostId: this.hostId,
      };
    },
    onRenderReady() { this.$emit('ready'); },
    onRenderFail() { this.$emit('fail'); },
    onEmptyChange(v) { this.$emit('empty-change', !!v); },
  },
};
</script>

<script module="canvasRj" lang="renderjs">
export default {
  data() {
    return {
      canvas: null,
      ctx: null,
      owner: null,
      lastSeq: 0,
      hostId: '',
      size: 320,
      color: '#E8524A',
      brushSize: 6,
      eraser: false,
      symmetry: true,
      symmetryCount: 8,
      drawing: false,
      last: null,
      strokes: [],
      current: null,
      bootTries: 0,
    };
  },
  mounted() {
    setTimeout(() => this.boot(), 80);
    setTimeout(() => { if (!this.ctx) this.boot(); }, 280);
    setTimeout(() => { if (!this.ctx) this.boot(); }, 600);
  },
  methods: {
    onBridge(val, _old, owner) {
      this.owner = owner;
      if (!val || val.seq === this.lastSeq) return;
      this.lastSeq = val.seq;
      if (val.hostId) this.hostId = val.hostId;
      this.size = val.size || 320;
      this.color = val.color || '#E8524A';
      this.brushSize = val.brushSize || 6;
      this.eraser = !!val.eraser;
      this.symmetry = !!val.symmetry;
      this.symmetryCount = val.symmetryCount || 8;
      if (!this.ctx) {
        this.boot(() => this.applyAction(val.action));
        return;
      }
      if (val.action === 'init' || val.action === 'state') {
        this.resize(this.size);
        this.redraw();
      } else {
        this.applyAction(val.action);
      }
    },

    applyAction(action) {
      if (action === 'clear') {
        this.strokes = [];
        this.redraw();
        this.emitEmpty();
      } else if (action === 'undo') {
        this.strokes.pop();
        this.redraw();
        this.emitEmpty();
      }
    },

    emitEmpty() {
      if (this.owner) this.owner.callMethod('onEmptyChange', this.strokes.length === 0);
    },

    findHost() {
      if (this.hostId) {
        const el = document.getElementById(this.hostId);
        if (el) return el;
      }
      return null;
    },

    ensureCanvas(host) {
      let canvas = host.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;border-radius:20rpx;';
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
      this.canvas = canvas;
      try {
        this.ctx = canvas.getContext('2d');
      } catch (e) {
        this.ctx = null;
      }
      if (!this.ctx) {
        if (this.owner) this.owner.callMethod('onRenderFail');
        return;
      }
      this.bootTries = 0;
      this.resize(this.size);
      this.redraw();
      if (this.owner) this.owner.callMethod('onRenderReady');
      done && done();
    },

    resize(size) {
      if (!this.canvas || !this.ctx) return;
      const s = Math.max(120, Math.floor(size || 320));
      this.size = s;
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(s * dpr);
      this.canvas.height = Math.round(s * dpr);
      this.canvas.style.width = s + 'px';
      this.canvas.style.height = s + 'px';
      this.canvas.style.display = 'block';
      this.canvas.style.touchAction = 'none';
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    },

    drawBg() {
      const ctx = this.ctx;
      const s = this.size;
      ctx.fillStyle = '#FDF8F2';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = 'rgba(58,126,138,0.12)';
      ctx.lineWidth = 1;
      const cx = s / 2;
      const cy = s / 2;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (s * 0.42 * i) / 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      const n = this.symmetry ? this.symmetryCount : 0;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * s * 0.48, cy + Math.sin(a) * s * 0.48);
        ctx.stroke();
      }
    },

    paintStroke(stroke) {
      const ctx = this.ctx;
      if (!stroke?.points?.length) return;
      const count = stroke.symmetry ? stroke.symmetryCount : 1;
      const cx = this.size / 2;
      const cy = this.size / 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;
      if (stroke.eraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }
      for (let k = 0; k < count; k++) {
        const rot = (Math.PI * 2 * k) / count;
        ctx.beginPath();
        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          const dx = p.x - cx;
          const dy = p.y - cy;
          const x = cx + dx * Math.cos(rot) - dy * Math.sin(rot);
          const y = cy + dx * Math.sin(rot) + dy * Math.cos(rot);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    },

    redraw() {
      if (!this.ctx) return;
      this.drawBg();
      for (const s of this.strokes) this.paintStroke(s);
      if (this.current) this.paintStroke(this.current);
    },

    localPoint(e) {
      const t = (e.touches && e.touches[0]) || e.changedTouches?.[0] || e;
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (t.clientX ?? t.pageX ?? t.x ?? 0) - rect.left,
        y: (t.clientY ?? t.pageY ?? t.y ?? 0) - rect.top,
      };
    },

    onTouchStart(e) {
      if (!this.ctx) {
        this.boot();
        return;
      }
      const p = this.localPoint(e);
      this.drawing = true;
      this.current = {
        color: this.color,
        size: this.brushSize,
        eraser: this.eraser,
        symmetry: this.symmetry,
        symmetryCount: this.symmetryCount,
        points: [p],
      };
      this.last = p;
      if (e.preventDefault) e.preventDefault();
    },

    onTouchMove(e) {
      if (!this.drawing || !this.current) return;
      const p = this.localPoint(e);
      this.current.points.push(p);
      this.last = p;
      this.redraw();
      if (e.preventDefault) e.preventDefault();
    },

    onTouchEnd() {
      if (!this.drawing) return;
      this.drawing = false;
      if (this.current?.points?.length > 1) {
        this.strokes.push(this.current);
      }
      this.current = null;
      this.redraw();
      this.emitEmpty();
    },
  },
};
</script>

<style scoped>
.host {
  position: relative;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 24rpx rgba(58, 126, 138, 0.12);
  background: #FDF8F2;
}
</style>
