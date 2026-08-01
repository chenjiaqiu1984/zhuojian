import { createSSRApp } from 'vue';
import App from './App.vue';
import uviewPlus from 'uview-plus';
import { createPinia } from 'pinia';
import { ensureShareMomentsHost } from './utils/shareMoments';

export function createApp() {
  const app = createSSRApp(App);
  app.use(createPinia());
  app.use(uviewPlus);
  // H5：尽早挂载分享弹窗宿主（App.vue 模板在 H5 不会渲染）
  ensureShareMomentsHost();
  return { app };
}
