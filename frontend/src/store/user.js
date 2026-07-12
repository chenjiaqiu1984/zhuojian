import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api/index';
import { hashPassword } from '../utils/crypto';

export const useUserStore = defineStore('user', () => {
  const token = ref('');
  const user = ref(null);

  function init() {
    token.value = uni.getStorageSync('token') || '';
    try {
      const u = uni.getStorageSync('user');
      user.value = u ? JSON.parse(u) : null;
    } catch { user.value = null; uni.removeStorageSync('user'); }
  }

  function _save(res) {
    token.value = res.token;
    user.value = res.user;
    uni.setStorageSync('token', res.token);
    uni.setStorageSync('user', JSON.stringify(res.user));
  }

  async function login(username, password, rememberMe = false) { _save(await authApi.login({ username, password: await hashPassword(password), rememberMe })); }
  async function loginPhone(phone, code, rememberMe = false) { _save(await authApi.loginPhone(phone, code, rememberMe)); }
  async function loginWechat(code) { _save(await authApi.loginWechat(code)); }
  async function loginPhoneWechat(code, loginCode) { _save(await authApi.loginPhoneWechat(code, loginCode)); }

  // 完善账号：提交昵称、密码、协议，后端将 status 改为 active 并返回新 token
  async function completeSetup(name, password, termsAccepted, username) {
    const res = await authApi.completeSetup({
      name,
      password: await hashPassword(password),
      termsAccepted,
      ...(username ? { username } : {})
    });
    _save(res);
  }

  function logout() {
    token.value = ''; user.value = null;
    uni.removeStorageSync('token');
    uni.removeStorageSync('user');
  }

  const isLoggedIn = () => !!token.value;
  // 已登录但尚未完善信息（待完善用户）
  const isPending = computed(() => !!user.value && user.value.status === 'pending');

  return { token, user, init, login, loginPhone, loginWechat, loginPhoneWechat, completeSetup, logout, isLoggedIn, isPending };
});
