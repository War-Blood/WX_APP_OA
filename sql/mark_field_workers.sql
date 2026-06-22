-- ============================================
-- 作业人员批量标记 SQL
-- 用途: 将所有在职花名册人员标记为作业人员
-- 说明: 执行前需确认人员名单，按需修改 WHERE 条件
-- ============================================

-- 方案1: 标记所有花名册在职人员为作业人员
UPDATE users
SET is_field_worker = 1, updated_at = NOW()
WHERE worker_status = 'active'
  AND deleted_at IS NULL
  AND role = 'employee';

-- 验证结果
SELECT id, user_name, worker_code, is_field_worker
FROM users
WHERE worker_status = 'active' AND deleted_at IS NULL
ORDER BY role, id;

-- 方案2: 仅标记指定人员（取消注释并修改名单）
-- UPDATE users SET is_field_worker = 1, updated_at = NOW()
-- WHERE worker_code IN ('BL001', 'BL002', 'BL003');

-- 取消标记某人员为作业人员：
-- UPDATE users SET is_field_worker = 0, updated_at = NOW()
-- WHERE worker_code = 'xxx';
