<template>
  <el-container style="height:100vh">
    <el-aside width="220px" style="background:#001529">
      <div class="logo">卓见心理</div>
      <el-menu router :default-active="$route.path" background-color="#001529" text-color="#aaa" active-text-color="#fff">
        <el-menu-item index="/dashboard"><el-icon><Odometer /></el-icon>概览</el-menu-item>
        <template v-if="['admin','super_admin'].includes(store.user?.role)">
          <el-menu-item index="/about"><el-icon><InfoFilled /></el-icon>关于我们</el-menu-item>
          <el-menu-item index="/news"><el-icon><Promotion /></el-icon>新闻活动</el-menu-item>
          <el-menu-item index="/learning"><el-icon><Reading /></el-icon>学习报名</el-menu-item>
          <el-menu-item index="/ohcard"><el-icon><Grid /></el-icon>图卡管理</el-menu-item>
          <el-menu-item index="/assessment"><el-icon><DataAnalysis /></el-icon>测评管理</el-menu-item>
          <el-menu-item index="/analytics"><el-icon><TrendCharts /></el-icon>埋点统计</el-menu-item>
          <el-menu-item index="/crisis"><el-icon><Warning /></el-icon>危机事件</el-menu-item>
          <el-menu-item index="/treehole"><el-icon><ChatDotRound /></el-icon>树洞管理</el-menu-item>
          <el-menu-item index="/terms"><el-icon><Document /></el-icon>协议管理</el-menu-item>
          <el-menu-item index="/users"><el-icon><User /></el-icon>用户管理</el-menu-item>
        </template>
        <el-menu-item index="/consultants"><el-icon><Avatar /></el-icon>咨询师</el-menu-item>
        <el-menu-item index="/booking"><el-icon><Calendar /></el-icon>预约管理</el-menu-item>
        <el-menu-item index="/orders"><el-icon><List /></el-icon>订单管理</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="background:#fff;display:flex;align-items:center;justify-content:flex-end;border-bottom:1px solid #eee">
        <span style="margin-right:16px;color:#666">{{store.user?.name || store.user?.username}}</span>
        <el-button text @click="logout">退出</el-button>
      </el-header>
      <el-main style="background:#f5f7fa">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useAdminStore } from '../store/admin';
import { useRouter } from 'vue-router';

const store = useAdminStore();
const router = useRouter();
function logout() { store.logout(); router.push('/login'); }
</script>

<style scoped>
.logo { color: #fff; font-size: 18px; font-weight: bold; padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,.1); }
</style>
