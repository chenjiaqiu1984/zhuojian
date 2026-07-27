import { defineConfig, loadEnv } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiServer = (env.VITE_SERVER || 'http://localhost:3000').replace(/\/$/, '');
  const isMpWeixin = process.env.UNI_PLATFORM === 'mp-weixin';

  return {
    plugins: [uni()],
    build: {
      minify: 'terser',
      terserOptions: {
        // 小程序调试阶段保留 console，便于微信开发者工具排查跳转
        compress: { drop_console: !isMpWeixin, drop_debugger: true },
        mangle: true,
      },
    },
    server: {
      port: 5173,
      host: '127.0.0.1',
      strictPort: true,
      // H5 开发时 /static 走后端（与 staticUrl 一致），tabBar 图标等同源可加载
      proxy: {
        '/static': {
          target: apiServer,
          changeOrigin: true,
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['import'],
          additionalData: `@import "uview-plus/theme.scss";\n@import "uview-plus/libs/css/theme-vars.scss";\n@import "uview-plus/libs/css/mixin.scss";\n@import "@/styles/tokens.scss";\n@import "@/styles/island-hero.scss";`
        }
      }
    }
  };
});
