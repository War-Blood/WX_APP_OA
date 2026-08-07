# 答题模块 — 架构蓝图 v2.0（合并 kesixin/dati）

> 阶段 3 产出 | 纯骨架设计，不写实际代码 | 单项目三端架构（无 Bmob / 无原生微信）

---

## 1. 项目目录结构

```
backend/src/features/exam/               ← 后端核心
├── services/
│   ├── category.service.js              ← 分类树 CRUD + 题量统计
│   ├── question.service.js              ← 题库 CRUD + 批量导入
│   ├── exam.service.js                  ← 练习/模拟/考试 抽题+判分+错题归集+断线续答+超时
│   ├── record.service.js                ← 我的/全员/详情/导出
│   ├── rank.service.js                  ← 排行榜
│   ├── wrong.service.js                 ← 错题本
│   ├── favorite.service.js              ← 收藏
│   └── setting.service.js               ← 答题设置
├── controllers/（category/question/exam/record/wrong/favorite/setting）
└── routes/exam.routes.js                ← 所有端点注册

backend/src/common/utils/constants.js    ← ErrorCode ANSWER_* (3000-3099)
backend/src/common/tasks/exam.task.js    ← 超时扫描定时任务
backend/src/app.js                       ← app.use('/api/exam', examRoutes)
backend/scripts/init-db.js               ← 建表 + v2.0 迁移
backend/scripts/seed-answer.js           ← 低压电工题库种子
backend/scripts/test-answer.js           ← 端到端测试脚本

miniapp/src/
├── services/modules/exam.js             ← API 封装
├── components/question-card/index.vue   ← 题目渲染（多态）
├── components/answer-card/index.vue     ← 答题卡网格
└── pages/exam/                          ← 10 页
    ├── index/ category/ learn/ exam/ mock/ result/
    ├── wrong/ favorite/ rank/ records/

webapp/src/
├── api/exam.ts                          ← API 类型定义 + 函数
├── router/index.ts                      ← /exam 路由组
├── config/modules.ts                    ← 「答题管理」模块入口
└── views/exam/                          ← 5 页
    ├── categories.vue  questions.vue  records.vue  stats.vue  settings.vue
```

---

## 2. 数据模型映射（kesixin/dati → OA）

| dati（Bmob 表） | OA（MySQL 表） | 处置 |
|---|---|---|
| `questionMenu`（分类: name/cover/questionNum/time/二级） | `exam_categories`（+cover/question_num/time, parent_id 二级） | 保留数据 + ALTER |
| `questions`（单/多/判断 + options/answer/analysis） | `exam_questions`（结构已满足） | 保留 |
| `history`（user/menuId/score/useTime） | `exam_records`（user_id/category_id/mode/score/use_time） | DROP 重建 |
| `setting`（useLearn/checkUser） | `exam_settings` | 新增 |
| —（dati 本地 storage 错题/收藏） | `exam_wrong_questions` / `exam_favorites` | 新增（服务端） |
| `_User`（独立注册+审核） | 复用 OA `users` + JWT | 删除 |
| `exam_papers`（旧 OA 试卷模型） | — | DROP（模型废弃） |

**实体关系**：`exam_categories 1──N exam_questions`；`users 1──N exam_records`；`exam_categories 1──N exam_records`；`users N──M exam_questions`（经 wrong/favorites）。

---

## 3. 后端服务层

| 服务 | 核心函数 | DB 操作 |
|------|------|--------|
| category.service | `tree()` | `SELECT ... FROM exam_categories ORDER BY parent_id, sort_order` + COUNT 题量 |
| | `create/update/remove(data)` | INSERT / UPDATE / DELETE（有子分类或题目时拒绝） |
| question.service | `list/create/update/remove/batchImport` | 沿旧实现（分类筛选/题型/关键词/分页 + 批量导入容错） |
| exam.service | `startLearn/submitLearn` | 抽题（order/random/special/type + backMemorize）→ 判分 → **删练习记录** → upsert 错题 |
| | `startMock/submitMock` | 随机抽题 + 快照 + 倒计时 → 判分（记录保留） |
| | `startExam/submitExam/saveProgress` | 断线恢复 / 交卷判分 + 错题 upsert / 进度保存 |
| | `scanTimeoutExams()` | `*/5` cron：doing 且超时 → timeout |
| record.service | `myRecords/allRecords/detail/export` | JOIN users 分页 / 详情重判 / CSV(BOM) |
| rank.service | `rank(categoryId)` | `MAX(score)` 降序 + `MIN(use_time)` 升序，LIMIT 50 |
| wrong.service | `list/remove/upsertWrong` | 错题本 CRUD |
| favorite.service | `toggle/list` | 收藏切换/列表 |
| setting.service | `get/update` | 键值读取/更新 |

## 4. 路由注册（`/api/exam`，全 POST）

| 组 | 端点 | 权限 |
|----|------|------|
| categories | list(登录) / create / update / delete | 管理 admin |
| questions | list(登录) / create / update / delete / batch-import | 管理 admin |
| learn | start / submit | 登录 |
| mock | start / submit | 登录 |
| exam | start / submit / save-progress | 登录 |
| records | my / detail / rank(登录) · all / export(admin) | — |
| wrong | list / remove | 登录 |
| favorite | toggle / list | 登录 |
| settings | get(登录) / update(admin) | — |
| stats | overview | admin |

## 5. 前端组件树

### Miniapp

```
pages/exam/index/index.vue        答题首页（统计 + 模式入口 + 推荐分类）
  └─ nav-bar (复用)
pages/exam/category/index.vue     分类选择（mode 参数分发）
pages/exam/learn/index.vue        练习刷题（抽题配置 + 背题开关 + question-card）
pages/exam/exam/index.vue         正式考试（倒计时 + question-card + answer-card 浮层 + 交卷）
pages/exam/mock/index.vue         模拟考试（复用 exam 流程）
pages/exam/result/index.vue       成绩页（分数 + 逐题详情）
pages/exam/wrong/index.vue        错题本
pages/exam/favorite/index.vue     收藏
pages/exam/rank/index.vue         排行榜
pages/exam/records/index.vue      答题记录
公共：components/question-card/index.vue · components/answer-card/index.vue
```

### Webapp

```
views/exam/categories.vue         分类管理（el-tree + 编辑表单）
views/exam/questions.vue          题库管理（筛选 + 表格 + 弹窗 + 批量导入）
views/exam/records.vue            成绩记录（筛选 + 表格 + 详情 + 导出）
views/exam/stats.vue              答题统计（统计卡 + ECharts）
views/exam/settings.vue           答题设置（开关）
```

## 6. 中间件与错误

- 复用 `authenticate` + `requireRole('admin','superadmin')`；无新增自定义中间件。
- 错误：`BusinessError` / `ValidationError` / `NotFoundError` + `ErrorCode.ANSWER_*`（3000-3099），经 `next(err)` → `errorHandler`。

## 7. 定时任务

```js
// 每 5 分钟扫描超时未交卷（backend/src/common/tasks/exam.task.js → scheduler.js cron）
await scanTimeoutExams(); // mode IN ('exam','mock') AND status='doing' AND NOW()>server_time+time
```

## 8. Agent 归属摘要

见 `07-agent-matrix.md`。依赖顺序：common-agent → core-agent → {miniapp-common, webapp-common} → {miniapp-core, webapp-core}。

## 9. 关键依赖

| 复用模块 | 来源 | 使用方式 |
|---------|------|---------|
| `db.query/execute` | `common/config/database.js` | 所有数据操作 |
| `BusinessError/ValidationError/NotFoundError` | `common/utils/errors.js` | 错误抛出 |
| `ErrorCode` | `common/utils/constants.js` | 错误码引用 |
| `success()/paginated()` | `common/utils/response.js` | 统一响应 |
| `beijingDate()` | `common/utils/date.js` | 计时基准 |
| `authenticate/requireRole` | `common/middleware/auth.js` | 权限控制 |
| `request.js/request.ts` / `toast.js/toast.ts` | 双端 | API 调用 / 提示 |
| `nav-bar` / `el-tree` / `ECharts` | 双端 | 导航 / 分类树 / 图表 |
| 旧 batchImport / CSV 导出 | 旧实现 | 批量导入容错 / 导出（BOM） |

无新增 npm 包；判分为纯 JS 计算。
