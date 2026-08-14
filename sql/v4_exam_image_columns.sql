-- ============================================
-- v4.0_答题模块_题目图片字段
-- 目的: 题目支持部分图片(题干/解析), 选项图片扩展于 options JSON 内 image 字段
-- 存储: backend/uploads/question/, 访问 /uploads/question/<uuid>.<ext>
-- 迁移操作:
--   1. UP: exam_questions 增加 title_image / analysis_image 两列(幂等)
--   2. DOWN: 仅说明, 图片列可 DROP(数据即图片URL, 删除不影响题目文本)
-- ============================================

-- 1. 题干图片(可选)
ALTER TABLE `exam_questions` ADD COLUMN IF NOT EXISTS `title_image` VARCHAR(500) DEFAULT NULL COMMENT '题干图片URL (可选)' AFTER `analysis`;

-- 2. 解析图片(可选)
ALTER TABLE `exam_questions` ADD COLUMN IF NOT EXISTS `analysis_image` VARCHAR(500) DEFAULT NULL COMMENT '解析图片URL (可选)' AFTER `title_image`;

-- 3. 选项图片: 不新增列, options JSON 每项支持可选 image 字段, 如 {"key":"A","text":"...","image":"/uploads/question/xx.jpg"}

-- 附: v3 扁平化后续可选清理(本期保留列以降低风险)
-- ALTER TABLE `exam_categories` DROP COLUMN `parent_id`;
-- ALTER TABLE `exam_categories` DROP COLUMN `path`;
