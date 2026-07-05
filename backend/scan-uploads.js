const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, '../uploads');
const skip = ['ohcards','images','consultants','咨询师介绍'];
const dirs = fs.readdirSync(uploadsDir).filter(f => {
  try { return fs.statSync(path.join(uploadsDir, f)).isDirectory() && !skip.includes(f); }
  catch { return false; }
});
const getAllFiles = (d) => {
  let files = [];
  fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) files = files.concat(getAllFiles(p));
    else files.push(p);
  });
  return files;
};
dirs.forEach(dir => {
  const full = path.join(uploadsDir, dir);
  const subDirs = fs.readdirSync(full).filter(f => fs.statSync(path.join(full, f)).isDirectory());
  const files = getAllFiles(full);
  console.log(`\n=== ${dir} === (${files.length} 张)`);
  if (subDirs.length) console.log(`  子目录: ${subDirs.join(', ')}`);
  files.slice(0,3).forEach(f => console.log('  ' + path.relative(uploadsDir, f)));
});
