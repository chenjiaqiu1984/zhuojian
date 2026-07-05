import axios from 'axios';
import { useAdminStore } from '../store/admin';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const store = useAdminStore();
  if (store.token) cfg.headers.Authorization = `Bearer ${store.token}`;
  return cfg;
});

api.interceptors.response.use(r => r.data, e => {
  if (e.response?.status === 401) {
    useAdminStore().logout();
    location.href = '/#/login';
  }
  return Promise.reject(e.response?.data || e);
});

export default api;
