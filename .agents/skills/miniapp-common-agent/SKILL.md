---
name: miniapp-common-agent
description: 小程序公共层 Agent。拥有 components/ + services/ + stores/ + composables/ + utils/ + pages/login/ + pages/settings/ + pages/profile/index。是所有小程序业务 Agent 的底层依赖，提供组件/API 封装/状态管理/路由配置。
agent_boundary: miniapp/src/(components|services|stores|composables|utils|pages/(login|settings|profile/index)|App.vue|main.js|pages.json|manifest.json)/
agent_module: miniapp
---

# Miniapp Common Agent — 小程序公共层

> **边界铁律**：本 Agent 只能修改 `miniapp/src/` 下属于公共基础设施的文件：components/、services/、stores/、composables/、utils/ 以及 login/settings/profile/index 页面。
>
> 业务页面（employee/admin/approval/compliance/message/home/features）属于对应的业务 Agent，本 Agent 不得修改。

## 1. 拥有的文件

### 公共组件 (components/)
| 文件 | 职责 |
|------|------|
| `components/worker-picker/index.vue` | 花名册选人组件（搜索+多选+已选标签） |
| `components/date-picker/index.vue` | 日期选择器 |
| `components/empty-state/index.vue` | 空状态占位组件 |
| `components/loading-overlay/index.vue` | 加载遮罩 |
| `components/nav-bar/nav-bar.vue` | 导航栏 |
| `components/tab-bar/tab-bar.vue` | 底部 Tab 栏 |
| `components/toast/index.vue` | 轻提示组件 |
| `components/confirm-dialog/index.vue` | 确认弹窗 |
| `components/opinion-input/index.vue` | 审核意见输入 |
| `components/image-uploader/index.vue` | 图片上传 |
| `components/approval-type-picker/index.vue` | 审批类型选择器 |
| `components/person-picker/index.vue` | 人员选择器（旧版，将被 worker-picker 替代） |

### API 服务层 (services/)
| 文件 | 职责 |
|------|------|
| `services/request.js` | 统一请求封装（Base URL、Token 注入、401 拦截、错误处理） |
| `services/index.js` | 模块聚合导出 |
| `services/modules/auth.js` | 认证 API（登录/登出/资料） |
| `services/modules/report.js` | 日报 API |
| `services/modules/approval.js` | 审批 API |
| `services/modules/review.js` | 审核 API |
| `services/modules/message.js` | 消息 API |
| `services/modules/stats.js` | 统计 API |
| `services/modules/compliance.js` | 合规 API |
| `services/modules/admin.js` | 花名册 API（新增） |

### 状态管理 (stores/)
| 文件 | 职责 |
|------|------|
| `stores/user.js` | 用户状态（token/userInfo/role/entryDate/workerStatus） |
| `stores/app.js` | 应用全局状态 |

### 组合式函数 (composables/)
| 文件 | 职责 |
|------|------|
| `composables/useAuth.js` | 登录态检查与跳转 |
| `composables/usePagination.js` | 分页逻辑封装 |

### 工具函数 (utils/)
| 文件 | 职责 |
|------|------|
| `utils/date.js` | 日期格式化工具 |
| `utils/validator.js` | 表单验证 |
| `utils/error-reporter.js` | 错误上报 |

### 通用页面
| 文件 | 层级 | 职责 |
|------|------|------|
| `pages/login/index.vue` | 页面 | 登录页 |
| `pages/settings/about/index.vue` | 页面 | 关于页 |
| `pages/settings/help/index.vue` | 页面 | 帮助页 |
| `pages/settings/notification/index.vue` | 页面 | 通知设置 |
| `pages/settings/security/index.vue` | 页面 | 安全设置 |
| `pages/profile/index.vue` | 页面 | 个人中心首页 |

### 应用入口文件
| 文件 | 职责 |
|------|------|
| `App.vue` | 应用根组件 |
| `main.js` | 主入口 |
| `pages.json` | 页面路由配置 |
| `manifest.json` | 应用配置 |

## 2. 消费的 API 端点

### 从 auth-agent 消费
| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/auth/login` | 微信登录 |
| POST | `/api/auth/refresh` | 刷新 Token |
| GET | `/api/user/profile` | 获取用户资料 |

### 从 common-agent 消费
| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/admin/workers` | 花名册查询（供 worker-picker 组件使用） |

## 3. 提供给业务 Agent 的服务

| 服务 | 业务 Agent 使用方式 |
|------|-------------------|
| `services/modules/report.js` | miniapp-core-agent 调用日报 API |
| `services/modules/message.js` | miniapp-core-agent 调用消息 API |
| `services/modules/review.js` | miniapp-admin-agent 调用审核 API |
| `services/modules/approval.js` | miniapp-admin-agent 调用审批 API |
| `services/modules/compliance.js` | miniapp-admin-agent 调用合规 API |
| `stores/user.js` | 所有业务 Agent 读取登录态/角色/entryDate |
| `components/worker-picker` | miniapp-core-agent 在日报填写页使用 |
| `components/date-picker` | 所有业务 Agent 使用 |
| `composables/usePagination.js` | 所有业务 Agent 使用 |
| `pages.json` | 所有业务 Agent 新增页面时需本 Agent 注册路由 |

## 4. 能力边界（铁律）

### CAN DO — 本 Agent 可以做的事
- 修改 `components/`、`services/`、`stores/`、`composables/`、`utils/` 下的任何代码
- 修改 `pages/login/`、`pages/settings/`、`pages/profile/index`
- 修改 `App.vue`、`main.js`、`pages.json`、`manifest.json`
- 新增公共组件和 API 模块
- 修改请求封装逻辑（Token 处理、错误拦截）
- 修改全局状态结构

### CANNOT DO — 绝对不能做的事
- ❌ 修改 `pages/employee/` 下业务页面 → 找 **miniapp-core-agent**
- ❌ 修改 `pages/admin/`、`pages/approval/`、`pages/compliance/` → 找 **miniapp-admin-agent**
- ❌ 修改后端代码 → 找对应后端 Agent
- ❌ 在公共组件中加入特定业务逻辑 → 公共组件保持通用性

## 5. 依赖关系

### 上游依赖
| 依赖 Agent | 依赖项 | 用途 |
|-----------|--------|------|
| auth-agent | `/api/auth/*`、`/api/user/*` | 登录认证 |
| common-agent | `/api/admin/workers` | 花名册数据 |

### 下游消费者（所有小程序业务 Agent 都依赖本 Agent）
| 消费者 Agent | 消费的服务 |
|-------------|----------|
| miniapp-core-agent | report.js / message.js / userStore / worker-picker / date-picker / request.js |
| miniapp-admin-agent | review.js / approval.js / compliance.js / userStore / request.js |

## 6. Wiki 知识库

| 文档 | 路径 | 用途 |
|------|------|------|
| 小程序前端 | `.AI/Wiki/小程序前端/` | 小程序设计规范 |
| API 契约-花名册模块 | `.AI/Wiki/共享文档/API契约-花名册模块.md` | 花名册接口契约 |
| 前后端集成指南 | `.AI/Wiki/共享文档/Frontend-Backend-Integration-Guide.md` | 前端对接规范 |
| 小程序规则 | `.AI/rules/miniapp-rules.md` | 小程序编码规范 |

## 7. 常见操作手册

### 业务 Agent 请求新增 API 调用方法
1. 业务 Agent 通过 orchestrator 向本 Agent 提需求
2. 本 Agent 在 `services/modules/xxx.js` 中新增方法
3. 确保方法签名与后端 API 契约一致
4. 更新本文档的对应服务表

### 业务 Agent 请求新增页面路由
1. 业务 Agent 提供页面路径和导航标题
2. 本 Agent 在 `pages.json` 中注册路由
3. 确认路由层级（L1-L4）符合规范
4. 通知业务 Agent 路由已就绪

### 修改全局 Store 结构
1. 评估影响范围（哪些业务 Agent 使用了该 Store 字段）
2. 修改 `stores/xxx.js`
3. 通过 orchestrator 通知所有受影响业务 Agent
4. 确保向后兼容（新增字段优先，避免破坏性变更）
