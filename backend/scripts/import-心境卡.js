// 运行: cd backend && node scripts/import-心境卡.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const IMG_EXT = /\.(jpe?g|png|webp|gif)$/i;
const EXCLUDE = /背面|背景|说明书|包装|背图/;

async function main() {
  const imgDir = path.join(__dirname, '../../uploads/心境卡');
  if (!fs.existsSync(imgDir)) {
    throw new Error('目录不存在: ' + imgDir);
  }

  const files = fs.readdirSync(imgDir)
    .filter((f) => IMG_EXT.test(f) && !EXCLUDE.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  console.log(`找到 ${files.length} 张图片`);

  let cat = await prisma.ohCardCategory.findFirst({ where: { name: '心境卡' } });
  if (!cat) {
    cat = await prisma.ohCardCategory.create({
      data: {
        name: '心境卡',
        type: 'image',
        description: '情绪心境·内在觉察',
        cover: `/uploads/心境卡/${files[0]}`,
        isActive: 1,
      },
    });
    console.log('✓ 创建牌组 id:', cat.id);
  } else {
    console.log('牌组已存在 id:', cat.id);
  }

  let added = 0;
  for (const file of files) {
    const imageUrl = `/uploads/心境卡/${file}`;
    const word = file.replace(/^\d+/, '').replace(/\.[^.]+$/, '');
    const exists = await prisma.ohCard.findFirst({
      where: { categoryId: cat.id, imageUrl },
    });
    if (!exists) {
      await prisma.ohCard.create({
        data: { categoryId: cat.id, imageUrl, word: word || null },
      });
      added++;
    }
  }
  console.log(`✓ 新增 ${added} 张卡片，跳过重复 ${files.length - added} 张`);

  // 单卡牌组合预设
  const existing = await prisma.ohCardPreset.findFirst({
    where: { type: 'single', title: '心境卡' },
  });
  const cfg = {
    imgCatId: cat.id,
    sub: '情绪觉察·当下心境',
    guideText: '保持你的问题在心中，翻开心境卡，看看此刻的情绪想对你说什么',
  };
  if (!existing) {
    await prisma.ohCardPreset.create({
      data: {
        type: 'single',
        title: '心境卡',
        icon: '🌊',
        color: '#5A8AAA',
        isActive: 1,
        sortOrder: 10,
        config: JSON.stringify(cfg),
      },
    });
    console.log('✓ 已创建单卡预设「心境卡」');
  } else {
    const prev = JSON.parse(existing.config || '{}');
    await prisma.ohCardPreset.update({
      where: { id: existing.id },
      data: { config: JSON.stringify({ ...prev, ...cfg }), isActive: 1 },
    });
    console.log('✓ 已更新单卡预设「心境卡」');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
