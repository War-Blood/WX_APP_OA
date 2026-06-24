-- ============================================================
-- 日报数据修复脚本
-- 用途：检查并修复 daily_reports 表中可能的字段映射错误
-- 场景：历史上可能存在 tomorrow_plan 与 remark 数据混淆
-- 日期：2026-06-22
-- ============================================================

-- ⚠️ 执行前建议先备份：
--   CREATE TABLE daily_reports_backup_20260622 AS SELECT * FROM daily_reports;

-- ============================================================
-- 1. 诊断查询 — 检查 remark 中是否混入了明日计划类数据
-- （明日计划通常较长，包含具体工作描述；备注通常较短）
-- ============================================================

-- 1a. 查看 remark 异常长的记录（可能混入明日计划）
SELECT
  id,
  report_date,
  user_id,
  CHAR_LENGTH(remark) AS remark_len,
  CHAR_LENGTH(tomorrow_plan) AS tomorrow_plan_len,
  LEFT(remark, 80) AS remark_preview,
  LEFT(tomorrow_plan, 80) AS tomorrow_plan_preview
FROM daily_reports
WHERE remark IS NOT NULL
  AND CHAR_LENGTH(remark) > 200
  AND (tomorrow_plan IS NULL OR CHAR_LENGTH(tomorrow_plan) = 0)
ORDER BY CHAR_LENGTH(remark) DESC
LIMIT 20;

-- 1b. 检查 tomorrow_plan 与 remark 内容是否疑似互换
-- （remark 包含"计划"、"明日"等关键字）
SELECT
  id,
  report_date,
  user_id,
  LEFT(remark, 100) AS remark_preview,
  LEFT(tomorrow_plan, 100) AS tomorrow_plan_preview
FROM daily_reports
WHERE remark IS NOT NULL
  AND (remark LIKE '%明日%' OR remark LIKE '%计划%' OR remark LIKE '%明天%')
  AND tomorrow_plan IS NULL
LIMIT 20;

-- ============================================================
-- 2. 修复操作（请根据诊断结果选择性执行）
-- ============================================================

-- 2a. 如果 tomorrow_plan 为空但 remark 包含明日计划数据：
--     将 remark 中疑似明日计划的内容移动到 tomorrow_plan
-- ⚠️ 请先运行诊断查询1b确认后再执行
/*
UPDATE daily_reports
SET
  tomorrow_plan = remark,
  remark = NULL
WHERE remark IS NOT NULL
  AND (remark LIKE '%明日%' OR remark LIKE '%计划%' OR remark LIKE '%明天%')
  AND (tomorrow_plan IS NULL OR CHAR_LENGTH(tomorrow_plan) = 0)
  AND CHAR_LENGTH(remark) > 10;
*/

-- 2b. 如果 tomorrow_plan 和 remark 内容互换了：
--     交换两个字段的内容
-- ⚠️ 请先手动确认需要修复的记录ID列表
/*
UPDATE daily_reports
SET
  remark = @tmp := remark,
  remark = tomorrow_plan,
  tomorrow_plan = @tmp
WHERE id IN (/* 填入需要修复的ID列表 */);
*/

-- ============================================================
-- 3. content 字段说明
-- v2.0 中 content 列已改为存储「需协调事项」(coordination) 数据
-- 旧数据中 content 列可能存有旧的日报正文，如无需要可忽略
-- ============================================================

-- 检查 content 列中是否仍有旧版日报正文（通常较长）
SELECT
  id,
  report_date,
  CHAR_LENGTH(content) AS content_len,
  LEFT(content, 100) AS content_preview
FROM daily_reports
WHERE content IS NOT NULL
  AND CHAR_LENGTH(content) > 500
  AND report_date < '2025-01-01'
LIMIT 20;

-- ============================================================
-- 4. 验证查询 — 确认修复后数据完整性
-- ============================================================

-- 统计各字段非空记录数
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN tomorrow_plan IS NOT NULL AND tomorrow_plan != '' THEN 1 ELSE 0 END) AS has_tomorrow_plan,
  SUM(CASE WHEN remark IS NOT NULL AND remark != '' THEN 1 ELSE 0 END) AS has_remark,
  SUM(CASE WHEN content IS NOT NULL AND content != '' THEN 1 ELSE 0 END) AS has_content,
  SUM(CASE WHEN issues IS NOT NULL AND issues != '' THEN 1 ELSE 0 END) AS has_issues
FROM daily_reports;

-- 检查 remark 和 tomorrow_plan 内容完全相同的记录（异常）
SELECT COUNT(*) AS duplicate_count
FROM daily_reports
WHERE remark IS NOT NULL
  AND tomorrow_plan IS NOT NULL
  AND remark = tomorrow_plan
  AND remark != '';
