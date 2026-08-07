# 07 — Agent 归属

## 归属表

| 目录 | 归属 Agent | 说明 |
|------|-----------|------|
| `backend/src/features/exam/` | **core-agent** | 答题模块后端（分类/题库/练习/模拟/考试/记录/排行/错题/收藏/设置） |
| `backend/src/common/utils/constants.js` | **common-agent** | ErrorCode ANSWER_*（3000-3099） |
| `backend/src/common/tasks/exam.task.js` | **common-agent** | 超时扫描定时任务（挂入 scheduler.js） |
| `backend/src/app.js` | **common-agent** | 路由注册 |
| `backend/scripts/init-db.js` | **common-agent** | 建表 + v2.0 迁移（DROP exam_papers、重建 exam_records、新增 3 表） |
| `backend/scripts/seed-answer.js` / `test-answer.js` | **common-agent** | 低压电工种子 / 端到端测试脚本 |
| `sql/exam_seed_low_voltage.json` | **common-agent** | 题库种子数据（保留） |
| `miniapp/src/pages/exam/` | **miniapp-core-agent** | 小程序答题页面（10 页） |
| `miniapp/src/services/modules/exam.js` | **miniapp-common-agent** | 小程序 API 封装 |
| `miniapp/src/components/question-card/`、`answer-card/` | **miniapp-common-agent** | 题目渲染 / 答题卡组件 |
| `miniapp/src/pages.json` | **miniapp-common-agent** | 页面注册 |
| `webapp/src/views/exam/` | **webapp-core-agent** | Web 答题管理页面（分类/题库/记录/统计/设置） |
| `webapp/src/api/exam.ts` | **webapp-common-agent** | Web API 类型定义 |
| `webapp/src/router/index.ts` + `config/modules.ts` | **webapp-common-agent** | 答题管理路由 + 模块配置 |

## 目录结构树

```
backend/src/
├── common/utils/constants.js        ← ErrorCode ANSWER_* (common-agent)
├── common/tasks/exam.task.js        ← 超时扫描 (common-agent)
├── common/tasks/scheduler.js        ← cron 挂载 (common-agent)
├── app.js                            ← 路由注册 (common-agent)
└── features/exam/                    ← 答题模块 (core-agent)
    ├── services/
    │   ├── category.service.js
    │   ├── question.service.js
    │   ├── exam.service.js
    │   ├── record.service.js
    │   ├── rank.service.js
    │   ├── wrong.service.js
    │   ├── favorite.service.js
    │   └── setting.service.js
    ├── controllers/（category/question/exam/record/wrong/favorite/setting）
    └── routes/exam.routes.js

miniapp/src/
├── services/modules/exam.js         ← API 封装 (miniapp-common-agent)
├── components/
│   ├── question-card/index.vue      ← 题目渲染 (miniapp-common-agent)
│   └── answer-card/index.vue        ← 答题卡网格 (miniapp-common-agent)
└── pages/exam/                       ← 答题页面 (miniapp-core-agent)
    ├── index/ category/ learn/ exam/ mock/
    ├── result/ wrong/ favorite/ rank/ records/

webapp/src/
├── api/exam.ts                       ← API 类型定义 (webapp-common-agent)
├── router/index.ts                   ← /exam 组 (webapp-common-agent)
├── config/modules.ts                 ← 答题管理模块 (webapp-common-agent)
└── views/exam/                       ← 管理页面 (webapp-core-agent)
    ├── categories.vue  questions.vue  records.vue  stats.vue  settings.vue
```

## 依赖关系

```
common-agent (ErrorCode + 定时任务 + init-db + 路由注册)
    ↓
core-agent (后端 services/controllers/routes)
    ↓
miniapp-common-agent + webapp-common-agent (API 封装 + 组件 + 路由)
    ↓
miniapp-core-agent + webapp-core-agent (页面实现)
```

### 开发顺序

1. **common-agent** → ErrorCode + init-db v2.0 迁移 + 定时任务 + app.js 路由注册
2. **core-agent** → service → controller → routes（含 seed-answer / test-answer）
3. **miniapp-common-agent** + **webapp-common-agent** → API 封装层 + 公共组件
4. **miniapp-core-agent** + **webapp-core-agent** → 页面实现

> ⚠️ Agent 边界铁律（R40）：跨 Agent 修改需由 orchestrator 协调。
