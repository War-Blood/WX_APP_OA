# 智慧办公助手 — 项目交接文档

> 交接日期：2026-05-29
> 交接范围：后端 API + 微信小程序前端
> 生产服务器：111.229.107.123 | warblood.online

---

## 一、项目概览

**智慧办公助手** — OA 办公系统，含三层架构：

| 子项目 | 路径 | 状态 | 
|--------|------|------|
| 微信小程序 | `Y:\AI\WX-APP-OA\miniapp` | API 对接完成，假数据已移除 |
| Web 管理后台 | `Y:\AI\WX-APP-OA\webapp` | M0 完成，M1 未启动 |
| 后端 API 服务 | `Y:\AI\WX-APP-OA\backend` | 核心 API 开发完成，未部署 |

**AppID**: wx56609483f0ee55b6（微信小程序）

---

## 二、代码变更统计（本次交付成果）

### 2.1 后端变更

**新增模块：**
| 模块 | 文件路径 | 接口 |
|------|----------|------|
| Stats | `features/controllers/stats.controller.js` | `POST /api/stats/home` |
| Stats | `features/services/stats.service.js` | `POST /api/stats/activities` |
| Stats | `features/routes/stats.routes.js` | `POST /api/stats/profile` |
| Review | `features/controllers/review.controller.js` | `POST /api/project/reviewList` |
| Review | `features/services/review.service.js` | `POST /api/project/reviewDetail` |
| Review | `features/routes/review.routes.js` | `POST /api/project/reviewAction` |
| | | `POST /api/project/reviewStats` |

**改造模块：**
| 模块 | 改造内容 |
|------|----------|
| `core/controllers/approval.controller.js` | 参数映射（tab→status, approverId/ccIds 支持） |
| `core/services/approval.service.js` | list 支持 tab='mine', create 支持 approverId/ccIds |
| `core/controllers/report.controller.js` | submit 扩展完整 formData + saveDraft/getDraft/deleteReport |
| `core/services/report.service.js` | 完整字段映射 + 草稿覆盖/已提交去重逻辑 |
| `core/routes/report.routes.js` | 新增 POST dard/GET draft/POST delete 路由 |
| `core/services/message.service.js` | formatMessage 字段映射（type→icon/iconBg） |
| `app.js` | 注册 statsRoutes + reviewRoutes |

### 2.2 前端变更

**新增文件：**
| 文件 | 内容 |
|------|------|
| `miniapp/src/services/modules/stats.js` | statsApi（getHomeStats/getActivities/getProfileStats） |

**改造文件：**
| 文件 | 改造内容 |
|------|----------|
| `services/request.js` | 移除 VITE_USE_MOCK 分支，添加 dev-mode-token 处理 |
| `services/index.js` | 新增 statsApi 导出 |
| `services/modules/report.js` | 新增 saveDraft/getDraft/deleteReport 方法 |
| `services/modules/review.js` | 新增 getReviewStats 方法 |
| `pages/home/index.vue` | stats/activities/unread 全量 API 调用，移除 setTimeout |
| `pages/approval/index/index.vue` | Tab/筛选/分页联动 API |
| `pages/employee/report-history/index.vue` | Tab/分页 API，移除 setTimeout |
| `pages/message/index.vue` | 列表/Tab/markRead API |
| `pages/admin/review-list/index.vue` | 列表/统计/Tab API |
| `pages/login/index.vue` | 改用 authApi.login(code) |

### 2.3 数据库变更（已执行）

| 脚本 | 目标 | SQL 文件路径 |
|------|------|-------------|
| review_records 表 | wx_app_oa 库新建 | `scripts/review_records.sql` |
| approval_cc 表 | wx_app_oa 库新建 | `scripts/approval_cc.sql` |
| daily_reports 扩展 | daily_report 库 ALTER | `scripts/alter_daily_reports_safe.sql` |

---

## 三、后端架构

### 3.1 分层架构

```
routes/       → 路由层（请求分发、中间件绑定）
controllers/  → 控制器层（参数校验、响应封装）
services/     → 服务层（业务逻辑编排）
  ↓
common/config/database.js → MySQL 参数化查询（mysql2）
common/config/redis.js    → 缓存层
```

### 3.2 模块分布

| 目录 | 用途 | 说明 |
|------|------|------|
| `backend/src/auth/` | 认证模块 | 微信登录 / JWT / 用户资料 |
| `backend/src/core/` | 核心业务 | approval / report / message |
| `backend/src/features/` | 扩展业务 | stats / review（本次新增） |
| `backend/src/common/` | 公共模块 | 数据库/Redis/日志/中间件/工具函数 |

### 3.3 全部 API 路由清单

| 前缀 | 来自模块 | 状态 |
|------|----------|------|
| `/api/auth/*` | auth 模块 | ✅ 已完成 |
| `/api/user/*` | auth 模块 | ✅ 已完成 |
| `/api/approval/*` | core 模块 | ✅ 已完成 |
| `/api/report/*` | core 模块 | ✅ 已完成 |
| `/api/message/*` | core 模块 | ✅ 已完成 |
| `/api/stats/*` | features 模块 | ✅ 已完成（本次新增） |
| `/api/project/review*` | features 模块 | ✅ 已完成（本次新增） |
| `/api/announcement/*` | 待开发 | ⬜ P1 |
| `/api/project/*` | 待开发 | ⬜ P1 |
| `/api/admin/*` | 待开发 | ⬜ P1 |
| `/api/asset/*` | 待开发 | ⬜ P2 |
| `/health` | core 模块 | ✅ 已完成 |
| `/api-docs` | Swagger | ✅ 已配置 |

### 3.4 JWT 认证

- 登录获取 token，前端存 localStorage
- 所有业务接口需 Header: `Authorization: Bearer <token>`
- 401 自动跳转登录页
- 统一响应格式: `{ code: 0, message: "success", data: {...} }`

---

## 四、小程序前端架构

### 4.1 目录结构

```
miniapp/src/
├── services/               # API 服务层
│   ├── request.js          # 统一请求封装
│   ├── index.js            # 统一导出
│   └── modules/            # 各模块 API
│       ├── auth.js
│       ├── approval.js
│       ├── report.js
│       ├── review.js
│       ├── message.js
│       └── stats.js        # 本次新增
├── pages/                  # 页面
│   ├── home/               # 首页
│   ├── login/              # 登录
│   ├── approval/           # 审批中心
│   ├── employee/           # 员工端（日报）
│   ├── admin/              # 管理员端（审核）
│   ├── message/            # 消息中心
│   ├── profile/            # 个人中心
│   └── features/           # 功能列表
├── composables/            # 组合式函数
│   ├── useAuth.js
│   └── usePagination.js
├── stores/                 # Pinia 状态管理
│   ├── user.js             # 用户状态
│   └── app.js              # 应用状态
└── components/             # 公共组件
```

### 4.2 Data Flow

```
页面 onMounted → services/api 模块 → request.js (HTTP) → 后端 API → 数据库
                                                    ↓
                                          401 → 跳转登录页
                                          非 0 code → Toast 错误
                                          网络异常 → Toast 提示
```

---

## 五、生产环境

### 5.1 服务器信息

| 项 | 值 |
|----|-----|
| OS | Ubuntu 24.04 |
| IP | 111.229.107.123 |
| SSH key | `C:\Users\WarBlood\.ssh\wx_app_key.pem` |
| 域名 | warblood.online |

### 5.2 当前运行服务（旧版）

旧版 daily-report-api 仍在生产运行中（端口 3000），新版后端尚未部署。

**部署目录**: `/var/www/daily-report/server/`  
**PM2 进程名**: daily-report-api（fork 模式，非 cluster）

### 5.3 数据库

| 数据库 | 用途 |
|--------|------|
| `daily_report` | 旧版库（含 users/daily_reports/schedule 等表） |
| `wx_app_oa` | 新版库（含 auth/approval/messages/review_records/approval_cc 等表） |

**连接信息**: 
- 用户: daily_report_user
- 密码: DailyReport@2024

### 5.4 部署步骤（待执行）

1. 将 `Y:\AI\WX-APP-OA\backend` 上传到服务器
2. 安装依赖：`npm install --production`
3. PM2 启动：`pm2 start src/app.js --name wx-app-oa-backend`
4. Nginx 配置反向代理（如需要新端口）
5. 修改小程序 request.js 中的 BASE_URL 指向新服务

---

## 六、P0 已完成模块验收清单

- [x] `POST /api/auth/login` — 微信登录
- [x] `GET /api/user/profile` — 用户资料
- [x] `POST /api/approval/list` — 审批列表（支持 tab/type 参数）
- [x] `POST /api/approval/detail` — 审批详情
- [x] `POST /api/approval/create` — 发起审批（支持 approverId/ccIds）
- [x] `POST /api/approval/approve` — 审批操作（支持 approve/reject）
- [x] `POST /api/report/list` — 日报列表
- [x] `POST /api/report/detail` — 日报详情
- [x] `POST /api/report/submit` — 提交日报（完整字段）
- [x] `POST /api/report/draft` — 保存草稿
- [x] `GET /api/report/draft` — 获取草稿
- [x] `POST /api/report/delete` — 删除日报
- [x] `POST /api/message/list` — 消息列表
- [x] `POST /api/message/detail` — 消息详情
- [x] `POST /api/message/unread` — 未读数
- [x] `POST /api/message/markRead` — 标记已读
- [x] `POST /api/stats/home` — 首页统计
- [x] `POST /api/stats/activities` — 最近动态
- [x] `POST /api/project/reviewList` — 审核列表
- [x] `POST /api/project/reviewDetail` — 审核详情
- [x] `POST /api/project/reviewAction` — 审核操作
- [x] `POST /api/project/reviewStats` — 审核统计

---

## 七、待开发模块（P1 优先级）

### 7.1 公告模块（后端+前端）
- `POST /api/announcement/list` — 公告列表
- `POST /api/announcement/detail` — 公告详情
- `POST /api/announcement/publish` — 发布公告（管理员）
- 前端页面: `pages/announcement/`（部分创建）

### 7.2 项目管理模块（后端）
- `POST /api/project/list` — 项目列表
- `POST /api/project/detail` — 项目详情
- `POST /api/project/stats` — 项目统计
- `POST /api/project/submit` — 提交项目日报

### 7.3 用户管理模块（后端）
- `POST /api/admin/users` — 用户列表
- `POST /api/admin/setAdmin` — 设置管理员
- `POST /api/admin/toggleUser` — 禁用/启用

### 7.4 Web 管理后台（前端）
- Vue3 + TypeScript + Element Plus
- 路径: `Y:\AI\WX-APP-OA\webapp`

---

## 八、关键文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 小程序 PRD | `miniapp/docs/PRD.md` | 产品需求（6种审批类型） |
| Web 后台 PRD | `webapp/docs/Web-PRD.md` | 产品需求 |
| API 接口文档 | `shared-docs/API-Interfaces.md` | 全量 API 定义 |
| 前后端联调指南 | `shared-docs/Frontend-Backend-Integration-Guide.md` | 对接规范 |
| UI 设计文档 V3 | `miniapp/docs/UI-Design-V3-WE.md` | WE UI 交互设计 |
| UI 设计文档 V2 | `miniapp/docs/UI-Design-V2.md` | 卡片式交互设计 |
| API 改造 PRD | `shared-docs/PRD-Api-Refactor.md` | 本次 PM 产出 |
| 技术方案 | `shared-docs/Tech-Plan.md` | 本次 TM 产出 |
| 各端文档索引 | `shared-docs/README.md` | 文档体系入口 |
| 项目规则（后端） | `.workbuddy/skills/backend-project/SKILL.md` | 后端行为约束 |
| 项目规则（测试） | `.workbuddy/skills/test-project/SKILL.md` | 测试行为约束 |
| 数据库 SQL 脚本 | `backend/scripts/*.sql` | 建表 / 迁移 |
| 长期记忆 | `.workbuddy/memory/MEMORY.md` | 项目常识 |
| 工作日志 | `.workbuddy/memory/2026-05-29.md` | 本次工作记录 |

---

## 九、已知注意事项

1. **新旧数据库分离**：新版 `wx_app_oa` 库与旧版 `daily_report` 库是分开的，用户数据需要通过旧版 users 表同步
2. **JWT Secret**：后端 `.env` 中已配置 JWT_SECRET，部署时需确保安全
3. **微信 AppSecret**：`.env` 中的 `WX_SECRET` 为占位符，需填入真实值
4. **Redis**：模块中使用了 Redis 配置，但目前默认连接 `127.0.0.1:6379`，如服务器未安装 Redis 需处理连接失败降级
5. **request.js dev-mode**：前端保留了 dev-mode-token 处理，用于开发调试阶段，生产环境应移除或禁用
6. **Swagger**：已配置但依赖 swagger-jsdoc 注释，部分新模块可能缺少 JSDoc 注释
7. **部署后需重启旧版服务**：新版部署前旧版仍在运行，注意端口冲突
