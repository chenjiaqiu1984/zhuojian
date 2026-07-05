import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi } from '../api/index';

export const useUserStore = defineStore('user', () => {
  const token = ref('');
  const user = ref(null);

  function init() {
    token.value = uni.getStorageSync('token') || '';
    const u = uni.getStorageSync('user');
    user.value = u ? JSON.parse(u) : null;
  }

  function _save(res) {
    token.value = res.token;
    user.value = res.user;
    uni.setStorageSync('token', res.token);
    uni.setStorageSync('user', JSON.stringify(res.user));
  }

  async function login(username, password) { _save(await authApi.login({ username, password })); }
  async function loginPhone(phone, code, termsAccepted) { _save(await authApi.loginPhone(phone, code, termsAccepted)); }
  async function loginEmail(email, code, termsAccepted) { _save(await authApi.loginEmail(email, code, termsAccepted)); }
  async function loginWechat(code) { _save(await authApi.loginWechat(code)); }

  function logout() {
    token.value = ''; user.value = null;
    uni.removeStorageSync('token');
    uni.removeStorageSync('user');
  }

  const isLoggedIn = () => !!token.value;
  return { token, user, init, login, loginPhone, loginEmail, loginWechat, logout, isLoggedIn };
});
