<template>
  <view class="page">
    <view class="page-header">
      <view class="hdr-glow" />
      <ZjIcon class="hdr-icon" name="sprout" :size="60" color="#FFFFFF" />
      <text class="hdr-title">树洞</text>
      <text class="hdr-desc">写给自己，只有你能看见；写给平台，只有管理员会收到</text>
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
            <text class="cat-hint">{{ c.hint }}</text>
          </view>
        </view>

        <textarea
          class="note-input"
          v-model="form.content"
          :maxlength="1000"
          :placeholder="placeholder"
        />
        <text class="char-count">{{ form.content.length }}/1000</text>

        <text class="privacy-tip">{{ privacyTip }}</text>
        <text class="save-btn" :class="{ disabled: saving }" @click="save()">投递</text>
      </view>

      <view class="history-header">
        <view class="history-bar" />
        <text class="history-title">我的记录</text>
      </view>

      <view class="entry" v-for="e in mine" :key="e.id">
        <view class="entry-header">
          <text class="entry-cat">{{ catLabel(e.category) }}</text>
          <text class="entry-vis">{{ visLabel(e.category) }}</text>
          <text class="entry-date">{{ fmt(e.createdAt) }}</text>
          <text class="del-btn" @click="del(e.id)">×</text>
        </view>
        <text class="entry-note">{{ e.content }}</text>
        <view v-if="e.adminReply" class="reply-box">
          <text class="reply-label">平台回复</text>
          <text class="reply-text">{{ e.adminReply }}</text>
        </view>
      </view>
      <u-empty v-if="!mine.length && loaded" text="还没有树洞记录" mode="data" />
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
  { value: 'self', label: '写给自己', hint: '仅自己可见' },
  { value: 'platform', label: '写给平台', hint: '仅管理员可见' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const form = ref({ content: '', category: 'self' });
const mine = ref([]);
const loaded = ref(false);
const saving = ref(false);
const crisisRef = ref(null);

const placeholder = computed(() =>
  form.value.category === 'platform'
    ? '想对平台说的意见或建议…'
    : '写给此刻的自己…'
);

const privacyTip = computed(() =>
  form.value.category === 'platform'
    ? '内容仅平台管理员可见，不会公开展示'
    : '内容仅你自己可见，管理员也无法查看'
);

function catLabel(c) {
  if (c === 'feedback') return '写给平台';
  if (c === 'emotion') return '写给自己';
  return CAT_MAP[c] || c;
}

function visLabel(c) {
  const cat = c === 'feedback' ? 'platform' : (c === 'emotion' ? 'self' : c);
  return cat === 'platform' ? '仅管理员可见' : '仅自己可见';
}

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

async function loadMine() {
  try {
    mine.value = await treeholeApi.mine();
  } catch {
    mine.value = [];
  } finally {
    loaded.value = true;
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
    });
    track('treehole_save', form.value.category);
    form.value = { content: '', category: form.value.category };
    uni.showToast({ title: '已投递', icon: 'success' });
    if (res?.crisis) crisisRef.value?.show();
    await loadMine();
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
  } catch {}
}

onMounted(() => {
  if (!requireActive()) return;
  loadMine();
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
  padding: 18rpx 12rpx;
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
  display: block;
  font-size: 26rpx;
  color: $text-muted;
  font-weight: 600;
}

.cat-hint {
  display: block;
  font-size: 20rpx;
  color: $text-muted;
  margin-top: 6rpx;
}

.cat-btn.active .cat-label,
.cat-btn.active .cat-hint {
  color: $primary;
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

.privacy-tip {
  display: block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: $text-sub;
  line-height: 1.5;
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

.history-header {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin: 36rpx 0 20rpx;
}

.history-bar {
  width: 5rpx;
  height: 28rpx;
  border-radius: 3rpx;
  background: $primary;
  flex-shrink: 0;
}

.history-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-main;
  letter-spacing: 0.03em;
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
</style>
