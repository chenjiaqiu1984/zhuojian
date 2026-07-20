<template>
  <view class="page">

    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-content">
        <text class="hero-eyebrow">咨询师团队</text>
        <text class="hero-title">专业陪伴</text>
        <text class="hero-sub">每一位咨询师都经过严格认证，用专业守护你的心理健康</text>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="status-center">
      <text class="status-txt">加载中…</text>
    </view>

    <!-- List -->
    <view v-else class="list">
      <view
        v-for="c in consultants"
        :key="c.id"
        class="card"
        @click="nav(c.id)"
      >
        <!-- Card top: avatar + core info -->
        <view class="card-top">
          <view class="avatar-wrap">
            <image
              class="avatar"
              :src="fullUrl(c.avatar) || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <view v-if="c.hasAvailableSlots" class="avail-dot" />
          </view>

          <view class="card-head">
            <view class="name-row">
              <text class="name">{{ c.name }}</text>
              <text v-if="c.title" class="title-tag">{{ c.title }}</text>
            </view>

            <!-- Stats row -->
            <view class="stats-row">
              <view v-if="c.yearsExp || c.years_exp" class="stat">
                <text class="stat-num">{{ c.yearsExp || c.years_exp }}</text>
                <text class="stat-unit">年经验</text>
              </view>
              <view v-if="(c.yearsExp || c.years_exp) && c.consultHours" class="stat-sep" />
              <view v-if="c.consultHours" class="stat">
                <text class="stat-num">{{ c.consultHours }}</text>
                <text class="stat-unit">咨询时</text>
              </view>
            </view>

            <!-- Price -->
            <view class="price-row">
              <text class="price-sym">¥</text>
              <text class="price-num">{{ (c.price / 100).toFixed(0) }}</text>
              <text class="price-unit">/ 次</text>
            </view>
          </view>
        </view>

        <!-- Bio -->
        <text v-if="c.bio" class="bio">{{ c.bio }}</text>

        <!-- Specialties -->
        <view v-if="specialties(c).length" class="tags">
          <text v-for="s in specialties(c)" :key="s" class="tag">{{ s }}</text>
        </view>

        <!-- Certs -->
        <view v-if="certList(c).length" class="certs">
          <text v-for="cert in certList(c).slice(0, 2)" :key="cert" class="cert">{{ cert }}</text>
        </view>

        <!-- CTA -->
        <view :class="['btn-book', !c.hasAvailableSlots && 'btn-book--full']" @click.stop="nav(c.id)">
          <text>{{ c.hasAvailableSlots ? '预约咨询' : '暂无空位' }}</text>
        </view>
      </view>

      <view v-if="!consultants.length" class="empty-box">
        <text class="empty-txt">暂无咨询师信息</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { consultantApi } from '../../api/index';
import { SERVER } from '../../config';
import { track } from '../../utils/track';

const consultants = ref([]);
const loading = ref(true);

onMounted(async () => {
  track('page_view', '/pages/consultants/index');
  try {
    const res = await consultantApi.list();
    consultants.value = res.items ?? res;
  } catch {}
  loading.value = false;
});

function fullUrl(url) {
  return url ? (url.startsWith('http') ? url : SERVER + url) : '';
}
function specialties(c) {
  return c.specialties ? c.specialties.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3) : [];
}
function certList(c) {
  return c.certifications ? c.certifications.split('\n').map(s => s.trim()).filter(Boolean) : [];
}
function nav(id) {
  track('consultant_click', '/pages/consultants/index', { id });
  uni.navigateTo({ url: `/pages/consultants/detail?id=${id}` });
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

/* Hero */
.hero {
  position: relative;
  padding: 88rpx 48rpx 72rpx;
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

/* Consultant Card */
.card {
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  box-shadow: $card-shadow;
  padding: 32rpx 32rpx 28rpx;
  margin-bottom: 24rpx;
  &:active { transform: scale(0.99); }
}

/* Card top row */
.card-top {
  display: flex;
  gap: 24rpx;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

/* Avatar */
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.avatar {
  width: 136rpx;
  height: 136rpx;
  border-radius: 20rpx;
  border: 3rpx solid rgba(74,138,122,0.14);
}
.avail-dot {
  position: absolute;
  bottom: 6rpx;
  right: 6rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #2EA272;
  border: 3rpx solid #fff;
}

/* Card head */
.card-head {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.name {
  font-size: 34rpx;
  font-weight: 800;
  color: $text-1;
  letter-spacing: 0.02em;
  font-family: "Noto Serif SC", serif;
}
.title-tag {
  font-size: 20rpx;
  color: $teal;
  background: rgba(74,138,122,0.10);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

/* Stats */
.stats-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.stat { display: flex; align-items: baseline; gap: 3rpx; }
.stat-num { font-size: 28rpx; font-weight: 700; color: $text-1; font-variant-numeric: tabular-nums; }
.stat-unit { font-size: 20rpx; color: $muted; }
.stat-sep {
  width: 1rpx;
  height: 22rpx;
  background: $border;
}

/* Price */
.price-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}
.price-sym { font-size: 22rpx; color: $teal; font-weight: 600; }
.price-num { font-size: 40rpx; color: $teal; font-weight: 800; letter-spacing: -1rpx; font-variant-numeric: tabular-nums; }
.price-unit { font-size: 20rpx; color: $muted; }

/* Bio */
.bio {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.7;
  margin-bottom: 16rpx;
}

/* Specialties */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 16rpx;
}
.tag {
  font-size: 22rpx;
  color: $text-2;
  background: $bg;
  padding: 6rpx 18rpx;
  border-radius: 20rpx;
  border: 1rpx solid $border;
}

/* Certs */
.certs {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 20rpx;
}
.cert {
  font-size: 20rpx;
  color: $teal-dark;
  background: #EAF2F8;
  padding: 5rpx 16rpx;
  border-radius: 20rpx;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 360rpx;
}

/* Book button */
.btn-book {
  background: $teal;
  border-radius: 16rpx;
  padding: 22rpx 0;
  text-align: center;
  margin-top: 4rpx;
  &:active { opacity: 0.88; }
  text {
    color: #fff;
    font-size: 28rpx;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  &.btn-book--full {
    background: #C8D2CE;
    text { color: rgba(255,255,255,0.75); font-weight: 500; }
  }
}

/* States */
.status-center { text-align: center; padding: 100rpx 0; }
.status-txt { font-size: 28rpx; color: $muted; }

.empty-box { text-align: center; padding: 120rpx 0; }
.empty-txt { font-size: 28rpx; color: $muted; letter-spacing: 0.06em; }
</style>
