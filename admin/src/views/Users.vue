<template>
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <el-input v-model="q" placeholder="搜索用户名/手机/姓名" clearable style="width:240px" @keyup.enter="load(1)" />
      <el-select v-model="roleFilter" placeholder="按角色筛选" clearable style="width:140px" @change="load(1)">
        <el-option v-for="r in ROLES" :key="r.value" :label="r.label" :value="r.value" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="按状态筛选" clearable style="width:140px" @change="load(1)">
        <el-option label="全部状态" value="" />
        <el-option label="正常" value="active" />
        <el-option label="待完善" value="pending" />
        <el-option label="异常" value="suspended" />
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
      <el-table-column label="角色" width="110">
        <template #default="{row}">
          <el-tag :type="roleColor(row.role)" size="small">{{roleLabel(row.role)}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="账号状态" width="110">
        <template #default="{row}">
          <el-tag :type="statusColor(row.status)" size="small">{{statusLabel(row.status)}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="160">
        <template #default="{row}">{{new Date(row.createdAt).toLocaleString('zh-CN')}}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{row}">
          <!-- 角色 -->
          <el-select
            :model-value="row.role"
            size="small"
            style="width:110px;margin-right:6px"
            :disabled="!canChange(row)"
            @change="v => changeRole(row, v)"
          >
            <el-option v-for="r in availableRoles(row)" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
          <!-- 状态切换 -->
          <el-button
            v-if="canChange(row) && row.status !== 'pending'"
            size="small"
            :type="row.status === 'suspended' ? 'success' : 'warning'"
            plain
            style="margin-right:6px"
            @click="toggleStatus(row)"
          >
            {{row.status === 'suspended' ? '恢复正常' : '设为异常'}}
          </el-button>
          <!-- 删除 -->
          <el-popconfirm
            v-if="canDelete(row)"
            :title="`确认删除用户「${row.name || row.phone || row.id}」？此操作不可撤销。`"
            confirm-button-text="确认删除"
            confirm-button-type="danger"
            @confirm="deleteUser(row)"
          >
            <template #reference>
              <el-button size="small" type="danger" plain>删除</el-button>
            </template>
          </el-popconfirm>
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

const STATUSES = [
  { value: 'active',    label: '正常', color: 'success' },
  { value: 'pending',   label: '待完善', color: 'warning' },
  { value: 'suspended', label: '异常', color: 'danger' },
];

const q = ref('');
const roleFilter = ref('');
const statusFilter = ref('');
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const users = ref([]);

const roleLabel   = v => ROLES.find(r => r.value === v)?.label || v;
const roleColor   = v => ROLES.find(r => r.value === v)?.color || '';
const statusLabel = v => STATUSES.find(s => s.value === v)?.label || v;
const statusColor = v => STATUSES.find(s => s.value === v)?.color || '';

function canChange(row) {
  if (row.id === store.user?.id) return false;
  if (!isSuperAdmin.value && SENSITIVE.includes(row.role)) return false;
  return true;
}

function canDelete(row) {
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
  if (statusFilter.value) params.status = statusFilter.value;
  const res = await api.get('/users/admin/list', { params });
  let list = res.users;
  if (roleFilter.value) list = list.filter(u => u.role === roleFilter.value);
  users.value = list;
  total.value = res.total;
}

async function changeRole(row, newRole) {
  await ElMessageBox.confirm(
    `将 ${row.name || row.username || row.phone} 的角色从「${roleLabel(row.role)}」改为「${roleLabel(newRole)}」？`,
    '确认修改角色', { type: 'warning' }
  );
  await api.patch(`/users/admin/${row.id}/role`, { role: newRole });
  row.role = newRole;
  ElMessage.success('角色已更新');
}

async function toggleStatus(row) {
  const newStatus = row.status === 'suspended' ? 'active' : 'suspended';
  const label = newStatus === 'suspended' ? '设为异常（账号将无法正常使用）' : '恢复为正常';
  await ElMessageBox.confirm(
    `确认将 ${row.name || row.username || row.phone} ${label}？`,
    '确认修改状态', { type: 'warning' }
  );
  await api.patch(`/users/admin/${row.id}/status`, { status: newStatus });
  row.status = newStatus;
  ElMessage.success('状态已更新');
}

async function deleteUser(row) {
  try {
    await api.delete(`/users/admin/${row.id}`);
    ElMessage.success('用户已删除');
    await load();
  } catch (e) {
    ElMessage.error(e?.error || '删除失败');
  }
}

onMounted(() => load(1));
</script>
