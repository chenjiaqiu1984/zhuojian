<template>
  <view class="home">

    <!-- Hero Banner -->
    <view class="hero">
      <view class="hero-overlay">
        <view class="hero-badge">专业心理服务</view>
        <text class="hero-title">走进内心，<text class="hero-title-em">找到答案</text></text>
        <text class="hero-sub">一对一咨询 · 心理测评 · 自助工具</text>
        <view class="hero-cta" @click="nav('/pages/consultants/index')">
          <text class="hero-cta-text">预约咨询师</text>
        </view>
      </view>
    </view>

    <!-- 轮播公告 -->
    <swiper v-if="tickerItems.length" class="swiper" autoplay circular
            indicator-dots indicator-color="rgba(74,138,122,.3)" indicator-active-color="#4A8A7A">
      <swiper-item v-for="item in tickerItems" :key="item.id+''+item.type" @click="navTicker(item)">
        <view class="swiper-inner">
          <image class="swiper-img" :src="fullUrl(item.image) || '/static/default-avatar.png'" mode="aspectFit" />
          <view class="swiper-text">
            <text class="swiper-title">{{item.title}}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 模块化功能入口 -->
    <view class="section">
      <view class="module-group" v-for="group in menuGroups" :key="group.label">
        <text class="module-label">{{group.label}}</text>
        <view class="grid" :class="group.items.length === 2 ? 'grid-2' : ''">
          <view class="grid-item" v-for="item in group.items" :key="item.path" @click="nav(item.path)">
            <view class="grid-icon" :style="{background: item.color}">
              <image :src="item.icon" class="grid-icon-img" mode="aspectFit" />
            </view>
            <text class="grid-label">{{item.label}}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 推荐咨询师 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">推荐咨询师</text>
        <text class="more" @click="nav('/pages/consultants/index')">全部 ›</text>
      </view>
      <scroll-view scroll-x class="consultant-scroll">
        <view class="consultant-card" v-for="c in consultants" :key="c.id" @click="navConsultant(c.id)">
          <view class="c-avatar-wrap">
            <image class="c-avatar" :src="fullUrl(c.avatar) || '/static/default-avatar.png'" mode="aspectFill" />
            <view v-if="c.hasAvailableSlots" class="c-avail-dot" />
          </view>
          <text class="c-name">{{c.name}}</text>
          <text class="c-title">{{c.title}}</text>
          <text class="c-price">¥{{ ((c.price || 1000) / 100).toFixed(2) }} <text class="c-price-unit">/ 次</text></text>
          <view :class="['c-btn', !c.hasAvailableSlots && 'c-btn-full']">
            <text>{{c.hasAvailableSlots ? '立即预约' : '已约满'}}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 最新动态 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">最新动态</text>
        <text class="more" @click="nav('/pages/news/index')">全部 ›</text>
      </view>
      <view class="news-item" v-for="n in news" :key="n.id" @click="navNews(n.id)">
        <view class="news-info">
          <text class="news-title">{{n.title}}</text>
          <text class="news-date">{{formatDate(n.createdAt)}}</text>
        </view>
        <image v-if="n.coverImage" class="news-cover" :src="n.coverImage" mode="aspectFill" />
      </view>
    </view>

    <view class="icp-footer">
      <text class="icp-text" @click="openIcp()">苏ICP备2026043098号</text>
      <view class="beian-row" @click="openBeian()">
        <image class="beian-icon" src="/static/beian.png" mode="aspectFit" />
        <text class="icp-text">苏公网安备32010402002563号</text>
      </view>
    </view>

    <!-- 协议更新确认弹窗（App启动时自动检查） -->
    <TermsConfirmModal ref="termsModalRef" />
  </view>
</template>

<script setup>
import {ref, onMounted, watch } from 'vue';
import { consultantApi, newsApi, aboutApi } from '../../api/index';
import { SERVER } from '../../config';
import TermsConfirmModal from '../../components/TermsConfirmModal.vue';


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
    ],
  },
]);

onMounted(async () => {
  consultantApi.list().then(cs => { consultants.value = cs.slice(0, 5); }).catch(() => {});
  newsApi.list({ limit: 5 }).then(ns => { news.value = ns; }).catch(() => {});
  aboutApi.get().then(cfg => {
    tickerItems.value = cfg.tickerItems || [];
    if (cfg.menuGroups?.length) menuGroups.value = cfg.menuGroups;
  }).catch(() => {});
  // 延迟500ms等用户store初始化完毕，再检查协议版本
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
const TAB_PATHS = new Set(['/pages/index/index','/pages/consultants/index','/pages/ohcard/index','/pages/assessment/index','/pages/news/index','/pages/profile/index']);
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
.home { min-height: 100vh; background: #F2F4F3; }

/* ── Hero ── */
.hero { position: relative; height: 440rpx; background: linear-gradient(160deg, #1C4A3E 0%, #2d7a65 60%, #7DCFB6 100%); }
.hero-img { width: 100%; height: 100%; }
.hero-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(20,45,38,.72) 0%, rgba(30,60,70,.55) 100%);
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 0 40rpx 48rpx;
}
.hero-badge {
  display: inline-block; align-self: flex-start;
  background: rgba(255,255,255,.18); border: 1rpx solid rgba(255,255,255,.3);
  border-radius: 40rpx; padding: 8rpx 22rpx;
  font-size: 20rpx; color: rgba(255,255,255,.9); letter-spacing: 1rpx;
  margin-bottom: 18rpx;
}
.hero-title {
  display: block; font-size: 56rpx; font-weight: 800;
  color: #fff; line-height: 1.15; letter-spacing: -1rpx;
  margin-bottom: 12rpx;
}
.hero-title-em { color: #7DCFB6; }
.hero-sub {
  display: block; font-size: 24rpx; color: rgba(255,255,255,.75);
  letter-spacing: 1rpx; margin-bottom: 36rpx;
}
.hero-cta {
  align-self: flex-start;
  background: #fff; border-radius: 40rpx;
  padding: 18rpx 44rpx;
}
.hero-cta-text { font-size: 28rpx; font-weight: 700; color: #1C4A3E; }

/* ── 轮播 ── */
.swiper { width: 100%; height: 180rpx; background: #fff; margin-top: 16rpx; }
.swiper-inner { display: flex; align-items: center; height: 100%; padding: 0 24rpx; gap: 24rpx; }
.swiper-img { width: 140rpx; height: 140rpx; flex-shrink: 0; border-radius: 12rpx; }
.swiper-text { flex: 1; }
.swiper-title { font-size: 28rpx; font-weight: 600; color: #1C2A27; line-height: 1.5; }

/* ── 通用 section ── */
.section { margin: 24rpx 20rpx 0; }
.section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20rpx; }
.section-title {
  font-size: 32rpx; font-weight: 800; color: #1C2A27;
  letter-spacing: -0.5rpx; margin-bottom: 20rpx; display: block;
}
.section-header .section-title { margin-bottom: 0; }
.more { font-size: 24rpx; color: #4A8A7A; }

/* ── 模块组 ── */
.module-group { margin-bottom: 20rpx; }
.module-label {
  display: block;
  font-size: 22rpx; font-weight: 600;
  color: #9BBCB4; letter-spacing: 1rpx;
  margin-bottom: 12rpx; padding-left: 4rpx;
}

/* ── 9格功能网格 ── */
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.grid-item {
  display: flex; flex-direction: column; align-items: center; gap: 10rpx;
  background: #fff; border-radius: 20rpx; padding: 24rpx 0 18rpx;
}
.grid-icon {
  width: 72rpx; height: 72rpx; border-radius: 18rpx;
  display: flex; align-items: center; justify-content: center;
}
.grid-icon-img { width: 36rpx; height: 36rpx; }
.grid-label { font-size: 22rpx; color: #1C2A27; font-weight: 600; }

/* ── 咨询师横滑 ── */
.consultant-scroll { white-space: nowrap; padding-bottom: 8rpx; }
.consultant-card {
  display: inline-flex; flex-direction: column; align-items: center; gap: 10rpx;
  margin-right: 16rpx; padding: 28rpx 20rpx 24rpx;
  background: #fff; border-radius: 24rpx; width: 300rpx;
  vertical-align: top;
}
.c-avatar-wrap { position: relative; }
.c-avatar { width: 100rpx; height: 100rpx; border-radius: 50%; border: 4rpx solid #EDF7F4; }
.c-avail-dot {
  position: absolute; bottom: 4rpx; right: 4rpx;
  width: 18rpx; height: 18rpx; border-radius: 50%;
  background: #4A8A7A; border: 3rpx solid #fff;
}
.c-name { font-size: 28rpx; font-weight: 700; color: #1C2A27; }
.c-title { font-size: 22rpx; color: #617870; text-align: center; line-height: 1.4; white-space: normal; }
.c-price { font-size: 28rpx; color: #4A8A7A; font-weight: 700; }
.c-price-unit { font-size: 20rpx; font-weight: 400; color: #9BBCB4; }
.c-btn { background: #4A8A7A; border-radius: 32rpx; padding: 12rpx 0; width: 200rpx; text-align: center; margin-top: 4rpx; }
.c-btn text { color: #fff; font-size: 24rpx; font-weight: 600; }
.c-btn-full { background: #D4D9D7; }

/* ── 动态列表 ── */
.news-item { display: flex; align-items: center; gap: 20rpx; background: #fff; border-radius: 20rpx; padding: 24rpx; margin-bottom: 12rpx; }
.news-info { flex: 1; display: flex; flex-direction: column; gap: 12rpx; }
.news-title { font-size: 28rpx; color: #1C2A27; line-height: 1.6; font-weight: 600; }
.news-date { font-size: 22rpx; color: #9BBCB4; }
.news-cover { width: 130rpx; height: 90rpx; border-radius: 12rpx; flex-shrink: 0; }

/* ── Footer ── */
.icp-footer { padding: 40rpx 0 60rpx; text-align: center; }
.icp-text { font-size: 22rpx; color: #B0BEB8; }
.beian-row { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin-top: 12rpx; }
.beian-icon { width: 28rpx; height: 28rpx; flex-shrink: 0; }
</style>
