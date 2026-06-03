-- ============================================================
-- daily_reports 表扩展 ALTER 脚本
-- 适用数据库：daily_report（旧库）
-- 说明：为日报表补充完整字段，支持 Report 模块完整表单数据存储
-- ============================================================

ALTER TABLE daily_reports
  ADD COLUMN `project` varchar(255) DEFAULT NULL COMMENT '项目名称',
  ADD COLUMN `area` varchar(255) DEFAULT NULL COMMENT '项目区域',
  ADD COLUMN `today_work_type` varchar(50) DEFAULT NULL COMMENT '今日工作类型(工作/待工/在途)',
  ADD COLUMN `tomorrow_work_type` varchar(50) DEFAULT NULL COMMENT '明日工作类型',
  ADD COLUMN `work_content` varchar(500) DEFAULT NULL COMMENT '从事工作内容',
  ADD COLUMN `workers` varchar(255) DEFAULT NULL COMMENT '作业人员',
  ADD COLUMN `machine_model` varchar(100) DEFAULT NULL COMMENT '机型',
  ADD COLUMN `worker_count` int(11) DEFAULT '0' COMMENT '人数',
  ADD COLUMN `required_qty` int(11) DEFAULT '0' COMMENT '需要完成数量',
  ADD COLUMN `completed_qty` int(11) DEFAULT '0' COMMENT '累计完成数量',
  ADD COLUMN `progress_percent` int(11) DEFAULT '0' COMMENT '进度百分比',
  ADD COLUMN `remark` text DEFAULT NULL COMMENT '备注',
  ADD COLUMN `entry_date` date DEFAULT NULL COMMENT '入场时间',
  ADD COLUMN `initial_biz_trip_date` date DEFAULT NULL COMMENT '初始出差时间',
  ADD COLUMN `related_party` varchar(255) DEFAULT NULL COMMENT '相关方单位',
  ADD COLUMN `personal_biz_trip_days` int(11) DEFAULT '0' COMMENT '个人累计出差天数',
  ADD COLUMN `files` json DEFAULT NULL COMMENT '附件文件列表',
  ADD COLUMN `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  ADD INDEX `idx_status` (`status`),
  ADD INDEX `idx_report_date` (`report_date`),
  ADD INDEX `idx_user_date` (`user_id`, `report_date`);
