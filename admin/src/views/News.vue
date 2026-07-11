<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>新闻活动管理</h2>
      <div style="display:flex;gap:8px">
        <el-button @click="importDlg=true">导入HTML</el-button>
        <el-button type="primary" @click="openDialog()">新增</el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <el-input v-model="q" placeholder="搜索标题关键词" clearable style="width:240px" @keyup.enter="load(1)" />
      <el-select v-model="typeFilter" placeholder="按类型筛选" clearable style="width:150px" @change="load(1)">
        <el-option label="新闻" value="news" />
        <el-option label="活动" value="activity" />
        <el-option label="心理科普" value="psychology" />
        <el-option label="考级报名" value="exam" />
        <el-option label="培训课程" value="training" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="发布状态" clearable style="width:130px" @change="load(1)">
        <el-option label="全部" value="" />
        <el-option label="已发布" value="published" />
        <el-option label="草稿" value="draft" />
      </el-select>
      <el-button type="primary" @click="load(1)">搜索</el-button>
      <span style="margin-left:auto;color:#666;font-size:13px">共 {{ total }} 条</span>
    </div>

    <!-- 导入HTML对话框 -->
    <el-dialog v-model="importDlg" title="导入HTML" width="680px">
      <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
        <el-button size="small" @click="$refs.htmlFile.click()">选择HTML文件</el-button>
        <input ref="htmlFile" type="file" accept=".html,.htm" style="display:none" @change="onHtmlFile" />
        <span style="font-size:13px;color:#999">或直接粘贴HTML内容：</span>
      </div>
      <el-input v-model="importHtml" type="textarea" :rows="12" placeholder="粘贴完整HTML代码..." style="font-family:monospace;font-size:12px" />
      <template #footer>
        <el-button @click="importDlg=false">取消</el-button>
        <el-button type="primary" @click="parseAndImport" :disabled="!importHtml.trim()">解析并预览</el-button>
      </template>
    </el-dialog>

    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="title" label="标题" />
      <el-table-column label="类型" width="110">
        <template #default="{row}">
          <el-tag :type="row.type==='activity'?'success':row.type==='psychology'?'warning':row.type==='exam'?'danger':row.type==='training'?'info':'primary'">
            {{row.type==='activity'?'活动':row.type==='psychology'?'心理科普':row.type==='exam'?'考级报名':row.type==='training'?'培训课程':'新闻'}}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="120" />
      <el-table-column label="价格" width="100">
        <template #default="{row}">
          <span v-if="row.is_paid">¥{{ (row.price / 100).toFixed(2) }}</span>
          <el-tag v-else type="success" size="small">免费</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{row}">
          <el-tag :type="row.is_published?'success':'info'">{{row.is_published?'已发布':'草稿'}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{row}">
          <el-button text @click="openDialog(row)">编辑</el-button>
          <el-button text type="info" @click="openComments(row)">留言</el-button>
          <el-button v-if="!row.is_published" text type="success" @click="togglePublish(row,1)">发布</el-button>
          <el-button v-else text type="warning" @click="togglePublish(row,0)">下线</el-button>
          <el-button text type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="prev, pager, next, total"
      style="margin-top:16px;justify-content:flex-end"
      @current-change="load"
    />

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dlg" :title="form.id?'编辑':'新增'" width="860px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="news">新闻</el-radio>
            <el-radio value="activity">活动</el-radio>
            <el-radio value="psychology">心理科普</el-radio>
            <el-radio value="exam">考级报名</el-radio>
            <el-radio value="training">培训课程</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="作者"><el-input v-model="form.author" /></el-form-item>
        <el-form-item label="封面图片">
          <div style="display:flex;gap:8px;align-items:center">
            <el-input v-model="form.cover_image" placeholder="图片URL" style="flex:1" />
            <el-button @click="openImagePicker">从文章选图</el-button>
            <el-button @click="$refs.coverInput.click()" :loading="uploadingCover">上传</el-button>
            <input ref="coverInput" type="file" accept="image/*" style="display:none" @change="uploadCover" />
          </div>
          <img v-if="form.cover_image" :src="form.cover_image" style="margin-top:8px;max-height:80px;max-width:220px;border:1px solid #eee;border-radius:4px;object-fit:cover" />
        </el-form-item>
        <el-form-item label="视频URL"><el-input v-model="form.video_url" /></el-form-item>
        <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="内容">
          <div style="width:100%">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
              <el-button size="small" @click="$refs.inlineInput.click()" :loading="uploadingInline">上传图片获取链接</el-button>
              <input ref="inlineInput" type="file" accept="image/*" style="display:none" @change="uploadInline" />
              <template v-if="lastUrl">
                <el-input v-model="lastUrl" readonly size="small" style="width:280px;font-size:12px" />
                <el-button size="small" @click="copy(lastUrl)">复制链接</el-button>
              </template>
            </div>
            <el-input v-model="form.content" type="textarea" :rows="18"
              style="font-family:monospace;font-size:13px" placeholder="支持粘贴完整 HTML" />
          </div>
        </el-form-item>
        <el-form-item label="发布">
          <el-switch v-model="form.is_published" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="付费活动">
          <el-switch v-model="form.is_paid" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="价格（元）" v-if="form.is_paid">
          <el-input-number v-model="form.price" :min="0.01" :step="0.01" :precision="2" style="width:200px" />
          <span style="margin-left:8px;color:#999;font-size:13px">元（如0.01 用于测试）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 封面图片选择器 -->
    <el-dialog v-model="pickerDlg" title="从文章中选择封面图" width="700px">
      <div v-if="pickerImages.length" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        <div v-for="img in pickerImages" :key="img" @click="selectCover(img)"
          style="cursor:pointer;border:2px solid transparent;border-radius:4px;overflow:hidden"
          :style="form.cover_image===img?'border-color:#4A8A7A':''">
          <img :src="img" style="width:100%;height:100px;object-fit:cover" />
        </div>
      </div>
      <el-empty v-else description="文章中未找到图片" />
    </el-dialog>

    <!-- 留言管理对话框 -->
    <el-dialog v-model="commentDlg" title="留言管理" width="640px">
      <div v-for="c in commentList" :key="c.id"
        :style="c.parentId?'margin-left:24px;background:#f0f7f5;':''"
        style="border:1px solid #eee;border-radius:6px;padding:12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:12px;color:#4A8A7A;font-weight:600">{{c.parentId?'管理员回复':'用户留言 #'+c.userId}}</span>
          <span style="font-size:12px;color:#999">{{new Date(c.createdAt).toLocaleString('zh-CN')}}</span>
        </div>
        <div style="font-size:14px;color:#333;margin-bottom:8px">{{c.content}}</div>
        <div style="display:flex;gap:8px">
          <el-button v-if="!c.parentId" size="small" @click="replyTarget=c.id;replyText=''">回复</el-button>
          <el-button size="small" type="danger" @click="adminDelComment(c.id)">删除</el-button>
        </div>
        <div v-if="replyTarget===c.id" style="margin-top:10px;display:flex;gap:8px">
          <el-input v-model="replyText" placeholder="输入回复..." size="small" style="flex:1" />
          <el-button size="small" type="primary" @click="submitReply(c.id)">发送</el-button>
          <el-button size="small" @click="replyTarget=null">取消</el-button>
        </div>
      </div>
      <el-empty v-if="!commentList.length" description="暂无留言" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api/index';

// 列表与分页
const list = ref([]);
const loading = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 15;

// 搜索/筛选
const q = ref('');
const typeFilter = ref('');
const statusFilter = ref('');

// 表单相关
const dlg = ref(false);
const saving = ref(false);
const form = ref({});
const lastUrl = ref('');
const uploadingCover = ref(false);
const uploadingInline = ref(false);

// 导入HTML
const importDlg = ref(false);
const importHtml = ref('');

function normalize(n) {
  return {
    ...n,
    is_published: n.isPublished ?? n.is_published ?? 0,
    cover_image: n.coverImage ?? n.cover_image ?? '',
    video_url: n.videoUrl ?? n.video_url ?? '',
    created_at: n.createdAt ?? n.created_at ?? '',
  };
}

async function load(p) {
  if (p) page.value = p;
  loading.value = true;
  try {
    const params = {
      includeDraft: '1',
      page: page.value,
      pageSize,
    };
    if (q.value.trim()) params.q = q.value.trim();
    if (typeFilter.value) params.type = typeFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    const { total: t, items } = await api.get('/news', { params });
    total.value = t;
    list.value = items.map(normalize);
  } finally {
    loading.value = false;
  }
}

onMounted(() => load(1));

function openDialog(row = {}) {
  form.value = {
    type: 'news', is_published: 1, is_paid: 0, price: 0,
    ...row,
    price: row.price ? row.price / 100 : 0,  // 分→元
  };
  lastUrl.value = '';
  dlg.value = true;
}

async function uploadCover(e) {
  const file = e.target.files[0];
  if (!file) return;
  uploadingCover.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { url } = await api.post('/upload', fd);
    form.value.cover_image = url;
  } catch {
    ElMessage.error('上传失败');
  } finally {
    uploadingCover.value = false;
    e.target.value = '';
  }
}

async function uploadInline(e) {
  const file = e.target.files[0];
  if (!file) return;
  uploadingInline.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { url } = await api.post('/upload', fd);
    lastUrl.value = url;
  } catch {
    ElMessage.error('上传失败');
  } finally {
    uploadingInline.value = false;
    e.target.value = '';
  }
}

function copy(url) {
  navigator.clipboard.writeText(url).then(() => ElMessage.success('已复制'));
}

async function save() {
  saving.value = true;
  try {
    if (form.value.id) await api.put(`/news/${form.value.id}`, form.value);
    else await api.post('/news', form.value);
    ElMessage.success('保存成功');
    dlg.value = false;
    await load();
  } catch {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function togglePublish(row, val) {
  try {
    await api.put(`/news/${row.id}`, { ...row, is_published: val });
    ElMessage.success(val ? '已发布' : '已下线');
    await load();
  } catch {
    ElMessage.error('操作失败');
  }
}

async function del(row) {
  await ElMessageBox.confirm(`确认删除「${row.title}」？`);
  try {
    await api.delete(`/news/${row.id}`);
    ElMessage.success('已删除');
    await load();
  } catch {}
}

// 留言
const commentDlg = ref(false);
const commentList = ref([]);
const replyTarget = ref(null);
const replyText = ref('');
let currentNewsId = null;

async function openComments(row) {
  currentNewsId = row.id;
  commentList.value = await api.get(`/news/${row.id}/comments`);
  commentDlg.value = true;
}

async function submitReply(parentId) {
  if (!replyText.value.trim()) return;
  await api.post(`/news/comments/${parentId}/reply`, { content: replyText.value.trim() });
  replyTarget.value = null;
  commentList.value = await api.get(`/news/${currentNewsId}/comments`);
}

async function adminDelComment(id) {
  await ElMessageBox.confirm('确认删除该留言？');
  try {
    await api.delete(`/news/comments/${id}`);
    commentList.value = await api.get(`/news/${currentNewsId}/comments`);
  } catch {}
}

// 封面选图
const pickerDlg = ref(false);
const pickerImages = ref([]);

function openImagePicker() {
  const doc = new DOMParser().parseFromString(form.value.content || '', 'text/html');
  pickerImages.value = [...doc.querySelectorAll('img')].map(i => i.getAttribute('src')).filter(Boolean);
  pickerDlg.value = true;
}

function selectCover(url) {
  form.value.cover_image = url;
  pickerDlg.value = false;
}

// 导入HTML
function onHtmlFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { importHtml.value = ev.target.result; };
  reader.readAsText(file, 'utf-8');
  e.target.value = '';
}

function parseAndImport() {
  const parser = new DOMParser();
  const doc = parser.parseFromString(importHtml.value, 'text/html');
  const title = doc.querySelector('title')?.textContent || doc.querySelector('h1')?.textContent || '';
  const styles = [...doc.querySelectorAll('style')].map(s => s.outerHTML).join('');
  const body = doc.body?.innerHTML || importHtml.value;
  importDlg.value = false;
  importHtml.value = '';
  openDialog({ title: title.trim(), content: styles + body, type: 'activity', is_published: 0 });
}
</script>
