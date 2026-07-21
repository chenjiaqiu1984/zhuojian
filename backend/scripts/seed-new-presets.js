// node scripts/seed-new-presets.js
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const NEW_PRESETS = [
  // ── 跨卡牌组合（新增6个）──
  { type:'combo', title:'创伤后的自我修复', icon:'🌊', color:'#3A8AAA',
    cfg:{ for:'创伤疗愈·重建安全感',
      slots:[{catId:1,label:'创伤留下的印记',cat:'OH图卡'},{catId:9,label:'受伤时的内在小孩',cat:'孩童卡·人像'},{catId:8,label:'疗愈的礼物',cat:'彩虹卡'},{catId:7,label:'重建安全感的方向',cat:'路标卡'}],
      qs:['OH卡上的场景，和你经历过的某件事有什么联系？','孩童卡上的孩子，那时候需要什么？','彩虹卡作为疗愈的礼物，你愿意接受吗？','路标卡指向的方向，感觉安全还是陌生？'] }},
  { type:'combo', title:'内在批评者对话', icon:'🧩', color:'#7A5AB0',
    cfg:{ for:'自我攻击·完美主义',
      slots:[{catId:2,label:'批评者的声音',cat:'OH字卡'},{catId:9,label:'被批评的内在小孩',cat:'孩童卡·人像'},{catId:8,label:'守护者想说的话',cat:'彩虹卡'}],
      qs:['字卡像不像那个内在批评者的口头禅？','孩童卡上的孩子，听到批评时的感受是什么？','如果守护者出现，它会怎么回应批评者？'] }},
  { type:'combo', title:'女性生命力探索', icon:'🌺', color:'#C05A7A',
    cfg:{ for:'自我接纳·力量重连',
      slots:[{catId:4,label:'女性原型',cat:'中国神话卡'},{catId:1,label:'我的生命力图像',cat:'OH图卡'},{catId:11,label:'身体的感受',cat:'抽象卡'},{catId:8,label:'给自己的祝福',cat:'彩虹卡'}],
      qs:['神话卡上的女性形象，哪里让你有共鸣？','OH卡里的场景，和你的生命力有什么联系？','抽象卡的颜色和线条，在身体哪里有感觉？'] }},
  { type:'combo', title:'男性气质与柔软', icon:'🦁', color:'#C07A30',
    cfg:{ for:'情感表达·阳性整合',
      slots:[{catId:4,label:'阳性原型',cat:'中国神话卡'},{catId:10,label:'习惯的姿态',cat:'孩童卡·情况'},{catId:1,label:'柔软的图像',cat:'OH图卡'},{catId:7,label:'整合的方向',cat:'路标卡'}],
      qs:['神话卡上的男性形象，让你有什么反应？','孩童卡上的姿态，是从哪里学来的？','OH卡上的柔软，你愿意触碰吗？'] }},
  { type:'combo', title:'身体与情绪连接', icon:'🌿', color:'#5A8A60',
    cfg:{ for:'躯体化·压力释放',
      slots:[{catId:11,label:'压力在身体的样子',cat:'抽象卡'},{catId:10,label:'身体的姿态语言',cat:'孩童卡·情况'},{catId:8,label:'身体需要的礼物',cat:'彩虹卡'}],
      qs:['抽象卡和你身体某个部位的感觉有什么联系？','孩童卡上的姿态，你的身体平时常常这样吗？','彩虹卡如果是身体发出的请求，那个请求是什么？'] }},
  { type:'combo', title:'未来自我对话', icon:'🔮', color:'#5A4A8A',
    cfg:{ for:'目标探索·内在资源',
      slots:[{catId:12,label:'未来旅程的画面',cat:'英雄之旅故事卡'},{catId:7,label:'迈向未来的方向',cat:'路标卡'},{catId:1,label:'已有的内在资源',cat:'OH图卡'},{catId:2,label:'未来自我的关键词',cat:'OH字卡'}],
      qs:['故事卡上的画面，和你对未来的想象有什么联系？','资源卡上有什么，是你已经拥有但还没意识到的？','字卡如果是未来自我对现在的你说的话，那句话是什么？'] }},

  // ── 场景选卡（新增5个）──
  { type:'scene', title:'面临一个重要选择', icon:'😰', color:'#4A6A9A',
    cfg:{ sub:'决策支持·内在清晰',
      slots:[{catId:7,label:'选项A的感觉',cat:'路标卡'},{catId:7,label:'选项B的感觉',cat:'路标卡'},{catId:2,label:'真正在意的是',cat:'OH字卡'}],
      qs:['两张路标卡，身体对哪张有更多反应？','字卡出现在这里，和你的纠结有什么联系？','放下"应该"，你的直觉倾向于哪边？'] }},
  { type:'scene', title:'身体有些不舒服', icon:'🤒', color:'#8A6A4A',
    cfg:{ sub:'身心连接·情绪觉察',
      slots:[{catId:11,label:'不舒服的感觉',cat:'抽象卡'},{catId:10,label:'身体的姿态',cat:'孩童卡·情况'},{catId:8,label:'身体想要的',cat:'彩虹卡'}],
      qs:['抽象卡和你的不舒服有什么联系？','如果身体会说话，它在说什么？','彩虹卡上出现的，你愿意给身体这个礼物吗？'] }},
  { type:'scene', title:'结束一段关系', icon:'🧳', color:'#5A7A8A',
    cfg:{ sub:'告别哀伤·重新出发',
      slots:[{catId:6,label:'这段关系的样子',cat:'伴侣卡'},{catId:12,label:'这段旅程的意义',cat:'英雄之旅故事卡'},{catId:7,label:'下一段路的方向',cat:'路标卡'}],
      qs:['伴侣卡上的画面，让你想到这段关系的什么？','故事卡如果是你们关系的章节名，叫什么？','路标卡指向的方向，你感到准备好了吗？'] }},
  { type:'scene', title:'完成了一个里程碑', icon:'🎓', color:'#6A5A9A',
    cfg:{ sub:'庆祝整合·意义沉淀',
      slots:[{catId:12,label:'这段旅程',cat:'英雄之旅故事卡'},{catId:1,label:'带走的礼物',cat:'OH图卡'},{catId:8,label:'给自己的祝贺',cat:'彩虹卡'}],
      qs:['故事卡上的画面，和你刚走过的这段路有什么联系？','OH卡里有什么，是你这段时间真正得到的？','彩虹卡作为庆祝，你想对自己说什么？'] }},
  { type:'scene', title:'感觉麻木说不出来', icon:'😶', color:'#7A7A6A',
    cfg:{ sub:'情绪唤醒·内在接触',
      slots:[{catId:11,label:'麻木的颜色和质地',cat:'抽象卡'},{catId:1,label:'麻木下面的图像',cat:'OH图卡'},{catId:9,label:'需要被看见的那个',cat:'孩童卡·人像'}],
      qs:['抽象卡和你此刻的状态有什么联系？','OH卡上的场景，有没有让你有一点点感觉？','孩童卡上的孩子，此刻需要什么？'] }},

  // ── 人生困境（新增4个）──
  { type:'dilemma', title:'讨厌镜子里的自己', icon:'🪞', color:'#6A4A7A',
    cfg:{ core:'身体形象困扰、自我接纳障碍', cards:'OH图卡 + 孩童卡·人像 + 彩虹卡',
      sub:'身体形象·自我接纳',
      slots:[{catId:1,label:'眼中的自己',cat:'OH图卡'},{catId:9,label:'被批评的那个我',cat:'孩童卡·人像'},{catId:8,label:'接纳的可能',cat:'彩虹卡'}],
      playName:'镜子里的陌生人', intro:'对自己外表的严苛批评，往往背后有更深的心理根源。',
      steps:[{action:'抽1张OH图卡代表我眼中的自己',guides:['不用评判，只是看着，有什么浮现？']},{action:'抽1张彩虹卡代表如果接纳是可能的，它看起来像什么？',guides:['接纳和喜欢不同，接纳是什么感觉？']}],
      insight:'你对自己身体的评判，往往折射着你对更多东西的评判标准。' }},
  { type:'dilemma', title:'停不下来又累又空', icon:'🏃', color:'#7A5A3A',
    cfg:{ core:'强迫性忙碌、以行动回避情绪', cards:'路标卡 + 抽象卡 + 孩童卡·人像',
      sub:'强迫忙碌·内在逃避',
      slots:[{catId:7,label:'一直在跑向哪里',cat:'路标卡'},{catId:11,label:'停下来时的感觉',cat:'抽象卡'},{catId:9,label:'内心深处那个孩子',cat:'孩童卡·人像'}],
      playName:'停下来的恐惧', intro:'停不下来有时不是因为热爱，而是因为停下来会面对某些难以承受的东西。',
      steps:[{action:'抽1张路标卡代表我一直在跑向的方向',guides:['跑向那里是为了什么？']},{action:'抽1张抽象卡代表当我停下来时身体里出现的感觉',guides:['那种感觉你熟悉吗？什么时候有过这种感觉？']}],
      insight:'忙碌是一种有效的防御，但也是一堵墙，把你和你自己隔开了。' }},
  { type:'dilemma', title:'有话说不出口', icon:'🤐', color:'#4A6A5A',
    cfg:{ core:'沟通障碍、表达恐惧、内心壁垒', cards:'OH字卡 + 孩童卡·情况 + 伴侣卡',
      sub:'沟通障碍·内心壁垒',
      slots:[{catId:2,label:'想说的话',cat:'OH字卡'},{catId:10,label:'说话时的身体姿态',cat:'孩童卡·情况'},{catId:6,label:'说话对象',cat:'伴侣卡'}],
      playName:'未说出口的话', intro:'有些话堵在喉咙里，不是因为不重要，而是因为说出来感觉危险。',
      steps:[{action:'抽1张OH字卡代表那句最想说但说不出口的话',guides:['看到这个词，身体有什么反应？']},{action:'抽1张孩童卡·情况代表说话时身体习惯的姿态',guides:['这个姿态是什么时候开始学会的？']}],
      insight:'说不出口的话，往往不是第一次说不出来了。' }},
  { type:'dilemma', title:'对未来感到恐惧', icon:'🌫️', color:'#6A7A8A',
    cfg:{ core:'焦虑性预期、灾难化思维', cards:'英雄之旅故事卡 + 路标卡 + 彩虹卡',
      sub:'焦虑预期·当下锚定',
      slots:[{catId:12,label:'恐惧的场景',cat:'英雄之旅故事卡'},{catId:7,label:'可以踩实的当下',cat:'路标卡'},{catId:8,label:'内在的支撑',cat:'彩虹卡'}],
      playName:'恐惧的地图', intro:'对未来的恐惧往往不是真实的危险，而是内心的某种预警信号。',
      steps:[{action:'抽1张英雄之旅卡代表恐惧里最常出现的那个场景',guides:['这个场景和你真实生活有什么联系？']},{action:'抽1张路标卡代表当下可以踩实的一个方向',guides:['如果脚踩在这里，感觉稳吗？']}],
      insight:'恐惧未来，有时是因为还没有找到活在当下的方式。' }},
];

async function main() {
  let added = 0, skipped = 0;
  for (const d of NEW_PRESETS) {
    const exists = await p.ohCardPreset.findFirst({ where: { type: d.type, title: d.title } });
    if (exists) { console.log('skip:', d.title); skipped++; continue; }
    await p.ohCardPreset.create({
      data: { type: d.type, title: d.title, icon: d.icon, color: d.color, isActive: 1, sortOrder: 0, config: JSON.stringify(d.cfg) }
    });
    console.log('added:', d.title);
    added++;
  }
  console.log(`\n✓ done — added ${added}, skipped ${skipped}`);
}
main().catch(console.error).finally(() => p.$disconnect());
