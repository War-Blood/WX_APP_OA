-- ============================================
-- 考勤功能模块 v2.1 - 数据库迁移脚本
-- 执行时间: 2026-06-29
-- 变更内容: 新增 2 张考勤相关表
-- 幂等设计: IF NOT EXISTS，可重复执行
-- ============================================

SET NAMES utf8mb4;

-- ============================================
-- 1. 排班日历表
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_schedules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL COMMENT '被排班人员',
  schedule_date DATE NOT NULL COMMENT '排班日期',
  status ENUM('work','rest','biz_trip','leave') NOT NULL DEFAULT 'work' COMMENT 'work=上班 rest=休息 biz_trip=出差 leave=请假',
  note VARCHAR(200) DEFAULT NULL COMMENT '备注',
  created_by INT UNSIGNED NOT NULL COMMENT '排班操作人(管理员)',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE KEY uk_user_date (user_id, schedule_date),
  INDEX idx_schedule_date (schedule_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排班日历表';

-- ============================================
-- 2. 请假申请 + 出差打卡表
--    leave: 日期范围申请（start_date/end_date/days）
--    biz_trip: 两次打卡（trip_started_at/trip_ended_at）
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_leave_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  applicant_id INT UNSIGNED NOT NULL COMMENT '申请人',
  request_type ENUM('biz_trip','leave') NOT NULL COMMENT 'biz_trip=出差 leave=请假',

  -- 请假专用字段
  leave_subtype VARCHAR(20) DEFAULT NULL COMMENT 'annual/sick/personal/marriage/other',
  start_date DATE DEFAULT NULL COMMENT '请假起始日期',
  end_date DATE DEFAULT NULL COMMENT '请假结束日期',
  days DECIMAL(5,1) DEFAULT NULL COMMENT '请假天数（含半天）',

  -- 出差专用字段
  trip_started_at DATETIME DEFAULT NULL COMMENT '出差开始时间',
  trip_ended_at DATETIME DEFAULT NULL COMMENT '出差结束时间（NULL=进行中）',

  -- 通用字段
  reason TEXT DEFAULT NULL COMMENT '申请事由/出差备注',
  status ENUM('active','cancelled','in_progress','ended') NOT NULL COMMENT 'active=生效 cancelled=已撤销 in_progress=出差中 ended=已结束',
  source ENUM('admin','self') NOT NULL DEFAULT 'self' COMMENT 'admin=管理员 self=自助',
  cancelled_at DATETIME DEFAULT NULL COMMENT '撤销时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (applicant_id) REFERENCES users(id),
  INDEX idx_applicant_status (applicant_id, status),
  INDEX idx_request_type (request_type),
  INDEX idx_date_range (start_date, end_date),
  INDEX idx_trip_status (status, trip_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='请假申请+出差打卡表';

-- ============================================
-- 迁移验证
-- ============================================
SELECT 'v2.1 考勤模块迁移完成!' AS message;

SELECT TABLE_NAME, TABLE_COMMENT
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('attendance_schedules','attendance_leave_requests')
ORDER BY TABLE_NAME;
