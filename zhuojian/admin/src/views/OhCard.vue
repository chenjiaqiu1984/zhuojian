<template>
  <div>
    <el-tabs v-model="tab">
      <el-tab-pane label="牌组管理" name="categories">
        <div style="margin-bottom:16px">
          <el-button type="primary" @click="catDlg=true">新增牌组</el-button>
        </div>
        <el-table :data="categories" border>
          <el-table-column prop="name" label="牌组名称" />
          <el-table-column label="类型" width="100">
            <template #default="{row}"><el-tag>{{row.type==='image'?'图卡':'字卡'}}</el-tag></template>
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

      <el-tab-pane label="卡片管理" name="cards">
        <div style="margin-bottom:16px;display:flex;gap:16px;align-items:center">
          <el-select v-model="selCat" placeholder="选择牌组" style="width:200px" @change="loadCards2">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <el-button type="primary" @click="cardDlg=true" :disabled="!selCat">添加卡片</el-button>
          <el-button type="danger" :disabled="!selectedCards.length" @click="batchDel">批量删除({{selectedCards.length}})</el-button>
        </div>
        <el-table :data="cards" border @selection-change="selectedCards=$event" v-loading="cardsLoading">
          <el-table-column type="selection" width="55" />
          <el-table-column label="图片" width="100">
            <template #default="{row}">
              <el-image v-if="row.image_url" :src="row.image_url" style="width:60px;height:80px" fit="contain" />
            </template>
          </el-table-column>
          <el-table-column prop="word" label="文字" />
          <el-table-column label="操作" width="100">
            <template #default="{row}">
              <el-button text type="danger" @click="delCard(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-dialog v-model="cardDlg" title="添加卡片" width="500px">
          <el-form label-width="80px">
            <el-form-item label="图片URL"><el-input v-model="cardForm.image_url" /></el-form-item>
            <el-form-item label="文字"><el-input v-model="cardForm.word" /></el-form-item>
            <el-form-item label="批量文字"><el-input v-model="batchWords" type="textarea" :rows="4" placeholder="每行一个词，用于批量添加字卡" /></el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="cardDlg=false">取消</el-button>
            <el-button type="primary" @click="saveCard">保存</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api/index';

const tab = ref('categories');
const categories = ref([]);
const catDlg = ref(false);
const catForm = ref({ name: '', type: 'image', description: '' });
const cards = ref([]);
const cardsLoading = ref(false);
const selCat = ref(null);
const selectedCards = ref([]);
const cardDlg = ref(false);
const cardForm = ref({ image_url: '', word: '' });
const batchWords = ref('');

async function loadCats() { try { categories.value = await api.get('/ohcard/categories'); } catch {} }
onMounted(loadCats);

async function saveCategory() {
  try { await api.post('/ohcard/categories', catForm.value); ElMessage.success('已创建'); catDlg.value = false; await loadCats(); catForm.value = { name:'',type:'image',description:'' }; } catch { ElMessage.error('保存失败'); }
}

async function loadCards(cat) { selCat.value = cat.id; tab.value = 'cards'; await loadCards2(); }
async function loadCards2() {
  if (!selCat.value) return;
  cardsLoading.value = true;
  try { cards.value = await api.get('/ohcard/cards', { params: { category_id: selCat.value } }); } finally { cardsLoading.value = false; }
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
  ElMessage.success('已添加'); cardDlg.value = false; cardForm.value = { image_url:'', word:'' }; batchWords.value = ''; await loadCards2();
}

async function delCard(row) { try { await api.delete(`/ohcard/cards/${row.id}`); await loadCards2(); } catch { ElMessage.error('删除失败'); } }

async function batchDel() {
  await ElMessageBox.confirm(`确认删除 ${selectedCards.value.length} 张卡片？`);
  try { await api.delete('/ohcard/cards/batch', { data: { ids: selectedCards.value.map(c=>c.id) } }); ElMessage.success('已删除'); await loadCards2(); } catch {}
}
</script>
