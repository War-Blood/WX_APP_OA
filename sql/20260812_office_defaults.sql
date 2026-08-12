-- =============================================
-- 工作日报(office)：项目名称/工作类型默认值
-- 说明:
--   - 新提交在 report.controller.js submit 中对 office 默认写入
--     project='公司日报'、today_work_type='公司'
--   - 本脚本补齐存量 office 记录的空值，保证列表/统计标识一致
-- 幂等: 仅填充空值，重复执行安全
-- =============================================
UPDATE daily_reports
SET project = COALESCE(NULLIF(project, ''), '公司日报'),
    today_work_type = COALESCE(NULLIF(today_work_type, ''), '公司')
WHERE report_type = 'office'
  AND (project IS NULL OR project = ''
       OR today_work_type IS NULL OR today_work_type = '');
