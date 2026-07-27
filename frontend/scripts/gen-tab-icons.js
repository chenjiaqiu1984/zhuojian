/**
 * 从 static/icons/*.svg 生成 tabBar 所需的 PNG 图标
 * 用法: node scripts/gen-tab-icons.js
 */
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const ICON_DIR = path.join(__dirname, '../src/static/icons');
const BACKEND_ICON_DIR = path.join(__dirname, '../../backend/static/icons');
const SIZE = 81;

const PAIRS = [
  ['home.svg', 'home.png'],
  ['home-active.svg', 'home-active.png'],
  ['consultant.svg', 'consultant.png'],
  ['consultant-active.svg', 'consultant-active.png'],
  ['card.svg', 'card.png'],
  ['card-active.svg', 'card-active.png'],
  ['news.svg', 'news.png'],
  ['news-active.svg', 'news-active.png'],
  ['profile.svg', 'profile.png'],
  ['profile-active.svg', 'profile-active.png'],
];

for (const [svgName, pngName] of PAIRS) {
  const svgPath = path.join(ICON_DIR, svgName);
  const pngPath = path.join(ICON_DIR, pngName);
  if (!fs.existsSync(svgPath)) {
    console.warn('[skip]', svgName, 'not found');
    continue;
  }
  const svg = fs.readFileSync(svgPath, 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: SIZE },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  fs.writeFileSync(pngPath, png);
  fs.mkdirSync(BACKEND_ICON_DIR, { recursive: true });
  fs.writeFileSync(path.join(BACKEND_ICON_DIR, pngName), png);
  console.log('[ok]', pngName);
}
