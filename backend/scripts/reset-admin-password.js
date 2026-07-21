const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();
const sha256 = (str) => crypto.createHash('sha256').update(str).digest('hex');

async function main() {
  const newHash = bcrypt.hashSync(sha256('admin123'), 10);

  const u1 = await prisma.user.update({
    where: { username: 'admin' },
    data: { password: newHash },
  });
  console.log('密码已重置：', u1.username, '(ID:', u1.id + ')');

  const u2 = await prisma.user.update({
    where: { phone: '13851943321' },
    data: { password: newHash },
  });
  console.log('密码已重置：', u2.phone, '(ID:', u2.id + ')');
}

main().catch(console.error).finally(() => prisma.$disconnect());
