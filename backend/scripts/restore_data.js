const Database = require('better-sqlite3');
const path = require('path');

const curPath = path.join(__dirname, '../prisma/zhuojian.db');
const bakPath = 'K:/Code_folder/ohcard/backendbackup/prisma/zhuojian.db';

const cur = new Database(curPath);
const backup = new Database(bakPath, { readonly: true });

cur.pragma('foreign_keys = OFF');

// ── 1. 恢复用户 ────────────────────────────────────────────────
const bakUsers = backup.prepare('SELECT * FROM User').all();
const insertUser = cur.prepare(`
  INSERT OR IGNORE INTO User
    (id, username, password, phone, email, wechat_openid, qq_openid, role, name, avatar, created_at)
  VALUES
    (@id, @username, @password, @phone, @email, @wechat_openid, @qq_openid, @role, @name, @avatar, @created_at)
`);
let userCount = 0;
for (const u of bakUsers) {
  const r = insertUser.run(u);
  if (r.changes) userCount++;
}
console.log(`✓ 用户恢复: ${userCount}/${bakUsers.length}`);

// ── 2. 恢复咨询师 ─────────────────────────────────────────────
const bakConsultants = backup.prepare('SELECT * FROM Consultant').all();
const insertConsultant = cur.prepare(`
  INSERT OR IGNORE INTO Consultant
    (id, user_id, name, avatar, title, bio, specialties, education, years_exp,
     consult_hours, supervision_hours, certifications, work_experience,
     price, auto_confirm, weekly_template, is_active, created_at)
  VALUES
    (@id, @user_id, @name, @avatar, @title, @bio, @specialties, @education, @years_exp,
     @consult_hours, @supervision_hours, @certifications, @work_experience,
     @price, @auto_confirm, @weekly_template, @is_active, @created_at)
`);
let consultantCount = 0;
for (const c of bakConsultants) {
  try { const r = insertConsultant.run(c); if (r.changes) consultantCount++; } catch (e) { console.error('咨询师插入失败:', e.message, c.id); }
}
console.log(`✓ 咨询师恢复: ${consultantCount}/${bakConsultants.length}`);

// ── 3. 恢复新闻/活动 ──────────────────────────────────────────
const bakNews = backup.prepare('SELECT * FROM News').all();
const newsColumns = cur.prepare("PRAGMA table_info(News)").all().map(c => c.name);
const insertNews = cur.prepare(`
  INSERT OR IGNORE INTO News
    (id, title, summary, content, cover_image, video_url, type, is_published, created_at)
  VALUES
    (@id, @title, @summary, @content, @cover_image, @video_url, @type, @is_published, @created_at)
`);
let newsCount = 0;
for (const n of bakNews) {
  try { const r = insertNews.run(n); if (r.changes) newsCount++; } catch (e) { console.error('新闻插入失败:', e.message, n.id); }
}
console.log(`✓ 新闻/活动恢复: ${newsCount}/${bakNews.length}`);

// ── 4. 恢复量表 ───────────────────────────────────────────────
const bakScales = backup.prepare('SELECT * FROM AssessmentScale').all();
const insertScale = cur.prepare(`
  INSERT OR IGNORE INTO AssessmentScale
    (id, code, name, category, description, introduction, instruction,
     "isPaid", price, "totalQuestions", "estimatedMinutes",
     "isActive", "usageCount", "scoringRule", scenarios, "createdAt")
  VALUES
    (@id, @code, @name, @category, @description, @introduction, @instruction,
     @isPaid, @price, @totalQuestions, @estimatedMinutes,
     @isActive, @usageCount, @scoringRule, @scenarios, @createdAt)
`);
let scaleCount = 0;
for (const s of bakScales) {
  try { const r = insertScale.run(s); if (r.changes) scaleCount++; } catch (e) { console.error('量表插入失败:', e.message, s.id); }
}
console.log(`✓ 量表恢复: ${scaleCount}/${bakScales.length}`);

// ── 5. 恢复量表题目 ───────────────────────────────────────────
const bakQuestions = backup.prepare('SELECT * FROM AssessmentQuestion').all();
const insertQuestion = cur.prepare(`
  INSERT OR IGNORE INTO AssessmentQuestion
    (id, "scaleId", "orderNum", content, options, dimension, age_min, age_max, gender)
  VALUES
    (@id, @scaleId, @orderNum, @content, @options, @dimension, @age_min, @age_max, @gender)
`);
let questionCount = 0;
for (const q of bakQuestions) {
  try { const r = insertQuestion.run(q); if (r.changes) questionCount++; } catch (e) { console.error('题目插入失败:', e.message, q.id); }
}
console.log(`✓ 题目恢复: ${questionCount}/${bakQuestions.length}`);

// ── 6. 恢复解释规则 ───────────────────────────────────────────
const bakInterps = backup.prepare('SELECT * FROM AssessmentInterpretation').all();
const insertInterp = cur.prepare(`
  INSERT OR IGNORE INTO AssessmentInterpretation
    (id, "scaleId", dimension, "minScore", "maxScore", "ageMin", "ageMax",
     gender, level, detail, "calculationMethod", "isNormal", "standardScore", variance)
  VALUES
    (@id, @scaleId, @dimension, @minScore, @maxScore, @ageMin, @ageMax,
     @gender, @level, @detail, @calculationMethod, @isNormal, @standardScore, @variance)
`);
let interpCount = 0;
for (const i of bakInterps) {
  try { const r = insertInterp.run(i); if (r.changes) interpCount++; } catch (e) { console.error('解释插入失败:', e.message, i.id); }
}
console.log(`✓ 解释规则恢复: ${interpCount}/${bakInterps.length}`);

cur.pragma('foreign_keys = ON');
backup.close();
cur.close();
console.log('\n=== 迁移完成 ===');
