-- ===================================================
-- v2.2: 企业微信智能表格导出记录表
-- 用于存储 daily_report → WeCom smart sheet record_id 映射
-- 实现导出时「先删旧 → 再写新」的增量更新
-- ===================================================

CREATE TABLE IF NOT EXISTS wecom_sheet_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  daily_report_id INT UNSIGNED NOT NULL COMMENT '关联 daily_reports.id',
  record_id VARCHAR(64) NOT NULL COMMENT '企微智能表格记录 ID',
  exported_at DATETIME DEFAULT NOW() COMMENT '导出时间',
  UNIQUE KEY uk_daily_report (daily_report_id),
  INDEX idx_record_id (record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微智能表格导出记录';
