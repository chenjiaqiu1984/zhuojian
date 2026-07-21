/**
 * 修复 admin 密码：将密码从旧格式 bcrypt(原密码) 更新为新格式 bcrypt(sha256(原密码))
 *
 * 前端现在发送 SHA-256 哈希后的密码，所以数据库也需要存储 bcrypt(sha256_hash)
 */

const bcrypt = require('bcryptjs');
const prisma = require('./db/database');

async function fixAdminPassword() {
  try {
    // 前端发送的 SHA-256 hash（从登录请求中看到的）
    const sha256Hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

    // 对 SHA-256 hash 进行 bcrypt
    const bcryptedHash = bcrypt.hashSync(sha256Hash, 10);

    console.log('SHA-256 hash:', sha256Hash);
    console.log('Bcrypted hash:', bcryptedHash);

    // 更新 admin 用户的密码
    const result = await prisma.user.update({
      where: { username: 'admin' },
      data: { password: bcryptedHash }
    });

    console.log('✅ Admin 密码已更新:', result.username);
    console.log('现在可以用原密码登录了（前端会自动 SHA-256 处理）');

  } catch (error) {
    console.error('❌ 更新失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminPassword();
