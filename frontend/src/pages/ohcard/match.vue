<template>
  <view class="page">
    <view v-if="!drawn">
      <text class="title">图字随机匹配</text>
      <text class="desc">随机抽取图卡与字卡，用直觉为图卡配上字卡</text>
      <view class="action-btn action-btn--primary" @click="drawCards()" style="margin-top:40rpx"><text class="action-btn-text">开始抽卡</text></view>
    </view>
    <view v-else>
      <text class="title">为每张图卡选择一张字卡</text>
      <view class="match-item" v-for="(img, i) in imageCards" :key="img.id">
        <view class="img-card">
          <image v-if="img.image_url" :src="img.image_url" mode="aspectFit" class="card-img" />
          <text v-else class="card-word">{{img.word}}</text>
        </view>
        <u-icon name="arrow-right" color="#9BBCB4" size="24" />
        <scroll-view scroll-x class="word-scroll">
          <view class="word-chip" v-for="w in wordCards" :key="w.id"
            :class="{selected: matches[i] === w.id}" @click="matches[i] = w.id">
            {{w.word}}
          </view>
        </scroll-view>
      </view>
      <view class="action-btn action-btn--primary" :class="{'action-btn--disabled': !allMatched}" @click="allMatched && save()" style="margin-top:32rpx"><text class="action-btn-text">保存匹配</text></view>
      <view class="action-btn action-btn--plain" @click="drawn=false" style="margin-top:16rpx"><text class="action-btn-text">重新抽卡</text></view>
    </view>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('ohcard/match'));
// #endif

import { ref, computed, onMounted } from 'vue';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { track } from '../../utils/track';

const store = useUserStore();
const drawn = ref(false);
const imageCards = ref([]);
const wordCards = ref([]);
const matches = ref([]);

async function drawCards() {
  try {
    const cats = await ohcardApi.categories();
    const imgCat = cats.find(c => c.type === 'image');
    const wordCat = cats.find(c => c.type === 'word');
    if (!imgCat || !wordCat) return uni.showToast({ title: '需要图卡和字卡牌组', icon: 'none' });
    const [imgs, words] = await Promise.all([
      ohcardApi.cards({ category_id: imgCat.id, count: 4 }),
      ohcardApi.cards({ category_id: wordCat.id, count: 8 })
    ]);
    imageCards.value = imgs;
    wordCards.value = words;
    matches.value = new Array(imgs.length).fill(null);
    drawn.value = true;
  } catch { uni.showToast({ title: '抽卡失败', icon: 'none' }); }
}

const allMatched = computed(() => matches.value.every(m => m !== null));

async function save() {
  if (!store.isLoggedIn()) return uni.navigateTo({ url: '/pages/login/index' });
  const data = imageCards.value.map((img, i) => ({
    image: img,
    word: wordCards.value.find(w => w.id === matches.value[i])
  }));
  try {
    await ohcardApi.saveRecord({ type: 'match', data });
    uni.showToast({ title: '已保存' });
    drawn.value = false;
  } catch { uni.showToast({ title: '保存失败', icon: 'none' }); }
}

onMounted(() => track('page_view', '/pages/ohcard/match'));
</script>

<style scoped lang="scss">
.page { padding: 32rpx; min-height: 100vh; background: $zj-bg; }
.title { font-size: 34rpx; font-weight: bold; color: $zj-text-1; display: block; margin-bottom: 12rpx; font-family: $zj-font-serif; }
.desc { font-size: 26rpx; color: $zj-text-2; display: block; }
.match-item { display: flex; align-items: center; gap: 16rpx; background: $zj-surface; border-radius: $zj-radius-sm; padding: 16rpx; margin-bottom: 16rpx; box-shadow: $zj-shadow-card; }
.img-card { width: 130rpx; height: 170rpx; flex-shrink: 0; border-radius: 12rpx; overflow: hidden; background: $zj-bg; display: flex; align-items: center; justify-content: center; }
.card-img { width: 100%; height: 100%; }
.card-word { font-size: 32rpx; font-weight: bold; color: $zj-teal; }
.word-scroll { flex: 1; white-space: nowrap; }
.word-chip { display: inline-block; padding: 10rpx 20rpx; border: 2rpx solid $zj-border; border-radius: 30rpx; margin-right: 12rpx; font-size: 26rpx; color: $zj-text-2; &:active { opacity: 0.7; } }
.word-chip.selected { border-color: $zj-teal; background: $zj-teal-light; color: $zj-teal; font-weight: 600; }
.action-btn {
  display: block; text-align: center; padding: 22rpx 0; border-radius: 14rpx;
  &--primary     { background: $zj-teal; &:active { opacity: 0.88; } }
  &--plain       { border: 1.5rpx solid $zj-border; background: $zj-surface; &:active { opacity: 0.7; } }
  &--disabled    { opacity: 0.5; }
}
.action-btn-text {
  font-size: 28rpx; font-weight: 600;
  .action-btn--primary & { color: #fff; }
  .action-btn--plain &   { color: $zj-text-2; }
}
</style>
