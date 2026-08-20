import { createRouter, createWebHistory } from 'vue-router';
import { staticRoutes } from './staticRoutes';
import { setupGuards } from './guards';

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes,
});

setupGuards(router);

export default router;
