# 06-tech-architecture — 技术架构

> 维度：技术选型、目录结构、部署拓扑
> 读者：后端开发、运维
> 上游依赖：`02-data-design.md`、`04-business-logic.md`
> 下游影响：`07-agent-matrix.md`、实现

## 文档目标

明确技术选型与文件布局，保证与现有系统一致、可维护。

## 1. 技术选型

| 项 | 选择 | 理由 |
|----|------|------|
| 调度 | `node-cron`（已依赖） | 与现有 scheduler.js 完全一致；动态注册 + 全量重同步 |
| 时区 | 脚本级 `timezone`，默认 Asia/Shanghai | node-cron 原生支持，与现有任务一致 |
| 发送 | `axios`（已依赖） | 与 WPS webhook 发送方式一致 |
| 加签 | Node `crypto`（内置） | HMAC-SHA256 + base64，无新依赖 |
| 锁/计数 | Redis（已依赖 `common/config/redis.js`） | SETNX 锁 + INCR 计数，PM2 多实例安全 |
| 存储 | MySQL（已依赖 `common/config/database.js`） | 三张新表，参数化查询 |
| 凭证 | `.env` 环境变量 | 对齐 WPS（`WECOM_SMARTSHEET_WEBHOOK_KEY` 同级别） |
| 前端 | Vue3 + Element Plus（已有） | 弹窗表单 + 表格 + 抽屉标准模式 |

## 2. 目录结构（后端）

```
backend/src/
├── features/push/                      # 新模块（归属见 07）
│   ├── routes/push.routes.js           # 端点注册 + 权限中间件
│   ├── controllers/push.controller.js  # 请求/响应包装
│   └── services/
│       ├── webhook.service.js          # 群机器人配置 CRUD + configured 判定
│       ├── script.service.js           # 脚本 CRUD + 校验 + 触发调度重同步
│       ├── data-source.service.js      # 预定义数据源注册表 + 查询 + 元信息
│       ├── condition.service.js        # 条件判定引擎
│       ├── template.service.js         # 模板渲染
│       ├── mention.service.js          # @ 目标解析（phone / qywx_userid）
│       ├── sender.service.js           # 加签 + 发送 + 指数退避重试（核心安全件）
│       ├── log.service.js              # 执行日志读写
│       └── executor.service.js         # 执行编排（锁→幂等→限流→判定→渲染→发送→落库→告警）
├── common/tasks/push.task.js           # 调度注册/重同步 + cron 回调（common-agent）
└── common/config/env.js                # +wecomGroupRobot 前缀扫描
```

## 3. 模块依赖

```
push.task (common) ──> executor ──> data-source / condition / template / mention / sender
                                        │
script.service ──> push.task.syncScripts()   （CRUD 后重同步）
sender ──> env 凭证注册表（env.js）          （读 key/secret，不落日志）
executor ──> db（push_task_logs / messages 告警）/ redis（锁与计数）
```

## 4. 凭证与环境变量（2026-08-15 定稿）

群机器人设置**仅需「名称 + Webhook 地址（或 Key）」**：凭证存库（`push_webhooks.webhook_key`，可选 `secret` 加签），**零回显**（API 仅脱敏摘要，编辑留空不覆盖）。不依赖任何环境变量；`WECOM_ROBOT_*` 环境变量方案已移除（用户确认后台不提供 env 设置方式）。

> 历史说明：曾支持 env 模式（凭证存服务端 `.env`，对齐 WPS），2026-08-15 按用户要求移除，后台只保留名称 + Webhook。

## 5. 部署拓扑

- 与现有服务一致：PM2 fork 模式 + Nginx 反代到 3000。
- 多实例：各实例均注册 cron；Redis 锁 + 幂等键保证每 `script_id+分钟` 只执行一次。
- 出站：服务器需能访问 `qyapi.weixin.qq.com:443`。
- 企微侧运维：群机器人"安全设置"配置**可信 IP 白名单**（本服务器出口 IP）。

## 6. 安全实现要点（代码级）

1. `sender.service.js`：URL 固定拼接，key 从 env 读取后仅用于 URL，异常信息中 URL 做 `key=***` 脱敏。
2. 所有对外 API 响应经 controller 白名单字段映射，杜绝透传 DB 原始行。
3. `push_task_logs.attempts` 写入前对响应体截断（500 字符）并替换 URL 中 key。
4. 测试端点限流：Redis `INCR oa:push:test:<scriptId>:<minute>` + EXPIRE 60，>3 返回 429。
5. 操作审计：webhook/script 增删改、测试发送 → 复用现有 operation_logs 写入（模块='push'）。

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-18 | 初始创建 | 殇血轮回 |
