<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="icon-btn" @click="e => onBack(e)">
        <text class="icon-text">←</text>
      </view>
      <text class="top-title">我的画廊</text>
      <view style="width: 64rpx;" />
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="grid-wrap">
      <view class="skeleton-card" v-for="i in 4" :key="i">
        <view class="skeleton-visual" />
        <view class="skeleton-line" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else-if="works.length === 0" class="empty-wrap">
      <view class="empty-circle"><text class="empty-emoji">🎨</text></view>
      <text class="empty-title">画廊还空着</text>
      <text class="empty-desc">去创作你的第一幅曼达拉吧</text>
      <view class="empty-btn" @click="e => goCreate(e)">开始创作</view>
    </view>

    <!-- 作品网格 -->
    <view v-else class="grid-wrap">
      <view class="work-card" v-for="w in works" :key="w.id" @click="preview(w)">
        <view class="work-visual">
          <canvas :canvas-id="`gallery-${w.id}`" :id="`gallery-${w.id}`" class="work-canvas" />
        </view>
        <view class="work-info">
          <text class="work-date">{{ formatDate(w.createdAt) }}</text>
          <text class="work-del" @click.stop="confirmDelete(w)">删除</text>
        </view>
      </view>
    </view>

    <!-- FAB 新建 -->
    <view v-if="!loading && works.length > 0" class="fab" @click="e => goCreate(e)">+</view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { mandalaApi } from '@/api';

const works   = ref([]);
const loading = ref(true);

onMounted(load);

async function load() {
  loading.value = true;
  try {
    works.value = await mandalaApi.list();
    await nextTick();
    works.value.forEach(w => drawThumb(w));
  } catch (e) {
    if (e && e.__authRedirect) return;
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

// 从存储的 paths 在缩略图 canvas 上重绘（复刻 draw.vue 的渲染逻辑）
function drawThumb(w) {
  let data;
  try { data = JSON.parse(w.drawingData); } catch { return; }
  if (!data || !data.paths) return;

  const size = 280; // 缩略图逻辑尺寸
  const src  = data.canvasSize || { w: 600, h: 600 };
  const scale = size / (src.w || 600);
  const cx = size / 2;
  const cy = size / 2;
  const count = data.symmetry ? (data.symmetryCount || 8) : 1;

  const ctx = uni.createCanvasContext(`gallery-${w.id}`);
  // 背景
  ctx.setFillStyle(data.bg || '#FDF8F2');
  ctx.fillRect(0, 0, size, size);

  const rotate = (p, angle) => {
    const dx = p.x * scale - cx;
    const dy = p.y * scale - cy;
    return {
      x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
    };
  };

  for (const path of data.paths) {
    if (!path.points || path.points.length < 1) continue;
    const lw = Math.max(0.5, (path.width || 6) * scale);
    for (let seg = 0; seg < count; seg++) {
      const angle = (Math.PI * 2 * seg) / count;
      ctx.beginPath();
      ctx.setStrokeStyle(path.color || '#333');
      ctx.setLineWidth(lw);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      if (path.type === 'arc' && path.points.length >= 3) {
        const p0 = rotate(path.points[0], angle);
        const p1 = rotate(path.points[1], angle);
        const p2 = rotate(path.points[2], angle);
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
      } else {
        const p0 = rotate(path.points[0], angle);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < path.points.length; i++) {
          const p = rotate(path.points[i], angle);
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();
    }
  }
  ctx.draw();
}

function preview(w) {
  // 暂以放大缩略图查看：导出为图片后 previewImage（H5 直接提示）
  uni.canvasToTempFilePath({
    canvasId: `gallery-${w.id}`,
    success: (res) => {
      uni.previewImage({ urls: [res.tempFilePath], current: res.tempFilePath });
    },
    fail: () => uni.showToast({ title: '预览失败', icon: 'none' }),
  });
}

function confirmDelete(w) {
  uni.showModal({
    title: '删除作品',
    content: '确定要删除这幅作品吗？删除后无法恢复。',
    confirmColor: '#E8524A',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await mandalaApi.del(w.id);
        works.value = works.value.filter(x => x.id !== w.id);
        uni.showToast({ title: '已删除', icon: 'success' });
      } catch (e) {
        if (e && e.__authRedirect) return;
        uni.showToast({ title: '删除失败', icon: 'none' });
      }
    },
  });
}

function formatDate(dt) {
  const d = new Date(dt);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function goCreate() { uni.navigateTo({ url: '/pages/mandala/draw' }); }
function onBack()   { uni.navigateBack(); }
</script>

<style scoped lang="scss">
$teal: #3A7E8A;
$bg: #F5F7F6;
$text-1: #1C2A27;
$muted: #9BBCB4;

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 140rpx;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #EEF2F1;
}
.icon-btn {
  width: 64rpx; height: 64rpx; border-radius: 50%;
  background: #F0F4F3;
  display: flex; align-items: center; justify-content: center;
  &:active { opacity: 0.7; }
}
.icon-text { font-size: 30rpx; color: $text-1; }
.top-title { font-size: 30rpx; font-weight: 600; color: $text-1; letter-spacing: 0.04em; }

/* 网格 */
.grid-wrap {
  padding: 24rpx 28rpx 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx;
}

.work-card {
  background: #fff; border-radius: 24rpx; overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(58,126,138,0.08);
  border: 1rpx solid #E8EFED;
  &:active { transform: scale(0.97); }
}
.work-visual {
  width: 100%; aspect-ratio: 1 / 1;
  background: #FDF8F2;
  display: flex; align-items: center; justify-content: center;
}
.work-canvas { width: 100%; height: 320rpx; }
.work-info {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14rpx 18rpx 18rpx;
}
.work-date { font-size: 22rpx; color: $muted; }
.work-del { font-size: 22rpx; color: #E8524A; padding: 4rpx 8rpx; }

/* 骨架 */
.skeleton-card {
  background: #fff; border-radius: 24rpx; padding: 0 0 18rpx; overflow: hidden;
  border: 1rpx solid #E8EFED;
}
.skeleton-visual {
  width: 100%; aspect-ratio: 1 / 1;
  background: linear-gradient(90deg, #EEF2F1 25%, #F6FAF9 50%, #EEF2F1 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
.skeleton-line {
  height: 20rpx; width: 50%; border-radius: 10rpx; background: #EEF2F1;
  margin: 14rpx 18rpx 0;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 空状态 */
.empty-wrap {
  padding: 120rpx 60rpx 0;
  display: flex; flex-direction: column; align-items: center; gap: 18rpx;
}
.empty-circle {
  width: 160rpx; height: 160rpx; border-radius: 50%;
  background: linear-gradient(135deg, #E8F4F0 0%, #C8E4DC 100%);
  display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx;
}
.empty-emoji { font-size: 72rpx; }
.empty-title { font-size: 34rpx; font-weight: 700; color: $text-1; }
.empty-desc { font-size: 26rpx; color: $muted; text-align: center; }
.empty-btn {
  margin-top: 16rpx; padding: 24rpx 60rpx;
  background: linear-gradient(135deg, #3A7E8A 0%, #1E5870 100%);
  border-radius: 50rpx; color: #fff; font-size: 28rpx; font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(30,88,112,0.30);
  &:active { transform: scale(0.97); }
}

/* FAB */
.fab {
  position: fixed; right: 40rpx; bottom: 96rpx;
  width: 104rpx; height: 104rpx; border-radius: 50%;
  background: linear-gradient(135deg, #3A7E8A 0%, #1E5870 100%);
  box-shadow: 0 8rpx 28rpx rgba(30,88,112,0.40);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 54rpx; font-weight: 300; z-index: 100;
  &:active { transform: scale(0.92); }
}
</style>
