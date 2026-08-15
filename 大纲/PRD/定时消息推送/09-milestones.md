# 09-milestones — 里程碑

> 维度：实施排期与里程碑
> 读者：orchestrator、项目负责人
> 上游依赖：`07-agent-matrix.md`

## 文档目标

定义实施阶段、顺序与交付物。

## 1. 里程碑总览

| 阶段 | 内容 | 产出 | 预计 |
|------|------|------|------|
| M0 | 设计定稿 | PRD 套件（本文档所在目录 00-09） | 已完成 |
| M1 | 后端基座 | env.js 扫描 + 错误码 + sql 迁移 + push.task + scheduler/app.js 挂载 | 0.5d |
| M2 | 后端业务 | features/push services/controllers/routes 全量 | 1.5d |
| M3 | Web 前端 | api/push.ts + views/push 三页 + router/modules | 1d |
| M4 | 测试与联调 | 单测/集成测试 + 企微真实发送联调 + type-check/build | 0.5d |
| M5 | 交付上线 | git 提交推送 test + 部署清单（.env 凭证） | 0.5d |

## 2. 阶段明细

### M1 后端基座（common-agent）
- `env.js`：`wecomGroupRobot.robots` 前缀扫描（`WECOM_ROBOT_<NAME>_KEY/_SECRET`）。
- `constants.js`：2701-2709 错误码。
- `sql/`：`20260818_push.sql`（三表 DDL，幂等 IF NOT EXISTS）。
- `common/tasks/push.task.js`：syncScripts + cron 回调（空实现调用 executor，待 M2）。
- `scheduler.js`：挂载 push.task；`app.js`：注册 `/api/push` 路由（待 M2 实现 controller）；`module.service.js`：+push 默认清单。

### M2 后端业务（push-agent）
- data-source / condition / template / mention / sender / log / executor / webhook / script 九个 service。
- push.controller + push.routes（15 端点）。
- 安全件：sender 加签与脱敏、executor 锁/幂等/限流/熔断/告警（superadmin）。

### M3 Web 前端（webapp-common-agent + webapp-admin-agent）
- `api/push.ts`（类型化，全端点）。
- `views/push/scripts.vue`（列表 + 编辑弹窗 + 条件编辑器 + dryRun 预览）。
- `views/push/webhooks.vue`（引用名登记 + 凭证状态）。
- `views/push/logs.vue`（列表 + 详情抽屉）。
- router/modules.ts 注册。

### M4 测试与联调
- 单测：condition（各操作符/组合）、template（变量/截断）、sender（加签向量/退避/脱敏）。
- 集成：接口权限/校验/限流/幂等；真实企微机器人 dryRun+真实发送联调。
- webapp type-check + build。

### M5 交付上线
- 按 `.AI/rules/git-workflow.md` 提交（单 commit，message 格式符合规范）→ 自动 push test。
- 部署清单：`.env` 需新增 `WECOM_ROBOT_*` 凭证；生产重启 PM2；验证 `/api/push/*` 与发送链路。

## 3. 风险与对策

| 风险 | 等级 | 对策 |
|------|:----:|------|
| 企微频率限制（20 条/分钟）导致发送失败 | 🟡 | 每日上限 + 错峰（脚本默认分散时间）+ 重试退避 |
| 加签联调失败（签名细节错误） | 🟡 | 单测签名向量先行；联调用真实机器人验证 |
| env 凭证缺失导致线上脚本全失败 | 🟡 | configured 前置校验 + 页面状态徽标 + 部署清单强调 |
| PM2 多实例重复发送 | 🟢 | Redis 锁 + 幂等键双保险，M4 重点验证 |

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-18 | 初始创建 | 殇血轮回 |
