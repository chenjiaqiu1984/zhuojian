<template>
  <div>
    <el-tabs v-model="tab">
      <!-- 量表管理 -->
      <el-tab-pane label="量表管理" name="scales">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
          <el-button type="primary" @click="openEdit(null)">新增量表</el-button>
          <el-input
            v-model="scaleQ"
            placeholder="搜索量表名称"
            clearable
            style="width:200px"
          />
          <el-select v-model="scaleCat" placeholder="全部类型" clearable style="width:150px">
            <el-option label="诊断" value="diagnostic" />
            <el-option label="人格" value="personality" />
            <el-option label="专业" value="professional" />
          </el-select>
          <span style="color:#999;font-size:13px">共 {{filteredScales.length}} 条</span>
        </div>

        <el-table :data="pagedScales" stripe>
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
          <el-table-column label="状态" width="130">
            <template #default="{row}">
              <el-switch :model-value="row.isActive" @change="v=>toggleScale(row,v)" />
              <el-tag v-if="row.isTesting" type="warning" size="small" style="margin-left:6px">测试中</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{row}">
              <template v-if="editing===row.id">
                <el-button size="small" type="primary" @click="savePrice(row)">保存</el-button>
                <el-button size="small" @click="editing=null">取消</el-button>
              </template>
              <template v-else>
                <el-button size="small" @click="editing=row.id;editPrice=row.price">编辑价格</el-button>
                <el-button size="small" type="primary" @click="openEdit(row)">编辑内容</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <el-pagination
            v-model:current-page="scalePage"
            :page-size="scalePageSize"
            :total="filteredScales.length"
            layout="total, prev, pager, next"
            background
            @current-change="scalePage=$event"
          />
        </div>
      </el-tab-pane>

      <!-- 兑换券管理 -->
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

        <!-- 搜索 & 状态筛选 -->
        <div style="display:flex;align-items:center;gap:12px;margin:16px 0 12px;flex-wrap:wrap">
          <el-input
            v-model="voucherQ"
            placeholder="搜索兑换码"
            clearable
            style="width:200px"
          />
          <el-select v-model="voucherStatus" placeholder="全部状态" style="width:130px">
            <el-option label="全部" value="all" />
            <el-option label="未使用" value="unused" />
            <el-option label="已使用" value="used" />
          </el-select>
          <span style="color:#999;font-size:13px">共 {{filteredVouchers.length}} 条</span>
        </div>

        <el-table :data="pagedVouchers" stripe>
          <el-table-column prop="code" label="兑换码" width="140" />
          <el-table-column label="适用量表">
            <template #default="{row}">{{row.scale?.name||'通用'}}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{row}">
              <el-tag :type="row.usedBy?'info':'success'" size="small">{{row.usedBy?'已使用':'未使用'}}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="过期时间">
            <template #default="{row}">{{row.expiresAt?new Date(row.expiresAt).toLocaleDateString('zh-CN'):'无限期'}}</template>
          </el-table-column>
        </el-table>

        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <el-pagination
            v-model:current-page="voucherPage"
            :page-size="voucherPageSize"
            :total="filteredVouchers.length"
            layout="total, prev, pager, next"
            background
            @current-change="voucherPage=$event"
          />
        </div>
      </el-tab-pane>

      <!-- 数据统计（不变） -->
      <el-tab-pane label="数据统计" name="stats">
        <div style="display:flex;gap:16px;margin-bottom:20px">
          <el-card shadow="never" style="min-width:160px;text-align:center">
            <div style="font-size:32px;font-weight:700;color:#409eff">{{stats.totalCompletions||0}}</div>
            <div style="color:#666;margin-top:4px;font-size:13px">累计完成测评</div>
          </el-card>
        </div>

        <div style="font-weight:600;margin-bottom:8px">各量表统计</div>
        <el-table :data="stats.scaleStats||[]" stripe style="margin-bottom:24px">
          <el-table-column prop="name" label="量表名称" min-width="140" />
          <el-table-column prop="views" label="浏览次数" width="90" />
          <el-table-column prop="starts" label="开始测评" width="90" />
          <el-table-column prop="completions" label="完成次数" width="90" />
          <el-table-column label="开始率" width="90">
            <template #default="{row}">
              {{row.views ? Math.round(row.starts/row.views*100) : 0}}%
            </template>
          </el-table-column>
          <el-table-column label="完成率" width="90">
            <template #default="{row}">
              {{row.starts ? Math.round(row.completions/row.starts*100) : 0}}%
            </template>
          </el-table-column>
        </el-table>

        <div style="display:flex;gap:24px">
          <div style="flex:1">
            <div style="font-weight:600;margin-bottom:8px">近30天每日完成量</div>
            <el-table :data="dailyList" stripe size="small" max-height="300">
              <el-table-column prop="date" label="日期" />
              <el-table-column prop="count" label="完成数" width="90" />
            </el-table>
          </div>
          <div style="flex:1">
            <div style="font-weight:600;margin-bottom:8px">结果等级分布</div>
            <el-table :data="stats.levelCounts||[]" stripe size="small" max-height="300">
              <el-table-column prop="level" label="等级" />
              <el-table-column label="次数" width="90">
                <template #default="{row}">{{row._count.id}}</template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-tab-pane>

      <!-- 推送测评（不变） -->
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

    <!-- 编辑/新增量表对话框 -->
    <el-dialog v-model="editVisible" :title="editForm.id ? '编辑量表内容' : '新增量表'" width="860px" destroy-on-close>
      <el-tabs v-model="editTab">
        <el-tab-pane label="基本信息" name="info">
          <el-form :model="editForm" label-width="100px" style="max-width:560px">
            <el-form-item label="编码" v-if="!editForm.id">
              <el-input v-model="editForm.code" placeholder="如 BDI、PHQ9" />
            </el-form-item>
            <el-form-item label="量表名称"><el-input v-model="editForm.name" /></el-form-item>
            <el-form-item label="描述"><el-input v-model="editForm.description" type="textarea" :rows="3" /></el-form-item>
            <el-form-item label="分类">
              <el-select v-model="editForm.category">
                <el-option label="诊断" value="diagnostic" />
                <el-option label="人格" value="personality" />
                <el-option label="专业" value="professional" />
              </el-select>
            </el-form-item>
            <el-form-item label="适用场景">
              <el-input v-model="editForm.scenariosText" placeholder="用逗号分隔，如：职场压力,大学生,睡眠问题" />
            </el-form-item>
            <el-form-item label="预计时长(分钟)"><el-input-number v-model="editForm.estimatedMinutes" :min="1" /></el-form-item>
            <el-form-item label="收费">
              <el-switch v-model="editForm.isPaid" />
              <el-input-number v-if="editForm.isPaid" v-model="editForm.price" :min="0" style="margin-left:12px" placeholder="分" />
            </el-form-item>
            <el-form-item label="灰度测试">
              <el-switch v-model="editForm.isTesting" active-color="#E6A23C" />
              <span style="margin-left:10px;font-size:13px;color:#E6A23C" v-if="editForm.isTesting">开启后仅管理员可见，普通用户不可见</span>
              <span style="margin-left:10px;font-size:13px;color:#999" v-else>关闭后所有用户可见</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="题目管理" name="questions">
          <div style="margin-bottom:8px">
            <el-button size="small" type="primary" @click="addQuestion">添加题目</el-button>
          </div>
          <el-table :data="editForm.questions" style="width:100%" max-height="400">
            <el-table-column prop="orderNum" label="序号" width="60" />
            <el-table-column label="题目内容" min-width="160">
              <template #default="{row}">
                <el-input v-model="row.content" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="选项 (JSON数组)" min-width="280">
              <template #default="{row}">
                <el-input v-model="row.optionsText" size="small" type="textarea" :rows="2"
                  placeholder='[{"value":0,"label":"..."},...]' />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{$index}">
                <el-button size="small" type="danger" @click="removeQuestion($index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="评分等级" name="levels">
          <div style="margin-bottom:8px">
            <el-button size="small" type="primary" @click="addLevel">添加等级</el-button>
            <span style="margin-left:12px;color:#666;font-size:12px">评分方式：</span>
            <el-select v-model="editForm.scoringMethod" size="small" style="width:140px">
              <el-option label="求和(sum)" value="sum" />
              <el-option label="加权求和" value="weighted_sum" />
            </el-select>
          </div>
          <el-table :data="editForm.levels" style="width:100%">
            <el-table-column label="最低分" width="100">
              <template #default="{row}"><el-input-number v-model="row.min" size="small" style="width:80px" /></template>
            </el-table-column>
            <el-table-column label="最高分" width="100">
              <template #default="{row}"><el-input-number v-model="row.max" size="small" style="width:80px" /></template>
            </el-table-column>
            <el-table-column label="等级名称" width="140">
              <template #default="{row}"><el-input v-model="row.level" size="small" /></template>
            </el-table-column>
            <el-table-column label="结论描述">
              <template #default="{row}"><el-input v-model="row.detail" size="small" type="textarea" :rows="2" /></template>
            </el-table-column>
            <el-table-column label="操作" width="70">
              <template #default="{$index}">
                <el-button size="small" type="danger" @click="editForm.levels.splice($index,1)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" @click="saveScale">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
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

const editVisible = ref(false);
const editTab = ref('info');
const editForm = ref({});

const stats = ref({});
const dailyList = computed(() => {
  if (!stats.value.daily) return [];
  return Object.entries(stats.value.daily)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 30).map(([date, count]) => ({ date, count }));
});

// 量表搜索 & 分页
const scaleQ = ref('');
const scaleCat = ref('');
const scalePage = ref(1);
const scalePageSize = 10;

const filteredScales = computed(() => {
  let list = scales.value;
  if (scaleQ.value.trim()) {
    const q = scaleQ.value.trim().toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(q));
  }
  if (scaleCat.value) {
    list = list.filter(s => s.category === scaleCat.value);
  }
  return list;
});

const pagedScales = computed(() => {
  const start = (scalePage.value - 1) * scalePageSize;
  return filteredScales.value.slice(start, start + scalePageSize);
});

// 过滤条件变化时重置到第1页
watch([scaleQ, scaleCat], () => { scalePage.value = 1; });

// 兑换券搜索 & 分页
const voucherQ = ref('');
const voucherStatus = ref('all');
const voucherPage = ref(1);
const voucherPageSize = 15;

const filteredVouchers = computed(() => {
  let list = vouchers.value;
  if (voucherQ.value.trim()) {
    const q = voucherQ.value.trim().toLowerCase();
    list = list.filter(v => v.code.toLowerCase().includes(q));
  }
  if (voucherStatus.value === 'unused') {
    list = list.filter(v => !v.usedBy);
  } else if (voucherStatus.value === 'used') {
    list = list.filter(v => !!v.usedBy);
  }
  return list;
});

const pagedVouchers = computed(() => {
  const start = (voucherPage.value - 1) * voucherPageSize;
  return filteredVouchers.value.slice(start, start + voucherPageSize);
});

watch([voucherQ, voucherStatus], () => { voucherPage.value = 1; });

// 数据加载
const loadScales = async () => { scales.value = await api.get('/assessment/admin/scales'); };
const loadVouchers = async () => { vouchers.value = await api.get('/assessment/admin/vouchers'); };
const loadStats = async () => { stats.value = await api.get('/analytics/assessment-stats'); };

onMounted(() => { loadScales(); loadVouchers(); loadStats(); });

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

async function openEdit(row) {
  editTab.value = 'info';
  if (!row) {
    editForm.value = {
      id: null, code: '', name: '', description: '', category: 'diagnostic',
      isPaid: false, price: 0, estimatedMinutes: 5, scenariosText: '',
      isTesting: false,
      scoringMethod: 'sum', questions: [], levels: []
    };
  } else {
    const data = await api.get(`/assessment/admin/scales/${row.id}`);
    const rule = JSON.parse(data.scoringRule || '{}');
    editForm.value = {
      id: data.id, name: data.name, description: data.description,
      category: data.category, isPaid: data.isPaid, price: data.price,
      estimatedMinutes: data.estimatedMinutes,
      isTesting: data.isTesting ?? false,
      scenariosText: (() => { try { return JSON.parse(data.scenarios||'[]').join(','); } catch { return ''; } })(),
      scoringMethod: rule.method || 'sum',
      questions: (data.questions || []).map(q => ({
        orderNum: q.orderNum, content: q.content,
        optionsText: typeof q.options === 'string' ? q.options : JSON.stringify(q.options)
      })),
      levels: rule.levels ? rule.levels.map(l => ({ ...l })) : []
    };
  }
  editVisible.value = true;
}

function addQuestion() {
  const next = (editForm.value.questions.length || 0) + 1;
  editForm.value.questions.push({ orderNum: next, content: '', optionsText: '[{"value":0,"label":""},{"value":1,"label":""},{"value":2,"label":""},{"value":3,"label":""}]' });
}

function removeQuestion(idx) {
  editForm.value.questions.splice(idx, 1);
  editForm.value.questions.forEach((q, i) => q.orderNum = i + 1);
}

function addLevel() {
  editForm.value.levels.push({ min: 0, max: 0, level: '', detail: '' });
}

async function saveScale() {
  const f = editForm.value;
  let questions;
  try {
    questions = f.questions.map(q => ({
      orderNum: q.orderNum, content: q.content,
      options: JSON.parse(q.optionsText)
    }));
  } catch {
    return ElMessage.error('题目选项JSON格式有误，请检查');
  }

  const payload = {
    name: f.name, description: f.description, category: f.category,
    isPaid: f.isPaid, price: f.price, estimatedMinutes: f.estimatedMinutes,
    isTesting: f.isTesting ?? false,
    scenarios: JSON.stringify((f.scenariosText||'').split(',').map(s=>s.trim()).filter(Boolean)),
    questions,
    scoringRule: { method: f.scoringMethod, levels: f.levels }
  };

  if (f.id) {
    await api.put(`/assessment/admin/scales/${f.id}`, payload);
  } else {
    payload.code = f.code;
    payload.isActive = true;
    await api.post('/assessment/admin/scales', payload);
  }
  ElMessage.success('保存成功');
  editVisible.value = false;
  loadScales();
}
</script>

<style scoped>
.gen-form { margin-bottom: 0; }
.code-list { background: #f5f7fa; border-radius: 8px; padding: 12px; margin: 12px 0; }
</style>
