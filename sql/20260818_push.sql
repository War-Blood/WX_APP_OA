-- ===================================================
-- v2.6: 条件化定时消息推送（企微群机器人 Webhook）
-- 表：push_webhooks / push_scripts / push_task_logs
-- 安全：webhook key/secret 仅存服务端 .env（对齐 WPS），
--       本迁移不落任何凭证，push_webhooks.env_name 仅存引用名。
-- 幂等：CREATE TABLE IF NOT EXISTS，可重复执行。
-- ===================================================

SET NAMES utf8mb4;

-- 1. 群机器人配置（无凭证）
CREATE TABLE IF NOT EXISTS push_webhooks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '展示名（如：生产日报群）',
  env_name VARCHAR(50) NOT NULL COMMENT 'env 引用名，对应 WECOM_ROBOT_<env_name>_KEY/_SECRET',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '启用；凭证缺失时强制不可启用',
  remark VARCHAR(255) DEFAULT '' COMMENT '备注',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY uk_env_name (env_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微群机器人配置（凭证存服务端 env）';

-- 2. 推送脚本
CREATE TABLE IF NOT EXISTS push_scripts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '脚本名称',
  description VARCHAR(255) DEFAULT '' COMMENT '描述',
  status ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled' COMMENT '启停',
  schedule_type ENUM('daily','cron') NOT NULL DEFAULT 'daily' COMMENT 'daily=每天固定时间；cron=cron 表达式',
  schedule_value VARCHAR(64) NOT NULL COMMENT 'HH:mm 或 cron 表达式',
  timezone VARCHAR(32) NOT NULL DEFAULT 'Asia/Shanghai' COMMENT '调度时区',
  webhook_id INT UNSIGNED NOT NULL COMMENT '关联 push_webhooks.id',
  msgtype ENUM('text','markdown') NOT NULL DEFAULT 'text' COMMENT '消息类型',
  template_content TEXT NOT NULL COMMENT '消息模板，支持 {{var}}',
  mention_type ENUM('none','all','roles','users') NOT NULL DEFAULT 'none' COMMENT '@ 方式',
  mention_targets JSON DEFAULT NULL COMMENT 'roles=角色数组；users=userId 数组',
  condition_config JSON DEFAULT NULL COMMENT '{logic, rules:[{source,field,operator,value}]}',
  retry_times TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '失败重试次数',
  retry_interval INT UNSIGNED NOT NULL DEFAULT 60 COMMENT '重试间隔秒（指数退避）',
  max_daily_sends INT UNSIGNED NOT NULL DEFAULT 20 COMMENT '每日发送上限',
  consecutive_failures INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '连续失败计数（熔断，内部维护）',
  notify_on_fail TINYINT(1) NOT NULL DEFAULT 1 COMMENT '失败是否站内告警',
  last_run_at DATETIME DEFAULT NULL COMMENT '最近执行时间',
  last_run_status VARCHAR(20) DEFAULT NULL COMMENT '最近执行状态',
  last_error VARCHAR(500) DEFAULT NULL COMMENT '最近错误',
  created_by INT UNSIGNED DEFAULT NULL COMMENT '创建人 userId',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_status (status),
  INDEX idx_webhook (webhook_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='条件化定时推送脚本';

-- 3. 执行日志
CREATE TABLE IF NOT EXISTS push_task_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  script_id INT UNSIGNED NOT NULL COMMENT '关联 push_scripts.id',
  schedule_key VARCHAR(14) NOT NULL COMMENT 'yyyyMMddHHmm 幂等键',
  condition_result ENUM('pass','fail','error') DEFAULT NULL COMMENT '条件判定结果',
  condition_detail JSON DEFAULT NULL COMMENT '逐条条件判定明细',
  rendered_content TEXT DEFAULT NULL COMMENT '渲染后的消息体',
  mention_detail JSON DEFAULT NULL COMMENT '@ 目标（手机号/userid 脱敏）',
  send_status ENUM('success','failed','skipped','condition_fail') NOT NULL DEFAULT 'skipped' COMMENT '最终状态',
  attempts JSON DEFAULT NULL COMMENT '每次发送尝试（http_status/响应截断/error/耗时）',
  error_message VARCHAR(500) DEFAULT NULL COMMENT '最终错误',
  duration_ms INT UNSIGNED DEFAULT NULL COMMENT '总耗时毫秒',
  created_at DATETIME DEFAULT NOW(),
  UNIQUE KEY uk_script_schedule (script_id, schedule_key),
  INDEX idx_created_at (created_at),
  INDEX idx_send_status (send_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推送执行日志';
