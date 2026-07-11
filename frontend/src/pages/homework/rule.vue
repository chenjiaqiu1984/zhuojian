<template>
  <view class="page">
    <view class="form">
      <view v-for="f in fields" :key="f.key" class="field">
        <text class="label">{{f.label}}<text v-if="f.required" class="req">*</text></text>
        <text v-if="f.hint" class="hint">{{f.hint}}</text>
        <textarea class="input" v-model="form[f.key]" :placeholder="f.placeholder" />
      </view>
      <view class="save-btn" @click="tapHandler = save">保存记录</view>
    </view>

    <view v-if="list.length" class="history-section">
      <text class="history-title">历史记录</text>
      <view class="record" v-for="r in list" :key="r.id" @click="view(r)">
        <view class="rec-header">
          <text class="rec-title">{{r.originalRule}}</text>
          <text class="rec-date">{{fmt(r.createdAt)}}</text>
          <text class="del-btn" @click.stop="del(r.id)">×</text>
        </view>
        <text v-if="r.newRule" class="rec-sub">→ {{r.newRule}}</text>
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
              <view class="note-add-btn" @click="tapHandler = appendNote">追加</view>
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

// #ifndef H5
const tapHandler = ref(null);
watch(tapHandler, () => { if (tapHandler.value) { const fn = tapHandler.value; tapHandler.value = null; fn(); } });
// #endif

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
onMounted(load);

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
.page { padding: 24rpx; background: #F5F7F6; min-height: 100vh; }
.form { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; }
.field { margin-bottom: 24rpx; }
.label { font-size: 28rpx; font-weight: 600; color: #1C2A27; display: block; margin-bottom: 4rpx; }
.req { color: #e74c3c; margin-left: 4rpx; }
.hint { display: block; font-size: 22rpx; color: #9BBCB4; margin-bottom: 8rpx; }
.input { width: 100%; min-height: 96rpx; background: #f9f9f9; border-radius: 12rpx; padding: 16rpx; font-size: 28rpx; box-sizing: border-box; }
.save-btn { background: #4A8A7A; color: #fff; text-align: center; padding: 24rpx; border-radius: 12rpx; font-size: 30rpx; font-weight: 600; margin-top: 8rpx; }
.history-section { margin-top: 8rpx; }
.history-title { font-size: 26rpx; color: #9BBCB4; display: block; margin-bottom: 16rpx; }
.record { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.rec-header { display: flex; align-items: flex-start; gap: 12rpx; margin-bottom: 8rpx; }
.rec-title { flex: 1; font-size: 30rpx; font-weight: 600; color: #1C2A27; line-height: 1.4; }
.rec-date { font-size: 22rpx; color: #9BBCB4; flex-shrink: 0; }
.del-btn { font-size: 36rpx; color: #ccc; flex-shrink: 0; }
.rec-sub { font-size: 26rpx; color: #4A8A7A; line-height: 1.5; }
.popup-view { background: #fff; border-radius: 32rpx 32rpx 0 0; padding: 40rpx 30rpx 60rpx; max-height: 85vh; overflow-y: auto; }
.popup-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28rpx; }
.popup-title { font-size: 34rpx; font-weight: 700; color: #1C2A27; }
.popup-close { font-size: 44rpx; color: #ccc; }
.detail-item { margin-bottom: 24rpx; }
.detail-label { font-size: 24rpx; color: #9BBCB4; display: block; margin-bottom: 8rpx; }
.detail-val { font-size: 28rpx; color: #1C2A27; line-height: 1.7; }
.notes-section { border-top: 1rpx solid #f0f0f0; padding-top: 24rpx; margin-top: 8rpx; }
.note-item { background: #f9f9f9; border-radius: 12rpx; padding: 16rpx; margin-bottom: 12rpx; }
.note-date { font-size: 22rpx; color: #9BBCB4; display: block; margin-bottom: 6rpx; }
.note-text { font-size: 28rpx; color: #1C2A27; line-height: 1.6; }
.note-input-row { display: flex; gap: 16rpx; align-items: flex-end; margin-top: 12rpx; }
.note-input { flex: 1; min-height: 80rpx; background: #f9f9f9; border-radius: 12rpx; padding: 14rpx; font-size: 28rpx; box-sizing: border-box; }
.note-add-btn { background: #4A8A7A; color: #fff; padding: 18rpx 24rpx; border-radius: 12rpx; font-size: 28rpx; white-space: nowrap; flex-shrink: 0; }
</style>
