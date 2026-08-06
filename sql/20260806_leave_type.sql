-- =============================================
-- 2026-08-06 请假单类型迁移（report_type='leave'）
-- 需求：请假不算做工作日报，设置为请假单（新日志类型 leave）
-- 幂等：可重复执行
-- =============================================

-- 1. 备份现有 daily_reports（防误操作，可回滚）
CREATE TABLE IF NOT EXISTS daily_reports_backup_20260806 AS SELECT * FROM daily_reports;

-- 2. 扩展 report_type ENUM，新增 'leave'（请假单）
ALTER TABLE daily_reports
  MODIFY COLUMN report_type ENUM('biz_trip','biz_trip_supplement','office','leave')
  NOT NULL DEFAULT 'biz_trip' COMMENT '日志类型';

-- 3. 迁移现有请假记录类型 → leave（保留记录，只改类型）
UPDATE daily_reports
   SET report_type = 'leave'
 WHERE today_work_type = '请假' AND report_type != 'leave';

-- 4. 验收：应全部为 leave，且 leave 总数 = 迁移前请假记录数
-- SELECT report_type, COUNT(*) FROM daily_reports WHERE today_work_type='请假' GROUP BY report_type;
