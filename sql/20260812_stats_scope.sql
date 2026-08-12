-- =============================================
-- 公出统计人员范围配置（system_config）
-- 默认范围部门 = 浙江贝良(id=23)，含其全部子部门；
-- 可在 Web「系统设置 → 公出统计」修改为任意部门（或清空=不限部门）
-- 幂等：ON DUPLICATE KEY UPDATE，重复执行安全
-- =============================================
INSERT INTO system_config (config_key, config_value, config_group, description)
VALUES ('stats_personnel_scope', '23', 'stats', '公出统计人员范围部门ID(含子部门)')
ON DUPLICATE KEY UPDATE
  config_value = VALUES(config_value),
  config_group = VALUES(config_group);
