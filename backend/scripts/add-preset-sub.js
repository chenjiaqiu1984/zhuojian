// node scripts/add-preset-sub.js
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const SUB_MAP = {
  // single
  '心理图卡':      '图像投射·自由联想',
  '心理图卡+字卡': '图像+词语·双重联想',
  '伴侣卡':        '关系探索·亲密连接',
  '孩童卡·人像':   '内在小孩·情感觉察',
  // scene
  '今天想获得能量':   '补充动力·找回方向',
  '理解一个梦':       '梦境解读·潜意识探索',
  '和伴侣吵架后':     '关系修复·重建连接',
  '孩子让我崩溃':     '亲子觉察·情绪疏导',
  '要不要换工作':     '职业决策·内在导航',
  '感觉童年影响了我': '代际疗愈·资源发现',
  '童年影响了我':     '代际疗愈·资源发现',
  '做年度复盘':       '回顾过去·展望未来',
  // scene (new)
  '面临一个重要选择': '决策支持·内在清晰',
  '身体有些不舒服':   '身心连接·情绪觉察',
  '结束一段关系':     '告别哀伤·重新出发',
  '完成了一个里程碑': '庆祝整合·意义沉淀',
  '感觉麻木说不出来': '情绪唤醒·内在接触',
  // dilemma
  '想改变却动不了': '内在冲突·行动障碍',
  '关系里的重复':   '强迫重复·依恋模式',
  '成功却感觉空虚': '外在成就·内在失落',
  '照顾者的枯竭':   '讨好模式·边界缺失',
  '害怕被抛弃':     '回避依恋·渴望连接',
  '做很多却不够好': '完美主义·内在批评',
  '不知道我是谁':   '身份危机·自我重构',
  '愤怒不敢表达':   '情绪压抑·边界守护',
  '想原谅却做不到': '背叛创伤·释放执念',
  '感觉没有意义':   '存在空虚·意义重建',
  // dilemma (new)
  '讨厌镜子里的自己': '身体形象·自我接纳',
  '停不下来又累又空': '强迫忙碌·内在逃避',
  '有话说不出口':     '沟通障碍·内心壁垒',
  '对未来感到恐惧':   '焦虑预期·当下锚定',
};

async function main() {
  const presets = await p.ohCardPreset.findMany({
    where: { type: { in: ['single', 'scene', 'dilemma'] } }
  });

  let updated = 0;
  for (const preset of presets) {
    const sub = SUB_MAP[preset.title];
    if (!sub) { console.log('no sub for:', preset.title); continue; }

    const config = preset.config ? JSON.parse(preset.config) : {};
    if (config.sub === sub) { console.log('skip (same):', preset.title); continue; }

    config.sub = sub;
    await p.ohCardPreset.update({
      where: { id: preset.id },
      data: { config: JSON.stringify(config) }
    });
    console.log('updated:', preset.title, '->', sub);
    updated++;
  }
  console.log(`\n✓ done, updated ${updated} presets`);
}

main().catch(console.error).finally(() => p.$disconnect());
