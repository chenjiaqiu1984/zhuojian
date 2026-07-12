<template>
  <view class="page">
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-content">
        <text class="hero-eyebrow">心理投射工具</text>
        <text class="hero-title">图卡探索</text>
        <text class="hero-sub">让图像成为语言，看见内心深处的声音</text>
      </view>
    </view>

    <view class="content">
      <!-- 单卡牌组合 -->
      <view class="section">
        <view class="sec-header">
          <view class="sec-bar" />
          <text class="sec-title">单卡牌组合</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="d in singleDecks" :key="d.name" @click="navDeck(d)">
            <text class="chip-name">{{d.name}}</text>
          </view>
        </view>
      </view>

      <!-- 跨卡牌组合 -->
      <view class="section">
        <view class="sec-header">
          <view class="sec-bar" />
          <text class="sec-title">跨卡牌组合</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="c in comboPreviews" :key="c.id"
            @click="nav('/pages/ohcard/combo?id='+c.id,{cat:'combo',id:c.id,name:c.title})">
            <text class="chip-name">{{c.title}}</text>
            <text v-if="c.for" class="chip-sub">{{c.for}}</text>
          </view>
        </view>
      </view>

      <!-- 场景选卡 -->
      <view class="section">
        <view class="sec-header">
          <view class="sec-bar" />
          <text class="sec-title">场景选卡</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="s in scenePreviews" :key="s.id"
            @click="nav('/pages/ohcard/scene?id='+s.id,{cat:'scene',id:s.id,name:s.title})">
            <text class="chip-name">{{s.title}}</text>
          </view>
        </view>
      </view>

      <!-- 人生困境 -->
      <view class="section">
        <view class="sec-header">
          <view class="sec-bar" />
          <text class="sec-title">人生困境</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="d in dilemmas" :key="d.id"
            @click="nav('/pages/ohcard/dilemma?id='+d.id,{cat:'dilemma',id:d.id,name:d.title})">
            <text class="chip-name">{{d.title}}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="record-entry" @click="uni.navigateTo({url:'/pages/ohcard/record'})">
      <text class="record-label">查看我的记录</text>
      <text class="record-arrow">›</text>
    </view>
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { track } from '../../utils/track';
import { SERVER } from '../../config';
import { ohcardApi } from '../../api/index';

function nav(url, trackData) {
  track('ohcard_open', '/pages/ohcard/index', trackData);
  uni.navigateTo({ url });
}

const singleDecks = ref([
  { name: '心理图卡',     icon: '🃏', color: '#4A8A7A', imgCatId: null, wordCatId: null },
  { name: '心理图卡+字卡', icon: '🔤', color: '#3A6E80', imgCatId: null, wordCatId: null },
  { name: '伴侣卡',       icon: '💑', color: '#C06090', imgCatId: null, wordCatId: null },
  { name: '孩童卡·人像',   icon: '🧒', color: '#7B68EE', imgCatId: null, wordCatId: null }
]);

function navDeck(d) {
  const params = `deck=${encodeURIComponent(d.name)}`
    + (d.imgCatId  ? `&imgCatId=${d.imgCatId}`  : '')
    + (d.wordCatId ? `&wordCatId=${d.wordCatId}` : '');
  nav(`/pages/ohcard/classic?${params}`, { cat: 'single', name: d.name });
}

const comboPreviews = ref([
  { id:1, icon:'🧒', color:'#7B68EE', title:'内在小孩深度疗愈', for:'悲伤·焦虑·自我价值' },
  { id:2, icon:'🧭', color:'#4A7BBA', title:'人生方向迷茫导航', for:'职业转折·重大决策' },
  { id:3, icon:'💑', color:'#C06090', title:'亲密关系模式探索', for:'关系冲突·理解伴侣' },
  { id:4, icon:'👨‍👩‍👧', color:'#4A8A7A', title:'亲子关系代际传递', for:'父母成长·理解孩子' },
  { id:5, icon:'🎨', color:'#E07040', title:'情绪解码身体觉察', for:'说不清的情绪·压力' },
  { id:6, icon:'🏔️', color:'#5A6EA0', title:'人生故事重构', for:'丧失重建·寻找意义' }
]);

const scenePreviews = ref([
  { id:1, icon:'⚡', color:'#F5A623', title:'今天想获得能量' },
  { id:2, icon:'🌙', color:'#7B68EE', title:'理解一个梦' },
  { id:3, icon:'💔', color:'#E05070', title:'和伴侣吵架后' },
  { id:4, icon:'🤯', color:'#4A8A7A', title:'孩子让我崩溃' },
  { id:5, icon:'🔄', color:'#5A6EA0', title:'要不要换工作' },
  { id:6, icon:'🌱', color:'#6A8A5A', title:'童年影响了我' },
  { id:7, icon:'📅', color:'#8A5A7A', title:'做年度复盘' }
]);

const dilemmas = ref([
  { id:1,  icon:'🔄', color:'#5A6EA0', title:'想改变却动不了' },
  { id:2,  icon:'💔', color:'#C06090', title:'关系里的重复' },
  { id:3,  icon:'🎭', color:'#E07040', title:'成功却感觉空虚' },
  { id:4,  icon:'🤲', color:'#4A8A7A', title:'照顾者的枯竭' },
  { id:5,  icon:'🚪', color:'#7B68EE', title:'害怕被抛弃' },
  { id:6,  icon:'⚖️', color:'#3A6E80', title:'做很多却不够好' },
  { id:7,  icon:'🌀', color:'#8A5A7A', title:'不知道我是谁' },
  { id:8,  icon:'🔥', color:'#D4603A', title:'愤怒不敢表达' },
  { id:9,  icon:'🕊️', color:'#6A8A5A', title:'想原谅却做不到' },
  { id:10, icon:'🌑', color:'#4A4A6A', title:'感觉没有意义' }
]);

onMounted(async () => {
  track('page_view', '/pages/ohcard/index');
  try {
    const [combos, scenes, dils, cats, singles] = await Promise.all([
      ohcardApi.presets('combo'),
      ohcardApi.presets('scene'),
      ohcardApi.presets('dilemma'),
      ohcardApi.categories(),
      ohcardApi.presets('single'),
    ]);
    if (combos?.length) comboPreviews.value = combos.map(p => ({ id:p.id, icon:p.icon, color:p.color, title:p.title, for:p.config?.for }));
    if (scenes?.length) scenePreviews.value = scenes.map(p => ({ id:p.id, icon:p.icon, color:p.color, title:p.title }));
    if (dils?.length) dilemmas.value = dils.map(p => ({ id:p.id, icon:p.icon, color:p.color, title:p.title }));
    if (singles?.length) {
      singleDecks.value = singles.map(p => ({
        name: p.title, icon: p.icon, color: p.color,
        imgCatId: p.config?.imgCatId || null,
        wordCatId: p.config?.wordCatId || null
      }));
    } else if (cats?.length) {
      const imgCats = cats.filter(c => c.type === 'image');
      singleDecks.value = singleDecks.value.map(d => {
        const cat = imgCats.find(c => c.name === d.name);
        if (!cat) return d;
        return { ...d, imgCatId: cat.imgSrcCatId || cat.id, wordCatId: cat.wordCatId || null };
      });
    }
  } catch {}
  uni.request({
    url: `${SERVER}/api/analytics/ohcard-ranks`,
    method: 'GET',
    success: ({ data }) => {
      if (!Array.isArray(data)) return;
      const cnt = (cat, id, name) => (data.find(x => x.cat === cat && (String(x.id) === String(id) || x.name === name))?.count || 0);
      singleDecks.value.sort((a, b) => cnt('single', null, b.name) - cnt('single', null, a.name));
      comboPreviews.value.sort((a, b) => cnt('combo', b.id) - cnt('combo', a.id));
      scenePreviews.value.sort((a, b) => cnt('scene', b.id) - cnt('scene', a.id));
      dilemmas.value.sort((a, b) => cnt('dilemma', b.id) - cnt('dilemma', a.id));
    }
  });
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #F5F7F6;
  padding-bottom: 88rpx;
}

/* ---- Hero ---- */
.hero {
  position: relative;
  padding: 96rpx 48rpx 72rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #4A8A7A 0%, #3A6E80 100%);
}

.hero-glow {
  position: absolute;
  top: -160rpx;
  right: -120rpx;
  width: 560rpx;
  height: 480rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, transparent 66%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.34em;
  color: rgba(255,255,255,0.72);
  margin-bottom: 28rpx;
}

.hero-title {
  display: block;
  font-size: 66rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 0.06em;
  line-height: 1.18;
  margin-bottom: 24rpx;
  font-family: "Noto Serif SC", serif;
}

.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.82);
  line-height: 1.9;
  letter-spacing: 0.03em;
}

/* ---- Sections ---- */
.content {
  padding: 0 28rpx;
  display: flex;
  flex-direction: column;
  gap: 52rpx;
  margin-top: 44rpx;
}

.sec-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
  padding-left: 2rpx;
}

.sec-bar {
  width: 6rpx;
  height: 30rpx;
  border-radius: 4rpx;
  flex-shrink: 0;
  background: #4A8A7A;
}

.sec-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1C2A27;
  letter-spacing: 0.04em;
  font-family: "Noto Serif SC", serif;
}

/* ---- Card grid ---- */
.card-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.card-chip {
  width: 48.6%;
  box-sizing: border-box;
  margin-bottom: 18rpx;
  padding: 32rpx 28rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8EFED;
  box-shadow: 0 4rpx 18rpx rgba(28,42,39,0.04);
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  transition: transform 0.15s ease;
}

.card-chip:active {
  transform: scale(0.98);
}

.chip-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #1C2A27;
  line-height: 1.5;
  display: block;
  letter-spacing: 0.01em;
}

.chip-sub {
  font-size: 19rpx;
  color: #9BBCB4;
  line-height: 1.45;
  display: block;
}

/* ---- Record entry ---- */
.record-entry {
  margin: 56rpx 28rpx 0;
  padding: 34rpx 36rpx;
  border: 1rpx solid #E8EFED;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #FFFFFF;
}

.record-label {
  font-size: 27rpx;
  color: #617870;
  letter-spacing: 0.04em;
}

.record-arrow {
  font-size: 40rpx;
  color: #4A8A7A;
  line-height: 1;
}
</style>
