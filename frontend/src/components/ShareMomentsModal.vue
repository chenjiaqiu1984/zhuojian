<template>
  <view v-if="state.visible" class="overlay" @click="close()">
    <view class="modal" @click.stop>
      <scroll-view scroll-y class="poster-scroll" :show-scrollbar="false">
        <!-- 预览海报 -->
        <view class="poster" :class="[`poster--${state.kind}`, { 'poster--daily': state.kind === 'daily' }]">
          <!-- 每日：心镜岛全幅底图 -->
          <image
            v-if="state.kind === 'daily'"
            class="daily-full-bg"
            :src="islandBgSrc"
            mode="aspectFill"
          />

          <!-- 每日：顶部文案 + 小程序码 -->
          <view v-if="state.kind === 'daily'" class="poster-hero poster-hero--daily">
            <view class="daily-hero-dim" />
            <view class="daily-hero-body">
              <view class="daily-hero-copy">
                <text class="poster-brand">{{ MINIPROGRAM_NAME }}</text>
                <text class="poster-title">{{ state.title }}</text>
                <text class="daily-hero-date">{{ state.daily?.date || state.subtitle }}</text>
              </view>
              <view class="daily-hero-qr-wrap">
                <image
                  class="promo-qr promo-qr--daily"
                  :src="qrPreviewSrc"
                  mode="aspectFit"
                  :style="{ width: '72rpx', height: '72rpx' }"
                  show-menu-by-longpress
                />
                <text class="daily-hero-qr-hint">扫码</text>
              </view>
            </view>
          </view>

          <view v-else class="poster-hero">
            <view class="hero-glow" />
            <text class="poster-brand">{{ MINIPROGRAM_NAME }}</text>
            <text class="poster-title">{{ state.title }}</text>
            <text v-if="state.subtitle" class="poster-sub">{{ state.subtitle }}</text>
          </view>

          <!-- 每日主内容：抽到的图卡 -->
          <view v-if="state.kind === 'daily' && state.cards.length" class="cards-block cards-block--daily">
            <view class="daily-card-full">
              <image
                v-if="state.cards[0].imageUrl"
                class="daily-card-full-img"
                :src="state.cards[0].imageUrl"
                mode="aspectFit"
              />
              <view v-else class="share-card-face share-card-face--daily share-card-face--daily-fallback">
                <view v-if="state.cards[0].word" class="share-card-word-wrap">
                  <text class="share-card-word">{{ state.cards[0].word }}</text>
                </view>
                <view v-else class="share-card-empty">
                  <text class="share-card-empty-txt">图卡</text>
                </view>
              </view>
            </view>
            <view v-if="state.daily?.word || state.cards[0]?.word" class="daily-word-wrap">
              <text class="daily-word">{{ state.daily?.word || state.cards[0]?.word }}</text>
            </view>
            <view v-if="dailyGuideText || dailyQuestionText" class="daily-prompts">
              <text v-if="dailyGuideText" class="daily-guide">{{ dailyGuideText }}</text>
              <text v-if="dailyQuestionText" class="daily-prompt-item">{{ dailyQuestionText }}</text>
            </view>
          </view>

          <!-- 普通抽卡卡面 -->
          <view v-else-if="state.kind === 'ohcard' && state.cards.length" class="cards-block">
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

          <template v-if="state.kind !== 'daily'">
            <view class="poster-divider" />
            <view class="promo-block">
              <text class="promo-name">{{ MINIPROGRAM_NAME }}小程序</text>
              <text class="promo-intro">{{ MINIPROGRAM_INTRO }}</text>
              <text class="promo-hint">{{ MINIPROGRAM_SCAN_HINT }}</text>
              <image class="promo-qr" :src="qrSrc" mode="aspectFit" show-menu-by-longpress />
            </view>
          </template>
          <view v-else class="daily-footer">
            <text class="daily-footer-txt">卓见心理 · 每日心境</text>
          </view>
        </view>
      </scroll-view>

      <view class="actions">
        <view class="btn-primary" :class="{ disabled: saving }" @click="savePoster()">
          <text class="btn-text">{{ primaryBtnLabel }}</text>
        </view>
        <text class="action-hint">{{ actionHint }}</text>
        <view class="btn-close" @click="close()">
          <text class="btn-close-text">关闭</text>
        </view>
      </view>

      <!-- 勿完全移出视口：部分基础库离屏 canvas 导出回调永不触发。
           外层 0 尺寸 + overflow:hidden，避免 750px 宽 canvas 撑开页面（背景页被放大） -->
      <view class="offscreen-canvas-wrap">
        <canvas
          :canvas-id="canvasId"
          :id="canvasId"
          class="offscreen-canvas"
          :style="{ width: canvasW + 'px', height: canvasH + 'px' }"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, ref, watch } from 'vue';
import {
  closeShareMoments,
  shareMomentsState,
  absMediaUrl,
  MINIPROGRAM_INTRO,
  MINIPROGRAM_NAME,
  MINIPROGRAM_SCAN_HINT,
  wxacodeLocalUrl,
} from '../utils/shareMoments';
import { getMoodGuide, getMoodQuestion } from '../utils/moodCardCopy';

const state = computed(() => shareMomentsState.value);
/** 预览用包内路径；canvas 导出优先走远程绝对地址（小程序 getImageInfo 更稳） */
const qrSrc = wxacodeLocalUrl();
const qrCanvasSrc = absMediaUrl('/static/wxacode.jpg');
const qrPreviewSrc = computed(() => qrCanvasSrc || qrSrc);
const islandBgSrc = absMediaUrl('/static/island/island-mist.jpg');
const dailyHeroSrc = absMediaUrl('/static/island/hero-daily.jpg');
/** 每日海报：引导语 + 一条问题 */
const dailyGuideText = computed(() => {
  const card = state.value.cards?.[0] || {};
  const fromDaily = state.value.daily?.guide || '';
  const fromCard = card.description || card.guide || '';
  return fromDaily || fromCard || getMoodGuide(card.word || state.value.daily?.word || '');
});

const dailyQuestionText = computed(() => {
  const card = state.value.cards?.[0] || {};
  const fromDaily = state.value.daily?.question || '';
  const fromCard = card.question || '';
  return fromDaily || fromCard || getMoodQuestion(card.word || state.value.daily?.word || '');
});

const saving = ref(false);
// 多处挂载时避免 canvas-id 冲突（App.vue + 页面各一份）
const canvasId = `shareMomentsCanvas_${Math.random().toString(36).slice(2, 9)}`;
// 组件内 canvas 必须带实例，否则小程序 createCanvasContext / 导出会卡住
const canvasOwner = getCurrentInstance()?.proxy;

const canvasW = 750;
const canvasH = ref(1334);

/** 每日海报：手机常见竖屏比例 9:16 */
const DAILY_HERO_H = 148;
const DAILY_QR_SIZE = 72;
const DAILY_POSTER_H = Math.round(canvasW * 16 / 9); // 750×1334 ≈ 9:16

const primaryBtnLabel = computed(() => {
  if (saving.value) return '生成中…';
  // #ifdef MP-WEIXIN
  return '分享到朋友圈';
  // #endif
  // #ifndef MP-WEIXIN
  return '保存图片到相册';
  // #endif
});

const actionHint = computed(() => {
  // #ifdef MP-WEIXIN
  return '生成海报后可直接发朋友圈，或发给好友';
  // #endif
  // #ifndef MP-WEIXIN
  return '保存后打开微信朋友圈，选择图片发布';
  // #endif
});

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label || 'timeout'} ${ms}ms`)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

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
  if (kind === 'daily') {
    // 固定 9:16 手机竖屏比例
    return DAILY_POSTER_H;
  } else if (kind === 'ohcard') {
    const n = state.value.cards?.length || 0;
    if (n <= 1) h += 420;
    else if (n === 2) h += 360;
    else if (n === 3) h += 340;
    else h += 520;
  } else if (kind === 'assessment') {
    h += 280;
  }
  h += 360; // qr block
  return Math.max(1000, Math.min(h, 2200));
}

/** 粗估每日引导语/问题区块高度（无需真实 canvas） */
function estimateDailyGuideBlockH(guide, question, innerW) {
  const guideText = String(guide || '').trim();
  const questionText = String(question || '').trim();
  if (!guideText && !questionText) return 0;
  const boxPad = 24;
  const maxW = Math.max(80, innerW - boxPad * 2);
  const linesOf = (text, fontSize) => {
    const charsPerLine = Math.max(1, Math.floor(maxW / fontSize));
    return Math.max(1, Math.ceil(String(text).length / charsPerLine));
  };
  let contentH = 28;
  if (guideText) contentH += linesOf(guideText, 17) * 28 + 12;
  if (questionText) contentH += 18 + linesOf(questionText, 16) * 26;
  contentH += 12;
  return 10 + contentH + 8;
}

/**
 * 每日海报固定为 9:16（手机常见竖屏比）。
 * 卡面宽度约 90%，按原图比例完整显示（不裁切）；过高则等比缩小。
 */
async function resolveDailyPosterLayout() {
  const W = canvasW;
  const H = DAILY_POSTER_H;
  const pad = 48;
  const innerW = W - pad * 2;
  const heroH = DAILY_HERO_H;
  const card = state.value.cards?.[0] || null;
  const word = state.value.daily?.word || card?.word || '';

  let cardImg = null;
  let aspect = 1.42; // 默认竖卡比
  if (card?.imageUrl) {
    try {
      cardImg = await loadImage(card.imageUrl);
      const iw = cardImg.naturalWidth || cardImg.width || 0;
      const ih = cardImg.naturalHeight || cardImg.height || 0;
      if (iw && ih) aspect = ih / iw;
    } catch (e) {
      cardImg = null;
    }
  }

  const topGap = 20;
  const wordBlock = word ? 110 : 28;
  const guideBlock = estimateDailyGuideBlockH(
    dailyGuideText.value,
    dailyQuestionText.value,
    innerW,
  );
  const footerH = 44;
  const fixed = heroH + topGap + wordBlock + guideBlock + footerH;
  const maxCardH = Math.max(320, H - fixed);

  // 宽度 90%，高度按原图比例；放不下则等比缩小，保证整卡可见
  let cardW = Math.round(W * 0.9);
  let cardH = Math.round(cardW * aspect);
  if (cardH > maxCardH) {
    const scale = maxCardH / cardH;
    cardH = maxCardH;
    cardW = Math.round(cardW * scale);
  }
  const sidePad = Math.round((W - cardW) / 2);

  return {
    W,
    H,
    pad,
    innerW,
    heroH,
    sidePad,
    cardW,
    cardH,
    cardImg,
    cropCard: false,
    word,
    topGap,
  };
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
  return withTimeout(new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('empty src'));
      return;
    }
    // #ifdef H5
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`img fail: ${src}`));
    img.src = src;
    // #endif
    // #ifndef H5
    uni.getImageInfo({
      src,
      success: (res) => resolve({
        path: res.path || res.tempFilePath || src,
        width: res.width || 0,
        height: res.height || 0,
      }),
      fail: (err) => reject(err || new Error(`getImageInfo fail: ${src}`)),
    });
    // #endif
  }), 12000, 'loadImage');
}

/** 依次尝试多个地址，避免小程序码空白 */
async function loadImageCandidates(srcs) {
  const list = [...new Set((srcs || []).filter(Boolean))];
  let lastErr;
  for (const src of list) {
    try {
      return await loadImage(src);
    } catch (e) {
      lastErr = e;
      console.warn('[shareMoments] load fail', src, e);
    }
  }
  throw lastErr || new Error('all image candidates failed');
}

function drawCoverFill(ctx, img, x, y, w, h) {
  const src = typeof img === 'string' ? img : (img?.path || img);
  const iw = (img && (img.naturalWidth || img.width)) || 0;
  const ih = (img && (img.naturalHeight || img.height)) || 0;
  if (!iw || !ih) {
    ctx.drawImage(src, x, y, w, h);
    return;
  }
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawSrc(img) {
  if (!img) return img;
  if (typeof img === 'string') return img;
  return img.path || img;
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
  const src = drawSrc(img);
  const iw = (img && (img.naturalWidth || img.width)) || 0;
  const ih = (img && (img.naturalHeight || img.height)) || 0;
  if (!iw || !ih) {
    ctx.drawImage(src, x, y, w, h);
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
  ctx.drawImage(src, dx, dy, dw, dh);
  ctx.restore();
}

/** 完整显示图片（等比装入，不裁切） */
function drawContainImage(ctx, img, x, y, w, h) {
  const src = drawSrc(img);
  const iw = (img && (img.naturalWidth || img.width)) || 0;
  const ih = (img && (img.naturalHeight || img.height)) || 0;
  if (!iw || !ih) {
    ctx.drawImage(src, x, y, w, h);
    return;
  }
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  roundRect(ctx, x, y, w, h, 12);
  ctx.clip();
  ctx.drawImage(src, dx, dy, dw, dh);
  ctx.restore();
}

async function savePoster() {
  if (saving.value) return;
  saving.value = true;
  try {
    const isDaily = state.value.kind === 'daily';
    let dailyLayout = null;
    let H = estimateCanvasH();
    if (isDaily) {
      dailyLayout = await resolveDailyPosterLayout();
      H = dailyLayout.H;
    }
    canvasH.value = H;
    await new Promise((r) => setTimeout(r, 80));

    const ctx = uni.createCanvasContext(canvasId, canvasOwner);
    const W = canvasW;
    const pad = 48;
    const innerW = W - pad * 2;

    // 背景
    ctx.setFillStyle(isDaily ? '#E8F0EC' : '#F5F7F6');
    ctx.fillRect(0, 0, W, H);

    let y = 0;

    if (isDaily) {
      const layout = dailyLayout;
      // 底色 + 心镜岛图约 30%（铺满内容高度即可，不跟岛图原高）
      ctx.setFillStyle('#E8F0EC');
      ctx.fillRect(0, 0, W, H);
      try {
        const islandImg = await loadImageCandidates([islandBgSrc, dailyHeroSrc]);
        ctx.setGlobalAlpha(0.3);
        drawCoverFill(ctx, islandImg, 0, 0, W, H);
        ctx.setGlobalAlpha(1);
      } catch (e) {
        ctx.setGlobalAlpha(1);
        ctx.setFillStyle('#C5D8CE');
        ctx.fillRect(0, 0, W, H);
      }

      const qrSize = DAILY_QR_SIZE;
      const qrPad = 6;
      const qrHintH = 12;
      const heroH = layout.heroH;

      ctx.setFillStyle('rgba(28, 42, 39, 0.28)');
      ctx.fillRect(0, 0, W, heroH);

      const qrX = W - layout.pad - qrSize;
      const qrBlockH = qrSize + qrPad + qrHintH;
      // 略偏下，避免贴顶显得过高
      const qrY = Math.round((heroH - qrBlockH) / 2) + 8;

      ctx.setFillStyle('rgba(255,255,255,0.92)');
      ctx.setFontSize(18);
      ctx.setTextAlign('left');
      ctx.fillText(MINIPROGRAM_NAME, layout.pad, Math.round(heroH * 0.34));

      ctx.setFillStyle('#FFFFFF');
      ctx.setFontSize(28);
      ctx.fillText(state.value.title || '今日心境', layout.pad, Math.round(heroH * 0.58));

      const dateTxt = state.value.daily?.date || state.value.subtitle || '';
      if (dateTxt) {
        ctx.setFillStyle('rgba(255,255,255,0.82)');
        ctx.setFontSize(14);
        ctx.fillText(dateTxt, layout.pad, Math.round(heroH * 0.78));
      }

      ctx.setFillStyle('#FFFFFF');
      roundRect(ctx, qrX - qrPad / 2, qrY - qrPad / 2, qrSize + qrPad, qrSize + qrPad + qrHintH, 10);
      ctx.fill();
      try {
        const qrPath = await loadImageCandidates([qrCanvasSrc, qrSrc, '/static/wxacode.jpg']);
        ctx.drawImage(drawSrc(qrPath), qrX, qrY, qrSize, qrSize);
      } catch (e) {
        console.warn('[shareMoments] qr draw failed', e);
        ctx.setFillStyle('#1C2A27');
        ctx.setFontSize(12);
        ctx.setTextAlign('center');
        ctx.fillText('小程序码', qrX + qrSize / 2, qrY + qrSize / 2);
        ctx.setTextAlign('left');
      }
      ctx.setFillStyle('#6A7A72');
      ctx.setFontSize(12);
      ctx.setTextAlign('center');
      ctx.fillText('扫码', qrX + qrSize / 2, qrY + qrSize + 14);
      ctx.setTextAlign('left');

      y = heroH + layout.topGap;
      if (state.value.cards.length) {
        y = await drawDailyCard(ctx, state.value.cards[0], state.value.daily, {
          ...layout,
          startY: y,
        });
      }
      y = drawDailyGuideAndQuestion(
        ctx,
        dailyGuideText.value,
        dailyQuestionText.value,
        layout.pad,
        y + 8,
        layout.innerW,
      );
      y += 16;
      ctx.setFillStyle('#4A655A');
      ctx.setFontSize(15);
      ctx.setTextAlign('center');
      ctx.fillText('卓见心理 · 每日心境', W / 2, Math.min(y, H - 16));
      ctx.setTextAlign('left');
    } else {
      ctx.setFillStyle('#4A8A7A');
      ctx.fillRect(0, 0, W, 210);
      ctx.setFillStyle('#3A6E80');
      ctx.fillRect(0, 150, W, 60);

      ctx.setFillStyle('rgba(255,255,255,0.88)');
      ctx.setFontSize(22);
      ctx.fillText(MINIPROGRAM_NAME, pad, 52);

      ctx.setFillStyle('#FFFFFF');
      ctx.setFontSize(30);
      y = 96;
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
        const qrPath = await loadImageCandidates([qrCanvasSrc, qrSrc, '/static/wxacode.jpg']);
        ctx.drawImage(drawSrc(qrPath), qrX, qrY, qrSize, qrSize);
      } catch (e) {
        // ignore qr fail
      }
      ctx.setTextAlign('left');
    }

    // draw 回调在部分机型上不触发，加超时兜底
    await withTimeout(new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      ctx.draw(false, finish);
      setTimeout(finish, 800);
    }), 5000, 'canvas.draw');

    // 等一帧再导出，避免空白图
    await new Promise((r) => setTimeout(r, 120));

    const res = await withTimeout(new Promise((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId,
        width: W,
        height: H,
        destWidth: W,
        destHeight: H,
        fileType: 'jpg',
        quality: 0.92,
        success: resolve,
        fail: reject,
      }, canvasOwner);
    }), 15000, 'canvasToTempFilePath');

    // #ifdef H5
    const link = document.createElement('a');
    link.href = res.tempFilePath;
    link.download = 'zhuojian-share.jpg';
    link.click();
    uni.showToast({ title: '图片已下载', icon: 'none' });
    // #endif
    // #ifdef MP-WEIXIN
    await shareImageToMoments(res.tempFilePath);
    // #endif
    // #ifdef APP-PLUS
    const ok = await ensureAlbumPermission();
    if (!ok) {
      uni.showToast({ title: '请先允许保存到相册', icon: 'none' });
      return;
    }
    await saveToAlbum(res.tempFilePath);
    uni.showToast({ title: '已保存到相册', icon: 'success' });
    // #endif
  } catch (e) {
    console.error('[shareMoments]', e);
    const msg = String(e?.errMsg || e?.message || e || '');
    if (/auth|authorize|permission|deny|拒绝|No Permission|无.*权限/i.test(msg)) {
      uni.showToast({ title: '请允许访问相册后再试', icon: 'none' });
    } else if (/cancel|取消/i.test(msg)) {
      // 用户关闭分享面板，不算失败
    } else {
      uni.showToast({ title: '生成失败，请重试', icon: 'none' });
    }
  } finally {
    saving.value = false;
  }
}

/** 申请相册写入权限（小程序 / App） */
function ensureAlbumPermission() {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    uni.getSetting({
      success: (res) => {
        const authed = res.authSetting && res.authSetting['scope.writePhotosAlbum'];
        if (authed) {
          resolve(true);
          return;
        }
        if (authed === false) {
          uni.showModal({
            title: '需要相册权限',
            content: '保存或分享图片需要相册权限，请在设置中开启',
            confirmText: '去设置',
            success: (r) => {
              if (!r.confirm) {
                resolve(false);
                return;
              }
              uni.openSetting({
                success: (s) => resolve(!!(s.authSetting && s.authSetting['scope.writePhotosAlbum'])),
                fail: () => resolve(false),
              });
            },
          });
          return;
        }
        uni.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => resolve(true),
          fail: () => {
            uni.showModal({
              title: '需要相册权限',
              content: '保存或分享图片需要相册权限，请在设置中开启',
              confirmText: '去设置',
              success: (r) => {
                if (!r.confirm) {
                  resolve(false);
                  return;
                }
                uni.openSetting({
                  success: (s) => resolve(!!(s.authSetting && s.authSetting['scope.writePhotosAlbum'])),
                  fail: () => resolve(false),
                });
              },
            });
          },
        });
      },
      fail: () => resolve(false),
    });
    // #endif
    // #ifdef APP-PLUS
    const sys = uni.getSystemInfoSync();
    if (sys.platform !== 'android') {
      resolve(true);
      return;
    }
    try {
      plus.android.requestPermissions(
        [
          'android.permission.WRITE_EXTERNAL_STORAGE',
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.READ_MEDIA_IMAGES',
        ],
        (e) => {
          const granted = e.granted || [];
          const ok = granted.includes('android.permission.WRITE_EXTERNAL_STORAGE')
            || granted.includes('android.permission.READ_MEDIA_IMAGES')
            || (granted.length > 0 && !(e.deniedAlways || []).length);
          if (ok) {
            resolve(true);
            return;
          }
          uni.showModal({
            title: '需要相册权限',
            content: '请在系统设置中允许「卓见心理」写入相册 / 照片权限',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) {
                try {
                  const Intent = plus.android.importClass('android.content.Intent');
                  const Settings = plus.android.importClass('android.provider.Settings');
                  const Uri = plus.android.importClass('android.net.Uri');
                  const main = plus.android.runtimeMainActivity();
                  const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                  intent.setData(Uri.parse('package:' + main.getPackageName()));
                  main.startActivity(intent);
                } catch (err) {
                  console.warn('[shareMoments] open app settings fail', err);
                }
              }
              resolve(false);
            },
          });
        },
        () => resolve(false),
      );
    } catch (err) {
      console.warn('[shareMoments] requestPermissions fail', err);
      resolve(true);
    }
    // #endif
    // #ifdef H5
    resolve(true);
    // #endif
  });
}

/** 微信小程序：生成海报后直接弹出「发朋友圈 / 发给朋友」 */
async function shareImageToMoments(filePath) {
  // 面板里「保存图片」也需要相册权限，先申请
  await ensureAlbumPermission();

  return new Promise((resolve, reject) => {
    const entrancePath = state.value.kind === 'daily'
      ? '/pages/ohcard/daily'
      : state.value.kind === 'assessment'
        ? '/pages/assessment/index'
        : '/pages/index/index';
    const api = (typeof wx !== 'undefined' && wx.showShareImageMenu)
      ? wx.showShareImageMenu
      : uni.showShareImageMenu;
    if (typeof api !== 'function') {
      ensureAlbumPermission().then((ok) => {
        if (!ok) {
          reject(new Error('no album permission'));
          return;
        }
        saveToAlbum(filePath).then(() => {
          uni.showToast({ title: '已保存到相册', icon: 'success' });
          resolve();
        }).catch(reject);
      });
      return;
    }
    api({
      path: filePath,
      needShowEntrance: true,
      entrancePath,
      success: () => resolve(),
      fail: (err) => {
        const msg = String(err?.errMsg || '');
        if (/cancel|取消/i.test(msg)) {
          resolve();
          return;
        }
        ensureAlbumPermission().then((ok) => {
          if (!ok) {
            reject(err || new Error('no album permission'));
            return;
          }
          saveToAlbum(filePath).then(() => {
            uni.showToast({ title: '已保存到相册，可发朋友圈', icon: 'none' });
            resolve();
          }).catch(reject);
        });
      },
    });
  });
}

function saveToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath,
      success: resolve,
      fail: (err) => {
        const msg = String(err?.errMsg || err?.message || '');
        if (/auth|authorize|deny|拒绝|No Permission|无.*权限/i.test(msg)) {
          uni.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存图片到相册后再试',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) {
                // #ifdef APP-PLUS
                try {
                  const Intent = plus.android.importClass('android.content.Intent');
                  const Settings = plus.android.importClass('android.provider.Settings');
                  const Uri = plus.android.importClass('android.net.Uri');
                  const main = plus.android.runtimeMainActivity();
                  const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                  intent.setData(Uri.parse('package:' + main.getPackageName()));
                  main.startActivity(intent);
                } catch (e) {
                  uni.openSetting({});
                }
                // #endif
                // #ifndef APP-PLUS
                uni.openSetting({});
                // #endif
              }
            },
          });
        }
        reject(err);
      },
    });
  });
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

async function drawDailyCard(ctx, card, daily, layout) {
  const W = canvasW;
  let y = layout.startY || 0;
  const word = layout.word || daily?.word || card?.word || '';
  const cardW = layout.cardW ?? Math.round(W * 0.9);
  const cardH = layout.cardH ?? Math.round(cardW * 1.42);
  const x = layout.sidePad != null ? layout.sidePad : Math.round((W - cardW) / 2);
  const imgSrc = layout.cardImg || null;

  ctx.setFillStyle('rgba(90, 70, 50, 0.1)');
  roundRect(ctx, x + 6, y + 10, cardW, cardH, 18);
  ctx.fill();

  ctx.setFillStyle('#FFFAF4');
  roundRect(ctx, x, y, cardW, cardH, 16);
  ctx.fill();

  if (imgSrc) {
    // 完整显示卡面，不裁切
    drawContainImage(ctx, imgSrc, x + 4, y + 4, cardW - 8, cardH - 8);
  } else {
    drawWordFace(ctx, x, y, cardW, cardH, word || '心境');
  }

  y += cardH + 48;
  ctx.setTextAlign('center');
  if (word) {
    ctx.setFillStyle('#1C2A27');
    ctx.setFontSize(40);
    ctx.fillText(String(word).slice(0, 8), W / 2, y);
    y += 42;
  }
  ctx.setTextAlign('left');
  return y + 12;
}

function drawDailyGuideAndQuestion(ctx, guide, question, pad, startY, innerW) {
  const guideText = String(guide || '').trim();
  const questionText = String(question || '').trim();
  if (!guideText && !questionText) return startY;

  let y = startY + 10;
  const W = canvasW;
  const boxPad = 24;
  const maxW = innerW - boxPad * 2;

  ctx.setFontSize(17);
  const guideLines = guideText ? wrapText(ctx, guideText, maxW) : [];
  ctx.setFontSize(16);
  const qLines = questionText ? wrapText(ctx, questionText, maxW) : [];

  let contentH = 28;
  if (guideLines.length) contentH += guideLines.length * 28 + 12;
  if (qLines.length) contentH += 18 + qLines.length * 26;
  contentH += 12;

  ctx.setFillStyle('rgba(255, 250, 244, 0.88)');
  roundRect(ctx, pad, y, innerW, contentH, 16);
  ctx.fill();
  ctx.setStrokeStyle('rgba(184, 156, 98, 0.35)');
  ctx.setLineWidth(1);
  roundRect(ctx, pad, y, innerW, contentH, 16);
  ctx.stroke();

  let ty = y + 34;
  ctx.setTextAlign('left');
  if (guideLines.length) {
    ctx.setFillStyle('#3A4A44');
    ctx.setFontSize(17);
    guideLines.forEach((line) => {
      ctx.fillText(line, pad + boxPad, ty);
      ty += 28;
    });
    ty += 10;
  }
  if (qLines.length) {
    // 分隔短线
    ctx.setStrokeStyle('rgba(184, 156, 98, 0.4)');
    ctx.beginPath();
    ctx.moveTo(pad + boxPad, ty - 4);
    ctx.lineTo(W - pad - boxPad, ty - 4);
    ctx.stroke();
    ty += 18;
    ctx.setFillStyle('#4A8A7A');
    ctx.setFontSize(16);
    qLines.forEach((line) => {
      ctx.fillText(line, pad + boxPad, ty);
      ty += 26;
    });
  }

  return y + contentH + 8;
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
        ctx.drawImage(drawSrc(img), x + 6, y + 6, cardW - 12, cardH - 12);
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
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
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

.poster-hero--daily {
  position: relative;
  min-height: 148rpx;
  height: 148rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  background: transparent;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.poster-hero--daily .poster-brand {
  font-size: 20rpx;
  margin: 0;
}

.poster-hero--daily .poster-title {
  margin-top: 6rpx;
  font-size: 34rpx;
  line-height: 1.25;
}

.daily-full-bg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
  opacity: 0.3;
}

.daily-hero-bg {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.daily-hero-dim {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(
    120deg,
    rgba(28, 42, 39, 0.28) 0%,
    rgba(58, 90, 78, 0.16) 55%,
    rgba(28, 42, 39, 0.22) 100%
  );
}

.daily-hero-body {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  width: 100%;
  min-height: 148rpx;
  height: 148rpx;
}

.daily-hero-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.daily-hero-date {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.06em;
  margin-top: 2rpx;
}

.daily-hero-qr-wrap {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rpx;
  padding: 6rpx;
  border-radius: 10rpx;
  background: #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.16);
}

.daily-hero-qr-hint {
  font-size: 14rpx;
  color: #6A7A72;
  letter-spacing: 0.02em;
}

.poster--daily {
  position: relative;
  background: #E8F0EC;
  overflow: hidden;
  /* 预览不锁 9:16：卡图 widthFix 会超高被裁切；导出仍由 canvas 固定 9:16 */
}

.poster--daily .poster-hero--daily,
.poster--daily .cards-block--daily,
.poster--daily .daily-footer {
  position: relative;
  z-index: 1;
}

.cards-block--daily {
  padding: 20rpx 0 4rpx;
}

.daily-card-full {
  width: 90%;
  max-height: 640rpx;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}

.daily-card-full-img {
  display: block;
  width: 100%;
  height: 640rpx;
  border-radius: 16rpx;
  box-shadow: 0 12rpx 32rpx rgba(74, 58, 42, 0.14);
}

.share-card-face--daily-fallback {
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 16rpx;
  overflow: hidden;
  background: #FFFAF4;
  box-shadow: 0 12rpx 32rpx rgba(74, 58, 42, 0.14);
}

.cards-block--daily .cards-grid--1 .share-card {
  width: 100%;
}

.share-card-face--daily {
  box-shadow: 0 18rpx 42rpx rgba(74, 58, 42, 0.16);
  border-radius: 22rpx;
  border: 4rpx solid rgba(184, 156, 98, 0.35);
  box-sizing: border-box;
  background: #FFFAF4;
}

.daily-word-wrap {
  margin-top: 40rpx;
  text-align: center;
  padding: 0 28rpx 4rpx;
}

.daily-word {
  display: block;
  font-size: 44rpx;
  font-weight: 600;
  color: #1C2A27;
  letter-spacing: 0.2em;
  font-family: "Noto Serif SC", serif;
}

.daily-prompts {
  margin: 28rpx 20rpx 8rpx;
  padding: 28rpx 28rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(255, 250, 244, 0.88);
  border: 1rpx solid rgba(184, 156, 98, 0.35);
  box-sizing: border-box;
}

.daily-guide {
  display: block;
  font-size: 26rpx;
  color: #3A4A44;
  line-height: 1.7;
  letter-spacing: 0.04em;
}

.daily-prompt-item {
  display: block;
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(184, 156, 98, 0.35);
  font-size: 26rpx;
  color: #4A8A7A;
  line-height: 1.65;
  font-weight: 500;
}

.daily-footer {
  padding: 18rpx 24rpx 32rpx;
  text-align: center;
}

.daily-footer-txt {
  font-size: 22rpx;
  color: #4A655A;
  letter-spacing: 0.12em;
}

.promo-qr--daily {
  /* 占位：真正尺寸在 .promo-qr 之后用更高优先级覆盖 */
  margin-top: 0;
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

/* 必须写在 .promo-qr 之后，否则会被 260rpx 覆盖 */
.daily-hero-qr-wrap .promo-qr,
.promo-qr.promo-qr--daily {
  width: 72rpx !important;
  height: 72rpx !important;
  margin-top: 0 !important;
  display: block;
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

.offscreen-canvas-wrap {
  position: fixed;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}

.offscreen-canvas {
  display: block;
  /* 尺寸由内联 style 控制，包裹层裁切占位，避免撑开页面 */
}
</style>
