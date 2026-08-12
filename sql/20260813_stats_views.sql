-- =============================================
-- 统计视图管理：视图 + 可见角色 + 数据范围(RLS)
-- 幂等：CREATE TABLE IF NOT EXISTS
-- =============================================

CREATE TABLE IF NOT EXISTS `stats_views` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(50)  NOT NULL COMMENT '视图名称',
  `stat_key`    VARCHAR(20)  NOT NULL COMMENT 'daily/worktypes/area/calendar/workers',
  `filter_json` JSON         NOT NULL COMMENT '{deptId,fieldOnly,workType,province,date,month}',
  `is_locked`   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '锁定后筛选不可改',
  `created_by`  INT UNSIGNED NOT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stat_key` (`stat_key`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统计视图';

CREATE TABLE IF NOT EXISTS `stats_view_roles` (
  `view_id`   INT UNSIGNED NOT NULL,
  `role_code` VARCHAR(30)  NOT NULL COMMENT 'employee/admin/superadmin/bm',
  PRIMARY KEY (`view_id`, `role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视图可见角色';

CREATE TABLE IF NOT EXISTS `stats_view_scope` (
  `view_id`    INT UNSIGNED NOT NULL,
  `role_code`  VARCHAR(30)  NOT NULL,
  `scope_type` VARCHAR(30)  NOT NULL DEFAULT 'all'
               COMMENT 'all/department/department_and_children/self',
  PRIMARY KEY (`view_id`, `role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视图数据范围(RLS)';
