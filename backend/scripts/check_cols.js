const Database = require('better-sqlite3');
const path = require('path');

const bak = new Database('K:/Code_folder/ohcard/backendbackup/prisma/zhuojian.db', { readonly: true });

for (const t of ['TimeSlot', 'Booking', 'OhCardCategory', 'OhCard']) {
  const cols = bak.prepare(`PRAGMA table_info("${t}")`).all().map(c => c.name);
  console.log(`${t}: ${cols.join(', ')}`);
}

bak.close();
