// 运行方式：cd backend && node scripts/import-孩童卡人像.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  // 创建或复用分类
  let cat = await prisma.ohCardCategory.findFirst({
    where: { name: '孩童卡人像', type: 'image' }
  });
  if (!cat) {
    cat = await prisma.ohCardCategory.create({
      data: { name: '孩童卡人像', type: 'image', description: '孩童卡·人像' }
    });
    console.log('✓ 创建分类 id:', cat.id);
  } else {
    console.log('分类已存在 id:', cat.id);
  }

  // 扫描图片目录
  const imgDir = path.join(__dirname, '../../uploads/孩童卡/人像卡');
  const files = fs.readdirSync(imgDir).filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
  console.log(`找到 ${files.length} 张图片`);

  let added = 0;
  for (const file of files) {
    const imageUrl = `/uploads/孩童卡/人像卡/${file}`;
    const exists = await prisma.ohCard.findFirst({ where: { imageUrl, categoryId: cat.id } });
    if (!exists) {
      await prisma.ohCard.create({ data: { categoryId: cat.id, imageUrl } });
      added++;
    }
  }
  console.log(`✓ 新增 ${added} 张卡片，跳过重复 ${files.length - added} 张`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
