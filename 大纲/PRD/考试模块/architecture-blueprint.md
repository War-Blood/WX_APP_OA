# 考试模块 — 架构蓝图 v1.0

> 阶段 3 产出 | 纯骨架设计，不写实际代码 | 标注【假设】【待确认】

---

## 1. 项目目录结构

```
backend/src/features/exam/               ← 后端核心
├── services/
│   ├── question.service.js              ← 题库 CRUD + 批量导入
│   ├── paper.service.js                 ← 试卷 CRUD + 发布 + 克隆
│   ├── exam.service.js                  ← 考试流程 + 判分 + 防作弊
│   └── record.service.js                ← 记录查询 + 统计
├── controllers/
│   ├── question.controller.js           ← questionService 包装
│   ├── paper.controller.js              ← paperService 包装
│   ├── exam.controller.js               ← examService 包装
│   └── record.controller.js             ← recordService 包装
└── routes/
    └── exam.routes.js                   ← 所有端点注册

backend/src/common/utils/
└── constants.js                         ← ErrorCode 新增 EXAM_* (3000-3099)

backend/src/
└── app.js                               ← 新增 app.use('/api/exam', examRoutes)

miniapp/src/
├── pages/exam/
│   ├── index/index.vue                  ← 考试首页（练习+考试Tab）
│   ├── practice/index.vue               ← 模拟练习答题
│   ├── exam/index.vue                   ← 正式考试答题
│   ├── result/index.vue                 ← 成绩报告
│   └── records/index.vue                ← 考试记录列表
├── services/modules/exam.js             ← API 封装
└── pages/features/index.vue             ← 新增"在线考试"入口

webapp/src/
├── views/exam/
│   ├── questions.vue                    ← 题库管理（树+表格）
│   ├── papers.vue                       ← 试卷管理（列表+弹窗）
│   ├── records.vue                      ← 考试记录（筛选+表格）
│   └── stats.vue                        ← 成绩统计（卡片+图表）
├── api/exam.ts                          ← API 类型定义 + 函数
└── router/index.ts                      ← 新增 /exam/* 路由

sql/
└── v3.0_exam.sql                        ← 建表 DDL（5表）
```

---

## 2. 前端组件树

### Miniapp 组件树

```
App.vue
├── pages/exam/index/index.vue           ← [新] 考试首页
│   ├── nav-bar (复用)
│   │
│   ├── <scroll-view> 练习Tab
│   │   ├── <picker> 分类选择
│   │   ├── <view> 题型多选组（3个）
│   │   └── <view> 题目数量 stepper
│   │
│   └── <scroll-view> 考试Tab
│       ├── <view> 考试卡片 v-for (复用卡片样式)
│       │   └── 标题/时长/题数/合格线/状态/操作按钮
│       └── <view> 空态
│
├── pages/exam/practice/index.vue        ← [新] 模拟练习
│   ├── nav-bar (复用)
│   ├── question-view (自建)
│   │   ├── 进度条
│   │   ├── 题号+类型+分值标签
│   │   ├── 题干
│   │   └── 选项列表 v-for (单选radio/多选checkbox/判断btn)
│   └── <view> 底部操作栏
│       ├── 上一题/下一题
│       └── 提交按钮
│
├── pages/exam/exam/index.vue            ← [新] 正式考试
│   ├── nav-bar (复用) + 倒计时
│   ├── question-view (同练习，复用)
│   ├── <view> 截屏警告 Toast
│   └── <view> 底部操作栏 + 交卷按钮(danger)
│
├── pages/exam/result/index.vue          ← [新] 成绩报告
│   ├── nav-bar (复用)
│   ├── 分数大字区域
│   ├── 通过/未通过标签
│   ├── 答题统计卡片
│   └── <scroll-view> 逐题详情列表
│
└── pages/exam/records/index.vue         ← [新] 考试记录
    ├── nav-bar (复用)
    ├── <scroll-view> 记录卡片列表 v-for
    │   └── 试卷名/日期/分数/标签
    └── <view> 空态
```

### Webapp 组件树

```
DefaultLayout.vue (复用)
└── router-view
    ├── views/exam/questions.vue         ← [新] 题库管理
    │   ├── PageToolbar (复用)
    │   ├── el-tree (复用部门树模式)
    │   ├── el-table + el-pagination
    │   ├── el-dialog (新增/编辑) 480px
    │   │   └── el-form + 动态选项编辑
    │   ├── el-dialog (批量导入) 600px
    │   │   └── el-upload + 结果列表
    │   └── el-dialog (删除确认)
    │
    ├── views/exam/papers.vue            ← [新] 试卷管理
    │   ├── PageToolbar (复用)
    │   ├── el-tabs (状态筛选)
    │   ├── el-table + el-pagination
    │   ├── el-dialog (新建/编辑) 700px
    │   │   ├── el-form (基本参数)
    │   │   ├── el-radio-group (参加范围)
    │   │   ├── el-tree-select (选部门)
    │   │   └── 题目多选列表 + 分页
    │   ├── el-dialog (只读查看) 700px
    │   ├── el-dialog (克隆确认)
    │   ├── el-dialog (归档确认)
    │   └── el-dialog (删除确认)
    │
    ├── views/exam/records.vue           ← [新] 考试记录
    │   ├── PageToolbar (复用)
    │   ├── 筛选栏 (el-input + el-select)
    │   ├── el-table + el-pagination
    │   └── el-dialog (详情) 600px
    │       └── 基本信息 + 答题明细列表
    │
    └── views/exam/stats.vue             ← [新] 成绩统计
        ├── PageToolbar (复用)
        ├── el-select (选择试卷)
        ├── 统计卡片行 (el-card ×4)
        ├── ECharts 图表 (柱状图 + 饼图)
        └── 人员明细 el-table
```

---

## 3. 前端路由设计

### Miniapp pages.json 新增

```json
{
  "pages": [
    {
      "path": "pages/exam/index",
      "style": { "navigationBarTitleText": "在线考试" }
    },
    {
      "path": "pages/exam/practice",
      "style": { "navigationBarTitleText": "模拟练习" }
    },
    {
      "path": "pages/exam/exam",
      "style": { "navigationBarTitleText": "正式考试", "disableSwipeBack": true }
    },
    {
      "path": "pages/exam/result",
      "style": { "navigationBarTitleText": "考试结果" }
    },
    {
      "path": "pages/exam/records",
      "style": { "navigationBarTitleText": "考试记录" }
    }
  ]
}
```

注意：`pages/exam/exam` 设置 `disableSwipeBack: true` 防考试中误退。

### Webapp Router 新增

```typescript
// webapp/src/router/index.ts — 新增路由组
{
  path: '/exam',
  redirect: '/exam/questions',
  meta: { title: '考试管理', icon: 'Calendar', roles: ['admin', 'superadmin'] },
  children: [
    { path: 'questions', name: 'ExamQuestions', component: () => import('@/views/exam/questions.vue'),
      meta: { title: '题库管理' } },
    { path: 'papers',    name: 'ExamPapers', component: () => import('@/views/exam/papers.vue'),
      meta: { title: '试卷管理' } },
    { path: 'records',   name: 'ExamRecords', component: () => import('@/views/exam/records.vue'),
      meta: { title: '考试记录' } },
    { path: 'stats',     name: 'ExamStats', component: () => import('@/views/exam/stats.vue'),
      meta: { title: '成绩统计' } },
  ]
}
```

### 导航入口

- **侧栏菜单**：`考勤 > 考试管理` → `/exam/questions`
- **功能中心（小程序）**：`pages/features/index.vue` 新增卡片，跳转 `/pages/exam/index`

---

## 4. 前端状态管理

### Pinia Store — `examStore`（Web）

```typescript
// webapp/src/stores/exam.ts
export const useExamStore = defineStore('exam', () => {
  // — 题库 —
  const questions = ref<Question[]>([])
  const questionTotal = ref(0)
  const categories = ref<Category[]>([])

  // — 试卷 —
  const papers = ref<Paper[]>([])
  const paperTotal = ref(0)

  // — 缓存 —
  const questionsCache = ref<Map<number, Question>>(new Map()) // 按 ID 索引

  return { questions, questionTotal, categories, papers, paperTotal, questionsCache }
})
```

【假设】大部分场景为页面级数据，无需全局 store；仅在选题弹窗中需要跨组件访问分类树和题目缓存时才使用 store。如后续无跨页共享需求，可降级为组件内 `ref`。

### 小程序端 — 无 Pinia Store

小程序端数据流为 `page → request.js → API`，状态保持在页面 `ref` 中，无需全局 store。

### 数据流（Web）

```
API (api/exam.ts)
  → 页面 composable (useExam / useQuestionList)
    → 组件 ref
      → 模板渲染
```

---

## 5. 前端 API 服务层

### Miniapp

```javascript
// miniapp/src/services/modules/exam.js
import { post } from '../request'

export const examApi = {
  // — 考试 —
  getExamList:      ()          => post('/api/exam/exam/list'),
  startExam:        (paperId)   => post('/api/exam/exam/start', { paperId }),
  submitExam:       (data)      => post('/api/exam/exam/submit', data),
  reportScreenshot: (recordId)  => post('/api/exam/exam/warn', { recordId }),

  // — 练习 —
  startPractice:    (data)      => post('/api/exam/practice/start', data),
  submitPractice:   (data)      => post('/api/exam/practice/submit', data),

  // — 记录 —
  getMyRecords:     (params)    => post('/api/exam/records/my', params),
}
```

### Webapp

```typescript
// webapp/src/api/exam.ts
import request from '@/utils/request'

// 题库
export function getQuestionList(params: {...})   => request.post('/exam/questions/list', params)
export function createQuestion(data: {...})      => request.post('/exam/questions/create', data)
export function updateQuestion(data: {...})      => request.post('/exam/questions/update', data)
export function deleteQuestion(id: number)       => request.post('/exam/questions/delete', { id })
export function batchImport(questions: any[])    => request.post('/exam/questions/batch-import', { questions })

// 试卷
export function getPaperList(params: {...})      => request.post('/exam/papers/list', params)
export function createPaper(data: {...})         => request.post('/exam/papers/create', data)
export function updatePaper(data: {...})         => request.post('/exam/papers/update', data)
export function deletePaper(id: number)          => request.post('/exam/papers/delete', { id })
export function publishPaper(id: number)         => request.post('/exam/papers/publish', { id })

// 记录
export function getRecordList(params: {...})     => request.post('/exam/records/all', params)
export function getExamStats(paperId: number)    => request.post('/exam/records/stats', { paperId })
```

---

## 6. 后端模块划分

### 路由层 (`exam.routes.js`)

```js
const router = express.Router();
const adminAuth = [authenticate, requireRole('admin', 'superadmin')];

// — 题库 (admin) —
router.post('/questions/list',         ...adminAuth, questionController.list);
router.post('/questions/create',       ...adminAuth, questionController.create);
router.post('/questions/update',       ...adminAuth, questionController.update);
router.post('/questions/delete',       ...adminAuth, questionController.delete);
router.post('/questions/batch-import', ...adminAuth, questionController.batchImport);

// — 试卷 (admin) —
router.post('/papers/list',            ...adminAuth, paperController.list);
router.post('/papers/create',          ...adminAuth, paperController.create);
router.post('/papers/update',          ...adminAuth, paperController.update);
router.post('/papers/delete',          ...adminAuth, paperController.delete);
router.post('/papers/publish',         ...adminAuth, paperController.publish);

// — 考试 (登录用户) —
router.post('/exam/exam/list',   authenticate, examController.examList);
router.post('/exam/exam/start',  authenticate, examController.start);
router.post('/exam/exam/submit', authenticate, examController.submit);
router.post('/exam/exam/warn',   authenticate, examController.reportWarn);

// — 练习 (登录用户) —
router.post('/exam/practice/start',  authenticate, examController.startPractice);
router.post('/exam/practice/submit', authenticate, examController.submitPractice);

// — 记录 —
router.post('/exam/records/my',    authenticate, recordController.myRecords);
router.post('/exam/records/all',   ...adminAuth, recordController.allRecords);
router.post('/exam/records/stats', ...adminAuth, recordController.stats);
```

### Controller 层

每个 controller 文件导出 3-5 个 `async function`，统一模式：

```js
async function list(req, res, next) {
  try {
    const { page, pageSize, ...filters } = req.body;
    const result = await xxxService.list({ page, pageSize, ...filters });
    res.json(paginated(result.list, result.total, page, pageSize));
  } catch (err) { next(err); }
}
```

### Service 层 — 核心函数

| 服务 | 函数 | DB 操作 |
|------|------|--------|
| `question.service` | `list({...})` | `SELECT ... FROM exam_questions WHERE ...` |
| | `create(data)` | `INSERT INTO exam_questions` |
| | `update(id, data)` | `UPDATE exam_questions SET ...` |
| | `delete(id)` | `DELETE/UPDATE status` |
| | `batchImport(questions)` | 逐行校验 → `INSERT` + 回写错误 |
| `paper.service` | `list({ status })` | `SELECT ... FROM exam_papers` |
| | `create(data)` | `INSERT INTO exam_papers` + 校验 question_ids 存在 |
| | `update(id, data)` | `UPDATE` — 已发布拒绝改 `question_ids` |
| | `publish(id)` | `UPDATE status='published'` |
| | `clone(id)` | 读旧卷 → INSERT 新卷 `version+1, status='draft'` |
| `exam.service` | `start(paperId, userId)` | checkScope → 清僵尸 → INSERT exam_records + snapshot |
| | `submit(recordId, answers, userId)` | 校验时间 → 基于 snapshot 判分 → UPDATE |
| | `submitPractice(recordId, answers)` | 逐题比对 → 返回对错+解析 |
| | `reportWarn(recordId)` | UPDATE warn_count → 超限 UPDATE status='cheated' |
| | `scanTimeout()` | 定时任务：UPDATE status='timeout'（超时未交） |
| `record.service` | `myRecords(userId, ...)` | `SELECT ... FROM exam_records WHERE user_id=?` |
| | `allRecords(...)` | `SELECT ... FROM exam_records` + JOIN users |
| | `stats(paperId)` | 聚合查询：AVG(score) / 通过率 / 分布 |

---

## 7. 后端数据库模型映射

### 表 → Service 映射

| 表 | 主要操作 Service | 关联读取 |
|----|:--:|------|
| `exam_categories` | `question.service` | 题库分类树、试卷选题筛选 |
| `exam_questions` | `question.service` | 试卷快照组装、判分 base |
| `exam_papers` | `paper.service` | 考试开始、记录关联 |
| `exam_records` | `exam.service` + `record.service` | 统计数据 |
| `users` | (复用, 只读) | 部门范围校验、考生名显示 |
| `departments` | (复用, 只读) | scope_departments 关联 |

### 实体关系

```
exam_categories 1──N exam_questions
exam_papers N──1 exam_questions (via question_ids JSON)
exam_papers 1──N exam_records
users 1──N exam_records
departments 0──N users (via department_id)
```

### 索引建议

| 表 | 索引 | 类型 |
|----|------|------|
| `exam_records` | `uk_user_paper_doing (user_id, paper_id)` | UNIQUE |
| `exam_records` | `idx_user (user_id)` | INDEX |
| `exam_records` | `idx_paper (paper_id)` | INDEX |
| `exam_records` | `idx_status (status)` | INDEX |
| `exam_records` | `idx_start_time (start_time)` | INDEX（超时扫描） |
| `exam_questions` | `idx_category (category_id)` | INDEX |
| `exam_papers` | `idx_status (status)` | INDEX |

---

## 8. 后端中间件设计

| 中间件 | 来源 | 用途 | 加载条件 |
|--------|------|------|---------|
| `authenticate` | `common/middleware/auth.js`（复用） | JWT 解析 → `req.user` | 所有端点 |
| `requireRole('admin','superadmin')` | `common/middleware/auth.js`（复用） | 角色校验 | 题库/试卷/全员记录 |
| `errorHandler` | `common/middleware/`（复用） | 统一错误 JSON 响应 | 全局 |
| (无新增) | — | — | — |

考试模块**不新增自定义中间件**，完全复用现有的 `authenticate` + `requireRole`。

### 错误处理

使用现有模式：
```js
// 业务错误
throw new BusinessError('不在考试参加范围', null, ErrorCode.EXAM_SCOPE_DENIED);
// 参数校验
throw new ValidationError('试卷ID不能为空');
// 资源不存在
throw new NotFoundError('试卷不存在');
```

所有错误通过 `next(err)` → `errorHandler` 统一处理，与项目现有模式一致。

---

## 9. Agent 归属表

### 完整文件清单与 Agent 映射

| 文件 | 归属 Agent | 类型 | 上游依赖 |
|------|-----------|------|---------|
| `backend/src/features/exam/routes/exam.routes.js` | core-agent | 新建 | 所有 controller |
| `backend/src/features/exam/controllers/question.controller.js` | core-agent | 新建 | question.service |
| `backend/src/features/exam/controllers/paper.controller.js` | core-agent | 新建 | paper.service |
| `backend/src/features/exam/controllers/exam.controller.js` | core-agent | 新建 | exam.service |
| `backend/src/features/exam/controllers/record.controller.js` | core-agent | 新建 | record.service |
| `backend/src/features/exam/services/question.service.js` | core-agent | 新建 | db, ErrorCode |
| `backend/src/features/exam/services/paper.service.js` | core-agent | 新建 | db, ErrorCode |
| `backend/src/features/exam/services/exam.service.js` | core-agent | 新建 | db, ErrorCode, beijingDate |
| `backend/src/features/exam/services/record.service.js` | core-agent | 新建 | db |
| `backend/src/common/utils/constants.js` | common-agent | 修改 | 无 |
| `backend/src/app.js` | common-agent | 修改 | examRoutes |
| `miniapp/src/pages/exam/index/index.vue` | miniapp-core-agent | 新建 | examApi |
| `miniapp/src/pages/exam/practice/index.vue` | miniapp-core-agent | 新建 | examApi |
| `miniapp/src/pages/exam/exam/index.vue` | miniapp-core-agent | 新建 | examApi |
| `miniapp/src/pages/exam/result/index.vue` | miniapp-core-agent | 新建 | examApi |
| `miniapp/src/pages/exam/records/index.vue` | miniapp-core-agent | 新建 | examApi |
| `miniapp/src/services/modules/exam.js` | miniapp-common-agent | 新建 | request.js |
| `miniapp/src/pages/features/index.vue` | miniapp-common-agent | 修改 | 无 |
| `miniapp/src/pages.json` | miniapp-common-agent | 修改 | 无 |
| `webapp/src/views/exam/questions.vue` | webapp-core-agent | 新建 | api/exam.ts |
| `webapp/src/views/exam/papers.vue` | webapp-core-agent | 新建 | api/exam.ts |
| `webapp/src/views/exam/records.vue` | webapp-core-agent | 新建 | api/exam.ts |
| `webapp/src/views/exam/stats.vue` | webapp-core-agent | 新建 | api/exam.ts |
| `webapp/src/api/exam.ts` | webapp-common-agent | 新建 | request.ts |
| `webapp/src/router/index.ts` | webapp-common-agent | 修改 | 无 |
| `webapp/src/stores/exam.ts` | webapp-common-agent | 新建【待确认】 | — |
| `sql/v3.0_exam.sql` | common-agent | 新建 | 无 |

### 跨 Agent 依赖顺序

```
  common-agent (ErrorCode + 路由注册 + SQL)
      ↓
  core-agent (后端全部 services/controllers/routes)
      ↓
  ┌───────────────────────────────────────┐
  ↓                                       ↓
  miniapp-common-agent                  webapp-common-agent
  (API封装 + 路由 + 入口)               (API封装 + 路由)
      ↓                                       ↓
  miniapp-core-agent                    webapp-core-agent
  (5页面)                               (4页面)
```

---

## 10. 关键依赖

### 新增 npm 包

【假设】考试模块无需新增 npm 包。判分逻辑为纯 JS 计算，ECharts 已随仪表盘引入。如后续需要 Excel 批量导入解析，再引入 `xlsx` 包。

### 复用现有模块

| 复用模块 | 来源 | 考试模块使用方式 |
|---------|------|----------------|
| `db.query/execute` | `common/config/database.js` | 所有数据操作 |
| `BusinessError` / `ValidationError` / `NotFoundError` | `common/utils/errors.js` | 错误抛出 |
| `ErrorCode` | `common/utils/constants.js` | 错误码引用（新增 3000-3099） |
| `success()` / `paginated()` | `common/utils/response.js` | 统一响应格式 |
| `beijingDate()` / `beijingToday()` | `common/utils/date.js` | 考试计时基准 |
| `authenticate` / `requireRole` | `common/middleware/auth.js` | 权限控制 |
| `toast.js` | `miniapp/src/utils/toast.js` | 小程序提示 |
| `toast.ts` | `webapp/src/utils/toast.ts` | Web 提示 |
| `request.js` | `miniapp/src/services/request.js` | 小程序 API 调用 |
| `request.ts` | `webapp/src/utils/request.ts` | Web API 调用 |
| `nav-bar` | `miniapp/src/components/` | 小程序导航 |
| `el-tree` / `el-tree-select` | Element Plus | 分类树、部门选择 |
| `ECharts` | 已有依赖 | 成绩统计图表 |
| 部门树数据 | 现有 API `getDepartmentList()` | 试卷参加范围选择 |

### 外部服务

无。考试模块为纯内部业务模块。

### 定时任务

```js
// 超时扫描（建议 PM2 cron 或 setInterval）
setInterval(async () => {
  await examService.scanTimeout();
}, 5 * 60 * 1000); // 每 5 分钟
```

【待确认】项目是否有统一的定时任务机制，还是需要单独实现。