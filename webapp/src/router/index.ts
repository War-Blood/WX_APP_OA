import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/login/index.vue'),
      meta: { public: true, title: '登录' }
    },
    {
      path: '/403',
      name: 'Forbidden',
      component: () => import('@/views/error/403.vue'),
      meta: { public: true, title: '无权限' }
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
          meta: { title: '仪表盘', icon: 'DataLine', roles: ['employee', 'admin', 'superadmin'] }
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/profile/index.vue'),
          meta: { title: '个人中心', roles: ['employee', 'admin', 'superadmin'] }
        },
        {
          path: 'user',
          name: 'User',
          component: () => import('@/views/user/index.vue'),
          meta: { title: '用户管理', icon: 'User', roles: ['admin', 'superadmin'] }
        },
        {
          path: 'role',
          name: 'Role',
          component: () => import('@/views/role/index.vue'),
          meta: { title: '角色管理', icon: 'Avatar', roles: ['superadmin'] }
        },
        {
          path: 'org',
          name: 'Org',
          component: () => import('@/views/org/index.vue'),
          meta: { title: '组织架构', icon: 'Share', roles: ['admin', 'superadmin'] }
        },
        {
          path: 'approval',
          name: 'Approval',
          component: () => import('@/views/approval/index.vue'),
          meta: { title: '审批管理', icon: 'DocumentChecked', roles: ['admin', 'superadmin'] }
        },
        {
          path: 'report',
          meta: {
            title: '日报管理',
            icon: 'Document',
            roles: ['employee', 'admin', 'superadmin']
          },
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
              meta: { title: '补公出审核', roles: ['admin', 'superadmin'] }
            },
            {
              path: 'daily',
              name: 'ReportDaily',
              component: () => import('@/views/report/daily.vue'),
              meta: { title: '工作日报', roles: ['admin', 'superadmin'] }
            },
            {
              path: 'overview',
              name: 'ReportOverview',
              component: () => import('@/views/report/overview.vue'),
              meta: { title: '统计概览' }
            },
            {
              path: 'distribution',
              name: 'ReportDistribution',
              component: () => import('@/views/report/personnel-distribution.vue'),
              meta: { title: '人员分布图' }
            },
            {
              path: 'calendar',
              name: 'ReportCalendar',
              component: () => import('@/views/report/calendar.vue'),
              meta: { title: '提交日历' }
            },
            {
              path: 'project',
              name: 'ReportProject',
              component: () => import('@/views/report/project-progress.vue'),
              meta: { title: '项目进展' }
            },
            {
              path: 'worktype',
              name: 'ReportWorkType',
              component: () => import('@/views/report/work-type.vue'),
              meta: { title: '人员工作类型' }
            },
            {
              path: 'workers',
              name: 'ReportWorkers',
              component: () => import('@/views/report/worker-dimension.vue'),
              meta: { title: '人员明细' }
            },
            {
              path: 'daily-status',
              name: 'ReportDailyStatus',
              component: () => import('@/views/report/daily-status.vue'),
              meta: { title: '员工当日状态', roles: ['admin', 'superadmin'] }
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
          meta: { title: '外场人员花名册', roles: ['admin', 'superadmin'] }
        },
        {
          path: 'project',
          name: 'Project',
          component: () => import('@/views/project/index.vue'),
          meta: { title: '项目管理', icon: 'FolderOpened', roles: ['admin', 'superadmin'] }
        },
        {
          path: 'compliance',
          name: 'Compliance',
          redirect: '/compliance/dashboard',
          meta: {
            title: '合规管理',
            icon: 'DocumentChecked',
            roles: ['admin', 'superadmin']
          },
          children: [
            {
              path: 'dashboard',
              name: 'ComplianceDashboard',
              component: () => import('@/views/compliance/Dashboard.vue'),
              meta: { title: '合规统计看板' }
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
          path: 'attendance',
          name: 'Attendance',
          redirect: '/attendance/schedule-rules',
          meta: {
            title: '考勤',
            icon: 'Calendar',
            roles: ['admin', 'superadmin']
          },
          children: [
            {
              path: 'schedule-rules',
              name: 'AttendanceScheduleRules',
              component: () => import('@/views/attendance/ScheduleRules.vue'),
              meta: { title: '排班规则' }
            },
            {
              path: 'leave-manage',
              name: 'AttendanceLeaveManage',
              component: () => import('@/views/attendance/LeaveManage.vue'),
              meta: { title: '请假出差管理' }
            },
            {
              path: 'biz-trip',
              name: 'BizTripManage',
              component: () => import('@/views/compliance/BizTripManage.vue'),
              meta: { title: '出差管理' }
            }
          ]
        },
        {
          path: 'exam',
          name: 'Exam',
          redirect: '/exam/categories',
          meta: {
            title: '答题管理',
            icon: 'Edit',
            roles: ['admin', 'superadmin']
          },
          children: [
            {
              path: 'categories',
              name: 'ExamCategories',
              component: () => import('@/views/exam/categories.vue'),
              meta: { title: '分类管理' }
            },
            {
              path: 'questions',
              name: 'ExamQuestions',
              component: () => import('@/views/exam/questions.vue'),
              meta: { title: '题库管理' }
            },
            {
              path: 'papers',
              name: 'ExamPapers',
              component: () => import('@/views/exam/papers.vue'),
              meta: { title: '试卷管理' }
            },
            {
              path: 'records',
              name: 'ExamRecords',
              component: () => import('@/views/exam/records.vue'),
              meta: { title: '成绩记录' }
            },
            {
              path: 'stats',
              name: 'ExamStats',
              component: () => import('@/views/exam/stats.vue'),
              meta: { title: '答题统计' }
            },
            {
              path: 'settings',
              name: 'ExamSettings',
              component: () => import('@/views/exam/settings.vue'),
              meta: { title: '答题设置' }
            }
          ]
        },
        {
          path: 'modules',
          name: 'Modules',
          component: () => import('@/views/modules/index.vue'),
          meta: { title: '模块管理', icon: 'Switch', roles: ['superadmin'] }
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/views/settings/index.vue'),
          meta: { title: '系统设置', icon: 'Setting', roles: ['admin', 'superadmin'] }
        },
        {
          path: 'logs',
          name: 'OperationLogs',
          component: () => import('@/views/logs/index.vue'),
          meta: { title: '操作日志', icon: 'Tickets', roles: ['superadmin'] }
        },
        {
          path: 'announcement',
          name: 'Announcement',
          component: () => import('@/views/announcement/index.vue'),
          meta: { title: '公告管理', icon: 'Bell', roles: ['admin', 'superadmin'] }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/error/404.vue'),
      meta: { public: true, title: '页面不存在' }
    }
  ]
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  if (to.meta.public) {
    if (to.path === '/login' && userStore.token) {
      return '/'
    }
    return true
  }

  if (!userStore.token) {
    return {
      path: '/login',
      query: to.fullPath === '/' ? {} : { redirect: to.fullPath }
    }
  }

  if (!userStore.userInfo) {
    try {
      await userStore.refreshProfile()
    } catch {
      userStore.logout()
      return { path: '/login' }
    }
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles?.length && !roles.includes(userStore.userInfo?.role || '')) {
    return '/403'
  }

  return true
})

router.afterEach((to) => {
  document.title = `${(to.meta.title as string) || 'OA管理后台'} - OA管理后台`
})

export default router
