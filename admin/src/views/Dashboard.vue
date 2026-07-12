<template>
  <div>
    <h2>概览</h2>
    <el-row :gutter="20" style="margin-top:24px">
      <el-col :span="6" v-for="s in stats" :key="s.label">
        <el-card shadow="never">
          <div style="display:flex;align-items:center;gap:16px">
            <el-icon :size="40" :color="s.color"><component :is="s.icon" /></el-icon>
            <div>
              <div style="font-size:28px;font-weight:bold;color:#333">{{s.value}}</div>
              <div style="color:#999">{{s.label}}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api/index';

const stats = ref([
  { label: '咨询师', icon: 'Avatar', color: '#4A7BBA', value: 0 },
  { label: '新闻活动', icon: 'Promotion', color: '#7B68EE', value: 0 },
  { label: '预约总数', icon: 'Calendar', color: '#52C41A', value: 0 },
  { label: '心理图卡', icon: 'Grid', color: '#FF6B6B', value: 0 },
]);

onMounted(async () => {
  try {
    const [cs, ns, bs, cards] = await Promise.all([
      api.get('/consultants'),
      api.get('/news'),
      api.get('/booking'),
      api.get('/ohcard/cards')
    ]);
    stats.value[0].value = cs.total;
    stats.value[1].value = ns.total;
    stats.value[2].value = bs.length ?? bs.total ?? 0;
    stats.value[3].value = cards.length ?? cards.total ?? 0;
  } catch {}
});
</script>
