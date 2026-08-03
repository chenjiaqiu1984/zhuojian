<template>
  <view class="page" :class="{ 'page--result': showResult }">
    <!-- 结果态：与分享到朋友圈海报布局一致 -->
    <template v-if="showResult">
      <view class="result-poster">
        <image class="result-bg" :src="islandBgSrc" mode="aspectFill" />

        <view class="poster-hero">
          <view class="hero-dim" />
          <view class="hero-body">
            <view class="hero-copy">
              <text class="poster-brand">{{ brandName }}</text>
              <text class="poster-title">今日心境</text>
              <text class="poster-date">{{ dateLabel }}</text>
            </view>
          </view>
        </view>

        <view class="cards-block">
          <view class="daily-card-full">
            <image
              v-if="card?.imageUrl"
              class="daily-card-full-img"
              :src="fullUrl(card.imageUrl)"
              mode="widthFix"
            />
            <view v-else class="card-fallback">
              <text class="card-fallback-txt">{{ card?.word || '暂无卡面' }}</text>
            </view>
          </view>

          <view v-if="card?.word" class="daily-word-wrap">
            <text class="daily-word">{{ card.word }}</text>
          </view>

          <view v-if="guideText || questionText" class="daily-prompts">
            <text v-if="guideText" class="daily-guide">{{ guideText }}</text>
            <text v-if="questionText" class="daily-prompt-item">{{ questionText }}</text>
          </view>
        </view>

        <view class="daily-footer">
          <text class="daily-footer-txt">卓见心理 · 每日心境</text>
        </view>
      </view>

      <view class="actions">
        <view class="btn btn-primary" @click="goIsland()">进入心镜岛</view>
        <view class="btn btn-ghost" @click="sharePoster()">分享到朋友圈</view>
        <text class="share-tip">也可点右上角 ··· 转发好友或发朋友圈</text>
      </view>
    </template>

    <!-- 抽卡仪式态 -->
    <template v-else>
      <IslandHero src="/static/island/hero-daily.jpg">
        <view class="hero-content">
          <text class="hero-eyebrow">峰顶云台 · {{ dateLabel }}</text>
          <text class="hero-title">每日心境</text>
          <text class="hero-sub">一张卡，安顿今天的心情</text>
        </view>
      </IslandHero>

      <view class="content">
        <view v-if="loading" class="status-box">
          <text class="status-txt">正在抵达云台…</text>
        </view>

        <view v-else-if="bootError" class="status-box">
          <text class="status-txt">{{ bootError }}</text>
          <view class="btn btn-ghost" @click="boot()">重试</view>
        </view>

        <template v-else>
          <view class="ritual">
            <text class="ritual-tip">{{ ritualTip }}</text>
          </view>

          <view class="stage">
            <view
              class="card"
              :style="{ transform: cardRotate, transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)' }"
              @click="onCardTap()"
            >
              <view v-if="!flipped" class="card-back">
                <image :src="cardBackUrl" mode="aspectFill" class="back-img" />
                <view class="back-veil">
                  <text class="back-hint">{{ card ? '点击翻转' : '点击抽取' }}</text>
                </view>
              </view>
              <view v-else class="card-front">
                <image v-if="card?.imageUrl" :src="fullUrl(card.imageUrl)" mode="aspectFill" class="card-img" />
                <view v-else class="card-empty">
                  <text class="card-empty-txt">暂无卡面</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="!drawn" class="actions">
            <view class="btn btn-primary" :class="{ disabled: drawing }" @click="drawToday()">
              {{ drawing ? '抽卡中…' : '抽取今日心境' }}
            </view>
          </view>
        </template>
      </view>
    </template>

    <!-- #ifndef H5 -->
    <ShareMomentsModal />
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
// #ifndef H5
import { buildTimelineShare } from '@/utils/mpShare';
import ShareMomentsModal from '../../components/ShareMomentsModal.vue';

defineOptions({
  onShareAppMessage() {
    const pages = getCurrentPages();
    const vm = pages[pages.length - 1]?.$vm;
    const word = vm?.card?.word;
    const title = word
      ? `我抽到了今日心境「${word}」，来卓见看看你的主卡`
      : '我抽到了今日心境卡，来卓见一起看看你的主卡';
    return { title, path: '/pages/ohcard/daily' };
  },
  onShareTimeline() {
    const pages = getCurrentPages();
    const vm = pages[pages.length - 1]?.$vm;
    const word = vm?.card?.word;
    const imageUrl = absMediaUrl(vm?.card?.imageUrl);
    const title = word
      ? `今日心境「${word}」— 卓见心理`
      : '卓见心理 · 每日心境 — 一张卡，安顿今天的心情';
    return buildTimelineShare(title, imageUrl ? { imageUrl } : {});
  },
});
// #endif
import IslandHero from '../../components/IslandHero.vue';
import { ohcardApi } from '../../api/index';
import { remoteUrl, ohcardBackUrl } from '../../config';
import { absMediaUrl, openDailyShare } from '../../utils/shareMoments';
import { MINIPROGRAM_NAME } from '../../utils/miniprogramPromo';
import { getMoodGuide, getMoodQuestion } from '../../utils/moodCardCopy';
import { track } from '../../utils/track';
import { useUserStore } from '../../store/user';
import { markDailyGateDone, todayKey as gateTodayKey } from '../../utils/dailyGate';

const store = useUserStore();
const cardBackUrl = ohcardBackUrl();
const islandBgSrc = remoteUrl('/static/island/island-mist.jpg');
const brandName = MINIPROGRAM_NAME;
const loading = ref(true);
const drawing = ref(false);
const bootError = ref('');
const drawn = ref(false);
const card = ref(null);
const flipped = ref(false);
/** 翻牌动画结束后再切到海报布局，避免仪式态被提前替换 */
const revealResult = ref(false);
const cardRotate = ref('rotateY(0deg)');
const animating = ref(false);
const dateKey = ref('');
const autoMode = ref(false);

const dateLabel = computed(() => {
  const d = dateKey.value ? new Date(`${dateKey.value}T12:00:00`) : new Date();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${m}月${day}日 · 周${week}`;
});

const ritualTip = computed(() => {
  if (drawn.value) return '这是你今天的主卡';
  if (drawing.value || autoMode.value) return '正在为你抽取今日心境…';
  return '轻触卡背，抽取今日心境';
});

const showResult = computed(() => !!(revealResult.value && card.value));

const guideText = computed(() => {
  if (!card.value) return '';
  return card.value.description || getMoodGuide(card.value.word || '');
});

const questionText = computed(() => {
  if (!card.value) return '';
  return card.value.question || getMoodQuestion(card.value.word || '');
});

function fullUrl(url) {
  return remoteUrl(url);
}

function todayKey() {
  return gateTodayKey();
}

function ensureLogin() {
  if (store.isLoggedIn()) return true;
  uni.showModal({
    title: '需要登录',
    content: '登录后可抽取今日心境，并保存到你的记录里。',
    confirmText: '去登录',
    success: (res) => {
      if (res.confirm) uni.navigateTo({ url: '/pages/login/index' });
    },
  });
  return false;
}

function goIsland() {
  markDailyGateDone(dateKey.value || todayKey());
  uni.switchTab({ url: '/pages/index/index' });
}

async function flipToFront() {
  if (animating.value || flipped.value) return;
  animating.value = true;
  cardRotate.value = 'rotateY(-90deg)';
  await new Promise((r) => setTimeout(r, 240));
  flipped.value = true;
  cardRotate.value = 'rotateY(90deg)';
  await nextTick();
  cardRotate.value = 'rotateY(0deg)';
  await new Promise((r) => setTimeout(r, 240));
  animating.value = false;
  revealResult.value = true;
}

async function onCardTap() {
  if (animating.value) return;
  if (!card.value) {
    await drawToday();
    return;
  }
  if (!flipped.value) await flipToFront();
}

async function boot() {
  loading.value = true;
  bootError.value = '';
  dateKey.value = todayKey();
  track('page_view', '/pages/ohcard/daily', autoMode.value ? { auto: 1 } : undefined);
  if (!store.isLoggedIn()) {
    loading.value = false;
    return;
  }
  try {
    const data = await ohcardApi.dailyToday();
    dateKey.value = data.date || todayKey();
    if (data.drawn && data.card) {
      drawn.value = true;
      card.value = data.card;
      flipped.value = true;
      revealResult.value = true;
      markDailyGateDone(dateKey.value);
    } else if (autoMode.value) {
      loading.value = false;
      await drawToday();
      return;
    }
  } catch (e) {
    if (e?.__authRedirect) return;
    bootError.value = e?.error || e?.message || '加载失败';
  } finally {
    loading.value = false;
  }
}

async function drawToday() {
  if (drawing.value || drawn.value) return;
  if (!ensureLogin()) return;
  drawing.value = true;
  try {
    const data = await ohcardApi.dailyDraw({ auto: !!autoMode.value });
    drawn.value = true;
    card.value = data.card;
    dateKey.value = data.date || todayKey();
    markDailyGateDone(dateKey.value);
    await flipToFront();
  } catch (e) {
    if (e?.__authRedirect) return;
    if (e?.card) {
      drawn.value = true;
      card.value = e.card;
      dateKey.value = e.date || todayKey();
      markDailyGateDone(dateKey.value);
      await flipToFront();
      if (!autoMode.value) {
        uni.showToast({ title: e.error || '今天已抽过', icon: 'none' });
      }
    } else {
      uni.showToast({ title: e?.error || e?.message || '抽卡失败', icon: 'none' });
    }
  } finally {
    drawing.value = false;
  }
}

function sharePoster() {
  if (!card.value) {
    uni.showToast({ title: '请先抽取今日心境', icon: 'none' });
    return;
  }
  if (!flipped.value) {
    uni.showToast({ title: '请先翻开卡牌', icon: 'none' });
    return;
  }
  const word = card.value.word || '';
  const guide = guideText.value;
  const question = questionText.value;
  openDailyShare({
    title: '今日心境',
    subtitle: dateLabel.value,
    cards: [{
      imageUrl: card.value.imageUrl,
      word,
      description: guide,
      question,
      label: '今日主卡',
    }],
    daily: {
      date: dateLabel.value,
      word,
      guide,
      question,
    },
  });
}

onLoad((query) => {
  autoMode.value = query?.auto === '1' || query?.auto === 1;
});

onMounted(boot);
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 20% 0%, rgba(90, 122, 110, 0.12), transparent 48%),
    linear-gradient(180deg, #F3EFE6 0%, #F7F5F1 42%, #EEF3F0 100%);
  padding-bottom: 80rpx;
}

.page--result {
  background: #E8F0EC;
  padding: 24rpx 24rpx 80rpx;
}

/* —— 结果海报（对齐 ShareMomentsModal daily） —— */
.result-poster {
  position: relative;
  overflow: hidden;
  border-radius: 28rpx;
  background: #E8F0EC;
  box-shadow: 0 16rpx 48rpx rgba(28, 42, 39, 0.14);
}

.result-bg {
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

.poster-hero {
  position: relative;
  z-index: 1;
  min-height: 148rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.hero-dim {
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

.hero-body {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 148rpx;
  display: flex;
  align-items: center;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.poster-brand {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.16em;
}

.poster-title {
  margin-top: 6rpx;
  font-size: 34rpx;
  line-height: 1.25;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.06em;
  font-family: $zj-font-display;
}

.poster-date {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.06em;
  margin-top: 2rpx;
}

.cards-block {
  position: relative;
  z-index: 1;
  padding: 20rpx 0 4rpx;
}

.daily-card-full {
  width: 90%;
  margin: 0 auto;
  overflow: visible;
}

.daily-card-full-img {
  display: block;
  width: 100%;
  border-radius: 16rpx;
  box-shadow: 0 12rpx 32rpx rgba(74, 58, 42, 0.14);
}

.card-fallback {
  width: 100%;
  aspect-ratio: 5 / 7;
  border-radius: 16rpx;
  background: #FFFAF4;
  box-shadow: 0 12rpx 32rpx rgba(74, 58, 42, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-fallback-txt {
  font-size: 40rpx;
  color: #1C2A27;
  letter-spacing: 0.2em;
  font-family: $zj-font-serif;
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
  font-family: $zj-font-serif;
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
  position: relative;
  z-index: 1;
  padding: 18rpx 24rpx 32rpx;
  text-align: center;
}

.daily-footer-txt {
  font-size: 22rpx;
  color: #4A655A;
  letter-spacing: 0.12em;
}

/* —— 仪式态 —— */
.hero-content { text-align: left; }
.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.78);
  margin-bottom: 22rpx;
}
.hero-title {
  display: block;
  font-size: 60rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.06em;
  font-family: $zj-font-display;
  margin-bottom: 16rpx;
}
.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.86);
}

.content {
  padding: 40rpx 32rpx 0;
}

.status-box {
  padding: 100rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.status-txt { font-size: 28rpx; color: #9BBCB4; }

.ritual {
  text-align: center;
  margin-bottom: 36rpx;
}
.ritual-tip {
  font-size: 26rpx;
  color: #6A7A72;
  letter-spacing: 0.08em;
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 48rpx;
}

.card {
  width: 380rpx;
  height: 532rpx;
  border-radius: 24rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 22rpx 56rpx rgba(58, 48, 36, 0.18);
}

.card-back, .card-front {
  width: 100%;
  height: 100%;
  border-radius: 24rpx;
  overflow: hidden;
  background: #2C5249;
}

.back-img, .card-img {
  width: 100%;
  height: 100%;
  display: block;
}

.back-veil {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 40rpx;
  background: linear-gradient(180deg, transparent 55%, rgba(20, 32, 29, 0.45) 100%);
}
.back-hint {
  color: rgba(255, 255, 255, 0.92);
  font-size: 24rpx;
  letter-spacing: 0.18em;
}

.card-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8EFED;
}
.card-empty-txt { color: #9BBCB4; font-size: 26rpx; }

.actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 28rpx;
  position: relative;
  z-index: 1;
}
.btn {
  text-align: center;
  font-size: 28rpx;
  padding: 28rpx 0;
  border-radius: 18rpx;
  letter-spacing: 2rpx;
}
.btn.disabled { opacity: 0.55; pointer-events: none; }
.btn-primary {
  background: linear-gradient(135deg, #5A7A6E, #3F5F56);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 10rpx 28rpx rgba(63, 95, 86, 0.28);
}
.btn-ghost {
  background: #fff;
  color: #617870;
  border: 1rpx solid #E8EFED;
  padding-left: 40rpx;
  padding-right: 40rpx;
}
.share-tip {
  text-align: center;
  font-size: 22rpx;
  color: #9BBCB4;
  margin-top: 4rpx;
}
</style>
