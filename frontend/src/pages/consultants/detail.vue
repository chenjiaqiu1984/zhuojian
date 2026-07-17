<template>
  <view class="page" v-if="consultant">
    <!-- 顶部头像 -->
    <view class="hero">
      <image class="avatar" :src="fullUrl(consultant.avatar) || '/static/default-avatar.png'" mode="aspectFill" />
      <view class="meta">
        <text class="name">{{consultant.name}}</text>
        <text class="title-text">{{consultant.title}}</text>
        <text class="price" v-if="consultant.price">¥{{ (consultant.price / 100).toFixed(2) }} / 次</text>
      </view>
    </view>

    <!-- 督导与咨询时长 -->
    <view class="stat-row">
      <view class="stat-item">
        <text class="stat-num">{{consultant.yearsExp}}</text>
        <text class="stat-label">年从业经验</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">8000小时+</text>
        <text class="stat-label">咨询时长</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">1000小时+</text>
        <text class="stat-label">督导时长</text>
      </view>
    </view>

    <!-- 个人简介 -->
    <view class="card">
      <text class="card-title">个人简介</text>
      <text class="bio">{{consultant.bio}}</text>
    </view>

    <!-- 擅长领域 -->
    <view class="card" v-if="specialties.length">
      <text class="card-title">擅长领域</text>
      <view class="tag-wrap">
        <text class="tag" v-for="s in specialties" :key="s">{{s}}</text>
      </view>
    </view>

    <!-- 资质证书 （突出展示执照信息）-->
    <view class="card" v-if="certifications.length">
      <text class="card-title">执业资质</text>
      <view class="cert-badge-wrap">
        <view class="cert-badge" v-for="c in certifications" :key="c">
          <text class="cert-icon">🏅</text>
          <text class="cert-text">{{c}}</text>
        </view>
      </view>
    </view>

    <!-- 教育背景 -->
    <view class="card" v-if="credentials.length">
      <text class="card-title">教育背景</text>
      <view class="cred-item" v-for="c in credentials" :key="c">
        <text class="cred-dot">🎖</text>
        <text class="cred-text">{{c}}</text>
      </view>
    </view>

    <!-- 从业经历 -->
    <view class="card" v-if="consultant.workExperience">
      <text class="card-title">从业经历</text>
      <text class="bio">{{consultant.workExperience}}</text>
    </view>

    <!-- 资质证书图片 -->
    <view class="card" v-if="certImages.length">
      <text class="card-title">证书原件</text>
      <view class="cert-img-row">
        <image
          v-for="(img, i) in certImages"
          :key="i"
          class="cert-thumb"
          :src="fullUrl(img)"
          mode="aspectFill"
          @click="previewCertImg(i)"
        />
      </view>
      <text class="cert-img-tip">点击可查看大图</text>
    </view>

    <!-- 可预约时间 -->
    <view class="card" id="schedule-card">
      <text class="card-title">可预约时间</text>
      <view class="policy-box">
        <text class="policy-text">· 须提前48小时预约，每次60分钟</text>
        <text class="policy-text">· 提前48小时以上取消：全额退款</text>
        <text class="policy-text warn">· 提前24–48小时取消：退款50%</text>
        <text class="policy-text warn">· 距预约时间不足24小时：不予退款</text>
      </view>
      <view class="week-grid">
        <!-- 日期头 -->
        <view class="wg-header">
          <view class="wg-gutter"></view>
          <view class="wg-day-head" v-for="d in scheduleDates" :key="d.key">
            <text class="wg-dname">{{d.dayName}}</text>
            <text class="wg-dnum">{{d.dayNum}}</text>
          </view>
        </view>
        <!-- 时间格，可上下滑动 -->
        <scroll-view scroll-y class="wg-body">
          <view class="wg-grid">
            <view v-for="cell in gridCells" :key="cell.id"
              :class="cell.type==='time' ? 'wg-time' : ['wg-cell', cell.cls]"
              :style="{gridColumn: cell.col, gridRowStart: cell.row, gridRowEnd: 'span '+cell.span}"
              @click="onCellClick(cell)">
              <text class="wg-cell-txt">{{cell.label}}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view class="footer">
      <button class="book-btn" @click="onBookClick()">{{rescheduleId ? '确认修改' : '立即预约'}}</button>
    </view>
  </view>
  <view v-else-if="loading" class="loading">加载中...</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { consultantApi, bookingApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';
import { track } from '../../utils/track';

// #ifndef H5
defineOptions({
  onShareAppMessage() {
    const pages = getCurrentPages();
    const opts = pages[pages.length - 1]?.options || {};
    const cur = pages[pages.length - 1];
    const name = cur?.$vm?.consultant?.name;
    return {
      title: name ? `${name} — 专业心理咨询师` : '预约专业心理咨询师',
      path: `/pages/consultants/detail?id=${opts.id}`,
    };
  },
  onShareTimeline() {
    const pages = getCurrentPages();
    const cur = pages[pages.length - 1];
    const name = cur?.$vm?.consultant?.name;
    return { title: name ? `${name} — 卓见心理咨询师` : '卓见心理 — 专业咨询师' };
  },
});
// #endif

const BASE = SERVER;
const loading = ref(true);
const consultant = ref(null);
const selected = ref(null);
const selectedHalfIdx = ref(null);
const selectedDateKey = ref(null);
const rescheduleId = ref(null);
const store = useUserStore();

const specialties = computed(() =>
  consultant.value?.specialties ? consultant.value.specialties.split(',').map(s => s.trim()).filter(Boolean) : []
);
// 执业资质（certifications 字段，每行一条）
const certifications = computed(() =>
  consultant.value?.certifications ? consultant.value.certifications.split('\n').map(s => s.trim()).filter(Boolean) : []
);
// 教育背景（education 字段，每行一条）
const credentials = computed(() =>
  consultant.value?.education ? consultant.value.education.split('\n').map(s => s.trim()).filter(Boolean) : []
);

const certImages = computed(() => {
  if (!consultant.value?.certificationImages) return [];
  try { return JSON.parse(consultant.value.certificationImages); } catch { return []; }
});

function previewCertImg(index) {
  uni.previewImage({ urls: certImages.value.map(img => fullUrl(img)), current: index });
}

const DAYS = ['日','一','二','三','四','五','六'];

const scheduleMap = computed(() => {
  const m = {};
  for (const s of consultant.value?.slots || []) {
    const d = new Date(s.startTime);
    const halfIdx = (d.getHours() - 8) * 2 + (d.getMinutes() >= 30 ? 1 : 0);
    const key = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    if (!m[key]) m[key] = {};
    m[key][halfIdx] = s;
  }
  return m;
});

const scheduleDates = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + (i + 2) * 86400000);
    return { key: d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }), dayName: '周' + DAYS[d.getDay()], dayNum: d.getDate() };
  })
);

const gridCells = computed(() => {
  const cells = [];
  let id = 0;
  // Time labels: one per 30min
  for (let h = 8; h < 24; h++) {
    cells.push({ id: id++, type: 'time', col: 1, row: (h-8)*2+1, span: 1, label: String(h).padStart(2,'0')+':00' });
    cells.push({ id: id++, type: 'time', col: 1, row: (h-8)*2+2, span: 1, label: String(h).padStart(2,'0')+':30' });
  }

  scheduleDates.value.forEach((d, ci) => {
    const map = scheduleMap.value;
    let idx = 0;
    while (idx < 32) {
      const gray = (x) => { const si = map[d.key]?.[x]; return !si || !!si.isBooked; };
      // Count consecutive gray half-slots, cap at 8 (= 4 hours)
      let n = 0;
      while (n < 8 && idx + n < 32 && gray(idx + n)) n++;
      if (n > 0) {
        const slotStatuses = Array.from({length: n}, (_,i) => {
          const si = map[d.key]?.[idx+i];
          const st = si?.booking?.status || si?.secondBookings?.find?.(b => b.status)?.status;
          return st;
        });
        const hasPendingPayment = slotStatuses.some(s => s === 'pending_payment');
        const hasPending = !hasPendingPayment && slotStatuses.some(s => s === 'pending');
        const label = hasPendingPayment ? '待付款' : hasPending ? '待确认' : '已预约';
        const cls   = hasPendingPayment ? 'wg-cell-pay' : hasPending ? 'wg-cell-pending' : 'wg-cell-booked';
        cells.push({ id: id++, type: 'cell', col: ci+2, row: idx+1, span: n, label, cls });
        idx += n; continue;
      }
      const s = map[d.key]?.[idx];
      if (gray(idx - 1) && gray(idx + 1)) {
        cells.push({ id: id++, type: 'cell', col: ci+2, row: idx+1, span: 1,
          cls: 'wg-cell-booked', label: '' });
        idx += 1; continue;
      }
      const isActive = selectedDateKey.value === d.key && selectedHalfIdx.value !== null &&
        (idx === selectedHalfIdx.value || idx === selectedHalfIdx.value + 1);
      cells.push({ id: id++, type: 'cell', col: ci+2, row: idx+1, span: 1,
        cls: isActive ? 'wg-cell-avail wg-cell-active' : 'wg-cell-avail',
        label: '可约', slotId: s?.id, halfIdx: idx, dateKey: d.key, canBook: true });
      idx += 1;
    }
  });
  return cells;
});

function onCellClick(cell) {
  if (!cell.canBook) return;
  selected.value = cell.slotId;
  selectedDateKey.value = cell.dateKey;
  const m = scheduleMap.value;
  const nextAvail = (x) => { const si = m[cell.dateKey]?.[x]; return si && !si.isBooked; };
  selectedHalfIdx.value = nextAvail(cell.halfIdx + 1) ? cell.halfIdx : cell.halfIdx - 1;
}

function fullUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : BASE + url;
}

let consultantId = null;

onMounted(async () => {
  const pages = getCurrentPages();
  const opts = pages[pages.length - 1]?.options || {};
  rescheduleId.value = opts.reschedule ? Number(opts.reschedule) : null;
  consultantId = opts.id;
  if (!consultantId) return;
  try { consultant.value = await consultantApi.get(opts.id); } finally { loading.value = false; }
});

// 从支付页返回时刷新时间槽状态
onShow(async () => {
  if (consultantId && consultant.value) {
    try { consultant.value = await consultantApi.get(consultantId); } catch {}
  }
});

function formatHM(t) {
  if (!t) return '';
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}

function onBookClick() {
  if (!selected.value) {
    uni.showToast({ title: '请先选择预约时间', icon: 'none' });
    uni.pageScrollTo({ scrollTop: 9999999, duration: 300 });
    return;
  }
  book();
}

async function book() {
  if (!store.isLoggedIn()) return uni.navigateTo({ url: '/pages/login/index' });
  const m = scheduleMap.value;
  const firstSlot = m[selectedDateKey.value]?.[selectedHalfIdx.value];
  const secondSlot = m[selectedDateKey.value]?.[selectedHalfIdx.value + 1];
  if (!firstSlot) return;
  try {
    track('booking_create', '/pages/consultants/detail');
    if (rescheduleId.value) {
      await bookingApi.reschedule(rescheduleId.value, { slot_id: firstSlot.id, second_slot_id: secondSlot?.id || null });
      uni.showToast({ title: '修改成功' });
    } else {
      const res = await bookingApi.create({ consultant_id: consultant.value.id, slot_id: firstSlot.id, second_slot_id: secondSlot?.id || null });
      // 如果咨询师设置了价格，跳转支付页
      if (consultant.value.price > 0 && res.id) {
        const slotLabel = encodeURIComponent(`${firstSlot.startTime?.slice(0,10)} ${firstSlot.startTime?.slice(11,16)}`);
        const name = encodeURIComponent(consultant.value.name || '');
        uni.navigateTo({ url: `/pages/payment/index?bookingId=${res.id}&consultantName=${name}&slotTime=${slotLabel}&amount=${consultant.value.price}` });
        return;
      }
      uni.showToast({ title: '预约成功' });
    }
    selected.value = null; selectedHalfIdx.value = null; selectedDateKey.value = null;
    uni.navigateBack();
  } catch (e) {
    if (e?.__authRedirect) return;
    uni.showToast({ title: e.error || '操作失败', icon: 'none' });
  }
}
</script>

<style scoped lang="scss">
$primary: #4A8A7A;
$primary-dark: #3A7068;
$primary-light: #EAF5F1;
$bg: #F0F4F3;
$text-main: #1C2A27;
$text-sub: #617870;
$text-muted: #9BBCB4;
$border: #E8EFED;

.page { padding-bottom: 140rpx; background: $bg; min-height: 100vh; }

/* Hero */
.hero {
  position: relative;
  background: linear-gradient(160deg, $primary 0%, #3A6E80 100%);
  padding: 56rpx 36rpx 48rpx;
  display: flex;
  gap: 32rpx;
  align-items: flex-end;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: -100rpx; right: -80rpx;
    width: 400rpx; height: 400rpx;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 65%);
    pointer-events: none;
  }
}

.avatar {
  width: 176rpx;
  height: 176rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
  border: 4rpx solid rgba(255,255,255,0.35);
  position: relative;
  z-index: 1;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  position: relative;
  z-index: 1;
  padding-bottom: 4rpx;
}

.name { font-size: 44rpx; font-weight: 800; color: #fff; letter-spacing: 0.02em; }
.title-text { font-size: 26rpx; color: rgba(255,255,255,0.82); line-height: 1.6; }
.price {
  font-size: 28rpx;
  color: #fff;
  font-weight: 700;
  background: rgba(255,255,255,0.18);
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
  align-self: flex-start;
  margin-top: 4rpx;
}

/* Stats bar */
.stat-row {
  display: flex;
  background: #fff;
  margin: 0 24rpx;
  border-radius: 0 0 24rpx 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(74,138,122,0.10);
  padding: 28rpx 0;
  margin-top: -1rpx;
}

.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num { font-size: 36rpx; font-weight: 800; color: $primary; }
.stat-label { font-size: 22rpx; color: $text-muted; }
.stat-divider { width: 1rpx; background: $border; margin: 4rpx 0; }

/* Cards */
.card {
  background: #fff;
  margin: 16rpx 24rpx 0;
  padding: 32rpx 28rpx;
  border-radius: 24rpx;
  box-shadow: 0 2rpx 14rpx rgba(74,138,122,0.06);
}

.card-title {
  font-size: 22rpx;
  font-weight: 700;
  color: $text-muted;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 20rpx;
  display: block;
}

.bio {
  font-size: 28rpx;
  color: $text-main;
  line-height: 1.85;
  display: block;
  white-space: pre-wrap;
}

/* Specialty tags */
.tag-wrap { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag {
  font-size: 24rpx;
  color: $primary;
  background: $primary-light;
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  font-weight: 500;
}

/* Education */
.cred-item {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #F5F8F7;
  &:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
}

.cred-dot { font-size: 28rpx; flex-shrink: 0; margin-top: 2rpx; }
.cred-text { font-size: 28rpx; color: $text-main; line-height: 1.7; }

/* Certifications */
.cert-badge-wrap { display: flex; flex-direction: column; gap: 14rpx; }
.cert-badge {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background: #FFFBEF;
  border: 1.5rpx solid #F0D060;
  border-radius: 16rpx;
  padding: 20rpx 22rpx;
}
.cert-icon { font-size: 32rpx; flex-shrink: 0; }
.cert-text { font-size: 26rpx; color: #5A4000; line-height: 1.75; flex: 1; }

/* Policy */
.policy-box {
  background: #F5FAF8;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  border-left: 4rpx solid rgba($primary, 0.4);
}
.policy-text { font-size: 24rpx; color: $text-sub; display: block; line-height: 1.9; }
.policy-text.warn { color: #C0784A; }

/* Week grid */
.week-grid { margin-top: 4rpx; }

.wg-header {
  display: flex;
  border-bottom: 2rpx solid #E8F0ED;
  padding-bottom: 14rpx;
  margin-bottom: 4rpx;
}

.wg-gutter { width: 72rpx; flex-shrink: 0; }

.wg-day-head {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.wg-dname { font-size: 20rpx; color: $text-muted; }
.wg-dnum { font-size: 26rpx; font-weight: 700; color: $text-main; }

.wg-body { height: 480rpx; }

.wg-grid {
  display: grid;
  grid-template-columns: 72rpx repeat(7, 1fr);
  grid-template-rows: repeat(32, 30rpx);
}

.wg-time {
  font-size: 19rpx;
  color: $text-muted;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 10rpx;
  padding-top: 4rpx;
  border-bottom: 1rpx solid #F2F6F4;
}

.wg-cell {
  border-left: 1rpx solid #F0F4F2;
  border-bottom: 1rpx solid #F0F4F2;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2rpx;
}

.wg-cell-avail { background: #E8F5F0; }
.wg-cell-active { background: $primary; border-radius: 4rpx; }
.wg-cell-pay { background: #FFF0F0; }
.wg-cell-pending { background: #FFF6E8; }
.wg-cell-booked { background: #F5F5F5; }

.wg-cell-txt { font-size: 18rpx; color: $primary; font-weight: 500; }
.wg-cell-booked .wg-cell-txt { color: #C8D4D0; }
.wg-cell-pending .wg-cell-txt { color: #D4883A; }
.wg-cell-pay .wg-cell-txt { color: #C04040; }
.wg-cell-active .wg-cell-txt { color: #fff; font-weight: 700; }

/* Cert images */
.cert-img-row { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 10rpx; }
.cert-thumb { width: 200rpx; height: 200rpx; border-radius: 14rpx; background: $border; }
.cert-img-tip { font-size: 22rpx; color: $text-muted; display: block; }

.empty-text { font-size: 26rpx; color: $text-muted; }
.loading { text-align: center; padding: 100rpx; color: $text-muted; }

/* Footer */
.footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 20rpx rgba(74,138,122,0.10);
  border-top: 1rpx solid $border;
}

.book-btn {
  background: linear-gradient(135deg, $primary, $primary-dark);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 50rpx;
  border: none;
  padding: 26rpx 0;
  width: 100%;
  letter-spacing: 0.04em;
  box-shadow: 0 8rpx 24rpx rgba(74,138,122,0.28);
}
</style>
