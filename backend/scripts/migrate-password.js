#!/usr/bin/env node
// 一次性迁移：将所有有密码的账号统一设为 bcrypt(sha256("admin123"))
// 用法: node scripts/migrate-password.js [--dry-run]

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../db/database');

const dryRun = process.argv.includes('--dry-run');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

async function main() {
  const users = await prisma.user.findMany({
    where: { password: { not: null } },
    select: { id: true, username: true, phone: true, email: true, role: true },
  });

  if (users.length === 0) { console.log('没有需要迁移的账号'); return; }

  console.log(`找到 ${users.length} 个账号：`);
  users.forEach(u => {
    const contact = u.phone || u.email || '(无手机/邮箱)';
    console.log(`  [${u.role}] ${u.username || '(无用户名)'} — ${contact}`);
  });

  if (dryRun) { console.log('\n--dry-run 模式，未做修改'); return; }

  const newHash = bcrypt.hashSync(sha256('admin123'), 10);
  await prisma.user.updateMany({
    where: { id: { in: users.map(u => u.id) } },
    data: { password: newHash },
  });

  console.log(`\n✓ 已将 ${users.length} 个账号密码统一设为 admin123`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
