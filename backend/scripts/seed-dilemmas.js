// node scripts/seed-dilemmas.js
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const DATA = [
  { title:'成功却感觉空虚', icon:'🎭', color:'#E07040',
    cfg:{ core:'外在成就与内在空虚脱节', cards:'英雄之旅故事卡 + 彩虹卡 + OH图卡',
      slots:[{catId:1,label:'外界看到的成功我',cat:'OH图卡'},{catId:12,label:'真正在寻找的',cat:'英雄之旅卡'},{catId:8,label:'摘下面具想说的',cat:'彩虹卡'}],
      playName:'成功面具下的脸', intro:'外在成就与内在感受之间的落差，是一种常见但难以言说的体验。',
      steps:[{action:'抽1张OH图卡代表外界看到的成功我',guides:['这个形象让你感到什么？']},{action:'抽1张彩虹卡代表摘下面具想说的话',guides:['如果你说出这张卡上的内容，身体有什么反应？']}],
      insight:'成功可能是对"不被爱"的补偿，找到补偿背后的空洞，才能触达真正的渴望。' }},
  { title:'照顾者的枯竭', icon:'🤲', color:'#4A8A7A',
    cfg:{ core:'讨好/拯救者模式，边界模糊', cards:'孩童卡·情况 + 孩童卡·情况 + 路标卡',
      slots:[{catId:10,label:'关系中的身体姿态',cat:'孩童卡·情况'},{catId:10,label:'家里扮演的角色',cat:'孩童卡·情况'},{catId:7,label:'精力转向自己的方向',cat:'路标卡'}],
      playName:'照顾者的起源', intro:'持续给予而难以接受，是许多人深层的关系模式。',
      steps:[{action:'抽1张孩童卡·情况：摆出在关系中习惯的身体姿态',guides:['你注意到身体哪个部位有感觉？']},{action:'抽1张路标卡：如果把同样的精力转向自己，会走向哪里？',guides:['这个方向对你来说是什么感觉？']}],
      insight:'照顾别人可能是童年学会的生存策略，找到那个需要被照顾的内在小孩。' }},
  { title:'害怕被抛弃', icon:'🚪', color:'#7B68EE',
    cfg:{ core:'回避型依恋，用冷漠保护自己', cards:'伴侣卡 + 抽象卡 + 中国神话卡',
      slots:[{catId:6,label:'渴望的亲密关系',cat:'伴侣卡'},{catId:11,label:'靠近时的警报',cat:'抽象卡'},{catId:4,label:'恐惧的古老原型',cat:'中国神话卡'}],
      playName:'推开的背后', intro:'在渴望连接的同时又保持距离，这种矛盾的内在体验往往有其深刻的来源。',
      steps:[{action:'抽1张伴侣卡：代表我渴望的亲密关系',guides:['如果它代表一种渴望，那个渴望是什么样子的？']},{action:'抽1张抽象卡：代表当我靠近时身体里的警报声',guides:['这种感觉在身体的哪里？']}],
      insight:'推开不是不爱，是太爱所以太怕。' }},
  { title:'做很多却不够好', icon:'⚖️', color:'#3A6E80',
    cfg:{ core:'完美主义、自我批评、内在有严苛的法官', cards:'孩童卡·人像 + OH字卡 + 彩虹卡',
      slots:[{catId:9,label:'被审判的内在小孩',cat:'孩童卡·人像'},{catId:2,label:'内在法官的话',cat:'OH字卡'},{catId:8,label:'守护者想说的',cat:'彩虹卡'}],
      playName:'内在法官的审判', intro:'那个不断评判自己"还不够好"的声音，往往早在我们有意识之前就已经形成。',
      steps:[{action:'抽1张孩童卡·人像：代表被审判的内在小孩',guides:['如果这个孩子有情绪，是什么情绪？']},{action:'抽1张彩虹卡：代表如果法官退休，想对小孩说的话',guides:['那个孩子可能会有什么反应？']}],
      insight:'那个法官的声音往往不是你自己的，找到它最初是从谁那里学来的。' }},
  { title:'不知道我是谁', icon:'🌀', color:'#8A5A7A',
    cfg:{ core:'身份危机、中年/青年迷茫、自我重构', cards:'英雄之旅故事卡 + 中国神话卡 + 路标卡 + OH图卡',
      slots:[{catId:1,label:'正在告别的旧身份',cat:'OH图卡'},{catId:12,label:'告别的更大意义',cat:'英雄之旅卡'},{catId:4,label:'觉醒的新原型',cat:'中国神话卡'},{catId:7,label:'新身份的方向',cat:'路标卡'}],
      playName:'身份葬礼与重生', intro:'某些人生阶段，旧有的自我认同开始动摇，而新的自我尚未清晰成形。',
      steps:[{action:'抽1张OH图卡代表正在告别的旧身份',guides:['留恋、如释重负，还是其他什么？']},{action:'抽1张路标卡代表新身份的第一个行动方向',guides:['你的第一反应是什么？']}],
      insight:'身份危机不是崩溃，是升级。' }},
  { title:'愤怒不敢表达', icon:'🔥', color:'#D4603A',
    cfg:{ core:'情绪压抑、害怕冲突', cards:'抽象卡 + 孩童卡·情况 + 中国神话卡',
      slots:[{catId:11,label:'愤怒的形状',cat:'抽象卡'},{catId:10,label:'家里处理愤怒的方式',cat:'孩童卡·情况'},{catId:4,label:'愤怒的神圣力量',cat:'中国神话卡'}],
      playName:'愤怒的变形记', intro:'愤怒是人类情绪系统中的重要一员，它携带着能量、边界与保护的信号。',
      steps:[{action:'抽1张抽象卡：代表我的愤怒如果是一种颜色/形状/能量',guides:['它的哪个部分让你有反应？']},{action:'抽1张中国神话卡：如果我的愤怒是一种神圣力量，它是什么？',guides:['如果它携带着某种能量，是什么样的能量？']}],
      insight:'愤怒不是敌人，是被误解的守护者。' }},
  { title:'想原谅却做不到', icon:'🕊️', color:'#6A8A5A',
    cfg:{ core:'被背叛/伤害后，卡在原谅与怨恨之间', cards:'OH图卡 + 孩童卡·人像 + 彩虹卡 + 路标卡',
      slots:[{catId:1,label:'伤害发生的场景',cat:'OH图卡'},{catId:9,label:'受伤时的我',cat:'孩童卡·人像'},{catId:8,label:'需要听到的话',cat:'彩虹卡'},{catId:7,label:'不原谅在守护的',cat:'路标卡'}],
      playName:'原谅的三扇门', intro:'"放不下"有时被视为执念，但放不下往往在守护着某些重要的东西。',
      steps:[{action:'抽1张孩童卡·人像代表受伤时的我',guides:['那时的你需要什么？']},{action:'抽1张路标卡代表如果我不原谅，在守护什么？',guides:['守护这个东西对你来说意味着什么？']}],
      insight:'原谅不是赦免对方，是释放自己。' }},
];

async function main() {
  for (const d of DATA) {
    const exists = await p.ohCardPreset.findFirst({ where: { type: 'dilemma', title: d.title } });
    if (!exists) {
      await p.ohCardPreset.create({ data: { type:'dilemma', title:d.title, icon:d.icon, color:d.color, isActive:1, sortOrder:0, config:JSON.stringify(d.cfg) } });
      console.log('added:', d.title);
    } else {
      console.log('skip:', d.title);
    }
  }
}
main().catch(console.error).finally(() => p.$disconnect());
