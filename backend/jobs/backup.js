const cron = require('node-cron');
const fs   = require('fs');
const path = require('path');

const DB_PATH      = path.join(__dirname, '../prisma/zhuojian.db');
const BACKUP_DIR   = path.join(__dirname, '../backups');
const MAX_BACKUPS  = 30; // 保留最近30份（约5天）

function pad(n) { return String(n).padStart(2, '0'); }

function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const now  = new Date();
  const name = `zhuojian_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.db`;
  const dest = path.join(BACKUP_DIR, name);

  try {
    fs.copyFileSync(DB_PATH, dest);
    console.log(`[Backup] ✓ ${name}`);
  } catch (e) {
    console.error('[Backup] 备份失败:', e.message);
    return;
  }

  // 清理超出上限的旧备份
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('zhuojian_') && f.endsWith('.db'))
    .sort();
  while (files.length > MAX_BACKUPS) {
    const old = files.shift();
    fs.unlinkSync(path.join(BACKUP_DIR, old));
    console.log(`[Backup] 清理旧备份: ${old}`);
  }
}

function startBackupJob() {
  // 每4小时整点备份：0点、4点、8点、12点、16点、20点
  cron.schedule('0 */4 * * *', runBackup);
  console.log('[Backup] 自动备份已启动（每4小时）');
  // 启动时立即执行一次
  runBackup();
}

module.exports = { startBackupJob, runBackup };
