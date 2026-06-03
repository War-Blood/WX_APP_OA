# 小程序文档索引

> 智慧办公助手 — 微信小程序端（uni-app Vue3）

---

## 文档清单

| 文档 | 版本/日期 | 类型 | 说明 |
|------|----------|------|------|
| [PRD.md](./PRD.md) | V2.0 / 2026-05-28 | 产品需求 | 产品需求规格说明书，含功能需求、非功能需求、实施阶段 |
| [UI-Design-V2.md](./UI-Design-V2.md) | 2026-05-29 | UI 设计 | V2.0 卡片式交互设计文档 |
| [UI-Design-V3-WE.md](./UI-Design-V3-WE.md) | 2026-05-30 | UI 设计 | V3.0 WE UI 组件库设计文档 |
| [Design-Interaction-Spec.md](./Design-Interaction-Spec.md) | 2026-05-30 | 交互规范 | 设计交互规范文档 |
| [需求分析-智慧办公助手-UI统一与布局优化.md](./需求分析-智慧办公助手-UI统一与布局优化.md) | 2026-05-29 | 需求分析 | UI 统一与布局优化需求分析 |
| [技术方案-智慧办公助手-UI统一与布局优化.md](./技术方案-智慧办公助手-UI统一与布局优化.md) | 2026-05-29 | 技术方案 | UI 统一与布局优化技术方案 |

### UI 设计版本说明

本项目有两个 UI 设计版本，均为有效参考：

| 版本 | 文件 | 风格 | 说明 |
|------|------|------|------|
| V2.0 | [UI-Design-V2.md](./UI-Design-V2.md) | 卡片式设计 | 原有设计风格 |
| V3.0 WE | [UI-Design-V3-WE.md](./UI-Design-V3-WE.md) | WE UI 组件库 | 基于 WE UI 的新版设计 |

---

## 架构速览

### 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 开发框架 | uni-app（Vue 3 + Vite） | 编译到微信小程序 |
| UI 组件库 | uni-ui（DCloud 官方） | 轻量级、深度集成 |
| 图标库 | @icon-park/vue-next + 自研 oa-icons | 图标系统 |
| 状态管理 | Pinia | 替代 app.globalData |
| 样式方案 | SCSS + CSS 变量（#2B6DE8） | 全局主题变量 |
| 构建工具 | Vite | uni-app 默认 |

### 页面清单（22个已注册）

| 路由路径 | 页面名称 | 层级 | 状态 |
|---------|---------|------|------|
| pages/login/index | 登录页 | 独立 | ✅ 已实现 |
| pages/home/index | 首页（工作台） | L1-01 | ✅ 已实现 |
| pages/features/index | 功能中心 | L1-02 | ✅ 已实现 |
| pages/profile/index | 个人中心 | L1-03 | ✅ 已实现 |
| pages/approval/index/index | 审批中心 | L2-01 | ✅ 已实现 |
| pages/approval/detail | 审批详情 | L3-01 | ⏳ 待创建 |
| pages/approval/create/index | 发起审批 | L3-02 | ⏳ 待创建 |
| pages/message/index | 消息中心 | L2-02 | ⏳ 待创建 |
| pages/message/detail | 消息详情 | L3-03 | ⏳ 待创建 |
| pages/task/index | 任务看板 | L2-03 | ⏳ 待创建 |
| pages/task/detail | 任务详情 | L3-04 | ⏳ 待创建 |
| pages/asset/index | 资产列表 | L2-04 | ⏳ 待创建 |
| pages/asset/detail | 资产详情 | L3-05 | ⏳ 待创建 |
| pages/announcement/index | 公告列表 | L2-05 | ⏳ 待创建 |
| pages/employee/report-history/index | 日报历史 | L2-06 | ⏳ 待创建 |
| pages/employee/report-detail/index | 日报详情 | L3-06 | ⏳ 待创建 |
| pages/employee/report-edit/index | 日报编辑 | L3-07 | ⏳ 待创建 |
| pages/employee/rejected-edit/index | 驳回编辑 | L3-08 | ⏳ 待创建 |
| pages/employee/project-history/index | 项目历史 | L2-07 | ⏳ 待创建 |
| pages/employee/project-detail/index | 项目详情 | L3-09 | ⏳ 待创建 |
| pages/employee/project-edit/index | 项目编辑 | L3-10 | ⏳ 待创建 |
| pages/admin/review-list/index | 审核列表 | L2-08 | ⏳ 待创建 |
| pages/admin/review-detail/index | 审核详情 | L3-11 | ⏳ 待创建 |
| pages/admin/project-list/index | 项目列表 | L2-09 | ⏳ 待创建 |
| pages/admin/user-manage/index | 用户管理 | L2-10 | ⏳ 待创建 |
| pages/admin/review-stats/index | 项目数据统计 | L2-11 | ⏳ 待创建 |

### 组件清单（11个可复用）

| 组件 | 路径 | 说明 |
|------|------|------|
| nav-bar | src/components/nav-bar/ | 顶部导航栏 |
| tab-bar | src/components/tab-bar/ | 底部Tab导航 |
| toast | src/components/toast/ | 消息提示 |
| confirm-dialog | src/components/confirm-dialog/ | 确认弹窗 |
| empty-state | src/components/empty-state/ | 空状态 |
| loading-overlay | src/components/loading-overlay/ | 加载遮罩 |
| image-uploader | src/components/image-uploader/ | 图片上传 |
| opinion-input | src/components/opinion-input/ | 意见输入 |
| person-picker | src/components/person-picker/ | 人员选择 |
| date-picker | src/components/date-picker/ | 日期选择 |
| approval-type-picker | src/components/approval-type-picker/ | 审批类型选择 |

### API 模块（6个）

| 模块 | 文件 | 说明 |
|------|------|------|
| auth | src/services/modules/auth.js | 认证（登录/用户资料） |
| approval | src/services/modules/approval.js | 审批流程 |
| report | src/services/modules/report.js | 日报管理 |
| review | src/services/modules/review.js | 审核管理 |
| message | src/services/modules/message.js | 消息通知 |
| stats | src/services/modules/stats.js | 数据统计 |

### Stores（2个 Pinia）

| Store | 文件 | 说明 |
|-------|------|------|
| user | src/stores/user.js | 用户状态（登录态/角色/个人信息） |
| app | src/stores/app.js | 应用状态 |

---

## 共享文档

跨端共享文档在 [../shared-docs/](../shared-docs/)，小程序开发必读：

| 文档 | 说明 |
|------|------|
| [API-Interfaces.md](../shared-docs/API-Interfaces.md) | 全量 API 接口定义（请求/响应格式） |
| [Frontend-Backend-Integration-Guide.md](../shared-docs/Frontend-Backend-Integration-Guide.md) | 前后端对接规范 |
| [前端技术开发指导及规范.md](../shared-docs/前端技术开发指导及规范.md) | 前端统一开发规范 |

---

## 关键文件速查

| 文件 | 说明 |
|------|------|
| `src/pages.json` | 页面路由配置 |
| `src/App.vue` | 应用根组件 |
| `src/main.js` | 应用入口（Pinia注册/全局组件注册） |
| `src/services/request.js` | 统一 HTTP 请求封装 |
| `src/services/index.js` | API 模块统一导出 |
| `src/composables/useAuth.js` | 认证组合式函数 |
| `src/composables/usePagination.js` | 分页组合式函数 |
| `src/stores/user.js` | 用户状态（Token/角色/个人信息） |
| `src/stores/app.js` | 应用状态 |
