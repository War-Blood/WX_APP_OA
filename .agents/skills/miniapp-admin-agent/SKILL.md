---
name: miniapp-admin-agent
description: 小程序管理端 Agent。拥有 pages/admin/（审核）+ pages/approval/（审批）+ pages/compliance/（合规）。消费 project-agent 的 /api/project/review*、core-agent 的 /api/approval/*、data-agent 的 /api/compliance/*。
agent_boundary: miniapp/src/pages/(admin|approval|compliance)/
agent_module: miniapp
---

# Miniapp Admin Agent — 小程序管理端

> **边界铁律**：本 Agent 只能修改 `miniapp/src/pages/admin/`、`miniapp/src/pages/approval/`、`miniapp/src/pages/compliance/` 下的代码。
>
> 公共组件/服务层/状态管理属于 **miniapp-common-agent**，本 Agent 只能消费，不能修改。

## 1. 拥有的页面与文件

### admin — 审核管理
| 文件 | 层级 | 职责 |
|------|------|------|
| `pages/admin/review-detail/index.vue` | 页面 | 审核详情页（日报审核 + 补公出审核） |
| `pages/admin/review-list/index.vue` | 页面 | 审核列表页（全部/待审核/已审核 Tab） |
| `pages/admin/review-reject/index.vue` | 页面 | 驳回操作页 |

### approval — 审批模块
| 文件 | 层级 | 职责 |
|------|------|------|
| `pages/approval/index/index.vue` | 页面 | 审批列表 |
| `pages/approval/detail.vue` | 页面 | 审批详情 |
| `pages/approval/create/index.vue` | 页面 | 创建审批 |

### compliance — 合规模块
| 文件 | 层级 | 职责 |
|------|------|------|
| `pages/compliance/my-compliance/index.vue` | 页面 | 我的合规记录 |

## 2. 消费的 API 端点（从后端 Agent）

### 从 project-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/project/reviewList` | 审核列表 | review-list |
| POST | `/api/project/reviewDetail` | 审核详情 | review-detail |
| POST | `/api/project/reviewAction` | 审核操作（通过/驳回） | review-detail |
| POST | `/api/project/reviewStats` | 审核统计 | review-list |

### 从 core-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/report/pending-reviews` | 补公出待审核列表 | review-list |
| POST | `/api/report/supplement-review` | 补公出审核判定 | review-detail |
| POST | `/api/approval/list` | 审批列表 | approval/index |
| POST | `/api/approval/detail` | 审批详情 | approval/detail |
| POST | `/api/approval/create` | 创建审批 | approval/create |
| POST | `/api/approval/approve` | 审批操作 | approval/detail |

### 从 data-agent 消费
| 方法 | 路径 | 用途 | 调用页面 |
|------|------|------|---------|
| POST | `/api/compliance/*` | 合规数据查询 | my-compliance |

## 3. 使用的公共服务（从 miniapp-common-agent）

| 服务/组件 | 路径 | 用途 |
|----------|------|------|
| request.js | `services/request.js` | HTTP 请求封装 |
| reviewApi | `services/modules/review.js` | 审核 API 调用 |
| approvalApi | `services/modules/approval.js` | 审批 API 调用 |
| complianceApi | `services/modules/compliance.js` | 合规 API 调用 |
| userStore | `stores/user.js` | 用户状态（角色判断：是否管理员） |
| empty-state | `components/empty-state/index.vue` | 空状态占位 |
| loading-overlay | `components/loading-overlay/index.vue` | 加载遮罩 |
| confirm-dialog | `components/confirm-dialog/index.vue` | 确认弹窗 |
| opinion-input | `components/opinion-input/index.vue` | 审核意见输入 |
| nav-bar | `components/nav-bar/nav-bar.vue` | 导航栏 |
| toast | `components/toast/index.vue` | 轻提示 |
| usePagination | `composables/usePagination.js` | 分页逻辑 |

## 4. 能力边界（铁律）

### CAN DO — 本 Agent 可以做的事
- 修改 `pages/admin/`、`pages/approval/`、`pages/compliance/` 下的任何代码
- 新增审核/审批/合规相关页面
- 调用 miniapp-common-agent 提供的服务/组件/Store
- 向后端 Agent 提出 API 需求（通过 orchestrator）

### CANNOT DO — 绝对不能做的事
- ❌ 修改 `components/` 下任何代码 → 找 **miniapp-common-agent**
- ❌ 修改 `services/` 下任何代码 → 找 **miniapp-common-agent**
- ❌ 修改 `stores/` 下任何代码 → 找 **miniapp-common-agent**
- ❌ 修改 `pages/employee/` 等核心业务页面 → 找 **miniapp-core-agent**
- ❌ 修改 `pages/login/`、`pages/settings/` → 找 **miniapp-common-agent**
- ❌ 修改 `pages.json`、`App.vue` → 找 **miniapp-common-agent**
- ❌ 修改后端代码 → 找对应后端 Agent

## 5. 依赖关系

### 上游依赖
| 依赖 Agent | 依赖项 | 用途 |
|-----------|--------|------|
| miniapp-common-agent | `services/modules/review.js` | 审核 API 调用 |
| miniapp-common-agent | `services/modules/approval.js` | 审批 API 调用 |
| miniapp-common-agent | `stores/user.js` | 判断管理员权限 |
| project-agent | `/api/project/review*` | 审核数据 |
| core-agent | `/api/report/supplement-review` | 补公出审核 |
| core-agent | `/api/approval/*` | 审批数据 |

## 6. Wiki 知识库

| 文档 | 路径 | 用途 |
|------|------|------|
| 审批管理模块 | `.AI/Wiki/后端 API 服务/审批管理模块.md` | 审批 API 契约 |
| 项目审核模块 | `.AI/Wiki/后端 API 服务/` | 审核 API 契约 |
| 前后端集成指南 | `.AI/Wiki/共享文档/Frontend-Backend-Integration-Guide.md` | 前端对接规范 |

## 7. 常见操作手册

### 新增审核功能
1. 确认后端 API 是否就绪 → 通过 orchestrator 向对应后端 Agent 确认
2. 如需新的 API 调用方法，通知 **miniapp-common-agent** 扩展 `services/modules/`
3. 创建/修改审核页面
4. 如需新增路由，通知 **miniapp-common-agent** 修改 `pages.json`
