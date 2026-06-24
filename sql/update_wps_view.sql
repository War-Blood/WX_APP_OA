-- ============================================
-- WPS 报表视图重建 (v2.0)
-- 执行时间: 2026-06-13
-- 变更内容:
--   1. 作业人员(08-作业人员)改用 daily_report_workers 关联表聚合
--   2. 排除 report_type = 'office' 的公司日报
--   3. 只包含 status = 'approved' 的记录
--   4. 新增 03-入场时间 / 04-初始出差时间 字段
-- 依赖: 需先执行 v2.0_migration.sql 完成表结构变更
-- ============================================

DROP VIEW IF EXISTS wps_reports_view;

CREATE VIEW wps_reports_view AS
SELECT
  dr.id,
  dr.report_date AS `01-日报时间`,
  COALESCE(u.user_name, '') AS `02-填写人`,
  COALESCE(dr.entry_date, dr.report_date) AS `03-入场时间`,
  dr.initial_biz_trip_date AS `04-初始出差时间`,
  dr.project AS `05-项目名称`,
  dr.area AS `06-项目所在区域`,
  dr.related_party AS `07-相关方单位`,
  COALESCE(
    (SELECT GROUP_CONCAT(u2.user_name SEPARATOR '、')
     FROM daily_report_workers drw
     JOIN users u2 ON drw.worker_uid = u2.id
     WHERE drw.report_id = dr.id),
    ''
  ) AS `08-作业人员`,
  COALESCE(dr.machine_model, '') AS `09-机型`,
  COALESCE((SELECT COUNT(*) FROM daily_report_workers WHERE report_id = dr.id), 0) AS `10-人数`,
  COALESCE(dr.work_content, '') AS `11-从事工作内容`,
  COALESCE(dr.required_qty, 0) AS `12-需要完成数量`,
  COALESCE(dr.completed_qty, 0) AS `13-累计完成数量`,
  COALESCE(dr.progress_percent, 0) AS `14-当前进度`,
  COALESCE(dr.today_work, '') AS `15-当日工作小结`,
  COALESCE(dr.tomorrow_plan, '') AS `16-明天工作内容`,
  COALESCE(dr.today_work_type, '') AS `17-今日工作类型`,
  COALESCE(dr.tomorrow_work_type, '') AS `18-明日工作类型`
FROM daily_reports dr
LEFT JOIN users u ON dr.user_id = u.id
WHERE dr.status = 'approved'
  AND dr.report_type != 'office';
