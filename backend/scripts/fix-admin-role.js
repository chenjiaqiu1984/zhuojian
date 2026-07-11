const prisma = require('../db/database');

async function main() {
  const u = await prisma.user.update({
    where: { username: 'admin' },
    data: { role: 'admin' },
  });
  console.log('已修复:', u.username, '-> role:', u.role);
}

main().catch(console.error).finally(() => prisma.$disconnect());
