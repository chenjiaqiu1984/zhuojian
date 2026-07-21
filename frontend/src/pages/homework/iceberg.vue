<template>
  <view class="page">
    <view class="page-header">
      <view class="hdr-glow" />
      <ZjIcon class="hdr-icon" name="mountain" :size="60" color="#FFFFFF" />
      <text class="hdr-title">冰山模型分析</text>
      <text class="hdr-desc">从水面到深海，探索内心层层感受</text>
    </view>

    <view class="content">
      <view class="form-card">
        <view class="intro-bar">
          <text class="intro-text">从水面到深海，逐层探索内在世界</text>
        </view>

        <view v-for="(f, idx) in fields" :key="f.key" class="field" :style="{ '--depth-color': depthColors[idx] }">
          <view class="field-hd">
            <view class="depth-dot" :style="{ background: depthColors[idx] }">
              <text class="depth-num">{{f.depth}}</text>
            </view>
            <view class="field-label-wrap">
              <text class="field-label">{{f.label}}<text v-if="f.required" class="req">*</text></text>
              <text class="field-hint">{{f.hint}}</text>
            </view>
          </view>
          <textarea class="field-input" v-model="form[f.key]" :placeholder="f.placeholder" />
        </view>

        <text class="save-btn" @click="save()">保存记录</text>
      </view>

      <view v-if="list.length">
        <view class="history-header">
          <view class="history-bar" />
          <text class="history-title">历史记录</text>
        </view>
        <view class="entry" v-for="r in list" :key="r.id" @click="view(r)">
          <view class="entry-header">
            <text class="entry-title">{{r.behavior}}</text>
            <text class="entry-date">{{fmt(r.createdAt)}}</text>
            <text class="del-btn" @click.stop="del(r.id)">×</text>
          </view>
        </view>
      </view>
    </view>

    <uni-popup ref="popup" type="bottom">
      <view class="popup-view">
        <view class="popup-hd">
          <text class="popup-title">记录详情</text>
          <text class="popup-close" @click="popup.close()">×</text>
        </view>
        <view v-if="selected">
          <view class="detail-item" v-for="f in fields" :key="f.key" v-if="selected[f.key]">
            <text class="detail-label">{{f.label}}</text>
            <text class="detail-val">{{selected[f.key]}}</text>
          </view>
          <view class="notes-section">
            <text class="detail-label">追加评论</text>
            <view class="note-item" v-for="(n,i) in parsedNotes" :key="i">
              <text class="note-date">{{n.date}}</text>
              <text class="note-text">{{n.text}}</text>
            </view>
            <view class="note-input-row">
              <textarea class="note-input" v-model="noteInput" placeholder="写下新的思考…" />
              <text class="note-add-btn" @click="appendNote()">追加</text>
            </view>
          </view>
        </view>
      </view>
    </uni-popup>
    <CrisisAlert ref="crisisRef" />
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('homework/iceberg'));
// #endif

import {ref, computed, onMounted, watch } from 'vue';
import { homeworkApi } from '../../api/index';
import { track } from '../../utils/track';
import CrisisAlert from '../../components/CrisisAlert.vue';
import { requireActive } from '../../utils/requireActive';
import ZjIcon from '../../components/ZjIcon.vue';


const fields = [
  { key: 'behavior',         depth: 1, label: '行为',        required: true,  hint: '（水面）可见的行为、故事内容',         placeholder: '如：强忍眼泪、独自离开' },
  { key: 'coping',           depth: 2, label: '应对方式',    required: false, hint: '主要的应对姿态',                     placeholder: '如：讨好、指责、超理智、打岔' },
  { key: 'feeling',          depth: 3, label: '感受',        required: false, hint: '当下的情绪体验',                     placeholder: '如：愤怒、悲伤、恐惧、喜悦' },
  { key: 'feelingOfFeeling', depth: 4, label: '感受的感受',  required: false, hint: '关于感受的决定或判断',               placeholder: '如："我不应该生气"、"哭泣是软弱的"' },
  { key: 'belief',           depth: 5, label: '观点/信念',   required: false, hint: '深层假设与预设立场',                 placeholder: '如："如果我哭了，别人会觉得我软弱"' },
  { key: 'expectation',      depth: 6, label: '期待',        required: false, hint: '对自己、对他人，或来自他人的期待',   placeholder: '如：希望被接纳、希望对方主动关心' },
  { key: 'yearning',         depth: 7, label: '渴望',        required: false, hint: '（深海）人类共有的生命渴望',         placeholder: '如：被爱、被认可、自由、有意义' },
  { key: 'self',             depth: 8, label: '自我/生命力', required: false, hint: '核心本质与灵性层面的领悟',           placeholder: '如：意识到自己一直在用愤怒保护内心的脆弱…' },
];

const depthColors = [
  '#4A8A7A', '#3E7E82', '#3A7280', '#36667E',
  '#325A7C', '#2E4E7A', '#2A4278', '#2A3A6A'
];

const list = ref([]);
const form = ref({});
const selected = ref(null);
const popup = ref(null);
const noteInput = ref('');
const crisisRef = ref(null);

const parsedNotes = computed(() => {
  try { return JSON.parse(selected.value?.notes || '[]'); } catch { return []; }
});

async function load() {
  try { list.value = await homeworkApi.icebergList(); } catch {}
}
onMounted(() => {
  if (!requireActive()) return;
  load();
});

async function save() {
  if (!form.value.behavior?.trim()) {
    uni.showToast({ title: '请填写行为', icon: 'none' }); return;
  }
  try {
    const res = await homeworkApi.icebergCreate(form.value);
    track('homework_save', 'iceberg');
    form.value = {};
    await load();
    uni.showToast({ title: '已保存', icon: 'success' });
    if (res?.crisis) crisisRef.value?.show();
  } catch(e) {
    if (e?.__authRedirect) return;
    const msg = e?.error || e?.message || '保存失败，请重试';
    uni.showToast({ title: msg, icon: 'none' });
  }
}

function view(r) { selected.value = r; noteInput.value = ''; popup.value.open(); }

async function appendNote() {
  if (!noteInput.value.trim()) return;
  const updated = [...parsedNotes.value, { text: noteInput.value.trim(), date: new Date().toLocaleDateString('zh') }];
  const notes = JSON.stringify(updated);
  await homeworkApi.icebergUpdate(selected.value.id, { ...selected.value, notes });
  selected.value = { ...selected.value, notes };
  noteInput.value = '';
  await load();
}

function del(id) {
  uni.showModal({ title: '确认删除', content: '删除后不可恢复', success: async ({ confirm }) => {
    if (!confirm) return;
    try { await homeworkApi.icebergDel(id); await load(); } catch {}
  }});
}

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`;
}
</script>

<style scoped lang="scss">
$primary: #2A5A7A;
$bg: #F5F7F6;
$surface: #F5F8FA;
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

.hdr-icon { display: block; width: 60rpx; margin-bottom: 16rpx; position: relative; z-index: 1; }

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

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(28,42,39,0.06);
  border: 1rpx solid #EDF2F0;
}

.intro-bar {
  padding: 16rpx 20rpx;
  background: $zj-teal-light;
  border-radius: 12rpx;
  margin-bottom: 32rpx;
}

.intro-text {
  font-size: 24rpx;
  color: $text-sub;
  line-height: 1.6;
}

.field {
  margin-bottom: 28rpx;
  padding-left: 18rpx;
  border-left: 3rpx solid rgba(74,138,122,0.2);
  border-image: linear-gradient(to bottom, var(--depth-color, #4A8A7A) 0%, transparent 100%) 1;
}

.field-hd {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.depth-dot {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.depth-num {
  font-size: 21rpx;
  color: #fff;
  font-weight: 700;
}

.field-label-wrap { flex: 1; }

.field-label {
  font-size: 27rpx;
  font-weight: 700;
  color: $text-main;
  display: block;
  letter-spacing: 0.02em;
  margin-bottom: 4rpx;
}

.req { color: #D95C4A; margin-left: 4rpx; }

.field-hint {
  font-size: 21rpx;
  color: $text-muted;
  display: block;
  line-height: 1.5;
}

.field-input {
  width: 100%;
  min-height: 96rpx;
  background: $surface;
  border-radius: 14rpx;
  padding: 18rpx;
  font-size: 27rpx;
  box-sizing: border-box;
  color: $text-main;
  line-height: 1.6;
}

.save-btn {
  display: block;
  background: linear-gradient(135deg, $primary, #1A3A5A);
  color: #fff;
  text-align: center;
  padding: 26rpx;
  border-radius: 18rpx;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-top: 16rpx;

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

  &:active { opacity: 0.88; }
}

.entry-header { display: flex; align-items: flex-start; gap: 12rpx; }

.entry-title {
  flex: 1;
  font-size: 27rpx;
  font-weight: 600;
  color: $text-main;
  line-height: 1.5;
}

.entry-date {
  font-size: 21rpx;
  color: $text-muted;
  flex-shrink: 0;
  padding-top: 3rpx;
}

.del-btn { font-size: 38rpx; color: #C8D8E4; flex-shrink: 0; }

/* Popup */
.popup-view {
  background: #fff;
  border-radius: 36rpx 36rpx 0 0;
  padding: 44rpx 32rpx 72rpx;
  max-height: 85vh;
  overflow-y: auto;
}

.popup-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 36rpx; }
.popup-title { font-size: 34rpx; font-weight: 700; color: $text-main; }
.popup-close { font-size: 44rpx; color: #C0D0D8; line-height: 1; }

.detail-item { margin-bottom: 28rpx; }
.detail-label { font-size: 21rpx; color: $text-muted; display: block; margin-bottom: 8rpx; font-weight: 600; letter-spacing: 0.06em; }
.detail-val { font-size: 28rpx; color: $text-main; line-height: 1.75; }

.notes-section { border-top: 1rpx solid #F0F4F3; padding-top: 28rpx; margin-top: 12rpx; }
.note-item { background: $surface; border-radius: 12rpx; padding: 16rpx 18rpx; margin-bottom: 12rpx; }
.note-date { font-size: 20rpx; color: $text-muted; display: block; margin-bottom: 6rpx; }
.note-text { font-size: 27rpx; color: $text-main; line-height: 1.65; }
.note-input-row { display: flex; gap: 14rpx; align-items: flex-end; margin-top: 14rpx; }
.note-input { flex: 1; min-height: 80rpx; background: $surface; border-radius: 14rpx; padding: 16rpx; font-size: 27rpx; box-sizing: border-box; }
.note-add-btn { background: $primary; color: #fff; padding: 20rpx 28rpx; border-radius: 14rpx; font-size: 27rpx; white-space: nowrap; flex-shrink: 0; &:active { opacity: 0.88; } }
</style>
