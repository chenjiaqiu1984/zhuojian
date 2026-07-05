<template>
  <div>
    <h2>预约管理</h2>
    <el-table :data="list" border style="margin-top:16px" v-loading="loading">
      <el-table-column prop="user_name" label="来访者" width="120" />
      <el-table-column prop="consultant_name" label="咨询师" width="120" />
      <el-table-column prop="start_time" label="预约时间" />
      <el-table-column label="状态" width="100">
        <template #default="{row}">
          <el-tag :type="tagType[row.status]">{{label[row.status]}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="notes" label="备注" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{row}">
          <template v-if="row.status === 'pending'">
            <el-button text type="success" @click="updateStatus(row,'confirmed')">确认</el-button>
            <el-button text type="danger" @click="cancelDlg(row)">取消</el-button>
          </template>
          <template v-if="row.status === 'confirmed'">
            <el-button text @click="updateStatus(row,'completed')">完成</el-button>
            <el-button text type="danger" @click="cancelDlg(row)">取消</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" title="取消预约" width="400px">
      <el-input v-model="msg" placeholder="取消原因（可选）" />
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="doCancel">确认取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index';

const list = ref([]);
const loading = ref(true);
const dlg = ref(false);
const msg = ref('');
const curRow = ref(null);
const label = { pending: '待确认', confirmed: '已确认', cancelled: '已取消', completed: '已完成' };
const tagType = { pending: 'warning', confirmed: 'success', cancelled: 'info', completed: '' };

async function load() { try { list.value = await api.get('/booking'); } finally { loading.value = false; } }
onMounted(load);

async function updateStatus(row, status) {
  try { await api.put(`/booking/${row.id}/status`, { status }); ElMessage.success('操作成功'); await load(); } catch { ElMessage.error('操作失败'); }
}

function cancelDlg(row) { curRow.value = row; msg.value = ''; dlg.value = true; }
async function doCancel() {
  try { await api.put(`/booking/${curRow.value.id}/status`, { status: 'cancelled', message: msg.value }); ElMessage.success('已取消'); dlg.value = false; await load(); } catch {}
}
</script>
