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
    <view class="card" v-if="consultant.work_experience">
      <text class="card-title">从业经历</text>
      <text class="bio">{{consultant.work_experience}}</text>
    </view>

    <!-- 可预约时间 -->
    <view class="card">
      <text class="card-title">可预约时间</text>
      <view class="policy-box">
        <text class="policy-text">· 须提前48小时预约，每次60分钟</text>
        <text class="policy-text">· 提前24小时以上可免费取消</text>
        <text class="policy-text warn">· 12–24小时取消收取30%费用</text>
        <text class="policy-text warn">· 12小时内不可取消</text>
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
      <button class="book-btn" :disabled="!selected" @click="book">{{rescheduleId ? '确认修改' : '立即预约'}}</button>
    </view>
  </view>
  <view v-else-if="loading" class="loading">加载中...</view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { consultantApi, bookingApi } from '../../api/index';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';
import { track } from '../../utils/track';

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
        const hasPending = Array.from({length: n}, (_,i) => {
          const si = map[d.key]?.[idx+i];
          return si?.booking?.status === 'pending' || si?.secondBooking?.status === 'pending';
        }).some(Boolean);
        cells.push({ id: id++, type: 'cell', col: ci+2, row: idx+1, span: n,
          label: hasPending ? '待确认' : '已预约', cls: hasPending ? 'wg-cell-pending' : 'wg-cell-booked' });
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

onMounted(async () => {
  const pages = getCurrentPages();
  const opts = pages[pages.length - 1].options;
  rescheduleId.value = opts.reschedule ? Number(opts.reschedule) : null;
  try { consultant.value = await consultantApi.get(opts.id); } finally { loading.value = false; }
});

function formatHM(t) {
  if (!t) return '';
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatTime(t) {
  return t ? new Date(t).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
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
    uni.showToast({ title: e.error || '操作失败', icon: 'none' });
  }
}
</script>

<style scoped lang="scss">
.page { padding-bottom: 120rpx; background: #F5F7F6; min-height: 100vh; }
.hero { display: flex; gap: 28rpx; align-items: center; background: #fff; padding: 40rpx 32rpx; }
.avatar { width: 160rpx; height: 160rpx; border-radius: 16rpx; flex-shrink: 0; }
.meta { display: flex; flex-direction: column; gap: 8rpx; }
.name { font-size: 42rpx; font-weight: 700; color: #1C2A27; }
.title-text { font-size: 24rpx; color: #617870; line-height: 1.6; }
.price { font-size: 30rpx; color: #4A8A7A; font-weight: 600; margin-top: 4rpx; }

.stat-row { display: flex; background: linear-gradient(135deg, #4A8A7A, #3A6E80); padding: 28rpx 0; }
.stat-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.stat-num { font-size: 40rpx; font-weight: 700; color: #fff; }
.stat-label { font-size: 22rpx; color: rgba(255,255,255,.75); }
.stat-divider { width: 1rpx; background: rgba(255,255,255,.3); margin: 8rpx 0; }

.card { background: #fff; margin: 16rpx 24rpx; padding: 28rpx; border-radius: 16rpx; }
.card-title { font-size: 26rpx; font-weight: 600; color: #9BBCB4; letter-spacing: 1rpx; margin-bottom: 16rpx; display: block; }
.bio { font-size: 28rpx; color: #1C2A27; line-height: 1.8; display: block; white-space: pre-wrap; }

.tag-wrap { display: flex; flex-wrap: wrap; gap: 12rpx; }
.tag { font-size: 24rpx; color: #4A8A7A; background: #EDF4F0; padding: 8rpx 22rpx; border-radius: 24rpx; }

.cred-item { display: flex; gap: 12rpx; align-items: flex-start; margin-bottom: 14rpx; }
.cred-dot { font-size: 28rpx; flex-shrink: 0; }
.cred-text { font-size: 28rpx; color: #1C2A27; line-height: 1.7; }

.cert-badge-wrap { display: flex; flex-direction: column; gap: 16rpx; }
.cert-badge { display: flex; align-items: flex-start; gap: 14rpx; background: #FFF8E7; border: 2rpx solid #F0C040; border-radius: 14rpx; padding: 18rpx 20rpx; }
.cert-icon { font-size: 32rpx; flex-shrink: 0; }
.cert-text { font-size: 26rpx; color: #5A4000; line-height: 1.7; flex: 1; }

.policy-box { background: #f8f9fa; border-radius: 12rpx; padding: 16rpx 20rpx; margin-bottom: 20rpx; }
.policy-text { font-size: 24rpx; color: #617870; display: block; line-height: 1.8; }
.policy-text.warn { color: #c0784a; }

.week-grid { margin-top: 4rpx; }
.wg-header { display: flex; border-bottom: 2rpx solid #E0EEEA; padding-bottom: 12rpx; margin-bottom: 4rpx; }
.wg-gutter { width: 72rpx; flex-shrink: 0; }
.wg-day-head { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2rpx; }
.wg-dname { font-size: 20rpx; color: #9BBCB4; }
.wg-dnum { font-size: 26rpx; font-weight: 600; color: #1C2A27; }
.wg-body { height: 480rpx; }
.wg-grid { display: grid; grid-template-columns: 72rpx repeat(7, 1fr); grid-template-rows: repeat(32, 30rpx); }
.wg-time { font-size: 20rpx; color: #9BBCB4; display: flex; align-items: flex-start; justify-content: flex-end; padding-right: 10rpx; padding-top: 4rpx; border-bottom: 1rpx solid #F0F0F0; }
.wg-cell { border-left: 1rpx solid #F0F0F0; border-bottom: 1rpx solid #F0F0F0; display: flex; align-items: center; justify-content: center; }
.wg-cell-avail { background: #EDF4F0; }
.wg-cell-active { background: #4A8A7A; }
.wg-cell-pending { background: #FFF3E0; }
.wg-cell-booked { background: #F5F5F5; }
.wg-cell-txt { font-size: 18rpx; color: #4A8A7A; }
.wg-cell-booked .wg-cell-txt { color: #bbb; }
.wg-cell-pending .wg-cell-txt { color: #E8943A; }
.wg-cell-active .wg-cell-txt { color: #fff; font-weight: 600; }
.empty-text { font-size: 26rpx; color: #9BBCB4; }
.loading { text-align: center; padding: 100rpx; color: #9BBCB4; }

.footer { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 24rpx 32rpx; box-shadow: 0 -1rpx 0 rgba(0,0,0,.06); }
.book-btn { background: #4A8A7A; color: #fff; font-size: 32rpx; font-weight: 600; border-radius: 50rpx; border: none; padding: 22rpx 0; width: 100%; }
.book-btn[disabled] { opacity: .4; }
</style>
