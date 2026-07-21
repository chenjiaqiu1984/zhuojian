const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../图卡字卡-电子版');
const dest = path.join(__dirname, '../../uploads/ohcards');

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const files = fs.readdirSync(src).filter(f => f.endsWith('.jpg'));
files.forEach(f => fs.copyFileSync(path.join(src, f), path.join(dest, f)));
console.log(`Copied ${files.length} images to uploads/ohcards/`);
