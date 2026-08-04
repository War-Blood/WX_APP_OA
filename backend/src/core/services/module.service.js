'use strict';

const db = require('../../common/config/database');

/**
 * 默认模块配置（首次使用时初始化到 system_config 表）
 */
const DEFAULT_MODULES = [
  { key: 'approval',      name: '审批管理', icon: 'approval',     route: '/pages/approval/index/index',        visible: true,  platforms: ['miniapp', 'web'], roles: ['admin', 'employee', 'superadmin'], sort: 1 },
  { key: 'report',        name: '公出日志', icon: 'report',       route: '/pages/employee/report-edit/index',  visible: true,  platforms: ['miniapp', 'web'], roles: ['admin', 'employee', 'superadmin'], sort: 2 },
  { key: 'report_history',name: '日报历史', icon: 'history',      route: '/pages/employee/report-history/index',visible: true, platforms: ['miniapp'],        roles: ['admin', 'employee', 'superadmin'], sort: 3 },
  { key: 'review',        name: '审核管理', icon: 'review',       route: '/pages/admin/review-list/index',      visible: true,  platforms: ['miniapp'],        roles: ['admin', 'superadmin'], sort: 4 },
  { key: 'message',       name: '消息中心', icon: 'message',      route: '/pages/message/index/index',          visible: true,  platforms: ['miniapp'],        roles: ['admin', 'employee', 'superadmin'], sort: 5 },
  { key: 'compliance',    name: '合规记录', icon: 'compliance',   route: '/pages/compliance/my-compliance/index',visible: true, platforms: ['miniapp'],     roles: ['admin', 'employee', 'superadmin'], sort: 6 },
  { key: 'stats',         name: '公出统计', icon: 'stats',        route: '/pages/profile/stats',                visible: true,  platforms: ['miniapp'],        roles: ['admin', 'employee', 'superadmin'], sort: 7 },
  { key: 'attendance',    name: '考勤打卡', icon: 'attendance',   route: '/pages/attendance/my-schedule/index',  visible: true,  platforms: ['miniapp'],        roles: ['admin', 'employee', 'superadmin'], sort: 8 },
  { key: 'exam',          name: '在线考试', icon: 'exam',         route: '/pages/exam/index/index',               visible: true,  platforms: ['miniapp'],        roles: ['admin', 'employee', 'superadmin'], sort: 9 },
  { key: 'contacts',      name: '通讯录',   icon: 'contacts',     route: '',                                       visible: false, platforms: ['miniapp'],        roles: [], sort: 10 },
  { key: 'notice',        name: '通知公告', icon: 'notice',       route: '',                                       visible: false, platforms: ['miniapp'],        roles: [], sort: 11 },
  { key: 'dashboard',     name: '仪表盘',   icon: 'DataLine',     route: '/dashboard',                           visible: true,  platforms: ['web'],           roles: ['employee', 'admin', 'superadmin'], sort: 12 },
  { key: 'user',          name: '人事',     icon: 'User',         route: '/user',                                visible: true,  platforms: ['web'],           roles: ['admin', 'superadmin'], sort: 13 },
  { key: 'project',       name: '项目',     icon: 'FolderOpened', route: '/project',                             visible: true,  platforms: ['web'],           roles: ['admin', 'superadmin'], sort: 14 },
  { key: 'attendance',    name: '考勤',     icon: 'Calendar',     route: '/attendance',                         visible: true,  platforms: ['web'],           roles: ['admin', 'superadmin'], sort: 15 },
  { key: 'exam',          name: '考试管理', icon: 'Edit',         route: '/exam',                               visible: true,  platforms: ['web'],           roles: ['admin', 'superadmin'], sort: 16 },
  { key: 'compliance',    name: '合规',     icon: 'Verified',     route: '/compliance',                         visible: true,  platforms: ['web'],           roles: ['admin', 'superadmin'], sort: 17 },
  { key: 'settings',      name: '设置',     icon: 'Setting',      route: '/settings',                            visible: true,  platforms: ['web'],           roles: ['superadmin'], sort: 18 },
  { key: 'announcement',  name: '公告管理', icon: 'Bell',         route: '/announcement',                      visible: true,  platforms: ['web'],           roles: ['admin', 'superadmin'], sort: 19 },
  { key: 'logs',          name: '操作日志', icon: 'Tickets',      route: '/logs',                               visible: true,  platforms: ['web'],           roles: ['superadmin'], sort: 20 },
];

/**
 * 从 system_config 表读取模块配置
 * @returns {Promise<Array>} 模块配置数组
 */
async function loadModules() {
  const rows = await db.query(
    'SELECT config_value FROM system_config WHERE config_key = ?',
    ['module_visibility']
  );
  if (rows.length === 0) {
    // 首次使用，写入默认配置
    await db.execute(
      'INSERT INTO system_config (config_key, config_value, config_group, description) VALUES (?, ?, ?, ?)',
      ['module_visibility', JSON.stringify(DEFAULT_MODULES), 'module', '功能模块可见性配置']
    );
    return DEFAULT_MODULES;
  }
  try {
    return JSON.parse(rows[0].config_value);
  } catch {
    return DEFAULT_MODULES;
  }
}

/**
 * 获取可见模块列表（按 platform 和 userRole 过滤）
 * @param {string} [platform] - 'miniapp' | 'web' | undefined(全部)
 * @param {string} [userRole] - 用户角色，用于过滤
 * @returns {Promise<Array>} 过滤后的模块列表
 */
async function getModules(platform, userRole) {
  const all = await loadModules();

  return all
    .filter(m => m.visible !== false)
    .filter(m => {
      // 如果指定了 platform，只返回该端可见的模块
      if (platform && !m.platforms.includes(platform)) return false;
      // 如果模块的 roles 为空数组，表示不可见
      if (m.roles.length === 0) return false;
      // 如果指定了 userRole，只返回该角色可见的模块
      if (userRole && !m.roles.includes(userRole)) return false;
      return true;
    })
    .sort((a, b) => a.sort - b.sort);
}

/**
 * 保存模块配置（仅 superadmin）
 * @param {Array} modules - 模块配置数组
 * @returns {Promise<void>}
 */
async function saveModules(modules) {
  if (!Array.isArray(modules) || modules.length === 0) {
    throw new (require('../../common/utils/errors').ValidationError)('modules 必须为非空数组');
  }

  const value = JSON.stringify(modules);
  await db.execute(
    `INSERT INTO system_config (config_key, config_value, config_group, description)
     VALUES ('module_visibility', ?, 'module', '功能模块可见性配置')
     ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()`,
    [value, value]
  );
}

module.exports = { getModules, saveModules, DEFAULT_MODULES };
