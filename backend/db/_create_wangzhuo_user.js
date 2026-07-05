const bcrypt = require('bcryptjs');
const prisma = require('./database');

async function main() {
  // Create or update user
  const user = await prisma.user.upsert({
    where: { phone: '13851943321' },
    update: { password: bcrypt.hashSync('admin123', 10), role: 'admin', name: '王卓' },
    create: { phone: '13851943321', password: bcrypt.hashSync('admin123', 10), role: 'admin', name: '王卓' },
  });
  console.log('User:', user.id, user.phone, user.role);

  // Find consultant named 王卓
  const consultant = await prisma.consultant.findFirst({ where: { name: '王卓' } });
  if (!consultant) { console.error('Consultant 王卓 not found'); process.exit(1); }

  // Link user to consultant
  await prisma.consultant.update({ where: { id: consultant.id }, data: { userId: user.id } });
  console.log('Linked consultant:', consultant.id, 'to user:', user.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
