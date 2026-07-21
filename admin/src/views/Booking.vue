<template>
  <div>
    <el-tabs v-model="activeTab" @tab-change="onTabChange">

      <!-- ── 咨询预约 ── -->
      <el-tab-pane label="咨询预约" name="consult">
        <el-card style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <el-input v-model="c.q" placeholder="来访者 / 咨询师 / 手机" clearable style="width:220px"
              @keyup.enter="cSearch" @clear="cSearch" />
            <el-select v-model="c.status" placeholder="全部状态" clearable style="width:130px" @change="cSearch">
              <el-option label="待支付"  value="pending_payment" />
              <el-option label="待确认"  value="pending" />
              <el-option label="已确认"  value="confirmed" />
              <el-option label="已完成"  value="completed" />
              <el-option label="已取消"  value="cancelled" />
            </el-select>
            <el-date-picker v-model="c.dateRange" type="daterange" range-separator="至"
              start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD"
              style="width:240px" @change="cSearch" @clear="cSearch" />
            <el-button type="primary" @click="cSearch">搜索</el-button>
            <el-button @click="cReset">重置</el-button>
          </div>
        </el-card>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-weight:600;font-size:15px">共 {{ c.total }} 条</span>
        </div>

        <el-table :data="c.list" border v-loading="c.loading">
          <el-table-column label="来访者" width="110">
            <template #default="{row}">{{ row.user_name || row.user?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="手机" width="130">
            <template #default="{row}">{{ row.user_phone || row.user?.phone || '-' }}</template>
          </el-table-column>
          <el-table-column label="咨询师" width="110">
            <template #default="{row}">{{ row.consultant_name || row.consultant?.name || '-' }}</template>
          </el-table-column>
          <el-table-column label="预约时间" width="160">
            <template #default="{row}">{{ fmt(row.start_time || row.slot?.startTime) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{row}">
              <el-tag :type="cTagType[row.status]">{{ cLabel[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="notes" label="备注" show-overflow-tooltip />
          <el-table-column label="操作时间" width="155">
            <template #default="{row}">{{ fmt(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{row}">
              <template v-if="row.status === 'pending'">
                <el-button text type="success" size="small" @click="updateStatus(row, 'confirmed')">确认</el-button>
                <el-button text type="danger"  size="small" @click="openCancel(row)">取消</el-button>
              </template>
              <template v-if="row.status === 'confirmed'">
                <el-button text size="small" @click="updateStatus(row, 'completed')">完成</el-button>
                <el-button text type="danger" size="small" @click="openCancel(row)">取消</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <el-pagination v-model:current-page="c.page" v-model:page-size="c.pageSize"
            :total="c.total" :page-sizes="[20,50,100]"
            layout="total, sizes, prev, pager, next, jumper" background
            @current-change="loadConsult" @size-change="cSearch" />
        </div>
      </el-tab-pane>

      <!-- ── 活动订单 ── -->
      <el-tab-pane label="活动订单" name="activity">
        <el-card style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <el-input v-model="a.q" placeholder="用户名 / 手机 / 订单号" clearable style="width:220px"
              @keyup.enter="aSearch" @clear="aSearch" />
            <el-input v-model="a.activity" placeholder="活动名" clearable style="width:180px"
              @keyup.enter="aSearch" @clear="aSearch" />
            <el-select v-model="a.status" placeholder="全部状态" clearable style="width:120px" @change="aSearch">
              <el-option label="待支付" value="pending" />
              <el-option label="已支付" value="paid" />
              <el-option label="已取消" value="cancelled" />
              <el-option label="已退款" value="refunded" />
            </el-select>
            <el-button type="primary" @click="aSearch">搜索</el-button>
            <el-button @click="aReset">重置</el-button>
          </div>
        </el-card>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-weight:600;font-size:15px">共 {{ a.total }} 条</span>
        </div>

        <el-table :data="a.list" border v-loading="a.loading">
          <el-table-column label="活动名称" min-width="160" show-overflow-tooltip>
            <template #default="{row}">{{ row.news?.title || '-' }}</template>
          </el-table-column>
          <el-table-column label="用户" width="110">
            <template #default="{row}">{{ row.user?.name || row.user?.username || '-' }}</template>
          </el-table-column>
          <el-table-column label="手机" width="130">
            <template #default="{row}">{{ row.user?.phone || '-' }}</template>
          </el-table-column>
          <el-table-column label="订单号" width="190" show-overflow-tooltip>
            <template #default="{row}">{{ row.orderNo }}</template>
          </el-table-column>
          <el-table-column label="金额" width="90">
            <template #default="{row}">¥{{ (row.amount / 100).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="支付方式" width="90">
            <template #default="{row}">{{ row.payType === 'alipay' ? '支付宝' : '微信' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{row}">
              <el-tag :type="aTagType[row.status]">{{ aLabel[row.status] || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="支付时间" width="155">
            <template #default="{row}">{{ fmt(row.paidAt) }}</template>
          </el-table-column>
          <el-table-column label="下单时间" width="155">
            <template #default="{row}">{{ fmt(row.createdAt) }}</template>
          </el-table-column>
        </el-table>

        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <el-pagination v-model:current-page="a.page" v-model:page-size="a.pageSize"
            :total="a.total" :page-sizes="[20,50,100]"
            layout="total, sizes, prev, pager, next, jumper" background
            @current-change="loadActivity" @size-change="aSearch" />
        </div>
      </el-tab-pane>

    </el-tabs>

    <!-- 取消预约弹窗 -->
    <el-dialog v-model="cancelDlg" title="取消预约" width="400px">
      <el-input v-model="cancelMsg" placeholder="取消原因（可选）" />
      <template #footer>
        <el-button @click="cancelDlg = false">关闭</el-button>
        <el-button type="primary" @click="doCancel">确认取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index';

const activeTab = ref('consult');

// ── 咨询预约状态 ──────────────────────────────────────────────────
const c = reactive({
  list: [], loading: false, total: 0, page: 1, pageSize: 20,
  q: '', status: '', dateRange: null,
});

const cLabel   = { pending_payment: '待支付', pending: '待确认', confirmed: '已确认', completed: '已完成', cancelled: '已取消' };
const cTagType = { pending_payment: 'danger', pending: 'warning', confirmed: 'success', completed: '', cancelled: 'info' };

async function loadConsult() {
  c.loading = true;
  try {
    const params = { page: c.page, pageSize: c.pageSize };
    if (c.q)               params.q         = c.q.trim();
    if (c.status)          params.status     = c.status;
    if (c.dateRange?.[0])  params.startDate  = c.dateRange[0];
    if (c.dateRange?.[1])  params.endDate    = c.dateRange[1];
    const { total, items } = await api.get('/booking/admin', { params });
    c.total = total;
    c.list  = items;
  } catch {
    ElMessage.error('加载预约失败');
  } finally {
    c.loading = false;
  }
}

function cSearch() { c.page = 1; loadConsult(); }
function cReset()  { c.q = ''; c.status = ''; c.dateRange = null; cSearch(); }

// ── 活动订单状态 ──────────────────────────────────────────────────
const a = reactive({
  list: [], loading: false, total: 0, page: 1, pageSize: 20,
  q: '', status: '', activity: '',
});

const aLabel   = { pending: '待支付', paid: '已支付', cancelled: '已取消', refunded: '已退款' };
const aTagType = { pending: 'info', paid: 'success', cancelled: 'danger', refunded: 'warning' };

async function loadActivity() {
  a.loading = true;
  try {
    const params = { page: a.page, pageSize: a.pageSize, type: 'activity' };
    if (a.q)        params.q        = a.q.trim();
    if (a.status)   params.status   = a.status;
    if (a.activity) params.activity = a.activity.trim();
    const res = await api.get('/payment/admin/orders', { params });
    a.total = res.total ?? 0;
    a.list  = res.items ?? [];
  } catch {
    ElMessage.error('加载活动订单失败');
  } finally {
    a.loading = false;
  }
}

function aSearch() { a.page = 1; loadActivity(); }
function aReset()  { a.q = ''; a.status = ''; a.activity = ''; aSearch(); }

// ── Tab 切换时懒加载 ──────────────────────────────────────────────
function onTabChange(tab) {
  if (tab === 'consult'  && !c.list.length) loadConsult();
  if (tab === 'activity' && !a.list.length) loadActivity();
}

onMounted(loadConsult);

// ── 取消预约 ──────────────────────────────────────────────────────
const cancelDlg = ref(false);
const cancelMsg = ref('');
const curRow    = ref(null);

function openCancel(row) { curRow.value = row; cancelMsg.value = ''; cancelDlg.value = true; }

async function doCancel() {
  try {
    await api.put(`/booking/${curRow.value.id}/status`, { status: 'cancelled', message: cancelMsg.value });
    ElMessage.success('已取消');
    cancelDlg.value = false;
    loadConsult();
  } catch {
    ElMessage.error('取消失败');
  }
}

async function updateStatus(row, status) {
  try {
    await api.put(`/booking/${row.id}/status`, { status });
    ElMessage.success('操作成功');
    loadConsult();
  } catch {
    ElMessage.error('操作失败');
  }
}

function fmt(t) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
</script>
