#!/usr/bin/env node
// 初始化管理员账号，已存在则跳过
// 用法: node scripts/seed-admins.js

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../db/database');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

const ADMINS = [
  { username: 'admin',       role: 'admin', name: '管理员' },
  { phone:    '13851943321', role: 'admin', name: '管理员' },
];

async function main() {
  const hash = bcrypt.hashSync(sha256('admin123'), 10);

  for (const admin of ADMINS) {
    const key = admin.username ? { username: admin.username } : { phone: admin.phone };
    const existing = await prisma.user.findUnique({ where: key });
    if (existing) {
      console.log(`跳过（已存在）: ${admin.username || admin.phone}`);
      continue;
    }
    await prisma.user.create({ data: { ...admin, password: hash } });
    console.log(`✓ 创建: ${admin.username || admin.phone}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
