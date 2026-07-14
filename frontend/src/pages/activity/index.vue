<template>
  <view class="page">

    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-content">
        <text class="hero-eyebrow">活动中心</text>
        <text class="hero-title">参与 · 成长</text>
        <text class="hero-sub">心理健康主题活动，陪你探索内心世界</text>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="status-center">
      <text class="status-txt">加载中...</text>
    </view>

    <!-- List -->
    <view v-else class="list">

      <view
        v-for="n in sorted"
        :key="n.id"
        :class="['act-card', isExpired(n) && 'act-card--expired']"
        @click="nav(n.id)"
      >
        <!-- Body -->
        <view class="card-body">
          <!-- Title row with status badge -->
          <view class="card-title-row">
            <text class="card-title">{{ n.title }}</text>
            <view v-if="isExpired(n)" class="badge badge--expired">
              <text class="badge-txt">已截止</text>
            </view>
            <view v-else :class="['badge', !n.endDate && 'badge--long']">
              <text class="badge-txt">{{ n.endDate ? '报名中' : '长期有效' }}</text>
            </view>
          </view>

          <!-- Deadline row -->
          <view class="date-row">
            <text class="date-label">截止日期</text>
            <text :class="['date-val', isExpired(n) && 'date-val--expired']">
              {{ n.endDate ? fmtDate(n.endDate) : '长期有效' }}
            </text>
          </view>

          <!-- Summary -->
          <text v-if="n.summary" class="card-summary">{{ n.summary }}</text>

          <!-- Content images strip -->
          <scroll-view v-if="contentImgs(n).length" scroll-x class="img-strip">
            <view class="img-strip-row">
              <image
                v-for="(url, i) in contentImgs(n)"
                :key="i"
                :src="url"
                class="strip-thumb"
                mode="aspectFill"
              />
            </view>
          </scroll-view>

          <!-- CTA -->
          <view class="card-cta">
            <view class="btn-detail" @click.stop="nav(n.id)">查看详情</view>
            <view
              :class="['btn-reg', isExpired(n) && 'btn-reg--off', registeredIds.includes(n.id) && 'btn-reg--done']"
              @click.stop="register(n)"
            >{{ regBtnTxt(n) }}</view>
          </view>
        </view>
      </view>

      <!-- Empty -->
      <view v-if="!sorted.length" class="empty-box">
        <text class="empty-txt">暂无活动，敬请期待</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { newsApi } from '../../api/index';
import { useUserStore } from '../../store/user';

const list = ref([]);
const loading = ref(true);
const store = useUserStore();
const registeredIds = ref([]);

onMounted(async () => {
  try {
    const stored = uni.getStorageSync('registeredActivities');
    registeredIds.value = stored ? JSON.parse(stored) : [];
  } catch {}
  try {
    const res = await newsApi.list({ type: 'activity' });
    list.value = res?.items || [];
  } catch {}
  loading.value = false;
});

function isExpired(n) {
  if (!n.endDate) return false;
  return new Date(n.endDate).getTime() < Date.now();
}

const sorted = computed(() => {
  const active = list.value.filter(n => !isExpired(n));
  const expired = list.value.filter(n => isExpired(n));
  return [...active, ...expired];
});

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
}

function priceFmt(n) {
  const yuan = n.price / 100;
  return yuan === Math.floor(yuan) ? String(yuan) : yuan.toFixed(2);
}

function coverOf(n) {
  if (n.coverImage) return n.coverImage;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(n.content || '');
  return m ? m[1] : null;
}

function contentImgs(n) {
  const content = n.content || '';
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  const all = [];
  let m;
  while ((m = re.exec(content)) !== null && all.length < 5) all.push(m[1]);
  return (n.coverImage ? all.filter(u => u !== n.coverImage) : all.slice(1)).slice(0, 4);
}

function regBtnTxt(n) {
  if (isExpired(n)) return '已截止';
  if (n.price > 0) return `¥${priceFmt(n)} 立即报名`;
  if (registeredIds.value.includes(n.id)) return '报名成功';
  return '免费报名';
}

function nav(id) {
  uni.navigateTo({ url: `/pages/news/detail?id=${id}` });
}

function register(n) {
  if (isExpired(n)) return;
  if (!store.isLoggedIn()) return uni.navigateTo({ url: '/pages/login/index' });
  if (n.price > 0) {
    const title = encodeURIComponent(n.title || '活动报名');
    const endDate = n.endDate ? encodeURIComponent(n.endDate) : '';
    uni.navigateTo({ url: `/pages/payment/index?newsId=${n.id}&activityName=${title}&amount=${n.price}&endDate=${endDate}` });
    return;
  }
  if (registeredIds.value.includes(n.id)) return;
  try {
    const key = 'registeredActivities';
    const ids = JSON.parse(uni.getStorageSync(key) || '[]');
    if (!ids.includes(n.id)) {
      ids.push(n.id);
      uni.setStorageSync(key, JSON.stringify(ids));
      registeredIds.value = [...ids];
    }
  } catch {}
  uni.showToast({ title: '报名成功', icon: 'success' });
}
</script>

<style scoped lang="scss">
$teal: #4A8A7A;
$teal-dark: #3A6E80;
$bg: #F5F7F6;
$text-1: #1C2A27;
$text-2: #617870;
$muted: #9BBCB4;
$border: #E8EFED;
$card-r: 24rpx;
$card-shadow: 0 4rpx 18rpx rgba(28,42,39,0.04);

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 80rpx;
}

/* Hero (mirrors assessment/index) */
.hero {
  position: relative;
  padding: 88rpx 48rpx 72rpx;
  overflow: hidden;
  background: linear-gradient(135deg, $teal 0%, $teal-dark 100%);
}
.hero-glow {
  position: absolute;
  top: -160rpx;
  right: -120rpx;
  width: 560rpx;
  height: 480rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.14) 0%, transparent 66%);
  pointer-events: none;
}
.hero-content { position: relative; z-index: 1; text-align: center; }
.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.34em;
  color: rgba(255,255,255,0.72);
  margin-bottom: 24rpx;
}
.hero-title {
  display: block;
  font-size: 64rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.08em;
  line-height: 1.2;
  margin-bottom: 22rpx;
  font-family: "Noto Serif SC", serif;
}
.hero-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255,255,255,0.82);
  line-height: 1.8;
  letter-spacing: 0.03em;
}

/* List */
.list { padding: 28rpx 28rpx 0; }

/* Activity Card */
.act-card {
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  border-left: 6rpx solid $teal;
  box-shadow: $card-shadow;
  margin-bottom: 28rpx;
  overflow: hidden;
  &:active { transform: scale(0.99); }
  &.act-card--expired {
    border-left-color: #C8D2CE;
    opacity: 0.72;
  }
}

/* Card Body */
.card-body { padding: 30rpx 32rpx 28rpx; }

/* Title row */
.card-title-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.card-title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  color: $text-1;
  line-height: 1.45;
  font-family: "Noto Serif SC", serif;
  letter-spacing: 0.02em;
  .act-card--expired & { color: #8A9E98; }
}

/* Status badge (inline) */
.badge {
  flex-shrink: 0;
  background: rgba(46,162,114,0.12);
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  margin-top: 6rpx;
}
.badge--long { background: rgba(74,138,122,0.10); }
.badge--expired { background: rgba(144,160,156,0.12); }
.badge-txt {
  font-size: 20rpx;
  font-weight: 600;
  color: #2EA272;
  .badge--long & { color: $teal; }
  .badge--expired & { color: #9AB0AA; }
}

/* Deadline row */
.date-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.date-label {
  font-size: 22rpx;
  color: $muted;
  background: $bg;
  padding: 4rpx 14rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}
.date-val {
  font-size: 24rpx;
  color: $teal;
  font-weight: 600;
  &.date-val--expired { color: #B0BEB8; font-weight: 400; }
}

/* Summary */
.card-summary {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.75;
  margin-bottom: 20rpx;
  .act-card--expired & { color: #A8B8B4; }
}

/* Content image strip */
.img-strip { width: 100%; margin-bottom: 24rpx; }
.img-strip-row { display: inline-flex; gap: 12rpx; padding-bottom: 4rpx; }
.strip-thumb {
  width: 160rpx;
  height: 120rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  background: $border;
  .act-card--expired & { opacity: 0.5; }
}

/* CTA */
.card-cta { display: flex; gap: 16rpx; }

.btn-detail {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: $teal;
  border: 2rpx solid $teal;
  background: #fff;
  &:active { background: rgba(74,138,122,0.06); }
  .act-card--expired & { color: #B0BEB8; border-color: #D4DCDA; }
}

.btn-reg {
  flex: 2;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 16rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  background: $teal;
  letter-spacing: 0.02em;
  &:active { opacity: 0.88; }
  &.btn-reg--off {
    background: #C8D2CE;
    font-weight: 500;
    color: rgba(255,255,255,0.78);
  }
  &.btn-reg--done {
    background: #fff;
    color: $teal;
    border: 2rpx solid $teal;
    font-weight: 600;
  }
}

/* States */
.status-center { text-align: center; padding: 100rpx 0; }
.status-txt { font-size: 28rpx; color: $muted; }

.empty-box { text-align: center; padding: 120rpx 0; }
.empty-txt { font-size: 28rpx; color: $muted; letter-spacing: 0.06em; }
</style>
