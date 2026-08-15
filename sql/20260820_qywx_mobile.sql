-- ===================================================
-- v2.7: users.qywx_mobile 企业微信手机号
-- 用途：小程序个人中心填写企业微信手机号，供后续企微机器人
--      按手机号发送消息 / @（text mentioned_mobile_list），
--      或经企微 API user/get_by_mobile 反查 userid。
-- 幂等：information_schema 判断列/索引是否存在，可重复执行。
-- ===================================================

SET NAMES utf8mb4;

-- 1. 新增列（若不存在）
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'qywx_mobile'
);
SET @ddl = IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN qywx_mobile VARCHAR(20) DEFAULT NULL COMMENT ''企业微信手机号（供企微机器人通知/@）'' AFTER phone',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 普通索引（若不存在；唯一性由服务层校验，避免软删用户冲突）
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_qywx_mobile'
);
SET @ddl = IF(
  @idx_exists = 0,
  'ALTER TABLE users ADD KEY idx_qywx_mobile (qywx_mobile)',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
