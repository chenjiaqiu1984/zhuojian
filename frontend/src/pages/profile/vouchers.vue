<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!vouchers.length" class="empty">暂无券码</view>
    <view v-else class="list">
      <view v-for="v in vouchers" :key="v.id" :class="['card', statusClass(v)]">
        <view class="card-top">
          <text class="scale-name">{{v.scale ? v.scale.name : '通用券'}}</text>
          <text :class="['status-tag', statusClass(v)]">{{statusLabel(v)}}</text>
        </view>
        <text class="code">{{v.code}}</text>
        <view class="card-bottom">
          <text class="meta">创建于 {{fmt(v.createdAt)}}</text>
          <text v-if="v.expiresAt" class="meta">截止 {{fmt(v.expiresAt)}}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { assessmentApi } from '../../api/index.js';

const vouchers = ref([]);
const loading = ref(true);

function fmt(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

function statusClass(v) {
  if (v.usedBy) return 'used';
  if (v.expiresAt && new Date(v.expiresAt) < new Date()) return 'expired';
  return 'valid';
}

function statusLabel(v) {
  if (v.usedBy) return '已使用';
  if (v.expiresAt && new Date(v.expiresAt) < new Date()) return '已过期';
  return '可使用';
}

onMounted(async () => {
  try { vouchers.value = await assessmentApi.myVouchers(); } catch {}
  loading.value = false;
});
</script>

<style scoped>
.page { background: #F5F7F6; min-height: 100vh; padding: 12px; }
.empty { text-align: center; padding: 80px; color: #9BBCB4; font-size: 14px; }
.list { display: flex; flex-direction: column; gap: 12px; }
.card { background: #fff; border-radius: 14px; padding: 16px; border-left: 4px solid #4A8A7A; }
.card.used { border-left-color: #ccc; opacity: .7; }
.card.expired { border-left-color: #E07050; opacity: .7; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.scale-name { font-size: 15px; font-weight: 600; color: #1C2A27; }
.status-tag { font-size: 12px; padding: 2px 10px; border-radius: 10px; background: #EDF4F0; color: #4A8A7A; }
.status-tag.used { background: #F0F0F0; color: #999; }
.status-tag.expired { background: #FFF0EE; color: #E07050; }
.code { font-size: 20px; font-weight: 700; letter-spacing: 4px; color: #3A6E80; display: block; margin: 8px 0; }
.card-bottom { display: flex; gap: 16px; }
.meta { font-size: 12px; color: #9BBCB4; }
</style>
