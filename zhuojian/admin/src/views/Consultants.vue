<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>咨询师管理</h2>
      <el-button type="primary" @click="openDialog()">新增咨询师</el-button>
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="title" label="职称" width="150" />
      <el-table-column prop="years_exp" label="年限" width="80" />
      <el-table-column prop="price" label="收费/次" width="100" />
      <el-table-column prop="bio" label="简介" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{row}">
          <el-button text @click="openDialog(row)">编辑</el-button>
          <el-button text @click="manageSlots(row)">排班</el-button>
          <el-button text type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" :title="form.id ? '编辑咨询师' : '新增咨询师'" width="600px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="职称"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="头像URL"><el-input v-model="form.avatar" /></el-form-item>
        <el-form-item label="年限"><el-input-number v-model="form.years_exp" :min="0" /></el-form-item>
        <el-form-item label="收费"><el-input-number v-model="form.price" :min="0" /></el-form-item>
        <el-form-item label="擅长领域"><el-input v-model="form.specialties" /></el-form-item>
        <el-form-item label="教育背景"><el-input v-model="form.education" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="form.bio" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import api from '../api/index';

const router = useRouter();
const list = ref([]);
const loading = ref(true);
const dlg = ref(false);
const saving = ref(false);
const form = ref({});

async function load() { try { list.value = await api.get('/consultants'); } finally { loading.value = false; } }
onMounted(load);

function openDialog(row = {}) { form.value = { ...row, years_exp: row.years_exp || 0, price: row.price || 0 }; dlg.value = true; }

async function save() {
  saving.value = true;
  try {
    if (form.value.id) await api.put(`/consultants/${form.value.id}`, form.value);
    else await api.post('/consultants', form.value);
    ElMessage.success('保存成功'); dlg.value = false; await load();
  } catch { ElMessage.error('保存失败'); } finally { saving.value = false; }
}

async function del(row) {
  await ElMessageBox.confirm(`确认删除 ${row.name}？`);
  try { await api.delete(`/consultants/${row.id}`); ElMessage.success('已删除'); await load(); } catch {}
}

function manageSlots(row) { router.push(`/consultants/${row.id}/slots`); }
</script>
