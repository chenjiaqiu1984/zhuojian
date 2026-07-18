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
        <view class="card" :class="{flipped}" @click="flip()">
          <view class="card-back"><text class="back-text">点击翻转</text></view>
          <view class="card-front" @click.stop="showFs=true">
            <image :src="fullUrl(card?.imageUrl)" mode="aspectFill" class="card-img" />
          </view>
        </view>
        <text class="swap-btn" @click="redraw()">换一张</text>
      </view>

      <view v-if="flipped" class="save-section">
        <text class="section-label">此刻感受</text>
        <textarea class="note-input" v-model="note" placeholder="写下你的感想…" placeholder-class="note-ph" maxlength="500" />
        <view class="btn-group">
          <view class="btn btn-primary" @click="save()">保存记录</view>
          <view class="btn btn-ghost" @click="reset()">重新抽卡</view>
        </view>
      </view>
    </view>

    <view v-if="showFs" class="fs-overlay" @click="showFs=false">
      <image :src="fullUrl(card?.imageUrl)" mode="aspectFit" class="fs-img" />
      <text class="fs-hint">点击任意处关闭</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted , watch } from 'vue';
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
.page { padding: 44rpx 32rpx 64rpx; min-height: 100vh; background: #F5F7F6; }
.title { font-size: 32rpx; font-weight: 600; color: #1C2A27; display: block; margin: 44rpx 0 22rpx; font-family: "Noto Serif SC", serif; }
.section-label { font-size: 26rpx; font-weight: 600; color: #617870; display: block; margin-bottom: 16rpx; letter-spacing: 0.04em; }

.intro-box { position: relative; overflow: hidden; background: linear-gradient(135deg,#4A8A7A,#3A6E80); border-radius: 24rpx; padding: 40rpx 36rpx; margin-bottom: 40rpx; }
.intro-title { color: #FFFFFF; font-size: 32rpx; font-weight: 600; display: block; margin-bottom: 14rpx; font-family: "Noto Serif SC", serif; }
.intro-body { color: rgba(255,255,255,0.85); font-size: 26rpx; line-height: 1.8; display: block; }

.deck-list { display: flex; flex-direction: column; gap: 16rpx; }
.deck-item { padding: 30rpx 32rpx; background: #FFFFFF; border: 1rpx solid #E8EFED; border-radius: 20rpx; }
.deck-item.active { border-color: rgba(74,138,122,0.55); background: #EDF4F0; }
.deck-name { font-size: 30rpx; font-weight: 600; color: #1C2A27; display: block; }
.deck-desc { font-size: 24rpx; color: #9BBCB4; display: block; margin-top: 8rpx; }

.reflect-hint { display: block; text-align: center; font-size: 24rpx; color: #9BBCB4; margin-bottom: 48rpx; letter-spacing: 1rpx; }

.card-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 44rpx; }
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
.card-back { background: linear-gradient(135deg, #4A8A7A, #3A6E80); box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.18); }
.back-text { color: rgba(255,255,255,0.9); font-size: 26rpx; letter-spacing: 2rpx; }
.card-front { background: #fff; box-shadow: 0 12rpx 36rpx rgba(28,42,39,.14); transform: rotateY(180deg); overflow: hidden; }
.card-img { width: 100%; height: 100%; }

.swap-btn { font-size: 24rpx; color: #4A8A7A; padding: 12rpx 30rpx; border: 1rpx solid rgba(74,138,122,0.5); border-radius: 32rpx; background: #FFFFFF; margin-top: 24rpx; }

.save-section { background: #FFFFFF; border-radius: 24rpx; padding: 34rpx 30rpx; border: 1rpx solid #E8EFED; }
.note-input { width: 100%; min-height: 150rpx; background: #F5F7F6; border: 1rpx solid #E8EFED; border-radius: 16rpx; padding: 20rpx 24rpx; font-size: 28rpx; color: #1C2A27; box-sizing: border-box; }
.note-ph { color: #9BBCB4; }

.btn-group { display:flex; flex-direction:column; gap:16rpx; margin-top:24rpx; }
.btn { text-align:center; font-size:28rpx; padding:26rpx 0; border-radius:16rpx; letter-spacing:2rpx; }
.btn-primary { background: linear-gradient(135deg,#4A8A7A,#3A6E80); color:#fff; font-weight:600; box-shadow: 0 8rpx 22rpx rgba(74,138,122,0.24); }
.btn-ghost { background: #FFFFFF; color: #617870; border:1rpx solid #E8EFED; }

.fs-overlay { position: fixed; inset: 0; z-index: $zj-z-modal; background: rgba(20,32,29,.94); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.fs-img { width: 100vw; height: 90vh; }
.fs-hint { color: rgba(255,255,255,.5); font-size: 22rpx; margin-top: 20rpx; }
</style>
