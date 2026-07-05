<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">心理图卡探索</text>
      <text class="hero-sub">通过心理图卡走进内心世界</text>
    </view>

    <view class="sections">
      <!-- 单卡牌组合 -->
      <view class="section">
        <text class="sec-title">🃏 单卡牌组合</text>
        <view class="scene-list">
          <view class="scene-chip" v-for="d in singleDecks" :key="d.name" @click="nav('/pages/ohcard/classic?deck='+encodeURIComponent(d.name),{cat:'single',name:d.name})" :style="{borderColor:d.color}">
            <text class="chip-icon">{{d.icon}}</text>
            <text class="chip-name">{{d.name}}</text>
          </view>
        </view>
      </view>

      <!-- 跨卡牌组合 -->
      <view class="section">
        <text class="sec-title">🔮 跨卡牌组合</text>
        <view class="scene-list">
          <view class="scene-chip" v-for="c in comboPreviews" :key="c.id" @click="nav('/pages/ohcard/combo?id='+c.id,{cat:'combo',id:c.id,name:c.title})" :style="{borderColor:c.color}">
            <text class="chip-icon">{{c.icon}}</text>
            <text class="chip-name">{{c.title}}</text>
          </view>
        </view>
      </view>

      <!-- 场景选卡 -->
      <view class="section">
        <text class="sec-title">🎯 场景选卡</text>
        <view class="scene-list">
          <view class="scene-chip" v-for="s in scenePreviews" :key="s.id" @click="nav('/pages/ohcard/scene?id='+s.id,{cat:'scene',id:s.id,name:s.title})" :style="{borderColor:s.color}">
            <text class="chip-icon">{{s.icon}}</text>
            <text class="chip-name">{{s.title}}</text>
          </view>
        </view>
      </view>

      <!-- 人生困境 -->
      <view class="section">
        <text class="sec-title">🌊 人生困境</text>
        <view class="scene-list">
          <view class="scene-chip" v-for="d in dilemmas" :key="d.id" @click="nav('/pages/ohcard/dilemma?id='+d.id,{cat:'dilemma',id:d.id,name:d.title})" :style="{borderColor:d.color}">
            <text class="chip-icon">{{d.icon}}</text>
            <text class="chip-name">{{d.title}}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="record-btn" @click="uni.navigateTo({url:'/pages/ohcard/record'})">
      <text>📋 查看我的记录</text>
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
  { name: '心理图卡',     icon: '🃏', color: '#4A8A7A' },
  { name: '心理图卡+字卡', icon: '🔤', color: '#3A6E80' },
  { name: '伴侣卡',       icon: '💑', color: '#C06090' },
  { name: '孩童卡·人像',   icon: '🧒', color: '#7B68EE' }
]);

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
  // 从API 获取真实 ID 和顺序（覆盖硬编码的 id）
  try {
    const [combos, scenes, dils] = await Promise.all([
      ohcardApi.presets('combo'),
      ohcardApi.presets('scene'),
      ohcardApi.presets('dilemma')
    ]);
    if (combos?.length) comboPreviews.value = combos.map(p => ({ id:p.id, icon:p.icon, color:p.color, title:p.title, for:p.config?.for }));
    if (scenes?.length) scenePreviews.value = scenes.map(p => ({ id:p.id, icon:p.icon, color:p.color, title:p.title }));
    if (dils?.length) dilemmas.value = dils.map(p => ({ id:p.id, icon:p.icon, color:p.color, title:p.title }));
  } catch {}
  // 按使用量排序
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
.page { min-height:100vh; background:#F5F7F6; padding-bottom:40rpx; }
.hero { background:linear-gradient(135deg,#4A8A7A,#3A6E80); padding:50rpx 32rpx 36rpx; text-align:center; }
.hero-title { color:#fff; font-size:44rpx; font-weight:bold; display:block; }
.hero-sub { color:rgba(255,255,255,.75); font-size:26rpx; margin-top:8rpx; display:block; }

.sections { padding:0 24rpx; }
.section { margin-top:28rpx; background:#fff; border-radius:20rpx; padding:28rpx; }
.sec-title { font-size:30rpx; font-weight:700; color:#1C2A27; display:block; margin-bottom:6rpx; }
.sec-sub { font-size:22rpx; color:#999; display:block; margin-bottom:18rpx; }

/* chips */
.scene-list { display:flex; flex-wrap:wrap; gap:12rpx; }
.scene-chip { display:flex; align-items:center; justify-content:center; gap:8rpx; padding:14rpx 0; border:2rpx solid; border-radius:40rpx; background:#fff; width:calc(33.33% - 8rpx); box-sizing:border-box; }
.chip-icon { font-size:26rpx; flex-shrink:0; }
.chip-name { font-size:22rpx; color:#333; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

.record-btn { display:flex; justify-content:center; margin:24rpx 24rpx 0; padding:24rpx; border:2rpx solid #4A8A7A; border-radius:16rpx; color:#4A8A7A; font-size:28rpx; }
</style>
