# 04 — 业务逻辑

## 考试状态机

```
                  ┌─ 开始考试 ──→ [ doing ]
                  │                  │
                  │       ┌──────────┼──────────┐
                  │       ↓          ↓          ↓
                  │   交卷提交    超时未交    截屏超限
                  │       │          │          │
                  │  [submitted] [timeout]  [cheated]
                  │
              练习模式 ──→ [ doing ] ──→ [ submitted ] (无超时/无作弊)
```

## 核心规则

### 1. 开始考试

```
1. 校验 paper.status = 'published'
2. 校验参加范围:
   - scope_type = 'all' → 放行
   - scope_type = 'department' → user.department_id ∈ scope_departments
3. 清理僵尸记录:
   UPDATE exam_records SET status='timeout'
   WHERE user_id=? AND paper_id=? AND status='doing'
4. 检查 max_attempts:
   SELECT COUNT(*) FROM exam_records
   WHERE user_id=? AND paper_id=? AND status IN ('submitted','timeout','cheated')
   如果已达到 max_attempts → 返回 3006
5. 组装快照:
   SELECT * FROM exam_questions WHERE id IN (paper.question_ids)
   序列化为 question_snapshot JSON（冻结题目数据）
6. INSERT INTO exam_records (user_id, paper_id, paper_version, mode='exam',
   question_snapshot, server_time=NOW(), start_time=NOW(), status='doing')
```

### 2. 交卷判分

```
1. 校验 record.status = 'doing'
2. 校验 NOW() < server_time + INTERVAL duration MINUTE（超时拒收）
3. 遍历 answers，基于 question_snapshot 逐题判分：
   - single/judge: answer === userAnswer → score, else 0
   - multiple + exact: userAnswer 完全匹配 answer → score, else 0
   - multiple + partial:
     无错误选项且选对了N个 → score × (N / 总正确数)
     有错误选项 → 0
4. UPDATE score, is_pass=(score >= paper.pass_score), end_time=NOW(), status='submitted'
```

### 3. 模拟练习判分

```
1. 不校验时长
2. 逐题比对答案，返回对错 + 解析
3. status 始终 submitted
```

### 4. 截屏警告

```
1. POST /exam/exam/warn { recordId }
2. UPDATE warn_count = warn_count + 1
3. 若 warn_count >= paper.max_screenshot_warns:
   UPDATE status='cheated', end_time=NOW(), score=0, is_pass=0
   返回 { forceEnd: true }
```

### 5. 超时自动交卷

定时任务（每 5 分钟扫描）：
```
UPDATE exam_records SET status='timeout', end_time=NOW()
WHERE status='doing' AND NOW() > server_time + INTERVAL (
  SELECT duration FROM exam_papers WHERE id = exam_records.paper_id
) MINUTE
```

### 6. 已发布试卷编辑限制

```
papers/update:
  if paper.status = 'published' and 请求含 question_ids:
    → 拒绝 3007 "已发布试卷不可编辑题目"
  else if paper.status = 'published' and 请求不含 question_ids:
    → 仅允许更新非题目字段（如 max_attempts, scope 等）
```

### 7. 试卷克隆（修改已发布试卷时）

```
若需修改已发布试卷的题目:
1. 将旧卷 status='archived'
2. 创建新卷: { ...same fields, version=old.version+1, status='draft', question_ids: new_ids }
```

## 参加范围校验伪代码

```js
// exam.service.js
async function checkScope(userId, paper) {
  if (paper.scope_type === 'all') return true;
  if (paper.scope_type === 'department') {
    const [user] = await db.query(
      'SELECT department_id FROM users WHERE id = ?', [userId]
    );
    const deptIds = typeof paper.scope_departments === 'string'
      ? JSON.parse(paper.scope_departments)
      : paper.scope_departments;
    return deptIds.includes(user.department_id);
  }
  return true; // 兼容无 scope 的旧数据
}
```
