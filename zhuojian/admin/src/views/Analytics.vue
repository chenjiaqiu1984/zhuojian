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

const stats = ref({ total: 0, byPage: [], byEvent: [], recent: [] });

const uniqueUsers = computed(() => {
  const ids = stats.value.recent?.map(e => e.userId).filter(Boolean);
  return new Set(ids).size;
});

onMounted(async () => {
  stats.value = await api.get('/analytics/stats');
});
</script>
