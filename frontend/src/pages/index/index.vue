<template>
  <view class="home">

    <!-- Hero -->
    <view class="hero">
      <view class="hero-glow" />
      <view class="hero-content">
        <text class="hero-eyebrow">专业心理服务平台</text>
        <text class="hero-title">走进内心<text class="hero-title-em">，找到答案</text></text>
        <text class="hero-sub">一对一咨询 · 心理测评 · 自助工具</text>
        <view class="hero-actions">
          <view class="hero-btn-primary" @click="nav('/pages/consultants/index')">
            <text class="hero-btn-primary-text">预约咨询师</text>
          </view>
          <view class="hero-btn-ghost" @click="nav('/pages/assessment/index')">
            <text class="hero-btn-ghost-text">心理测评</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 轮播公告 -->
    <view v-if="tickerItems.length" class="ticker-wrap">
      <swiper class="swiper" autoplay circular
              indicator-dots indicator-color="rgba(74,138,122,.3)" indicator-active-color="#4A8A7A">
        <swiper-item v-for="item in tickerItems" :key="item.id+''+item.type" @click="navTicker(item)">
          <view class="swiper-inner">
            <image class="swiper-img" :src="fullUrl(item.image) || '/static/default-avatar.png'" mode="aspectFill" />
            <view class="swiper-text">
              <text class="swiper-title">{{item.title}}</text>
              <text class="swiper-hint">点击查看详情</text>
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 模块化功能入口 -->
    <view class="nav-section">
      <view class="nav-group" v-for="group in menuGroups" :key="group.label">
        <text class="nav-group-label">{{group.label}}</text>
        <view class="nav-grid">
          <view class="nav-item" v-for="item in group.items" :key="item.path" @click="nav(item.path)">
            <view class="nav-icon" :style="{background: item.color || '#4A8A7A'}">
              <image :src="item.icon" class="nav-icon-img" mode="aspectFit" />
            </view>
            <text class="nav-label">{{item.label}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 推荐咨询师 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">推荐咨询师</text>
        <text class="section-more" @click="nav('/pages/consultants/index')">全部 ›</text>
      </view>
      <scroll-view scroll-x class="consultant-scroll">
        <view class="consultant-track">
          <view class="consultant-card" v-for="c in consultants" :key="c.id" @click="navConsultant(c.id)">
            <view class="c-avatar-wrap">
              <image class="c-avatar" :src="fullUrl(c.avatar) || '/static/default-avatar.png'" mode="aspectFill" />
              <view v-if="c.hasAvailableSlots" class="c-avail-dot" />
            </view>
            <text class="c-name">{{c.name}}</text>
            <text v-if="c.title" class="c-title-tag">{{c.title}}</text>
            <view class="c-price-row">
              <text class="c-price-sym">¥</text>
              <text class="c-price-num">{{ (c.price != null ? c.price : 1000) / 100 }}</text>
              <text class="c-price-unit">/ 次</text>
            </view>
            <view :class="['c-btn', !c.hasAvailableSlots && 'c-btn--full']">
              <text class="c-btn-text">{{c.hasAvailableSlots ? '立即预约' : '已约满'}}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 最新动态 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">最新动态</text>
        <text class="section-more" @click="nav('/pages/news/index')">全部 ›</text>
      </view>
      <view class="news-list">
        <view class="news-item" v-for="n in news" :key="n.id" @click="navNews(n.id)">
          <view class="news-info">
            <text class="news-title">{{n.title}}</text>
            <text class="news-date">{{formatDate(n.createdAt)}}</text>
          </view>
          <image v-if="n.coverImage" class="news-cover" :src="n.coverImage" mode="aspectFill" />
        </view>
      </view>
    </view>

    <!-- ICP Footer -->
    <view class="icp-footer">
      <text class="icp-text" @click="openIcp()">苏ICP备2026043098号</text>
      <view class="beian-row" @click="openBeian()">
        <image class="beian-icon" src="/static/beian.png" mode="aspectFit" />
        <text class="icp-text">苏公网安备32010402002563号</text>
      </view>
    </view>

    <TermsConfirmModal ref="termsModalRef" />
  </view>
</template>

<script setup>
import {ref, onMounted, watch } from 'vue';
import { consultantApi, newsApi, aboutApi } from '../../api/index';
import { SERVER } from '../../config';
import TermsConfirmModal from '../../components/TermsConfirmModal.vue';

// #ifndef H5
defineOptions({
  onShareAppMessage() {
    return { title: '卓见心理 — 专业心理服务平台', path: '/pages/index/index' };
  },
  onShareTimeline() {
    return { title: '卓见心理 — 一对一咨询 · 心理测评 · 自助工具' };
  },
});
// #endif


const consultants = ref([]);
const news = ref([]);
const tickerItems = ref([]);
const termsModalRef = ref(null);

const menuGroups = ref([
  {
    label: '咨询 · 资讯',
    items: [
      { path: '/pages/consultants/index', label: '咨询师',  icon: '/static/icons/grid/consultant.svg', color: '#4A8A7A' },
      { path: '/pages/activity/index',    label: '活动报名', icon: '/static/icons/grid/activity.svg',   color: '#4A8A7A' },
      { path: '/pages/news/index',        label: '动态资讯', icon: '/static/icons/grid/news.svg',       color: '#4A8A7A' },
      { path: '/pages/about/index',       label: '关于我们', icon: '/static/icons/grid/about.svg',      color: '#4A8A7A' },
    ],
  },
  {
    label: '心理工具',
    items: [
      { path: '/pages/assessment/index',  label: '心理测评', icon: '/static/icons/grid/assessment.svg', color: '#3A6E80' },
      { path: '/pages/ohcard/index',      label: '心理图卡', icon: '/static/icons/grid/ohcard.svg',     color: '#3A6E80' },
      { path: '/pages/homework/index',    label: '咨询工具', icon: '/static/icons/grid/homework.svg',   color: '#3A6E80' },
      { path: '/pages/learning/index',    label: '学习进阶', icon: '/static/icons/grid/learning.svg',   color: '#3A6E80' },
      { path: '/pages/monster/index',     label: '心里怪兽', icon: '/static/icons/grid/monster.svg',    color: '#7B4E9E' },
      { path: '/pages/mandala/index',     label: '曼达拉',   icon: '/static/icons/grid/mandala.svg',    color: '#3A6E80' },
      { path: '/pages/breathing/index',   label: '正念呼吸', icon: '/static/icons/grid/breathing.svg',  color: '#3A6E80' },
    ],
  },
]);

onMounted(async () => {
  consultantApi.list().then(cs => { consultants.value = (cs.items ?? cs).slice(0, 5); }).catch(() => {});
  newsApi.list({ limit: 5 }).then(ns => { news.value = ns.items ?? ns; }).catch(() => {});
  aboutApi.get().then(cfg => {
    tickerItems.value = cfg.tickerItems || [];
    if (cfg.menuGroups?.length) menuGroups.value = cfg.menuGroups;
  }).catch(() => {});
  setTimeout(() => { termsModalRef.value?.check(); }, 500);
});

const BASE = SERVER;
function fullUrl(url) { return url ? (url.startsWith('http') ? url : BASE + url) : ''; }

function navTicker(item) {
  if (item.type === 'news') nav(`/pages/news/detail?id=${item.id}`);
  else if (item.type === 'consultant') navConsultant(item.id);
  else if (item.type === 'ohcard') nav(`/pages/ohcard/index?categoryId=${item.id}`);
}
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }
const TAB_PATHS = new Set(['/pages/index/index','/pages/consultants/index','/pages/ohcard/index','/pages/assessment/index','/pages/profile/index']);
function nav(p) {
  if (TAB_PATHS.has(p)) uni.switchTab({ url: p });
  else uni.navigateTo({ url: p });
}
function navConsultant(id) { uni.navigateTo({ url: `/pages/consultants/detail?id=${id}` }); }
function navNews(id) { uni.navigateTo({ url: `/pages/news/detail?id=${id}` }); }

function openIcp() {
  // #ifdef H5
  window.open('https://beian.miit.gov.cn/', '_blank');
  // #endif
  // #ifndef H5
  uni.navigateTo({ url: '/pages/webview/index?url=' + encodeURIComponent('https://beian.miit.gov.cn/') });
  // #endif
}

function openBeian() {
  const url = 'https://beian.mps.gov.cn/portal/registerSystemInfo?recordcode=32010402002563';
  // #ifdef H5
  window.open(url, '_blank');
  // #endif
  // #ifndef H5
  uni.navigateTo({ url: '/pages/webview/index?url=' + encodeURIComponent(url) });
  // #endif
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

.home {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 80rpx;
}

/* ── Hero ── */
.hero {
  position: relative;
  padding: 96rpx 48rpx 80rpx;
  overflow: hidden;
  background: linear-gradient(135deg, $teal 0%, $teal-dark 100%);
}
.hero-glow {
  position: absolute;
  top: -160rpx;
  right: -120rpx;
  width: 600rpx;
  height: 520rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255,255,255,0.16) 0%, transparent 64%);
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 1;
}
.hero-eyebrow {
  display: block;
  font-size: 20rpx;
  letter-spacing: 0.32em;
  color: rgba(255,255,255,0.72);
  margin-bottom: 28rpx;
}
.hero-title {
  display: block;
  font-size: 60rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.04em;
  line-height: 1.25;
  margin-bottom: 24rpx;
  font-family: "Noto Serif SC", serif;
}
.hero-title-em {
  color: rgba(255,255,255,0.78);
  font-weight: 500;
}
.hero-sub {
  display: block;
  font-size: 25rpx;
  color: rgba(255,255,255,0.80);
  line-height: 1.8;
  letter-spacing: 0.06em;
  margin-bottom: 48rpx;
}
.hero-actions {
  display: flex;
  gap: 20rpx;
  align-items: center;
}
.hero-btn-primary {
  background: #fff;
  border-radius: 44rpx;
  padding: 20rpx 48rpx;
  &:active { opacity: 0.90; }
}
.hero-btn-primary-text {
  font-size: 28rpx;
  font-weight: 700;
  color: $teal-dark;
  letter-spacing: 0.03em;
}
.hero-btn-ghost {
  border: 2rpx solid rgba(255,255,255,0.58);
  border-radius: 44rpx;
  padding: 18rpx 40rpx;
  &:active { background: rgba(255,255,255,0.10); }
}
.hero-btn-ghost-text {
  font-size: 28rpx;
  font-weight: 600;
  color: rgba(255,255,255,0.90);
  letter-spacing: 0.03em;
}

/* ── 轮播 ── */
.ticker-wrap {
  margin: 24rpx 28rpx 0;
  border-radius: $card-r;
  overflow: hidden;
  box-shadow: $card-shadow;
}
.swiper { width: 100%; height: 160rpx; }
.swiper-inner {
  display: flex;
  align-items: center;
  height: 100%;
  background: #fff;
  padding: 0 28rpx;
  gap: 24rpx;
}
.swiper-img {
  width: 120rpx;
  height: 120rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: $bg;
}
.swiper-text { flex: 1; display: flex; flex-direction: column; gap: 10rpx; }
.swiper-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
.swiper-hint {
  font-size: 22rpx;
  color: $teal;
}

/* ── 功能导航 ── */
.nav-section {
  margin: 24rpx 28rpx 0;
}
.nav-group {
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  box-shadow: $card-shadow;
  padding: 28rpx 24rpx 24rpx;
  margin-bottom: 16rpx;
}
.nav-group-label {
  display: block;
  font-size: 20rpx;
  font-weight: 600;
  color: $muted;
  letter-spacing: 0.12em;
  margin-bottom: 24rpx;
  padding-left: 2rpx;
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0 16rpx;
  border-radius: 16rpx;
  &:active { background: $bg; }
}
.nav-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.92;
}
.nav-icon-img { width: 40rpx; height: 40rpx; }
.nav-label {
  font-size: 24rpx;
  font-weight: 600;
  color: $text-1;
  letter-spacing: 0.01em;
}

/* ── 通用 section ── */
.section {
  margin: 24rpx 28rpx 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 32rpx;
  font-weight: 800;
  color: $text-1;
  letter-spacing: -0.5rpx;
  font-family: "Noto Serif SC", serif;
}
.section-more {
  font-size: 24rpx;
  color: $teal;
}

/* ── 咨询师横滑 ── */
.consultant-scroll { width: 100%; }
.consultant-track {
  display: inline-flex;
  gap: 16rpx;
  padding-bottom: 4rpx;
}
.consultant-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 28rpx 24rpx 24rpx;
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  border-top: 4rpx solid $teal;
  box-shadow: $card-shadow;
  width: 220rpx;
  flex-shrink: 0;
  &:active { transform: scale(0.98); }
}
.c-avatar-wrap { position: relative; }
.c-avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 18rpx;
  border: 3rpx solid rgba(74,138,122,0.12);
}
.c-avail-dot {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
  background: #2EA272;
  border: 3rpx solid #fff;
}
.c-name {
  font-size: 28rpx;
  font-weight: 800;
  color: $text-1;
  text-align: center;
  font-family: "Noto Serif SC", serif;
}
.c-title-tag {
  font-size: 20rpx;
  color: $teal;
  background: rgba(74,138,122,0.08);
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  text-align: center;
  white-space: normal;
  line-height: 1.4;
}
.c-price-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}
.c-price-sym { font-size: 20rpx; color: $teal; font-weight: 600; }
.c-price-num { font-size: 36rpx; color: $teal; font-weight: 800; letter-spacing: -1rpx; }
.c-price-unit { font-size: 20rpx; color: $muted; }
.c-btn {
  background: $teal;
  border-radius: 14rpx;
  padding: 16rpx 0;
  width: 100%;
  text-align: center;
  margin-top: 4rpx;
  &:active { opacity: 0.88; }
}
.c-btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.03em;
}
.c-btn--full {
  background: #C8D2CE;
  .c-btn-text { color: rgba(255,255,255,0.72); font-weight: 500; }
}

/* ── 动态列表 ── */
.news-list { display: flex; flex-direction: column; gap: 12rpx; }
.news-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: $card-r;
  border: 1rpx solid $border;
  border-left: 5rpx solid $teal;
  box-shadow: $card-shadow;
  padding: 28rpx 28rpx 28rpx 24rpx;
  &:active { transform: scale(0.99); }
}
.news-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.news-title {
  font-size: 28rpx;
  color: $text-1;
  line-height: 1.6;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.news-date { font-size: 22rpx; color: $muted; }
.news-cover {
  width: 120rpx;
  height: 88rpx;
  border-radius: 14rpx;
  flex-shrink: 0;
  background: $border;
}

/* ── Footer ── */
.icp-footer {
  padding: 40rpx 0 60rpx;
  text-align: center;
}
.icp-text { font-size: 22rpx; color: #B0BEB8; }
.beian-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 12rpx;
}
.beian-icon { width: 28rpx; height: 28rpx; flex-shrink: 0; }
</style>
