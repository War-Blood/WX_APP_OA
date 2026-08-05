# 06 — 技术架构

## 系统架构

```
┌─────────────────────┐    ┌──────────────────────┐
│   微信小程序（uni-app） │    │   Web 管理后台 (Vue3)  │
│   pages/exam/         │    │   views/exam/          │
│   services/modules/   │    │   api/exam.ts          │
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
│  exam_papers / exam_records              │
└─────────────────────────────────────────┘
```

## 模块划分

```
backend/src/features/exam/
├── services/
│   ├── question.service.js    # 列表/创建/更新/删除/批量导入
│   ├── paper.service.js       # 列表/创建/更新/删除/发布/克隆
│   ├── exam.service.js        # 开始考试/交卷判分/截屏警告/超时扫描
│   └── record.service.js      # 个人记录/全员记录/成绩统计
├── controllers/
│   ├── question.controller.js
│   ├── paper.controller.js
│   ├── exam.controller.js
│   └── record.controller.js
└── routes/
    └── exam.routes.js         # 统一路由注册
```

## 服务层设计

| 服务 | 核心函数 | 复用现有工具 |
|------|---------|------------|
| question.service | `list`, `create`, `update`, `delete`, `batchImport` | `db.query/execute`, `BusinessError`, `ErrorCode` |
| paper.service | `list`, `create`, `update`, `delete`, `publish`, `clone` | `db.query/execute`, JSON解析 |
| exam.service | `start`, `submit`, `recordWarn`, `checkScope`, `scanTimeout` | `beijingDate`（UTC+8 工具） |
| record.service | `myRecords`, `allRecords`, `stats` | `db.query`, `paginated()` |

### 前端 API 封装

```typescript
// webapp/src/api/exam.ts
import request from '@/utils/request'

export interface Question {
  id?: number; categoryId?: number; type: 'single'|'multiple'|'judge'
  title: string; options: { key: string; text: string }[]
  answer: string; analysis?: string; score: number; scoreMode?: 'exact'|'partial'
}
export interface Paper { /* ... */ }
export interface ExamRecord { /* ... */ }

export function getQuestionList(params: { page?, pageSize?, categoryId?, type?, keyword? }) {
  return request.post('/exam/questions/list', params)
}
export function startExam(paperId: number) {
  return request.post('/exam/exam/start', { paperId })
}
// ... 其余 API 函数
```

### 中间件

- `authenticate` — 登录校验（所有端点）
- `requireRole('admin','superadmin')` — 管理操作（题库/试卷/全员记录）
- 无额外自定义中间件

## 路由注册

```js
// backend/src/app.js 新增一行
app.use('/api/exam', examRoutes);
```

## 定时任务

超时扫描建议使用 PM2 或 cron：
```js
// 每 5 分钟扫描超时未交卷的考试
setInterval(async () => {
  await examService.scanTimeout();
}, 5 * 60 * 1000);
```

或使用项目现有的定时任务机制（如有）。