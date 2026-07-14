<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>咨询师管理</h2>
      <el-button type="primary" @click="openDialog()">新增咨询师</el-button>
    </div>

    <!-- 搜索栏 -->
    <div style="margin-bottom:16px">
      <el-input
        v-model="searchQ"
        placeholder="搜索咨询师姓名"
        clearable
        style="width:300px"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>
    </div>

    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="title" label="职称" width="150" />
      <el-table-column prop="yearsExp" label="年限" width="80" />
      <el-table-column label="收费/次" width="100">
        <template #default="{row}">
          {{ row.price ? '¥' + (row.price / 100).toFixed(2) : '免费' }}
        </template>
      </el-table-column>
      <el-table-column prop="bio" label="简介" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{row}">
          <el-button text @click="openDialog(row)">编辑</el-button>
          <el-button text @click="manageSlots(row)">排班</el-button>
          <el-button text type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top:16px;display:flex;justify-content:flex-end">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="load"
      />
    </div>

    <el-dialog v-model="dlg" :title="form.id ? '编辑咨询师' : '新增咨询师'" width="600px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="职称"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="头像URL"><el-input v-model="form.avatar" /></el-form-item>
        <el-form-item label="年限"><el-input-number v-model="form.yearsExp" :min="0" /></el-form-item>
        <el-form-item label="收费"><el-input-number v-model="form.price" :min="0" :precision="2" :step="0.01" /></el-form-item>
        <el-form-item label="擅长领域"><el-input v-model="form.specialties" /></el-form-item>
        <el-form-item label="教育背景"><el-input v-model="form.education" placeholder="每行一条，如：北京大学心理学硕士" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="执业资质">
          <el-input v-model="form.certifications" placeholder="每行一条，如：国家二级心理咨询师（证书编号：XXXXXX）" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="从业经历"><el-input v-model="form.workExperience" placeholder="每行一条，如：XX心理咨询中心 2018-2023" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="证书图片">
          <div class="cert-upload-wrap">
            <div v-for="(img, i) in certImageList" :key="i" class="cert-thumb-item">
              <img :src="img" style="width:80px;height:80px;object-fit:cover;border-radius:6px;display:block;" />
              <el-button size="small" type="danger" text style="width:80px;padding:2px 0;" @click="removeCertImg(i)">删除</el-button>
            </div>
            <div class="cert-upload-btn" @click="triggerImgUpload">
              <div v-if="uploading" style="font-size:12px;color:#999">上传中…</div>
              <div v-else style="font-size:24px;color:#ccc;line-height:1">+</div>
              <div style="font-size:12px;color:#999;margin-top:4px">上传图片</div>
            </div>
            <input ref="imgInputRef" type="file" accept="image/*" style="display:none" @change="handleImgUpload" />
          </div>
          <div style="font-size:12px;color:#aaa;margin-top:4px">选填，用户可在详情页点击查看原图</div>
        </el-form-item>
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
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const searchQ = ref('');
const loading = ref(true);
const dlg = ref(false);
const saving = ref(false);
const uploading = ref(false);
const form = ref({});
const certImageList = ref([]);
const imgInputRef = ref(null);

async function load() {
  loading.value = true;
  try {
    const { total: t, items } = await api.get('/consultants', {
      params: { q: searchQ.value || undefined, page: page.value, pageSize }
    });
    total.value = t;
    list.value = items;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  load();
}

onMounted(load);

function openDialog(row = {}) {
  form.value = {
    ...row,
    yearsExp: row.yearsExp || 0,
    price: row.price ? row.price / 100 : 0  // 分→元
  };
  certImageList.value = row.certificationImages ? JSON.parse(row.certificationImages) : [];
  dlg.value = true;
}

async function save() {
  saving.value = true;
  try {
    const payload = {
      ...form.value,
      price: Math.round((form.value.price || 0) * 100), // 元→分
      certificationImages: certImageList.value.length ? JSON.stringify(certImageList.value) : null
    };
    if (payload.id) await api.put(`/consultants/${payload.id}`, payload);
    else await api.post('/consultants', payload);
    ElMessage.success('保存成功');
    dlg.value = false;
    await load();
  } catch {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

function triggerImgUpload() { imgInputRef.value?.click(); }

async function handleImgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/upload', fd);
    certImageList.value.push(res.url);
  } catch {
    ElMessage.error('图片上传失败');
  } finally {
    uploading.value = false;
    e.target.value = '';
  }
}

function removeCertImg(i) { certImageList.value.splice(i, 1); }

async function del(row) {
  await ElMessageBox.confirm(`确认删除 ${row.name}？`);
  try {
    await api.delete(`/consultants/${row.id}`);
    ElMessage.success('已删除');
    await load();
  } catch {}
}

function manageSlots(row) { router.push(`/consultants/${row.id}/slots`); }
</script>

<style scoped>
.cert-upload-wrap { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
.cert-thumb-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.cert-upload-btn {
  width: 80px; height: 80px; border: 2px dashed #ddd; border-radius: 6px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; background: #fafafa;
}
.cert-upload-btn:hover { border-color: #409eff; }
</style>
