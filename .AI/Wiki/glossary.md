# 术语表 — Glossary

> 本文件定义项目中所有关键术语的准确含义，供 AI 工具和开发者统一理解。新增术语时请同步更新。

---

## 项目架构术语

| 术语 | 英文 | 定义 | 适用场景 |
|------|------|------|---------|
| 智慧办公助手 | WX-APP-OA | 整个 OA 系统的项目名称 | 全局 |
| 子项目 | sub-project | 指 `backend/`、`miniapp/`、`webapp/`、`test/` 中的一个独立模块 | 任务路由 |
| 模块 | module | 子项目内的功能单元（如审批模块、日报模块） | 代码组织 |
| 组件 | component | UI 层面的可复用单元（如 navbar、card） | 前端开发 |

## 后端术语

| 术语 | 定义 |
|------|------|
| 分层架构 | routes → controllers → services → config(database/redis) 的四层模型 |
| 参数化查询 | 使用 mysql2 的 `?` 或 `:param` 占位符构建 SQL，禁止字符串拼接 |
| Joi | 后端参数校验库，在 controllers 层使用 |
| 统一响应格式 | `{ code: 0, message: "success", data: {...} }` — 所有 API 响应必须遵循的格式 |
| 错误码 (code) | 响应中的 `code` 字段：0=成功，401=Auth，1001=Validation，1002=Not Found，2001=Business |
| Winston | 后端结构化日志库 |

## 前端术语

| 术语 | 定义 |
|------|------|
| Composition API | Vue 3 的 `<script setup>` 语法，项目统一使用 |
| rpx | 小程序响应式长度单位，750rpx = 屏幕宽度 |
| 高效蓝 | 项目主色 `#2B6DE8`，用于按钮、链接、Tab 激活态 |
| L1-L4 | 小程序页面层级：L1=Tab页，L2=功能列表页，L3=详情编辑页，L4=弹窗浮层 |
| services/modules | 小程序前端 API 调用层，所有后端请求统一走此路径 |

## 数据术语

| 术语 | 定义 |
|------|------|
| snake_case | 数据库表和字段的命名风格，如 `daily_reports`、`create_time` |
| 迁移脚本 | `scripts/` 和 `sql/migrations/` 下的增量 SQL，按 `NNN_description.sql` 命名 |
| daily_report (旧版) | 原始员工日报+排班数据库，服务器上仍在运行 |
| wx_app_oa (新版) | 重构后的完整 OA 平台数据库 |

## 协作术语

| 术语 | 定义 |
|------|------|
| COLLABORATION-RULES.md | 根目录的全局协作规则文件，定义 R001-R013 规则 |
| SKILL.md | `.AI/skills/` 下每个 skill 的入口文件，含 YAML frontmatter |
| R001-R013 | COLLABORATION-RULES.md 中定义的 13 条协作规则编号 |
| 迭代档案 | `.workbuddy/memory/YYYY-MM-DD.md` 格式的周期总结文件 |
| Markdown 统一入口 | 指本文件、`_index.md`、`COLLABORATION-RULES.md` 等引导文件 |

---

## 服务器术语

| 术语 | 值/定义 |
|------|---------|
| 生产服务器 IP | `111.229.107.123` |
| 生产域名 | `warblood.online` |
| SSH 密钥路径 | `~/.ssh/wx_app_key.pem`（Linux/Mac）或 `C:\Users\WarBlood\.ssh\wx_app_key.pem`（Windows） |
| PM2 进程名 | `wx-app-oa-api` |
| PM2 模式 | fork（单实例，非 cluster） |
