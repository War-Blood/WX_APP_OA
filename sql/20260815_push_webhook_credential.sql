-- ===================================================
-- v2.6.1: push_webhooks 支持"直接输入 webhook"模式
-- 双凭证来源：
--   direct: 界面直接输入 webhook URL/key（存库、脱敏零回显）
--   env:    引用服务端 .env 凭证（WECOM_ROBOT_<NAME>_KEY/_SECRET，对齐 WPS）
-- 幂等：列不存在才添加，可重复执行。
-- ===================================================

SET NAMES utf8mb4;
SET @dbname = DATABASE();

-- credential_type
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'push_webhooks' AND COLUMN_NAME = 'credential_type') > 0,
  'SELECT ''credential_type exists'' AS message;',
  'ALTER TABLE push_webhooks ADD COLUMN credential_type ENUM(''direct'',''env'') NOT NULL DEFAULT ''direct'' COMMENT ''凭证来源：direct=界面输入存库；env=引用服务端环境变量'' AFTER remark;'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- webhook_key（direct 模式）
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'push_webhooks' AND COLUMN_NAME = 'webhook_key') > 0,
  'SELECT ''webhook_key exists'' AS message;',
  'ALTER TABLE push_webhooks ADD COLUMN webhook_key VARCHAR(128) DEFAULT NULL COMMENT ''direct 模式：企微 webhook key（脱敏零回显）'' AFTER credential_type;'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- secret（direct 模式可选加签密钥）
SET @s = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'push_webhooks' AND COLUMN_NAME = 'secret') > 0,
  'SELECT ''secret exists'' AS message;',
  'ALTER TABLE push_webhooks ADD COLUMN secret VARCHAR(128) DEFAULT NULL COMMENT ''direct 模式：可选加签密钥（有值则发送带 sign）'' AFTER webhook_key;'
));
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 历史数据兼容：原 env 模式记录标记为 env
UPDATE push_webhooks SET credential_type = 'env' WHERE credential_type = 'direct' AND env_name IS NOT NULL AND env_name != '';

-- env_name 允许为空（direct 模式不使用）
ALTER TABLE push_webhooks MODIFY env_name VARCHAR(50) DEFAULT NULL COMMENT 'env 模式：env 引用名（direct 模式为 NULL）';

SELECT 'v2.6.1 push_webhooks 凭证双模式迁移完成!' AS message;
