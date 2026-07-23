<template>
  <div>
    <h2>关于我们</h2>
    <el-card style="margin-top:24px">
      <el-form :model="form" label-width="100px" v-loading="loading">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="8" />
        </el-form-item>

        <el-form-item label="首页滚动条">
          <div>
            <div v-for="(item, i) in form.tickerItems" :key="i" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
              <el-select v-model="item.type" style="width:120px" @change="item.itemId=null">
                <el-option label="新闻/活动" value="news" />
                <el-option label="咨询师" value="consultant" />
                <el-option label="心理图卡种类" value="ohcard" />
              </el-select>
              <el-select v-model="item.itemId" style="width:220px" :placeholder="item.type ? '选择内容' : '请先选类别'">
                <el-option v-for="opt in (tickerOptions[item.type]||[])" :key="opt.id" :label="opt.label" :value="opt.id" />
              </el-select>
              <img v-if="previewImage(item)" :src="previewImage(item)" style="width:40px;height:40px;border-radius:6px;object-fit:cover" />
              <el-button size="small" :loading="uploadingIdx===i" @click="triggerUpload(i)">换图</el-button>
              <el-button icon="Delete" circle size="small" type="danger" @click="form.tickerItems.splice(i,1)" />
            </div>
            <el-button v-if="form.tickerItems.length < 4" @click="form.tickerItems.push({type:'news',itemId:null,image:''})" size="small">
              + 添加项目 ({{ form.tickerItems.length }}/4)
            </el-button>
            <span v-else style="font-size:13px;color:#999;margin-left:8px">最多4个</span>
            <input ref="uploadInput" type="file" accept="image/*" style="display:none" @change="onUpload" />
          </div>
        </el-form-item>

        <el-form-item label="首页菜单分组">
          <div style="width:100%">
            <div v-for="(group, gi) in form.menuGroups" :key="gi"
                 style="border:1px solid #eee;border-radius:8px;padding:16px;margin-bottom:12px;background:#fafafa">
              <!-- 组头 -->
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
                <span style="font-weight:600;color:#666;font-size:13px">分组 {{gi+1}}</span>
                <el-input v-model="group.label" placeholder="分组名称" style="width:140px" size="small" />
                <div style="margin-left:auto;display:flex;gap:4px">
                  <el-button :disabled="gi===0" size="small" @click="moveGroup(gi,-1)">↑</el-button>
                  <el-button :disabled="gi===form.menuGroups.length-1" size="small" @click="moveGroup(gi,1)">↓</el-button>
                </div>
              </div>
              <!-- 组内菜单项 -->
              <div v-for="(item, ii) in group.items" :key="ii"
                   style="display:flex;align-items:center;gap:8px;margin-bottom:6px;background:#fff;border:1px solid #f0f0f0;border-radius:6px;padding:8px 12px">
                <span style="font-size:13px;color:#333;flex:1">{{ item.label }}</span>
                <span style="font-size:12px;color:#aaa;font-family:mono">{{ item.path.split('/').pop() }}</span>
                <el-button :disabled="ii===0" size="small" circle @click="moveItem(gi,ii,-1)">↑</el-button>
                <el-button :disabled="ii===group.items.length-1" size="small" circle @click="moveItem(gi,ii,1)">↓</el-button>
              </div>
            </div>
            <el-button size="small" @click="resetMenuGroups" style="margin-top:4px">重置为默认</el-button>
          </div>
        </el-form-item>

        <el-form-item label="页面图片">
          <div class="img-list">
            <div class="img-row" v-for="(img, i) in form.images" :key="i">
              <el-input v-model="form.images[i]" placeholder="图片URL" style="flex:1" />
              <el-button :disabled="i===0" icon="ArrowUp" circle size="small" @click="move(i,-1)" />
              <el-button :disabled="i===form.images.length-1" icon="ArrowDown" circle size="small" @click="move(i,1)" />
              <el-button icon="Delete" circle size="small" type="danger" @click="form.images.splice(i,1)" />
            </div>
            <el-button @click="form.images.push('')" size="small" style="margin-top:8px">+ 添加图片链接</el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="save" :loading="saving">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index.js';

const DEFAULT_MENU_GROUPS = [
  {
    label: '咨询 · 资讯',
    items: [
      { path: '/pages/consultants/index', label: '预约咨询师', icon: '/static/icons/grid/consultant.svg', color: '#4A8A7A' },
      { path: '/pages/activity/index',    label: '线下活动',   icon: '/static/icons/grid/activity.svg',   color: '#4A8A7A' },
      { path: '/pages/news/index',        label: '动态资讯', icon: '/static/icons/grid/news.svg',       color: '#4A8A7A' },
      { path: '/pages/about/index',       label: '关于我们', icon: '/static/icons/grid/about.svg',      color: '#4A8A7A' },
    ],
  },
  {
    label: '心理工具',
    items: [
      { path: '/pages/assessment/index',  label: '心理测评', icon: '/static/icons/grid/assessment.svg', color: '#3A6E80' },
      { path: '/pages/ohcard/index',      label: '心理图卡', icon: '/static/icons/grid/ohcard.svg',     color: '#3A6E80' },
      { path: '/pages/homework/index',    label: '咨询工具', icon: '/static/icons/grid/homework.svg',   color: '#3A6E80' },
      { path: '/pages/learning/index',    label: '学习进阶', icon: '/static/icons/grid/learning.svg',   color: '#3A6E80' },
    ],
  },
];

const form = ref({ title: '', content: '', images: [], tickerItems: [], menuGroups: DEFAULT_MENU_GROUPS });
const loading = ref(true);
const saving = ref(false);
const tickerOptions = ref({ news: [], consultant: [], ohcard: [] });
const uploadInput = ref(null);
const uploadingIdx = ref(-1);

onMounted(async () => {
  try {
    const [data, opts] = await Promise.all([api.get('/about'), api.get('/about/ticker-options')]);
    tickerOptions.value = opts;
    form.value = {
      ...data,
      images: data.images || [],
      tickerItems: (data.tickerItems || []).map(i => ({ type: i.type, itemId: i.id, image: i.image || '' })),
      menuGroups: data.menuGroups || DEFAULT_MENU_GROUPS,
    };
  } finally { loading.value = false; }
});

function previewImage(item) {
  if (item.image) return item.image;
  const opt = (tickerOptions.value[item.type] || []).find(o => o.id === item.itemId);
  return opt?.image || '';
}

function triggerUpload(i) {
  uploadingIdx.value = i;
  uploadInput.value.value = '';
  uploadInput.value.click();
}

async function onUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const i = uploadingIdx.value;
  try {
    const fd = new FormData(); fd.append('file', file);
    const { url } = await api.post('/upload', fd);
    form.value.tickerItems[i].image = url;
  } catch { ElMessage.error('上传失败'); } finally { uploadingIdx.value = -1; }
}

function move(i, dir) {
  const arr = form.value.images;
  [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
}

function moveGroup(gi, dir) {
  const arr = form.value.menuGroups;
  [arr[gi], arr[gi + dir]] = [arr[gi + dir], arr[gi]];
}

function moveItem(gi, ii, dir) {
  const arr = form.value.menuGroups[gi].items;
  [arr[ii], arr[ii + dir]] = [arr[ii + dir], arr[ii]];
}

function resetMenuGroups() {
  form.value.menuGroups = JSON.parse(JSON.stringify(DEFAULT_MENU_GROUPS));
}

async function save() {
  saving.value = true;
  const images = form.value.images.filter(u => u.trim());
  const tickerItems = form.value.tickerItems.filter(i => i.type && i.itemId);
  try {
    await api.put('/about', { ...form.value, images, tickerItems, menuGroups: form.value.menuGroups });
    ElMessage.success('保存成功');
  }
  catch { ElMessage.error('保存失败'); } finally { saving.value = false; }
}
</script>

<style scoped>
.img-list { width: 100%; }
.img-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
</style>
