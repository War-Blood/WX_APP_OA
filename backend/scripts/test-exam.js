'use strict';

/**
 * 答题模块全功能测试脚本(幂等)
 * 覆盖 6 个遗留缺口 + 既有功能(分类/题库/试卷克隆/练习/考试/记录详情/超时/统计)
 * 使用方式: node scripts/test-exam.js
 */

const db = require('../src/common/config/database');
const categoryService = require('../src/features/exam/services/category.service');
const questionService = require('../src/features/exam/services/question.service');
const paperService = require('../src/features/exam/services/paper.service');
const examService = require('../src/features/exam/services/exam.service');
const recordService = require('../src/features/exam/services/record.service');
const examTask = require('../src/common/tasks/exam.task');

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log(`  ✅ ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${extra ? ' — ' + extra : ''}`); }
}

async function main() {
  // ===== 1. 分类 CRUD =====
  console.log('\n[1] 分类 CRUD');
  const tree = await categoryService.list();
  const root = tree.find(c => c.name === '低压电工');
  const children = root ? root.children : [];
  check('分类树:低压电工根存在且 7 个子分类', !!root && children.length === 7, `子分类数=${children.length}`);

  let deleteRejected = false;
  try { await categoryService.remove(root.id); } catch { deleteRejected = true; }
  check('删除有子分类的根分类被拒绝', deleteRejected);

  const newCat = await categoryService.create({ parentId: 0, name: '__测试分类__', sortOrder: 99 });
  await categoryService.update(newCat.id, { name: '__测试分类_改__' });
  const afterUpdate = await categoryService.list();
  check('分类 create + update', afterUpdate.some(c => c.name === '__测试分类_改__'));
  await categoryService.remove(newCat.id);
  const afterDel = await categoryService.list();
  check('分类 delete', !afterDel.some(c => c.id === newCat.id));

  // ===== 2. 题库筛选 =====
  console.log('\n[2] 题库筛选');
  const singleQ = await questionService.list({ type: 'single', pageSize: 100 });
  check('按题型筛选单选', singleQ.list.every(q => q.type === 'single'), `单选题数=${singleQ.total}`);
  const catQ = await questionService.list({ categoryId: 2, pageSize: 100 });
  check('按分类筛选(安全用电)', catQ.total > 0 && catQ.list.every(q => q.category_id === 2), `安全用电题数=${catQ.total}`);
  const kwQ = await questionService.list({ keyword: '安全电压', pageSize: 100 });
  check('按关键词筛选', kwQ.total > 0, `命中=${kwQ.total}`);

  // ===== 3. 建专用测试试卷(发布) =====
  console.log('\n[3] 建专用测试试卷');
  const testQs = await db.query('SELECT id, score FROM exam_questions ORDER BY id ASC LIMIT 30');
  const tp = await paperService.create({
    title: '__功能测试卷__', description: '测试用',
    duration: 30, passScore: 60,
    totalScore: testQs.reduce((s, q) => s + q.score, 0),
    maxAttempts: 3, maxScreenshotWarns: 3, scopeType: 'all',
    questionIds: testQs.map(q => q.id), createdBy: 1,
  });
  await paperService.publish(tp.id);
  const [publishedCheck] = await db.query('SELECT status FROM exam_papers WHERE id = ?', [tp.id]);
  check('测试卷已发布', publishedCheck.status === 'published', `id=${tp.id}, status=${publishedCheck.status}`);

  // ===== 4. 练习(G1 分类 + 判分) =====
  console.log('\n[4] 练习');
  const [emp] = await db.query("SELECT id FROM users WHERE role = 'employee' ORDER BY id ASC LIMIT 1");
  const userId = emp ? emp.id : 1;
  check('存在 employee 用户(否则用 admin)', !!emp, `userId=${userId}`);
  const prac = await examService.startPractice({ userId, categoryId: 2, type: ['single'], count: 5 });
  check('startPractice 按分类抽题', prac.snapshot.length > 0, `题数=${prac.snapshot.length}`);
  const pracAnswers = {};
  prac.snapshot.forEach((q, i) => { pracAnswers[String(q.id)] = i === 0 ? 'X' : q.answer; });
  const pracRes = await examService.submitPractice(userId, prac.recordId, pracAnswers);
  check('submitPractice 判分', pracRes.correctCount === prac.snapshot.length - 1, `正确=${pracRes.correctCount}/${pracRes.totalCount}`);
  check('练习 details 含 type/title/analysis', pracRes.details.length > 0 && !!pracRes.details[0].title && !!pracRes.details[0].type);

  // ===== 5. 正式考试(G4 判分 + details) =====
  console.log('\n[5] 正式考试');
  const exam = await examService.startExam(userId, tp.id);
  check('startExam 快照 + 计时', exam.snapshot.length > 0 && !!exam.serverTime, `题数=${exam.snapshot.length}`);
  const examAnswers = {};
  exam.snapshot.forEach((q, i) => {
    if (i === 0 && q.type === 'single') examAnswers[String(q.id)] = 'WRONG';
    else if (q.type === 'multiple' && q.scoreMode === 'partial') {
      const corrects = q.answer.split(',');
      examAnswers[String(q.id)] = corrects.slice(0, Math.max(1, corrects.length - 1)).join(',');
    } else examAnswers[String(q.id)] = q.answer;
  });
  const examRes = await examService.submitExam(userId, exam.recordId, examAnswers);
  check('submitExam 判分返回 score/isPass/details', examRes.score >= 0 && Array.isArray(examRes.details), `score=${examRes.score}/${examRes.totalScore}, isPass=${examRes.isPass}`);
  check('details 含 type/title/analysis/earnedPoints', examRes.details.length > 0 && !!examRes.details[0].title && !!examRes.details[0].type && 'earnedPoints' in examRes.details[0]);

  // ===== 6. records/detail(G4/G5) =====
  console.log('\n[6] records/detail');
  const detail = await recordService.detail(exam.recordId, userId);
  check('detail 返回逐题明细', detail.details.length === exam.snapshot.length, `明细数=${detail.details.length}`);
  check('detail 的 score 与交卷一致', detail.score === examRes.score, `${detail.score} vs ${examRes.score}`);

  // ===== 7. 超时扫描(G2) =====
  console.log('\n[7] 超时扫描');
  const paperRow = await db.query('SELECT duration FROM exam_papers WHERE id = ?', [tp.id]);
  const duration = paperRow[0].duration;
  const ins = await db.execute(
    `INSERT INTO exam_records (user_id, paper_id, mode, question_snapshot, total_score, server_time, start_time, status)
     VALUES (?, ?, 'exam', '[]', 0, DATE_SUB(NOW(), INTERVAL ? MINUTE), NOW(), 'doing')`,
    [userId, tp.id, duration + 10]
  );
  const fakeId = ins[0].insertId;
  const scanRes = await examTask.scanTimeoutExams();
  check('超时扫描有影响行', scanRes.affected >= 1, `affected=${scanRes.affected}`);
  const fakeAfter = await db.query('SELECT status FROM exam_records WHERE id = ?', [fakeId]);
  check('超时记录置 timeout', fakeAfter[0].status === 'timeout', `status=${fakeAfter[0].status}`);

  // ===== 8. 记录/统计 =====
  console.log('\n[8] 记录/统计');
  const myRec = await recordService.myRecords(userId, { page: 1, pageSize: 10 });
  check('myRecords 返回本人记录', myRec.total >= 1, `条数=${myRec.total}`);
  const allRec = await recordService.allRecords({ page: 1, pageSize: 10 });
  check('allRecords 返回全员记录', allRec.total >= 1, `条数=${allRec.total}`);
  const stat = await recordService.stats(tp.id);
  check('stats 返回统计', stat.total >= 1 && typeof stat.passRate === 'number', `total=${stat.total}, passRate=${stat.passRate}%`);

  // ===== 9. 试卷克隆(G3) =====
  console.log('\n[9] 试卷克隆/版本');
  const [pv] = await db.query('SELECT version FROM exam_papers WHERE id = ?', [tp.id]);
  const beforeVersion = pv.version;
  const someQ = await db.query('SELECT id FROM exam_questions ORDER BY id ASC LIMIT 10');
  const cloneRes = await paperService.update(tp.id, { questionIds: someQ.map(q => q.id) });
  check('改已发布卷自动克隆返回新 id', cloneRes.cloned && cloneRes.id > tp.id, `新id=${cloneRes.id}, v=${cloneRes.version}`);
  const oldAfter = await db.query('SELECT status FROM exam_papers WHERE id = ?', [tp.id]);
  check('旧卷已归档', oldAfter[0].status === 'archived', `旧卷status=${oldAfter[0].status}`);
  check('版本递增', cloneRes.version === beforeVersion + 1, `${beforeVersion}→${cloneRes.version}`);

  if (typeof db.oaPool?.end === 'function') await db.oaPool.end();
  console.log(`\n==== 测试结果: 通过 ${pass} / 失败 ${fail} ====`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('测试脚本异常:', err);
  process.exit(1);
});
