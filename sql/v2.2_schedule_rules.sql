-- ============================================
-- v2.2 排班规则表
-- 执行时间: 2026-07-03
-- 变更内容: 新增 attendance_schedule_rules + 默认规则
-- ============================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS attendance_schedule_rules (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '规则名称',
  week_config JSON NOT NULL COMMENT '星期配置: 1=周一..7=周日, value=work/rest/biz_trip/leave',
  is_default TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否默认规则',
  created_by INT UNSIGNED NOT NULL COMMENT '创建人（管理员）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='排班规则表';

-- 插入默认规则：做五休二
INSERT INTO attendance_schedule_rules (name, week_config, is_default, created_by)
SELECT '标准排班（做五休二）', '{"1":"work","2":"work","3":"work","4":"work","5":"work","6":"rest","7":"rest"}', 1, (SELECT id FROM users WHERE role IN ('admin','superadmin') AND status='active' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM attendance_schedule_rules WHERE is_default = 1);

SELECT 'v2.2 排班规则表迁移完成!' AS message;
