<template>
  <view class="page">

    <!-- Fullscreen image viewer -->
    <view v-if="showFullscreen" class="fs-overlay" @click="showFullscreen=false">
      <image :src="fullUrl(imgCard?.imageUrl)" mode="aspectFit" class="fs-img" />
      <text class="fs-hint">点击任意处关闭</text>
    </view>

    <!-- Cards -->
    <view v-if="selDeck" class="step">
      <view class="deck-tag"><text class="deck-tag-text">📦 {{selDeck?.name}}</text></view>
      <text class="reflect-hint">保持你的问题在心中，翻开卡牌，看看它想对你说什么</text>
      <view class="cards-row">
        <!-- Image card (left) -->
        <view class="card-col">
          <text class="card-label">图卡</text>
          <!-- 去掉外层 overflow:hidden，避免微信小程序吞掉点击事件 -->
          <view class="card img-card" :style="{transform: imgRotate, transition: 'transform 0.21s ease-in-out'}" @click="handleImgClick()">
            <view v-if="!imgFlipped" class="card-back"><text class="back-text">点击翻转</text></view>
            <view v-else class="card-front">
              <image :src="fullUrl(imgCard?.imageUrl)" mode="aspectFill" class="card-img" />
            </view>
          </view>
          <view class="swap-row">
            <!-- 用 view 替换 text，微信小程序 text 不支持 @click -->
            <text class="swap-btn" :class="{disabled: imgLoading}" @click="redrawImg()">{{imgLoading ? '加载中…' : '换一个'}}</text>
          </view>
        </view>

        <!-- Word card (right, larger) -->
        <view v-if="selDeck?.wordCatId" class="card-col">
          <text class="card-label">{{wordCard?.imageUrl ? '情况卡' : '字卡'}}</text>
          <view class="card word-card" :style="{transform: wordRotate, transition: 'transform 0.21s ease-in-out'}" @click="flipWord()">
            <view v-if="!wordFlipped" class="card-back"><text class="back-text">点击翻转</text></view>
            <view v-else class="card-front" :class="wordCard?.imageUrl ? '' : 'word-front'">
              <image v-if="wordCard?.imageUrl" :src="fullUrl(wordCard.imageUrl)" mode="aspectFill" class="card-img" />
              <view v-else class="word-frame">
                <text class="word-char">{{wordCard?.word}}</text>
              </view>
            </view>
          </view>
          <view class="swap-row">
            <text class="swap-btn" :class="{disabled: wordLoading}" @click="redrawWord()">{{wordLoading ? '加载中…' : '换一个'}}</text>
          </view>
        </view>
      </view>

      <view v-if="imgFlipped && (!selDeck?.wordCatId || wordFlipped)" class="composite-section">
        <template v-if="selDeck?.wordCatId">
          <text class="section-label">合成卡牌</text>
          <view class="composite-card">
            <image :src="fullUrl(imgCard?.imageUrl)" mode="aspectFill" class="composite-bg" />
            <view class="composite-overlay" v-if="!wordCard?.imageUrl">
              <view class="composite-divider" />
              <text class="composite-word">{{wordCard?.word}}</text>
            </view>
          </view>
        </template>
        <view v-if="deckGuides.length" class="guides-wrap">
          <text class="section-label" style="margin-top:28rpx">翻开卡牌后</text>
          <view class="q-item" v-for="(q, i) in deckGuides" :key="i">
            <text class="q-num">{{i+1}}</text>
            <text class="q-text">{{q}}</text>
          </view>
        </view>
        <text class="section-label" style="margin-top:28rpx">此刻感受</text>
        <textarea class="note-input" v-model="note" placeholder="写下你的感想..." placeholder-class="note-ph" maxlength="500" />
        <view class="btn-group">
          <view class="btn btn-primary" :class="{disabled:saving}" @click="saveRecord()">{{saving?'保存中...':'保存记录'}}</view>
          <view class="btn btn-ghost" @click="uni.navigateTo({url:'/pages/ohcard/record'})">查看抽卡记录</view>
          <view class="btn btn-ghost" @click="uni.navigateBack()">返回抽卡菜单</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick , watch } from 'vue';
import { onBackPress, onLoad } from '@dcloudio/uni-app';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { track } from '../../utils/track';
import { SERVER } from '../../config';


const BASE_IMG = SERVER;
const store = useUserStore();
const selDeck = ref(null);
const deckParam = ref('');
const imgCatIdParam = ref(null);
const wordCatIdParam = ref(null);

onLoad((opts) => {
  deckParam.value = decodeURIComponent(opts?.deck || '');
  if (opts?.imgCatId) imgCatIdParam.value = Number(opts.imgCatId);
  if (opts?.wordCatId) wordCatIdParam.value = Number(opts.wordCatId);
});
const imgCard = ref(null);
const wordCard = ref(null);
const imgFlipped = ref(false);
const wordFlipped = ref(false);
const note = ref('');
const compositeUrl = ref('');
const showFullscreen = ref(false);
const saving = ref(false);
const imgLoading = ref(false);
const wordLoading = ref(false);

// flip animation state
const imgRotate = ref('rotateY(0deg)');
const wordRotate = ref('rotateY(0deg)');
const imgAnimating = ref(false);
const wordAnimating = ref(false);

function preloadImage(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve();
  return new Promise(resolve => { const i = new Image(); i.onload = i.onerror = resolve; i.src = url; });
}

onBackPress(() => { if (saving.value) return true; return false; });

onMounted(async () => {
  track('page_view', '/pages/ohcard/classic');
  if (typeof window !== 'undefined' && getCurrentPages().length <= 1) {
    const current = location.href;
    history.replaceState(null, '', location.origin + location.pathname + '#/pages/ohcard/index');
    history.pushState(null, '', current);
  }
  // 如果 URL 已携带分类 ID（从 ohcard/index 导航而来），直接使用，不需要请求分类列表
  if (imgCatIdParam.value) {
    startDraw({ name: deckParam.value, imgCatId: imgCatIdParam.value, wordCatId: wordCatIdParam.value });
    return;
  }
  try {
    const cats = await ohcardApi.categories();
    const all = cats.filter(c => c.type === 'image').map(c => ({ ...c, wordCatId: c.wordCatId || null, imgCatId: c.imgSrcCatId || c.id }));
    const deck = all.find(d => d.name === deckParam.value);
    if (deck) startDraw(deck);
    else uni.showToast({ title: '未找到牌组', icon: 'none' });
  } catch(e) {
    uni.showToast({ title: '加载失败', icon: 'none', duration: 3000 });
  }
});

function fullUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : BASE_IMG + url;
}

async function startDraw(deck) {
  if (!deck) return;
  track('ohcard_draw', '/pages/ohcard/classic', { deck: deck.name });
  selDeck.value = deck;
  try {
    const reqs = [ohcardApi.cards({ category_id: deck.imgCatId, count: 1 })];
    if (deck.wordCatId) reqs.push(ohcardApi.cards({ category_id: deck.wordCatId, count: 1 }));
    const results = await Promise.all(reqs);
    if (!results[0].length) return uni.showToast({ title: '牌组无卡片', icon: 'none' });
    imgCard.value = results[0][0];
    wordCard.value = deck.wordCatId ? results[1]?.[0] : null;
    imgFlipped.value = false;
    wordFlipped.value = false;
    // 提前预加载，减少翻转白屏
    preloadImage(fullUrl(imgCard.value?.imageUrl));
    if (wordCard.value?.imageUrl) preloadImage(fullUrl(wordCard.value.imageUrl));
  } catch(e) {
    uni.showToast({ title: e?.error || e?.message || '抽卡失败', icon: 'none' });
  }
}

async function redrawImg() {
  if (imgLoading.value || imgAnimating.value) return;
  imgLoading.value = true;
  if (imgFlipped.value) {
    imgAnimating.value = true;
    imgRotate.value = 'rotateY(-90deg)';
    await new Promise(r => setTimeout(r, 210));
    imgFlipped.value = false;
    imgRotate.value = 'rotateY(90deg)';
    await nextTick();
    imgRotate.value = 'rotateY(0deg)';
    await new Promise(r => setTimeout(r, 210));
    imgAnimating.value = false;
  }
  try {
    const imgs = await ohcardApi.cards({ category_id: selDeck.value.imgCatId, count: 1 });
    if (imgs.length) {
      preloadImage(fullUrl(imgs[0]?.imageUrl));
      imgCard.value = imgs[0];
    }
  } catch {} finally { imgLoading.value = false; }
}

async function redrawWord() {
  if (wordLoading.value || wordAnimating.value) return;
  wordLoading.value = true;
  if (wordFlipped.value) {
    wordAnimating.value = true;
    wordRotate.value = 'rotateY(-90deg)';
    await new Promise(r => setTimeout(r, 210));
    wordFlipped.value = false;
    wordRotate.value = 'rotateY(90deg)';
    await nextTick();
    wordRotate.value = 'rotateY(0deg)';
    await new Promise(r => setTimeout(r, 210));
    wordAnimating.value = false;
  }
  try {
    const words = await ohcardApi.cards({ category_id: selDeck.value.wordCatId, count: 1 });
    if (words.length) {
      preloadImage(fullUrl(words[0]?.imageUrl));
      wordCard.value = words[0];
    }
  } catch {} finally { wordLoading.value = false; }
}

async function handleImgClick() {
  if (imgAnimating.value) return;
  if (!imgFlipped.value) {
    imgAnimating.value = true;
    imgRotate.value = 'rotateY(90deg)';
    await new Promise(r => setTimeout(r, 210));
    imgFlipped.value = true;
    imgRotate.value = 'rotateY(-90deg)';
    await nextTick();
    imgRotate.value = 'rotateY(0deg)';
    await new Promise(r => setTimeout(r, 210));
    imgAnimating.value = false;
  } else {
    showFullscreen.value = true;
  }
}
async function flipWord() {
  if (wordAnimating.value || wordFlipped.value) return;
  wordAnimating.value = true;
  wordRotate.value = 'rotateY(90deg)';
  await new Promise(r => setTimeout(r, 210));
  wordFlipped.value = true;
  wordRotate.value = 'rotateY(-90deg)';
  await nextTick();
  wordRotate.value = 'rotateY(0deg)';
  await new Promise(r => setTimeout(r, 210));
  wordAnimating.value = false;
}

async function saveRecord() {
  if (saving.value) return;
  if (!store.isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 800);
    return;
  }
  saving.value = true;
  try {
    await ohcardApi.saveRecord({
      type: selDeck.value?.wordCatId ? 'classic' : 'imgonly',
      data: { imgCard: imgCard.value, wordCard: wordCard.value, compositeUrl: compositeUrl.value, deckName: selDeck.value?.name },
      note: note.value
    });
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch(e) {
    if (e?.__authRedirect) return;
    uni.showToast({ title: e?.error || '保存失败', icon: 'none', duration: 3000 });
  } finally {
    saving.value = false;
  }
}

function reset() {
  imgFlipped.value = false; wordFlipped.value = false;
  note.value = ''; compositeUrl.value = ''; saving.value = false;
  startDraw(selDeck.value);
}

const DECK_GUIDES = {
  '心理图卡': [
    '这张图，你第一眼注意到的是什么？',
    '如果图里有一种情绪或氛围，那是什么？',
    '这张卡和你现在的处境，有什么让你意外的联系？'
  ],
  '心理图卡+字卡': [
    '图和字放在一起，你注意到什么？',
    '如果图是一个场景，字是其中一个声音，那会是什么声音？',
    '这个组合让你联想到什么？'
  ],
  '伴侣卡': [
    '这张卡里的人，让你想到谁，或者什么样的关系？',
    '这个人的表情和姿态，让你有什么感受？',
    '如果这张卡代表一段关系或一种相处方式，那是什么样的？'
  ],
  '孩童卡·人像': [
    '这个孩子大概多大？他的神情让你想到什么？',
    '如果这是小时候的你，那一刻他可能在想什么？',
    '看着这张卡，你身体有什么感觉？'
  ],
};
const deckGuides = computed(() => DECK_GUIDES[selDeck.value?.name] || []);
</script>

<style scoped lang="scss">
.page { padding: 44rpx 32rpx 64rpx; min-height: 100vh; background: #F5F7F6; }
.title { font-size: 36rpx; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 32rpx; font-family: "Noto Serif SC", serif; }
.section-label { font-size: 26rpx; font-weight: 600; color: #617870; display: block; margin-bottom: 16rpx; letter-spacing: 0.04em; }

/* Intro & guide */
.deck-tag { text-align: center; margin-bottom: 22rpx; }
.deck-tag-text { font-size: 24rpx; color: #4A8A7A; background: #EDF4F0; padding: 10rpx 30rpx; border-radius: 32rpx; }
.reflect-hint { display: block; text-align: center; font-size: 24rpx; color: #9BBCB4; margin-bottom: 44rpx; line-height: 1.7; padding: 0 24rpx; }

/* Cards row */
.cards-row { display: flex; gap: 32rpx; justify-content: center; margin-bottom: 44rpx; }
.card-col { display: flex; flex-direction: column; align-items: center; }
.card-label { font-size: 24rpx; color: #9BBCB4; margin-bottom: 16rpx; }

/* Card flip */
.card { position: relative; border-radius: 16rpx; overflow: hidden; will-change: transform; }
.card-back, .card-front { width: 100%; height: 100%; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.card-back { background: linear-gradient(135deg, #4A8A7A, #3A6E80); box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.18); }
.back-text { color: rgba(255,255,255,0.9); font-size: 24rpx; letter-spacing: 2rpx; }
.card-front { background: #fff; box-shadow: 0 12rpx 36rpx rgba(28,42,39,.14); overflow: hidden; }

/* Image card */
.img-card { width: 220rpx; height: 310rpx; }
.card-img { width: 100%; height: 100%; }

/* Word card (bigger by one ring) */
.word-card { width: 260rpx; height: 360rpx; }
.word-front { background: linear-gradient(160deg, #1E3A34, #2C5249) !important; }
.word-frame {
  width: 86%; height: 86%;
  border: 4rpx solid #C8A84B;
  border-radius: 12rpx;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.word-frame::before {
  content: ''; position: absolute; inset: 8rpx;
  border: 1rpx solid rgba(200,168,75,0.4);
  border-radius: 8rpx;
}
.word-char {
  font-size: 64rpx; font-weight: bold; color: #fff;
  font-family: "Noto Serif SC", serif;
  letter-spacing: 4rpx;
}

/* Swap button */
.swap-row { margin-top: 20rpx; text-align: center; }
.swap-btn {
  font-size: 24rpx; color: #4A8A7A; padding: 12rpx 30rpx;
  border: 1rpx solid rgba(74,138,122,0.5); border-radius: 32rpx; background: #FFFFFF;
}
.swap-btn.disabled { color: #B7C6C1; border-color: #E8EFED; background: transparent; pointer-events: none; }

/* Composite */
.composite-section { background: #FFFFFF; border-radius: 24rpx; padding: 34rpx 30rpx; border: 1rpx solid #E8EFED; }
.guides-wrap { margin-top: 8rpx; margin-bottom: 8rpx; }
.q-item { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.q-num { width: 38rpx; height: 38rpx; border-radius: 50%; background: linear-gradient(135deg, #4A8A7A, #3A6E80); color: #fff; font-size: 22rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.q-text { font-size: 26rpx; color: #4A5751; line-height: 1.65; flex: 1; }
.note-input {
  width: 100%; min-height: 150rpx; background: #F5F7F6;
  border: 1rpx solid #E8EFED; border-radius: 16rpx;
  padding: 20rpx 24rpx; font-size: 28rpx; color: #1C2A27; box-sizing: border-box;
}
.note-ph { color: #9BBCB4; }

/* Buttons */
.btn-group { display:flex; flex-direction:column; gap:16rpx; margin-top:28rpx; }
.btn { text-align:center; font-size:28rpx; padding:26rpx 0; border-radius:16rpx; letter-spacing:2rpx; }
.btn-primary { background: linear-gradient(135deg,#4A8A7A,#3A6E80); color:#fff; font-weight:600; box-shadow: 0 8rpx 22rpx rgba(74,138,122,0.24); }
.btn-primary.disabled { opacity:0.55; box-shadow:none; }
.btn-ghost { background: #FFFFFF; color: #617870; border:1rpx solid #E8EFED; }

/* Fullscreen */
.fs-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(20,32,29,.94);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.fs-img { width: 100vw; height: 90vh; }
.fs-hint { color: rgba(255,255,255,.5); font-size: 22rpx; margin-top: 20rpx; }

/* Composite card */
.composite-card {
  width: 320rpx; height: 440rpx; border-radius: 20rpx; overflow: hidden;
  position: relative; box-shadow: 0 16rpx 44rpx rgba(28,42,39,.18); margin: 0 auto 36rpx;
}
.composite-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.composite-overlay {
  position: absolute; bottom: 0; left: 0; right: 0; height: 120rpx;
  background: linear-gradient(transparent, rgba(30,58,52,0.96));
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20rpx;
}
.composite-divider { width: 60rpx; height: 2rpx; background: #C8A84B; margin-bottom: 12rpx; }
.composite-word { color: #fff; font-size: 48rpx; font-weight: bold; letter-spacing: 6rpx; }
</style>
