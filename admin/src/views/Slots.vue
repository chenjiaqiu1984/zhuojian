<template>
  <div>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <el-button @click="$router.back()">返回</el-button>
      <h2>{{consultant?.name}} - 排班管理</h2>
      <el-button type="primary" @click="addDlg=true">添加时间段</el-button>
    </div>
    <el-table :data="slots" border v-loading="loading">
      <el-table-column prop="start_time" label="开始时间" />
      <el-table-column prop="end_time" label="结束时间" />
      <el-table-column label="状态" width="100">
        <template #default="{row}">
          <el-tag :type="row.is_booked ? 'danger' : 'success'">{{row.is_booked ? '已预约' : '空闲'}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{row}">
          <el-button text type="danger" :disabled="row.is_booked" @click="delSlot(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="addDlg" title="添加时间段" width="400px">
      <el-form label-width="80px">
        <el-form-item label="开始时间"><el-date-picker v-model="newSlot.start_time" type="datetime" /></el-form-item>
        <el-form-item label="结束时间"><el-date-picker v-model="newSlot.end_time" type="datetime" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDlg=false">取消</el-button>
        <el-button type="primary" @click="addSlot">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api/index';

const route = useRoute();
const id = route.params.id;
const consultant = ref(null);
const slots = ref([]);
const loading = ref(true);
const addDlg = ref(false);
const newSlot = ref({ start_time: null, end_time: null });

async function load() {
  try {
    const res = await api.get(`/consultants/${id}`);
    consultant.value = res;
    slots.value = await api.get(`/consultants/${id}/slots`).catch(() => res.slots || []);
  } finally { loading.value = false; }
}
onMounted(load);

async function addSlot() {
  if (!newSlot.value.start_time || !newSlot.value.end_time) return;
  try {
    await api.post(`/consultants/${id}/slots`, { slots: [{ start_time: newSlot.value.start_time, end_time: newSlot.value.end_time }] });
    ElMessage.success('添加成功'); addDlg.value = false; await load();
  } catch { ElMessage.error('添加失败'); }
}

async function delSlot(row) {
  try { await api.delete(`/consultants/slots/${row.id}`); ElMessage.success('已删除'); await load(); } catch { ElMessage.error('删除失败'); }
}
</script>
