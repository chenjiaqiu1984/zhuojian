/**
 * 每日首次进入门禁：未抽卡 → 自动抽卡页；已抽过 → 心镜岛。
 * 本地按「用户 + 自然日」缓存，避免同日反复打断。
 */
import { ohcardApi } from '../api/index';

const DAILY_URL = '/pages/ohcard/daily?auto=1';
const ISLAND_URL = '/pages/index/index';

let running = false;

export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function currentUserId() {
  try {
    const u = JSON.parse(uni.getStorageSync('user') || 'null');
    return u?.id ? String(u.id) : '';
  } catch {
    return '';
  }
}

function storageKey() {
  const uid = currentUserId();
  return uid ? `dailyGateDate:${uid}` : 'dailyGateDate';
}

export function markDailyGateDone(date = todayKey()) {
  try {
    uni.setStorageSync(storageKey(), date);
  } catch {}
}

export function isDailyGateDone() {
  try {
    return uni.getStorageSync(storageKey()) === todayKey();
  } catch {
    return false;
  }
}

function isPendingUser() {
  try {
    const userStr = uni.getStorageSync('user');
    if (!userStr) return false;
    const user = JSON.parse(userStr);
    return !!(user && user.status === 'pending');
  } catch {
    return false;
  }
}

function goDaily() {
  uni.reLaunch({ url: DAILY_URL });
}

function goIsland() {
  uni.reLaunch({ url: ISLAND_URL });
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.force] 忽略本地「今日已检查」标记（登录成功时用）
 * @param {'island'|'stay'} [opts.onDrawn] 已抽过时：跳转心镜岛 / 留在当前页
 * @returns {Promise<'guest'|'pending'|'skip'|'daily'|'island'|'error'>}
 */
export async function runDailyGate(opts = {}) {
  const { force = false, onDrawn = 'island' } = opts;

  if (running) return 'skip';
  const token = uni.getStorageSync('token');
  if (!token) return 'guest';
  if (isPendingUser()) return 'pending';
  if (!force && isDailyGateDone()) return 'skip';

  running = true;
  try {
    const data = await ohcardApi.dailyToday();
    const date = data.date || todayKey();

    if (data.drawn) {
      markDailyGateDone(date);
      if (onDrawn === 'island') goIsland();
      return 'island';
    }

    // 未抽过：进入自动抽卡页；完成抽卡后再写本地标记，避免中途离开后不再引导
    goDaily();
    return 'daily';
  } catch (e) {
    if (e?.__authRedirect) return 'guest';
    // 网络异常不阻断进入，避免卡死在登录页
    if (onDrawn === 'island') goIsland();
    return 'error';
  } finally {
    running = false;
  }
}
