import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const target = env.VITE_API_TARGET || 'http://localhost:3000';
  return {
    plugins: [vue()],
    base: '/admin/',
    resolve: {
      alias: {
        '@monster-v2': path.resolve(repoRoot, 'frontend/src/pages/monster/static/monster-v2'),
      },
    },
    server: {
      port: 5174,
      proxy: { '/api': target, '/uploads': target, '/static': target },
      fs: { allow: [repoRoot] },
    },
  };
});
