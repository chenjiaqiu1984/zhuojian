<template>
  <view v-if="state.visible" class="overlay" @click="close()">
    <view class="modal" @click.stop>
      <view class="poster" id="sharePoster">
        <view class="poster-head">
          <text class="poster-brand">{{ MINIPROGRAM_NAME }}</text>
          <text class="poster-title">{{ state.title }}</text>
          <text v-if="state.subtitle" class="poster-sub">{{ state.subtitle }}</text>
        </view>

        <view class="poster-divider" />

        <view class="promo-block">
          <text class="promo-name">{{ MINIPROGRAM_NAME }}小程序</text>
          <text class="promo-intro">{{ MINIPROGRAM_INTRO }}</text>
          <text class="promo-hint">{{ MINIPROGRAM_SCAN_HINT }}</text>
          <image class="promo-qr" :src="qrSrc" mode="aspectFit" show-menu-by-longpress />
        </view>
      </view>

      <view class="actions">
        <view class="btn-primary" :class="{ disabled: saving }" @click="savePoster()">
          <text class="btn-text">{{ saving ? '生成中…' : '保存图片到相册' }}</text>
        </view>
        <text class="action-hint">保存后打开微信朋友圈，选择图片发布</text>
        <view class="btn-close" @click="close()">
          <text class="btn-close-text">关闭</text>
        </view>
      </view>

      <!-- 离屏 canvas，用于导出海报 -->
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
import { computed, ref } from 'vue';
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

const canvasW = 600;
const canvasH = 900;

function close() {
  closeShareMoments();
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

async function savePoster() {
  if (saving.value) return;
  saving.value = true;
  try {
    const ctx = uni.createCanvasContext('shareMomentsCanvas');
    const pad = 40;
    const innerW = canvasW - pad * 2;

    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.setFillStyle('#1C2A27');
    ctx.setFontSize(22);
    ctx.fillText(MINIPROGRAM_NAME, pad, 56);

    ctx.setFontSize(30);
    ctx.setFillStyle('#1C2A27');
    let y = 110;
    for (const line of wrapText(ctx, state.value.title, innerW)) {
      ctx.fillText(line, pad, y);
      y += 42;
    }

    if (state.value.subtitle) {
      ctx.setFontSize(22);
      ctx.setFillStyle('#617870');
      y += 8;
      for (const line of wrapText(ctx, state.value.subtitle, innerW)) {
        ctx.fillText(line, pad, y);
        y += 34;
      }
    }

    y += 24;
    ctx.setStrokeStyle('#E4EDEA');
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(canvasW - pad, y);
    ctx.stroke();
    y += 36;

    ctx.setFillStyle('#1C2A27');
    ctx.setFontSize(24);
    ctx.fillText(`${MINIPROGRAM_NAME}小程序`, pad, y);
    y += 36;

    ctx.setFillStyle('#4A8A7A');
    ctx.setFontSize(20);
    for (const line of wrapText(ctx, MINIPROGRAM_INTRO, innerW)) {
      ctx.fillText(line, pad, y);
      y += 30;
    }

    y += 8;
    ctx.setFillStyle('#9BBCB4');
    ctx.setFontSize(18);
    ctx.fillText(MINIPROGRAM_SCAN_HINT, pad, y);
    y += 28;

    const qrSize = 220;
    const qrX = (canvasW - qrSize) / 2;
    const qrY = y + 10;
    const qrPath = await loadImage(qrSrc);

    // #ifdef H5
    ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize);
    // #endif
    // #ifndef H5
    ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize);
    // #endif

    await new Promise((resolve) => ctx.draw(false, resolve));

    await new Promise((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId: 'shareMomentsCanvas',
        width: canvasW,
        height: canvasH,
        destWidth: canvasW * 2,
        destHeight: canvasH * 2,
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
    uni.showToast({ title: '保存失败，请长按小程序码保存', icon: 'none' });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped lang="scss">
.overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
}

.modal {
  width: 100%;
  max-width: 640rpx;
}

.poster {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 36rpx 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(28, 42, 39, 0.12);
}

.poster-head {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.poster-brand {
  font-size: 24rpx;
  color: #4A8A7A;
  font-weight: 600;
}

.poster-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1C2A27;
  line-height: 1.45;
}

.poster-sub {
  font-size: 26rpx;
  color: #617870;
  line-height: 1.6;
}

.poster-divider {
  height: 1rpx;
  background: #E4EDEA;
  margin: 28rpx 0;
}

.promo-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10rpx;
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
  width: 280rpx;
  height: 280rpx;
  margin-top: 16rpx;
}

.actions {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
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
