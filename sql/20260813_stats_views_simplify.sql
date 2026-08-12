-- =============================================
-- 统计视图简化：每统计页一个视图（stat_key 唯一）+ 去掉 roles/scope
-- =============================================

-- 1. 同一 stat_key 保留最新一条（id 最大），删除旧多视图
DELETE sv FROM stats_views sv
JOIN stats_views sv2 ON sv.stat_key = sv2.stat_key AND sv.id < sv2.id;

-- 2. stat_key 唯一索引（每统计页一个视图）
ALTER TABLE stats_views ADD UNIQUE KEY uk_stat_key (stat_key);

-- 3. 移除角色可见与数据范围表（RLS 改为固定角色策略）
DROP TABLE IF EXISTS `stats_view_roles`;
DROP TABLE IF EXISTS `stats_view_scope`;
