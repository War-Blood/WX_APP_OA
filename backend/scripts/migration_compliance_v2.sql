-- ============================================================
-- 合规模块 v2 迁移
-- 核心变化:
--   1. report_compliance 改为按项目维度 (report_id 可 NULL)
--   2. 新增 worker_compliance 表 (展开到人员维度)
-- ============================================================

USE wx_app_oa;

-- 1. 删除旧表 (当前 0 条数据，安全)
DROP TABLE IF EXISTS report_compliance;

-- 2. 重建 report_compliance (项目维度)
CREATE TABLE report_compliance (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  report_id BIGINT NULL COMMENT '关联日报ID(缺失时为NULL)',
  project VARCHAR(255) NOT NULL COMMENT '项目名称',
  workers TEXT COMMENT '作业人员列表',
  report_date DATE NOT NULL COMMENT '日报日期',
  timeliness ENUM('on_time','delayed','missing') NOT NULL DEFAULT 'on_time' COMMENT '及时性',
  submit_time DATETIME NULL COMMENT '实际提交时间',
  expected_deadline DATETIME NOT NULL COMMENT '期望截止时间(当日24:00)',
  is_auto_approved TINYINT(1) DEFAULT 0 COMMENT '是否自动审核通过',
  reviewer_id BIGINT NULL COMMENT '审核人ID',
  reviewed_at DATETIME NULL COMMENT '审核时间',
  review_comment TEXT COMMENT '审核意见',
  reminder_sent TINYINT(1) DEFAULT 0 COMMENT '是否已发送提醒',
  reminder_count INT DEFAULT 0 COMMENT '提醒次数',
  last_reminder_at DATETIME NULL COMMENT '最后提醒时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_project_date (project, report_date),
  KEY idx_project (project),
  KEY idx_timeliness (timeliness),
  KEY idx_report_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='日志合规记录表(项目维度)';

-- 3. 新建 worker_compliance (人员维度)
CREATE TABLE IF NOT EXISTS worker_compliance (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
  compliance_id BIGINT NOT NULL COMMENT 'FK to report_compliance.id',
  worker_name VARCHAR(100) NOT NULL COMMENT '单个作业人员姓名',
  report_date DATE NOT NULL COMMENT '日报日期',
  timeliness ENUM('on_time','delayed','missing') NOT NULL COMMENT '及时性',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_worker_date (worker_name, report_date),
  KEY idx_compliance_id (compliance_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='人员合规明细表';
