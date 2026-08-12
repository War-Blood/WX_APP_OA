-- =============================================
-- 工作日报(office)：项目/区域/相关方/工作类型 默认值
-- 说明:
--   - 新提交在 report.controller.js submit 中对 office 强制写入:
--     project='公司日报'、area='浙江-温州-乐清'、related_party=''、today_work_type='公司'
--   - 本脚本对存量 office 记录同样强制覆盖(曾有公出草稿的项目/相关方泄漏到公司日报)
-- 幂等: 重复执行安全
-- =============================================
UPDATE daily_reports
SET project = '公司日报',
    area = '浙江-温州-乐清',
    related_party = '',
    today_work_type = '公司'
WHERE report_type = 'office';
