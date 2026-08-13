-- =============================================
-- 统计视图操作审计：记录筛选弹窗每次保存/读取及实际存储内容
-- 幂等：CREATE TABLE IF NOT EXISTS
-- =============================================

CREATE TABLE IF NOT EXISTS `stats_view_ops` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stat_key`    VARCHAR(20)  NOT NULL COMMENT 'daily/worktypes/area/calendar/workers',
  `action`      VARCHAR(10)  NOT NULL COMMENT 'save=保存视图 / read=打开弹窗读取',
  `payload_json` JSON        NOT NULL COMMENT '保存: 实际写入的 conditions+visibility；读取: 返回的 filter',
  `created_by`  INT UNSIGNED NOT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stat_key_time` (`stat_key`, `created_at`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='统计视图操作审计';
