<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2>🆘 危机事件管理</h2>
      <el-tag type="danger">共 {{ total }} 条未跟进事件</el-tag>
    </div>

    <!-- 筛选栏 -->
    <el-card style="margin-bottom:16px">
      <el-form inline>
        <el-form-item label="风险等级">
          <el-select v-model="filter.level" placeholder="全部" clearable style="width:120px">
            <el-option label="高危" value="high" />
            <el-option label="中危" value="medium" />
          </el-select>
        </el-form-item>
        <el-form-item label="跟进状态">
          <el-select v-model="filter.followed" placeholder="全部" clearable style="width:120px">
            <el-option label="未跟进" value="false" />
            <el-option label="已跟进" value="true" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 事件列表 -->
    <el-table :data="list" border v-loading="loading" row-key="id">
      <el-table-column label="时间" width="160">
        <template #default="{row}">{{ fmt(row.createdAt) }}</template>
      </el-table-column>

      <el-table-column label="风险" width="80">
        <template #default="{row}">
          <el-tag :type="row.level==='high' ? 'danger' : 'warning'" size="small">
            {{ row.level === 'high' ? '高危' : '中危' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="来源" width="140">
        <template #default="{row}">{{ sourceLabel(row.source) }}</template>
      </el-table-column>

      <el-table-column label="触发词" width="200">
        <template #default="{row}">
          <el-tag v-for="w in row.matched" :key="w" type="danger" size="small" style="margin:2px">{{ w }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="用户">
        <template #default="{row}">
          <span v-if="row.user">
            {{ row.user.name || row.user.username }}
            <span v-if="row.user.phone" style="color:#999;font-size:12px">（{{ row.user.phone }}）</span>
          </span>
          <span v-else style="color:#ccc">未登录</span>
        </template>
      </el-table-column>

      <el-table-column label="内容摘要" show-overflow-tooltip>
        <template #default="{row}">{{ row.snippet }}</template>
      </el-table-column>

      <el-table-column label="状态" width="100">
        <template #default="{row}">
          <el-tag v-if="row.followed" type="success" size="small">已跟进</el-tag>
          <el-tag v-else type="info" size="small">待跟进</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{row}">
          <el-button v-if="!row.followed" text type="primary" @click="openFollow(row)">标记跟进</el-button>
          <el-button v-else text type="success" disabled>已完成</el-button>
          <el-popconfirm title="确认删除该记录？" @confirm="del(row)">
            <template #reference>
              <el-button text type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      style="margin-top:16px;justify-content:flex-end;display:flex"
      v-model:current-page="page"
      :page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="load"
    />

    <!-- 跟进备注弹窗 -->
    <el-dialog v-model="followDlg" title="标记跟进" width="420px">
      <el-form label-width="80px">
        <el-form-item label="用户">
          <span>{{ followRow?.user?.name || followRow?.user?.username || '未登录用户' }}</span>
        </el-form-item>
        <el-form-item label="触发词">
          <el-tag v-for="w in followRow?.matched" :key="w" type="danger" size="small" style="margin:2px">{{ w }}</el-tag>
        </el-form-item>
        <el-form-item label="跟进备注">
          <el-input v-model="followNote" type="textarea" :rows="3" placeholder="记录跟进情况（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followDlg=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="doFollow">确认已跟进</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index';

const list = ref([]);
const loading = ref(false);
const saving = ref(false);
const total = ref(0);
const page = ref(1);
const pageSize = 20;

const filter = ref({ level: '', followed: 'false' });

const followDlg = ref(false);
const followRow = ref(null);
const followNote = ref('');

const SOURCE_MAP = {
  mood: '情绪记录', cbt: 'CBT练习', dream: '梦境分析',
  iceberg: '冰山模型', rule: '规则修改',
};
function sourceLabel(s) {
  if (!s) return s;
  if (s.startsWith('assessment:')) return `测评：${s.slice(11)}`;
  return SOURCE_MAP[s] || s;
}

function fmt(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
}

async function load() {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: page.value,
      pageSize,
      ...(filter.value.level   ? { level:   filter.value.level }   : {}),
      ...(filter.value.followed !== '' ? { followed: filter.value.followed } : {}),
    });
    const res = await api.get(`/crisis/events?${params}`);
    list.value = res.data;
    total.value = res.total;
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
}

function resetFilter() { filter.value = { level: '', followed: 'false' }; page.value = 1; load(); }

onMounted(load);

function openFollow(row) { followRow.value = row; followNote.value = ''; followDlg.value = true; }

async function doFollow() {
  saving.value = true;
  try {
    await api.put(`/crisis/events/${followRow.value.id}/follow`, { note: followNote.value });
    ElMessage.success('已标记跟进');
    followDlg.value = false;
    load();
  } catch { ElMessage.error('操作失败'); }
  finally { saving.value = false; }
}

async function del(row) {
  try {
    await api.delete(`/crisis/events/${row.id}`);
    ElMessage.success('已删除');
    load();
  } catch { ElMessage.error('删除失败'); }
}
</script>
