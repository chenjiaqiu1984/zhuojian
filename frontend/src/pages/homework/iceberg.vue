<template>
  <view class="page">
    <view class="form">
      <view class="iceberg-hint">从水面到深海，逐层探索内在世界</view>
      <view v-for="f in fields" :key="f.key" class="field">
        <view class="field-header">
          <text class="depth-label">{{f.depth}}</text>
          <text class="label">{{f.label}}<text v-if="f.required" class="req">*</text></text>
        </view>
        <text class="hint-text">{{f.hint}}</text>
        <textarea class="input" v-model="form[f.key]" :placeholder="f.placeholder" />
      </view>
      <view class="save-btn" @click="tapHandler = save">保存记录</view>
    </view>

    <view v-if="list.length" class="history-section">
      <text class="history-title">历史记录</text>
      <view class="record" v-for="r in list" :key="r.id" @click="view(r)">
        <view class="rec-header">
          <text class="rec-title">{{r.behavior}}</text>
          <text class="rec-date">{{fmt(r.createdAt)}}</text>
          <text class="del-btn" @click.stop="del(r.id)">×</text>
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
  { key: 'behavior',         depth: 1, label: '行为',        required: true,  hint: '（水面）可见的行为、故事内容',         placeholder: '如：强忍眼泪、独自离开' },
  { key: 'coping',           depth: 2, label: '应对方式',    required: false, hint: '主要的应对姿态',                     placeholder: '如：讨好、指责、超理智、打岔' },
  { key: 'feeling',          depth: 3, label: '感受',        required: false, hint: '当下的情绪体验',                     placeholder: '如：愤怒、悲伤、恐惧、喜悦' },
  { key: 'feelingOfFeeling', depth: 4, label: '感受的感受',  required: false, hint: '关于感受的决定或判断',               placeholder: '如："我不应该生气"、"哭泣是软弱的"' },
  { key: 'belief',           depth: 5, label: '观点/信念',   required: false, hint: '深层假设与预设立场',                 placeholder: '如："如果我哭了，别人会觉得我软弱"' },
  { key: 'expectation',      depth: 6, label: '期待',        required: false, hint: '对自己、对他人，或来自他人的期待',   placeholder: '如：希望被接纳、希望对方主动关心' },
  { key: 'yearning',         depth: 7, label: '渴望',        required: false, hint: '（深海）人类共有的生命渴望',         placeholder: '如：被爱、被认可、自由、有意义' },
  { key: 'self',             depth: 8, label: '自我/生命力', required: false, hint: '核心本质与灵性层面的领悟',           placeholder: '如：意识到自己一直在用愤怒保护内心的脆弱…' },
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
onMounted(load);

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
.page { padding: 24rpx; background: #F5F7F6; min-height: 100vh; }
.form { background: #fff; border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; }
.iceberg-hint { font-size: 24rpx; color: #9BBCB4; margin-bottom: 28rpx; display: block; }
.field { margin-bottom: 24rpx; padding-left: 12rpx; border-left: 4rpx solid #e0e8e6; }
.field-header { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.depth-label { width: 36rpx; height: 36rpx; border-radius: 50%; background: #4A8A7A; color: #fff; font-size: 22rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.label { font-size: 28rpx; font-weight: 600; color: #1C2A27; }
.req { color: #e74c3c; margin-left: 4rpx; }
.hint-text { font-size: 22rpx; color: #9BBCB4; display: block; margin-bottom: 8rpx; }
.input { width: 100%; min-height: 96rpx; background: #f9f9f9; border-radius: 12rpx; padding: 16rpx; font-size: 28rpx; box-sizing: border-box; }
.save-btn { background: #4A8A7A; color: #fff; text-align: center; padding: 24rpx; border-radius: 12rpx; font-size: 30rpx; font-weight: 600; margin-top: 12rpx; }
.history-section { margin-top: 8rpx; }
.history-title { font-size: 26rpx; color: #9BBCB4; display: block; margin-bottom: 16rpx; }
.record { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.rec-header { display: flex; align-items: flex-start; gap: 12rpx; }
.rec-title { flex: 1; font-size: 30rpx; font-weight: 600; color: #1C2A27; line-height: 1.4; }
.rec-date { font-size: 22rpx; color: #9BBCB4; flex-shrink: 0; }
.del-btn { font-size: 36rpx; color: #ccc; flex-shrink: 0; }
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
