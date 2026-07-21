/**
 * 确保超级管理员账号存在：admin / admin123
 * 用法：node scripts/ensure-super-admin.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function main() {
  const hash = bcrypt.hashSync(sha256('admin123'), 10);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hash,
      role: 'super_admin',
      name: '超级管理员',
    },
    create: {
      username: 'admin',
      password: hash,
      role: 'super_admin',
      name: '超级管理员',
    },
  });
  console.log(`超级管理员已就绪: ${user.username} (ID:${user.id}, role:${user.role})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
