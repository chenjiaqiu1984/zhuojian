<template>
  <view class="page">
    <view v-if="!drawn">
      <text class="title">图字随机匹配</text>
      <text class="desc">随机抽取图卡与字卡，用直觉为图卡配上字卡</text>
      <u-button type="primary" @click="drawCards" style="margin-top:40rpx">开始抽卡</u-button>
    </view>
    <view v-else>
      <text class="title">为每张图卡选择一张字卡</text>
      <view class="match-item" v-for="(img, i) in imageCards" :key="img.id">
        <view class="img-card">
          <image v-if="img.image_url" :src="img.image_url" mode="aspectFit" class="card-img" />
          <text v-else class="card-word">{{img.word}}</text>
        </view>
        <u-icon name="arrow-right" color="#ccc" size="24" />
        <scroll-view scroll-x class="word-scroll">
          <view class="word-chip" v-for="w in wordCards" :key="w.id"
            :class="{selected: matches[i] === w.id}" @click="matches[i] = w.id">
            {{w.word}}
          </view>
        </scroll-view>
      </view>
      <u-button type="primary" :disabled="!allMatched" @click="save" style="margin-top:32rpx">保存匹配</u-button>
      <u-button plain @click="drawn=false" style="margin-top:16rpx">重新抽卡</u-button>
    </view>
  </view>
</template>

<script setup>
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
.page { padding: 32rpx; min-height: 100vh; }
.title { font-size: 34rpx; font-weight: bold; color: #333; display: block; margin-bottom: 12rpx; }
.desc { font-size: 26rpx; color: #777; display: block; }
.match-item { display: flex; align-items: center; gap: 16rpx; background: #fff; border-radius: 16rpx; padding: 16rpx; margin-bottom: 16rpx; }
.img-card { width: 130rpx; height: 170rpx; flex-shrink: 0; border-radius: 12rpx; overflow: hidden; background: #f5f7fa; display: flex; align-items: center; justify-content: center; }
.card-img { width: 100%; height: 100%; }
.card-word { font-size: 32rpx; font-weight: bold; color: #4A7BBA; }
.word-scroll { flex: 1; white-space: nowrap; }
.word-chip { display: inline-block; padding: 10rpx 20rpx; border: 2rpx solid #ddd; border-radius: 30rpx; margin-right: 12rpx; font-size: 26rpx; color: #555; }
.word-chip.selected { border-color: #4A7BBA; background: #EBF2FF; color: #4A7BBA; font-weight: 600; }
</style>
