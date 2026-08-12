-- =============================================
-- 修复：stats_views 残留 name/is_locked 列导致 UPSERT 报「Field 'name' doesn't have a default value」
-- 新模型每统计页一个视图，无需 name/is_locked
-- =============================================
ALTER TABLE `stats_views` DROP COLUMN `name`, DROP COLUMN `is_locked`;
