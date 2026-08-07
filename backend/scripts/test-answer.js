'use strict';

/**
 * 答题模块端到端测试脚本（services 直接调用, 幂等, 完成后清理）
 * 运行: cd backend && node scripts/test-answer.js
 */

const db = require('../src/common/config/database');
const categoryService = require('../src/features/exam/services/category.service');
const questionService = require('../src/features/exam/services/question.service');
const examService = require('../src/features/exam/services/exam.service');
const paperService = require('../src/features/exam/services/paper.service');
const recordService = require('../src/features/exam/services/record.service');
const rankService = require('../src/features/exam/services/rank.service');
const wrongService = require('../src/features/exam/services/wrong.service');
const favoriteService = require('../src/features/exam/services/favorite.service');
const settingService = require('../src/features/exam/services/setting.service');

let passCount = 0;
let failCount = 0;

function check(name, cond, extra = '') {
  if (cond) { passCount++; console.log(`  ✅ ${name}`); }
  else { failCount++; console.log(`  ❌ ${name} ${extra}`); }
}

async function main() {
  // 取一个在职用户作为测试身份
  const [testUser] = await db.query(
    "SELECT id FROM users WHERE status = 'active' ORDER BY id LIMIT 1"
  );
  const userId = testUser ? testUser.id : 1;
  console.log(`测试用户: ${userId}`);

  // 1. 设置读写
  console.log('\n[1] 答题设置');
  await settingService.update([{ key: 'use_learn', value: '1' }, { key: 'check_user', value: '1' }]);
  const settings = await settingService.get();
  check('use_learn=1', settings.use_learn === '1');
  check('check_user=1', settings.check_user === '1');

  // 2. 临时分类 + 题目
  console.log('\n[2] 分类/题库');
  const { id: catId } = await categoryService.create({ name: '__test_answer', time: 10 });
  const { id: catChildId } = await categoryService.create({ parentId: catId, name: '__test_child', time: 5 });
  const q1 = await questionService.create({ categoryId: catChildId, type: 'single', title: '测试单选', options: [{ key: 'A', text: '对' }, { key: 'B', text: '错' }], answer: 'A', score: 2 });
  const q2 = await questionService.create({ categoryId: catChildId, type: 'multiple', title: '测试多选', options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }, { key: 'C', text: 'c' }], answer: 'A,B', score: 4, scoreMode: 'partial' });
  const q3 = await questionService.create({ categoryId: catChildId, type: 'judge', title: '测试判断', options: [{ key: 'A', text: '正确' }, { key: 'B', text: '错误' }], answer: 'A', score: 2 });
  check('创建3题', !!q1.id && !!q2.id && !!q3.id);

  const tree = await categoryService.list();
  check('分类树含测试分类', JSON.stringify(tree).includes('__test_answer'));

  // 3. 练习
  console.log('\n[3] 练习');
  const learn = await examService.startLearn({ userId, categoryId: catId, mode: 'random', count: 3 });
  check('练习抽题3道且不含答案', learn.snapshot.length === 3 && learn.snapshot[0].answer === undefined);
  const answers1 = {};
  learn.snapshot.forEach((q) => { answers1[q.id] = q.answer === 'A' ? 'A' : q.options[0].key; });
  const learnRes = await examService.submitLearn(userId, learn.recordId, answers1);
  check('练习判分', learnRes.score >= 0 && learnRes.details.length === 3);

  const back = await examService.startLearn({ userId, categoryId: catId, mode: 'order', count: 2, backMemorize: true });
  check('背题模式返回答案', back.snapshot[0].answer !== undefined && back.recordId === undefined);

  // 4. 模拟考试
  console.log('\n[4] 模拟考试');
  const mock = await examService.startTimed(userId, catId, 'mock');
  check('模拟抽题+快照', mock.snapshot.length > 0 && mock.duration === 10);
  const answers2 = {};
  mock.snapshot.forEach((q) => { answers2[q.id] = q.options[0].key; });
  const mockRes = await examService.submitTimed(userId, mock.recordId, answers2, 'mock');
  check('模拟交卷判分', mockRes.status === 'submitted' && mockRes.score >= 0);

  // 5. 正式考试 + 进度保存
  console.log('\n[5] 正式考试');
  const exam = await examService.startTimed(userId, catId, 'exam');
  check('考试抽题', exam.snapshot.length > 0 && exam.remainingSeconds === 600);
  await examService.saveProgress(userId, exam.recordId, {});
  const resumed = await examService.startTimed(userId, catId, 'exam');
  check('断线恢复', resumed.resumed === true && resumed.recordId === exam.recordId);
  const answers3 = {};
  exam.snapshot.forEach((q) => { answers3[q.id] = q.options[0].key; });
  const examRes = await examService.submitTimed(userId, exam.recordId, answers3, 'exam');
  check('考试交卷', examRes.status === 'submitted');

  // 5.5 试卷制正式考试(企业内部考核 P0)
  console.log('\n[5.5] 试卷制考试');
  const { id: paperId } = await paperService.create({
    title: '__test_paper', duration: 10, passScore: 60, maxAttempts: 2,
    scopeType: 'all', questionIds: [q1.id, q2.id, q3.id], createdBy: userId,
  });
  await paperService.publish(paperId);
  const availableList = await paperService.available(userId);
  check('可参加列表含试卷', availableList.some(p => p.paperId === paperId && p.canTake === true));
  const paperExam = await examService.startPaperExam(userId, paperId);
  check('按卷开始考试', paperExam.snapshot.length === 3 && paperExam.duration === 10);
  const paperAnswers = {};
  paperExam.snapshot.forEach((q) => { paperAnswers[q.id] = q.options[0].key; });
  const paperRes = await examService.submitTimed(userId, paperExam.recordId, paperAnswers, 'exam');
  check('按卷交卷判分', paperRes.status === 'submitted' && paperRes.score >= 0);
  const p2 = await examService.startPaperExam(userId, paperId);
  const p2Res = await examService.submitTimed(userId, p2.recordId, paperAnswers, 'exam');
  check('第二次可考(次数内)', p2Res.status === 'submitted');
  try {
    await examService.startPaperExam(userId, paperId);
    check('第三次达上限被拒', false);
  } catch (e) {
    check('第三次达上限被拒', true);
  }

  // 6. 记录/详情/排行
  console.log('\n[6] 记录/排行');
  const my = await recordService.myRecords(userId, { page: 1, pageSize: 10 });
  check('我的记录≥2(考试+模拟)', my.total >= 2);
  const detail = await recordService.detail(exam.recordId, userId);
  check('记录详情逐题', detail.details.length > 0 && detail.categoryName !== undefined);
  const rank = await rankService.rank(catId);
  check('排行榜', Array.isArray(rank));
  const all = await recordService.allRecords({ page: 1, pageSize: 10 });
  check('全员记录', all.total >= 1);

  // 7. 错题/收藏
  console.log('\n[7] 错题/收藏');
  const wrong = await wrongService.list(userId, { page: 1, pageSize: 20 });
  check('错题列表(有数据或空)', wrong.total >= 0);
  const fav = await favoriteService.toggle(userId, q3.id);
  check('收藏成功', fav.favorited === true);
  const favList = await favoriteService.list(userId, { page: 1, pageSize: 20 });
  check('收藏列表含题目', favList.list.some((f) => f.questionId === q3.id));
  const favOff = await favoriteService.toggle(userId, q3.id);
  check('取消收藏', favOff.favorited === false);

  // 8. 超时扫描 + 导出
  console.log('\n[8] 超时/导出');
  const timed = await examService.scanTimeoutExams();
  check('超时扫描执行', typeof timed === 'number');
  const exportRes = await recordService.exportRecords({ categoryId: catId });
  check('CSV导出含BOM与表头', exportRes.csv.startsWith('﻿') && exportRes.csv.includes('姓名'));

  // 9. 统计看板
  const overview = await recordService.overview({ categoryId: catId });
  check('统计看板', overview.total >= 0 && overview.people >= 0);

  // 清理测试数据
  console.log('\n[9] 清理');
  await db.execute('DELETE FROM exam_records WHERE category_id IN (?, ?)', [catId, catChildId]);
  await db.execute('DELETE FROM exam_questions WHERE category_id IN (?, ?)', [catId, catChildId]);
  await db.execute('DELETE FROM exam_categories WHERE id IN (?, ?)', [catChildId, catId]);
  await db.execute("DELETE FROM exam_wrong_questions WHERE user_id = ? AND question_id IN (?, ?, ?)", [userId, q1.id, q2.id, q3.id]);
  if (paperId) {
    await db.execute('DELETE FROM exam_records WHERE paper_id = ?', [paperId]);
    await db.execute('DELETE FROM exam_papers WHERE id = ?', [paperId]);
  }
  console.log('  ✅ 测试数据已清理');

  console.log(`\n结果: ${passCount} 通过, ${failCount} 失败`);
  await db.oaPool.end();
  process.exit(failCount ? 1 : 0);
}

main().catch((err) => {
  console.error('测试异常:', err);
  process.exit(1);
});
