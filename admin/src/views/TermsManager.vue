<template>
  <div>
    <!-- 两个协议类型 Tab -->
    <el-tabs v-model="activeType" @tab-change="load(1)">
      <el-tab-pane label="📄 用户服务协议" name="terms" />
      <el-tab-pane label="🔒 隐私政策" name="privacy" />
    </el-tabs>

    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <el-button type="primary" @click="openNew">新建草稿</el-button>
    </div>

    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="version" label="版本号" width="100" />
      <el-table-column prop="title" label="标题" />
      <el-table-column label="状态" width="100">
        <template #default="{row}">
          <el-tag :type="row.isDraft ? 'info' : 'success'" size="small">
            {{ row.isDraft ? '草稿' : '已发布' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="发布时间" width="160">
        <template #default="{row}">{{ row.publishedAt ? fmt(row.publishedAt) : '-' }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="160">
        <template #default="{row}">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{row}">
          <el-button text @click="openEdit(row)">{{ row.isDraft ? '编辑' : '查看' }}</el-button>
          <el-button v-if="row.isDraft" text type="primary" @click="publish(row)">发布</el-button>
          <el-popconfirm v-if="row.isDraft" title="确认删除该草稿？" @confirm="del(row)">
            <template #reference>
              <el-button text type="danger">删除</el-button>
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

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="dlg"
      :title="dlgTitle"
      width="780px"
    >
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="版本号">
          <el-input
            v-model="editForm.version"
            placeholder="如 1.0 / 1.1 / 2.0"
            :disabled="!editForm.isDraft && !!editForm.id"
            style="width:200px"
          />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="editForm.title" :disabled="!editForm.isDraft && !!editForm.id" />
        </el-form-item>
        <el-form-item label="正文内容">
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="20"
            placeholder="输入协议正文内容"
            :disabled="!editForm.isDraft && !!editForm.id"
            style="font-family:monospace;font-size:13px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">{{ (editForm.isDraft || !editForm.id) ? '取消' : '关闭' }}</el-button>
        <el-button v-if="editForm.isDraft || !editForm.id" type="primary" :loading="saving" @click="save">
          {{ editForm.id ? '保存草稿' : '创建草稿' }}
        </el-button>
        <el-button v-if="editForm.isDraft && editForm.id" type="success" :loading="publishing" @click="publishFromDlg">
          保存并发布
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api/index';

const activeType = ref('terms');
const TYPE_LABELS = { terms: '用户服务协议', privacy: '隐私政策' };

const list = ref([]);
const loading = ref(false);
const dlg = ref(false);
const saving = ref(false);
const publishing = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const editForm = ref({ id: null, type: 'terms', version: '', title: '', content: '', isDraft: 1 });

const dlgTitle = computed(() => {
  const typeLabel = TYPE_LABELS[editForm.value.type] || editForm.value.type;
  if (!editForm.value.id) return `新建${typeLabel}草稿`;
  return editForm.value.isDraft ? `编辑草稿 · ${typeLabel}` : `查看版本 · ${typeLabel}`;
});

async function load(p = page.value) {
  loading.value = true;
  page.value = p;
  try {
    const rows = await api.get('/terms/all', { params: { type: activeType.value } });
    list.value = rows;
    total.value = rows.length;
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
}
onMounted(load);

function fmt(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

function openNew() {
  editForm.value = {
    id: null,
    type: activeType.value,
    version: '',
    title: TYPE_LABELS[activeType.value] || '',
    content: '',
    isDraft: 1
  };
  dlg.value = true;
}

async function openEdit(row) {
  try {
    const detail = await api.get(`/terms/${row.id}`);
    editForm.value = { ...detail };
    dlg.value = true;
  } catch { ElMessage.error('加载失败'); }
}

async function save() {
  if (!editForm.value.version || !editForm.value.content) {
    return ElMessage.warning('版本号和内容不能为空');
  }
  saving.value = true;
  try {
    if (editForm.value.id) {
      await api.put(`/terms/${editForm.value.id}`, editForm.value);
    } else {
      const { id } = await api.post('/terms', { ...editForm.value, type: activeType.value });
      editForm.value.id = id;
    }
    ElMessage.success('草稿已保存');
    await load();
  } catch (e) { ElMessage.error(e?.error || '保存失败'); }
  finally { saving.value = false; }
}

async function publish(row) {
  await ElMessageBox.confirm(
    `发布版本 ${row.version} 后，所有已登录用户下次打开 App 时将被要求重新确认协议，确认发布？`,
    '发布确认', { type: 'warning' }
  );
  try {
    await api.post(`/terms/${row.id}/publish`);
    ElMessage.success('已发布');
    await load();
  } catch (e) { ElMessage.error(e?.error || '发布失败'); }
}

async function publishFromDlg() {
  await save();
  if (!editForm.value.id) return;
  publishing.value = true;
  try {
    await api.post(`/terms/${editForm.value.id}/publish`);
    ElMessage.success('已保存并发布');
    dlg.value = false;
    await load();
  } catch (e) { ElMessage.error(e?.error || '发布失败'); }
  finally { publishing.value = false; }
}

async function del(row) {
  try {
    await api.delete(`/terms/${row.id}`);
    ElMessage.success('已删除');
    await load();
  } catch (e) { ElMessage.error(e?.error || '删除失败'); }
}
</script>
