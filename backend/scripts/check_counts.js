const Database = require('better-sqlite3');
const path = require('path');

const cur = new Database(path.join(__dirname, '../prisma/zhuojian.db'), { readonly: true });
const bak = new Database('K:/Code_folder/ohcard/backendbackup/prisma/zhuojian.db', { readonly: true });

const tables = ['User', 'Consultant', 'TimeSlot', 'Booking', 'News', 'AssessmentScale', 'AssessmentQuestion', 'AssessmentInterpretation', 'OhCardCategory', 'OhCard', 'ActivityRegistration'];

for (const t of tables) {
  try {
    const b = bak.prepare(`SELECT COUNT(*) as n FROM "${t}"`).get().n;
    const c = cur.prepare(`SELECT COUNT(*) as n FROM "${t}"`).get().n;
    const mark = b > c ? ' <<<< 缺数据' : '';
    console.log(`${t.padEnd(30)} 备份:${String(b).padStart(4)}  当前:${String(c).padStart(4)}${mark}`);
  } catch (e) {
    console.log(`${t.padEnd(30)} 跳过: ${e.message}`);
  }
}

cur.close();
bak.close();
