// 运行: cd backend && node scripts/seed-presets.js
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const PRESETS = [
  // 单卡组合
  { type:'single', title:'心理图卡',      icon:'🃏', color:'#4A8A7A', cfg:{} },
  { type:'single', title:'心理图卡+字卡', icon:'🔤', color:'#3A6E80', cfg:{} },
  { type:'single', title:'伴侣卡',        icon:'💑', color:'#C06090', cfg:{} },
  { type:'single', title:'孩童卡·人像',   icon:'🧒', color:'#7B68EE', cfg:{} },
  // 跨卡牌组合
  { type:'combo', title:'内在小孩深度疗愈', icon:'🧒', color:'#7B68EE',
    cfg:{ for:'悲伤·焦虑·自我价值感低',
      slots:[{catId:9,label:'内在小孩此刻的样子',cat:'孩童卡·人像'},{catId:1,label:'内在小孩所处的场景',cat:'OH图卡'},{catId:8,label:'给内在小孩的一句话',cat:'彩虹卡'}],
      qs:['这个孩子看起来多大？他的神情让你想到什么？','OH图卡里的场景，和这个孩子有什么联系？','彩虹卡上的话，对你此刻有什么意义？'] }},
  { type:'combo', title:'人生方向迷茫期导航', icon:'🧭', color:'#4A7BBA',
    cfg:{ for:'职业转折·重大决策',
      slots:[{catId:7,label:'我现在的位置',cat:'路标卡'},{catId:7,label:'我看到的方向',cat:'路标卡'},{catId:12,label:'旅程的转折点',cat:'英雄之旅故事卡'},{catId:2,label:'隐藏主题',cat:'OH字卡'}],
      qs:['两张路标卡，哪个让你更紧张？','英雄之旅卡如果是一个章节，标题是什么？','字卡和你此刻的处境有什么联系？'] }},
  { type:'combo', title:'亲密关系模式探索', icon:'💑', color:'#C06090',
    cfg:{ for:'关系冲突·理解伴侣',
      slots:[{catId:6,label:'我眼中的自己',cat:'伴侣卡'},{catId:6,label:'我眼中的对方',cat:'伴侣卡'},{catId:10,label:'互动时的姿态',cat:'孩童卡·情况'},{catId:2,label:'核心议题',cat:'OH字卡'}],
      qs:['两张伴侣卡，表情和距离让你想到什么？','孩童卡如果是定格画面，下一秒会发生什么？','字卡变成关系的名字，你接受吗？'] }},
  { type:'combo', title:'亲子关系与代际传递', icon:'👨‍👩‍👧', color:'#4A8A7A',
    cfg:{ for:'父母成长·理解孩子',
      slots:[{catId:10,label:'我和孩子的互动情况',cat:'孩童卡·情况'},{catId:9,label:'孩子在场景中的状态',cat:'孩童卡·人像'},{catId:4,label:'家族原型',cat:'中国神话卡'}],
      qs:['孩童卡上的互动情况让你想到什么？','孩子的眼神在说什么？','神话卡像你们家族中的谁？'] }},
  { type:'combo', title:'情绪解码与身体觉察', icon:'🎨', color:'#E07040',
    cfg:{ for:'说不清的情绪·压力',
      slots:[{catId:11,label:'说不清的情绪',cat:'抽象卡'},{catId:10,label:'情绪在身体的姿态',cat:'孩童卡·情况'},{catId:8,label:'彩虹卡带来的视角',cat:'彩虹卡'}],
      qs:['抽象卡如果会说话，在喊什么？','孩童卡姿态，身体哪个部位有共鸣？','彩虹卡上的话，如果是接纳，你愿意吗？'] }},
  { type:'combo', title:'人生故事重构', icon:'🏔️', color:'#5A6EA0',
    cfg:{ for:'丧失重建·寻找意义',
      slots:[{catId:12,label:'过去',cat:'英雄之旅故事卡'},{catId:12,label:'现在',cat:'英雄之旅故事卡'},{catId:12,label:'未来',cat:'英雄之旅故事卡'},{catId:4,label:'内在神话原型',cat:'中国神话卡'},{catId:1,label:'携带的资源',cat:'OH图卡'},{catId:7,label:'下一个方向',cat:'路标卡'}],
      qs:['三张故事卡连起来，是什么故事？','神话卡的原型成为盟友，给你什么能力？','你一直带着但没意识到的东西是什么？'] }},
  // 场景选卡
  { type:'scene', title:'今天想获得能量', icon:'⚡', color:'#F5A623',
    cfg:{ slots:[{catId:8,label:'能量礼物',cat:'彩虹卡'},{catId:7,label:'方向指引',cat:'路标卡'}],
      qs:['这两张卡放在一起，你注意到什么？','其中有没有让你感到意外的？','如果今天只做一件事补充能量，你想到了什么？'] }},
  { type:'scene', title:'理解一个梦', icon:'🌙', color:'#7B68EE',
    cfg:{ slots:[{catId:1,label:'梦的图像',cat:'OH图卡'},{catId:4,label:'神话原型',cat:'中国神话卡'},{catId:11,label:'情绪底色',cat:'抽象卡'}],
      qs:['三张卡和你的梦有什么联系？','梦里最让你印象深刻的是什么？','如果这个梦想传递一个信息，可能是什么？'] }},
  { type:'scene', title:'和伴侣吵架后', icon:'💔', color:'#E05070',
    cfg:{ slots:[{catId:6,label:'我',cat:'伴侣卡'},{catId:6,label:'对方',cat:'伴侣卡'},{catId:10,label:'互动姿态',cat:'孩童卡·情况'},{catId:8,label:'关系需要的祝福',cat:'彩虹卡'}],
      qs:['代表你和对方的两张卡，关系让你联想到什么？','孩童卡上的互动姿态，在你们关系里熟悉吗？','彩虹卡出现在这里，你有什么感受？'] }},
  { type:'scene', title:'孩子让我崩溃', icon:'🤯', color:'#4A8A7A',
    cfg:{ slots:[{catId:10,label:'我们的互动情况',cat:'孩童卡·情况'},{catId:9,label:'孩子的感受',cat:'孩童卡·人像'},{catId:2,label:'核心议题',cat:'OH字卡'}],
      qs:['这个互动情况让你想到什么？','如果孩子的感受卡会说话，它会说什么？','字卡和这件事有什么联系？'] }},
  { type:'scene', title:'要不要换工作', icon:'🔄', color:'#5A6EA0',
    cfg:{ slots:[{catId:7,label:'我现在的位置',cat:'路标卡'},{catId:7,label:'我看到的方向',cat:'路标卡'},{catId:12,label:'旅程的礼物',cat:'英雄之旅故事卡'},{catId:2,label:'隐藏主题',cat:'OH字卡'}],
      qs:['两张路标卡，哪张让你更有感觉？','旅程卡如果是你现在的处境，你在哪个阶段？','字卡出现在这里，你的第一反应是什么？'] }},
  { type:'scene', title:'感觉童年影响了我', icon:'🌱', color:'#6A8A5A',
    cfg:{ slots:[{catId:9,label:'内在小孩',cat:'孩童卡·人像'},{catId:4,label:'家族原型',cat:'中国神话卡'},{catId:1,label:'我携带的资源',cat:'OH图卡'}],
      qs:['孩童卡上的形象，让你联想到什么时候的自己？','神话卡和你的成长背景有什么联系？','OH卡上的场景，你有什么感受？'] }},
  { type:'scene', title:'做年度复盘', icon:'📅', color:'#8A5A7A',
    cfg:{ slots:[{catId:12,label:'过去',cat:'英雄之旅故事卡'},{catId:12,label:'现在',cat:'英雄之旅故事卡'},{catId:12,label:'未来',cat:'英雄之旅故事卡'},{catId:7,label:'方向指引',cat:'路标卡'},{catId:8,label:'祝福与礼物',cat:'彩虹卡'}],
      qs:['三张故事卡连起来，今年是什么故事？','路标卡指向的方向，你感到期待还是担忧？','彩虹卡作为礼物出现，它想给你什么？'] }},
  // 人生困境 (3 samples — 在 admin 中添加其余7个)
  { type:'dilemma', title:'想改变却动不了', icon:'🔄', color:'#5A6EA0',
    cfg:{ core:'理智上想改变，身体/情绪上抗拒，内在冲突严重', cards:'传统OH卡图像 + 传统OH卡字卡 + 路标卡',
      slots:[{catId:1,label:'想改变的部分',cat:'OH图卡'},{catId:1,label:'不想改变的部分',cat:'OH图卡'},{catId:2,label:'冲突的主题',cat:'OH字卡'},{catId:7,label:'握手言和的方向',cat:'路标卡'}],
      playName:'内在议会', intro:'当我们感受到"应该改变但无法行动"时，内心往往同时存在两股力量。',
      steps:[{action:'抽2张OH卡图像：一张代表"想改变的部分"，一张代表"不想改变的部分"',guides:['看着这两张卡，你注意到什么？','两张卡放在一起，关系是什么感觉？']},{action:'抽1张OH卡字卡：作为"这场冲突的主题"',guides:['这个词出现在这里，你内心有什么反应？']}],
      insight:'不改变的部分往往是在保护你，找到它在保护什么，冲突就会松动。' }},
  { type:'dilemma', title:'关系里的重复', icon:'💔', color:'#C06090',
    cfg:{ core:'强迫性重复，吸引相似的人，陷入熟悉的痛苦模式', cards:'伴侣卡 + 孩童卡·人像 + 抽象卡',
      slots:[{catId:9,label:'小时候的生存姿态',cat:'孩童卡·人像'},{catId:6,label:'吸引的关系对象',cat:'伴侣卡'},{catId:11,label:'关系的身体感觉',cat:'抽象卡'}],
      playName:'关系DNA', intro:'在亲密关系中反复体验相似的处境，往往与早年形成的依恋模式有关。',
      steps:[{action:'抽1张孩童卡·人像：代表"小时候，我在关系中学会的生存姿态"',guides:['看着这张卡，如果把它和你的童年放在一起，有什么感觉？']},{action:'抽1张伴侣卡：代表"我现在反复吸引/选择的关系对象"',guides:['这张卡让你联想到什么关系或什么人？']}],
      insight:'你现在选择的人，往往是在帮你"完成"童年未完成的功课。' }},
  { type:'dilemma', title:'感觉没有意义', icon:'🌑', color:'#4A4A6A',
    cfg:{ core:'存在性空虚、抑郁状态、与生命意义脱节', cards:'英雄之旅故事卡 + 中国神话卡 + 彩虹卡 + 抽象卡',
      slots:[{catId:11,label:'空虚感的质地',cat:'抽象卡'},{catId:12,label:'人生故事的章节',cat:'英雄之旅卡'},{catId:4,label:'灵魂的古老召唤',cat:'中国神话卡'},{catId:8,label:'意义的缝隙',cat:'彩虹卡'}],
      playName:'意义的考古', intro:'感觉不到意义，有时是一种信号——提示我们正处于某个旧模式的尾声与新可能的起点之间。',
      steps:[{action:'抽1张抽象卡：代表"空虚感在我身体里的质地"',guides:['把这张卡和你内心的空虚感放在一起，有什么联系？']},{action:'抽1张中国神话卡：代表"我的灵魂在寻找的古老召唤"',guides:['这个形象或符号对你有什么影响？']}],
      insight:'意义不是"找到"的，是"活出来"的。' }},
];

async function main() {
  const count = await p.ohCardPreset.count();
  if (count > 0) { console.log('already seeded:', count, 'rows'); return; }
  for (const d of PRESETS) {
    await p.ohCardPreset.create({ data: { type:d.type, title:d.title, icon:d.icon, color:d.color, isActive:1, sortOrder:0, config:JSON.stringify(d.cfg) } });
  }
  console.log('✓ seeded', PRESETS.length, 'presets');
}
main().catch(console.error).finally(() => p.$disconnect());
