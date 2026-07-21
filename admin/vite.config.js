import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const target = env.VITE_API_TARGET || 'http://localhost:3000';
  return {
    plugins: [vue()],
    base: '/admin/',
    server: { port: 5174, proxy: { '/api': target, '/uploads': target } }
  };
});
