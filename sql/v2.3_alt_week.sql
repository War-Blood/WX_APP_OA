-- ============================================
-- v2.3 大小周排班规则
-- ============================================
SET NAMES utf8mb4;

-- 仅当列不存在时添加（兼容重复执行）
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'attendance_schedule_rules' AND COLUMN_NAME = 'alt_week_config');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE attendance_schedule_rules ADD COLUMN alt_week_config JSON DEFAULT NULL COMMENT ''双周交替配置''', 'SELECT ''alt_week_config 已存在'' AS msg');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col2_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'attendance_schedule_rules' AND COLUMN_NAME = 'alternating');
SET @sql2 = IF(@col2_exists = 0, 'ALTER TABLE attendance_schedule_rules ADD COLUMN alternating TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''是否启用大小周''', 'SELECT ''alternating 已存在'' AS msg');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

SELECT 'v2.3 大小周排班规则迁移完成!' AS message;
