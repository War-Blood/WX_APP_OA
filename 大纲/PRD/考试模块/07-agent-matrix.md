# 07 — Agent 归属

## 归属表

| 目录 | 归属 Agent | 说明 |
|------|-----------|------|
| `backend/src/features/exam/` | **core-agent** | 考试模块归属核心业务（与 attendance 同级） |
| `backend/src/common/utils/constants.js` | **common-agent** | ErrorCode 扩展（3000-3099） |
| `backend/src/app.js` | **common-agent** | 路由注册 |
| `miniapp/src/pages/exam/` | **miniapp-core-agent** | 小程序考试页面（功能中心子模块） |
| `miniapp/src/services/modules/exam.js` | **miniapp-common-agent** | 小程序 API 封装 |
| `miniapp/src/pages/features/index.vue` | **miniapp-common-agent** | 功能中心入口 |
| `webapp/src/views/exam/` | **webapp-core-agent** | Web 管理后台考试页面 |
| `webapp/src/api/exam.ts` | **webapp-common-agent** | Web API 类型定义 |

## 目录结构树

```
backend/src/
├── common/utils/constants.js        ← ErrorCode 新增 (common-agent)
├── app.js                            ← 路由注册 (common-agent)
└── features/exam/                    ← 考试模块 (core-agent)
    ├── services/
    │   ├── question.service.js
    │   ├── paper.service.js
    │   ├── exam.service.js
    │   └── record.service.js
    ├── controllers/
    │   ├── question.controller.js
    │   ├── paper.controller.js
    │   ├── exam.controller.js
    │   └── record.controller.js
    └── routes/
        └── exam.routes.js

miniapp/src/
├── services/modules/exam.js         ← API 封装 (miniapp-common-agent)
└── pages/exam/                       ← 考试页面 (miniapp-core-agent)
    ├── index/index.vue
    ├── practice/index.vue
    ├── exam/index.vue
    ├── result/index.vue
    └── records/index.vue

webapp/src/
├── api/exam.ts                       ← API 类型定义 (webapp-common-agent)
└── views/exam/                       ← 管理页面 (webapp-core-agent)
    ├── questions.vue
    ├── papers.vue
    ├── records.vue
    └── stats.vue

sql/
└── v3.0_exam.sql                     ← 建表脚本
```

## 依赖关系

```
common-agent (ErrorCode + 路由注册)
    ↓
core-agent (后端 services/controllers/routes)
    ↓
miniapp-common-agent + webapp-common-agent (API 封装)
    ↓
miniapp-core-agent + webapp-core-agent (页面实现)
```

### 开发顺序

1. **common-agent** → ErrorCode 扩展 + app.js 路由注册
2. **core-agent** → 数据库建表 + service → controller → routes
3. **miniapp-common-agent** + **webapp-common-agent** → API 封装层
4. **miniapp-core-agent** + **webapp-core-agent** → 页面实现

> ⚠️ Agent 边界铁律（R40）：跨 Agent 修改需由 orchestrator 协调。