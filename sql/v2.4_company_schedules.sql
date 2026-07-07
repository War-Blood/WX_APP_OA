-- v2.4: 排班表重构 — 从每人每天改为公司级统一排班
-- 日期: 2026-07-07

-- Step 1: 创建公司级排班表
CREATE TABLE IF NOT EXISTS company_schedules (
  schedule_date DATE NOT NULL PRIMARY KEY COMMENT '日期',
  status ENUM('work','rest') NOT NULL DEFAULT 'work' COMMENT 'work=工作日 rest=休息日',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公司统一排班表（工作日/休息日）';

-- Step 2: 迁移旧数据（取每天出现次数最多的状态作为公司状态）
INSERT IGNORE INTO company_schedules (schedule_date, status)
SELECT schedule_date,
  CASE WHEN SUM(CASE WHEN status IN ('rest','leave') THEN 1 ELSE 0 END) > COUNT(*)/2 THEN 'rest' ELSE 'work' END
FROM attendance_schedules
GROUP BY schedule_date;

-- Step 3: 删除旧表
DROP TABLE IF EXISTS attendance_schedules;
