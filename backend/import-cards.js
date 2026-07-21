const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const uploadsDir = path.join(__dirname, '../uploads');
const EXCLUDE = /背面|背景|说明书/;
const IMG_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

const CATEGORIES = [
  { name: '中国神话卡',    dir: '中国神话卡' },
  { name: '亲子互动工具卡', dir: '亲子互动工具卡' },
  { name: '伴侣卡',        dir: '伴侣卡/伴侣卡' },
  { name: '路标卡',        dir: '伴侣卡/路标卡' },
  { name: '彩虹卡',        dir: '彩虹卡' },
  { name: '孩童卡·人像',   dir: '孩童卡/人像卡' },
  { name: '孩童卡·情况',   dir: '孩童卡/情况卡' },
  { name: '抽象卡',        dir: '抽象卡' },
  { name: '英雄之旅故事卡', dir: '英雄之旅故事卡' },
];

async function main() {
  for (const { name, dir } of CATEGORIES) {
    const fullDir = path.join(uploadsDir, dir);
    const files = fs.readdirSync(fullDir)
      .filter(f => IMG_EXT.test(f) && !EXCLUDE.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (!files.length) { console.log(`${name}: 无图片，跳过`); continue; }

    const existing = await prisma.ohCardCategory.findFirst({ where: { name } });
    if (existing) { console.log(`${name}: 已存在 (id=${existing.id})，跳过`); continue; }

    const urlPrefix = '/uploads/' + dir.replace(/\\/g, '/');
    const cat = await prisma.ohCardCategory.create({
      data: { name, type: 'image', cover: urlPrefix + '/' + files[0], isActive: 1 }
    });
    await prisma.ohCard.createMany({
      data: files.map(f => ({ categoryId: cat.id, imageUrl: urlPrefix + '/' + f }))
    });
    console.log(`✓ ${name}: id=${cat.id}，导入 ${files.length} 张`);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
