const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const DESCS = [
  { id: 1,  desc: '经典OH卡图卡，触发直觉联想，适合日常情绪探索、关系觉察和压力释放' },
  { id: 4,  desc: '以中国神话原型为主题，探索家族模式、代际传承和文化身份认同' },
  { id: 5,  desc: '专为亲子关系设计，帮助父母理解孩子行为、改善互动模式和打破教养循环' },
  { id: 6,  desc: '专注亲密关系，适合情侣/夫妻探索关系模式、理解彼此和化解冲突' },
  { id: 7,  desc: '人生方向指引，适合重大决策、职业转折或面对人生十字路口时的自我导航' },
  { id: 8,  desc: '充满祝福与积极能量，适合寻找内在资源、自我赋能和获取前行力量' },
  { id: 9,  desc: '孩童人像与情况组合，探索内在小孩、童年经历与当下情绪模式的深层连接' },
  { id: 11, desc: '以抽象色彩和线条触发潜意识，适合探索难以言说的情绪、身体感受和内在冲突' },
  { id: 12, desc: '基于英雄旅程叙事框架，适合人生故事重构、重大转折期和寻找生命意义' },
];

async function main() {
  // 停用 Persona图卡
  await p.ohCardCategory.update({ where: { id: 3 }, data: { isActive: 0 } });
  console.log('Persona图卡 已停用');

  for (const { id, desc } of DESCS) {
    await p.ohCardCategory.update({ where: { id }, data: { description: desc } });
    console.log(`id=${id} 描述已更新`);
  }
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
