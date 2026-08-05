'use strict';

/**
 * 低压电工题库种子脚本
 * 建分类树 → 导入 sql/exam_seed_low_voltage.json → 建示例试卷
 * 使用方式: node scripts/seed-exam.js
 */

const path = require('path');
const db = require('../src/common/config/database');
const categoryService = require('../src/features/exam/services/category.service');
const questionService = require('../src/features/exam/services/question.service');
const paperService = require('../src/features/exam/services/paper.service');

async function main() {
  // 幂等保护:已存在低压电工分类则跳过
  const [existing] = await db.query("SELECT id FROM exam_categories WHERE name = '低压电工' LIMIT 1");
  if (existing) {
    console.error('低压电工分类已存在,跳过(如需重导请先清理 exam_categories/exam_questions/exam_papers 数据)');
    process.exit(0);
  }

  // 1. 找 admin 用户
  const [admin] = await db.query(
    "SELECT id FROM users WHERE role IN ('admin','superadmin') ORDER BY id ASC LIMIT 1"
  );
  if (!admin) {
    console.error('未找到 admin/superadmin 用户');
    process.exit(1);
  }
  const adminId = admin.id;
  console.log('[1] admin 用户 id:', adminId);

  // 2. 建分类树:低压电工 → 7 个子分类
  const root = await categoryService.create({ parentId: 0, name: '低压电工', sortOrder: 1 });
  const subNames = ['安全用电', '触电急救', '电气设备', '保护装置', '临时用电与防雷', '工具仪表与照明', '综合规范'];
  const catMap = {};
  for (const name of subNames) {
    const c = await categoryService.create({ parentId: root.id, name, sortOrder: 1 });
    catMap[name] = c.id;
  }
  console.log('[2] 分类已建,根:', root.id, '子分类:', JSON.stringify(catMap));

  // 3. 读题库 JSON,映射分类后批量导入(验证 batch-import 容错)
  const raw = require(path.join(__dirname, '..', '..', 'sql', 'exam_seed_low_voltage.json'));
  const questions = raw.map(q => ({
    categoryId: catMap[q.category],
    type: q.type,
    title: q.title,
    options: q.options,
    answer: q.answer,
    analysis: q.analysis,
    score: q.score,
    scoreMode: q.scoreMode,
  }));
  const result = await questionService.batchImport(questions, adminId);
  console.log('[3] 批量导入结果:', JSON.stringify(result));
  if (result.failed > 0) {
    console.error('[3] 失败明细:', JSON.stringify(result.errors));
  }

  // 4. 建示例试卷(取前 30 题)
  const paperQuestions = await db.query('SELECT id, score FROM exam_questions ORDER BY id ASC LIMIT 30');
  if (paperQuestions.length === 0) {
    console.error('[4] 无可用题目,跳过建卷');
    process.exit(0);
  }
  const paper = await paperService.create({
    title: '低压电工模拟考试',
    description: '低压电工特种作业操作证模拟考试(种子数据)',
    duration: 30,
    passScore: 60,
    totalScore: paperQuestions.reduce((s, q) => s + q.score, 0),
    maxAttempts: 3,
    maxScreenshotWarns: 3,
    scopeType: 'all',
    questionIds: paperQuestions.map(q => q.id),
    createdBy: adminId,
  });
  await paperService.publish(paper.id);
  console.log('[4] 示例试卷已发布: id=', paper.id, '题数=', paperQuestions.length);

  if (typeof db.oaPool?.end === 'function') await db.oaPool.end();
  console.log('✅ 低压电工题库种子完成');
}

main().catch(err => {
  console.error('种子脚本失败:', err);
  process.exit(1);
});
