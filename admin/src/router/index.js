import { createRouter, createWebHashHistory } from 'vue-router';
import { useAdminStore } from '../store/admin';

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  {
    path: '/', component: () => import('../views/Layout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'about', component: () => import('../views/About.vue') },
      { path: 'consultants', component: () => import('../views/Consultants.vue') },
      { path: 'consultants/:id/slots', component: () => import('../views/Slots.vue') },
      { path: 'booking', component: () => import('../views/Booking.vue') },
      { path: 'orders',  component: () => import('../views/Orders.vue') },
      { path: 'news', component: () => import('../views/News.vue') },
      { path: 'learning', component: () => import('../views/Learning.vue') },
      { path: 'ohcard', component: () => import('../views/OhCard.vue') },
      { path: 'assessment', component: () => import('../views/Assessment.vue') },
      { path: 'analytics', component: () => import('../views/Analytics.vue') },
      { path: 'crisis', component: () => import('../views/CrisisEvents.vue') },
      { path: 'treehole', component: () => import('../views/Treehole.vue') },
      { path: 'terms', component: () => import('../views/TermsManager.vue') },
      { path: 'users', component: () => import('../views/Users.vue') },
    ]
  }
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach((to) => {
  const store = useAdminStore();
  if (to.path !== '/login' && !store.token) return '/login';
});

export default router;
