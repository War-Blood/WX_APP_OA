-- ============================================
-- CDK 邀请码系统 v2.0 - 建表脚本
-- 执行时间: 2026-06-22
-- ============================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS invite_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(12) NOT NULL UNIQUE,
  created_by INT NOT NULL,
  used_by INT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CDK邀请码表';

-- 验证建表结果
SELECT 'invite_codes 建表验证:' AS message;
SHOW CREATE TABLE invite_codes;
