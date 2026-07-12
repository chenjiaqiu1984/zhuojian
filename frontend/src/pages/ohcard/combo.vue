<template>
  <view class="page">
    <!-- 列表 -->
    <view v-if="step===0" class="list">
      <view class="combo-card" v-for="c in COMBOS" :key="c.id" @click="start(c)">
        <view class="cc-head">
          <view class="cc-icon" :style="{background:c.color}"><text>{{c.icon}}</text></view>
          <view>
            <text class="cc-title">{{c.title}}</text>
            <text class="cc-for">适用：{{c.for}}</text>
          </view>
        </view>
        <view class="cc-tags">
          <text class="tag" v-for="s in c.slots" :key="s.label">{{s.cat}}</text>
        </view>
        <text class="cc-count">{{c.slots.length}} 张卡 · {{c.qs.length}} 个反思问题</text>
      </view>
    </view>

    <!-- 抽卡 -->
    <view v-if="step===1" class="draw">
      <view class="draw-head">
        <text class="draw-title">{{sel.title}}</text>
        <text class="draw-tip">点击翻转每张卡牌</text>
      </view>
      <view class="cards-wrap">
        <view class="card-item" v-for="(c,i) in cards" :key="i">
          <text class="card-label">{{c.label}}</text>
          <view class="flip-card" :style="{transform: c.rotate, transition: 'transform 0.21s ease-in-out'}" @click="flip(i)">
            <view v-if="!c.flipped" class="card-back" :style="{background:catStyle(c.cat)}"><text class="back-txt">{{c.cat}}</text></view>
            <view v-else class="card-front" :class="c.word ? 'word-front' : ''">
              <image v-if="c.imageUrl" :src="fullUrl(c.imageUrl)" mode="aspectFill" class="card-img" @click.stop="preview(c.imageUrl)" />
              <view v-else class="word-frame"><text class="word-char">{{c.word}}</text></view>
            </view>
          </view>
          <text class="cat-name">{{c.cat}}</text>
        </view>
      </view>

      <view v-if="allFlipped" class="qs-section">
        <text class="qs-title">反思问题</text>
        <view class="q-item" v-for="(q,i) in sel.qs" :key="i">
          <text class="q-num">{{i+1}}</text>
          <text class="q-text">{{q}}</text>
        </view>
        <textarea class="note-input" v-model="note" placeholder="写下此刻的感受（可选）..." placeholder-class="note-ph" maxlength="500" />
        <view class="btn-group">
          <view class="btn btn-primary" @click="save()">保存记录</view>
          <view class="btn btn-ghost" @click="uni.navigateTo({url:'/pages/ohcard/record'})">查看抽卡记录</view>
          <view class="btn btn-ghost" @click="uni.navigateBack()">返回抽卡菜单</view>
        </view>
      </view>
    </view>

    <!-- 全屏预览 -->
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
function preview(u) { fsUrl.value = u; }

const CAT_BACK = 'linear-gradient(135deg,#4A8A7A,#3A6E80)';
function catStyle(cat) { return CAT_BACK; }

const COMBOS = ref([
  {
    id:1, icon:'🧒', color:'#7B68EE',
    title:'内在小孩深度疗愈',
    for:'感到莫名的悲伤、焦虑、自我价值感低',
    slots:[
      {catId:9, label:'内在小孩此刻的样子', cat:'孩童卡·人像'},
      {catId:1, label:'内在小孩所处的场景', cat:'OH图卡'},
      {catId:8, label:'给内在小孩的一句话', cat:'彩虹卡'}
    ],
    qs:[
      '这个孩子看起来多大？他的神情让你想到什么？',
      'OH图卡里的场景，和这个孩子有什么联系？',
      '彩虹卡上的话，对你此刻有什么意义？'
    ]
  },
  {
    id:2, icon:'🧭', color:'#4A7BBA',
    title:'人生方向迷茫期导航',
    for:'职业转折、重大决策、人生低谷',
    slots:[
      {catId:7, label:'我现在的位置', cat:'路标卡'},
      {catId:7, label:'我看到的方向', cat:'路标卡'},
      {catId:12, label:'这段旅程的转折点/礼物', cat:'英雄之旅故事卡'},
      {catId:2, label:'这段旅程的隐藏主题', cat:'OH字卡'}
    ],
    qs:[
      '两张路标卡，哪个让你更紧张？哪个让你更期待？',
      '英雄之旅这张卡，如果是一个故事章节，标题是什么？',
      '字卡上的词，和你此刻的处境有什么联系？'
    ]
  },
  {
    id:3, icon:'💑', color:'#C06090',
    title:'亲密关系模式探索',
    for:'情侣/夫妻咨询、关系冲突、理解伴侣',
    slots:[
      {catId:6, label:'我眼中的自己', cat:'伴侣卡'},
      {catId:6, label:'我眼中的对方', cat:'伴侣卡'},
      {catId:10, label:'我们互动时的姿态', cat:'孩童卡·情况'},
      {catId:2, label:'这段关系的核心议题', cat:'OH字卡'}
    ],
    qs:[
      '两张伴侣卡，他们的表情和距离让你想到什么？',
      '孩童卡·情况如果是定格画面，下一秒会发生什么？',
      '字卡上的词，如果变成关系的"名字"，你接受吗？'
    ]
  },
  {
    id:4, icon:'👨‍👩‍👧', color:'#4A8A7A',
    title:'亲子关系与代际传递',
    for:'父母自我成长、理解孩子行为、打破教养循环',
    slots:[
      {catId:10, label:'我和孩子的互动情况', cat:'孩童卡·情况'},
      {catId:9, label:'孩子在这个场景中可能的状态', cat:'孩童卡·人像'},
      {catId:4, label:'这个互动模式背后的家族原型', cat:'中国神话卡'}
    ],
    qs:[
      '孩童卡上的这个互动情况，让你想到什么？',
      '孩童卡人像上的孩子，他的眼神在说什么？',
      '神话卡上的角色，像你们家族中的谁？这种力量如何转化？'
    ]
  },
  {
    id:5, icon:'🎨', color:'#E07040',
    title:'情绪解码与身体觉察',
    for:'说不清的情绪、身体症状、释放压力',
    slots:[
      {catId:11, label:'我此刻说不清的情绪', cat:'抽象卡'},
      {catId:10, label:'这种情绪在身体中的姿态', cat:'孩童卡·情况'},
      {catId:8, label:'彩虹卡带来的视角', cat:'彩虹卡'}
    ],
    qs:[
      '抽象卡上的颜色/线条，如果会说话，它在喊什么？',
      '孩童卡·情况上的姿态，你身体哪个部位有共鸣？',
      '彩虹卡上的话，如果是对这种情绪的接纳，你愿意吗？'
    ]
  },
  {
    id:6, icon:'🏔️', color:'#5A6EA0',
    title:'人生故事重构',
    for:'重大丧失后重建、寻找人生意义、叙事治疗',
    slots:[
      {catId:12, label:'过去', cat:'英雄之旅故事卡'},
      {catId:12, label:'现在', cat:'英雄之旅故事卡'},
      {catId:12, label:'未来', cat:'英雄之旅故事卡'},
      {catId:4, label:'你内在的神话原型/守护神', cat:'中国神话卡'},
      {catId:1, label:'你一直携带的资源', cat:'OH图卡'},
      {catId:7, label:'下一个召唤你的方向', cat:'路标卡'}
    ],
    qs:[
      '英雄之旅三张卡连起来，是什么故事？主角是谁？',
      '神话卡上的原型，如果成为你的盟友，会给你什么能力？',
      'OH图卡里，你一直带着但可能没意识到的东西是什么？'
    ]
  }
]);

let _pendingId = null;
onLoad(opts => { if (opts?.id) _pendingId = Number(opts.id); });
onReady(async () => {
  try {
    const data = await ohcardApi.presets('combo');
    if (data?.length) COMBOS.value = data.map(p => ({ id:p.id, title:p.title, icon:p.icon, color:p.color, ...p.config }));
  } catch {}
  if (_pendingId) {
    const found = COMBOS.value.find(c => c.id === _pendingId);
    _pendingId = null;
    if (found) start(found);
  }
});

async function start(combo) {
  sel.value = combo;
  note.value = '';
  const grouped = {};
  combo.slots.forEach((s, i) => {
    if (!grouped[s.catId]) grouped[s.catId] = { catId: s.catId, indices: [] };
    grouped[s.catId].indices.push(i);
  });
  try {
    const results = new Array(combo.slots.length);
    await Promise.all(Object.values(grouped).map(async g => {
      const res = await ohcardApi.cards({ category_id: g.catId, count: g.indices.length });
      g.indices.forEach((idx, i) => {
        const card = res[i % res.length];
        results[idx] = { ...card, label: combo.slots[idx].label, cat: combo.slots[idx].cat, flipped: false, rotate: 'rotateY(0deg)', animating: false };
      });
    }));
    cards.value = results;
    step.value = 1;
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
      type: 'combo',
      data: { combo: { id: sel.value.id, title: sel.value.title }, cards: cards.value.map(c => ({ id:c.id, imageUrl:c.imageUrl, word:c.word, label:c.label, cat:c.cat })) },
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
.list { display:flex; flex-direction:column; gap:20rpx; }
.combo-card { background:#FFFFFF; border:1rpx solid #E8EFED; border-radius:24rpx; padding:32rpx 30rpx; box-shadow:0 4rpx 18rpx rgba(28,42,39,0.04); }
.cc-head { display:flex; align-items:center; gap:16rpx; margin-bottom:20rpx; }
.cc-icon { width:80rpx; height:80rpx; border-radius:22rpx; display:flex; align-items:center; justify-content:center; font-size:36rpx; flex-shrink:0; background:#EDF4F0 !important; }
.cc-title { font-size:31rpx; font-weight:600; color:#1C2A27; display:block; font-family:"Noto Serif SC",serif; }
.cc-for { font-size:22rpx; color:#9BBCB4; display:block; margin-top:6rpx; line-height:1.4; }
.cc-tags { display:flex; flex-wrap:wrap; gap:10rpx; margin-bottom:16rpx; }
.tag { font-size:20rpx; color:#4A8A7A; background:#EDF4F0; padding:6rpx 16rpx; border-radius:20rpx; }
.cc-count { font-size:22rpx; color:#B7C6C1; display:block; }

.draw-head { margin-bottom:32rpx; text-align:center; }
.draw-title { font-size:36rpx; font-weight:600; color:#1C2A27; display:block; font-family:"Noto Serif SC",serif; }
.draw-tip { font-size:22rpx; color:#9BBCB4; display:block; margin-top:12rpx; }
.cards-wrap { display:flex; flex-wrap:wrap; padding:0 8rpx 16rpx; margin-bottom:12rpx; }

.card-item { display:flex; flex-direction:column; align-items:center; width:31.5%; margin-right:2.75%; margin-bottom:16rpx; }
.card-item:nth-child(3n) { margin-right:0; }
.card-label { font-size:20rpx; color:#617870; margin-bottom:10rpx; text-align:center; line-height:1.4; height:56rpx; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.flip-card { width:100%; aspect-ratio: 5/7; position:relative; border-radius:14rpx; will-change: transform; }
.card-back, .card-front { width:100%; height:100%; border-radius:14rpx; display:flex; align-items:center; justify-content:center; }
.card-back { background:linear-gradient(135deg,#4A8A7A,#3A6E80); flex-direction:column; gap:8rpx; box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.18); }
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
