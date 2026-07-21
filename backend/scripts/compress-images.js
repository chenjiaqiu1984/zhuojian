// 用法: node scripts/compress-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../../uploads');

function getImages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? getImages(path.join(dir, e.name))
    : /\.(jpe?g|png|webp)$/i.test(e.name) ? [path.join(dir, e.name)] : []
  );
}

(async () => {
  const files = getImages(uploadsDir);
  console.log(`找到 ${files.length} 张图片，开始压缩...\n`);
  let saved = 0;
  for (const fp of files) {
    const before = fs.statSync(fp).size;
    const tmp = fp + '.tmp';
    try {
      await sharp(fp).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(tmp);
      fs.renameSync(tmp, fp);
      const after = fs.statSync(fp).size;
      saved += before - after;
      console.log(`${path.relative(uploadsDir, fp)}: ${(before/1024).toFixed(0)}KB → ${(after/1024).toFixed(0)}KB`);
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.warn(`跳过 ${path.relative(uploadsDir, fp)}: ${e.message}`);
    }
  }
  console.log(`\n共节省 ${(saved/1024/1024).toFixed(1)} MB`);
})();
