<template>
  <view class="page">
    <view class="add-card">
      <text class="card-title">今天心情如何？</text>
      <view class="mood-row">
        <view v-for="m in 5" :key="m" class="mood-btn" :class="{active: form.mood===m}" @click="form.mood=m">
          <text class="mood-emoji">{{EMOJIS[m-1]}}</text>
          <text class="mood-label">{{LABELS[m-1]}}</text>
        </view>
      </view>
      <textarea class="note-input" v-model="form.note" placeholder="写下此刻的感受（可选）" />
      <view class="save-btn" @click="save">记录</view>
    </view>

    <text class="section-title">历史记录</text>
    <view class="entry" v-for="e in list" :key="e.id">
      <view class="entry-header">
        <text class="entry-emoji">{{EMOJIS[e.mood-1]}}</text>
        <text class="entry-label">{{LABELS[e.mood-1]}}</text>
        <text class="entry-date">{{fmt(e.createdAt)}}</text>
        <text class="del-btn" @click="del(e.id)">×</text>
      </view>
      <text v-if="e.note" class="entry-note">{{e.note}}</text>
    </view>
    <u-empty v-if="!list.length" text="还没有情绪记录" mode="data" />

    <CrisisAlert ref="crisisRef" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { homeworkApi } from '../../api/index';
import { track } from '../../utils/track';
import CrisisAlert from '../../components/CrisisAlert.vue';

const EMOJIS = ['😔','😕','😐','🙂','😊'];
const LABELS = ['很差','较差','一般','不错','很好'];

const list = ref([]);
const form = ref({ mood: 3, note: '' });
const crisisRef = ref(null);

async function load() {
  try { list.value = await homeworkApi.moodList(); } catch {}
}
onMounted(load);

async function save() {
  try {
    const res = await homeworkApi.moodCreate(form.value);
    track('homework_save', 'mood');
    form.value = { mood: 3, note: '' };
    await load();
    uni.showToast({ title: '已记录', icon: 'success' });
    if (res?.crisis) crisisRef.value?.show();
  } catch { uni.showToast({ title: '请先登录', icon: 'none' }); }
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
.page { padding: 24rpx; background: #F5F7F6; min-height: 100vh; }
.add-card { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 32rpx; }
.card-title { font-size: 32rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 24rpx; }
.mood-row { display: flex; justify-content: space-between; margin-bottom: 24rpx; }
.mood-btn { display: flex; flex-direction: column; align-items: center; gap: 8rpx; width: 100rpx; height: 100rpx; border-radius: 16rpx; background: #f5f5f5; justify-content: center; }
.mood-btn.active { background: #e0f0ec; }
.mood-emoji { font-size: 40rpx; }
.mood-label { font-size: 20rpx; color: #617870; }
.note-input { width: 100%; height: 120rpx; background: #f9f9f9; border-radius: 12rpx; padding: 16rpx; font-size: 28rpx; box-sizing: border-box; }
.save-btn { background: #4A8A7A; color: #fff; text-align: center; padding: 20rpx; border-radius: 12rpx; font-size: 30rpx; font-weight: 600; margin-top: 20rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #1C2A27; display: block; margin-bottom: 16rpx; }
.entry { background: #fff; border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.entry-header { display: flex; align-items: center; gap: 12rpx; }
.entry-emoji { font-size: 36rpx; }
.entry-label { font-size: 26rpx; color: #4A8A7A; font-weight: 600; }
.entry-date { flex: 1; font-size: 24rpx; color: #9BBCB4; }
.del-btn { font-size: 36rpx; color: #ccc; }
.entry-note { display: block; font-size: 28rpx; color: #617870; margin-top: 12rpx; line-height: 1.6; }
</style>
