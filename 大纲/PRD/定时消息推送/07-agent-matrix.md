# 07-agent-matrix — Agent 归属

> 维度：模块 Agent 分工（R40 边界铁律）
> 读者：orchestrator、各模块 Agent
> 上游依赖：`06-tech-architecture.md`

## 文档目标

明确本功能块涉及的文件归属，保证跨 Agent 修改由 orchestrator 协调。

## 1. 文件归属矩阵

| 文件 | 归属 Agent | 说明 |
|------|-----------|------|
| `backend/src/features/push/**`（全部） | **push-agent（新）** | 独立新模块，参照 features/exam 结构 |
| `backend/src/common/tasks/push.task.js` | **common-agent** | 定时任务（与 scheduler.js 同级） |
| `backend/src/common/tasks/scheduler.js` | **common-agent** | 挂载 push.task |
| `backend/src/common/config/env.js` | **common-agent** | wecomGroupRobot 前缀扫描 |
| `backend/src/common/utils/constants.js` | **common-agent** | 错误码 2700-2799 追加 |
| `backend/src/app.js` | **common-agent** | 路由注册 `/api/push` |
| `backend/src/core/services/module.service.js` | **core-agent** | web 默认模块清单 +push |
| `sql/` 迁移文件 | **common-agent** | push 三表 DDL |
| `webapp/src/api/push.ts` | **webapp-common-agent** | API 封装 |
| `webapp/src/views/push/*.vue` | **webapp-admin-agent** | 管理页面（脚本/群机器人/日志） |
| `webapp/src/router/index.ts` | **webapp-common-agent** | 路由注册 |
| `webapp/src/config/modules.ts` | **webapp-common-agent** | 菜单配置 |
| `backend/tests/**`（push 相关） | 对应 Agent | 单测/集成测试 |

> push-agent 为新建技能；若暂不建独立 Agent，可由 orchestrator 直接协调 common-agent 与 core-agent 完成（本功能块实现阶段即按此执行）。

## 2. 实现顺序（依赖链）

1. **common-agent**：env.js 扫描 + constants.js 错误码 + sql 迁移 + push.task + scheduler 挂载 + app.js 路由 + module.service.js 清单
2. **push-agent**：features/push 全部 services/controllers/routes（依赖 1 的基座）
3. **webapp-common-agent**：api/push.ts + router + modules.ts
4. **webapp-admin-agent**：views/push 三页（依赖 3 的 API 封装）
5. 测试与联调：orchestrator 验收

## 3. 风险提示

- push.task 归属 common（common-agent），executor 归属 features/push（push-agent）：task 只做 cron 注册与调用，业务全在 features/push，避免跨 Agent 写代码。
- webhook 凭证读写只在 env.js（common-agent）与 sender.service（push-agent）之间通过 config 传递，不得在 controller/routes 层触碰。
