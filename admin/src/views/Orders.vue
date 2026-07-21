<template>
  <div>
    <!-- 查询支付状态面板 -->
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

    <!-- 筛选栏 -->
    <el-card style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <el-input
          v-model="filters.q"
          placeholder="订单号 / 用户名 / 手机"
          clearable
          style="width:200px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:120px" @change="onSearch">
          <el-option label="待支付" value="pending" />
          <el-option label="已支付" value="paid" />
          <el-option label="已取消" value="cancelled" />
          <el-option label="已退款" value="refunded" />
        </el-select>
        <el-select v-model="filters.type" placeholder="全部类别" clearable style="width:120px" @change="onSearch">
          <el-option label="咨询预约" value="consult" />
          <el-option label="活动报名" value="activity" />
        </el-select>
        <el-input
          v-model="filters.consultant"
          placeholder="咨询师名"
          clearable
          style="width:140px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-input
          v-model="filters.activity"
          placeholder="活动名"
          clearable
          style="width:160px"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:240px"
          @change="onSearch"
          @clear="onSearch"
        />
        <el-button type="primary" @click="onSearch">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </el-card>

    <!-- 订单列表 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2 style="margin:0">全部订单</h2>
      <span style="color:#909399;font-size:13px">共 {{ total }} 条</span>
    </div>

    <el-table :data="list" border v-loading="loading" row-key="id">
      <el-table-column prop="orderNo" label="订单号" min-width="180" show-overflow-tooltip />
      <el-table-column label="类别" width="100">
        <template #default="{row}">
          <el-tag :type="row.newsId ? 'warning' : 'primary'" size="small">
            {{ row.newsId ? '活动报名' : '咨询预约' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="用户" width="110">
        <template #default="{row}">{{ row.user?.name || row.user?.username || '-' }}</template>
      </el-table-column>
      <el-table-column label="手机" width="130">
        <template #default="{row}">{{ row.user?.phone || '-' }}</template>
      </el-table-column>
      <el-table-column label="咨询师 / 活动" min-width="140" show-overflow-tooltip>
        <template #default="{row}">
          {{ row.news?.title || row.booking?.consultant?.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="预约时间" width="155">
        <template #default="{row}">{{ fmt(row.booking?.slot?.startTime) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="90">
        <template #default="{row}">¥{{ (row.amount / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="支付方式" width="90">
        <template #default="{row}">{{ row.payType === 'alipay' ? '支付宝' : '微信' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{row}">
          <el-tag :type="tagType[row.status]">{{ label[row.status] || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="支付时间" width="155">
        <template #default="{row}">{{ fmt(row.paidAt) }}</template>
      </el-table-column>
      <el-table-column label="下单时间" width="155">
        <template #default="{row}">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{row}">
          <el-button v-if="row.status === 'paid'" text type="primary" size="small" @click="queryFromRow(row)">查状态</el-button>
          <el-button v-if="row.status === 'paid'" text type="danger" size="small" @click="openRefund(row)">退款</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="load"
        @size-change="onSizeChange"
      />
    </div>

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
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api/index';

const list     = ref([]);
const loading  = ref(false);
const total    = ref(0);
const page     = ref(1);
const pageSize = ref(20);

const filters = reactive({
  q:          '',
  status:     '',
  type:       '',
  consultant: '',
  activity:   '',
  dateRange:  null,
});

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
  loading.value = true;
  try {
    const params = { page: page.value, pageSize: pageSize.value };
    if (filters.q)              params.q          = filters.q.trim();
    if (filters.status)         params.status      = filters.status;
    if (filters.type)           params.type        = filters.type;
    if (filters.consultant)     params.consultant  = filters.consultant.trim();
    if (filters.activity)       params.activity    = filters.activity.trim();
    if (filters.dateRange?.[0]) params.startDate   = filters.dateRange[0];
    if (filters.dateRange?.[1]) params.endDate     = filters.dateRange[1];

    const res = await api.get('/payment/admin/orders', { params });
    list.value  = res.items ?? [];
    total.value = res.total ?? 0;
  } catch (e) {
    ElMessage.error(e?.error || '加载订单失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function onSearch() { page.value = 1; load(); }
function onSizeChange() { page.value = 1; load(); }

function resetFilters() {
  filters.q          = '';
  filters.status     = '';
  filters.type       = '';
  filters.consultant = '';
  filters.activity   = '';
  filters.dateRange  = null;
  onSearch();
}

function fmt(t) {
  if (!t) return '-';
  return new Date(t).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

async function doQuery() {
  const no = queryNo.value.trim();
  if (!no) return ElMessage.warning('请输入订单号');
  querying.value    = true;
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
  cur.value         = row;
  refundRatio.value = 1;
  reason.value      = '';
  dlg.value         = true;
}

async function doRefund() {
  submitting.value = true;
  try {
    await api.post(`/payment/refund/${cur.value.orderNo}`, {
      refundRatio: refundRatio.value,
      reason:      reason.value || '管理员退款',
    });
    ElMessage.success('退款成功');
    dlg.value         = false;
    queryResult.value = null;
    await load();
  } catch (e) {
    ElMessage.error(e?.error || '退款失败');
  } finally {
    submitting.value = false;
  }
}
</script>
