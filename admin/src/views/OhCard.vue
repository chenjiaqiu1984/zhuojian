<template>
  <div>
    <el-tabs v-model="tab">
      <!-- ===== 牌组管理 ===== -->
      <el-tab-pane label="牌组管理" name="categories">
        <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
          <el-button type="primary" @click="catDlg=true">新增牌组</el-button>
          <el-input
            v-model="catQ"
            placeholder="搜索牌组名称"
            clearable
            style="width:200px"
            prefix-icon="Search"
          />
        </div>
        <el-table :data="filteredCats" border>
          <el-table-column prop="name" label="牌组名称" />
          <el-table-column label="类型" width="100">
            <template #default="{row}">
              <el-tag>{{ row.type === 'image' ? '图卡' : '字卡' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
          <el-table-column label="操作" width="120">
            <template #default="{row}">
              <el-button text @click="loadCards(row)">查看卡片</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-dialog v-model="catDlg" title="新增牌组" width="400px">
          <el-form :model="catForm" label-width="80px">
            <el-form-item label="名称"><el-input v-model="catForm.name" /></el-form-item>
            <el-form-item label="类型">
              <el-radio-group v-model="catForm.type">
                <el-radio value="image">图卡</el-radio>
                <el-radio value="word">字卡</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="描述"><el-input v-model="catForm.description" /></el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="catDlg=false">取消</el-button>
            <el-button type="primary" @click="saveCategory">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ===== 卡片管理 ===== -->
      <el-tab-pane label="卡片管理" name="cards">
        <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <el-select v-model="selCat" placeholder="选择牌组" style="width:200px" @change="onCatChange">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-input
            v-model="cardQ"
            placeholder="搜索文字"
            clearable
            style="width:180px"
            prefix-icon="Search"
          />
          <el-button type="primary" @click="cardDlg=true" :disabled="!selCat">添加卡片</el-button>
          <el-button type="danger" :disabled="!selectedCards.length" @click="batchDel">
            批量删除({{ selectedCards.length }})
          </el-button>
        </div>

        <el-table
          :data="pagedCards"
          border
          @selection-change="selectedCards=$event"
          v-loading="cardsLoading"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column label="图片" width="100">
            <template #default="{row}">
              <el-image
                v-if="row.image_url"
                :src="row.image_url"
                style="width:60px;height:80px"
                fit="contain"
              />
            </template>
          </el-table-column>
          <el-table-column prop="word" label="文字" />
          <el-table-column label="操作" width="100">
            <template #default="{row}">
              <el-button text type="danger" @click="delCard(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top:16px;display:flex;justify-content:flex-end">
          <el-pagination
            v-model:current-page="cardPage"
            :page-size="cardPageSize"
            :total="filteredCards.length"
            layout="total, prev, pager, next"
            background
          />
        </div>

        <el-dialog v-model="cardDlg" title="添加卡片" width="500px">
          <el-form label-width="80px">
            <el-form-item label="图片URL"><el-input v-model="cardForm.image_url" /></el-form-item>
            <el-form-item label="文字"><el-input v-model="cardForm.word" /></el-form-item>
            <el-form-item label="批量文字">
              <el-input
                v-model="batchWords"
                type="textarea"
                :rows="4"
                placeholder="每行一个词，用于批量添加字卡"
              />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="cardDlg=false">取消</el-button>
            <el-button type="primary" @click="saveCard">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ===== 预设管理（4种类型）===== -->
      <el-tab-pane
        v-for="ptype in ['single','combo','scene','dilemma']"
        :key="ptype"
        :label="PTYPE_LABELS[ptype]"
        :name="ptype"
      >
        <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center">
          <el-button type="primary" @click="openPreset(null,ptype)">新增</el-button>
          <el-input
            v-model="presetQ[ptype]"
            placeholder="搜索名称"
            clearable
            style="width:200px"
            prefix-icon="Search"
          />
        </div>

        <el-table
          :data="pagedPresetsMap[ptype]"
          border
          v-loading="presetsLoading"
        >
          <el-table-column label="图标" width="56">
            <template #default="{row}">{{ row.icon }}</template>
          </el-table-column>
          <el-table-column prop="title" label="名称/标题" />
          <el-table-column label="启用" width="80">
            <template #default="{row}">
              <el-switch :model-value="!!row.isActive" @change="v=>togglePreset(row,v)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{row}">
              <el-button text size="small" @click="openPreset(row,ptype)">编辑</el-button>
              <el-button text size="small" @click="copyPreset(row,ptype)">复制</el-button>
              <el-button text size="small" type="danger" @click="delPreset(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top:16px;display:flex;justify-content:flex-end">
          <el-pagination
            v-model:current-page="presetPage[ptype]"
            :page-size="presetPageSize"
            :total="filteredPresetsMap[ptype].length"
            layout="total, prev, pager, next"
            background
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ===== 预设编辑大对话框 ===== -->
    <el-dialog v-model="pdlg" :title="pform.id ? '编辑' : '新增'" width="760px" top="4vh">
      <el-form :model="pform" label-width="90px">
        <el-row :gutter="12">
          <el-col :span="13">
            <el-form-item label="标题"><el-input v-model="pform.title" /></el-form-item>
          </el-col>
          <el-col :span="5">
            <el-form-item label="图标"><el-input v-model="pform.icon" /></el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="颜色">
              <el-input v-model="pform.color" placeholder="#4A7BBA" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item v-if="pform.type==='single'" label="引导词">
          <el-input v-model="pform.cfg.guideText" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item v-if="pform.type==='combo'" label="适用场景">
          <el-input v-model="pform.cfg.for" />
        </el-form-item>

        <el-form-item v-if="['combo','scene','dilemma'].includes(pform.type)" label="卡槽">
          <div
            v-for="(s,i) in pform.cfg.slots"
            :key="i"
            style="display:flex;gap:8px;margin-bottom:8px;align-items:center"
          >
            <el-select v-model="s.catId" style="width:160px">
              <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-input v-model="s.label" placeholder="标签" style="flex:1" />
            <el-input v-model="s.cat" placeholder="卡牌类型名" style="flex:1" />
            <el-button text type="danger" @click="pform.cfg.slots.splice(i,1)">×</el-button>
          </div>
          <el-button text @click="pform.cfg.slots.push({catId:1,label:'',cat:''})">+ 添加卡槽</el-button>
        </el-form-item>

        <el-form-item v-if="['combo','scene'].includes(pform.type)" label="反思问题">
          <el-input v-model="pform.cfg.qsText" type="textarea" :rows="4" placeholder="每行一个问题" />
        </el-form-item>

        <template v-if="pform.type==='dilemma'">
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="核心议题"><el-input v-model="pform.cfg.core" /></el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="推荐卡牌"><el-input v-model="pform.cfg.cards" /></el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="玩法名称"><el-input v-model="pform.cfg.playName" /></el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="关键洞察"><el-input v-model="pform.cfg.insight" /></el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="玩法介绍">
            <el-input v-model="pform.cfg.intro" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="步骤">
            <div
              v-for="(st,i) in pform.cfg.steps"
              :key="i"
              style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:12px"
            >
              <div style="display:flex;align-items:center;margin-bottom:8px">
                <b>步骤 {{ i+1 }}</b>
                <el-button
                  text
                  type="danger"
                  @click="pform.cfg.steps.splice(i,1)"
                  style="margin-left:auto"
                >删除</el-button>
              </div>
              <el-input
                v-model="st.action"
                type="textarea"
                :rows="2"
                placeholder="步骤描述"
                style="margin-bottom:6px"
              />
              <el-input
                v-model="st.guidesText"
                type="textarea"
                :rows="2"
                placeholder="引导词，每行一条"
              />
            </div>
            <el-button text @click="pform.cfg.steps.push({action:'',guidesText:''})">+ 添加步骤</el-button>
          </el-form-item>
        </template>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="排序">
              <el-input-number v-model="pform.sortOrder" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="启用">
              <el-switch v-model="pform.isActive" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="pdlg=false">取消</el-button>
        <el-button type="primary" @click="savePreset">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api/index';

// ===== Tab =====
const tab = ref('categories');

// ===== 牌组管理 =====
const categories = ref([]);
const catDlg = ref(false);
const catForm = ref({ name: '', type: 'image', description: '' });
const catQ = ref('');

const filteredCats = computed(() => {
  if (!catQ.value) return categories.value;
  const q = catQ.value.toLowerCase();
  return categories.value.filter(c => (c.name || '').toLowerCase().includes(q));
});

async function loadCats() {
  try { categories.value = await api.get('/ohcard/categories'); } catch {}
}

async function saveCategory() {
  try {
    await api.post('/ohcard/categories', catForm.value);
    ElMessage.success('已创建');
    catDlg.value = false;
    await loadCats();
    catForm.value = { name: '', type: 'image', description: '' };
  } catch {
    ElMessage.error('保存失败');
  }
}

// ===== 卡片管理 =====
const cards = ref([]);
const cardsLoading = ref(false);
const selCat = ref(null);
const selectedCards = ref([]);
const cardDlg = ref(false);
const cardForm = ref({ image_url: '', word: '' });
const batchWords = ref('');

// 搜索和分页
const cardQ = ref('');
const cardPage = ref(1);
const cardPageSize = 20;

const filteredCards = computed(() => {
  if (!cardQ.value) return cards.value;
  const q = cardQ.value.toLowerCase();
  return cards.value.filter(c => (c.word || '').toLowerCase().includes(q));
});

const pagedCards = computed(() => {
  const start = (cardPage.value - 1) * cardPageSize;
  return filteredCards.value.slice(start, start + cardPageSize);
});

// 搜索词变化时重置页码
watch(cardQ, () => { cardPage.value = 1; });

function onCatChange() {
  cardQ.value = '';
  cardPage.value = 1;
  loadCards2();
}

async function loadCards(cat) {
  selCat.value = cat.id;
  tab.value = 'cards';
  cardQ.value = '';
  cardPage.value = 1;
  await loadCards2();
}

async function loadCards2() {
  if (!selCat.value) return;
  cardsLoading.value = true;
  try {
    cards.value = await api.get('/ohcard/cards', { params: { category_id: selCat.value } });
  } finally {
    cardsLoading.value = false;
  }
}

async function saveCard() {
  const payload = new FormData();
  payload.append('category_id', selCat.value);
  if (batchWords.value.trim()) {
    batchWords.value.split('\n').filter(Boolean).forEach(w => payload.append('words', w.trim()));
    await api.post('/ohcard/cards/batch', payload);
  } else {
    payload.append('word', cardForm.value.word);
    await api.post('/ohcard/cards', payload);
  }
  ElMessage.success('已添加');
  cardDlg.value = false;
  cardForm.value = { image_url: '', word: '' };
  batchWords.value = '';
  await loadCards2();
}

async function delCard(row) {
  try { await api.delete(`/ohcard/cards/${row.id}`); await loadCards2(); } catch { ElMessage.error('删除失败'); }
}

async function batchDel() {
  await ElMessageBox.confirm(`确认删除 ${selectedCards.value.length} 张卡片？`);
  try {
    await api.delete('/ohcard/cards/batch', { data: { ids: selectedCards.value.map(c => c.id) } });
    ElMessage.success('已删除');
    await loadCards2();
  } catch {}
}

// ===== 预设管理 =====
const PTYPE_LABELS = { single: '单卡组合', combo: '跨卡牌组合', scene: '场景选卡', dilemma: '人生困境' };
const PTYPES = ['single', 'combo', 'scene', 'dilemma'];

const presets = ref({});
const presetsLoading = ref(false);
const pdlg = ref(false);
const pform = ref({
  id: null, type: 'combo', title: '', icon: '🔮', color: '#4A7BBA', sortOrder: 0, isActive: 1,
  cfg: { slots: [], steps: [], qsText: '', guideText: '', for: '', core: '', cards: '', playName: '', intro: '', insight: '' }
});

// 每种预设类型独立的搜索词和页码
const presetQ = ref({ single: '', combo: '', scene: '', dilemma: '' });
const presetPage = ref({ single: 1, combo: 1, scene: 1, dilemma: 1 });
const presetPageSize = 10;

const filteredPresetsMap = computed(() => {
  const result = {};
  for (const type of PTYPES) {
    const q = (presetQ.value[type] || '').toLowerCase();
    const list = presets.value[type] || [];
    result[type] = q ? list.filter(p => (p.title || '').toLowerCase().includes(q)) : list;
  }
  return result;
});

const pagedPresetsMap = computed(() => {
  const result = {};
  for (const type of PTYPES) {
    const page = presetPage.value[type];
    const list = filteredPresetsMap.value[type];
    const start = (page - 1) * presetPageSize;
    result[type] = list.slice(start, start + presetPageSize);
  }
  return result;
});

// 搜索词变化时重置对应类型页码
watch(presetQ, (newQ, oldQ) => {
  for (const type of PTYPES) {
    if (newQ[type] !== oldQ[type]) {
      presetPage.value[type] = 1;
    }
  }
}, { deep: true });

async function loadPresets(type) {
  presetsLoading.value = true;
  try {
    const data = await api.get('/ohcard/presets/all', { params: { type } });
    presets.value = { ...presets.value, [type]: data };
  } finally {
    presetsLoading.value = false;
  }
}

watch(() => tab.value, t => {
  if (PTYPE_LABELS[t]) loadPresets(t);
}, { immediate: false });

onMounted(() => { loadCats(); });

function mkCfg(type, src = {}) {
  return {
    slots: (src.slots || []).map(s => ({ ...s })),
    qsText: (src.qs || []).join('\n'),
    guideText: src.guideText || '',
    for: src.for || '',
    core: src.core || '',
    cards: src.cards || '',
    playName: src.playName || '',
    intro: src.intro || '',
    insight: src.insight || '',
    steps: (src.steps || []).map(st => ({ action: st.action || '', guidesText: (st.guides || []).join('\n') }))
  };
}

function openPreset(row, type) {
  pform.value = row
    ? { id: row.id, type, title: row.title, icon: row.icon, color: row.color, sortOrder: row.sortOrder || 0, isActive: row.isActive, cfg: mkCfg(type, row.config || {}) }
    : { id: null, type, title: '', icon: '🔮', color: '#4A7BBA', sortOrder: 0, isActive: 1, cfg: mkCfg(type) };
  pdlg.value = true;
}

function copyPreset(row, type) {
  pform.value = {
    id: null, type, title: row.title + ' (副本)', icon: row.icon, color: row.color,
    sortOrder: row.sortOrder || 0, isActive: 0, cfg: mkCfg(type, row.config || {})
  };
  pdlg.value = true;
}

async function savePreset() {
  const { id, type, title, icon, color, sortOrder, isActive, cfg } = pform.value;
  const config = {
    slots: cfg.slots,
    qs: cfg.qsText.split('\n').filter(Boolean),
    guideText: cfg.guideText,
    for: cfg.for,
    core: cfg.core,
    cards: cfg.cards,
    playName: cfg.playName,
    intro: cfg.intro,
    insight: cfg.insight,
    steps: cfg.steps.map(st => ({ action: st.action, guides: st.guidesText.split('\n').filter(Boolean) }))
  };
  try {
    if (id) await api.put(`/ohcard/presets/${id}`, { type, title, icon, color, sortOrder, isActive, config });
    else await api.post('/ohcard/presets', { type, title, icon, color, sortOrder, isActive, config });
    ElMessage.success('已保存');
    pdlg.value = false;
    await loadPresets(type);
  } catch {
    ElMessage.error('保存失败');
  }
}

async function delPreset(row) {
  await ElMessageBox.confirm(`删除「${row.title}」？`);
  try {
    await api.delete(`/ohcard/presets/${row.id}`);
    await loadPresets(row.type || tab.value);
  } catch {}
}

async function togglePreset(row, v) {
  try {
    await api.put(`/ohcard/presets/${row.id}`, { isActive: v ? 1 : 0 });
    row.isActive = v ? 1 : 0;
  } catch {}
}
</script>
