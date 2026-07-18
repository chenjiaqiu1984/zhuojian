<template>
  <view class="page">
    <view class="hero">
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
          <text class="sec-title">单卡牌组合</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="d in visibleSingle" :key="d.name" @click="navDeck(d)">
            <view class="chip-icon"><ZjIcon :name="d.icon" :size="40" color="#4A8A7A" /></view>
            <view class="chip-body">
              <text class="chip-name">{{d.name}}</text>
              <text v-if="d.sub" class="chip-sub">{{d.sub}}</text>
            </view>
          </view>
        </view>
        <view v-if="singleDecks.length > PAGE_SIZE && !showAllSingle" class="more-btn" @click="showAllSingle=true">
          <text class="more-text">查看更多（{{singleDecks.length - PAGE_SIZE}}个）</text>
          <text class="more-arrow">↓</text>
        </view>
      </view>

      <!-- 跨卡牌组合 -->
      <view class="section">
        <view class="sec-header">
          <text class="sec-title">跨卡牌组合</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="c in visibleCombo" :key="c.id"
            @click="nav('/pages/ohcard/combo?id='+c.id,{cat:'combo',id:c.id,name:c.title})">
            <view class="chip-icon"><ZjIcon :name="c.icon" :size="40" color="#4A8A7A" /></view>
            <view class="chip-body">
              <text class="chip-name">{{c.title}}</text>
              <text v-if="c.for" class="chip-sub">{{c.for}}</text>
            </view>
          </view>
        </view>
        <view v-if="comboPreviews.length > PAGE_SIZE && !showAllCombo" class="more-btn" @click="showAllCombo=true">
          <text class="more-text">查看更多（{{comboPreviews.length - PAGE_SIZE}}个）</text>
          <text class="more-arrow">↓</text>
        </view>
      </view>

      <!-- 场景选卡 -->
      <view class="section">
        <view class="sec-header">
          <text class="sec-title">场景选卡</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="s in visibleScene" :key="s.id"
            @click="nav('/pages/ohcard/scene?id='+s.id,{cat:'scene',id:s.id,name:s.title})">
            <view class="chip-icon"><ZjIcon :name="s.icon" :size="40" color="#4A8A7A" /></view>
            <view class="chip-body">
              <text class="chip-name">{{s.title}}</text>
              <text v-if="s.sub" class="chip-sub">{{s.sub}}</text>
            </view>
          </view>
        </view>
        <view v-if="scenePreviews.length > PAGE_SIZE && !showAllScene" class="more-btn" @click="showAllScene=true">
          <text class="more-text">查看更多（{{scenePreviews.length - PAGE_SIZE}}个）</text>
          <text class="more-arrow">↓</text>
        </view>
      </view>

      <!-- 人生困境 -->
      <view class="section">
        <view class="sec-header">
          <text class="sec-title">人生困境</text>
        </view>
        <view class="card-grid">
          <view class="card-chip" v-for="d in visibleDilemma" :key="d.id"
            @click="nav('/pages/ohcard/dilemma?id='+d.id,{cat:'dilemma',id:d.id,name:d.title})">
            <view class="chip-icon"><ZjIcon :name="d.icon" :size="40" color="#4A8A7A" /></view>
            <view class="chip-body">
              <text class="chip-name">{{d.title}}</text>
              <text v-if="d.sub" class="chip-sub">{{d.sub}}</text>
            </view>
          </view>
        </view>
        <view v-if="dilemmas.length > PAGE_SIZE && !showAllDilemma" class="more-btn" @click="showAllDilemma=true">
          <text class="more-text">查看更多（{{dilemmas.length - PAGE_SIZE}}个）</text>
          <text class="more-arrow">↓</text>
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
import { onMounted, ref, computed } from 'vue';
import { track } from '../../utils/track';
import { SERVER } from '../../config';
import { ohcardApi } from '../../api/index';
import ZjIcon from '../../components/ZjIcon.vue';

// #ifndef H5
defineOptions({
  onShareAppMessage() {
    return { title: '卓见心理图卡 — 让图像成为语言，看见内心深处的声音', path: '/pages/ohcard/index' };
  },
  onShareTimeline() {
    return { title: '卓见心理图卡 — 探索内心世界的投射工具' };
  },
});
// #endif

const PAGE_SIZE = 8;
const showAllSingle  = ref(false);
const showAllCombo   = ref(false);
const showAllScene   = ref(false);
const showAllDilemma = ref(false);

function nav(url, trackData) {
  track('ohcard_open', '/pages/ohcard/index', trackData);
  uni.navigateTo({ url });
}

const singleDecks = ref([
  { name: '心理图卡',     icon: '🃏', color: '#4A8A7A', imgCatId: null, wordCatId: null, sub: '图像投射·自由联想' },
  { name: '心理图卡+字卡', icon: '🔤', color: '#3A6E80', imgCatId: null, wordCatId: null, sub: '图像+词语·双重联想' },
  { name: '伴侣卡',       icon: '💑', color: '#C06090', imgCatId: null, wordCatId: null, sub: '关系探索·亲密连接' },
  { name: '孩童卡·人像',   icon: '🧒', color: '#7B68EE', imgCatId: null, wordCatId: null, sub: '内在小孩·情感觉察' }
]);

function navDeck(d) {
  const params = `deck=${encodeURIComponent(d.name)}`
    + (d.imgCatId  ? `&imgCatId=${d.imgCatId}`  : '')
    + (d.wordCatId ? `&wordCatId=${d.wordCatId}` : '');
  nav(`/pages/ohcard/classic?${params}`, { cat: 'single', name: d.name });
}

const comboPreviews = ref([
  { id:1,  icon:'🧒', color:'#7B68EE', title:'内在小孩深度疗愈',   for:'悲伤·焦虑·自我价值' },
  { id:2,  icon:'🧭', color:'#4A7BBA', title:'人生方向迷茫导航',   for:'职业转折·重大决策' },
  { id:3,  icon:'💑', color:'#C06090', title:'亲密关系模式探索',   for:'关系冲突·理解伴侣' },
  { id:4,  icon:'👨‍👩‍👧', color:'#4A8A7A', title:'亲子关系代际传递', for:'父母成长·理解孩子' },
  { id:5,  icon:'🎨', color:'#E07040', title:'情绪解码身体觉察',   for:'说不清的情绪·压力' },
  { id:6,  icon:'🏔️', color:'#5A6EA0', title:'人生故事重构',       for:'丧失重建·寻找意义' },
  { id:7,  icon:'🌊', color:'#3A8AAA', title:'创伤后的自我修复',   for:'创伤疗愈·重建安全感' },
  { id:8,  icon:'🧩', color:'#7A5AB0', title:'内在批评者对话',     for:'自我攻击·完美主义' },
  { id:9,  icon:'🌺', color:'#C05A7A', title:'女性生命力探索',     for:'自我接纳·力量重连' },
  { id:10, icon:'🦁', color:'#C07A30', title:'男性气质与柔软',     for:'情感表达·阳性整合' },
  { id:11, icon:'🌿', color:'#5A8A60', title:'身体与情绪连接',     for:'躯体化·压力释放' },
  { id:12, icon:'🔮', color:'#5A4A8A', title:'未来自我对话',       for:'目标探索·内在资源' },
]);

const scenePreviews = ref([
  { id:1,  icon:'⚡', color:'#F5A623', title:'今天想获得能量',     sub:'补充动力·找回方向' },
  { id:2,  icon:'🌙', color:'#7B68EE', title:'理解一个梦',         sub:'梦境解读·潜意识探索' },
  { id:3,  icon:'💔', color:'#E05070', title:'和伴侣吵架后',       sub:'关系修复·重建连接' },
  { id:4,  icon:'🤯', color:'#4A8A7A', title:'孩子让我崩溃',       sub:'亲子觉察·情绪疏导' },
  { id:5,  icon:'🔄', color:'#5A6EA0', title:'要不要换工作',       sub:'职业决策·内在导航' },
  { id:6,  icon:'🌱', color:'#6A8A5A', title:'童年影响了我',       sub:'代际疗愈·资源发现' },
  { id:7,  icon:'📅', color:'#8A5A7A', title:'做年度复盘',         sub:'回顾过去·展望未来' },
  { id:8,  icon:'😰', color:'#4A6A9A', title:'面临一个重要选择',   sub:'决策支持·内在清晰' },
  { id:9,  icon:'🤒', color:'#8A6A4A', title:'身体有些不舒服',     sub:'身心连接·情绪觉察' },
  { id:10, icon:'🧳', color:'#5A7A8A', title:'结束一段关系',       sub:'告别哀伤·重新出发' },
  { id:11, icon:'🎓', color:'#6A5A9A', title:'完成了一个里程碑',   sub:'庆祝整合·意义沉淀' },
  { id:12, icon:'😶', color:'#7A7A6A', title:'感觉麻木说不出来',   sub:'情绪唤醒·内在接触' },
]);

const dilemmas = ref([
  { id:1,  icon:'🔄', color:'#5A6EA0', title:'想改变却动不了',     sub:'内在冲突·行动障碍' },
  { id:2,  icon:'💔', color:'#C06090', title:'关系里的重复',       sub:'强迫重复·依恋模式' },
  { id:3,  icon:'🎭', color:'#E07040', title:'成功却感觉空虚',     sub:'外在成就·内在失落' },
  { id:4,  icon:'🤲', color:'#4A8A7A', title:'照顾者的枯竭',       sub:'讨好模式·边界缺失' },
  { id:5,  icon:'🚪', color:'#7B68EE', title:'害怕被抛弃',         sub:'回避依恋·渴望连接' },
  { id:6,  icon:'⚖️', color:'#3A6E80', title:'做很多却不够好',     sub:'完美主义·内在批评' },
  { id:7,  icon:'🌀', color:'#8A5A7A', title:'不知道我是谁',       sub:'身份危机·自我重构' },
  { id:8,  icon:'🔥', color:'#D4603A', title:'愤怒不敢表达',       sub:'情绪压抑·边界守护' },
  { id:9,  icon:'🕊️', color:'#6A8A5A', title:'想原谅却做不到',    sub:'背叛创伤·释放执念' },
  { id:10, icon:'🌑', color:'#4A4A6A', title:'感觉没有意义',       sub:'存在空虚·意义重建' },
  { id:11, icon:'🪞', color:'#6A4A7A', title:'讨厌镜子里的自己',   sub:'身体形象·自我接纳' },
  { id:12, icon:'🏃', color:'#7A5A3A', title:'停不下来又累又空',   sub:'强迫忙碌·内在逃避' },
  { id:13, icon:'🤐', color:'#4A6A5A', title:'有话说不出口',       sub:'沟通障碍·内心壁垒' },
  { id:14, icon:'🌫️', color:'#6A7A8A', title:'对未来感到恐惧',    sub:'焦虑预期·当下锚定' },
]);

const visibleSingle  = computed(() => showAllSingle.value  ? singleDecks.value   : singleDecks.value.slice(0, PAGE_SIZE));
const visibleCombo   = computed(() => showAllCombo.value   ? comboPreviews.value  : comboPreviews.value.slice(0, PAGE_SIZE));
const visibleScene   = computed(() => showAllScene.value   ? scenePreviews.value  : scenePreviews.value.slice(0, PAGE_SIZE));
const visibleDilemma = computed(() => showAllDilemma.value ? dilemmas.value       : dilemmas.value.slice(0, PAGE_SIZE));

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
    if (scenes?.length) scenePreviews.value = scenes.map(p => {
      const local = scenePreviews.value.find(s => s.id === p.id);
      return { id:p.id, icon:p.icon, color:p.color, title:p.title, sub: p.config?.sub || local?.sub };
    });
    if (dils?.length) dilemmas.value = dils.map(p => {
      const local = dilemmas.value.find(d => d.id === p.id);
      return { id:p.id, icon:p.icon, color:p.color, title:p.title, sub: p.config?.sub || local?.sub };
    });
    if (singles?.length) {
      singleDecks.value = singles.map(p => {
        const local = singleDecks.value.find(d => d.name === p.title);
        return {
          name: p.title, icon: p.icon, color: p.color,
          imgCatId: p.config?.imgCatId || null,
          wordCatId: p.config?.wordCatId || null,
          sub: p.config?.sub || local?.sub || null
        };
      });
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
  background: $zj-bg;
  padding-bottom: 88rpx;
}

/* ---- Hero ---- */
.hero {
  padding: 96rpx 48rpx 72rpx;
  background: $zj-teal;
}

.hero-content {
  text-align: left;
}

.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.34em;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 28rpx;
}

.hero-title {
  display: block;
  font-size: 66rpx;
  font-weight: 600;
  color: $zj-surface;
  letter-spacing: 0.06em;
  line-height: 1.18;
  margin-bottom: 24rpx;
  font-family: $zj-font-serif;
}

.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.82);
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

/* 最后一个区块前加大间距，打破均等节奏 */
.section:last-child {
  margin-top: 28rpx;
}

.sec-header {
  margin-bottom: 28rpx;
  padding-left: 2rpx;
}

.sec-title {
  font-size: 34rpx;
  font-weight: 600;
  color: $zj-text-1;
  letter-spacing: 0.04em;
  font-family: $zj-font-serif;
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
  padding: 28rpx 24rpx;
  border-radius: $zj-radius-card;
  background: $zj-surface;
  border: 1rpx solid $zj-border;
  box-shadow: $zj-shadow-card;
  display: flex;
  align-items: center;
  gap: 20rpx;
  transition: transform 120ms $zj-ease-out;

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid $zj-teal;
    outline-offset: 2px;
  }
}

.chip-icon {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  background: $zj-teal-light;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chip-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.chip-name {
  font-size: 26rpx;
  font-weight: 600;
  color: $zj-text-1;
  line-height: 1.4;
  display: block;
  letter-spacing: 0.01em;
}

.chip-sub {
  font-size: 19rpx;
  color: $zj-muted;
  line-height: 1.4;
  display: block;
}

/* ---- More button ---- */
.more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin-top: 4rpx;
  padding: 24rpx 0;
  border: 1rpx dashed $zj-border;
  border-radius: 20rpx;
  background: rgba(74, 138, 122, 0.03);

  &:focus-visible {
    outline: 2px solid $zj-teal;
    outline-offset: 2px;
  }
}

.more-text {
  font-size: 24rpx;
  color: $zj-text-2;
}

.more-arrow {
  font-size: 22rpx;
  color: $zj-muted;
}

/* ---- Record entry ---- */
.record-entry {
  margin: 56rpx 28rpx 0;
  padding: 34rpx 36rpx;
  border: 1rpx solid $zj-border;
  border-radius: $zj-radius-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: $zj-surface;

  &:focus-visible {
    outline: 2px solid $zj-teal;
    outline-offset: 2px;
  }
}

.record-label {
  font-size: 27rpx;
  color: $zj-text-2;
  letter-spacing: 0.04em;
}

.record-arrow {
  font-size: 40rpx;
  color: $zj-teal;
  line-height: 1;
}
</style>
