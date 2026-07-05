<template>
  <div>
    <el-tabs v-model="tab">
      <el-tab-pane label="量表管理" name="scales">
        <el-table :data="scales" stripe>
          <el-table-column prop="name" label="量表名称" />
          <el-table-column prop="category" label="类型" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="row.category==='professional'?'danger':row.category==='personality'?'warning':''">
                {{catMap[row.category]||row.category}}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="totalQuestions" label="题数" width="80" />
          <el-table-column prop="price" label="价格(分)" width="100">
            <template #default="{row}">
              <el-input-number v-if="editing===row.id" v-model="editPrice" :min="0" size="small" style="width:100px" />
              <span v-else>{{row.price}}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{row}">
              <el-switch :model-value="row.isActive" @change="v=>toggleScale(row,v)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{row}">
              <template v-if="editing===row.id">
                <el-button size="small" type="primary" @click="savePrice(row)">保存</el-button>
                <el-button size="small" @click="editing=null">取消</el-button>
              </template>
              <el-button v-else size="small" @click="editing=row.id;editPrice=row.price">编辑价格</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="兑换券管理" name="vouchers">
        <el-form inline class="gen-form">
          <el-form-item label="适用量表">
            <el-select v-model="genForm.scaleId" placeholder="通用（不限量表）" clearable style="width:180px">
              <el-option v-for="s in scales" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="数量">
            <el-input-number v-model="genForm.count" :min="1" :max="100" />
          </el-form-item>
          <el-form-item label="过期时间">
            <el-date-picker v-model="genForm.expiresAt" type="date" placeholder="不限" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="genVouchers">生成</el-button>
          </el-form-item>
        </el-form>

        <div v-if="lastCodes.length" class="code-list">
          <p>生成成功：</p>
          <el-tag v-for="c in lastCodes" :key="c" style="margin:4px">{{c}}</el-tag>
        </div>

        <el-table :data="vouchers" stripe style="margin-top:16px">
          <el-table-column prop="code" label="兑换码" width="120" />
          <el-table-column label="适用量表">
            <template #default="{row}">{{row.scale?.name||'通用'}}</template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{row}">
              <el-tag :type="row.usedBy?'info':'success'" size="small">{{row.usedBy?'已使用':'未使用'}}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="过期时间">
            <template #default="{row}">{{row.expiresAt?new Date(row.expiresAt).toLocaleDateString('zh-CN'):'无限期'}}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="推送测评" name="push">
        <el-form inline>
          <el-form-item label="手机号查找用户">
            <el-input v-model="pushForm.phone" placeholder="输入用户手机号" style="width:160px" />
            <el-button @click="searchUser" style="margin-left:8px">查找</el-button>
          </el-form-item>
        </el-form>
        <div v-if="pushUser" style="margin:12px 0;padding:12px;background:#f5f7fa;border-radius:8px">
          用户：<strong>{{pushUser.name || '(未设置姓名)'}}</strong>  手机：{{pushUser.phone}}
        </div>
        <div v-if="pushUser">
          <el-form inline>
            <el-form-item label="推送量表">
              <el-select v-model="pushForm.scaleId" placeholder="通用（全部量表）" clearable style="width:200px">
                <el-option v-for="s in scales" :key="s.id" :label="s.name" :value="s.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="有效期">
              <el-date-picker v-model="pushForm.expiresAt" type="date" placeholder="不限" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="doPush">推送给该用户</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index.js';

const tab = ref('scales');
const scales = ref([]);
const vouchers = ref([]);
const editing = ref(null);
const editPrice = ref(0);
const lastCodes = ref([]);
const genForm = ref({ scaleId: null, count: 5, expiresAt: null });
const catMap = { diagnostic: '诊断', personality: '人格', professional: '专业' };
const pushForm = ref({ phone: '', scaleId: null, expiresAt: null });
const pushUser = ref(null);

const loadScales = async () => { scales.value = await api.get('/assessment/admin/scales'); };
const loadVouchers = async () => { vouchers.value = await api.get('/assessment/admin/vouchers'); };

onMounted(() => { loadScales(); loadVouchers(); });

async function toggleScale(row, val) {
  await api.patch(`/assessment/admin/scales/${row.id}`, { isActive: val });
  row.isActive = val;
}

async function savePrice(row) {
  await api.patch(`/assessment/admin/scales/${row.id}`, { price: editPrice.value });
  row.price = editPrice.value;
  editing.value = null;
}

async function genVouchers() {
  const res = await api.post('/assessment/admin/vouchers', {
    count: genForm.value.count,
    scaleId: genForm.value.scaleId || undefined,
    expiresAt: genForm.value.expiresAt || undefined
  });
  lastCodes.value = res.codes;
  ElMessage.success(`已生成 ${res.created} 张兑换券`);
  loadVouchers();
}

async function searchUser() {
  if (!pushForm.value.phone) return;
  const u = await api.get('/assessment/push-search', { params: { phone: pushForm.value.phone } });
  pushUser.value = u;
  if (!u) ElMessage.warning('未找到该手机号的用户');
}

async function doPush() {
  if (!pushUser.value) return;
  await api.post('/assessment/push', {
    targetUserId: pushUser.value.id,
    scaleId: pushForm.value.scaleId || undefined,
    expiresAt: pushForm.value.expiresAt || undefined
  });
  ElMessage.success('推送成功，用户下次打开测评页即可看到');
  pushUser.value = null;
  pushForm.value = { phone: '', scaleId: null, expiresAt: null };
}
</script>

<style scoped>
.gen-form { margin-bottom: 0; }
.code-list { background: #f5f7fa; border-radius: 8px; padding: 12px; margin: 12px 0; }
</style>
