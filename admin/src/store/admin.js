import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAdminStore = defineStore('admin', () => {
  const token = ref(localStorage.getItem('admin_token') || '');
  const user = ref(JSON.parse(localStorage.getItem('admin_user') || 'null'));

  function setAuth(t, u) {
    token.value = t; user.value = u;
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_user', JSON.stringify(u));
  }
  function logout() {
    token.value = ''; user.value = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }
  return { token, user, setAuth, logout };
});
