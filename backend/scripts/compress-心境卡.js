// 运行: cd backend && node scripts/compress-心境卡.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dir = path.join(__dirname, '../../uploads/心境卡');
const IMG = /\.(jpe?g|png|webp)$/i;

async function main() {
  if (!fs.existsSync(dir)) throw new Error('目录不存在: ' + dir);
  const files = fs.readdirSync(dir).filter((f) => IMG.test(f));
  let saved = 0;
  let converted = 0;
  const renames = [];

  for (const file of files) {
    const fp = path.join(dir, file);
    const before = fs.statSync(fp).size;
    const base = file.replace(/\.[^.]+$/, '');
    const outName = `${base}.jpg`;
    const outFp = path.join(dir, outName);
    const tmp = `${outFp}.tmp`;
    try {
      await sharp(fp)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(tmp);

      if (fs.existsSync(outFp) && path.resolve(outFp) !== path.resolve(fp)) {
        fs.unlinkSync(outFp);
      }
      fs.renameSync(tmp, outFp);
      if (path.resolve(outFp) !== path.resolve(fp) && fs.existsSync(fp)) {
        fs.unlinkSync(fp);
      }

      const after = fs.statSync(outFp).size;
      saved += before - after;
      converted++;
      if (file !== outName) {
        renames.push({
          fromUrl: `/uploads/心境卡/${file}`,
          toUrl: `/uploads/心境卡/${outName}`,
        });
      }
      console.log(`${file} → ${outName}: ${Math.round(before / 1024)}KB → ${Math.round(after / 1024)}KB`);
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.warn('跳过', file, e.message);
    }
  }

  let dbUpdated = 0;
  for (const { fromUrl, toUrl } of renames) {
    const r = await prisma.ohCard.updateMany({
      where: { imageUrl: fromUrl },
      data: { imageUrl: toUrl },
    });
    dbUpdated += r.count;
  }

  const cat = await prisma.ohCardCategory.findFirst({ where: { name: '心境卡' } });
  if (cat?.cover?.match(/\.png$/i)) {
    const newCover = cat.cover.replace(/\.png$/i, '.jpg');
    await prisma.ohCardCategory.update({ where: { id: cat.id }, data: { cover: newCover } });
    console.log('cover:', cat.cover, '→', newCover);
  }

  console.log(`\n转换 ${converted} 张，节省 ${(saved / 1024 / 1024).toFixed(1)} MB，DB 更新 ${dbUpdated} 条`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
