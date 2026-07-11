const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targets = [
    { username: 'admin' },
    { phone: '13851943321' },
    { phone: '17398060384' },
  ];
  for (const where of targets) {
    const u = await prisma.user.update({ where, data: { role: 'super_admin' } }).catch(() => null);
    if (u) console.log(`✓ ${u.username || u.phone} (ID:${u.id}) → super_admin`);
    else console.log(`✗ 未找到用户:`, where);
  }
}

main().finally(() => prisma.$disconnect());
