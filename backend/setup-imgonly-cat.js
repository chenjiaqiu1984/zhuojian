const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  // 新建「心理图卡」（仅图卡，wordCatId=null）
  const cat = await p.ohCardCategory.create({
    data: { name: '心理图卡', type: 'image', isActive: 1, wordCatId: null,
      description: '经典心理图卡，触发直觉联想，适合日常情绪探索、关系觉察和压力释放' }
  });
  console.log('created id:', cat.id);
  // id=1 设置 wordCatId=2（OH字卡）
  await p.ohCardCategory.update({ where: { id: 1 }, data: { wordCatId: 2 } });
  console.log('id=1 wordCatId=2');
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
