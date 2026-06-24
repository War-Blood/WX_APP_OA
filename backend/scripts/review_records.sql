-- ============================================================
-- 审核记录表 (review_records)
-- 用于存储管理员对日报的审核操作记录
-- 关联: daily_reports(id) → review_records(report_id)
-- 关联: users(id) → review_records(reviewer_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS `review_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `report_id` int(11) NOT NULL COMMENT '日报ID',
  `reviewer_id` int(11) NOT NULL COMMENT '审核人ID',
  `action` varchar(20) NOT NULL COMMENT '审核操作: approve/reject',
  `opinion` text DEFAULT NULL COMMENT '审核意见',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_report_id` (`report_id`),
  INDEX `idx_reviewer_id` (`reviewer_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核记录表';
