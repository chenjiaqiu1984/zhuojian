import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
      mangle: true,
    },
  },
  server: { port: 5173, host: true },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import'],
        additionalData: `@import "uview-plus/theme.scss";\n@import "uview-plus/libs/css/theme-vars.scss";\n@import "uview-plus/libs/css/mixin.scss";\n@import "@/styles/tokens.scss";`
      }
    }
  }
});
