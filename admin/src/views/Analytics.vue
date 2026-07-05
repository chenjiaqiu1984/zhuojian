<template>
  <div>
    <el-row :gutter="16" style="margin-bottom:24px">
      <el-col :span="6">
        <el-card><div style="text-align:center"><div style="font-size:32px;font-weight:bold;color:#409EFF">{{stats.total}}</div><div style="color:#999;margin-top:4px">总事件数</div></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div style="text-align:center"><div style="font-size:32px;font-weight:bold;color:#67C23A">{{stats.byPage?.length}}</div><div style="color:#999;margin-top:4px">覆盖页面</div></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div style="text-align:center"><div style="font-size:32px;font-weight:bold;color:#E6A23C">{{stats.byEvent?.length}}</div><div style="color:#999;margin-top:4px">事件类型</div></div></el-card>
      </el-col>
      <el-col :span="6">
        <el-card><div style="text-align:center"><div style="font-size:32px;font-weight:bold;color:#F56C6C">{{uniqueUsers}}</div><div style="color:#999;margin-top:4px">活跃用户</div></div></el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom:24px">
      <el-col :span="12">
        <el-card header="页面访问量">
          <el-table :data="stats.byPage" size="small">
            <el-table-column prop="page" label="页面" />
            <el-table-column prop="_count.id" label="次数" width="80" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="事件分布">
          <el-table :data="stats.byEvent" size="small">
            <el-table-column prop="event" label="事件" />
            <el-table-column prop="_count.id" label="次数" width="80" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card header="OH卡功能使用量" style="margin-bottom:24px">
      <el-table :data="ohcardRanks" size="small">
        <el-table-column prop="cat" label="类型" width="120">
          <template #default="{ row }">{{ CAT_LABEL[row.cat] || row.cat }}</template>
        </el-table-column>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="count" label="使用次数" width="100" sortable />
      </el-table>
    </el-card>

    <el-card header="咨询工具使用量" style="margin-bottom:24px">
      <el-table :data="stats.homeworkCounts" size="small">
        <el-table-column prop="page" label="功能">
          <template #default="{ row }">{{ HOMEWORK_LABELS[row.page] || row.page }}</template>
        </el-table-column>
        <el-table-column prop="count" label="保存次数" width="100" />
      </el-table>
    </el-card>

    <el-card header="最近事件">
      <el-table :data="stats.recent" size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="event" label="事件" width="120" />
        <el-table-column prop="page" label="页面" />
        <el-table-column prop="data" label="数据" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api/index';

const stats = ref({ total: 0, byPage: [], byEvent: [], recent: [], homeworkCounts: [] });
const ohcardRanks = ref([]);

const CAT_LABEL = { single:'单卡组合', combo:'跨卡牌组合', scene:'场景选卡', dilemma:'人生困境' };

const HOMEWORK_LABELS = { mood: '情绪日记', cbt: '认知记录表', dream: '梦的工作', iceberg: '冰山模型', rule: '规条转换' };

const uniqueUsers = computed(() => {
  const ids = stats.value.recent?.map(e => e.userId).filter(Boolean);
  return new Set(ids).size;
});

onMounted(async () => {
  [stats.value, ohcardRanks.value] = await Promise.all([
    api.get('/analytics/stats'),
    api.get('/analytics/ohcard-ranks')
  ]);
});
</script>
