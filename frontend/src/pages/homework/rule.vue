<template>
  <view class="page">
    <view class="page-header">
      <view class="hdr-glow" />
      <text class="hdr-icon">📜</text>
      <text class="hdr-title">规条转换练习</text>
      <text class="hdr-desc">将刚性规条改写为有弹性的生活原则</text>
    </view>

    <view class="content">
      <view class="form-card">
        <view v-for="f in fields" :key="f.key" class="field">
          <text class="field-label">{{f.label}}<text v-if="f.required" class="req">*</text></text>
          <text v-if="f.hint" class="field-hint">{{f.hint}}</text>
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
            <text class="entry-title">{{r.originalRule}}</text>
            <text class="entry-date">{{fmt(r.createdAt)}}</text>
            <text class="del-btn" @click.stop="del(r.id)">×</text>
          </view>
          <view v-if="r.newRule" class="transform-row">
            <text class="transform-arrow">→</text>
            <text class="transform-text">{{r.newRule}}</text>
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
              <textarea class="note-input" v-model="noteInput" placeholder="写下新的思考..." />
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
import {ref, computed, onMounted, watch } from 'vue';
import { homeworkApi } from '../../api/index';
import { track } from '../../utils/track';
import CrisisAlert from '../../components/CrisisAlert.vue';
import { requireActive } from '../../utils/requireActive';


const fields = [
  { key: 'originalRule',     label: '原有规条',        required: true,  hint: '',        placeholder: '如：我不能在别人面前哭' },
  { key: 'context',          label: '情境/背景',        required: false, hint: '这条规条是在什么情境下形成的？', placeholder: '如：小时候哭泣被父亲训斥' },
  { key: 'source',           label: '规条来源',         required: false, hint: '谁制定了这条规条？',             placeholder: '如：父亲、家庭文化' },
  { key: 'originalFunction', label: '原有功能',         required: false, hint: '这条规条当初是为了保护什么？',  placeholder: '如：避免被批评、维持家庭关系' },
  { key: 'cost',             label: '代价',            required: false, hint: '遵守这条规条让你付出了什么？',   placeholder: '如：压抑情绪、与他人疏远' },
  { key: 'exceptions',       label: '例外情境',         required: false, hint: '什么时候这条规条没有发挥作用？', placeholder: '如：独处时偶尔会哭' },
  { key: 'newRule',          label: '转化后的弹性原则', required: false, hint: '将刚性规条改写为有弹性的指导原则', placeholder: '如：在安全的环境中，我可以允许自己感受并表达情绪' },
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
  try { list.value = await homeworkApi.ruleList(); } catch {}
}
onMounted(() => {
  if (!requireActive()) return;
  load();
});

async function save() {
  if (!form.value.originalRule?.trim()) {
    uni.showToast({ title: '请填写原有规条', icon: 'none' }); return;
  }
  try {
    const res = await homeworkApi.ruleCreate(form.value);
    track('homework_save', 'rule');
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
  await homeworkApi.ruleUpdate(selected.value.id, { ...selected.value, notes });
  selected.value = { ...selected.value, notes };
  noteInput.value = '';
  await load();
}

function del(id) {
  uni.showModal({ title: '确认删除', content: '删除后不可恢复', success: async ({ confirm }) => {
    if (!confirm) return;
    try { await homeworkApi.ruleDel(id); await load(); } catch {}
  }});
}

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`;
}
</script>

<style scoped lang="scss">
$primary: #7A4A3A;
$bg: #F5F7F6;
$surface: #FAF7F5;
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
  background: linear-gradient(155deg, #8E5E4E 0%, #5A2E1E 100%);
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

.hdr-icon { display: block; font-size: 52rpx; margin-bottom: 16rpx; position: relative; z-index: 1; }

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

.field { margin-bottom: 26rpx; }

.field-label {
  font-size: 27rpx;
  font-weight: 700;
  color: $text-main;
  display: block;
  margin-bottom: 4rpx;
  letter-spacing: 0.02em;
}

.req { color: #D95C4A; margin-left: 4rpx; }

.field-hint {
  display: block;
  font-size: 22rpx;
  color: $text-muted;
  margin-bottom: 10rpx;
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
  background: linear-gradient(135deg, $primary, #5A2E1E);
  color: #fff;
  text-align: center;
  padding: 26rpx;
  border-radius: 18rpx;
  font-size: 30rpx;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-top: 12rpx;
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
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

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

.del-btn { font-size: 38rpx; color: #E8D8D4; flex-shrink: 0; }

.transform-row {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
}

.transform-arrow {
  font-size: 24rpx;
  color: $primary;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 3rpx;
}

.transform-text {
  font-size: 24rpx;
  color: $primary;
  line-height: 1.55;
  flex: 1;
}

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
.popup-close { font-size: 44rpx; color: #D8C8C4; line-height: 1; }

.detail-item { margin-bottom: 28rpx; }
.detail-label { font-size: 21rpx; color: $text-muted; display: block; margin-bottom: 8rpx; font-weight: 600; letter-spacing: 0.06em; }
.detail-val { font-size: 28rpx; color: $text-main; line-height: 1.75; }

.notes-section { border-top: 1rpx solid #F0F4F3; padding-top: 28rpx; margin-top: 12rpx; }
.note-item { background: $surface; border-radius: 12rpx; padding: 16rpx 18rpx; margin-bottom: 12rpx; }
.note-date { font-size: 20rpx; color: $text-muted; display: block; margin-bottom: 6rpx; }
.note-text { font-size: 27rpx; color: $text-main; line-height: 1.65; }
.note-input-row { display: flex; gap: 14rpx; align-items: flex-end; margin-top: 14rpx; }
.note-input { flex: 1; min-height: 80rpx; background: $surface; border-radius: 14rpx; padding: 16rpx; font-size: 27rpx; box-sizing: border-box; }
.note-add-btn { background: $primary; color: #fff; padding: 20rpx 28rpx; border-radius: 14rpx; font-size: 27rpx; white-space: nowrap; flex-shrink: 0; }
</style>
