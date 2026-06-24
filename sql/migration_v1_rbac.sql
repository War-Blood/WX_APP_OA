-- =====================================================
-- V1 迁移: RBAC 角色权限系统
-- 数据库: wx_app_oa
-- 日期:   2026-06-04
-- 说明:   引入 roles/permissions/role_permissions 表
--         实现细粒度 RBAC 权限控制
-- =====================================================

-- ============================================
-- 1. 角色表
-- ============================================
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `code`        VARCHAR(30) NOT NULL COMMENT '角色标识: employee/admin/superadmin',
  `name`        VARCHAR(50) NOT NULL COMMENT '角色名称',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '角色描述',
  `is_system`   TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统角色（不可删除）',
  `status`      VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态: active/disabled',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- ============================================
-- 2. 权限表
-- ============================================
CREATE TABLE IF NOT EXISTS `permissions` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `code`        VARCHAR(50) NOT NULL COMMENT '权限标识: user:create',
  `name`        VARCHAR(100) NOT NULL COMMENT '权限名称',
  `group_code`  VARCHAR(30) NOT NULL COMMENT '权限分组标识: user/role/dept',
  `group_name`  VARCHAR(50) NOT NULL COMMENT '权限分组名称',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '权限说明',
  `sort_order`  INT NOT NULL DEFAULT 0 COMMENT '排序序号',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_group` (`group_code`),
  KEY `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- ============================================
-- 3. 角色-权限关联表
-- ============================================
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id`       INT UNSIGNED NOT NULL COMMENT '角色 ID',
  `permission_id` INT UNSIGNED NOT NULL COMMENT '权限 ID',
  `created_at`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色-权限关联表';

-- ============================================
-- 4. 预置角色
-- ============================================
INSERT IGNORE INTO `roles` (`code`, `name`, `description`, `is_system`) VALUES
  ('superadmin', '超级管理员', '拥有系统全部权限', 1),
  ('admin',      '管理员',     '部门管理员权限',     1),
  ('employee',   '普通员工',   '基础员工权限',       1);

-- ============================================
-- 5. 预置权限
-- ============================================
INSERT IGNORE INTO `permissions` (`code`, `name`, `group_code`, `group_name`, `sort_order`) VALUES
  -- 用户管理
  ('user:list',   '查看用户列表',   'user',   '用户管理', 10),
  ('user:create', '创建用户',       'user',   '用户管理', 20),
  ('user:edit',   '编辑用户',       'user',   '用户管理', 30),
  ('user:delete', '禁用/删除用户',   'user',   '用户管理', 40),
  ('user:import', '批量导入用户',   'user',   '用户管理', 50),

  -- 角色管理
  ('role:list',   '查看角色列表',   'role',   '角色管理', 10),
  ('role:create', '创建角色',       'role',   '角色管理', 20),
  ('role:edit',   '编辑角色',       'role',   '角色管理', 30),
  ('role:delete', '删除角色',       'role',   '角色管理', 40),

  -- 部门管理
  ('dept:list',   '查看部门列表',   'dept',   '部门管理', 10),
  ('dept:create', '创建部门',       'dept',   '部门管理', 20),
  ('dept:edit',   '编辑部门',       'dept',   '部门管理', 30),
  ('dept:delete', '删除部门',       'dept',   '部门管理', 40),

  -- 审批管理
  ('approval:list',    '查看审批列表',    'approval', '审批管理', 10),
  ('approval:config',  '配置审批类型',    'approval', '审批管理', 20),
  ('approval:process', '审批操作',        'approval', '审批管理', 30),

  -- 日报管理
  ('report:list',   '查看日报列表',   'report',  '日报管理', 10),
  ('report:review', '审核日报',       'report',  '日报管理', 20),
  ('report:export', '导出日报',       'report',  '日报管理', 30),

  -- 公告管理
  ('announcement:list',   '查看公告列表',   'announcement', '公告管理', 10),
  ('announcement:create', '发布公告',       'announcement', '公告管理', 20),
  ('announcement:edit',   '编辑公告',       'announcement', '公告管理', 30),
  ('announcement:delete', '删除公告',       'announcement', '公告管理', 40),

  -- 项目管理
  ('project:list',   '查看项目列表',   'project', '项目管理', 10),
  ('project:create', '创建项目',       'project', '项目管理', 20),
  ('project:edit',   '编辑项目',       'project', '项目管理', 30),
  ('project:delete', '删除项目',       'project', '项目管理', 40),

  -- 任务管理
  ('task:list',   '查看任务列表',   'task', '任务管理', 10),
  ('task:create', '创建任务',       'task', '任务管理', 20),
  ('task:edit',   '编辑任务',       'task', '任务管理', 30),
  ('task:delete', '删除任务',       'task', '任务管理', 40),
  ('task:assign', '分配任务',       'task', '任务管理', 50),

  -- 资产管理
  ('asset:list',   '查看资产列表',   'asset', '资产管理', 10),
  ('asset:create', '登记资产',       'asset', '资产管理', 20),
  ('asset:edit',   '编辑资产',       'asset', '资产管理', 30),
  ('asset:delete', '删除资产',       'asset', '资产管理', 40),

  -- 系统设置
  ('system:config', '修改系统配置',   'system', '系统设置', 10),
  ('log:view',      '查看操作日志',   'system', '系统设置', 20),

  -- 合规管理
  ('compliance:view',   '查看合规数据',   'compliance', '合规管理', 10),
  ('compliance:config', '配置合规规则',   'compliance', '合规管理', 20);

-- ============================================
-- 6. 预置角色-权限关联
-- ============================================

-- 超级管理员 → 全部权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'superadmin';

-- 管理员 → 大部分管理权限（不含角色管理和系统设置的全部）
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'admin'
  AND p.code NOT IN ('role:list', 'role:create', 'role:edit', 'role:delete', 'system:config');

-- 普通员工 → 仅基础查看权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'employee'
  AND p.code IN ('approval:list', 'report:list', 'announcement:list', 'project:list', 'task:list', 'compliance:view');

-- ============================================
-- 7. 索引优化：users 表追加索引
-- ============================================
-- 注意: MySQL ALTER TABLE ADD INDEX 如果索引已存在会报错
-- 本段由 Node.js 迁移脚本(migration_v1_rbac.js)捕获重复索引错误后继续执行
-- 或手动执行前先检查:
--   SELECT COUNT(*) FROM information_schema.statistics
--   WHERE table_schema='wx_app_oa' AND table_name='users' AND index_name='idx_department_id';

ALTER TABLE `users` ADD INDEX `idx_department_id` (`department_id`);
ALTER TABLE `users` ADD INDEX `idx_user_name` (`user_name`);

-- ============================================
-- 8. 验证
-- ============================================
SELECT 'Roles:' AS label, COUNT(*) AS cnt FROM roles;
SELECT 'Permissions:' AS label, COUNT(*) AS cnt FROM permissions;
SELECT 'Role-Permissions:' AS label, COUNT(*) AS cnt FROM role_permissions;
