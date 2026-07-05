<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <h2>卓见心理管理后台</h2>
      <el-form @submit.prevent="login">
        <el-form-item><el-input v-model="form.username" placeholder="用户名" prefix-icon="User" /></el-form-item>
        <el-form-item><el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" show-password /></el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" style="width:100%">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api/index';
import { useAdminStore } from '../store/admin';

const store = useAdminStore();
const router = useRouter();
const loading = ref(false);
const form = ref({ username: '', password: '' });

async function login() {
  loading.value = true;
  try {
    const res = await api.post('/auth/login', form.value);
    if (!['admin', 'consultant'].includes(res.user.role)) return ElMessage.error('无管理权限');
    store.setAuth(res.token, res.user);
    router.push('/');
  } catch (e) {
    ElMessage.error(e.error || '登录失败');
  } finally { loading.value = false; }
}
</script>

<style scoped>
.login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#4A7BBA,#7B68EE); }
.login-card { width: 400px; padding: 20px; }
h2 { text-align: center; margin-bottom: 24px; color: #333; }
</style>
