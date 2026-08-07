# 04 — 业务逻辑

## 状态机

```
练习 (learn):  不持久化记录（submit 后删除）
  开始 ──抽题──► 作答 ──提交──► 判分 ──► 成绩/错题归集 ──► 结束(记录删除)

考试/模拟 (exam/mock):  记录持久化
  start ──► doing ──(save-progress)──► doing
              │
              ├── submit ──► submitted ──► 成绩/错题归集
              └── 超时扫描(每5min) ──► timeout
```

记录状态 `exam_records.status`：`doing` → `submitted` | `timeout`。

## 业务规则

### R1 抽题规则

```
入参: categoryId, mode('order'|'random'|'special'|'type'), type?, count?, backMemorize?
1. 取分类子树: children = SELECT id FROM exam_categories WHERE parent_id = categoryId
   题目范围 = category_id IN (categoryId + children)
2. 候选池 = SELECT * FROM exam_questions
   WHERE status='active' [AND type=?] [AND category_id IN (...)]
3. 抽题:
   - order    → ORDER BY id LIMIT count（顺序）
   - random   → ORDER BY RAND() LIMIT count（随机，考试/模拟默认）
   - special  → 按分类子树顺序取题（专项）
   - type     → 按 type 过滤后 ORDER BY RAND() LIMIT count（题型）
4. count 缺省 = 分类.question_num（无则 20）；count > 候选池则取全部
5. 组装快照:
   - 每题 { id, type, title, options, score, scoreMode }
   - backMemorize=1（背题模式）→ 额外带 answer；否则 answer 隐藏
   - 考试/模拟 → 快照写入 exam_records.question_snapshot（判分基于快照内 answer）
   - 练习 → 快照仅返回到前端，不落库（记录会删除）
6. shuffle_options=1 的题目 → 选项打乱，answer 键随打乱重映射
```

### R2 判分规则

```
对每题:
- single / judge: userAnswer === answer → 正确
- multiple:
  - score_mode='exact'   → 用户选项集合与答案集合完全一致才正确
  - score_mode='partial' → 全对满分；漏选(无错误项) 得 题分×(选中正确数/总正确数)；有错误项 0 分
- 未作答 → 0 分
score = Σ(每题得分)；total_score = Σ(每题满分)
use_time = 交卷时间 - server_time（秒）
```

### R3 超时判定

```
服务端计时基准 server_time = start 时服务器北京时间
考试/模拟时长 = 分类.time（分钟）
- submit 时校验: NOW() > DATE_ADD(server_time, INTERVAL time MINUTE) → 强制 timeout，按已答判分
- 定时任务(每5min): UPDATE exam_records SET status='timeout'
    WHERE status='doing' AND mode IN ('exam','mock')
      AND NOW() > DATE_ADD(server_time, INTERVAL (SELECT time FROM exam_categories WHERE id=category_id) MINUTE)
```

### R4 错题归集

```
submit 判分后，对 correct=false 的每题:
INSERT INTO exam_wrong_questions (user_id, question_id, wrong_count)
VALUES (?, ?, 1)
ON DUPLICATE KEY UPDATE wrong_count = wrong_count + 1, last_wrong_at = NOW()
（练习/考试/模拟均归集；背题模式作答不计错题）
```

### R5 排行 SQL

```
SELECT user_id, MAX(score) AS best_score, MIN(use_time) AS best_time
FROM exam_records
WHERE mode IN ('exam','mock') AND status='submitted' AND category_id=?
GROUP BY user_id
ORDER BY best_score DESC, best_time ASC
LIMIT 50
-- 关联 users 表展示姓名/部门
```

### R6 练习记录删除策略（沿用 `需求修改/1.md` 第 1 条）

```
submitLearn: 判分 + 错题归集后，DELETE FROM exam_records WHERE id = recordId AND mode='practice'
→ 练习不产生记录，避免数据库膨胀；考试/模拟记录保留
```

### R7 防并发开始

```
startExam / startMock: 唯一键 uk_user_category_doing(user_id, category_id, mode, status='doing')
  已有 doing → 断线恢复（返回 remainingSeconds + savedAnswers）
  无 → 新建记录（唯一键防并发重复插入）
```

### R8 断线续答

```
save-progress { recordId, answers }:
  校验 record.status='doing' 且属于本人 → UPDATE answers
前端在答题变化(防抖 2s)、onHide/onUnload、退出确认时调用；startExam 恢复时从 answers 解析回 savedAnswers
```

## 伪代码（exam.service 核心）

```js
// 开始正式考试
async function startExam(userId, { categoryId }) {
  const category = await getCategory(categoryId);          // 不存在 → 3001
  const existing = await findDoing(userId, categoryId, 'exam');
  if (existing) {
    // 断线恢复: 不新建记录, 返回已冻结快照 + 剩余时间 + 已答
    return { recordId: existing.id, snapshot: existing.snapshot,
             remainingSeconds, savedAnswers: existing.answers };
  }
  const questions = await drawQuestions(categoryId, category.question_num, 'random');
  const snapshot = freeze(questions, { includeAnswer: false });
  const recordId = await insertRecord(userId, categoryId, 'exam', snapshot, { serverTime: now() });
  return { recordId, snapshot, duration: category.time, serverTime: now() };
}

// 交卷
async function submitExam(userId, recordId, answers) {
  const record = await getRecord(recordId);                // 校验归属 user_id
  if (record.status !== 'doing') return { ...已有结果 };    // 防重复交卷
  const details = await grade(record.question_snapshot, answers);
  const timeout = now() > dateAdd(record.server_time, category.time);
  const status = timeout ? 'timeout' : 'submitted';
  await upsertWrongQuestions(userId, details.filter(d => !d.correct));
  await updateRecord(recordId, { score, totalScore, useTime, status, endTime: now() });
  return { recordId, score, totalScore, details };
}
```

## 关键实现约定

- 时间统一用项目 `beijingDate` 工具（UTC+8），入库 `DATETIME`。
- SQL 全部参数化（mysql2 prepared statements），禁止拼接。
- 控制器 Joi 校验：`categoryId` 必填 int、`answers` 为对象、`count` 1-200、`mode` 枚举。
- 权限：分类/题库 CRUD、全员记录、导出、统计、设置更新 → `[authenticate, requireRole('admin','superadmin')]`；其余 `authenticate`。
