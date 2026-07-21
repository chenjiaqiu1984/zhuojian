<template>
  <view class="page">
    <view v-if="noProfile" class="empty-state">
      <ZjIcon class="empty-icon" name="clipboard-list" :size="96" color="#9BBCB4" />
      <text class="empty-text">您还没有咨询师档案</text>
      <text class="empty-sub">请联系管理员为您创建档案后再使用排班功能</text>
    </view>
    <template v-else>
    <view class="section settings">
      <view class="row-between">
        <text class="label">自动确认预约</text>
        <switch :checked="autoConfirm" color="#4A8A7A" @change="autoConfirm = $event.detail.value" />
      </view>
      <text class="btn-save" @click="saveSettings()">保存设置</text>
    </view>

    <view class="tabs">
      <view :class="['tab', tab===0&&'tab-active']" @click="tab=0">本周排班</view>
      <view :class="['tab', tab===1&&'tab-active']" @click="tab=1">每周模板</view>
    </view>

    <view v-if="tab===0">
      <scroll-view scroll-x class="grid-wrap">
        <view class="grid">
          <view class="grid-row header-row">
            <view class="time-cell" />
            <view class="day-head" v-for="d in weekDays" :key="d.key">
              <text class="dname">{{d.name}}</text>
              <text class="dnum">{{d.num}}</text>
            </view>
          </view>
          <view class="grid-row" v-for="hi in HALVES" :key="hi">
            <view class="time-cell"><text class="tlabel">{{halfLabel(hi)}}</text></view>
            <view v-for="d in weekDays" :key="d.key"
                  :class="['slot-cell', slotClass(d.key+':'+hi)]"
                  @click="toggleWeekSlot(d, hi)" />
          </view>
        </view>
      </scroll-view>
      <text class="hint">绿色已开放，点击切换开/关</text>
    </view>

    <view v-if="tab===1">
      <scroll-view scroll-x class="grid-wrap">
        <view class="grid">
          <view class="grid-row header-row">
            <view class="time-cell" />
            <view class="day-head" v-for="d in TPL_DAYS" :key="d.dow">
              <text class="dname">{{d.name}}</text>
            </view>
          </view>
          <view class="grid-row" v-for="hi in HALVES" :key="hi">
            <view class="time-cell"><text class="tlabel">{{halfLabel(hi)}}</text></view>
            <view v-for="d in TPL_DAYS" :key="d.dow"
                  :class="['slot-cell', tplActive(d.dow, hi) ? 'on' : 'off']"
                  @click="toggleTpl(d.dow, hi)" />
          </view>
        </view>
      </scroll-view>
      <view class="btn-row">
        <text class="btn-tpl" @click="saveTemplate()">保存模板</text>
        <text class="btn-tpl apply" @click="applyTemplate()">应用到未来7天</text>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup>
// #ifndef H5
import { createMpShare } from '@/utils/mpShare';
defineOptions(createMpShare('consultants/schedule'));
// #endif

import {ref, computed, onMounted, watch } from 'vue';
import { consultantApi } from '../../api/index';
import ZjIcon from '../../components/ZjIcon.vue';


const HALVES = Array.from({ length: 28 }, (_, i) => i); // 08:00–21:30
const TPL_DAYS = [
  { dow: 1, name: '周一' }, { dow: 2, name: '周二' }, { dow: 3, name: '周三' },
  { dow: 4, name: '周四' }, { dow: 5, name: '周五' }, { dow: 6, name: '周六' }, { dow: 0, name: '周日' }
];
const DAY_NAMES = ['日','一','二','三','四','五','六'];

const consultant = ref(null);
const autoConfirm = ref(false);
const weekSlots = ref({});   // "dateKey:hi" → slotId
const template = ref({});    // dow(number) → number[]
const tab = ref(0);
const noProfile = ref(false);

const weekDays = computed(() => {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const key = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    return { key, name: '周' + DAY_NAMES[d.getDay()], num: d.getDate(), date: d };
  });
});

function halfLabel(hi) {
  return `${String(8 + Math.floor(hi / 2)).padStart(2,'0')}:${(hi % 2) * 30 === 0 ? '00' : '30'}`;
}

function tplActive(dow, hi) { return template.value[dow]?.includes(hi); }

function toggleTpl(dow, hi) {
  const arr = template.value[dow] ? [...template.value[dow]] : [];
  const idx = arr.indexOf(hi);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(hi);
  template.value = { ...template.value, [dow]: arr };
}

function slotClass(k) {
  const s = weekSlots.value[k];
  if (!s) return 'off';
  return s.booked ? 'booked' : 'on';
}

async function toggleWeekSlot(day, hi) {
  const k = `${day.key}:${hi}`;
  const s = weekSlots.value[k];
  if (s?.booked) return uni.showToast({ title: '已有预约，无法修改', icon: 'none' });
  try {
    if (s) {
      await consultantApi.deleteSlot(s.id);
      const m = { ...weekSlots.value }; delete m[k]; weekSlots.value = m;
    } else {
      const start = new Date(day.date);
      start.setHours(8 + Math.floor(hi / 2), (hi % 2) * 30, 0, 0);
      const end = new Date(start.getTime() + 30 * 60000);
      await consultantApi.addSlots(consultant.value.id, [{ start_time: start.toISOString(), end_time: end.toISOString() }]);
      await loadWeekSlots();
    }
  } catch (e) { uni.showToast({ title: e?.error || '操作失败', icon: 'none' }); }
}

async function loadWeekSlots() {
  const slots = await consultantApi.getWeekSlots(consultant.value.id);
  const m = {};
  for (const s of slots) {
    const d = new Date(s.startTime);
    const hi = (d.getHours() - 8) * 2 + (d.getMinutes() >= 30 ? 1 : 0);
    const key = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ':' + hi;
    m[key] = { id: s.id, booked: !!s.isBooked };
  }
  weekSlots.value = m;
}

async function saveSettings() {
  await consultantApi.update(consultant.value.id, { autoConfirm: autoConfirm.value ? 1 : 0 });
  uni.showToast({ title: '已保存' });
}

async function saveTemplate() {
  const tpl = {};
  for (const [dow, arr] of Object.entries(template.value)) tpl[dow] = arr;
  await consultantApi.update(consultant.value.id, { weeklyTemplate: JSON.stringify(tpl) });
  uni.showToast({ title: '模板已保存' });
}

async function applyTemplate() {
  try {
    const r = await consultantApi.applyTemplate(consultant.value.id);
    await loadWeekSlots();
    uni.showToast({ title: `已生成 ${r.created} 个时间段` });
  } catch (e) {
    uni.showToast({ title: e.error || '应用失败', icon: 'none' });
  }
}

onMounted(async () => {
  try {
    consultant.value = await consultantApi.myConsultant();
    autoConfirm.value = !!consultant.value.autoConfirm;
    if (consultant.value.weeklyTemplate) {
      const tpl = JSON.parse(consultant.value.weeklyTemplate);
      const t = {};
      for (const [dow, arr] of Object.entries(tpl)) t[Number(dow)] = arr;
      template.value = t;
    }
    await loadWeekSlots();
  } catch (e) {
    if (e?.error === '未找到' || e?.status === 404) noProfile.value = true;
    else uni.showToast({ title: '加载失败，请检查网络', icon: 'none' });
  }
});
</script>

<style scoped lang="scss">
.page { background: #F5F7F6; min-height: 100vh; padding-bottom: 40rpx; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 120rpx 32rpx; gap: 16rpx; }
.empty-icon { width: 96rpx; }
.empty-text { font-size: 30rpx; font-weight: 600; color: #1C2A27; }
.empty-sub { font-size: 24rpx; color: #9BBCB4; text-align: center; line-height: 1.6; }

.section.settings { background: #fff; margin: 24rpx; padding: 28rpx; border-radius: 16rpx; }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.label { font-size: 28rpx; color: #1C2A27; }
.btn-save { margin-top: 20rpx; background: #4A8A7A; color: #fff; font-size: 26rpx; text-align: center; padding: 18rpx; border-radius: 12rpx; &:active { opacity: 0.88; } }

.tabs { display: flex; background: #fff; margin: 0 24rpx 16rpx; border-radius: 16rpx; overflow: hidden; }
.tab { flex: 1; text-align: center; padding: 24rpx; font-size: 26rpx; color: #617870; &:active { opacity: 0.7; } }
.tab-active { color: #4A8A7A; font-weight: 600; border-bottom: 4rpx solid #4A8A7A; }

.grid-wrap { margin: 0 24rpx; background: #fff; border-radius: 16rpx; }
.grid { display: inline-flex; flex-direction: column; min-width: 100%; }
.grid-row { display: flex; }
.header-row { background: #F5F7F6; }
.time-cell { width: 88rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; padding-right: 8rpx; border-bottom: 1rpx solid #f0f2f1; }
.tlabel { font-size: 18rpx; color: #9BBCB4; }
.day-head { width: 76rpx; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding: 12rpx 0; gap: 4rpx; }
.dname { font-size: 20rpx; color: #617870; }
.dnum { font-size: 24rpx; font-weight: 600; color: #1C2A27; }
.slot-cell { width: 76rpx; height: 44rpx; flex-shrink: 0; border: 1rpx solid #EEF0EF; cursor: pointer; }
.slot-cell.on { background: #4A8A7A; }
.slot-cell.off { background: #F5F7F6; }
.slot-cell.booked { background: #B0C4BE; cursor: not-allowed; }

.hint { display: block; text-align: center; font-size: 22rpx; color: #9BBCB4; margin-top: 16rpx; }

.btn-row { display: flex; gap: 16rpx; margin: 20rpx 24rpx 0; }
.btn-tpl { flex: 1; text-align: center; padding: 20rpx; border-radius: 12rpx; font-size: 26rpx; background: #617870; color: #fff; &:active { opacity: 0.88; } }
.btn-tpl.apply { background: #4A8A7A; }
</style>
