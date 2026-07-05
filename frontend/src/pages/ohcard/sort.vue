<template>
  <view class="page">
    <view class="toolbar">
      <text class="hint">点击翻牌 · 拖动排列 · 双击放大</text>
      <text class="save-btn" @click="save">保存记录</text>
    </view>
    <view class="guide-strip">
      <text class="guide-text">翻开你感兴趣的卡牌，将它们摆放在你觉得自然的位置——不必思考，让直觉引导你。排列完成后，试着说说：这些图让你想到了什么？</text>
    </view>
    <movable-area class="table">
      <movable-view
        v-for="(card, i) in cards" :key="i"
        :x="card.x" :y="card.y"
        direction="all" damping="20"
        @change="onMove(i, $event)"
        @click="reveal(i)"
        class="mv-card"
      >
        <view v-if="!card.revealed" class="card-back">
          <text class="card-idx">{{i + 1}}</text>
        </view>
        <image v-else :src="fullUrl(card.imageUrl)" mode="aspectFill" class="card-front" />
      </movable-view>
    </movable-area>

    <!-- Fullscreen zoom overlay -->
    <view v-if="zoomIdx !== null" class="fs-overlay" @dblclick="zoomIdx=null" @touchstart="onZoomTap">
      <image :src="fullUrl(cards[zoomIdx]?.imageUrl)" mode="aspectFit" class="fs-img" />
      <view class="fs-actions">
        <text class="fs-swap" @click.stop="swapZoomed">换一张</text>
        <text class="fs-close" @click.stop="zoomIdx=null">✕</text>
      </view>
      <text class="fs-hint">双击关闭</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { track } from '../../utils/track';
import { SERVER } from '../../config';

const BASE_IMG = SERVER;
const store = useUserStore();

const imageCatId = ref(null);
const zoomIdx = ref(null);
const lastTap = ref(0);
const cards = ref(
  Array.from({ length: 6 }, () => ({ x: 0, y: 0, imageUrl: null, revealed: false }))
);

onMounted(async () => {
  track('page_view', '/pages/ohcard/sort');
  const { windowWidth } = uni.getSystemInfoSync();
  const r = windowWidth / 750;
  const pad = 20 * r, cw = 168 * r, ch = 226 * r, cgap = 10 * r, rgap = 4 * r;
  cards.value.forEach((c, i) => {
    c.x = pad + (i % 2) * (cw + cgap);
    c.y = pad + Math.floor(i / 2) * (ch + rgap);
  });

  try {
    const cats = await ohcardApi.categories();
    const imageCat = cats.find(c => c.type === 'image');
    if (!imageCat) return;
    imageCatId.value = imageCat.id;
    const fetched = await ohcardApi.cards({ category_id: imageCat.id, count: 6 });
    fetched.forEach((c, i) => { if (cards.value[i]) cards.value[i].imageUrl = c.imageUrl; });
  } catch {}
});

function fullUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : BASE_IMG + url;
}

function reveal(i) {
  if (!cards.value[i].revealed) {
    if (cards.value[i].imageUrl) cards.value[i].revealed = true;
    return;
  }
  const now = Date.now();
  if (now - lastTap.value < 300) zoomIdx.value = i;
  lastTap.value = now;
}

function onZoomTap() {
  const now = Date.now();
  if (now - lastTap.value < 300) zoomIdx.value = null;
  lastTap.value = now;
}

async function swapZoomed() {
  const i = zoomIdx.value;
  if (i === null) return;
  try {
    const imgs = await ohcardApi.cards({ category_id: imageCatId.value, count: 1 });
    if (imgs.length) { cards.value[i].imageUrl = imgs[0].imageUrl; }
  } catch {}
}

function onMove(i, e) {
  cards.value[i].x = e.detail.x;
  cards.value[i].y = e.detail.y;
}

async function save() {
  if (!store.isLoggedIn()) return uni.navigateTo({ url: '/pages/login/index' });
  try {
    await ohcardApi.saveRecord({
      type: 'sort',
      data: cards.value.map((c, i) => ({ imageUrl: c.imageUrl, revealed: c.revealed, x: c.x, y: c.y, rank: i + 1 }))
    });
    uni.showToast({ title: '已保存' });
  } catch { uni.showToast({ title: '保存失败', icon: 'none' }); }
}
</script>

<style scoped lang="scss">
.page { background: #f5f7fa; min-height: 100vh; }
.toolbar { padding: 24rpx 32rpx; display: flex; justify-content: space-between; align-items: center; }
.hint { font-size: 24rpx; color: rgba(255,255,255,.55); }
.guide-strip { padding: 16rpx 32rpx; background: rgba(0,0,0,.25); }
.guide-text { font-size: 24rpx; color: rgba(255,255,255,.75); line-height: 1.7; display: block; }
.save-btn { font-size: 26rpx; color: #ffe082; padding: 10rpx 28rpx; border: 2rpx solid #ffe082; border-radius: 32rpx; }
.table { width: 750rpx; height: 2400rpx; background: #2a4a1e; position: relative; }
.mv-card { width: 168rpx; height: 226rpx; }
.card-back {
  width: 168rpx; height: 226rpx; border-radius: 14rpx;
  background: linear-gradient(135deg, #4A7BBA, #7B68EE);
  box-shadow: 0 6rpx 20rpx rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
}
.card-idx { color: rgba(255,255,255,.5); font-size: 52rpx; font-weight: bold; }
.card-front { width: 168rpx; height: 226rpx; border-radius: 14rpx; box-shadow: 0 6rpx 20rpx rgba(0,0,0,.4); }
.fs-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.92);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.fs-img { width: 100vw; height: 80vh; }
.fs-actions { display: flex; gap: 32rpx; margin-top: 24rpx; }
.fs-swap { font-size: 28rpx; color: #ffe082; padding: 14rpx 40rpx; border: 2rpx solid #ffe082; border-radius: 32rpx; }
.fs-close { font-size: 28rpx; color: rgba(255,255,255,.7); padding: 14rpx 40rpx; border: 2rpx solid rgba(255,255,255,.3); border-radius: 32rpx; }
.fs-hint { color: rgba(255,255,255,.35); font-size: 22rpx; margin-top: 20rpx; }
</style>
