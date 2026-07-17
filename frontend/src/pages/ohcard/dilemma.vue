<template>
  <view class="page">
    <!-- 困境详情 -->
    <view v-if="step===0 && item" class="detail">
      <view class="det-card det-head">
        <view class="det-icon" :style="{background:item.color}"><text>{{item.icon}}</text></view>
        <view>
          <text class="det-title">{{item.fullTitle}}</text>
          <text class="det-core">{{item.core}}</text>
        </view>
      </view>

      <view class="det-card">
        <text class="det-label">玩法介绍</text>
        <text class="det-text">{{item.intro}}</text>
      </view>

      <view class="det-card">
        <text class="det-label">将要抽取的卡牌</text>
        <view class="slot-list">
          <view class="slot-item" v-for="s in item.slots" :key="s.label">
            <view class="slot-preview" :style="{background:catStyle(s.cat)}">
              <text class="slot-cat-txt">{{s.cat}}</text>
            </view>
            <text class="slot-label-txt">{{s.label}}</text>
          </view>
        </view>
      </view>

      <view class="det-card">
        <text class="det-play">「{{item.playName}}」</text>
        <view class="step-row" v-for="(s,i) in item.steps" :key="i">
          <text class="step-num">{{i+1}}</text>
          <view class="step-body">
            <text class="step-text">{{s.action}}</text>
            <view class="guides">
              <text class="guide" v-for="(g,j) in s.guides" :key="j">◎ {{g}}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="det-insight">
        <text class="insight-label">关键洞察</text>
        <text class="insight-text">{{item.insight}}</text>
      </view>

      <view class="action-section">
        <view class="btn btn-primary" @click="start()">开始抽卡</view>
        <view class="btn btn-ghost" style="margin-top:16rpx" @click="uni.navigateTo({url:'/pages/ohcard/record'})">查看历史记录</view>
      </view>
    </view>

    <!-- 抽卡展示 -->
    <view v-if="step===1" class="draw">
      <view class="draw-head">
        <text class="draw-title">{{item.icon}} {{item.fullTitle}}</text>
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
        <view class="q-item" v-for="(q,i) in item.steps.flatMap(s=>s.guides)" :key="i">
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
import { computed, ref, nextTick } from 'vue';
import { onLoad, onReady } from '@dcloudio/uni-app';
import { ohcardApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';

const store = useUserStore();
const id = ref(0), step = ref(0), cards = ref([]), note = ref(''), fsUrl = ref('');
const allFlipped = computed(() => cards.value.length > 0 && cards.value.every(c => c.flipped));
function fullUrl(u) { return u?.startsWith('http') ? u : SERVER + u; }

const CAT_BACK = 'linear-gradient(135deg,#4A8A7A,#3A6E80)';
function catStyle(cat) { return CAT_BACK; }

let _pendingId = null;
onLoad(opts => { if (opts?.id) _pendingId = Number(opts.id); });
onReady(async () => {
  try {
    const data = await ohcardApi.presets('dilemma');
    if (data?.length) DATA.value = data.map(p => ({ id:p.id, icon:p.icon, fullTitle:p.title, color:p.color, ...p.config }));
  } catch {}
  if (_pendingId) { id.value = _pendingId; _pendingId = null; start(); }
});

const DATA = ref([
  {
    id:1, icon:'🔄', color:'#5A6EA0',
    fullTitle:'「我知道该改变，但动不了」',
    core:'理智上想改变，身体/情绪上抗拒，内在冲突严重',
    cards:'传统OH卡图像 + 传统OH卡字卡 + 路标卡',
    slots:[{catId:1,label:'想改变的部分',cat:'OH图卡'},{catId:1,label:'不想改变的部分',cat:'OH图卡'},{catId:2,label:'冲突的主题',cat:'OH字卡'},{catId:7,label:'握手言和的方向',cat:'路标卡'}],
    playName:'内在议会',
    intro:'当我们感受到"应该改变但无法行动"时，内心往往同时存在两股力量。这个玩法借助OH卡的投射功能，将内在冲突视觉化——让两个部分各自呈现，然后为它们创造一个对话的空间。不需要强迫做出任何判断，只是观察与倾听。',
    steps:[
      { action:'抽2张OH卡图像：一张代表"想改变的部分"，一张代表"不想改变的部分"',
        guides:['看着这两张卡，你注意到什么？它们各自让你联想到什么？','两张卡放在一起，它们之间的关系是什么感觉？'] },
      { action:'抽1张OH卡字卡：作为"这场冲突的主题"',
        guides:['这个词出现在这里，你内心有什么反应？'] },
      { action:'让两个部分对话——想改变的部分：你在害怕什么？不想改变的部分：你在保护什么？',
        guides:['如果"想改变的部分"能开口，它第一句话会说什么？','如果"不想改变的部分"能回应，它会怎么说？'] },
      { action:'抽1张路标卡：代表"如果它们握手言和，下一步会是什么？"',
        guides:['看着这张卡，你注意到什么？如果它代表某种可能性，你有什么感受？'] }
    ],
    insight:'不改变的部分往往是在保护你，找到它在保护什么，冲突就会松动。'
  },
  {
    id:2, icon:'💔', color:'#C06090',
    fullTitle:'「我在关系中总是重复同样的痛苦」',
    core:'强迫性重复，吸引相似的人，陷入熟悉的痛苦模式',
    cards:'伴侣卡/人像卡 + 孩童卡·人像 + 抽象卡',
    slots:[{catId:9,label:'小时候的生存姿态',cat:'孩童卡·人像'},{catId:6,label:'吸引的关系对象',cat:'伴侣卡'},{catId:11,label:'关系的身体感觉',cat:'抽象卡'}],
    playName:'关系DNA',
    intro:'在亲密关系中反复体验相似的处境，往往与早年形成的依恋模式有关。这个玩法通过三张卡的并置，帮助你觉察早期关系经验与当下关系选择之间的潜在联系——不是为了找到"答案"，而是为了看见那些通常在意识之外运作的东西。',
    steps:[
      { action:'抽1张孩童卡·人像：代表"小时候，我在关系中学会的生存姿态"',
        guides:['看着这张卡，你注意到什么？如果把它和你的童年放在一起，有什么感觉？'] },
      { action:'抽1张伴侣卡/人像卡：代表"我现在反复吸引/选择的关系对象"',
        guides:['这张卡让你联想到什么关系或什么人？你的身体有什么反应？'] },
      { action:'抽1张抽象卡：代表"这种关系给我的身体感觉"',
        guides:['这张卡和你身体里的某种感觉有联系吗？这种感觉在什么情境下会出现？'] },
      { action:'对比：孩童卡与伴侣卡之间，有什么相似的眼神、姿态或距离？',
        guides:['把两张卡放在一起，你注意到什么？可以是相似之处，也可以是差异。','如果有什么让你感到意外，是什么？'] }
    ],
    insight:'你现在选择的人，往往是在帮你"完成"童年未完成的功课。'
  },
  {
    id:3, icon:'🎭', color:'#E07040',
    fullTitle:'「我成功了，但感觉不到快乐」',
    core:'外在成就与内在空虚脱节，不知道自己真正要什么',
    cards:'英雄之旅故事卡 + 彩虹卡/赋能卡 + 传统OH卡图像',
    slots:[{catId:1,label:'外界看到的成功我',cat:'OH图卡'},{catId:12,label:'真正在寻找的',cat:'英雄之旅卡'},{catId:8,label:'摘下面具想说的',cat:'彩虹卡'}],
    playName:'成功面具下的脸',
    intro:'外在成就与内在感受之间的落差，是一种常见但难以言说的体验。这个玩法邀请你暂时搁置"应该"感到的满足，通过卡牌探索在成功背后，有什么声音可能一直没有被听见。这里没有正确答案，所有的观察都是有价值的信息。',
    steps:[
      { action:'抽1张传统OH卡图像：代表"外界看到的成功我"',
        guides:['当你选择这张卡代表"外界看到的你"，你注意到什么？这个形象让你感到什么？'] },
      { action:'抽1张英雄之旅故事卡：代表"这个成功故事背后，我真正在寻找什么"',
        guides:['看着这张卡，如果它在讲述一个关于寻找的故事，那个故事里在寻找什么？'] },
      { action:'抽1张彩虹卡：代表"如果摘下面具，我真正想对自己说的话"',
        guides:['如果你现在对自己说出这张卡上的内容，身体有什么反应？'] },
      { action:'让"成功我"和"真实我"对话：成功我在害怕什么？真实我在渴望什么？',
        guides:['让两个形象坐在一起，不急着对话——先感受一下，这个场景里的氛围是什么质地的？','如果它们能各说一句话，会说什么？'] }
    ],
    insight:'成功可能是对"不被爱"的补偿，找到补偿背后的空洞，才能触达真正的渴望。'
  },
  {
    id:4, icon:'🤲', color:'#4A8A7A',
    fullTitle:'「我总是照顾别人，累到枯竭」',
    core:'讨好/拯救者模式，边界模糊，自我价值建立在被需要上',
    cards:'孩童卡·情况 + 孩童卡·人像 + 路标卡',
    slots:[{catId:10,label:'关系中的身体姿态',cat:'孩童卡·情况'},{catId:9,label:'家里扮演的角色',cat:'孩童卡·人像'},{catId:7,label:'精力转向自己的方向',cat:'路标卡'}],
    playName:'照顾者的起源',
    intro:'持续给予而难以接受，是许多人深层的关系模式。这个玩法通过身体觉察与卡牌投射，探索这种给予模式的早期来源——不是为了评判它，而是为了理解它当初是如何帮助你生存下来的，以及现在是否仍然适用。',
    steps:[
      { action:'抽1张孩童卡·情况：摆出"我在关系中习惯的身体姿态"（如弯腰、前倾、伸出手）',
        guides:['保持这个姿态一会儿，你注意到身体哪个部位有感觉？这种感觉是熟悉的还是陌生的？'] },
      { action:'抽1张孩童卡·人像：代表"小时候，我在家里扮演的角色"',
        guides:['这个形象让你想到什么？在家里，这个角色是你主动选择的，还是慢慢形成的？'] },
      { action:'抽1张路标卡：代表"如果我把同样的精力转向自己，会走向哪里？"',
        guides:['看着这张卡代表的方向，你内心有什么反应？这个方向对你来说是什么感觉？'] },
      { action:'身体实验：从"给予"的姿态转换到"接收"的姿态，感受两者的不同',
        guides:['当你从"给予"姿态转变为"接收"姿态，身体有什么变化？','有没有哪个部位感到不自在，或者有些陌生？'] }
    ],
    insight:'照顾别人可能是童年学会的"生存策略"，找到那个需要被照顾的内在小孩。'
  },
  {
    id:5, icon:'🚪', color:'#7B68EE',
    fullTitle:'「我害怕被抛弃，所以先推开别人」',
    core:'回避型依恋，用冷漠/疏离保护自己，内心极度渴望连接',
    cards:'伴侣卡 + 抽象卡 + 中国神话卡/原型卡',
    slots:[{catId:6,label:'渴望的亲密关系',cat:'伴侣卡'},{catId:11,label:'靠近时的警报',cat:'抽象卡'},{catId:4,label:'恐惧的古老原型',cat:'中国神话卡'}],
    playName:'推开的背后',
    intro:'在渴望连接的同时又保持距离，这种矛盾的内在体验往往有其深刻的来源。这个玩法借助神话或原型意象，帮助你从一个更大的视角看待这种模式——不是要"克服"它，而是先理解它在保护什么。',
    steps:[
      { action:'抽1张伴侣卡：代表"我渴望的亲密关系"',
        guides:['看着这张卡，你注意到什么？如果它代表一种渴望，那个渴望是什么样子的？'] },
      { action:'抽1张抽象卡：代表"当我靠近时，身体里的警报声"',
        guides:['把这张卡和你靠近他人时的身体感觉放在一起，有什么联系？这种感觉在身体的哪里？'] },
      { action:'抽1张中国神话卡/原型卡：代表"这个恐惧的古老原型"',
        guides:['这个形象或符号让你想到什么？它与你现在的处境有什么共鸣，或者毫无共鸣？'] },
      { action:'想象：如果神话卡上的角色是你的盟友，它会教你怎么既靠近又安全？',
        guides:['如果这个力量可以陪伴你，它的存在让你感到什么不同？','有什么是你原本没想到的？'] }
    ],
    insight:'推开不是不爱，是太爱所以太怕。找到"安全的靠近方式"比"克服恐惧"更重要。'
  },
  {
    id:6, icon:'⚖️', color:'#3A6E80',
    fullTitle:'「我做了很多，但觉得自己不够好」',
    core:'完美主义、自我批评、内在有一个严苛的法官',
    cards:'孩童卡·人像 + 传统OH卡字卡 + 彩虹卡',
    slots:[{catId:9,label:'被审判的内在小孩',cat:'孩童卡·人像'},{catId:2,label:'内在法官的话',cat:'OH字卡'},{catId:8,label:'守护者想说的',cat:'彩虹卡'}],
    playName:'内在法官的审判',
    intro:'那个不断评判自己"还不够好"的声音，往往早在我们有意识之前就已经形成。这个玩法通过角色化内在批评者与被批评者，为两个部分都创造一个被看见的空间，并探索它们之间是否存在另一种关系的可能性。',
    steps:[
      { action:'抽1张孩童卡·人像：代表"被审判的内在小孩"',
        guides:['看着这个形象，你有什么感觉？如果这个孩子有情绪，是什么情绪？'] },
      { action:'抽1张传统OH卡字卡：代表"法官最常对我说的那句话"',
        guides:['当你看到这个词或这句话，身体有什么反应？这个声音你熟悉吗？'] },
      { action:'抽1张彩虹卡：代表"如果法官退休，我想对小孩说的话"',
        guides:['如果守护者说出这张卡上的内容，那个孩子可能会有什么反应？'] },
      { action:'角色扮演：先以法官身份说话，再以守护者身份说话，感受两种状态的身体变化',
        guides:['从"法官"到"守护者"，你注意到什么变化——是身体的感受，还是其他什么？','哪个部分对你来说更陌生？'] }
    ],
    insight:'那个法官的声音往往不是你自己的，找到它最初是从谁那里学来的。'
  },
  {
    id:7, icon:'🌀', color:'#8A5A7A',
    fullTitle:'「人生到了某个阶段，突然不知道我是谁」',
    core:'身份危机、中年/青年迷茫、重大转变后的自我重构',
    cards:'英雄之旅故事卡 + 中国神话卡 + 路标卡 + 传统OH卡图像',
    slots:[{catId:1,label:'正在告别的旧身份',cat:'OH图卡'},{catId:12,label:'告别的更大意义',cat:'英雄之旅卡'},{catId:4,label:'觉醒的新原型',cat:'中国神话卡'},{catId:7,label:'新身份的方向',cat:'路标卡'}],
    playName:'身份葬礼与重生',
    intro:'某些人生阶段，旧有的自我认同开始动摇，而新的自我尚未清晰成形——这种"过渡期"既令人不安，也充满可能性。这个玩法通过四张卡的叙事结构，陪伴你在这个过渡空间里，不急于找到答案，而是允许自己观察那些正在移动的事物。',
    steps:[
      { action:'抽1张传统OH卡图像：代表"我正在告别的旧身份"',
        guides:['看着这张卡，你感受到什么？留恋、如释重负，还是其他什么，或者什么都说不清？'] },
      { action:'抽1张英雄之旅故事卡：代表"这个告别在更大故事中的意义"',
        guides:['如果这段告别是一个更大故事的一部分，这张卡让你想到什么？'] },
      { action:'抽1张中国神话卡：代表"正在我体内觉醒的新原型"',
        guides:['这个形象或力量对你来说陌生还是熟悉？它让你感到什么？'] },
      { action:'抽1张路标卡：代表"新身份的第一个行动方向"',
        guides:['看着这张卡，如果它代表一个方向而非一个具体答案，你的第一反应是什么？','旧身份为你服务了什么？'] }
    ],
    insight:'身份危机不是崩溃，是升级。旧操作系统需要关机，才能安装新版本。'
  },
  {
    id:8, icon:'🔥', color:'#D4603A',
    fullTitle:'「我有愤怒，但不敢表达，怕伤害别人」',
    core:'情绪压抑、害怕冲突、将愤怒等同于伤害',
    cards:'抽象卡 + 孩童卡·情况 + 中国神话卡/力量卡',
    slots:[{catId:11,label:'愤怒的形状',cat:'抽象卡'},{catId:10,label:'家里处理愤怒的方式',cat:'孩童卡·情况'},{catId:4,label:'愤怒的神圣力量',cat:'中国神话卡'}],
    playName:'愤怒的变形记',
    intro:'愤怒是人类情绪系统中的重要一员，它携带着能量、边界与保护的信号。这个玩法的目的不是"处理"愤怒，而是与它相遇——了解它的形状、它的来源，以及它在保护什么。整个过程可以完全在内心进行，不需要实际表达任何愤怒。',
    steps:[
      { action:'抽1张抽象卡：代表"我的愤怒如果是一种颜色/形状/能量"',
        guides:['这张卡和你对自己愤怒的感知放在一起，有什么联系，或者什么都没有？','它的哪个部分让你有反应？'] },
      { action:'抽1张孩童卡·情况：代表"小时候，我家里怎么处理愤怒"',
        guides:['看着这张卡，愤怒在你的成长环境里是什么样的存在？它被如何对待？'] },
      { action:'抽1张中国神话卡：代表"如果我的愤怒是一种神圣力量，它是什么？"',
        guides:['这个形象或力量让你联想到什么？如果它携带着某种能量，是什么样的能量？'] },
      { action:'想象：神话卡上的力量，如果用来保护而非攻击，它会做什么？',
        guides:['当你想到这个力量用于保护，你的身体有什么反应？','这和你平时对待自己愤怒的方式有什么不同？'] }
    ],
    insight:'愤怒不是敌人，是被误解的守护者。找到它的保护意图，就能学会"有界限的愤怒"。'
  },
  {
    id:9, icon:'🕊️', color:'#6A8A5A',
    fullTitle:'「我想原谅，但做不到」',
    core:'被背叛/伤害后，卡在原谅与怨恨之间，自责于"为什么我还放不下"',
    cards:'传统OH卡图像 + 孩童卡·人像 + 彩虹卡 + 路标卡',
    slots:[{catId:1,label:'伤害发生的场景',cat:'OH图卡'},{catId:9,label:'受伤时的我',cat:'孩童卡·人像'},{catId:8,label:'需要听到的话',cat:'彩虹卡'},{catId:7,label:'不原谅在守护的',cat:'路标卡'}],
    playName:'原谅的三扇门',
    intro:'"放不下"有时被视为执念，但在这里我们用不同的视角来看待它——放不下往往在守护着某些重要的东西。这个玩法的目的不是推动你走向原谅，而是先帮助你看见：在这段经历里，什么还没有被充分地感受或听见。',
    steps:[
      { action:'抽1张传统OH卡图像：代表"伤害发生的场景"',
        guides:['当这张卡出现在这里，你注意到什么？可以只是描述你看到的，不需要解释。'] },
      { action:'抽1张孩童卡·人像：代表"受伤时的我，现在多大？"',
        guides:['如果这个形象代表那时候的你，那时的你需要什么？','那时候有没有什么没有被说出来？'] },
      { action:'抽1张彩虹卡：代表"受伤的我需要听到的第一句话"',
        guides:['当你看到这张卡，如果它携带着一句话，那句话让你感到什么？'] },
      { action:'抽1张路标卡：代表"如果我不原谅，我在守护什么？"',
        guides:['看着这张卡，如果"不原谅"在守护某个重要的东西，你联想到那是什么吗？','守护这个东西对你来说意味着什么？'] }
    ],
    insight:'原谅不是赦免对方，是释放自己。放不下的背后，往往有一个"还没被听见"的受害者。'
  },
  {
    id:10, icon:'🌑', color:'#4A4A6A',
    fullTitle:'「我感觉人生没有意义，做什么都提不起劲」',
    core:'存在性空虚、抑郁状态、与生命意义脱节',
    cards:'英雄之旅故事卡 + 中国神话卡 + 彩虹卡 + 抽象卡',
    slots:[{catId:11,label:'空虚感的质地',cat:'抽象卡'},{catId:12,label:'人生故事的章节',cat:'英雄之旅卡'},{catId:4,label:'灵魂的古老召唤',cat:'中国神话卡'},{catId:8,label:'意义的缝隙',cat:'彩虹卡'}],
    playName:'意义的考古',
    intro:'感觉不到意义，有时是一种信号——提示我们正处于某个旧模式的尾声与新可能的起点之间。这个玩法不是为了"找到"意义，而是邀请你在空虚感本身里停留一会儿，看看它的底部有什么。这里没有需要完成的任务，只有观察与陪伴。',
    steps:[
      { action:'抽1张抽象卡：代表"空虚感在我身体里的质地"（如灰色、沉重、空洞）',
        guides:['把这张卡和你内心的空虚感放在一起，有什么联系？这种感觉在身体的什么位置？'] },
      { action:'抽1张英雄之旅故事卡：代表"如果这是我人生故事的一个章节，标题是什么？"',
        guides:['如果这段时期是一个故事章节，这张卡让你联想到什么标题？没有对错之分。'] },
      { action:'抽1张中国神话卡：代表"我的灵魂在寻找的古老召唤"',
        guides:['这个形象或符号对你有什么影响？它是否触动了你内心什么遥远或熟悉的东西？'] },
      { action:'抽1张彩虹卡：代表"哪怕只有一点点意义，它想从哪个缝隙照进来？"',
        guides:['看着这张卡，如果有一点点什么是你愿意靠近的，是什么？','这个"一点点"在你生活里有没有对应的东西？'] }
    ],
    insight:'意义不是"找到"的，是"活出来"的。空虚可能是旧意义已死、新意义尚未诞生的过渡期。'
  }
]);

const item = computed(() => DATA.value.find(d => d.id === id.value));

async function start() {
  const d = item.value; if (!d) return;
  note.value = '';
  const grouped = {};
  d.slots.forEach((s, i) => {
    if (!grouped[s.catId]) grouped[s.catId] = { catId: s.catId, indices: [] };
    grouped[s.catId].indices.push(i);
  });
  try {
    const results = new Array(d.slots.length);
    await Promise.all(Object.values(grouped).map(async g => {
      const res = await ohcardApi.cards({ category_id: g.catId, count: g.indices.length });
      g.indices.forEach((idx, i) => {
        const card = res[i % res.length];
        results[idx] = { ...card, label: d.slots[idx].label, cat: d.slots[idx].cat, flipped: false, rotate: 'rotateY(0deg)', animating: false };
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
      type: 'dilemma',
      data: { dilemma: { id: item.value.id, title: item.value.fullTitle }, cards: cards.value.map(c => ({ id:c.id, imageUrl:c.imageUrl, word:c.word, label:c.label, cat:c.cat })) },
      note: note.value
    });
    uni.showToast({ title: '已保存', icon: 'success' });
  } catch(e) {
    if (e?.__authRedirect) return;
    uni.showToast({ title: e?.error || '保存失败', icon: 'none' });
  }
}
</script>

<style scoped lang="scss">
.page { min-height:100vh; background:#F5F7F6; }

.detail { padding:36rpx 28rpx 64rpx; display:flex; flex-direction:column; gap:16rpx; }
.det-card { background:#FFFFFF; border:1rpx solid #E8EFED; border-radius:24rpx; padding:32rpx 30rpx; box-shadow:0 4rpx 18rpx rgba(28,42,39,0.04); }
.det-head { display:flex; align-items:flex-start; gap:16rpx; }
.det-icon { width:80rpx; height:80rpx; border-radius:22rpx; display:flex; align-items:center; justify-content:center; font-size:36rpx; flex-shrink:0; background:#EDF4F0 !important; }
.det-title { font-size:29rpx; font-weight:600; color:#1C2A27; display:block; margin-bottom:8rpx; line-height:1.4; font-family:"Noto Serif SC",serif; }
.det-core { font-size:22rpx; color:#9BBCB4; display:block; line-height:1.5; }
.det-label { font-size:24rpx; color:#4A8A7A; font-weight:600; display:block; margin-bottom:14rpx; letter-spacing:1rpx; }
.det-text { font-size:26rpx; color:#617870; line-height:1.8; display:block; }
.slot-list { display:flex; flex-wrap:wrap; gap:16rpx; }
.slot-item { display:flex; flex-direction:column; align-items:center; width:128rpx; }
.slot-preview { width:128rpx; height:88rpx; border-radius:12rpx; display:flex; align-items:center; justify-content:center; padding:8rpx; box-sizing:border-box; box-shadow: inset 0 1rpx 0 rgba(255,255,255,0.15); }
.slot-cat-txt { font-size:18rpx; color:rgba(255,255,255,.94); text-align:center; line-height:1.4; }
.slot-label-txt { font-size:18rpx; color:#8A9E98; margin-top:8rpx; text-align:center; line-height:1.3; width:128rpx; }
.det-play { font-size:28rpx; font-weight:600; color:#1C2A27; display:block; margin-bottom:22rpx; font-family:"Noto Serif SC",serif; }
.step-row { display:flex; gap:16rpx; margin-bottom:24rpx; align-items:flex-start; }
.step-num { width:42rpx; height:42rpx; border-radius:50%; background:linear-gradient(135deg,#4A8A7A,#3A6E80); color:#fff; font-size:22rpx; flex-shrink:0; text-align:center; line-height:42rpx; }
.step-body { flex:1; }
.step-text { font-size:26rpx; color:#3B4742; line-height:1.7; display:block; margin-bottom:12rpx; }
.guides { background:#F5F7F6; border:1rpx solid #E8EFED; border-radius:12rpx; padding:16rpx 20rpx; display:flex; flex-direction:column; gap:10rpx; }
.guide { font-size:24rpx; color:#617870; line-height:1.7; display:block; }
.det-insight { background:#FFF4EC; border-radius:24rpx; padding:30rpx 28rpx; border-left:6rpx solid #C08A4E; }
.insight-label { font-size:24rpx; color:#A06830; font-weight:600; display:block; margin-bottom:12rpx; letter-spacing:1rpx; }
.insight-text { font-size:26rpx; color:#7A5E44; line-height:1.8; display:block; }
.action-section { margin-top:12rpx; }

.draw { padding:36rpx 28rpx 64rpx; }
.draw-head { text-align:center; margin-bottom:32rpx; }
.draw-title { font-size:29rpx; font-weight:600; color:#1C2A27; display:block; font-family:"Noto Serif SC",serif; }
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
