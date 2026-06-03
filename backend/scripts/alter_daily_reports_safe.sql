-- ============================================================
-- daily_reports 表扩展 ALTER 脚本（安全版）
-- 跳过已存在的列和索引
-- ============================================================

USE daily_report;

-- 逐列添加（跳过已存在的）
SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='project';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `project` varchar(255) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='area';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `area` varchar(255) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='today_work_type';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `today_work_type` varchar(50) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='tomorrow_work_type';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `tomorrow_work_type` varchar(50) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='work_content';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `work_content` varchar(500) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='workers';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `workers` varchar(255) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='machine_model';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `machine_model` varchar(100) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='worker_count';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `worker_count` int(11) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='required_qty';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `required_qty` int(11) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='completed_qty';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `completed_qty` int(11) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='progress_percent';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `progress_percent` int(11) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='remark';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `remark` text DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='entry_date';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `entry_date` date DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='initial_biz_trip_date';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `initial_biz_trip_date` date DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='related_party';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `related_party` varchar(255) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='personal_biz_trip_days';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `personal_biz_trip_days` int(11) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='files';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `files` json DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND COLUMN_NAME='updated_at';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD COLUMN `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 索引（跳过已存在的）
SELECT COUNT(*) INTO @c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='daily_report' AND TABLE_NAME='daily_reports' AND INDEX_NAME='idx_report_date';
SET @s = IF(@c=0, 'ALTER TABLE daily_reports ADD INDEX `idx_report_date` (`report_date`)', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migration complete' AS result;
