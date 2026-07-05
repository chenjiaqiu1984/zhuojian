import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  server: { port: 5173, host: true },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import']
      }
    }
  }
});
