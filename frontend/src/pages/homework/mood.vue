<template>
  <view class="page">
    <view class="page-header">
      <view class="hdr-glow" />
      <ZjIcon class="hdr-icon" name="notebook-pen" :size="60" color="#FFFFFF" />
      <text class="hdr-title">情绪日记</text>
      <text class="hdr-desc">每日记录情绪变化，追踪心理状态</text>
    </view>

    <view class="content">
      <view class="add-card">
        <text class="card-title">今天心情如何？</text>
        <view class="mood-row">
          <view v-for="m in 5" :key="m" class="mood-btn" :class="{active: form.mood===m}" @click="form.mood=m">
            <text class="mood-emoji">{{EMOJIS[m-1]}}</text>
            <text class="mood-label">{{LABELS[m-1]}}</text>
          </view>
        </view>
        <textarea class="note-input" v-model="form.note" placeholder="写下此刻的感受（可选）" />
        <text class="save-btn" @click="save()">记录</text>
      </view>

      <view v-if="list.length">
        <view class="history-header">
          <view class="history-bar" />
          <text class="history-title">历史记录</text>
        </view>
        <view class="entry" v-for="e in list" :key="e.id">
          <view class="entry-header">
            <text class="entry-emoji">{{EMOJIS[e.mood-1]}}</text>
            <view class="entry-meta">
              <text class="entry-label">{{LABELS[e.mood-1]}}</text>
              <text class="entry-date">{{fmt(e.createdAt)}}</text>
            </view>
            <text class="del-btn" @click="del(e.id)">×</text>
          </view>
          <text v-if="e.note" class="entry-note">{{e.note}}</text>
        </view>
      </view>
      <u-empty v-if="!list.length" text="还没有情绪记录" mode="data" />
    </view>

    <CrisisAlert ref="crisisRef" />
  </view>
</template>

<script setup>
import {ref, onMounted, watch } from 'vue';
import { homeworkApi } from '../../api/index';
import { track } from '../../utils/track';
import CrisisAlert from '../../components/CrisisAlert.vue';
import { requireActive } from '../../utils/requireActive';
import ZjIcon from '../../components/ZjIcon.vue';


const EMOJIS = ['😔','😕','😐','🙂','😊'];
const LABELS = ['很差','较差','一般','不错','很好'];

const list = ref([]);
const form = ref({ mood: 3, note: '' });
const crisisRef = ref(null);

async function load() {
  try { list.value = await homeworkApi.moodList(); } catch {}
}
onMounted(() => {
  if (!requireActive()) return;
  load();
});

async function save() {
  try {
    const res = await homeworkApi.moodCreate(form.value);
    track('homework_save', 'mood');
    form.value = { mood: 3, note: '' };
    await load();
    uni.showToast({ title: '已记录', icon: 'success' });
    if (res?.crisis) crisisRef.value?.show();
  } catch(e) {
    if (e?.__authRedirect) return;
    const msg = e?.error || e?.message || '保存失败，请重试';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

async function del(id) {
  try { await homeworkApi.moodDel(id); await load(); } catch {}
}

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}
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

/* Page Header */
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
  background: radial-gradient(ellipse, rgba(255,255,255,0.14) 0%, transparent 66%);
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
  color: rgba(255,255,255,0.75);
  line-height: 1.7;
  position: relative;
  z-index: 1;
}

/* Content */
.content { padding: 28rpx; }

.add-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(28,42,39,0.06);
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

.mood-row {
  display: flex;
  justify-content: space-between;
  gap: 8rpx;
  margin-bottom: 28rpx;
}

.mood-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 6rpx;
  border-radius: 18rpx;
  background: $surface;
  border: 2rpx solid transparent;
  transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;

  &:active { opacity: 0.88; }

  &.active {
    background: #EAF5F1;
    border-color: $primary;
    box-shadow: 0 2rpx 12rpx rgba(74,138,122,0.15);
  }
}

.mood-emoji { font-size: 40rpx; }

.mood-label {
  font-size: 20rpx;
  color: $text-muted;
}

.mood-btn.active .mood-label {
  color: $primary;
  font-weight: 600;
}

.note-input {
  width: 100%;
  height: 128rpx;
  background: $surface;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 27rpx;
  box-sizing: border-box;
  color: $text-main;
  line-height: 1.6;
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
}

/* History */
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
  box-shadow: 0 2rpx 12rpx rgba(28,42,39,0.05);
  border: 1rpx solid #EDF2F0;
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.entry-emoji { font-size: 40rpx; flex-shrink: 0; }

.entry-meta { flex: 1; }

.entry-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $primary;
}

.entry-date {
  display: block;
  font-size: 21rpx;
  color: $text-muted;
  margin-top: 3rpx;
}

.del-btn { font-size: 38rpx; color: #D8E8E5; flex-shrink: 0; }

.entry-note {
  display: block;
  font-size: 26rpx;
  color: $text-sub;
  margin-top: 14rpx;
  line-height: 1.65;
  padding-top: 14rpx;
  border-top: 1rpx solid #F0F4F3;
}
</style>
