-- ===================================================
-- v2.6.2: push_scripts 支持「按条件筛选 @ 人员」
-- mention_type='filtered' 时，@ 人员来自数据源人员名单
-- （如 daily_report.missing_workers = 昨日未提交人员，动态变化；
--   名单为空即全员满足 → 不触发 @）
-- 幂等：列不存在才添加，可重复执行。
-- ===================================================

SET NAMES utf8mb4;
SET @dbname = DATABASE();

SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'push_scripts' AND COLUMN_NAME = 'mention_source') > 0,
  'SELECT ''mention_source exists'' AS message;',
  'ALTER TABLE push_scripts ADD COLUMN mention_source VARCHAR(50) DEFAULT NULL COMMENT ''按条件筛选@：数据源 id（如 daily_report），取该源人员名单'' AFTER mention_targets;'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- mention_type 枚举增加 filtered
ALTER TABLE push_scripts MODIFY mention_type ENUM('none','all','roles','users','filtered') NOT NULL DEFAULT 'none' COMMENT '@ 方式（filtered=按条件筛选不满足人员）';

SELECT 'v2.6.2 push_scripts mention_source 迁移完成!' AS message;
