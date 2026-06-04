-- ============================================
-- 公出日志合规管理 - Phase 1 数据库迁移脚本
-- 创建3张新表: biz_trip_status, report_compliance, user_compliance_stats
-- 执行时间: 2026-06-03
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 表1: biz_trip_status (出差状态表)
-- 用途: 记录员工出差状态,用于自动判断是否需要提交日报
-- ============================================
DROP TABLE IF EXISTS `biz_trip_status`;

CREATE TABLE `biz_trip_status` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint(20) NOT NULL COMMENT '员工ID',
  `project_name` varchar(255) DEFAULT NULL COMMENT '项目名称',
  `start_date` date NOT NULL COMMENT '出差开始日期',
  `end_date` date DEFAULT NULL COMMENT '出差结束日期(NULL表示进行中)',
  `status` enum('active','completed','cancelled') DEFAULT 'active' COMMENT '状态: active-进行中, completed-已结束, cancelled-已取消',
  `created_by` bigint(20) DEFAULT NULL COMMENT '创建人ID(管理员)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工出差状态表';

-- ============================================
-- 表2: report_compliance (日志合规记录表)
-- 用途: 记录每条日报的合规性信息(及时性、审核状态等)
-- ============================================
DROP TABLE IF EXISTS `report_compliance`;

CREATE TABLE `report_compliance` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `report_id` bigint(20) NOT NULL COMMENT '日报ID(关联daily_reports.id)',
  `user_id` bigint(20) NOT NULL COMMENT '员工ID',
  `report_date` date NOT NULL COMMENT '日报日期',
  `timeliness` enum('on_time','delayed','missing') DEFAULT 'on_time' COMMENT '及时性: on_time-准时, delayed-延迟, missing-缺失',
  `submit_time` datetime DEFAULT NULL COMMENT '实际提交时间',
  `expected_deadline` datetime NOT NULL COMMENT '期望截止时间(当日24:00)',
  `is_auto_approved` tinyint(1) DEFAULT '0' COMMENT '是否自动审核通过(1-是, 0-否)',
  `reviewer_id` bigint(20) DEFAULT NULL COMMENT '审核人ID(仅缺失报告需要)',
  `reviewed_at` datetime DEFAULT NULL COMMENT '审核时间',
  `review_comment` text DEFAULT NULL COMMENT '审核意见',
  `reminder_sent` tinyint(1) DEFAULT '0' COMMENT '是否已发送提醒(1-是, 0-否)',
  `reminder_count` int(11) DEFAULT '0' COMMENT '提醒次数',
  `last_reminder_at` datetime DEFAULT NULL COMMENT '最后提醒时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_id` (`report_id`),
  KEY `idx_user_date` (`user_id`, `report_date`),
  KEY `idx_timeliness` (`timeliness`),
  KEY `idx_report_date` (`report_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日志合规记录表';

-- ============================================
-- 表3: user_compliance_stats (用户合规统计表)
-- 用途: 按月聚合统计每个用户的合规情况
-- ============================================
DROP TABLE IF EXISTS `user_compliance_stats`;

CREATE TABLE `user_compliance_stats` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint(20) NOT NULL COMMENT '员工ID',
  `stat_month` varchar(7) NOT NULL COMMENT '统计月份(YYYY-MM)',
  `total_reports` int(11) DEFAULT '0' COMMENT '应提交总数',
  `on_time_count` int(11) DEFAULT '0' COMMENT '准时提交数',
  `delayed_count` int(11) DEFAULT '0' COMMENT '延迟提交数',
  `missing_count` int(11) DEFAULT '0' COMMENT '缺失报告数',
  `on_time_rate` decimal(5,2) DEFAULT '0.00' COMMENT '及时率(%)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_month` (`user_id`, `stat_month`),
  KEY `idx_stat_month` (`stat_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户合规统计表(按月聚合)';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 迁移完成提示
-- ============================================
SELECT 'Phase 1 建表迁移执行成功!' AS message;
SELECT COUNT(*) AS biz_trip_status_count FROM biz_trip_status;
SELECT COUNT(*) AS report_compliance_count FROM report_compliance;
SELECT COUNT(*) AS user_compliance_stats_count FROM user_compliance_stats;
