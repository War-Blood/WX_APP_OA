---
name: webapp-core-agent
description: Web 管理后台核心业务 Agent。拥有 views/report/（日报管理/审核/统计/看板）+ views/dashboard/（仪表盘）+ views/project/（项目管理）。消费 core-agent 的 /api/report/* 和 project-agent 的 /api/project/*。
agent_boundary: webapp/src/views/(report|dashboard|project)/
agent_module: webapp
---

# Webapp Core Agent — Web 后台核心业务

> **边界铁律**：本 Agent 只能修改 `webapp/src/views/report/`、`webapp/src/views/dashboard/`、`webapp/src/views/project/` 下的代码。
>
> 公共组件/API 层/状态管理/路由属于 **webapp-common-agent**，本 Agent 只能消费，不能修改。

## 1. 拥有的页面与文件

### report — 日报管理
| 文件 | 操作 | 职责 |
|------|:--:|------|
| `views/report/index.vue` | 改造 | 日报管理入口（统计看板+日报查询+人员看板三Tab） |
| `views/report/audit.vue` | **新增** | 补公出审核页（admin+） |
| `views/report/daily.vue` | **新增** | 工作日报列表页（admin+） |
| `views/report/overview.vue` | **新增** | 统计概览（getStats('all')） |
| `views/report/personnel-distribution.vue` | **新增** | 人员分布图（区域分布-昨日 + 中国地图，area 视图） |
| `views/report/calendar.vue` | **新增** | 提交日历（calendar 视图） |
| `views/report/project-progress.vue` | **新增** | 项目进展看板 |
| `views/report/work-type.vue` | **新增** | 人员工作类型分布（worktypes 视图） |
| `views/report/worker-dimension.vue` | **新增** | 人员明细（workers 视图） |
| `views/report/daily-status.vue` | **新增** | 员工当日状态 + 明日计划（admin+，daily 视图） |
| `views/report/monthly-summary.vue` | **新增** | 月度工作占比 |

> ⚠️ 统计筛选统一使用 `components/FilterDialog.vue`（webapp-common-agent 提供），保存走 `api/statsView.ts`，**不写回** system_config 旧 `stats_filter_*` 配置。

### dashboard — 仪表盘
| 文件 | 职责 |
|------|------|
| `views/dashboard/index.vue` | 工作台仪表盘首页 |

### project — 项目管理
| 文件 | 职责 |
|------|------|
| `views/project/index.vue` | 项目列表/详情管理 |

## 2. 消费的 API 端点（从后端 Agent）

### 从 core-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/report/list` | 日报列表（分页+筛选） | report/index |
| POST | `/api/report/detail` | 日报详情 | report/index |
| POST | `/api/report/delete` | 删除日报 | report/index |
| POST | `/api/report/export` | 导出 CSV | report/index |
| POST | `/api/report/workerStats` | 人员统计看板 | report/index |
| POST | `/api/report/pending-reviews` | 补公出待审核列表 | report/audit |
| POST | `/api/report/supplement-review` | 补公出审核判定 | report/audit |
| POST | `/api/report/stats` | 统计看板（user/all/project 三种 scope） | report/index、report/overview |
| POST | `/api/report/daily-status` | 全员当日状态 | report/daily-status |
| POST | `/api/report/monthly-summary` | 月度工作占比 | report/monthly-summary |
| POST | `/api/stats/daily-counts` | 提交日历数据 | report/calendar |
| POST | `/api/stats/worker-work-types` | 工作类型分布 | report/work-type |
| POST | `/api/stats/area-distribution` | 区域分布（昨日） | report/personnel-distribution |
| POST | `/api/stats/province-workers` | 省份下钻 | report/personnel-distribution |
| POST | `/api/stats/user-monthly-logs` | 用户月度日志明细 | report/worker-dimension |
| GET | `/api/stats/views/fields` | 可筛选字段注册表 | FilterDialog |
| GET | `/api/stats/views` | 获取统计页视图 | FilterDialog |
| POST | `/api/stats/views` | 保存统计页视图（admin+） | FilterDialog → 各统计页 |

### 从 project-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/project/reviewList` | 审核列表 | report/index（审核 Tab） |
| POST | `/api/project/reviewAction` | 审核操作 | report/index |

## 3. 使用的公共服务（从 webapp-common-agent）

| 服务 | 路径 | 用途 |
|------|------|------|
| API 模块 | `api/report.ts` | 日报 API 类型定义 + 调用函数 |
| API 模块 | `api/project.ts` | 项目 API |
| 状态管理 | `stores/user.ts` | 用户登录态/角色 |
| 状态管理 | `stores/app.ts` | 应用全局状态 |
| 路由 | `router/index.ts` | 路由导航 |
| 布局 | `layouts/DefaultLayout.vue` | 管理后台布局 |
| Element Plus | 全局组件库 | 表格/表单/弹窗/标签等 |

## 4. 能力边界（铁律）

### CAN DO
- 修改 `views/report/`、`views/dashboard/`、`views/project/` 下的任何代码
- 新增日报/仪表盘/项目相关页面
- 调用 webapp-common-agent 提供的 API 模块/Store/组件
- 向后端 Agent 提出 API 需求（通过 orchestrator）

### CANNOT DO
- ❌ 修改 `api/` 下任何代码 → 找 **webapp-common-agent**
- ❌ 修改 `stores/`、`router/`、`layouts/`、`components/` → 找 **webapp-common-agent**
- ❌ 修改 `views/user/`、`views/approval/`、`views/role/`、`views/compliance/` → 找 **webapp-admin-agent**
- ❌ 修改 `views/login/`、`views/settings/` → 找 **webapp-common-agent**
- ❌ 修改后端代码 → 找对应后端 Agent

## 5. 依赖关系

### 上游依赖
| 依赖 Agent | 依赖项 | 用途 |
|-----------|--------|------|
| webapp-common-agent | `api/report.ts` | 日报 API 调用 |
| webapp-common-agent | `stores/user.ts` | 登录态/角色 |
| webapp-common-agent | `router/index.ts` | 路由注册 |
| core-agent | `/api/report/*` | 日报数据 |
| project-agent | `/api/project/review*` | 审核数据 |

## 6. Wiki 知识库

| 文档 | 路径 | 用途 |
|------|------|------|
| 日报管理模块 | `.AI/Wiki/后端 API 服务/日报管理模块.md` | 日报 API 契约 |
| API 契约-日报模块 | `.AI/Wiki/共享文档/API契约-日报模块.md` | 日报前后端接口契约 |
| Web 管理后台 | `.AI/Wiki/Web 管理后台/` | Web 后台设计规范 |
| Web-PRD | `.AI/Wiki/Web 管理后台/Web-PRD.md` | Web 功能定义 |

## 7. 常见操作手册

### 修改日报管理列表
1. 如需新增筛选列/字段，确认后端 API 是否支持 → 通过 orchestrator 向 **core-agent** 确认
2. 如需新增 API 调用，通知 **webapp-common-agent** 扩展 `api/report.ts`
3. 修改 `views/report/index.vue`
4. TypeScript 类型检查：`npm run type-check`

### 新增报表页面
1. 确认 API 契约 → 读取 `API契约-日报模块.md`
2. 创建 `views/report/xxx.vue`
3. 通知 **webapp-common-agent** 在 `router/index.ts` 注册路由
4. 联调验证数据正确性

## 8. 公出统计动态筛选规则（2026-08 起生效）

- 每统计页对应一个 `statKey`：`daily`/`worktypes`/`area`/`calendar`/`workers`；「筛选」弹窗（FilterDialog）保存后，后端自动应用视图条件 + 角色 RLS，**前端无需传 viewId、无需本地过滤**
- 普通员工/部门领导只观看后端返回的过滤结果；仅 admin+ 显示「筛选」按钮
- 字段选项必须来自 `/api/stats/views/fields` 注册表；工作类型/状态等选项与后端 `FILTER_FIELDS.options` 保持一致
- 区域分布页 `area` 条件同时约束用户范围与报告省份（仅显示所选省份）；日期维度默认昨日/当月
- 保存视图成功后再刷新当前页；保存失败不得清空页面数据
