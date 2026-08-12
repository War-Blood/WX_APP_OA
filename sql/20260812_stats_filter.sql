-- =============================================
-- 公出统计每视图筛选配置（system_config.stats_filter_<view>，JSON）
-- 视图: daily(全员当日)/worktypes(人员分布)/area(区域分布)/calendar(提交日历)/workers(人员明细)
-- 字段: deptId(部门范围,含子部门), fieldOnly(仅现场作业1/0), workType(工作类型,空=不过滤), province(省份,空=不过滤)
-- 默认: 部门=23(浙江贝良,与旧 stats_personnel_scope 一致), 仅现场=1
-- 幂等: ON DUPLICATE KEY UPDATE
-- =============================================
INSERT INTO system_config (config_key, config_value, config_group, description) VALUES
('stats_filter_daily',     '{"deptId":23,"fieldOnly":1,"workType":"","province":""}', 'stats', '公出统计-全员当日 筛选(JSON)'),
('stats_filter_worktypes', '{"deptId":23,"fieldOnly":1,"workType":"","province":""}', 'stats', '公出统计-人员分布 筛选(JSON)'),
('stats_filter_area',      '{"deptId":23,"fieldOnly":1,"workType":"","province":""}', 'stats', '公出统计-区域分布 筛选(JSON)'),
('stats_filter_calendar',  '{"deptId":23,"fieldOnly":1,"workType":"","province":""}', 'stats', '公出统计-提交日历 筛选(JSON)'),
('stats_filter_workers',   '{"deptId":23,"fieldOnly":1,"workType":"","province":""}', 'stats', '公出统计-人员明细 筛选(JSON)')
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  config_group = VALUES(config_group);
