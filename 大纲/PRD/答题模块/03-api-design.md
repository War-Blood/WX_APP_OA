# 03 — API 设计

## 通用约定

| 项 | 约定 |
|----|------|
| 协议 | 全部 `POST` + JSON body |
| 前缀 | `/api/exam/*` |
| 认证 | `Authorization: Bearer <token>` |
| 成功响应 | `{ code: 0, message: "success", data: {...} }` |
| 分页响应 | `{ code: 0, data: { list: [...], total, page, pageSize, totalPages } }` |
| 错误响应 | `{ code: <errorCode>, message: "<msg>", data: null }` |

## 错误码

> **分配范围**：3000-3099（考试模块专用，不与 Auth 1000-1199 / Report 2000-2099 / Attendance 2800-2899 冲突）

在 `common/utils/constants.js` 的 `ErrorCode` 中新增：

```js
// 考试模块 (3000-3099)
EXAM_PAPER_NOT_FOUND: 3001,        // 试卷不存在
EXAM_PAPER_NOT_PUBLISHED: 3002,    // 试卷未发布
EXAM_SCOPE_DENIED: 3003,           // 不在考试参加范围
EXAM_ALREADY_DOING: 3004,          // 已有进行中的考试
EXAM_TIME_UP: 3005,                // 考试已超时
EXAM_MAX_ATTEMPTS: 3006,           // 已达最大考试次数
EXAM_PUBLISHED_READONLY: 3007,     // 已发布试卷不可编辑
EXAM_RESULT_NOT_RELEASED: 3008,    // 成绩未公布,暂不可查看
EXAM_QUESTION_NOT_FOUND: 3010,     // 题目不存在
EXAM_BATCH_IMPORT_ERROR: 3011,     // 批量导入数据格式错误
```

后端错误处理使用项目现有模式：
```js
const { BusinessError, ValidationError, NotFoundError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

// 示例
if (!paper) throw new NotFoundError('试卷不存在');
if (paper.status !== 'published') throw new BusinessError('试卷未发布', null, ErrorCode.EXAM_PAPER_NOT_PUBLISHED);
if (outOfScope) throw new BusinessError('您不在本次考试参加范围内', null, ErrorCode.EXAM_SCOPE_DENIED);
```

所有错误通过 `next(err)` 传递给项目统一的 `errorHandler` 中间件处理，**不自行封装错误响应**。

## 端点清单

### 分类管理（管理员，P0 遗留缺口 G1）

| 端点 | 说明 |
|------|------|
| `POST /api/exam/categories/list` | 分类树列表（返回树形结构） |
| `POST /api/exam/categories/create` | 新增分类 `{ parentId, name, sortOrder }` |
| `POST /api/exam/categories/update` | 编辑分类 `{ id, name, sortOrder }` |
| `POST /api/exam/categories/delete` | 删除分类（有子分类或题目时拒绝） |

> 注：`exam_categories` 表已建（`sql/v3.0_exam.sql`），本组端点为推进阶段 G1 补齐。

### 题库管理（管理员）

| 端点 | 说明 |
|------|------|
| `POST /api/exam/questions/list` | 题库列表 `{ categoryId, type, keyword, page, pageSize }` |
| `POST /api/exam/questions/create` | 新增 `{ categoryId, type, title, options, answer, analysis, score, scoreMode }` |
| `POST /api/exam/questions/update` | 编辑 `{ id, ...同上 }` |
| `POST /api/exam/questions/delete` | 删除 `{ id }` |
| `POST /api/exam/questions/batch-import` | 批量导入 `{ questions: [...] }` → `{ success, failed, errors }` |

### 试卷管理（管理员）

| 端点 | 说明 |
|------|------|
| `POST /api/exam/papers/list` | 试卷列表 `{ status, page, pageSize }` |
| `POST /api/exam/papers/create` | 新建 `{ title, description, duration, passScore, totalScore, maxAttempts, maxScreenshotWarns, scopeType, scopeDepartments, scopeUsers, scopeRoles, startTime, endTime, questionIds, drawRules, shuffleQuestions, shuffleOptions, sections, resultVisibility }`(startTime/endTime 为考试窗口,北京时间,可空=永久开放;`drawRules` 非空=随机抽题,`questionIds` 置空;`sections` 为分组 `[{name, questionIds}]`,可选) |
| `POST /api/exam/papers/update` | 编辑 — 仅 draft 可改题目 |
| `POST /api/exam/papers/delete` | 删除 `{ id }` |
| `POST /api/exam/papers/publish` | 发布 `{ id }` → 通知范围内员工(站内信) |
| `POST /api/exam/papers/release-result` | 公布成绩 `{ id }`(result_visibility='manual' 时,置 result_released=1,员工方可查看成绩) |
| `POST /api/exam/papers/remind` | 一键催考 `{ id }` → 向范围内**未交卷**员工发站内信,返回 `{ remindedCount }` |

### 考试（小程序）

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/exam/list` | 登录 | 可参加考试列表（scope 过滤） |
| `POST /api/exam/exam/start` | 登录 | 进入/恢复考试 `{ paperId }` → 窗口检查;已有 doing 则断线恢复(返回 `remainingSeconds`+`savedAnswers`);否则新建快照+计时 |
| `POST /api/exam/exam/save-answers` | 登录 | 保存答题进度(断线续答) `{ recordId, answers }` |
| `POST /api/exam/exam/submit` | 登录 | 交卷 `{ recordId, answers }` → 判分 |
| `POST /api/exam/exam/warn` | 登录 | 截屏警告 `{ recordId }` |

### 练习（小程序）

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/practice/start` | 登录 | 开始练习 `{ categoryId, type, count }` |
| `POST /api/exam/practice/submit` | 登录 | 提交练习 `{ recordId, answers }` |

> 注：**超时自动交卷为定时任务**（每 5 分钟 cron 扫 doing 超时 → timeout，见 04-business-logic 规则5，P0 遗留缺口 G2），非 REST 端点。

### 记录查询

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/records/my` | 登录 | 我的记录 `{ page, pageSize }`(manual 未公布掩码,见下) |
| `POST /api/exam/records/all` | admin | 全员记录 `{ page, pageSize, keyword, paperId }`(admin 不受掩码限制) |
| `POST /api/exam/records/detail` | 登录 | 记录详情 `{ recordId }`(manual 未公布 → 3008) |
| `POST /api/exam/records/stats` | admin | 成绩统计 `{ paperId }` → `{ avgScore, passRate, distribution }` |
| `POST /api/exam/records/export` | admin | 导出成绩 `{ paperId, keyword? }` → CSV(utf-8 BOM,列:姓名/部门/分数/用时/状态/交卷时间) |

> **成绩展示掩码约定**:`exam/start`、`records/my`、`records/detail` 返回时,若试卷 `result_visibility='manual'` 且 `result_released=0`,对**员工**返回的记录隐藏 `score / is_pass / details`(置 `score=null, isPass=null, details=[]`),仅保留 `status='submitted'` 与「等待公布」标记;管理员端点不受影响。

## 请求/响应示例

### 开始考试

```json
// POST /api/exam/exam/start
{ "paperId": 1 }

// 响应
{
  "code": 0,
  "data": {
    "recordId": 42,
    "snapshot": [
      { "id": 1, "type": "single", "title": "...", "options": [...], "score": 2, "scoreMode": "exact" }
    ],
    "serverTime": "2026-07-07T10:00:00+08:00",
    "duration": 60
  }
}
```

### 交卷

```json
// POST /api/exam/exam/submit
{ "recordId": 42, "answers": { "1": "A", "2": "B,C" } }

// 响应
{
  "code": 0,
  "data": {
    "score": 85, "totalScore": 100, "isPass": true,
    "details": [
      { "questionId": 1, "correct": true, "userAnswer": "A", "rightAnswer": "A" }
    ]
  }
}
```

### 随机抽题试卷（create）

```json
// POST /api/exam/papers/create
{
  "title": "安全抽考(随机卷)",
  "duration": 30, "passScore": 60, "maxAttempts": 1,
  "scopeType": "department", "scopeDepartments": [1, 2],
  "drawRules": [
    { "type": "single",   "categoryId": 0, "count": 10, "score": 2 },
    { "type": "multiple", "categoryId": 0, "count": 5,  "score": 4 },
    { "type": "judge",    "categoryId": 0, "count": 8,  "score": 2 }
  ],
  "shuffleQuestions": true, "shuffleOptions": true,
  "resultVisibility": "manual"
}
// drawRules 非空时 questionIds 留空;开始考试时按规则随机抽题并冻结快照
```

### 成绩未公布掩码（manual 模式）

```json
// POST /api/exam/records/my  →  其中一条记录
{
  "recordId": 42, "paperId": 14, "title": "安全抽考(随机卷)",
  "status": "submitted",
  "score": null, "isPass": null, "details": [],
  "resultPending": true
}
```
