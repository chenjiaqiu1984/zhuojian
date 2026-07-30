<template>
  <view v-if="state.visible" class="overlay" @click="close()">
    <view class="modal" @click.stop>
      <scroll-view scroll-y class="poster-scroll" :show-scrollbar="false">
        <!-- 预览海报 -->
        <view class="poster" :class="`poster--${state.kind}`">
          <view class="poster-hero">
            <view class="hero-glow" />
            <text class="poster-brand">{{ MINIPROGRAM_NAME }}</text>
            <text class="poster-title">{{ state.title }}</text>
            <text v-if="state.subtitle" class="poster-sub">{{ state.subtitle }}</text>
          </view>

          <!-- 抽卡卡面 -->
          <view v-if="state.kind === 'ohcard' && state.cards.length" class="cards-block">
            <view class="cards-grid" :class="cardsGridClass">
              <view v-for="(c, i) in state.cards" :key="i" class="share-card">
                <text v-if="c.label" class="share-card-label">{{ c.label }}</text>
                <view class="share-card-face" :class="{ 'share-card-face--word': !c.imageUrl && c.word }">
                  <image v-if="c.imageUrl" class="share-card-img" :src="c.imageUrl" mode="aspectFill" />
                  <view v-else-if="c.word" class="share-card-word-wrap">
                    <text class="share-card-word">{{ c.word }}</text>
                  </view>
                  <view v-else class="share-card-empty">
                    <text class="share-card-empty-txt">图卡</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 测评结果 -->
          <view v-if="state.kind === 'assessment' && state.assessment" class="assess-block">
            <text v-if="state.assessment.scaleName" class="assess-scale">{{ state.assessment.scaleName }}</text>
            <text v-if="showAssessScore" class="assess-score">{{ state.assessment.score }}</text>
            <view v-if="state.assessment.level" class="assess-level">
              <text class="assess-level-txt">{{ state.assessment.level }}</text>
            </view>
            <text v-if="state.assessment.typeName" class="assess-type">{{ state.assessment.typeName }}</text>
            <text v-if="assessDescShort" class="assess-desc">{{ assessDescShort }}</text>
            <text v-if="state.assessment.date" class="assess-date">{{ state.assessment.date }}</text>
          </view>

          <view class="poster-divider" />

          <view class="promo-block">
            <text class="promo-name">{{ MINIPROGRAM_NAME }}小程序</text>
            <text class="promo-intro">{{ MINIPROGRAM_INTRO }}</text>
            <text class="promo-hint">{{ MINIPROGRAM_SCAN_HINT }}</text>
            <image class="promo-qr" :src="qrSrc" mode="aspectFit" show-menu-by-longpress />
          </view>
        </view>
      </scroll-view>

      <view class="actions">
        <view class="btn-primary" :class="{ disabled: saving }" @click="savePoster()">
          <text class="btn-text">{{ saving ? '生成中…' : '保存图片到相册' }}</text>
        </view>
        <text class="action-hint">保存后打开微信朋友圈，选择图片发布</text>
        <view class="btn-close" @click="close()">
          <text class="btn-close-text">关闭</text>
        </view>
      </view>

      <canvas
        canvas-id="shareMomentsCanvas"
        id="shareMomentsCanvas"
        class="offscreen-canvas"
        :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
      />
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import {
  closeShareMoments,
  shareMomentsState,
  MINIPROGRAM_INTRO,
  MINIPROGRAM_NAME,
  MINIPROGRAM_SCAN_HINT,
  wxacodeLocalUrl,
} from '../utils/shareMoments';

const state = computed(() => shareMomentsState.value);
const qrSrc = wxacodeLocalUrl();
const saving = ref(false);

const canvasW = 750;
const canvasH = ref(1200);

const cardsGridClass = computed(() => {
  const n = state.value.cards?.length || 0;
  if (n <= 1) return 'cards-grid--1';
  if (n === 2) return 'cards-grid--2';
  if (n === 3) return 'cards-grid--3';
  return 'cards-grid--4';
});

const showAssessScore = computed(() => {
  const a = state.value.assessment;
  if (!a) return false;
  const s = a.score;
  return s !== '' && s != null && Number(s) !== 0;
});

const assessDescShort = computed(() => {
  const d = state.value.assessment?.typeDesc || '';
  if (!d) return '';
  const one = String(d).replace(/\s+/g, ' ').trim();
  return one.length > 72 ? `${one.slice(0, 72)}…` : one;
});

watch(() => state.value.visible, (v) => {
  if (v) canvasH.value = estimateCanvasH();
});

function close() {
  closeShareMoments();
}

function estimateCanvasH() {
  let h = 220; // hero
  const kind = state.value.kind;
  if (kind === 'ohcard') {
    const n = state.value.cards?.length || 0;
    if (n <= 1) h += 420;
    else if (n === 2) h += 360;
    else if (n === 3) h += 340;
    else h += 520;
  } else if (kind === 'assessment') {
    h += 280;
  }
  h += 360; // qr block
  return Math.max(1000, Math.min(h, 1600));
}

function wrapText(ctx, text, maxWidth) {
  const chars = String(text || '').split('');
  const lines = [];
  let line = '';
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('empty src'));
      return;
    }
    // #ifdef H5
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
    // #endif
    // #ifndef H5
    uni.getImageInfo({
      src,
      success: (res) => resolve(res.path || res.tempFilePath || src),
      fail: reject,
    });
    // #endif
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  // H5 可读 naturalWidth；小程序 path 读不到时退化为 0 并直接铺满
  const iw = (img && (img.naturalWidth || img.width)) || 0;
  const ih = (img && (img.naturalHeight || img.height)) || 0;
  if (!iw || !ih) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

async function savePoster() {
  if (saving.value) return;
  saving.value = true;
  try {
    const H = estimateCanvasH();
    canvasH.value = H;
    await new Promise((r) => setTimeout(r, 50));

    const ctx = uni.createCanvasContext('shareMomentsCanvas');
    const W = canvasW;
    const pad = 48;
    const innerW = W - pad * 2;

    // 背景
    ctx.setFillStyle('#F5F7F6');
    ctx.fillRect(0, 0, W, H);

    // Hero 渐变（用矩形近似）
    ctx.setFillStyle('#4A8A7A');
    ctx.fillRect(0, 0, W, 210);
    ctx.setFillStyle('#3A6E80');
    ctx.fillRect(0, 150, W, 60);

    ctx.setFillStyle('rgba(255,255,255,0.88)');
    ctx.setFontSize(22);
    ctx.fillText(MINIPROGRAM_NAME, pad, 52);

    ctx.setFillStyle('#FFFFFF');
    ctx.setFontSize(30);
    let y = 96;
    for (const line of wrapText(ctx, state.value.title, innerW).slice(0, 3)) {
      ctx.fillText(line, pad, y);
      y += 40;
    }

    if (state.value.subtitle) {
      ctx.setFontSize(20);
      ctx.setFillStyle('rgba(255,255,255,0.78)');
      y += 4;
      for (const line of wrapText(ctx, state.value.subtitle, innerW).slice(0, 2)) {
        ctx.fillText(line, pad, y);
        y += 28;
      }
    }

    y = 240;

    if (state.value.kind === 'ohcard' && state.value.cards.length) {
      y = await drawCards(ctx, state.value.cards, pad, y, innerW);
    } else if (state.value.kind === 'assessment' && state.value.assessment) {
      y = drawAssessment(ctx, state.value.assessment, pad, y, innerW);
    }

    y += 20;
    ctx.setStrokeStyle('#E4EDEA');
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    y += 36;

    ctx.setFillStyle('#1C2A27');
    ctx.setFontSize(24);
    ctx.setTextAlign('center');
    ctx.fillText(`${MINIPROGRAM_NAME}小程序`, W / 2, y);
    y += 32;

    ctx.setFillStyle('#4A8A7A');
    ctx.setFontSize(18);
    for (const line of wrapText(ctx, MINIPROGRAM_INTRO, innerW)) {
      ctx.fillText(line, W / 2, y);
      y += 26;
    }

    y += 6;
    ctx.setFillStyle('#9BBCB4');
    ctx.setFontSize(16);
    ctx.fillText(MINIPROGRAM_SCAN_HINT, W / 2, y);
    y += 24;

    const qrSize = 200;
    const qrX = (W - qrSize) / 2;
    const qrY = y;
    try {
      const qrPath = await loadImage(qrSrc);
      ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize);
    } catch (e) {
      // ignore qr fail
    }
    ctx.setTextAlign('left');

    await new Promise((resolve) => ctx.draw(false, resolve));

    await new Promise((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId: 'shareMomentsCanvas',
        width: W,
        height: H,
        destWidth: W * 2,
        destHeight: H * 2,
        fileType: 'jpg',
        quality: 0.92,
        success: resolve,
        fail: reject,
      });
    }).then(async (res) => {
      // #ifdef H5
      const link = document.createElement('a');
      link.href = res.tempFilePath;
      link.download = 'zhuojian-share.jpg';
      link.click();
      uni.showToast({ title: '图片已下载', icon: 'none' });
      // #endif
      // #ifndef H5
      await new Promise((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: resolve,
          fail: reject,
        });
      });
      uni.showToast({ title: '已保存到相册', icon: 'success' });
      // #endif
    });
  } catch (e) {
    console.error('[shareMoments]', e);
    uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

function drawAssessment(ctx, a, pad, startY, innerW) {
  let y = startY;
  const W = canvasW;
  ctx.setFillStyle('#FFFFFF');
  roundRect(ctx, pad, y, innerW, 240, 20);
  ctx.fill();

  const cx = W / 2;
  y += 40;
  ctx.setTextAlign('center');
  if (a.scaleName) {
    ctx.setFillStyle('#617870');
    ctx.setFontSize(20);
    ctx.fillText(a.scaleName, cx, y);
    y += 36;
  }
  if (showAssessScore.value) {
    ctx.setFillStyle('#4A8A7A');
    ctx.setFontSize(64);
    ctx.fillText(String(a.score), cx, y + 20);
    y += 70;
  }
  if (a.level) {
    ctx.setFillStyle('#1C2A27');
    ctx.setFontSize(28);
    ctx.fillText(String(a.level), cx, y);
    y += 36;
  }
  if (a.typeName) {
    ctx.setFillStyle('#4A8A7A');
    ctx.setFontSize(20);
    ctx.fillText(String(a.typeName), cx, y);
    y += 30;
  }
  if (assessDescShort.value) {
    ctx.setFillStyle('#617870');
    ctx.setFontSize(18);
    for (const line of wrapText(ctx, assessDescShort.value, innerW - 48).slice(0, 2)) {
      ctx.fillText(line, cx, y);
      y += 26;
    }
  }
  if (a.date) {
    ctx.setFillStyle('#9BBCB4');
    ctx.setFontSize(16);
    ctx.fillText(String(a.date), cx, y + 8);
  }
  ctx.setTextAlign('left');
  return startY + 260;
}

async function drawCards(ctx, cards, pad, startY, innerW) {
  const n = cards.length;
  let cols = 2;
  let cardW = (innerW - 20) / 2;
  let cardH = cardW * 1.35;
  if (n === 1) {
    cols = 1;
    cardW = Math.min(280, innerW * 0.55);
    cardH = cardW * 1.4;
  } else if (n === 3) {
    cols = 3;
    cardW = (innerW - 32) / 3;
    cardH = cardW * 1.35;
  } else if (n >= 4) {
    cols = 2;
    cardW = (innerW - 20) / 2;
    cardH = cardW * 1.3;
  }

  const gapX = n === 3 ? 16 : 20;
  const gapY = 28;
  const rows = Math.ceil(n / cols);
  const totalW = cols * cardW + (cols - 1) * gapX;
  const originX = pad + (innerW - totalW) / 2;

  for (let i = 0; i < n; i++) {
    const c = cards[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = originX + col * (cardW + gapX);
    let y = startY + row * (cardH + gapY + 28);

    if (c.label) {
      ctx.setFillStyle('#9BBCB4');
      ctx.setFontSize(16);
      ctx.setTextAlign('center');
      ctx.fillText(c.label, x + cardW / 2, y);
      ctx.setTextAlign('left');
      y += 22;
    }

    // 白底圆角卡
    ctx.setFillStyle('#FFFFFF');
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();

    if (c.imageUrl) {
      try {
        const img = await loadImage(c.imageUrl);
        // #ifdef H5
        drawCoverImage(ctx, img, x + 6, y + 6, cardW - 12, cardH - 12);
        // #endif
        // #ifndef H5
        ctx.drawImage(img, x + 6, y + 6, cardW - 12, cardH - 12);
        // #endif
      } catch (e) {
        drawWordFace(ctx, x, y, cardW, cardH, c.word || '图卡');
      }
    } else {
      drawWordFace(ctx, x, y, cardW, cardH, c.word || '图卡');
    }
  }

  return startY + rows * (cardH + gapY + 28) + 16;
}

function drawWordFace(ctx, x, y, w, h, word) {
  ctx.setFillStyle('#1E3A34');
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 10);
  ctx.fill();
  ctx.setStrokeStyle('#C8A84B');
  ctx.setLineWidth(2);
  roundRect(ctx, x + 18, y + 18, w - 36, h - 36, 8);
  ctx.stroke();
  ctx.setFillStyle('#FFFFFF');
  ctx.setFontSize(Math.min(36, Math.floor(w / 4)));
  ctx.setTextAlign('center');
  ctx.fillText(String(word || '').slice(0, 6), x + w / 2, y + h / 2 + 12);
  ctx.setTextAlign('left');
}
</script>

<style scoped lang="scss">
.overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx 28rpx;
  box-sizing: border-box;
}

.modal {
  width: 100%;
  max-width: 680rpx;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
}

.poster-scroll {
  max-height: 68vh;
  border-radius: 28rpx;
}

.poster {
  background: #F5F7F6;
  border-radius: 28rpx;
  overflow: hidden;
  box-shadow: 0 16rpx 48rpx rgba(28, 42, 39, 0.14);
}

.poster-hero {
  position: relative;
  padding: 40rpx 36rpx 36rpx;
  background: linear-gradient(145deg, #4A8A7A 0%, #3A6E80 100%);
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -80rpx;
  right: -60rpx;
  width: 280rpx;
  height: 240rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.16) 0%, transparent 68%);
  pointer-events: none;
}

.poster-brand {
  position: relative;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
  letter-spacing: 0.08em;
}

.poster-title {
  position: relative;
  display: block;
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  line-height: 1.4;
}

.poster-sub {
  position: relative;
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.55;
}

.cards-block {
  padding: 28rpx 24rpx 8rpx;
}

.cards-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20rpx;
}

.cards-grid--1 .share-card {
  width: 52%;
}

.cards-grid--2 .share-card {
  width: calc(50% - 12rpx);
}

.cards-grid--3 .share-card {
  width: calc(33.33% - 14rpx);
}

.cards-grid--4 .share-card {
  width: calc(50% - 12rpx);
}

.share-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.share-card-label {
  font-size: 20rpx;
  color: #9BBCB4;
  margin-bottom: 10rpx;
}

.share-card-face {
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 16rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 8rpx 24rpx rgba(28, 42, 39, 0.12);
}

.share-card-face--word {
  background: linear-gradient(160deg, #1E3A34, #2C5249);
}

.share-card-img {
  width: 100%;
  height: 100%;
}

.share-card-word-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(200, 168, 75, 0.7);
  box-sizing: border-box;
  margin: 0;
}

.share-card-word {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.12em;
  font-family: "Noto Serif SC", serif;
}

.share-card-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8EFED;
}

.share-card-empty-txt {
  color: #9BBCB4;
  font-size: 24rpx;
}

.assess-block {
  margin: 28rpx 28rpx 8rpx;
  padding: 36rpx 28rpx;
  background: #fff;
  border-radius: 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 18rpx rgba(28, 42, 39, 0.04);
}

.assess-scale {
  display: block;
  font-size: 24rpx;
  color: #617870;
  letter-spacing: 0.04em;
}

.assess-score {
  display: block;
  margin-top: 12rpx;
  font-size: 88rpx;
  font-weight: 700;
  color: #4A8A7A;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.assess-level {
  display: inline-block;
  margin-top: 16rpx;
  padding: 8rpx 28rpx;
  border-radius: 28rpx;
  background: rgba(74, 138, 122, 0.12);
}

.assess-level-txt {
  font-size: 28rpx;
  font-weight: 700;
  color: #1C2A27;
}

.assess-type {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #4A8A7A;
}

.assess-desc {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #617870;
  line-height: 1.6;
  text-align: left;
}

.assess-date {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #9BBCB4;
}

.poster-divider {
  height: 1rpx;
  background: #E4EDEA;
  margin: 24rpx 36rpx;
}

.promo-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10rpx;
  padding: 0 28rpx 36rpx;
}

.promo-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #1C2A27;
}

.promo-intro {
  font-size: 24rpx;
  color: #4A8A7A;
  line-height: 1.5;
}

.promo-hint {
  font-size: 22rpx;
  color: #9BBCB4;
  margin-top: 4rpx;
}

.promo-qr {
  width: 260rpx;
  height: 260rpx;
  margin-top: 12rpx;
}

.actions {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  flex-shrink: 0;
}

.btn-primary {
  width: 100%;
  background: #4A8A7A;
  border-radius: 48rpx;
  padding: 24rpx 0;
  text-align: center;

  &.disabled {
    opacity: 0.6;
  }
}

.btn-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

.action-hint {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
}

.btn-close {
  padding: 12rpx 24rpx;
}

.btn-close-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 26rpx;
}

.offscreen-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  pointer-events: none;
}
</style>
