const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '..'); // frontend
  const repo = path.resolve(root, '..'); // ohcard
  const src = path.join(repo, '主页竖版.png');
  console.log('src', src, fs.existsSync(src));
  if (!fs.existsSync(src)) {
    console.log(
      'pngs',
      fs.readdirSync(repo).filter((f) => f.toLowerCase().endsWith('.png'))
    );
    process.exit(1);
  }
  const m = await sharp(src).metadata();
  console.log('src dims', m.width, m.height, 'bytes', fs.statSync(src).size);

  const outDir = path.join(root, 'src/static/island');
  fs.mkdirSync(outDir, { recursive: true });

  const jpgPath = path.join(outDir, 'island-base.jpg');
  const webpPath = path.join(outDir, 'island-base.webp');
  const entryPath = path.join(outDir, 'entry.jpg');

  await sharp(src).jpeg({ quality: 82, mozjpeg: true }).toFile(jpgPath + '.tmp');
  await sharp(src).webp({ quality: 72, effort: 6 }).toFile(webpPath + '.tmp');
  await sharp(src)
    .resize({ width: 750, height: 400, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(entryPath + '.tmp');

  fs.renameSync(jpgPath + '.tmp', jpgPath);
  fs.renameSync(webpPath + '.tmp', webpPath);
  fs.renameSync(entryPath + '.tmp', entryPath);

  for (const f of [jpgPath, webpPath, entryPath]) {
    const meta = await sharp(f).metadata();
    console.log(path.basename(f), meta.width, 'x', meta.height, fs.statSync(f).size);
  }

  const staleDir = path.join(root, 'src/pages/island/static');
  if (fs.existsSync(staleDir)) {
    for (const f of fs.readdirSync(staleDir)) {
      fs.unlinkSync(path.join(staleDir, f));
      console.log('removed stale', f);
    }
  }
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
