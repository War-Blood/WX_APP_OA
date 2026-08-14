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

> **分配范围**：3000-3099（答题模块专用，与 Auth 1000-1199 / Report 2000-2099 / Attendance 2800-2899 冲突）— 由旧 `EXAM_*` 更名 `ANSWER_*` 复用该区间

在 `common/utils/constants.js` 的 `ErrorCode` 中定义：

```js
// 答题模块 (3000-3099)
ANSWER_CATEGORY_NOT_FOUND: 3001,    // 分类不存在
ANSWER_CATEGORY_HAS_QUESTIONS: 3002,// 分类下仍有题目/子分类, 不可删除
ANSWER_QUESTION_NOT_FOUND: 3003,    // 题目不存在
ANSWER_RECORD_NOT_FOUND: 3004,      // 答题记录不存在
ANSWER_TIME_UP: 3005,               // 答题已超时
ANSWER_SETTING_INVALID: 3006,       // 答题设置参数非法
ANSWER_BATCH_IMPORT_ERROR: 3007,    // 批量导入数据格式错误
```

后端错误处理使用项目现有模式：
```js
const { BusinessError, NotFoundError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

if (!category) throw new NotFoundError('分类不存在');
if (hasChildren) throw new BusinessError('分类下仍有子分类或题目, 不可删除', null, ErrorCode.ANSWER_CATEGORY_HAS_QUESTIONS);
```

所有错误通过 `next(err)` 传递给项目统一的 `errorHandler` 中间件处理。

## 端点清单

### 分类管理

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/categories/list` | 登录 | 分类树（含二级），节点附统计题量 `questionNum` |
| `POST /api/exam/categories/create` | admin | 新增 `{ parentId, name, cover?, time? }` |
| `POST /api/exam/categories/update` | admin | 编辑 `{ id, name, cover?, time? }` |
| `POST /api/exam/categories/delete` | admin | 删除（有子分类或题目时拒绝 → 3002） |

### 题库管理

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/questions/list` | 登录 | 题库列表 `{ categoryId, type, keyword, page, pageSize }` |
| `POST /api/exam/questions/create` | admin | 新增 `{ categoryId, type, title, options, answer, analysis, score, scoreMode }` |
| `POST /api/exam/questions/update` | admin | 编辑 `{ id, ...同上 }` |
| `POST /api/exam/questions/delete` | admin | 删除 `{ id }` |
| `POST /api/exam/questions/batch-import` | admin | 批量导入 `{ questions: [...] }` → `{ success, failed, errors }` |

### 练习（刷题/背题）

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/learn/start` | 登录 | 开始练习 `{ categoryId, type?, mode:'order'|'random'|'special'|'type', count, backMemorize? }` → 返回题目（背题模式含 answer，否则不含） |
| `POST /api/exam/learn/submit` | 登录 | 提交练习 `{ recordId, answers }` → 逐题判分，**删除记录**，upsert 错题 |

### 模拟考试

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/mock/start` | 登录 | 开始模拟 `{ categoryId }` → 随机抽题 + 快照 + 倒计时，`mode='mock'` 记录保留 |
| `POST /api/exam/mock/submit` | 登录 | 交卷 `{ recordId, answers }` → 判分，upsert 错题 |

### 正式考试

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/exam/start` | 登录 | 开始/恢复考试 `{ categoryId }` → 已有 doing 断线恢复（返回 `remainingSeconds`+`savedAnswers`），否则新建快照+计时，`mode='exam'` |
| `POST /api/exam/exam/save-progress` | 登录 | 保存进度(断线续答) `{ recordId, answers }` |
| `POST /api/exam/exam/submit` | 登录 | 交卷 `{ recordId, answers }` → 判分，upsert 错题 |

### 记录 / 排行 / 错题 / 收藏 / 设置

| 端点 | 权限 | 说明 |
|------|------|------|
| `POST /api/exam/records/my` | 登录 | 我的记录（考试/模拟）`{ page, pageSize }` |
| `POST /api/exam/records/detail` | 登录 | 记录详情 `{ recordId }` → 逐题对错+解析（练习记录已删不可查） |
| `POST /api/exam/records/rank` | 登录 | 排行榜 `{ categoryId }` → 按人 `MAX(score)` 降序、`MIN(use_time)` 升序 |
| `POST /api/exam/records/all` | admin | 全员记录 `{ page, pageSize, keyword?, categoryId?, mode? }` |
| `POST /api/exam/records/export` | admin | 导出成绩 `{ categoryId?, keyword? }` → CSV（utf-8 BOM） |
| `POST /api/exam/stats/overview` | admin | 统计看板 `{ categoryId? }` → 人数/记录数/平均分/通过率/分类分布 |
| `POST /api/exam/wrong/list` | 登录 | 错题本 `{ page, pageSize }` |
| `POST /api/exam/wrong/remove` | 登录 | 移除错题 `{ questionId }` |
| `POST /api/exam/favorite/toggle` | 登录 | 收藏/取消收藏 `{ questionId }` → `{ favorited }` |
| `POST /api/exam/favorite/list` | 登录 | 我的收藏 `{ page, pageSize }` |
| `POST /api/exam/settings/get` | 登录 | 读取答题设置（use_learn；check_user 已废弃 v2.2） |
| `POST /api/exam/settings/update` | admin | 更新答题设置 `{ settings: [{key,value}] }` |

## 请求/响应示例

### 开始考试

```json
// POST /api/exam/exam/start
{ "categoryId": 1 }

// 响应
{
  "code": 0,
  "data": {
    "recordId": 42,
    "categoryId": 1,
    "categoryName": "低压电工",
    "snapshot": [
      { "id": 1, "type": "single", "title": "...", "options": [{"key":"A","text":"..."}], "score": 2, "scoreMode": "exact" }
    ],
    "serverTime": "2026-08-07T10:00:00+08:00",
    "duration": 10
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
    "recordId": 42, "score": 85, "totalScore": 100,
    "details": [
      { "questionId": 1, "correct": true, "userAnswer": "A", "rightAnswer": "A", "analysis": "..." }
    ]
  }
}
```

### 练习背题模式

```json
// POST /api/exam/learn/start
{ "categoryId": 1, "mode": "random", "count": 10, "backMemorize": true }
// 响应 snapshot 中每题的 answer 直接返回（背题模式）; 否则 answer 字段隐藏
```

### 排行榜

```json
// POST /api/exam/records/rank
{ "categoryId": 1 }
// 响应 [{ rank, userName, departmentName, score, useTime }] 按 MAX(score) 降序
```

## 与旧版差异

- 删除：`papers/*`（试卷 CRUD/发布/公布成绩/催考）、`exam/list`、`exam/warn`（截屏）、`records/stats`（并入 `stats/overview`）。
- 变更：`practice/*` → `learn/*`（支持背题与更多抽题模式）；`exam/start` 参数 `paperId` → `categoryId`；`records/detail` 改为只查考试/模拟记录（练习记录不持久化）。
