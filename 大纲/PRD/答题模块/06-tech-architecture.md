# 06 — 技术架构

## 系统架构

```
┌─────────────────────┐    ┌──────────────────────┐
│  微信小程序（uni-app） │    │  Web 管理后台 (Vue3)   │
│   pages/exam/ 10页    │    │   views/exam/ 5页      │
│   services/modules/  │    │   api/exam.ts          │
└──────────┬──────────┘    └───────────┬──────────────┘
           │   HTTPS                    │   HTTPS
           └──────────┬─────────────────┘
                      ▼
┌─────────────────────────────────────────┐
│           Nginx (warblood.online)        │
│     /api/exam/* → proxy_pass :3000       │
└─────────────────────┬───────────────────┘
                      ▼
┌─────────────────────────────────────────┐
│        Express (Node.js :3000)           │
│  app.use('/api/exam', examRoutes)        │
│  → authenticate → requireRole → control  │
└─────────────────────┬───────────────────┘
                      ▼
┌─────────────────────────────────────────┐
│              MySQL 8.0                    │
│  exam_categories / exam_questions        │
│  exam_records / exam_settings            │
│  exam_wrong_questions / exam_favorites   │
└─────────────────────────────────────────┘
```

> v2.0 明确：**无 Bmob 云后端、无原生微信小程序**，全部在 OA 自有技术栈实现。

## 模块划分

```
backend/src/features/exam/
├── services/
│   ├── category.service.js    # 分类树 CRUD + 题量统计
│   ├── question.service.js    # 题库 CRUD + 批量导入
│   ├── exam.service.js        # 练习/模拟/考试 抽题+判分+错题归集+断线续答
│   ├── record.service.js      # 我的记录/全员记录/详情/导出
│   ├── rank.service.js        # 排行榜
│   ├── wrong.service.js       # 错题本
│   ├── favorite.service.js    # 收藏
│   └── setting.service.js     # 答题设置
├── controllers/
│   ├── category.controller.js
│   ├── question.controller.js
│   ├── exam.controller.js
│   ├── record.controller.js
│   ├── wrong.controller.js
│   ├── favorite.controller.js
│   └── setting.controller.js
└── routes/
    └── exam.routes.js         # 统一路由注册
```

## 服务层设计

| 服务 | 核心函数 | 复用现有工具 |
|------|---------|------------|
| category.service | `tree`, `create`, `update`, `remove` | `db.query/execute`, `BusinessError`, `ErrorCode` |
| question.service | `list`, `create`, `update`, `remove`, `batchImport` | `db.query/execute`, Joi |
| exam.service | `startLearn`, `submitLearn`, `startMock`, `submitMock`, `startExam`, `submitExam`, `saveProgress` | `db`, `beijingDate`, 快照判分 |
| record.service | `myRecords`, `allRecords`, `detail`, `export` | `db.query`, `paginated()`, CSV BOM |
| rank.service | `rank(categoryId)` | `db.query` |
| wrong.service | `list`, `remove`, `upsertWrong` | `db.query` |
| favorite.service | `toggle`, `list` | `db.query` |
| setting.service | `get`, `update` | `db.query` |

## 前端 API 封装

```typescript
// webapp/src/api/exam.ts
import request from '@/utils/request'

export interface Question {
  id?: number; categoryId?: number; type: 'single'|'multiple'|'judge'
  title: string; options: { key: string; text: string }[]
  answer: string; analysis?: string; score: number; scoreMode?: 'exact'|'partial'
}
export interface Category { id: number; parentId: number; name: string; questionNum?: number; time?: number }
export interface ExamRecord { /* ... */ }

export function getCategoryList() {
  return request.post('/exam/categories/list')
}
export function getQuestionList(params: { page?, pageSize?, categoryId?, type?, keyword? }) {
  return request.post('/exam/questions/list', params)
}
// ... 其余 API 函数
```

```javascript
// miniapp/src/services/modules/exam.js（见 07 归属 / 蓝图 §5）
```

## 中间件

- `authenticate` — 登录校验（所有端点）
- `requireRole('admin','superadmin')` — 管理操作（分类/题库 CRUD、全员记录、导出、统计、设置更新）
- 无额外自定义中间件

## 路由注册

```js
// backend/src/app.js
app.use('/api/exam', examRoutes);
```

## 定时任务

```js
// 每 5 分钟扫描超时未交卷的考试/模拟（backend/src/common/tasks/exam.task.js）
const { scanTimeoutExams } = require('../../features/exam/services/exam.service');
// scheduler.js: cron('*/5 * * * *', scanTimeoutExams)
```

## 判分与快照

- 判分为纯 JS 计算（`grade(snapshot, answers)`），不依赖新 npm 包。
- `question_snapshot` 存 MySQL JSON，100 题约 5KB。
