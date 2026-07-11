<template>
  <div>
    <!-- 订单号查询面板 -->
    <el-card style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-weight:600;white-space:nowrap">查询支付状态</span>
        <el-input v-model="queryNo" placeholder="输入订单号" clearable style="width:280px" @keyup.enter="doQuery" />
        <el-button type="primary" :loading="querying" @click="doQuery">查询</el-button>
      </div>

      <el-descriptions v-if="queryResult" :column="2" border style="margin-top:16px">
        <el-descriptions-item label="订单号">{{ queryResult.order.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ queryResult.order.payType === 'alipay' ? '支付宝' : '微信支付' }}</el-descriptions-item>
        <el-descriptions-item label="本地状态">
          <el-tag :type="tagType[queryResult.order.status]">{{ label[queryResult.order.status] || queryResult.order.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ (queryResult.order.amount / 100).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="第三方状态" :span="2">
          <template v-if="queryResult.order.payType === 'alipay'">
            {{ queryResult.queryResult?.trade_status || queryResult.queryResult?.sub_msg || '-' }}
          </template>
          <template v-else>
            {{ queryResult.queryResult?.trade_state || queryResult.queryResult?.trade_state_desc || '-' }}
          </template>
        </el-descriptions-item>
        <el-descriptions-item label="第三方交易号" :span="2">
          {{ queryResult.order.payType === 'alipay'
              ? (queryResult.queryResult?.trade_no || '-')
              : (queryResult.queryResult?.transaction_id || '-') }}
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="queryResult && queryResult.order.status === 'paid'" style="margin-top:12px">
        <el-button type="danger" @click="openRefund(queryResult.order)">对此订单退款</el-button>
      </div>
    </el-card>

    <!-- 订单列表 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="margin:0">全部订单</h2>
      <el-input v-model="search" placeholder="搜索订单号 / 用户名 / 咨询师" clearable style="width:300px" />
    </div>

    <el-table :data="filtered" border v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" min-width="180" show-overflow-tooltip />
      <el-table-column label="用户" width="120">
        <template #default="{row}">{{ row.user?.name || row.user?.username || '-' }}</template>
      </el-table-column>
      <el-table-column label="咨询师" width="120">
        <template #default="{row}">{{ row.booking?.consultant?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="预约时间" width="160">
        <template #default="{row}">{{ fmt(row.booking?.slot?.startTime) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{row}">¥{{ (row.amount / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="支付方式" width="100">
        <template #default="{row}">{{ row.payType === 'alipay' ? '支付宝' : '微信支付' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{row}">
          <el-tag :type="tagType[row.status]">{{ label[row.status] || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="支付时间" width="160">
        <template #default="{row}">{{ fmt(row.paidAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{row}">
          <el-button v-if="row.status === 'paid'" text type="primary" size="small" @click="queryFromRow(row)">查状态</el-button>
          <el-button v-if="row.status === 'paid'" text type="danger" size="small" @click="openRefund(row)">退款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 退款弹窗 -->
    <el-dialog v-model="dlg" title="操作退款" width="420px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="订单号">{{ cur?.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ cur?.user?.name || cur?.user?.username || cur?.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ cur ? (cur.amount / 100).toFixed(2) : '' }}</el-descriptions-item>
      </el-descriptions>
      <el-form style="margin-top:20px">
        <el-form-item label="退款比例">
          <el-select v-model="refundRatio" style="width:160px">
            <el-option label="全额退款 (100%)" :value="1" />
            <el-option label="退款 50%" :value="0.5" />
          </el-select>
        </el-form-item>
        <el-form-item label="退款原因">
          <el-input v-model="reason" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="doRefund">确认退款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index';

const list        = ref([]);
const loading     = ref(true);
const search      = ref('');
const dlg         = ref(false);
const submitting  = ref(false);
const cur         = ref(null);
const refundRatio = ref(1);
const reason      = ref('');
const queryNo     = ref('');
const querying    = ref(false);
const queryResult = ref(null);

const label   = { pending: '待支付', paid: '已支付', refunded: '已退款', cancelled: '已取消' };
const tagType = { pending: 'info', paid: 'success', refunded: 'warning', cancelled: 'danger' };

async function load() {
  try { list.value = await api.get('/payment/orders'); }
  finally { loading.value = false; }
}
onMounted(load);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return list.value;
  return list.value.filter(o =>
    o.orderNo?.toLowerCase().includes(q) ||
    (o.user?.name || o.user?.username || '').toLowerCase().includes(q) ||
    (o.booking?.consultant?.name || '').toLowerCase().includes(q)
  );
});

function fmt(t) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function doQuery() {
  const no = queryNo.value.trim();
  if (!no) return ElMessage.warning('请输入订单号');
  querying.value = true;
  queryResult.value = null;
  try {
    queryResult.value = await api.get(`/payment/query/${no}`);
  } catch (e) {
    ElMessage.error(e?.error || '查询失败');
  } finally {
    querying.value = false;
  }
}

function queryFromRow(row) {
  queryNo.value = row.orderNo;
  doQuery();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openRefund(row) {
  cur.value = row;
  refundRatio.value = 1;
  reason.value = '';
  dlg.value = true;
}

async function doRefund() {
  submitting.value = true;
  try {
    await api.post(`/payment/refund/${cur.value.orderNo}`, { refundRatio: refundRatio.value, reason: reason.value || '管理员退款' });
    ElMessage.success('退款成功');
    dlg.value = false;
    queryResult.value = null;
    await load();
  } catch (e) {
    ElMessage.error(e?.error || '退款失败');
  } finally {
    submitting.value = false;
  }
}
</script>
