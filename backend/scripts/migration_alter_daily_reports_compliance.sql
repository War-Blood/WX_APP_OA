-- ============================================
-- 公出日志合规管理 - Phase 1 数据库迁移脚本
-- 修改 daily_reports 表,添加合规相关字段
-- 执行时间: 2026-06-03
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 为 daily_reports 表添加合规相关字段
-- ============================================

-- 检查字段是否已存在,避免重复添加
SET @dbname = DATABASE();
SET @tablename = 'daily_reports';

-- 添加 timeliness 字段(如果不存在)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'timeliness'
  ) > 0,
  'SELECT ''timeliness 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE daily_reports ADD COLUMN `timeliness` enum(''on_time'',''delayed'',''missing'') DEFAULT ''on_time'' COMMENT ''及时性标记'' AFTER `status`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加 compliance_id 字段(如果不存在)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = 'compliance_id'
  ) > 0,
  'SELECT ''compliance_id 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE daily_reports ADD COLUMN `compliance_id` bigint(20) DEFAULT NULL COMMENT ''关联合规记录ID'' AFTER `timeliness`;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加 timeliness 索引(如果不存在)
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = 'idx_timeliness'
  ) > 0,
  'SELECT ''idx_timeliness 索引已存在,跳过添加'' AS message;',
  'ALTER TABLE daily_reports ADD INDEX `idx_timeliness` (`timeliness`);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 迁移完成提示
-- ============================================
SELECT 'daily_reports 表字段添加完成!' AS message;

-- 验证字段是否添加成功
SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'daily_reports'
  AND COLUMN_NAME IN ('timeliness', 'compliance_id')
ORDER BY ORDINAL_POSITION;

-- 显示 daily_reports 表结构
DESCRIBE daily_reports;
