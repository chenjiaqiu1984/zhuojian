<template>
  <div>
    <h2>预约管理</h2>

    <!-- 搜索与筛选栏 -->
    <el-row :gutter="12" style="margin-top:16px">
      <el-col :span="6">
        <el-input
          v-model="q"
          placeholder="搜索来访者/咨询师名字"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </el-col>
      <el-col :span="5">
        <el-select v-model="statusFilter" placeholder="状态筛选" clearable @change="handleSearch" style="width:100%">
          <el-option label="待确认" value="pending" />
          <el-option label="已确认" value="confirmed" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </el-col>
      <el-col :span="8">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          clearable
          @change="handleSearch"
          style="width:100%"
        />
      </el-col>
      <el-col :span="5" style="display:flex;gap:8px">
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-table :data="list" border style="margin-top:16px" v-loading="loading">
      <el-table-column prop="user_name" label="来访者" width="120" />
      <el-table-column prop="consultant_name" label="咨询师" width="120" />
      <el-table-column prop="start_time" label="预约时间" />
      <el-table-column label="状态" width="100">
        <template #default="{row}">
          <el-tag :type="tagType[row.status]">{{ label[row.status] }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="notes" label="备注" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{row}">
          <template v-if="row.status === 'pending'">
            <el-button text type="success" @click="updateStatus(row, 'confirmed')">确认</el-button>
            <el-button text type="danger" @click="cancelDlg(row)">取消</el-button>
          </template>
          <template v-if="row.status === 'confirmed'">
            <el-button text @click="updateStatus(row, 'completed')">完成</el-button>
            <el-button text type="danger" @click="cancelDlg(row)">取消</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top:16px; justify-content:flex-end; display:flex"
      @current-change="load"
      @size-change="handleSearch"
    />

    <!-- 取消对话框 -->
    <el-dialog v-model="dlg" title="取消预约" width="400px">
      <el-input v-model="msg" placeholder="取消原因（可选）" />
      <template #footer>
        <el-button @click="dlg = false">关闭</el-button>
        <el-button type="primary" @click="doCancel">确认取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import api from '../api/index';

const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const q = ref('');
const statusFilter = ref('');
const dateRange = ref([]);

const dlg = ref(false);
const msg = ref('');
const curRow = ref(null);

const label = { pending: '待确认', confirmed: '已确认', cancelled: '已取消', completed: '已完成' };
const tagType = { pending: 'warning', confirmed: 'success', cancelled: 'info', completed: '' };

async function load() {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
    };
    if (q.value) params.q = q.value;
    if (statusFilter.value) params.status = statusFilter.value;
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const { total: t, items } = await api.get('/booking/admin', { params });
    total.value = t;
    list.value = items;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  load();
}

function handleReset() {
  q.value = '';
  statusFilter.value = '';
  dateRange.value = [];
  page.value = 1;
  load();
}

onMounted(load);

async function updateStatus(row, status) {
  try {
    await api.put(`/booking/${row.id}/status`, { status });
    ElMessage.success('操作成功');
    await load();
  } catch {
    ElMessage.error('操作失败');
  }
}

function cancelDlg(row) {
  curRow.value = row;
  msg.value = '';
  dlg.value = true;
}

async function doCancel() {
  try {
    await api.put(`/booking/${curRow.value.id}/status`, { status: 'cancelled', message: msg.value });
    ElMessage.success('已取消');
    dlg.value = false;
    await load();
  } catch {
    ElMessage.error('取消失败');
  }
}
</script>
