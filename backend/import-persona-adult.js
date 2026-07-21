const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();

async function main() {
  const portrait = { id: 13 };
  const interact = { id: 14 };

  const dirs = [
    { dir: path.join(__dirname, '../uploads/成年人像卡/人像卡'), catId: portrait.id, prefix: '/uploads/成年人像卡/人像卡' },
    { dir: path.join(__dirname, '../uploads/成年人像卡/互动卡'), catId: interact.id, prefix: '/uploads/成年人像卡/互动卡' },
  ];

  for (const { dir, catId, prefix } of dirs) {
    const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|bmp|png)$/i.test(f));
    const data = files.map(f => ({ categoryId: catId, imageUrl: `${prefix}/${f}` }));
    const res = await p.ohCard.createMany({ data });
    console.log(`catId=${catId} inserted ${res.count} cards`);
  }

  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
