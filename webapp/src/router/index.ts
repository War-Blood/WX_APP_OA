import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/login/index.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('@/layouts/DefaultLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/index.vue'),
          meta: { title: '仪表盘', icon: 'DataLine' }
        },
        {
          path: 'user',
          name: 'User',
          component: () => import('@/views/user/index.vue'),
          meta: { title: '用户管理', icon: 'User' }
        },
        {
          path: 'role',
          name: 'Role',
          component: () => import('@/views/role/index.vue'),
          meta: { title: '角色管理', icon: 'Avatar' }
        },
        {
          path: 'approval',
          name: 'Approval',
          component: () => import('@/views/approval/index.vue'),
          meta: { title: '审批管理', icon: 'DocumentChecked' }
        },
        {
          path: 'report',
          meta: { title: '日报管理', icon: 'Document' },
          children: [
            {
              path: '',
              name: 'Report',
              component: () => import('@/views/report/index.vue'),
              meta: { title: '日报管理' }
            },
            {
              path: 'audit',
              name: 'ReportAudit',
              component: () => import('@/views/report/audit.vue'),
              meta: { title: '补公出审核' }
            },
            {
              path: 'stats',
              name: 'ReportStats',
              component: () => import('@/views/report/stats.vue'),
              meta: { title: '公出统计' }
            },
            {
              path: 'daily-status',
              name: 'ReportDailyStatus',
              component: () => import('@/views/report/daily-status.vue'),
              meta: { title: '员工当日状态' }
            },
            {
              path: 'monthly-summary',
              name: 'ReportMonthlySummary',
              component: () => import('@/views/report/monthly-summary.vue'),
              meta: { title: '月度工作占比' }
            }
          ]
        },
        {
          path: '/user/workers',
          name: 'UserWorkers',
          component: () => import('@/views/user/workers.vue'),
          meta: { title: '外场人员花名册' }
        },
        {
          path: 'project',
          name: 'Project',
          component: () => import('@/views/project/index.vue'),
          meta: { title: '项目管理', icon: 'FolderOpened' }
        },
        {
          path: 'compliance',
          name: 'Compliance',
          redirect: '/compliance/dashboard',
          meta: { title: '合规管理', icon: 'DocumentChecked' },
          children: [
            {
              path: 'dashboard',
              name: 'ComplianceDashboard',
              component: () => import('@/views/compliance/Dashboard.vue'),
              meta: { title: '合规统计看板' }
            },
            {
              path: 'biz-trip',
              name: 'BizTripManage',
              component: () => import('@/views/compliance/BizTripManage.vue'),
              meta: { title: '出差管理' }
            },
            {
              path: 'missing-review',
              name: 'MissingReview',
              component: () => import('@/views/compliance/MissingReview.vue'),
              meta: { title: '缺失报告审核' }
            }
          ]
        },
        {
          path: 'modules',
          name: 'Modules',
          component: () => import('@/views/modules/index.vue'),
          meta: { title: '模块管理', icon: 'Switch' }
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/settings/index.vue'),
          meta: { title: '系统设置', icon: 'Setting' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/error/404.vue')
    }
  ]
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  if (to.meta.public) {
    next()
    return
  }

  if (!userStore.token) {
    next('/login')
    return
  }

  next()
})

export default router
