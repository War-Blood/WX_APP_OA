-- ============================================================
-- 迁移：工作日报（office）默认区域配置化
-- 背景：后端 report.controller.js 原硬编码 area='浙江-温州-乐清'，
--       现改为从 system_config 读取（config_key=office_report_area），
--       值可由管理员通过系统设置接口维护。
-- 执行方式：mysql -h127.0.0.1 -udaily_report_user -p wx_app_oa < 本文件
-- ============================================================

INSERT INTO system_config (config_key, config_value, config_group, description)
VALUES ('office_report_area', '浙江-温州-乐清', 'report', '工作日报默认区域(省-市-区)')
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  config_group = VALUES(config_group),
  description = VALUES(description);
