-- ============================================
-- v3.0_答题模块_扁平化分类(唯一低压电工单层)
-- 目的: 题库不再分层级, 全部题目统一归入「低压电工」单层根分类
-- 迁移操作:
--   1. UP: 把子分类题目/无分类题目全部迁移到低压电工; 删除所有子分类
--   2. DOWN: 仅说明, 数据不可逆, 请迁移前备份
-- 注意: 执行前请备份 exam_questions / exam_categories 两张表
-- ============================================

-- 1. 确保「低压电工」根分类存在
SET @lv := (SELECT id FROM exam_categories WHERE name = '低压电工' AND parent_id = 0 LIMIT 1);
INSERT INTO exam_categories (parent_id, name, cover, question_num, time, path, sort_order, created_at, updated_at)
SELECT 0, '低压电工', NULL, 0, 10, NULL, 0, NOW(), NOW()
WHERE @lv IS NULL;
SET @lv := (SELECT id FROM exam_categories WHERE name = '低压电工' AND parent_id = 0 LIMIT 1);

-- 2. 把「无分类」或「挂在子分类下」的题目全部迁移到低压电工
--    注: 根分类集合 = parent_id=0
UPDATE exam_questions
SET category_id = @lv
WHERE category_id IS NULL
   OR category_id NOT IN (SELECT id FROM exam_categories WHERE parent_id = 0);

-- 3. 删除所有二级分类(此刻已无题目引用, 可安全删除)
DELETE FROM exam_categories WHERE parent_id != 0;

-- 4. 收敛低压电工为唯一单层分类: 去除 path, 确保 parent_id=0
UPDATE exam_categories
SET parent_id = 0, path = NULL
WHERE id = @lv;

-- 5. 校验结果(应返回: 低压电工 1 行, 题目 category_id 全为 @lv)
-- SELECT id, parent_id, name FROM exam_categories;
-- SELECT DISTINCT category_id FROM exam_questions;
