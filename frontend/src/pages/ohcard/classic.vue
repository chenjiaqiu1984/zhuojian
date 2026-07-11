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
          <view class="card img-card" :style="{transform: imgRotate, transition: 'transform 0.21s ease-in-out'}" @click="tapHandler = handleImgClick">
            <view v-if="!imgFlipped" class="card-back"><text class="back-text">点击翻转</text></view>
            <view v-else class="card-front">
              <image :src="fullUrl(imgCard?.imageUrl)" mode="aspectFill" class="card-img" />
            </view>
          </view>
          <view class="swap-row">
            <!-- 用 view 替换 text，微信小程序 text 不支持 @click -->
            <view class="swap-btn" :class="{disabled: imgLoading}" @click="tapHandler = redrawImg">{{imgLoading ? '加载中…' : '换一个'}}</view>
          </view>
        </view>

        <!-- Word card (right, larger) -->
        <view v-if="selDeck?.wordCatId" class="card-col">
          <text class="card-label">{{wordCard?.imageUrl ? '情况卡' : '字卡'}}</text>
          <view class="card word-card" :style="{transform: wordRotate, transition: 'transform 0.21s ease-in-out'}" @click="tapHandler = flipWord">
            <view v-if="!wordFlipped" class="card-back"><text class="back-text">点击翻转</text></view>
            <view v-else class="card-front" :class="wordCard?.imageUrl ? '' : 'word-front'">
              <image v-if="wordCard?.imageUrl" :src="fullUrl(wordCard.imageUrl)" mode="aspectFill" class="card-img" />
              <view v-else class="word-frame">
                <text class="word-char">{{wordCard?.word}}</text>
              </view>
            </view>
          </view>
          <view class="swap-row">
            <view class="swap-btn" :class="{disabled: wordLoading}" @click="tapHandler = redrawWord">{{wordLoading ? '加载中…' : '换一个'}}</view>
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
        <text class="section-label" style="margin-top:28rpx">此刻感受</text>
        <textarea class="note-input" v-model="note" placeholder="写下你的感想..." maxlength="500" />
        <view class="btn-group">
          <u-button type="primary" :disabled="saving" @click="saveRecord()">{{saving?'保存中...':'保存记录'}}</u-button>
          <u-button plain @click="uni.navigateTo({url:'/pages/ohcard/record'})">查看抽卡记录</u-button>
          <u-button plain @click="uni.navigateBack()">返回抽卡菜单</u-button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick , watch } from 'vue';
import { onBackPress, onLoad } from '@dcloudio/uni-app';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { track } from '../../utils/track';
import { SERVER } from '../../config';

// #ifndef H5
const tapHandler = ref(null);
watch(tapHandler, () => { if (tapHandler.value) { const fn = tapHandler.value; tapHandler.value = null; fn(); } });
// #endif

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
</script>

<style scoped lang="scss">
.page { padding: 32rpx; min-height: 100vh; background: #F5F7FA; }
.title { font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 32rpx; }
.section-label { font-size: 26rpx; font-weight: 600; color: #555; display: block; margin-bottom: 16rpx; }

/* Intro & guide */
.deck-tag { text-align: center; margin-bottom: 16rpx; }
.deck-tag-text { font-size: 24rpx; color: #4A7BBA; background: #EBF2FF; padding: 8rpx 24rpx; border-radius: 32rpx; }
.intro-box { background: linear-gradient(135deg,#4A7BBA,#7B68EE); border-radius: 20rpx; padding: 40rpx 36rpx; margin-bottom: 32rpx; }
.intro-title { color: #fff; font-size: 32rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.intro-body { color: rgba(255,255,255,.85); font-size: 26rpx; line-height: 1.7; display: block; }
.guide-prompt { background: #fff8ec; border-left: 6rpx solid #c8a84b; border-radius: 0 16rpx 16rpx 0; padding: 28rpx 32rpx; margin-bottom: 8rpx; }
.guide-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 10rpx; }
.guide-question { font-size: 30rpx; color: #5a3e00; font-weight: 600; display: block; line-height: 1.6; }
.reflect-hint { display: block; text-align: center; font-size: 24rpx; color: #888; margin-bottom: 28rpx; line-height: 1.6; padding: 0 16rpx; }

/* Deck selection */
.deck-list { display: flex; flex-direction: column; gap: 20rpx; }
.deck-item { padding: 28rpx 32rpx; background: #fff; border: 3rpx solid #eee; border-radius: 16rpx; }
.deck-item.active { border-color: #4A7BBA; background: #EBF2FF; }
.deck-name { font-size: 30rpx; font-weight: 600; color: #333; display: block; }
.deck-desc { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }

/* Cards row */
.cards-row { display: flex; gap: 24rpx; justify-content: center; margin-bottom: 32rpx; }
.card-col { display: flex; flex-direction: column; align-items: center; flex: 1; }
.card-label { font-size: 24rpx; color: #888; margin-bottom: 12rpx; }

/* Card flip */
.card { position: relative; border-radius: 16rpx; overflow: hidden; will-change: transform; }
.card-back, .card-front { width: 100%; height: 100%; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; }
.card-back { background: linear-gradient(135deg, #4A7BBA, #7B68EE); }
.back-text { color: #fff; font-size: 24rpx; }
.card-front { background: #fff; box-shadow: 0 8rpx 32rpx rgba(0,0,0,.15); overflow: hidden; }

/* Image card */
.img-card { width: 220rpx; height: 310rpx; }
.card-img { width: 100%; height: 100%; }

/* Word card (bigger by one ring) */
.word-card { width: 260rpx; height: 360rpx; }
.word-front { background: linear-gradient(160deg, #0f2044, #1a3a6b) !important; }
.word-frame {
  width: 86%; height: 86%;
  border: 4rpx solid #c8a84b;
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
.swap-row { margin-top: 16rpx; }
.swap-btn {
  font-size: 24rpx; color: #4A7BBA; padding: 10rpx 28rpx;
  border: 2rpx solid #4A7BBA; border-radius: 32rpx; background: #fff;
}
.swap-btn.disabled { color: #aaa; border-color: #ccc; pointer-events: none; }

/* Action area */
.action-area { width: 100%; }
.note-input {
  width: 100%; min-height: 150rpx; background: #fff;
  border: 2rpx solid #e8e8e8; border-radius: 16rpx;
  padding: 20rpx 24rpx; font-size: 28rpx; color: #333; box-sizing: border-box;
}
.btn-group { display:flex; flex-direction:column; gap:16rpx; margin-top:24rpx; }

/* Composite */
.fs-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.92);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.fs-img { width: 100vw; height: 90vh; }
.fs-hint { color: rgba(255,255,255,.5); font-size: 22rpx; margin-top: 20rpx; }

/* Composite */
.composite-step { display: flex; flex-direction: column; align-items: center; }
.composite-card {
  width: 320rpx; height: 440rpx; border-radius: 20rpx; overflow: hidden;
  position: relative; box-shadow: 0 16rpx 48rpx rgba(0,0,0,.25); margin-bottom: 36rpx;
}
.composite-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.composite-overlay {
  position: absolute; bottom: 0; left: 0; right: 0; height: 120rpx;
  background: linear-gradient(transparent, rgba(26,58,107,0.95));
  display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 20rpx;
}
.composite-divider { width: 60rpx; height: 2rpx; background: #c8a84b; margin-bottom: 12rpx; }
.composite-word { color: #fff; font-size: 48rpx; font-weight: bold; letter-spacing: 6rpx; }
</style>
