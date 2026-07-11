<template>
  <view class="page">
    <!-- 场景列表 -->
    <view v-if="step===0" class="list">
      <text class="page-hint">选择你当前的状态，快速组合卡牌</text>
      <view class="scene-card" v-for="s in SCENES" :key="s.id" @click="start(s)">
        <view class="sc-icon" :style="{background:s.color}"><text>{{s.icon}}</text></view>
        <view class="sc-info">
          <text class="sc-title">{{s.title}}</text>
          <text class="sc-tags">{{s.slots.map(x=>x.cat).join(' + ')}} · {{s.slots.length}}张</text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <!-- 抽卡展示 -->
    <view v-if="step===1" class="draw">
      <view class="draw-head">
        <text class="draw-title">{{sel.icon}} {{sel.title}}</text>
        <text class="draw-tip">点击翻转每张卡牌</text>
      </view>
      <view class="cards-wrap">
        <view class="card-item" v-for="(c,i) in cards" :key="i">
          <text class="card-label">{{c.label}}</text>
          <view class="flip-card" @click="flip(i)">
            <view v-if="!c.flipped" class="card-back" :style="{background:catStyle(c.cat)}"><text class="back-txt">{{c.cat}}</text></view>
            <view v-else class="card-front" :class="c.word ? 'word-front' : ''">
              <image v-if="c.imageUrl" :src="fullUrl(c.imageUrl)" mode="aspectFill" class="card-img" @click.stop="fsUrl=c.imageUrl" />
              <view v-else class="word-frame"><text class="word-char">{{c.word}}</text></view>
            </view>
          </view>
          <text class="cat-name">{{c.cat}}</text>
        </view>
      </view>

      <view v-if="allFlipped" class="qs-section">
        <text class="qs-title">翻开卡牌后</text>
        <view class="q-item" v-for="(q,i) in sel.qs" :key="i">
          <text class="q-num">{{i+1}}</text>
          <text class="q-text">{{q}}</text>
        </view>
        <textarea class="note-input" v-model="note" placeholder="写下你的感受..." maxlength="500" />
        <view class="btn-group">
          <u-button type="primary" @click="save">保存记录</u-button>
          <u-button plain @click="uni.navigateTo({url:'/pages/ohcard/record'})">查看抽卡记录</u-button>
          <u-button plain @click="uni.navigateBack()">返回抽卡菜单</u-button>
        </view>
      </view>
    </view>

    <view v-if="fsUrl" class="fs-overlay" @click="fsUrl=''">
      <image :src="fullUrl(fsUrl)" mode="aspectFit" class="fs-img" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onReady } from '@dcloudio/uni-app';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';

const store = useUserStore();
const step = ref(0), sel = ref(null), cards = ref([]), note = ref(''), fsUrl = ref('');
const allFlipped = computed(() => cards.value.length > 0 && cards.value.every(c => c.flipped));
function fullUrl(u) { return u?.startsWith('http') ? u : SERVER + u; }

const CAT_STYLE = {
  'OH图卡':'linear-gradient(135deg,#4A7BBA,#7B68EE)','OH字卡':'linear-gradient(135deg,#0f2044,#1a3a6b)',
  '孩童卡·人像':'linear-gradient(135deg,#7B68EE,#B580E0)','孩童卡·情况':'linear-gradient(135deg,#6A5ACD,#9370DB)',
  '路标卡':'linear-gradient(135deg,#5A6EA0,#3A6E80)','彩虹卡':'linear-gradient(135deg,#E07040,#F5A623)',
  '伴侣卡':'linear-gradient(135deg,#C06090,#E06090)',
  '中国神话卡':'linear-gradient(135deg,#8A5A7A,#C06090)','抽象卡':'linear-gradient(135deg,#4A4A6A,#6A6A8A)',
  '英雄之旅故事卡':'linear-gradient(135deg,#5A6EA0,#8A5A7A)',
};
function catStyle(cat) { return CAT_STYLE[cat] || 'linear-gradient(135deg,#4A7BBA,#7B68EE)'; }

const SCENES = ref([
  { id:1, icon:'⚡', color:'#F5A623', title:'今天想获得能量',
    slots:[{catId:8,label:'能量礼物',cat:'彩虹卡'},{catId:7,label:'方向指引',cat:'路标卡'}],
    qs:['这两张卡放在一起，你注意到什么？','其中有没有什么让你感到意外的？','如果今天只做一件事来补充能量，你想到了什么？'] },
  { id:2, icon:'🌙', color:'#7B68EE', title:'理解一个梦',
    slots:[{catId:1,label:'梦的图像',cat:'OH图卡'},{catId:4,label:'神话原型',cat:'中国神话卡'},{catId:11,label:'情绪底色',cat:'抽象卡'}],
    qs:['三张卡和你的梦有什么联系，哪怕是细微的？','梦里最让你印象深刻的部分是什么？','如果这个梦想传递一个信息，可能是什么？'] },
  { id:3, icon:'💔', color:'#E05070', title:'和伴侣吵架后',
    slots:[{catId:6,label:'我',cat:'伴侣卡'},{catId:6,label:'对方',cat:'伴侣卡'},{catId:10,label:'我们的互动姿态',cat:'孩童卡·情况'},{catId:8,label:'这段关系需要的祝福',cat:'彩虹卡'}],
    qs:['代表你和对方的两张卡，它们的关系让你联想到什么？','孩童卡上的互动姿态，在你们关系里有没有熟悉的感觉？','彩虹卡出现在这里，你有什么感受？'] },
  { id:4, icon:'🤯', color:'#4A8A7A', title:'孩子让我崩溃',
    slots:[{catId:10,label:'我们的互动情况',cat:'孩童卡·情况'},{catId:9,label:'孩子的感受',cat:'孩童卡·人像'},{catId:2,label:'核心议题',cat:'OH字卡'}],
    qs:['这个互动情况让你想到什么？','如果孩子的感受卡会说话，它会说什么？','字卡和这件事有什么联系？'] },
  { id:5, icon:'🔄', color:'#5A6EA0', title:'要不要换工作',
    slots:[{catId:7,label:'我现在的位置',cat:'路标卡'},{catId:7,label:'我看到的方向',cat:'路标卡'},{catId:12,label:'这段旅程的礼物',cat:'英雄之旅故事卡'},{catId:2,label:'隐藏主题',cat:'OH字卡'}],
    qs:['两张路标卡，哪张让你更有感觉？','旅程这张卡如果是你现在的处境，你在故事的哪个阶段？','字卡出现在这里，你的第一反应是什么？'] },
  { id:6, icon:'🌱', color:'#6A8A5A', title:'感觉童年影响了我',
    slots:[{catId:9,label:'内在小孩',cat:'孩童卡·人像'},{catId:4,label:'家族原型',cat:'中国神话卡'},{catId:1,label:'我携带的资源',cat:'OH图卡'}],
    qs:['孩童卡上的形象，让你联想到什么时候的自己？','神话卡和你的成长背景有什么联系？','OH卡上的场景，你有什么感受？'] },
  { id:7, icon:'📅', color:'#8A5A7A', title:'做年度复盘',
    slots:[{catId:12,label:'过去',cat:'英雄之旅故事卡'},{catId:12,label:'现在',cat:'英雄之旅故事卡'},{catId:12,label:'未来',cat:'英雄之旅故事卡'},{catId:7,label:'方向指引',cat:'路标卡'},{catId:8,label:'祝福与礼物',cat:'彩虹卡'}],
    qs:['三张故事卡连起来，今年是一个什么样的故事？','路标卡指向的方向，你感到期待还是担忧？','彩虹卡作为礼物出现，它想给你什么？'] }
]);

let _pendingId = null;
onLoad(opts => { if (opts?.id) _pendingId = Number(opts.id); });
onReady(async () => {
  try {
    const data = await ohcardApi.presets('scene');
    if (data?.length) SCENES.value = data.map(p => ({ id:p.id, title:p.title, icon:p.icon, color:p.color, ...p.config }));
  } catch {}
  if (_pendingId) {
    const found = SCENES.value.find(s => s.id === _pendingId);
    _pendingId = null;
    if (found) start(found);
  }
});

async function start(scene) {
  sel.value = scene; note.value = '';
  const grouped = {};
  scene.slots.forEach((s, i) => {
    if (!grouped[s.catId]) grouped[s.catId] = { catId: s.catId, indices: [] };
    grouped[s.catId].indices.push(i);
  });
  try {
    const results = new Array(scene.slots.length);
    await Promise.all(Object.values(grouped).map(async g => {
      const res = await ohcardApi.cards({ category_id: g.catId, count: g.indices.length });
      g.indices.forEach((idx, i) => {
        const card = res[i % res.length];
        results[idx] = { ...card, label: scene.slots[idx].label, cat: scene.slots[idx].cat, flipped: false };
      });
    }));
    cards.value = results; step.value = 1;
  } catch { uni.showToast({ title: '抽卡失败', icon: 'none' }); }
}

function flip(i) { if (!cards.value[i].flipped) cards.value[i].flipped = true; }

async function save() {
  if (!store.isLoggedIn()) return uni.navigateTo({ url: '/pages/login/index' });
  try {
    await ohcardApi.saveRecord({
      type: 'scene',
      data: { scene: { id: sel.value.id, title: sel.value.title }, cards: cards.value.map(c => ({ id:c.id, imageUrl:c.imageUrl, word:c.word, label:c.label, cat:c.cat })) },
      note: note.value
    });
    uni.showToast({ title: '已保存' });
  } catch { uni.showToast({ title: '保存失败', icon: 'none' }); }
}

function reset() { step.value = 0; sel.value = null; cards.value = []; note.value = ''; }
</script>

<style scoped lang="scss">
.page { min-height:100vh; background:#F5F7F6; padding:24rpx; }
.page-hint { font-size:24rpx; color:#999; display:block; margin-bottom:20rpx; text-align:center; }
.list { display:flex; flex-direction:column; gap:16rpx; }
.scene-card { background:#fff; border-radius:20rpx; padding:24rpx 28rpx; display:flex; align-items:center; gap:20rpx; }
.sc-icon { width:72rpx; height:72rpx; border-radius:18rpx; display:flex; align-items:center; justify-content:center; font-size:32rpx; flex-shrink:0; }
.sc-title { font-size:30rpx; font-weight:600; color:#1C2A27; display:block; }
.sc-tags { font-size:21rpx; color:#aaa; display:block; margin-top:4rpx; }
.sc-info { flex:1; }
.arrow { font-size:40rpx; color:#ccc; }

.draw { }
.draw-head { text-align:center; margin-bottom:24rpx; }
.draw-title { font-size:32rpx; font-weight:700; color:#1C2A27; display:block; }
.draw-tip { font-size:22rpx; color:#999; display:block; margin-top:8rpx; }
.cards-wrap { display:flex; flex-wrap:wrap; gap:16rpx; padding:0 8rpx 16rpx; margin-bottom:12rpx; }

.card-item { display:flex; flex-direction:column; align-items:center; width:calc((100% - 32rpx) / 3); }
.card-label { font-size:20rpx; color:#666; margin-bottom:8rpx; text-align:center; line-height:1.4; height:56rpx; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.flip-card { width:100%; height:260rpx; position:relative; border-radius:14rpx; }
.card-back, .card-front { width:100%; height:100%; border-radius:14rpx; display:flex; align-items:center; justify-content:center; }
.card-back { background:linear-gradient(135deg,#4A7BBA,#7B68EE); }
.back-txt { color:rgba(255,255,255,.8); font-size:20rpx; }
.card-front { background:#fff; box-shadow:0 4rpx 16rpx rgba(0,0,0,.12); overflow:hidden; }
.word-front { background:linear-gradient(160deg,#0f2044,#1a3a6b) !important; }
.card-img { width:100%; height:100%; }
.word-frame { width:80%; height:80%; border:3rpx solid #c8a84b; border-radius:10rpx; display:flex; align-items:center; justify-content:center; }
.word-char { font-size:56rpx; font-weight:bold; color:#fff; }
.cat-name { font-size:20rpx; color:#aaa; margin-top:8rpx; }

.qs-section { background:#fff; border-radius:20rpx; padding:28rpx; }
.qs-title { font-size:28rpx; font-weight:700; color:#333; display:block; margin-bottom:20rpx; }
.q-item { display:flex; gap:14rpx; margin-bottom:18rpx; }
.q-num { width:36rpx; height:36rpx; border-radius:50%; background:#4A7BBA; color:#fff; font-size:22rpx; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.q-text { font-size:26rpx; color:#555; line-height:1.6; flex:1; }
.note-input { width:100%; min-height:120rpx; background:#F8F9FA; border:2rpx solid #eee; border-radius:12rpx; padding:16rpx; font-size:26rpx; color:#333; box-sizing:border-box; margin-top:16rpx; }
.btn-group { display:flex; flex-direction:column; gap:16rpx; margin-top:24rpx; }

.fs-overlay { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,.92); display:flex; align-items:center; justify-content:center; }
.fs-img { width:100vw; height:90vh; }
</style>
