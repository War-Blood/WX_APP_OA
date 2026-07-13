// ============================================
// 模块配置 — 一级导航 + 二级侧栏菜单
// ============================================

export interface MenuItem {
  title: string
  path: string
  roles?: string[]
}

export interface ModuleConfig {
  key: string
  icon: string
  title: string
  path: string
  roles: string[]
  children: MenuItem[]
}

export const modules: ModuleConfig[] = [
  {
    key: 'dashboard',
    icon: 'DataLine',
    title: '仪表盘',
    path: '/dashboard',
    roles: ['employee', 'admin', 'superadmin'],
    children: [{ title: '首页', path: '/dashboard' }],
  },
  {
    key: 'user',
    icon: 'User',
    title: '人事',
    path: '/user',
    roles: ['admin', 'superadmin'],
    children: [
      { title: '用户列表', path: '/user' },
      { title: '花名册', path: '/user/workers' },
      { title: '组织架构', path: '/org' },
      { title: '角色管理', path: '/role', roles: ['superadmin'] },
    ],
  },
  {
    key: 'approval',
    icon: 'DocumentChecked',
    title: '审批',
    path: '/approval',
    roles: ['admin', 'superadmin'],
    children: [{ title: '审批管理', path: '/approval' }],
  },
  {
    key: 'report',
    icon: 'Document',
    title: '日志',
    path: '/report',
    roles: ['employee', 'admin', 'superadmin'],
    children: [
      { title: '日报管理', path: '/report' },
      { title: '统计概览', path: '/report/overview' },
      { title: '人员分布图', path: '/report/distribution' },
      { title: '提交日历', path: '/report/calendar' },
      { title: '项目进展', path: '/report/project' },
      { title: '人员工作类型', path: '/report/worktype' },
      { title: '人员明细', path: '/report/workers' },
      { title: '补公出审核', path: '/report/audit', roles: ['admin', 'superadmin'] },
      { title: '当日状态', path: '/report/daily-status', roles: ['admin', 'superadmin'] },
      { title: '月度占比', path: '/report/monthly-summary' },
    ],
  },
  {
    key: 'project',
    icon: 'FolderOpened',
    title: '项目',
    path: '/project',
    roles: ['admin', 'superadmin'],
    children: [{ title: '项目管理', path: '/project' }],
  },
  {
    key: 'attendance',
    icon: 'Calendar',
    title: '考勤',
    path: '/attendance',
    roles: ['admin', 'superadmin'],
    children: [
      { title: '排班规则', path: '/attendance/schedule-rules' },
      { title: '请假出差', path: '/attendance/leave-manage' },
    ],
  },
  {
    key: 'compliance',
    icon: 'Verified',
    title: '合规',
    path: '/compliance',
    roles: ['admin', 'superadmin'],
    children: [
      { title: '统计看板', path: '/compliance/dashboard' },
      { title: '出差管理', path: '/compliance/biz-trip' },
      { title: '缺失审核', path: '/compliance/missing-review' },
    ],
  },
  {
    key: 'settings',
    icon: 'Setting',
    title: '设置',
    path: '/settings',
    roles: ['superadmin'],
    children: [
      { title: '模块管理', path: '/modules' },
      { title: '系统设置', path: '/settings' },
    ],
  },
]

export function getVisibleModules(role: string): ModuleConfig[] {
  return modules.filter(m => m.roles.includes(role))
}

export function getActiveModule(path: string): ModuleConfig | undefined {
  return modules.find(m =>
    path.startsWith(m.path) || m.children.some(c => c.path === path)
  )
}

export function getVisibleChildren(module: ModuleConfig, role: string): MenuItem[] {
  return module.children.filter(c => !c.roles || c.roles.includes(role))
}
