import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import '@shared-web/styles/theme.scss';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { registerEduTheme } from '@shared-web/utils/echarts-theme';

import App from './App.vue';
import router from './router';
import './styles/global.scss';

// 注册统一 ECharts 主题
registerEduTheme();

const app = createApp(App);

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
app.use(router);
app.use(ElementPlus, { locale: zhCn });

app.mount('#app');
