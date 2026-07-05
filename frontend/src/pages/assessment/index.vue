<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">了解自己，是改变的开始</text>
      <text class="hero-sub">这些经过心理学验证的测评工具，帮助你更清晰地认识自己的情绪模式、人格特质和心理状态。没有对错，只有更真实的自我认知。</text>
    </view>

    <view v-if="topScales.length" class="push-section">
      <text class="avail-title">推荐测评</text>
      <scroll-view scroll-x class="top-scroll">
        <view class="top-list">
          <view v-for="s in topScales" :key="s.id" class="top-card" @click="go(s)">
            <text class="push-name">{{s.name}}</text>
            <text class="push-meta">{{s.totalQuestions}}题 · {{s.estimatedMinutes}}分钟</text>
            <text class="push-expire">{{s.usageCount}} 次测评</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="search-bar">
      <input :value="keyword" @input="keyword = $event.detail.value" placeholder="搜索量表名称..." />
    </view>

    <scroll-view v-if="allScenarios.length" scroll-x class="scenario-bar">
      <view class="scenario-list">
        <view :class="['scenario-chip', !activeScenario && 'active']" @click="activeScenario=''">全部场景</view>
        <view v-for="t in allScenarios" :key="t" :class="['scenario-chip', activeScenario===t && 'active']" @click="activeScenario=t">{{t}}</view>
      </view>
    </scroll-view>

    <div class="tabs-wrap">
      <div class="tabs">
        <view v-for="t in tabs" :key="t.key" :class="['tab', activeTab === t.key && 'active']" @click="activeTab = t.key">
          {{t.label}}<text class="tab-count">{{t.count}}</text>
        </view>
      </div>
    </div>

    <view v-if="loading" class="loading">加载中...</view>
    <view v-else class="list">
      <view v-for="s in filtered" :key="s.id" class="card" @click="go(s)">
        <view class="card-header">
          <text class="name">{{s.name}}</text>
          <view style="display:flex;gap:6px;align-items:center">
            <text
              :class="['fav-btn', favoriteIds.has(s.id) && 'fav-active']"
              @click.stop="toggleFav(s.id)"
            >{{favoriteIds.has(s.id) ? '★' : '☆'}}</text>
            <text :class="['tag', s.isPaid ? 'paid' : 'free']">{{s.isPaid ? '付费' : '免费'}}</text>
          </view>
        </view>
        <text class="desc">{{s.description}}</text>
        <text v-if="s.introduction" class="intro">{{s.introduction}}</text>
        <view v-if="s.scenarios && JSON.parse(s.scenarios||'[]').length" class="scenario-tags">
          <text v-for="t in JSON.parse(s.scenarios||'[]')" :key="t" class="s-tag">{{t}}</text>
        </view>
        <view class="meta">
          <text>{{s.totalQuestions}} 题</text>
          <text>约 {{s.estimatedMinutes}} 分钟</text>
          <text>{{s.usageCount}} 次测评</text>
          <text v-if="s.isPaid">¥{{(s.price/100).toFixed(2)}}</text>
        </view>
      </view>
      <view v-if="!filtered.length" class="empty">暂无测评</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';
import { useUserStore } from '../../store/user.js';
import { track } from '../../utils/track.js';

const CATEGORY_LABELS = {
  all: '全部',
  children: '儿童类',
  clinical: '临床类',
  diagnostic: '诊断类',
  personality: '人格类',
  psychiatric: '精神科',
  fun: '趣味测评',
};

const store = useUserStore();
const activeTab = ref('all');
const activeScenario = ref('');
const keyword = ref('');
const scales = ref([]);
const favoriteIds = ref(new Set());
const loading = ref(true);

const allScenarios = computed(() => {
  const set = new Set();
  scales.value.forEach(s => {
    try { JSON.parse(s.scenarios || '[]').forEach(t => set.add(t)); } catch {}
  });
  return [...set];
});

const topScales = computed(() =>
  [...scales.value].filter(s => s.usageCount > 0).sort((a, b) => b.usageCount - a.usageCount).slice(0, 5)
);

const tabs = computed(() => {
  const usage = {};
  const counts = {};
  scales.value.forEach(s => {
    counts[s.category] = (counts[s.category] || 0) + 1;
    usage[s.category] = (usage[s.category] || 0) + (s.usageCount || 0);
  });
  const cats = Object.keys(counts).sort((a, b) => (usage[b] || 0) - (usage[a] || 0));
  return [
    { key: 'all', label: '全部', count: scales.value.length },
    ...cats.map(k => ({ key: k, label: CATEGORY_LABELS[k] || k, count: counts[k] }))
  ];
});

const filtered = computed(() => {
  let list = scales.value;
  if (activeTab.value !== 'all') list = list.filter(s => s.category === activeTab.value);
  if (activeScenario.value) {
    list = list.filter(s => {
      try { return JSON.parse(s.scenarios || '[]').includes(activeScenario.value); } catch { return false; }
    });
  }
  if (keyword.value.trim()) list = list.filter(s => s.name.includes(keyword.value.trim()));
  return list;
});

onMounted(async () => {
  track('page_view', '/pages/assessment/index');
  try { scales.value = await assessmentApi.getScales(); } catch {}
  if (store.isLoggedIn()) {
    const ids = await assessmentApi.getFavorites().catch(() => []);
    favoriteIds.value = new Set(ids);
  }
  loading.value = false;
});

async function go(s) {
  track('scale_click', '/pages/assessment/index', { id: s.id, name: s.name });
  assessmentApi.trackScale(s.id).catch(() => {});
  uni.navigateTo({ url: `/pages/assessment/detail?id=${s.id}` });
}

async function toggleFav(id) {
  if (!store.isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  const res = await assessmentApi.toggleFavorite(id);
  track('scale_favorite', '/pages/assessment/index', { id, favorited: res.favorited });
  const next = new Set(favoriteIds.value);
  res.favorited ? next.add(id) : next.delete(id);
  favoriteIds.value = next;
}
</script>

<style scoped>
.page { background: #F5F7F6; min-height: 100vh; }
.hero { background: linear-gradient(135deg,#4A8A7A,#3A6E80); padding: 40px 20px 28px; }
.hero-title { color: #fff; font-size: 20px; font-weight: bold; display: block; margin-bottom: 10px; }
.hero-sub { color: rgba(255,255,255,.85); font-size: 13px; line-height: 1.7; display: block; }

.push-section { padding: 16px 16px 0; }
.top-scroll { width: 100%; }
.top-list { display: inline-flex; gap: 12px; padding-bottom: 8px; }
.top-card { display: inline-flex; flex-direction: column; justify-content: space-between; background: #fff; border-radius: 12px; padding: 14px; width: 130px; white-space: normal; border-left: 3px solid #4A8A7A; }
.push-count { font-size: 12px; color: #4A8A7A; display: block; margin-bottom: 8px; }
.push-card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 8px; border-left: 3px solid #4A8A7A; }
.push-name { font-size: 14px; font-weight: 600; color: #1C2A27; margin-right: 8px; }
.push-expire { font-size: 11px; color: #E07050; }
.push-meta { font-size: 12px; color: #9BBCB4; display: block; margin: 4px 0 10px; }
.push-empty { font-size: 13px; color: #9BBCB4; text-align: center; padding: 16px 0; }
.available-section { padding: 16px 16px 0; }
.avail-title { font-size: 15px; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 10px; }
.avail-scroll { white-space: nowrap; }
.avail-list { display: inline-flex; gap: 12px; padding-bottom: 4px; }
.avail-card { display: inline-flex; flex-direction: column; background: #fff; border-radius: 12px; padding: 14px; width: 140px; white-space: normal; position: relative; }
.avail-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; align-self: flex-start; margin-bottom: 6px; background: #FFF4EC; color: #A06830; }
.avail-name { font-size: 14px; font-weight: 600; color: #1C2A27; margin-bottom: 4px; }
.avail-meta { font-size: 12px; color: #9BBCB4; margin-bottom: 10px; }
.avail-btn { background: #4A8A7A; color: #fff; font-size: 12px; text-align: center; padding: 6px 0; border-radius: 8px; }

.search-bar { padding: 12px 16px 0; }
.search-bar input { background: #fff; border-radius: 20px; padding: 10px 16px; font-size: 14px; width: 100%; box-sizing: border-box; border: 1px solid #E8EFED; }

.scenario-bar { background: #fff; padding: 8px 16px 0; }
.scenario-list { display: inline-flex; gap: 8px; padding-bottom: 10px; }
.scenario-chip { font-size: 12px; padding: 5px 14px; border-radius: 14px; background: #F0F4F2; color: #617870; white-space: nowrap; }
.scenario-chip.active { background: #4A8A7A; color: #fff; }

.tabs-wrap { background: #fff; margin-top: 12px; border-bottom: 1px solid #eee; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.tabs { display: flex; padding: 0 16px; white-space: nowrap; min-width: max-content; }
.tab { display: inline-flex; align-items: center; gap: 4px; padding: 14px 12px; font-size: 14px; color: #617870; white-space: nowrap; }
.tab.active { color: #4A8A7A; border-bottom: 2px solid #4A8A7A; }
.tab-count { font-size: 11px; background: #F0F4F2; color: #9BBCB4; padding: 1px 6px; border-radius: 10px; }
.tab.active .tab-count { background: #EDF4F0; color: #4A8A7A; }

.list { padding: 12px; }
.card { background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 12px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.name { font-size: 17px; font-weight: 700; color: #1C2A27; }
.fav-btn { font-size: 18px; color: #ccc; cursor: pointer; }
.fav-btn.fav-active { color: #F5A623; }
.tag { font-size: 12px; padding: 3px 10px; border-radius: 10px; }
.tag.free { background: #EDF4F0; color: #4A8A7A; }
.tag.paid { background: #FFF4EC; color: #A06830; }
.desc { font-size: 13px; color: #617870; line-height: 1.7; margin-bottom: 6px; display: block; }
.intro { font-size: 12px; color: #9BBCB4; line-height: 1.6; margin-bottom: 8px; display: block; }
.scenario-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.s-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: #EDF4F0; color: #4A8A7A; }
.meta { display: flex; gap: 16px; font-size: 12px; color: #9BBCB4; }
.loading, .empty { text-align: center; padding: 60px; color: #9BBCB4; }
</style>
