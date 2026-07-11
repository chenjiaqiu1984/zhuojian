<template>
  <view class="page">
    <view class="search-bar">
      <input class="search-ipt" v-model="q" placeholder="搜索姓名/手机/用户名" @confirm="load()" />
      <text class="search-btn" @click="load()">搜索</text>
    </view>

    <view class="filter-row">
      <view :class="['filter-chip', statusFilter==='' && 'active']" @click="statusFilter=''; load()">全部</view>
      <view :class="['filter-chip', statusFilter==='pending' && 'active']" @click="statusFilter='pending'; load()">待完善</view>
      <view :class="['filter-chip', statusFilter==='active' && 'active']" @click="statusFilter='active'; load()">正常</view>
    </view>

    <view class="user-list">
      <view class="user-card" v-for="u in users" :key="u.id">
        <view class="user-top">
          <text class="user-name">{{u.name || u.username || '未设置昵称'}}</text>
          <view :class="['status-tag', u.status === 'pending' ? 'status-pending' : 'status-active']">
            {{u.status === 'pending' ? '待完善' : '正常'}}
          </view>
        </view>
        <text class="user-phone">📱 {{u.phone || '未绑定手机'}}</text>
        <view class="user-meta">
          <text class="meta-item">{{roleLabel[u.role] || u.role}}</text>
          <text class="meta-item">{{fmtDate(u.createdAt)}}</text>
        </view>
        <view class="role-btns" v-if="canEdit(u)">
          <view v-for="r in availableRoles" :key="r.value"
                :class="['role-btn', u.role===r.value && 'role-btn-active']"
                @click="setRole(u, r.value)">
            {{r.label}}
          </view>
        </view>
      </view>
      <u-empty v-if="!loading && !users.length" text="没有找到用户" mode="search" />
    </view>

    <view class="pagination" v-if="total > pageSize">
      <text :class="['pg-btn', page<=1&&'pg-disabled']" @click="prevPage()">‹ 上一页</text>
      <text class="pg-info">{{page}} / {{Math.ceil(total/pageSize)}}</text>
      <text :class="['pg-btn', page>=Math.ceil(total/pageSize)&&'pg-disabled']" @click="nextPage()">下一页 ›</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '../../store/user';
import { SERVER } from '../../config';

const store = useUserStore();
const BASE_URL = `${SERVER}/api`;
const q = ref('');
const statusFilter = ref('');
const users = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);

const roleLabel = { user: '普通用户', consultant: '咨询师', admin: '管理员', super_admin: '超级管理员' };
const availableRoles = [
  { value: 'user', label: '用户' },
  { value: 'consultant', label: '咨询师' },
  { value: 'admin', label: '管理员' },
];

function canEdit(u) {
  if (u.id === store.user?.id) return false;
  if (['admin', 'super_admin'].includes(u.role) && store.user?.role !== 'super_admin') return false;
  return true;
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ q: q.value, page: page.value, pageSize });
    if (statusFilter.value) params.set('status', statusFilter.value);
    const token = uni.getStorageSync('token') || '';
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: `${BASE_URL}/users/admin/list?${params}`,
        header: { Authorization: `Bearer ${token}` },
        success: r => r.statusCode >= 400 ? reject(r.data) : resolve(r.data),
        fail: reject
      });
    });
    users.value = res.users;
    total.value = res.total;
  } catch (e) {
    uni.showToast({ title: e?.error || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function setRole(u, role) {
  if (u.role === role) return;
  uni.showModal({
    title: '确认修改', content: `将 ${u.name || u.phone} 的角色改为「${roleLabel[role]}」？`,
    success: async r => {
      if (!r.confirm) return;
      try {
        const token = uni.getStorageSync('token') || '';
        await new Promise((resolve, reject) => {
          uni.request({
            url: `${BASE_URL}/users/admin/${u.id}/role`,
            method: 'PATCH', data: { role },
            header: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            success: r => r.statusCode >= 400 ? reject(r.data) : resolve(r.data),
            fail: reject
          });
        });
        u.role = role;
        uni.showToast({ title: '已更新' });
      } catch (e) {
        uni.showToast({ title: e?.error || '修改失败', icon: 'none' });
      }
    }
  });
}

function prevPage() { if (page.value > 1) { page.value--; load(); } }
function nextPage() { if (page.value < Math.ceil(total.value / pageSize)) { page.value++; load(); } }

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`;
}

onMounted(load);
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: #F5F7F6; padding: 24rpx; }
.search-bar { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.search-ipt {
  flex: 1; background: #fff; border-radius: 16rpx; padding: 0 24rpx; height: 80rpx;
  font-size: 28rpx; border: 2rpx solid #E8EDEB;
}
.search-btn {
  background: #4A8A7A; color: #fff; font-size: 28rpx; padding: 0 32rpx;
  border-radius: 16rpx; height: 80rpx; line-height: 80rpx; flex-shrink: 0;
}
.filter-row { display: flex; gap: 16rpx; margin-bottom: 24rpx; flex-wrap: wrap; }
.filter-chip {
  padding: 10rpx 28rpx; border-radius: 50rpx; font-size: 24rpx;
  background: #fff; color: #617870; border: 2rpx solid #E8EDEB;
}
.filter-chip.active { background: #4A8A7A; color: #fff; border-color: #4A8A7A; }

.user-list { display: flex; flex-direction: column; gap: 16rpx; }
.user-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.user-top { display: flex; align-items: center; gap: 16rpx; margin-bottom: 12rpx; }
.user-name { font-size: 30rpx; font-weight: 700; color: #1C2A27; flex: 1; }
.status-tag { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 50rpx; flex-shrink: 0; }
.status-pending { background: #FFF3E0; color: #F57C00; }
.status-active   { background: #E8F5E9; color: #388E3C; }
.user-phone { font-size: 24rpx; color: #617870; display: block; margin-bottom: 12rpx; }
.user-meta { display: flex; gap: 24rpx; margin-bottom: 16rpx; }
.meta-item { font-size: 22rpx; color: #9BBCB4; }
.role-btns { display: flex; gap: 12rpx; flex-wrap: wrap; }
.role-btn {
  font-size: 22rpx; padding: 8rpx 24rpx; border-radius: 50rpx;
  background: #F7F9F8; color: #617870; border: 2rpx solid #E8EDEB;
}
.role-btn-active { background: #4A8A7A; color: #fff; border-color: #4A8A7A; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 32rpx; margin-top: 32rpx; padding: 24rpx; }
.pg-btn { font-size: 28rpx; color: #4A8A7A; padding: 12rpx 24rpx; background: #fff; border-radius: 12rpx; }
.pg-disabled { color: #C0CCC8; }
.pg-info { font-size: 26rpx; color: #617870; }
</style>
