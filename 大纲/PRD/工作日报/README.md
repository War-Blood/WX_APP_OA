# 工作日报 模块

> 状态：✅ 已实现（commit `12e3963`）+ 文档已定稿
> 日期：2026-08-05

## 模块概述

工作日报是 OA 日报模块内的新日志类型（`report_type='office'`），面向全体员工——在办公室或不在出差的人员以四字段表单（今日工作内容 / 明日计划 / 遇到的问题 / 需协调事项）提报每日工作，数据复用现有 `daily_reports` 表，并纳入公出统计的全员当日 / 明日状态 / 日历视图。

### 关键特性

| 特性 | 说明 |
|------|------|
| 填写入口 | 写日报页第三个 Tab「工作日报」 |
| 表单字段 | 今日工作内容(必填) + 明日计划/问题/协调(选填) |
| 数据存储 | `daily_reports`，`report_type='office'`，无 DDL |
| 提交状态 | 提交即 `approved`，无审核流程 |
| 统计纳入 | 全员当日 / 明日状态 / 日历（只纳入实际填写者） |
| 统计排除 | 项目进展 / 人员分布 / 区域分布 / 个人统计 |
| Web 管理 | `views/report/daily.vue`（admin，查看/编辑/删除/筛选） |

### 后续规划

- **P1**：支持补填历史日期
- **P2**：草稿续写、未填写统计/个人统计纳入

## 文档索引

| 文档 | 维度 | 说明 |
|------|------|------|
| [00-index.md](./00-index.md) | 主索引 | 全貌导航 + 产品定位 |
| [01-requirements.md](./01-requirements.md) | 需求 | 愿景 / 角色 / 功能 P0/P1/P2 |
| [02-data-design.md](./02-data-design.md) | 数据 | ER 图 / DDL（无）/ 索引 |
| [03-api-design.md](./03-api-design.md) | API | 8 端点契约 / 错误码 |
| [04-business-logic.md](./04-business-logic.md) | 业务 | 6 规则 / 状态机 / 伪代码 |
| [05-ui-ux.md](./05-ui-ux.md) | UI/UX | 令牌 / 线框 / 组件复用 |
| [06-tech-architecture.md](./06-tech-architecture.md) | 技术 | 系统架构 / 模块划分 |
| [07-agent-matrix.md](./07-agent-matrix.md) | 归属 | Agent 归属表 / 文件清单 |
| [08-acceptance.md](./08-acceptance.md) | 验收 | Checklist / 质量门 9 项 |
| [09-milestones.md](./09-milestones.md) | 里程碑 | 实施阶段 / P1/P2 排期 |
| [architecture-blueprint.md](./architecture-blueprint.md) | 蓝图 | 10 章节代码骨架 |
| [结构化需求笔记.md](./结构化需求笔记.md) | 需求笔记 | 7 维度访谈结论 |
| [技术调研报告.md](./技术调研报告.md) | 调研 | 独立模块方案 vs 现状方案对比 |

## Agent 分工

| Agent | 负责范围 |
|-------|---------|
| core-agent | `backend/src/core/controllers/report.controller.js`、`core/services/report.service.js`、`core/services/stats.service.js` |
| data-agent | `features/(stats)` 域协调（本次未改） |
| miniapp-core-agent | `report-edit` / `report-history` / `report-detail` / `profile/stats` |
| miniapp-admin-agent | `admin/daily-overview` |
| webapp-core-agent | `views/report/daily.vue`(新) / `index.vue` / `daily-status.vue` |
| webapp-common-agent | `router` / `config/modules.ts` / `api/report.ts` / `ReportDetailDialog.vue` |

> 跨模块协调：`core/services/stats.service.js` 归属 core-agent，但 stats 域通常归 data-agent，需 orchestrator 按 R40 协调。

## 提交记录

| commit | 内容 |
|--------|------|
| `12e3963` | feat(report): 启用工作日报并入公出统计（15 文件） |
| `2092208` | docs(prd): 工作日报主规 10 份文档 |
| `3630949` | docs(prd): 架构蓝图 |
| (本次) | docs(prd): README + 质量门清理 |
