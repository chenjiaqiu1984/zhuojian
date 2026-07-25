<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>树洞管理</h2>
      <el-tag type="info">共 {{ total }} 条</el-tag>
    </div>

    <el-card style="margin-bottom:16px">
      <el-form inline>
        <el-form-item label="范围">
          <el-radio-group v-model="scope" @change="onScopeChange">
            <el-radio-button value="platform">写给平台</el-radio-button>
            <el-radio-button value="anonymous">匿名上墙</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="scope === 'anonymous'" label="上墙状态">
          <el-select v-model="statusFilter" placeholder="全部" clearable style="width:120px" @change="onFilter">
            <el-option label="可见" value="visible" />
            <el-option label="已隐藏" value="hidden" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-alert
      :closable="false"
      show-icon
      :type="scope === 'anonymous' ? 'warning' : 'info'"
      :title="scope === 'anonymous'
        ? '展示历史「匿名上墙」记录（功能已关闭，仅供查阅与隐藏）。「写给自己」私密内容仍不可见。'
        : '仅展示「写给平台」的留言。「写给自己」仅用户本人可见，管理员无法查看。'"
      style="margin-bottom:16px"
    />

    <el-table :data="list" border v-loading="loading">
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column v-if="scope === 'anonymous'" label="原类型" width="100">
        <template #default="{ row }">{{ catLabel(row.category) }}</template>
      </el-table-column>
      <el-table-column label="用户" width="180">
        <template #default="{ row }">
          <span v-if="row.user">
            {{ row.user.name || row.user.username || ('#' + row.user.id) }}
            <span v-if="row.user.phone" style="color:#999;font-size:12px">（{{ row.user.phone }}）</span>
          </span>
        </template>
      </el-table-column>
      <el-table-column label="内容" min-width="240" show-overflow-tooltip>
        <template #default="{ row }">{{ row.content }}</template>
      </el-table-column>
      <el-table-column label="回复" width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.adminReply || '—' }}</template>
      </el-table-column>
      <el-table-column v-if="scope === 'anonymous'" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'hidden' ? 'danger' : 'success'" size="small">
            {{ row.status === 'hidden' ? '已隐藏' : '可见' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" :width="scope === 'anonymous' ? 260 : 100" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="openReply(row)">回复</el-button>
          <el-button
            v-if="scope === 'anonymous'"
            text
            :type="row.status === 'hidden' ? 'success' : 'warning'"
            @click="toggleStatus(row)"
          >
            {{ row.status === 'hidden' ? '恢复上墙' : '隐藏上墙' }}
          </el-button>
          <el-popconfirm
            v-if="scope === 'anonymous'"
            title="确认删除该匿名上墙记录？"
            @confirm="del(row)"
          >
            <template #reference>
              <el-button text type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top:16px;justify-content:flex-end;display:flex"
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="load"
    />

    <el-dialog v-model="replyDlg" title="回复用户" width="480px">
      <el-form label-width="80px">
        <el-form-item label="内容">
          <div style="color:#666;line-height:1.6;white-space:pre-wrap">{{ replyRow?.content }}</div>
        </el-form-item>
        <el-form-item label="回复">
          <el-input v-model="replyText" type="textarea" :rows="4" placeholder="给用户的回复（用户在「我的记录」中可见）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyDlg = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doReply">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index.js';

const CAT_MAP = { platform: '写给平台', self: '写给自己', feedback: '意见建议', emotion: '一个情绪' };

const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);
const scope = ref('platform');
const statusFilter = ref('');
const replyDlg = ref(false);
const replyRow = ref(null);
const replyText = ref('');
const saving = ref(false);

function catLabel(c) {
  return CAT_MAP[c] || c;
}

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  const p = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function onScopeChange() {
  statusFilter.value = '';
  page.value = 1;
  load();
}

function onFilter() {
  page.value = 1;
  load();
}

async function load() {
  loading.value = true;
  try {
    const params = { page: page.value, limit: pageSize, scope: scope.value };
    if (scope.value === 'anonymous' && statusFilter.value) params.status = statusFilter.value;
    const res = await api.get('/treehole/admin', { params });
    list.value = res.list || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

function openReply(row) {
  replyRow.value = row;
  replyText.value = row.adminReply || '';
  replyDlg.value = true;
}

async function doReply() {
  saving.value = true;
  try {
    await api.patch(`/treehole/admin/${replyRow.value.id}`, { adminReply: replyText.value });
    ElMessage.success('已保存');
    replyDlg.value = false;
    await load();
  } catch (e) {
    ElMessage.error(e?.error || e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row) {
  const status = row.status === 'hidden' ? 'visible' : 'hidden';
  try {
    await api.patch(`/treehole/admin/${row.id}`, { status });
    ElMessage.success(status === 'hidden' ? '已隐藏' : '已恢复');
    await load();
  } catch (e) {
    ElMessage.error(e?.error || e?.message || '操作失败');
  }
}

async function del(row) {
  try {
    await api.delete(`/treehole/admin/${row.id}`);
    ElMessage.success('已删除');
    await load();
  } catch (e) {
    ElMessage.error(e?.error || e?.message || '删除失败');
  }
}

onMounted(load);
</script>
