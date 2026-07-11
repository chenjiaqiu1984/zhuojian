<template>
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <el-input v-model="q" placeholder="搜索用户名/手机/姓名" clearable style="width:240px" @keyup.enter="load(1)" />
      <el-select v-model="roleFilter" placeholder="按角色筛选" clearable style="width:140px" @change="load(1)">
        <el-option v-for="r in ROLES" :key="r.value" :label="r.label" :value="r.value" />
      </el-select>
      <el-button type="primary" @click="load(1)">搜索</el-button>
      <span style="margin-left:auto;color:#666;font-size:13px">共 {{total}} 名用户</span>
    </div>

    <el-table :data="users" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="姓名/用户名">
        <template #default="{row}">
          <div>{{row.name || '(未设置)'}}</div>
          <div style="color:#aaa;font-size:12px">{{row.username || '—'}}</div>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号" width="130" />
      <el-table-column label="角色" width="130">
        <template #default="{row}">
          <el-tag :type="roleColor(row.role)" size="small">{{roleLabel(row.role)}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="160">
        <template #default="{row}">{{new Date(row.createdAt).toLocaleString('zh-CN')}}</template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{row}">
          <el-select
            :model-value="row.role"
            size="small"
            style="width:130px"
            :disabled="!canChange(row)"
            @change="v => changeRole(row, v)"
          >
            <el-option
              v-for="r in availableRoles(row)"
              :key="r.value"
              :label="r.label"
              :value="r.value"
            />
          </el-select>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="prev,pager,next,total"
      style="margin-top:16px;justify-content:flex-end;display:flex"
      @current-change="load"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api/index.js';
import { useAdminStore } from '../store/admin';

const store = useAdminStore();
const isSuperAdmin = computed(() => store.user?.role === 'super_admin');

const ROLES = [
  { value: 'user',        label: '普通用户',   color: '' },
  { value: 'consultant',  label: '咨询师',      color: 'success' },
  { value: 'admin',       label: '管理员',      color: 'warning' },
  { value: 'super_admin', label: '超级管理员',  color: 'danger' },
];
const SENSITIVE = ['admin', 'super_admin'];

const q = ref('');
const roleFilter = ref('');
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const users = ref([]);

const roleLabel = v => ROLES.find(r => r.value === v)?.label || v;
const roleColor = v => ROLES.find(r => r.value === v)?.color || '';

function canChange(row) {
  if (row.id === store.user?.id) return false;
  if (!isSuperAdmin.value && SENSITIVE.includes(row.role)) return false;
  return true;
}

function availableRoles(row) {
  return isSuperAdmin.value ? ROLES : ROLES.filter(r => !SENSITIVE.includes(r.value));
}

async function load(p = page.value) {
  page.value = p;
  const params = { page: p, pageSize, q: q.value };
  const res = await api.get('/users/admin/list', { params });
  let list = res.users;
  if (roleFilter.value) list = list.filter(u => u.role === roleFilter.value);
  users.value = list;
  total.value = res.total;
}

async function changeRole(row, newRole) {
  await ElMessageBox.confirm(
    `将 ${row.name || row.username || row.phone} 的角色从「${roleLabel(row.role)}」改为「${roleLabel(newRole)}」？`,
    '确认修改角色',
    { type: 'warning' }
  );
  await api.patch(`/users/admin/${row.id}/role`, { role: newRole });
  row.role = newRole;
  ElMessage.success('角色已更新');
}

onMounted(() => load(1));
</script>
