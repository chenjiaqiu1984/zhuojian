<template>
  <view class="page">
    <view v-if="loading" class="center">加载中...</view>
    <view v-else-if="!list.length" class="center">暂无测评记录</view>
    <view v-else class="list">
      <view class="item" v-for="r in list" :key="r.id" @click="goDetail(r.id)">
        <view class="item-main">
          <text class="name">{{r.scale?.name}}</text>
          <text :class="['level', levelClass(r.level)]">{{r.level || '已完成'}}</text>
        </view>
        <view class="item-sub">
          <text class="score">总分 {{r.totalScore}}</text>
          <text class="date">{{fmt(r.completedAt)}}</text>
        </view>
        <view v-if="r.dimensions" class="dims">
          <view v-for="(val, key) in JSON.parse(r.dimensions)" :key="key" class="dim-row">
            <text class="dim-name">{{key}}</text>
            <text class="dim-val">{{typeof val === 'number' ? val.toFixed(0) : val}}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';

const loading = ref(true);
const list = ref([]);

onMounted(async () => {
  try { list.value = await assessmentApi.getResults(); } catch {}
  loading.value = false;
});

function fmt(d) { return new Date(d).toLocaleDateString('zh-CN'); }
function levelClass(l) {
  if (!l) return '';
  if (l.includes('重度')) return 'lvl-severe';
  if (l.includes('中度')) return 'lvl-moderate';
  if (l.includes('轻度') || l.includes('亚临床')) return 'lvl-mild';
  return 'lvl-none';
}
function goDetail(id) { uni.navigateTo({ url: `/pages/assessment/result?resultId=${id}` }); }
</script>

<style scoped>
.page { background: #f5f7fa; min-height: 100vh; padding: 16px; }
.center { text-align: center; padding: 60px; color: #999; font-size: 14px; }
.list { display: flex; flex-direction: column; gap: 12px; }
.item { background: #fff; border-radius: 12px; padding: 16px; }
.item-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.name { font-size: 15px; font-weight: 600; color: #1C2A27; }
.level { font-size: 12px; padding: 2px 10px; border-radius: 12px; }
.lvl-none { background: #e8f5e9; color: #388e3c; }
.lvl-mild { background: #fff3e0; color: #e65100; }
.lvl-moderate { background: #ffe0b2; color: #bf360c; }
.lvl-severe { background: #ffcdd2; color: #b71c1c; }
.item-sub { display: flex; justify-content: space-between; }
.score { font-size: 13px; color: #4A7BBA; font-weight: 600; }
.date { font-size: 12px; color: #999; }
.dims { margin-top: 10px; border-top: 1px solid #f0f0f0; padding-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.dim-row { display: flex; justify-content: space-between; }
.dim-name { font-size: 12px; color: #617870; }
.dim-val { font-size: 12px; color: #4A7BBA; font-weight: 600; }
</style>
