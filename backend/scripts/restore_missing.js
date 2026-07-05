const Database = require('better-sqlite3');
const path = require('path');

const cur = new Database(path.join(__dirname, '../prisma/zhuojian.db'));
const bak = new Database('K:/Code_folder/ohcard/backendbackup/prisma/zhuojian.db', { readonly: true });

cur.pragma('foreign_keys = OFF');

// ── 1. TimeSlot ───────────────────────────────────────────────
const slots = bak.prepare('SELECT * FROM TimeSlot').all();
const insertSlot = cur.prepare(`
  INSERT OR IGNORE INTO TimeSlot (id, consultant_id, start_time, end_time, is_booked)
  VALUES (@id, @consultant_id, @start_time, @end_time, @is_booked)
`);
let slotCount = 0;
const insertSlots = cur.transaction(() => {
  for (const s of slots) { const r = insertSlot.run(s); if (r.changes) slotCount++; }
});
insertSlots();
console.log(`✓ TimeSlot 恢复: ${slotCount}/${slots.length}`);

// ── 2. Booking ────────────────────────────────────────────────
const bookings = bak.prepare('SELECT * FROM Booking').all();
const insertBooking = cur.prepare(`
  INSERT OR IGNORE INTO Booking
    (id, user_id, consultant_id, slot_id, second_slot_id, status, notes, message, created_at)
  VALUES
    (@id, @user_id, @consultant_id, @slot_id, @second_slot_id, @status, @notes, @message, @created_at)
`);
let bookingCount = 0;
for (const b of bookings) {
  try { const r = insertBooking.run(b); if (r.changes) bookingCount++; } catch (e) { console.error('Booking失败:', e.message); }
}
console.log(`✓ Booking 恢复: ${bookingCount}/${bookings.length}`);

// ── 3. OhCardCategory ─────────────────────────────────────────
const cats = bak.prepare('SELECT * FROM OhCardCategory').all();
const insertCat = cur.prepare(`
  INSERT OR IGNORE INTO OhCardCategory
    (id, name, type, description, cover, is_active, created_at, word_cat_id, img_src_cat_id)
  VALUES
    (@id, @name, @type, @description, @cover, @is_active, @created_at, @word_cat_id, @img_src_cat_id)
`);
let catCount = 0;
const insertCats = cur.transaction(() => {
  for (const c of cats) { const r = insertCat.run(c); if (r.changes) catCount++; }
});
insertCats();
console.log(`✓ OhCardCategory 恢复: ${catCount}/${cats.length}`);

// ── 4. OhCard ────────────────────────────────────────────────
const cards = bak.prepare('SELECT * FROM OhCard').all();
const insertCard = cur.prepare(`
  INSERT OR IGNORE INTO OhCard (id, category_id, image_url, word, description, created_at)
  VALUES (@id, @category_id, @image_url, @word, @description, @created_at)
`);
let cardCount = 0;
const insertCards = cur.transaction(() => {
  for (const c of cards) { const r = insertCard.run(c); if (r.changes) cardCount++; }
});
insertCards();
console.log(`✓ OhCard 恢复: ${cardCount}/${cards.length}`);

cur.pragma('foreign_keys = ON');
cur.close();
bak.close();
console.log('\n=== 完成 ===');
