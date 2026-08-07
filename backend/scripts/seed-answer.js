'use strict';

const path = require('path');
const fs = require('fs');
const db = require('../src/common/config/database');
const categoryService = require('../src/features/exam/services/category.service');
const questionService = require('../src/features/exam/services/question.service');

/**
 * 答题模块种子脚本 — 低压电工题库
 * 幂等: 已存在「低压电工」根分类时跳过
 */

async function seed() {
  const seedPath = path.join(__dirname, '../sql/exam_seed_low_voltage.json');
  const questions = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  // 幂等检查
  const [existing] = await db.query(
    "SELECT id FROM exam_categories WHERE name = '低压电工' AND parent_id = 0 LIMIT 1"
  );
  if (existing) {
    console.log('低压电工分类已存在, 跳过种子');
    await db.oaPool.end();
    return;
  }

  // 1. 建根分类 + 子分类
  const { id: rootId } = await categoryService.create({ name: '低压电工', time: 10 });
  const catNameMap = {};
  const catIds = {};
  const distinctNames = [...new Set(questions.map((q) => q.category))];
  for (const name of distinctNames) {
    const { id } = await categoryService.create({ parentId: rootId, name, time: 10 });
    catIds[name] = id;
    catNameMap[id] = name;
  }
  console.log(`分类树已建: 低压电工(${rootId}) + ${distinctNames.length} 个子分类`);

  // 2. 按分类注入 categoryId 并批量导入
  const normalized = questions.map((q) => ({ ...q, categoryId: catIds[q.category] }));
  const result = await questionService.batchImport(normalized, 1);
  console.log(`题库导入完成: 成功 ${result.success}, 失败 ${result.failed}`);
  result.errors.forEach((e) => console.log(`  第${e.row}行: ${e.reason}`));

  await db.oaPool.end();
  console.log('种子完成');
}

seed().catch((err) => {
  console.error('种子失败:', err.message);
  process.exit(1);
});
