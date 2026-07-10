-- =====================================================
-- V2.5 迁移: 角色分组 + 数据范围预留
-- 数据库: wx_app_oa
-- 日期:   2026-07-10
-- 说明:   新增 role_groups 表实现角色分组树;
--         roles 表新增 group_id 字段;
--         不新增数据范围过滤逻辑（仅预留扩展点）
-- =====================================================

-- 1. 角色分组表
CREATE TABLE IF NOT EXISTS `role_groups` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`        VARCHAR(30) NOT NULL COMMENT '分组标识',
  `name`        VARCHAR(50) NOT NULL COMMENT '分组名称',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '分组描述',
  `sort_order`  INT NOT NULL DEFAULT 0 COMMENT '排序',
  `is_system`   TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否系统分组',
  `status`      VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '状态',
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  KEY `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色分组表';

-- 2. 预置系统角色分组
INSERT IGNORE INTO `role_groups` (`code`, `name`, `description`, `sort_order`, `is_system`) VALUES
  ('owner',      '所有者',     '系统拥有者',         1, 1),
  ('admin',      '管理员',     '系统管理员',         2, 1),
  ('dept_leader','部门主管',   '各部门主管',         3, 1),
  ('member',     '成员',       '普通成员',           4, 1),
  ('position',   '职务',       '按职务划分的角色',    5, 0),
  ('area',       '区域',       '按区域划分的角色',    6, 0);

-- 3. roles 表新增 group_id（幂等）
SET @dbname = DATABASE();
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'group_id') > 0,
  'SELECT ''roles.group_id 已存在'' AS message;',
  'ALTER TABLE roles ADD COLUMN group_id INT UNSIGNED DEFAULT NULL COMMENT ''角色分组ID'' AFTER description;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 4. 现有角色归入分组
UPDATE roles SET group_id = (SELECT id FROM role_groups WHERE code = 'owner')  WHERE code = 'superadmin' AND group_id IS NULL;
UPDATE roles SET group_id = (SELECT id FROM role_groups WHERE code = 'admin')  WHERE code = 'admin'      AND group_id IS NULL;
UPDATE roles SET group_id = (SELECT id FROM role_groups WHERE code = 'member') WHERE code = 'employee'   AND group_id IS NULL;

-- 5. 验证
SELECT 'Role Groups:' AS label, COUNT(*) AS cnt FROM role_groups WHERE deleted_at IS NULL;
SELECT 'Roles Assigned:' AS label, COUNT(*) AS cnt FROM roles WHERE group_id IS NOT NULL AND deleted_at IS NULL;
