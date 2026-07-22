<template>
  <view class="page">
    <view class="page-header">
      <view class="hdr-glow" />
      <ZjIcon class="hdr-icon" name="sprout" :size="60" color="#FFFFFF" />
      <text class="hdr-title">树洞</text>
      <text class="hdr-desc">想对网站说的话、一个情绪，或写给自己的几句——都可以悄悄放在这里</text>
    </view>

    <view class="content">
      <view class="add-card">
        <text class="card-title">投入树洞</text>

        <view class="cat-row">
          <view
            v-for="c in CATEGORIES"
            :key="c.value"
            class="cat-btn"
            :class="{ active: form.category === c.value }"
            @click="form.category = c.value"
          >
            <text class="cat-label">{{ c.label }}</text>
          </view>
        </view>

        <textarea
          class="note-input"
          v-model="form.content"
          :maxlength="1000"
          :placeholder="placeholder"
        />
        <text class="char-count">{{ form.content.length }}/1000</text>

        <view class="vis-row">
          <view
            class="vis-btn"
            :class="{ active: form.visibility === 'private' }"
            @click="form.visibility = 'private'"
          >
            <text class="vis-title">仅自己可见</text>
            <text class="vis-desc">安静地留给自己</text>
          </view>
          <view
            class="vis-btn"
            :class="{ active: form.visibility === 'anonymous' }"
            @click="form.visibility = 'anonymous'"
          >
            <text class="vis-title">匿名上墙</text>
            <text class="vis-desc">不展示身份信息</text>
          </view>
        </view>

        <text class="save-btn" :class="{ disabled: saving }" @click="save()">投递</text>
      </view>

      <view class="tabs">
        <text class="tab" :class="{ active: tab === 'wall' }" @click="switchTab('wall')">树洞墙</text>
        <text class="tab" :class="{ active: tab === 'mine' }" @click="switchTab('mine')">我的记录</text>
      </view>

      <view v-if="tab === 'wall'">
        <view class="entry" v-for="e in wall" :key="e.id">
          <view class="entry-header">
            <text class="entry-anon">{{ e.anonName }}</text>
            <text class="entry-cat">{{ catLabel(e.category) }}</text>
            <text class="entry-date">{{ fmt(e.createdAt) }}</text>
          </view>
          <text class="entry-note">{{ e.content }}</text>
        </view>
        <u-empty v-if="!wall.length && !wallLoading" text="树洞还很安静，来写下第一句吧" mode="data" />
        <text v-if="wallHasMore" class="more-btn" @click="loadWall(true)">加载更多</text>
      </view>

      <view v-else>
        <view class="entry" v-for="e in mine" :key="e.id">
          <view class="entry-header">
            <text class="entry-cat">{{ catLabel(e.category) }}</text>
            <text class="entry-vis">{{ e.visibility === 'anonymous' ? '已匿名上墙' : '仅自己可见' }}</text>
            <text class="entry-date">{{ fmt(e.createdAt) }}</text>
            <text class="del-btn" @click="del(e.id)">×</text>
          </view>
          <text class="entry-note">{{ e.content }}</text>
          <view v-if="e.adminReply" class="reply-box">
            <text class="reply-label">网站回复</text>
            <text class="reply-text">{{ e.adminReply }}</text>
          </view>
          <text v-if="e.visibility === 'anonymous' && e.status === 'hidden'" class="hidden-tip">已从树洞墙隐藏</text>
        </view>
        <u-empty v-if="!mine.length" text="还没有树洞记录" mode="data" />
      </view>
    </view>

    <CrisisAlert ref="crisisRef" />
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('treehole/index'));
// #endif

import { ref, computed, onMounted } from 'vue';
import { treeholeApi } from '../../api/index';
import { track } from '../../utils/track';
import CrisisAlert from '../../components/CrisisAlert.vue';
import { requireActive } from '../../utils/requireActive';
import ZjIcon from '../../components/ZjIcon.vue';

const CATEGORIES = [
  { value: 'feedback', label: '意见建议' },
  { value: 'emotion', label: '一个情绪' },
  { value: 'self', label: '写给自己' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const form = ref({ content: '', category: 'emotion', visibility: 'private' });
const tab = ref('wall');
const wall = ref([]);
const wallPage = ref(1);
const wallTotal = ref(0);
const wallLoading = ref(false);
const mine = ref([]);
const saving = ref(false);
const crisisRef = ref(null);

const wallHasMore = computed(() => wall.value.length < wallTotal.value);

const placeholder = computed(() => {
  if (form.value.category === 'feedback') return '想对网站说的意见或建议…';
  if (form.value.category === 'self') return '写给此刻的自己…';
  return '此刻想倾诉的情绪或感受…';
});

function catLabel(c) {
  return CAT_MAP[c] || c;
}

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

async function loadWall(more = false) {
  if (wallLoading.value) return;
  wallLoading.value = true;
  try {
    const page = more ? wallPage.value + 1 : 1;
    const res = await treeholeApi.wall({ page, limit: 20 });
    wallTotal.value = res.total || 0;
    wallPage.value = page;
    wall.value = more ? [...wall.value, ...(res.list || [])] : (res.list || []);
  } catch {
    if (!more) wall.value = [];
  } finally {
    wallLoading.value = false;
  }
}

async function loadMine() {
  try {
    mine.value = await treeholeApi.mine();
  } catch {
    mine.value = [];
  }
}

function switchTab(t) {
  tab.value = t;
  if (t === 'mine') {
    if (!requireActive()) return;
    loadMine();
  }
}

async function save() {
  if (saving.value) return;
  if (!requireActive()) return;
  const content = form.value.content.trim();
  if (!content) {
    uni.showToast({ title: '请写下想说的话', icon: 'none' });
    return;
  }
  saving.value = true;
  try {
    const res = await treeholeApi.create({
      content,
      category: form.value.category,
      visibility: form.value.visibility,
    });
    track('treehole_save', form.value.category);
    form.value = { content: '', category: form.value.category, visibility: form.value.visibility };
    uni.showToast({ title: '已投递', icon: 'success' });
    if (res?.crisis) crisisRef.value?.show();
    await loadWall();
    if (tab.value === 'mine') await loadMine();
  } catch (e) {
    if (e?.__authRedirect) return;
    uni.showToast({ title: e?.error || e?.message || '投递失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
}

async function del(id) {
  try {
    await treeholeApi.del(id);
    await loadMine();
    await loadWall();
  } catch {}
}

onMounted(() => {
  loadWall();
});
</script>

<style scoped lang="scss">
$primary: #4A8A7A;
$bg: #F5F7F6;
$surface: #F5F8F7;
$text-main: #1C2A27;
$text-sub: #617870;
$text-muted: #9BBCB4;

.page {
  min-height: 100vh;
  background: $bg;
  padding-bottom: 60rpx;
}

.page-header {
  position: relative;
  overflow: hidden;
  padding: 56rpx 36rpx 44rpx;
  background: $zj-gradient-header;
}

.hdr-glow {
  position: absolute;
  top: -100rpx;
  right: -80rpx;
  width: 360rpx;
  height: 320rpx;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(255, 255, 255, 0.14) 0%, transparent 66%);
  pointer-events: none;
}

.hdr-icon {
  display: block;
  width: 60rpx;
  margin-bottom: 16rpx;
  position: relative;
  z-index: 1;
}

.hdr-title {
  display: block;
  font-size: 46rpx;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.05em;
  font-family: "Noto Serif SC", serif;
  margin-bottom: 12rpx;
  position: relative;
  z-index: 1;
}

.hdr-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.7;
  position: relative;
  z-index: 1;
}

.content { padding: 28rpx; }

.add-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(28, 42, 39, 0.06);
  border: 1rpx solid #EDF2F0;
}

.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-main;
  display: block;
  margin-bottom: 24rpx;
  letter-spacing: 0.02em;
  font-family: "Noto Serif SC", serif;
}

.cat-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 22rpx;
}

.cat-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background: $surface;
  border: 2rpx solid transparent;

  &.active {
    background: #EAF5F1;
    border-color: $primary;
  }

  &:active { opacity: 0.88; }
}

.cat-label {
  font-size: 24rpx;
  color: $text-muted;
}

.cat-btn.active .cat-label {
  color: $primary;
  font-weight: 600;
}

.note-input {
  width: 100%;
  height: 180rpx;
  background: $surface;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 27rpx;
  box-sizing: border-box;
  color: $text-main;
  line-height: 1.6;
}

.char-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: $text-muted;
  margin-top: 8rpx;
}

.vis-row {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
}

.vis-btn {
  flex: 1;
  padding: 18rpx 16rpx;
  border-radius: 16rpx;
  background: $surface;
  border: 2rpx solid transparent;

  &.active {
    background: #EAF5F1;
    border-color: $primary;
  }

  &:active { opacity: 0.88; }
}

.vis-title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $text-main;
  margin-bottom: 6rpx;
}

.vis-btn.active .vis-title { color: $primary; }

.vis-desc {
  display: block;
  font-size: 20rpx;
  color: $text-muted;
}

.save-btn {
  display: block;
  background: linear-gradient(135deg, $primary, #3A7068);
  color: #fff;
  text-align: center;
  padding: 26rpx;
  border-radius: 18rpx;
  font-size: 30rpx;
  font-weight: 700;
  margin-top: 22rpx;
  letter-spacing: 0.04em;

  &:active { opacity: 0.88; }
  &.disabled { opacity: 0.6; }
}

.tabs {
  display: flex;
  gap: 32rpx;
  margin: 36rpx 0 20rpx;
  padding: 0 4rpx;
}

.tab {
  font-size: 28rpx;
  color: $text-muted;
  padding-bottom: 10rpx;
  border-bottom: 4rpx solid transparent;

  &.active {
    color: $primary;
    font-weight: 600;
    border-bottom-color: $primary;
  }
}

.entry {
  background: #fff;
  border-radius: 18rpx;
  padding: 22rpx 24rpx;
  margin-bottom: 14rpx;
  box-shadow: 0 2rpx 12rpx rgba(28, 42, 39, 0.05);
  border: 1rpx solid #EDF2F0;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.entry-anon {
  font-size: 26rpx;
  font-weight: 600;
  color: $primary;
}

.entry-cat {
  font-size: 20rpx;
  color: $primary;
  background: #EAF5F1;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.entry-vis {
  font-size: 20rpx;
  color: $text-muted;
}

.entry-date {
  font-size: 21rpx;
  color: $text-muted;
  margin-left: auto;
}

.del-btn {
  font-size: 38rpx;
  color: #D8E8E5;
  flex-shrink: 0;
  margin-left: 8rpx;
}

.entry-note {
  display: block;
  font-size: 26rpx;
  color: $text-sub;
  margin-top: 14rpx;
  line-height: 1.65;
  padding-top: 14rpx;
  border-top: 1rpx solid #F0F4F3;
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-box {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #F7FAF9;
  border-radius: 12rpx;
  border-left: 4rpx solid $primary;
}

.reply-label {
  display: block;
  font-size: 20rpx;
  color: $primary;
  font-weight: 600;
  margin-bottom: 6rpx;
}

.reply-text {
  display: block;
  font-size: 24rpx;
  color: $text-sub;
  line-height: 1.6;
}

.hidden-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #C4A35A;
}

.more-btn {
  display: block;
  text-align: center;
  color: $primary;
  font-size: 26rpx;
  padding: 20rpx;
}
</style>
