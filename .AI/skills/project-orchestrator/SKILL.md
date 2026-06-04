---
name: project-orchestrator
description: 智慧办公助手项目统一调配规则。作为顶层入口，协调各子项目 skill 规则，决策任务应分配给哪个子项目及其对应的 skill。
agent_created: true
---

# 项目统一调配规则 — Project Orchestrator

> 本 Skill 需配合 `COLLABORATION-RULES.md` 使用，规则编号 R001-R013 定义于该文件。

## 引用文档

在任务路由前，确认已加载以下上下文：
1. `COLLABORATION-RULES.md` — 全局协作规则（必读）
2. `.AI/rules/coding-standards.md` — 编码规范
3. `.AI/rules/git-workflow.md` — Git 工作流
4. `.AI/rules/review-checklist.md` — Code Review 清单
5. `.AI/memory/MEMORY.md` — 项目长期记忆
6. 对应子项目的 Wiki 文档（按需加载，位于 `.AI/Wiki/`）

## 任务执行全流程

接到任务后，按以下 7 阶段执行：

### Phase 1: 指令解析
- 提取关键词（动作 + 目标 + 范围）
- 分类命令类型（代码生成/问题解答/Bug 修复/文件操作/部署运维）
- 标注优先级（P0/P1/P2）

### Phase 2: 上下文加载
- 加载 `MEMORY.md`（项目记忆）
- 按 R001 规则路由到对应子项目
- 按需加载 Wiki 文档（目标模块，不加载全量）

### Phase 3: 任务分解
- 创建 TODO 清单（TodoWrite 工具）
- 标记依赖关系
- 估算影响范围

### Phase 4: 规则约束执行
- 逐项执行 TODO，每项前检查 R005-R013
- 不满足则调整方案或拦截

### Phase 5: 工具调用
- 先读后写，优先 Edit（diff 模式）
- 跨项目按依赖顺序执行

### Phase 6: 验证自检
- lint + test 双重检查
- 规则回顾

### Phase 7: 结果输出
- 按附录B模板输出变更摘要
- 判断是否触发 R010 归档

## 项目拓扑

```
智慧办公助手 (WX-APP-OA)
├── backend/       ─── .AI/skills/backend-project/     ← 后端 API 服务
├── miniapp/       ─── .AI/skills/miniapp-project/     ← 微信小程序前端
├── webapp/        ─── .AI/skills/webapp-project/      ← Web 管理后台
├── test/          ─── .AI/skills/test-project/         ← 测试
└── experts/       ─── .AI/skills/api-testing-expert/   ← 专家技能
                       .AI/skills/backend-debug/
                       .AI/skills/bugpack-operations/
```

## 任务路由决策树

接到任务后，按以下顺序判断并自动加载对应 skill：

### 1. 单项目任务 — 仅影响一个子项目

| 任务类型 | 目标目录 | 加载 skill |
|---------|---------|-----------|
| 后端 API 开发/修复/重构 | `backend/` | `backend-project` |
| 小程序页面/组件/样式开发 | `miniapp/` | `miniapp-project` + `ui-ux-pro-max` |
| Web 管理后台开发 | `webapp/` | `webapp-project` + `ui-ux-pro-max` |
| 编写测试用例 | `test/` | `test-project` |
| Bug 管理 | 任意 | `bugpack-manager` |
| UI/UX 设计评审 | `miniapp/` 或 `webapp/` | `ui-ux-pro-max` |

### 2. 跨项目任务 — 影响多个子项目

优先判定**主变更项目**，再依次处理依赖项目：

| 主变更 | 连带影响 | 加载顺序 |
|--------|---------|---------|
| `backend/` 新增/修改 API | `miniapp/` + `webapp/` 同步调用 | ① `backend-project` → ② `miniapp-project` / `webapp-project` |
| `miniapp/` 页面改造 | 无后端变更 | ① `miniapp-project` + `ui-ux-pro-max` |
| 数据库迁移 | `backend/` 查询同步 | ① SQL 脚本 → ② `backend-project` |
| 部署上线 | `backend/` + 服务器运维 | ① `backend-project` → ② 运维操作 |

### 3. 全栈任务（前后端并行）

使用 **Team 模式** 同时调度多个 Agent：

```
主 Agent（orchestrator）
├── Agent A → 后端：加载 backend-project，开发 API
├── Agent B → 前端：加载 miniapp-project + ui-ux-pro-max，对接 API
└── Agent C → 测试：加载 test-project，编写集成测试
```

## 跨项目约定

### API 接口规范（后端 → 前端）

后端新增/修改 API 后必须同步以下内容给前端/测试：
- 接口路径、请求方法、请求/响应体结构
- 错误码定义
- 权限要求（是否需要 JWT）

### 数据流向

```
数据库 → 后端 Service → 后端 Controller → API 路由
    ↓
前端 Service (services/modules/*.js) → 页面组件
```

### 响应格式

统一响应：`{ code: 0, message: "success", data: {...} }`

### Skill 联动原则

任意子项目 skill 中遇到需要跨项目处理的问题时：
1. 如果是本项目的边界问题 → 直接结论，不越界修改
2. 如果是跨项目问题 → 记录问题，自动通知或引入对应子项目 skill 处理
3. 不明确归属的问题 → 返回项目协调层（orchestrator）重新分发

## 当前项目状态

| 子项目 | 阶段 | 状态 | 下次任务建议 |
|--------|------|------|-------------|
| `backend/` | 核心 API 完成 | ✅ 可部署 | P1 模块开发 或 部署上线 |
| `miniapp/` | API 对接完成 | ✅ 已上线 | P1 页面开发 或 发布新版 |
| `webapp/` | M0 完成 | ⬜ 待开发 | M1 用户与权限开发 |
| `test/` | 初始化完成 | ⬜ 待开发 | 后端 API 集成测试 |

## 环境信息

- 生产服务器: `111.229.107.123` | `warblood.online`
- SSH 密钥: `C:\Users\WarBlood\.ssh\wx_app_key.pem`
- 小程序 AppID: `wx56609483f0ee55b6`
- 数据库: `daily_report`（旧版） + `wx_app_oa`（新版）
