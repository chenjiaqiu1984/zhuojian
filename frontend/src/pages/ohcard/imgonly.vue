<template>
  <view class="page">
    <!-- Step 0: Choose deck -->
    <view v-if="step === 0" class="step">
      <view class="intro-box">
        <text class="intro-title">一张图，听见内心的声音</text>
        <text class="intro-body">随机抽取一张图卡，不分析、不评判，只是停留在图像里，看它想对你说什么。</text>
      </view>
      <text class="title">选择牌组</text>
      <view class="deck-list">
        <view v-for="d in decks" :key="d.id" class="deck-item" :class="{active: selDeck?.id === d.id}" @click="draw(d)">
          <text class="deck-name">{{d.name}}</text>
          <text class="deck-desc">{{d.description || ''}}</text>
        </view>
      </view>
    </view>

    <!-- Step 1: Single card -->
    <view v-if="step === 1" class="step">
      <text class="reflect-hint">保持问题在心中，翻开卡牌</text>
      <view class="card-wrap">
        <view class="card" :class="{flipped}" @click="flip">
          <view class="card-back"><text class="back-text">点击翻转</text></view>
          <view class="card-front" @click.stop="showFs=true">
            <image :src="fullUrl(card?.imageUrl)" mode="aspectFill" class="card-img" />
          </view>
        </view>
        <text class="swap-btn" @click="redraw">换一张</text>
      </view>

      <view v-if="flipped" class="save-section">
        <text class="section-label">此刻感受</text>
        <textarea class="note-input" v-model="note" placeholder="写下你的感想..." maxlength="500" />
        <u-button type="primary" @click="save" style="margin-top:20rpx">保存记录</u-button>
        <u-button plain @click="reset" style="margin-top:12rpx">重新抽卡</u-button>
      </view>
    </view>

    <view v-if="showFs" class="fs-overlay" @click="showFs=false">
      <image :src="fullUrl(card?.imageUrl)" mode="aspectFit" class="fs-img" />
      <text class="fs-hint">点击任意处关闭</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { track } from '../../utils/track';
import { SERVER } from '../../config';

const store = useUserStore();
const step = ref(0);
const decks = ref([]);
const selDeck = ref(null);
const card = ref(null);
const flipped = ref(false);
const note = ref('');
const showFs = ref(false);

onMounted(async () => {
  track('page_view', '/pages/ohcard/imgonly');
  try {
    const cats = await ohcardApi.categories();
    decks.value = cats.filter(c => c.type === 'image');
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
});

function fullUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : SERVER + url;
}

async function draw(deck) {
  selDeck.value = deck;
  try {
    const imgs = await ohcardApi.cards({ category_id: deck.id, count: 1 });
    if (!imgs.length) return uni.showToast({ title: '牌组无卡片', icon: 'none' });
    card.value = imgs[0];
    flipped.value = false;
    step.value = 1;
  } catch {
    uni.showToast({ title: '抽卡失败', icon: 'none' });
  }
}

async function redraw() {
  flipped.value = false;
  try {
    const imgs = await ohcardApi.cards({ category_id: selDeck.value.id, count: 1 });
    if (imgs.length) {
      await new Promise(r => setTimeout(r, 650));
      card.value = imgs[0];
    }
  } catch {}
}

function flip() { if (!flipped.value) flipped.value = true; }

async function save() {
  if (!store.isLoggedIn()) return uni.navigateTo({ url: '/pages/login/index' });
  try {
    await ohcardApi.saveRecord({
      type: 'imgonly',
      data: { imgCard: card.value, deck: selDeck.value?.name },
      note: note.value
    });
    uni.showToast({ title: '已保存' });
    reset();
  } catch { uni.showToast({ title: '保存失败', icon: 'none' }); }
}

function reset() {
  step.value = 0; selDeck.value = null;
  card.value = null; flipped.value = false; note.value = '';
}
</script>

<style scoped lang="scss">
.page { padding: 32rpx; min-height: 100vh; background: #F5F7FA; }
.title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin: 32rpx 0 16rpx; }
.section-label { font-size: 26rpx; font-weight: 600; color: #555; display: block; margin-bottom: 16rpx; }

.intro-box { background: linear-gradient(135deg,#4A8A7A,#3A6E80); border-radius: 20rpx; padding: 40rpx 36rpx; margin-bottom: 32rpx; }
.intro-title { color: #fff; font-size: 32rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.intro-body { color: rgba(255,255,255,.85); font-size: 26rpx; line-height: 1.7; display: block; }

.deck-list { display: flex; flex-direction: column; gap: 20rpx; }
.deck-item { padding: 28rpx 32rpx; background: #fff; border: 3rpx solid #eee; border-radius: 16rpx; }
.deck-item.active { border-color: #4A8A7A; background: #EBF5F2; }
.deck-name { font-size: 30rpx; font-weight: 600; color: #333; display: block; }
.deck-desc { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }

.reflect-hint { display: block; text-align: center; font-size: 24rpx; color: #888; margin-bottom: 36rpx; }

.card-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 32rpx; }
.card {
  width: 280rpx; height: 390rpx;
  transform-style: preserve-3d; transition: transform 0.6s;
  position: relative; border-radius: 20rpx;
}
.card.flipped { transform: rotateY(180deg); }
.card-back, .card-front {
  position: absolute; inset: 0; backface-visibility: hidden;
  border-radius: 20rpx; display: flex; align-items: center; justify-content: center;
}
.card-back { background: linear-gradient(135deg, #4A8A7A, #3A6E80); }
.back-text { color: #fff; font-size: 26rpx; }
.card-front { background: #fff; box-shadow: 0 8rpx 32rpx rgba(0,0,0,.15); transform: rotateY(180deg); overflow: hidden; }
.card-img { width: 100%; height: 100%; }

.swap-btn { font-size: 24rpx; color: #4A8A7A; padding: 10rpx 28rpx; border: 2rpx solid #4A8A7A; border-radius: 32rpx; background: #fff; margin-top: 20rpx; }

.save-section { background: #fff; border-radius: 20rpx; padding: 28rpx; }
.note-input { width: 100%; min-height: 150rpx; background: #F8F9FA; border: 2rpx solid #eee; border-radius: 12rpx; padding: 16rpx; font-size: 28rpx; color: #333; box-sizing: border-box; }

.fs-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.92); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.fs-img { width: 100vw; height: 90vh; }
.fs-hint { color: rgba(255,255,255,.5); font-size: 22rpx; margin-top: 20rpx; }
</style>
