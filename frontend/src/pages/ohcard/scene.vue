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
        <view class="card-item" :class="{'card-landscape': c.cat==='彩虹卡'}" v-for="(c,i) in cards" :key="i">
          <text class="card-label">{{c.label}}</text>
          <view class="flip-card" :style="{transform: c.rotate, transition: 'transform 0.21s ease-in-out'}" @click="flip(i)">
            <view v-if="!c.flipped" class="card-back" :style="{background:catStyle(c.cat)}"><text class="back-txt">{{c.cat}}</text></view>
            <view v-else class="card-front" :class="c.word ? 'word-front' : ''">
              <image v-if="c.imageUrl" :src="fullUrl(c.imageUrl)" :mode="c.cat==='彩虹卡'?'aspectFit':'aspectFill'" class="card-img" @click.stop="fsUrl=c.imageUrl" />
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
        <textarea class="note-input" v-model="note" placeholder="写下你的感受..." placeholder-class="note-ph" maxlength="500" />
        <view class="btn-group">
          <view class="btn btn-primary" @click="save()">保存记录</view>
          <view class="btn btn-ghost" @click="uni.navigateTo({url:'/pages/ohcard/record'})">查看抽卡记录</view>
          <view class="btn btn-ghost" @click="uni.navigateBack()">返回抽卡菜单</view>
        </view>
      </view>
    </view>

    <view v-if="fsUrl" class="fs-overlay" @click="fsUrl=''">
      <image :src="fullUrl(fsUrl)" mode="aspectFit" class="fs-img" />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { onLoad, onReady } from '@dcloudio/uni-app';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';

const store = useUserStore();
const step = ref(0), sel = ref(null), cards = ref([]), note = ref(''), fsUrl = ref('');
const allFlipped = computed(() => cards.value.length > 0 && cards.value.every(c => c.flipped));
function fullUrl(u) { return u?.startsWith('http') ? u : SERVER + u; }

const CAT_BACK = 'linear-gradient(135deg,#4A8A7A,#3A6E80)';
function catStyle(cat) { return CAT_BACK; }

const SCENES = ref([
  { id:1, icon:'⚡', color:'#F5A623', title:'今天想获得能量',
    slots:[{catId:8,label:'能量礼物',cat:'彩虹卡'},{catId:7,label:'方向指引',cat:'路标卡'}],
    qs:['彩虹卡上的内容，对你今天有什么触动？','路标卡指向的方向，和你当下想要补充的能量有什么联系？','两张卡放在一起，你注意到什么？'] },
  { id:2, icon:'🌙', color:'#7B68EE', title:'理解一个梦',
    slots:[{catId:1,label:'梦的图像',cat:'OH图卡'},{catId:4,label:'神话原型',cat:'中国神话卡'},{catId:11,label:'情绪底色',cat:'抽象卡'}],
    qs:['OH图卡里的场景，和梦中的某个片段有什么联系？','神话卡上的形象，让你联想到梦里的什么元素？','抽象卡的颜色或线条，和梦里的情绪底色有什么共鸣？'] },
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
        results[idx] = { ...card, label: scene.slots[idx].label, cat: scene.slots[idx].cat, flipped: false, rotate: 'rotateY(0deg)', animating: false };
      });
    }));
    cards.value = results; step.value = 1;
  } catch { uni.showToast({ title: '抽卡失败', icon: 'none' }); }
}

async function flip(i) {
  const card = cards.value[i];
  if (card.flipped || card.animating) return;
  card.animating = true;
  card.rotate = 'rotateY(90deg)';
  await new Promise(r => setTimeout(r, 210));
  card.flipped = true;
  card.rotate = 'rotateY(-90deg)';
  await nextTick();
  card.rotate = 'rotateY(0deg)';
  await new Promise(r => setTimeout(r, 210));
  card.animating = false;
}

async function save() {
  if (!store.isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    setTimeout(() => uni.navigateTo({ url: '/pages/login/index' }), 800);
    return;
  }
  try {
    await ohcardApi.saveRecord({
      type: 'scene',
      data: { scene: { id: sel.value.id, title: sel.value.title }, cards: cards.value.map(c => ({ id:c.id, imageUrl:c.imageUrl, word:c.word, label:c.label, cat:c.cat })) },
      note: note.value
    });
    uni.showToast({ title: '已保存', icon: 'success' });
  } catch(e) {
    if (e?.__authRedirect) return;
    uni.showToast({ title: e?.error || '保存失败', icon: 'none' });
  }
}

function reset() { step.value = 0; sel.value = null; cards.value = []; note.value = ''; }
</script>

<style scoped lang="scss">
.page { min-height:100vh; background:#F5F7F6; padding:36rpx 28rpx 64rpx; }
.page-hint { font-size:24rpx; color:#9BBCB4; display:block; margin-bottom:28rpx; text-align:center; letter-spacing:1rpx; }
.list { display:flex; flex-direction:column; gap:16rpx; }
.scene-card { background:#FFFFFF; border:1rpx solid #E8EFED; border-radius:20rpx; padding:28rpx 30rpx; display:flex; align-items:center; gap:20rpx; box-shadow:0 4rpx 18rpx rgba(28,42,39,0.04); }
.sc-icon { width:80rpx; height:80rpx; border-radius:22rpx; display:flex; align-items:center; justify-content:center; font-size:36rpx; flex-shrink:0; background:#EDF4F0 !important; }
.sc-title { font-size:30rpx; font-weight:600; color:#1C2A27; display:block; }
.sc-tags { font-size:21rpx; color:#9BBCB4; display:block; margin-top:6rpx; }
.sc-info { flex:1; }
.arrow { font-size:40rpx; color:#C4D2CD; }

.draw-head { text-align:center; margin-bottom:32rpx; }
.draw-title { font-size:34rpx; font-weight:600; color:#1C2A27; display:block; font-family:"Noto Serif SC",serif; }
.draw-tip { font-size:22rpx; color:#9BBCB4; display:block; margin-top:12rpx; }
.cards-wrap { display:flex; flex-wrap:wrap; padding:0 8rpx 16rpx; margin-bottom:12rpx; max-width:560rpx; margin-left:auto; margin-right:auto; }

.card-item { display:flex; flex-direction:column; align-items:center; width:31.5%; margin-right:2.75%; margin-bottom:16rpx; }
.card-item:nth-child(3n) { margin-right:0; }
.card-landscape { width:100%; margin-right:0; max-width:500rpx; align-self:center; }
.card-landscape .flip-card { padding-top:66.67%; }
.card-label { font-size:20rpx; color:#617870; margin-bottom:10rpx; text-align:center; line-height:1.4; height:56rpx; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.flip-card { width:100%; padding-top:140%; position:relative; border-radius:14rpx; will-change: transform; }
.card-back, .card-front { position:absolute; top:0; left:0; width:100%; height:100%; border-radius:14rpx; display:flex; align-items:center; justify-content:center; }
.card-back { background:linear-gradient(135deg,#4A8A7A,#3A6E80); box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.18); }
.back-txt { color:rgba(255,255,255,.9); font-size:20rpx; }
.card-front { background:#fff; box-shadow:0 8rpx 26rpx rgba(28,42,39,.12); overflow:hidden; }
.word-front { background:linear-gradient(160deg,#1E3A34,#2C5249) !important; }
.card-img { width:100%; height:100%; }
.word-frame { width:80%; height:80%; border:3rpx solid #C8A84B; border-radius:10rpx; display:flex; align-items:center; justify-content:center; }
.word-char { font-size:56rpx; font-weight:bold; color:#fff; }
.cat-name { font-size:20rpx; color:#B7C6C1; margin-top:8rpx; }

.qs-section { background:#FFFFFF; border:1rpx solid #E8EFED; border-radius:24rpx; padding:34rpx 30rpx; }
.qs-title { font-size:28rpx; font-weight:600; color:#1C2A27; display:block; margin-bottom:24rpx; font-family:"Noto Serif SC",serif; }
.q-item { display:flex; gap:14rpx; margin-bottom:20rpx; }
.q-num { width:38rpx; height:38rpx; border-radius:50%; background:linear-gradient(135deg,#4A8A7A,#3A6E80); color:#fff; font-size:22rpx; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.q-text { font-size:26rpx; color:#4A5751; line-height:1.65; flex:1; }
.note-input { width:100%; min-height:120rpx; background:#F5F7F6; border:1rpx solid #E8EFED; border-radius:16rpx; padding:20rpx 24rpx; font-size:26rpx; color:#1C2A27; box-sizing:border-box; margin-top:16rpx; }
.note-ph { color: #9BBCB4; }
.btn-group { display:flex; flex-direction:column; gap:16rpx; margin-top:28rpx; }
.btn { text-align:center; font-size:28rpx; padding:26rpx 0; border-radius:16rpx; letter-spacing:2rpx; }
.btn-primary { background: linear-gradient(135deg,#4A8A7A,#3A6E80); color:#fff; font-weight:600; box-shadow: 0 8rpx 22rpx rgba(74,138,122,0.24); }
.btn-ghost { background: #FFFFFF; color: #617870; border:1rpx solid #E8EFED; }

.fs-overlay { position:fixed; inset:0; z-index:9999; background:rgba(20,32,29,.94); display:flex; align-items:center; justify-content:center; }
.fs-img { width:100vw; height:90vh; }
</style>
