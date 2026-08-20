import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { setupGuards } from './guards';

// 路由配置（任务书 01 第二节）
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/register/index.vue'),
    meta: { public: true, title: '学生注册' },
  },
  {
    path: '/',
    component: () => import('@/layouts/StudentLayout.vue'),
    redirect: '/profile',
    children: [
      { path: 'profile', name: 'Profile', component: () => import('@/views/profile/index.vue'), meta: { title: '个人信息中心' } },
      { path: 'profile/edit', name: 'ProfileEdit', component: () => import('@/views/profile/edit.vue'), meta: { title: '信息修改申请' } },
      { path: 'status', name: 'Status', component: () => import('@/views/status/index.vue'), meta: { title: '学籍管理' } },
      { path: 'status/apply/:type', name: 'StatusApply', component: () => import('@/views/status/apply.vue'), meta: { title: '学籍异动申请' } },
      { path: 'status/certificate', name: 'Certificate', component: () => import('@/views/status/certificate.vue'), meta: { title: '证明申请' } },
      { path: 'course/timetable', name: 'Timetable', component: () => import('@/views/course/timetable.vue'), meta: { title: '我的课表' } },
      { path: 'course/score', name: 'Score', component: () => import('@/views/course/score.vue'), meta: { title: '我的成绩' } },
      { path: 'course/select', name: 'CourseSelect', component: () => import('@/views/course/select.vue'), meta: { title: '选课' } },
      { path: 'course/retake', name: 'Retake', component: () => import('@/views/course/retake.vue'), meta: { title: '重修报名' } },
      { path: 'award/scholarship', name: 'Scholarship', component: () => import('@/views/award/scholarship.vue'), meta: { title: '奖学金' } },
      { path: 'award/aid', name: 'Aid', component: () => import('@/views/award/aid.vue'), meta: { title: '助学金' } },
      { path: 'award/honor', name: 'Honor', component: () => import('@/views/award/honor.vue'), meta: { title: '评优' } },
      { path: 'award/discipline', name: 'Discipline', component: () => import('@/views/award/discipline.vue'), meta: { title: '违纪记录' } },
      { path: 'attendance/leave', name: 'Leave', component: () => import('@/views/attendance/leave.vue'), meta: { title: '请假申请' } },
      { path: 'attendance/record', name: 'AttendanceRecord', component: () => import('@/views/attendance/record.vue'), meta: { title: '考勤记录' } },
      { path: 'dorm', name: 'Dorm', component: () => import('@/views/dorm/index.vue'), meta: { title: '我的宿舍' } },
      { path: 'notice', name: 'Notice', component: () => import('@/views/notice/index.vue'), meta: { title: '通知公告' } },
      { path: 'notice/:id', name: 'NoticeDetail', component: () => import('@/views/notice/detail.vue'), meta: { title: '通知详情' } },
      { path: 'feedback/repair', name: 'Repair', component: () => import('@/views/feedback/repair.vue'), meta: { title: '报修' } },
      { path: 'feedback/complaint', name: 'Complaint', component: () => import('@/views/feedback/complaint.vue'), meta: { title: '意见反馈' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/profile' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

setupGuards(router);

export default router;
