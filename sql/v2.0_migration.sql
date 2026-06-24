-- ============================================
-- 公出日志模块升级 v2.0 - 数据库迁移脚本
-- 执行时间: 2026-06-13
-- 变更内容:
--   1. users 表新增工号/入场日期/外场人员状态
--   2. daily_reports 表新增日志类型/补录日期/补录原因 + 扩展工作类型
--   3. 新建 daily_report_workers 关联表（代填关系）
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 1. users 表新增字段
-- ============================================
SET @dbname = DATABASE();

-- 添加 worker_code 字段
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'worker_code'
  ) > 0,
  'SELECT ''users.worker_code 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE users ADD COLUMN worker_code VARCHAR(20) COMMENT ''工号'' AFTER position;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加 entry_date 字段
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'entry_date'
  ) > 0,
  'SELECT ''users.entry_date 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE users ADD COLUMN entry_date DATE COMMENT ''入场日期'' AFTER worker_code;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加 worker_status 字段
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'worker_status'
  ) > 0,
  'SELECT ''users.worker_status 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE users ADD COLUMN worker_status ENUM(''active'',''inactive'') DEFAULT ''active'' COMMENT ''外场人员状态'' AFTER entry_date;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 2. daily_reports 表变更
-- ============================================

-- 添加 report_type 字段
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'daily_reports'
      AND COLUMN_NAME = 'report_type'
  ) > 0,
  'SELECT ''daily_reports.report_type 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE daily_reports ADD COLUMN report_type ENUM(''biz_trip'',''biz_trip_supplement'',''office'') DEFAULT ''biz_trip'' COMMENT ''日志类型'' AFTER report_date;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加 supplement_date 字段
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'daily_reports'
      AND COLUMN_NAME = 'supplement_date'
  ) > 0,
  'SELECT ''daily_reports.supplement_date 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE daily_reports ADD COLUMN supplement_date DATE COMMENT ''补录目标日期'' AFTER report_type;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加 supplement_reason 字段
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'daily_reports'
      AND COLUMN_NAME = 'supplement_reason'
  ) > 0,
  'SELECT ''daily_reports.supplement_reason 字段已存在,跳过添加'' AS message;',
  'ALTER TABLE daily_reports ADD COLUMN supplement_reason TEXT COMMENT ''补录原因'' AFTER supplement_date;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 扩展 today_work_type 和 tomorrow_work_type 长度（从 ENUM 改为 VARCHAR(20)）
ALTER TABLE daily_reports MODIFY today_work_type VARCHAR(20) COMMENT '今日工作类型: 工作（陆）/工作（海）/待工/在途/请假/调休';
ALTER TABLE daily_reports MODIFY tomorrow_work_type VARCHAR(20) COMMENT '明日工作类型';

-- ============================================
-- 3. 新建 daily_report_workers 关联表
-- ============================================
CREATE TABLE IF NOT EXISTS daily_report_workers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,
  worker_uid INT UNSIGNED NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES daily_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_uid) REFERENCES users(id),
  UNIQUE KEY uk_report_worker (report_id, worker_uid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日报代填人员关联表';

-- ============================================
-- 4. 索引优化
-- ============================================
-- 代填查询索引（检查某用户某天是否已被代填）
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'daily_report_workers'
      AND INDEX_NAME = 'idx_worker_uid'
  ) > 0,
  'SELECT ''idx_worker_uid 索引已存在,跳过添加'' AS message;',
  'ALTER TABLE daily_report_workers ADD INDEX idx_worker_uid (worker_uid);'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 迁移完成提示
-- ============================================
SELECT 'v2.0 数据库迁移完成!' AS message;

-- 验证关键字段
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'users' AND COLUMN_NAME IN ('worker_code', 'entry_date', 'worker_status'))
    OR (TABLE_NAME = 'daily_reports' AND COLUMN_NAME IN ('report_type', 'supplement_date', 'supplement_reason', 'today_work_type', 'tomorrow_work_type'))
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT 'daily_report_workers 建表验证:' AS message;
SHOW CREATE TABLE daily_report_workers;

-- ============================================
-- ⚠️ 后续步骤
-- ============================================
-- 执行完本迁移脚本后，需执行视图重建脚本:
--   SOURCE sql/update_wps_view.sql;
-- 该脚本会重建 wps_reports_view，将作业人员字段
-- 从旧的 workers 文本字段切换为 daily_report_workers 关联表聚合。
