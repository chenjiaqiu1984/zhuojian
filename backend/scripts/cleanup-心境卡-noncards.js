// 清理心境卡中的非卡牌图片（包装/背图/背景等）
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NON_CARD = /包装|背图|背景|说明书|背面/;

async function main() {
  const cat = await prisma.ohCardCategory.findFirst({ where: { name: '心境卡' } });
  if (!cat) {
    console.log('未找到心境卡牌组');
    return;
  }

  const cards = await prisma.ohCard.findMany({
    where: { categoryId: cat.id },
    select: { id: true, imageUrl: true, word: true },
  });

  const bad = cards.filter(
    (c) => NON_CARD.test(c.imageUrl || '') || NON_CARD.test(c.word || '')
  );
  console.log('牌组总数:', cards.length);
  console.log('待删除:', bad.map((c) => ({ id: c.id, imageUrl: c.imageUrl, word: c.word })));

  if (!bad.length) {
    console.log('无需清理');
    return;
  }

  const r = await prisma.ohCard.deleteMany({
    where: { id: { in: bad.map((c) => c.id) } },
  });
  console.log('✓ 已删除', r.count, '条');

  const left = await prisma.ohCard.count({ where: { categoryId: cat.id } });
  console.log('剩余卡牌:', left);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
