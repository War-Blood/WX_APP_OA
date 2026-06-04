# MEMORY.md - 长期记忆

_最后更新: 2026-05-30 10:50（账号转移前终版）_

## 项目概览

**智慧办公助手** — OA 办公系统，含员工端微信小程序、Web 管理后台、后端 API 三层架构

| 子项目 | 路径 | 版本 | 状态 |
|--------|------|------|------|
| 微信小程序 | `Y:\AI\WX-APP-OA\miniapp` | 1.0.0 | API 对接完成，已移除假数据 |
| Web 管理后台 | `Y:\AI\WX-APP-OA\webapp` | 1.0.0 | M0 完成 → M1 准备中 |
| 后端服务 | `Y:\AI\WX-APP-OA\backend` | 1.0.0 | 核心 API 已完成（auth/approval/report/message/stats/review） |

**AppID**: wx56609483f0ee55b6（微信小程序）

---

## 生产服务器（旧版 daily-report-api，仍在运行）

**旧项目路径**: `Y:\AI\WX-app\daily-report-api`（员工日报+排班，原始版本）
- 旧后端入口: `Y:\AI\WX-app\daily-report-api\server.js`（1200+ 行，含排班模块）
- 旧管理后台: `Y:\AI\WX-app\daily-report-api\web-admin`

### 服务器信息

| 项 | 值 |
|----|-----|
| OS | Ubuntu 24.04 |
| IP | 111.229.107.123 |
| SSH alias | `wx-app-server` |
| SSH 私钥 | `C:\Users\WarBlood\.ssh\wx_app_key.pem` |
| 域名 | warblood.online |

### 服务组件

| 组件 | 版本/状态 | 说明 |
|------|-----------|------|
| Node.js | v18+ | 已安装 |
| MySQL | active | 数据库名 daily_report |
| Nginx | active | 端口 80/443，反代到 3000 |
| PM2 | online | fork 模式（非 cluster） |
| 开机自启 | enabled | systemctl enable pm2-root |

### 部署路径

- **部署目录**: `/var/www/daily-report/server/`
- **PM2 配置**: `/var/www/daily-report/server/ecosystem.config.js`
- **PM2 注册**: `pm2 delete` + `pm2 start` 重新注册（`pm2 restart` 会使用缓存路径）

### 数据库（daily_report）

- **用户/密码**: daily_report_user / DailyReport@2024
- **表结构**:

| 表名 | 说明 |
|------|------|
| `users` | 用户表（openid 主键） |
| `daily_project_progress` | 主数据表（空，原 1587 条已废弃） |
| `daily_reports` | 废弃旧表 |
| `schedule_daily` | 排班汇总（日期→人数） |
| `schedule_workers` | 排班明细（日期→工人信息） |

### 旧版 API 路由

| 前缀 | 说明 |
|------|------|
| `/api/login` | 登录 |
| `/api/wx-login` | 微信 code 换 openid 登录 |
| `/api/user/profile` | 更新用户信息 |
| `/api/report/*` | 日报（submit/list/export） |
| `/api/review/*` | 审核（list/detail/action） |
| `/api/project/*` | 项目日报（submit/list/detail/stats/project-list） |
| `/api/admin/*` | 管理员（list/users/set-admin/init-first/web-login/web-verify） |
| `/api/schedule/*` | 排班（month/day/records/stats/save/export） |
| `/health` | 健康检查 |

### 关键技术坑（旧版教训）

1. **db.js LIMIT 参数**: `pool.execute()` 不支持 LIMIT 占位符，需改用 `pool.query()`
2. **PM2 脚本不更新**: 需 `pm2 delete + pm2 start` 重新注册，不能只 `pm2 restart`
3. **PM2 cluster 模式**: app.js 不支持 cluster 端口共享，必须用 fork 单实例
4. **miniapp config**: `miniapp/config/index.js` 需手动创建，含 BASE_URL/TIMEOUT/storageKeys/apiPaths

---

## 后端开发里程碑（2026-05-29 更新）

| 里程碑 | 状态 | 说明 |
|--------|------|------|
| 项目初始化 | ✅ 已完成 | 项目结构、技术选型 |
| 基础架构搭建 | ✅ 已完成 | 分层架构、中间件、Swagger |
| 认证模块 | ✅ 已完成 | 微信登录、JWT、用户资料 |
| 审批模块 | ✅ 已完成 | list/create/detail/approve，支持参数兼容 |
| 日报模块 | ✅ 已完成 | submit(完整字段)+draft+delete |
| 消息模块 | ✅ 已完成 | list/detail/unread/markRead，字段对齐 |
| Stats 模块 | ✅ 已完成 | home/activities/profile 统计 |
| Review 模块 | ✅ 已完成 | reviewList/detail/action/stats |
| 公告/项目/资产模块 | ⬜ 待开始 | P1/P2 阶段 |
| 部署上线 | ⬜ 待开始 | 新版需部署到服务器 |

### 数据库变更（2026-05-29）
- **daily_reports 表** ALTER 添加 17 个字段 + 3 个索引
- **新建 review_records 表** - 审核记录
- **新建 approval_cc 表** - 审批抄送关系

### 小程序改造要点
- request.js 移除了 VITE_USE_MOCK 环境变量分支，替换为 dev-mode-token 处理
- 所有页面改为 API 调用，无硬编码数据和 setTimeout 模拟
- 新增 stats.js API service 模块

## 新版项目（WX-APP-OA）服务器规划

### 后端技术栈

| 类别 | 选型 |
|------|------|
| 运行时 | Node.js 18.x |
| 框架 | Express 4.x |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 6.x |
| 认证 | JWT + 图形验证码 |
| 日志 | Winston |
| API 文档 | Swagger (swagger-jsdoc + swagger-ui-express) |
| 校验 | Joi |
| 安全 | Helmet + rate-limit + CORS |
| Excel | exceljs |
| 图片处理 | sharp |
| 定时任务 | node-cron |
| HTTP 客户端 | axios |
| 测试 | Jest + supertest |

### 后端入口

- **入口文件**: `backend/src/app.js`（已搭建完成，含 auth/stats/review 路由注册）
- **分层架构**: routes → controllers → services → middleware → config → utils
- **启动命令**: `npm start`（生产）/ `npm run dev`（nodemon 开发）
- **数据库命令**: `npm run init-db` / `npm run migrate`
- **环境变量**: 使用 dotenv 加载

### 新旧关系说明

- **旧版（Y:\AI\WX-app\daily-report-api）**：已在生产环境运行，包含日报+排班功能，服务器配置稳定
- **新版（Y:\AI\WX-APP-OA）**：重构为完整 OA 平台，新增审批、消息、公告等模块，旧服务器的 MySQL/Nginx/PM2 配置可复用
- **新版后端状态**: 核心 API 已完成（auth/approval/report/message/stats/review），数据库脚本已就绪（review_records/approval_cc/alter_daily_reports）
- **小程序状态**: API 对接全部完成，已移除所有假数据，统一使用后端 API 服务

---

## 个人信息

- 具备全栈开发能力（微信小程序 + Node.js + Linux 运维）
- 调试风格：提供完整错误日志，精准定位问题
- 注重稳定性与兼容性

---

## 设计规范

> 微信小程序设计规范已独立为 Skill：`~/.workbuddy/skills/wx-design-spec/`
> 包含：页面布局、NavBar/TabBar 规范、WE UI 图标、色彩系统、字体层级、适配关系
> 进行界面设计时通过 `@skill:ardot-design-assistant` 即可自动加载

---

## 账号转移指南（2026-05-30）

### 需要迁移的文件

| 文件/目录 | 路径 | 说明 |
|-----------|------|------|
| **项目目录** | `Y:\AI\WX-APP-OA\` | 完整项目（前后端+小程序） |
| **设计备份** | `Y:\AI\WX-APP-OA\design-backup\` | 11 页 PNG 高保真截图 |
| **设计规范 Skill** | `~\.workbuddy\skills\wx-design-spec\` | SKILL.md + references/colors.md |
| **项目记忆** | `Y:\AI\WX-APP-OA\.workbuddy\memory\` | MEMORY.md + 2026-05-30.md |
| **Ardot 源文件** | `https://ardot.tencent.com/file/687736275492780` | 在线设计稿 |

### 新账号恢复步骤

1. 确保 `Y:\AI\WX-APP-OA\` 项目目录可访问
2. 安装 `wx-design-spec` skill 到新账号：复制 `~\.workbuddy\skills\wx-design-spec\` 目录
3. 恢复项目记忆：复制 `.workbuddy\memory\` 目录到新项目
4. 打开 Ardot 源文件 URL
5. 新会话中说「读取项目记忆，继续开发」即可接上

### 当前设计进度（2026-05-30）

```
10 个页面全部完成，布局如下：

Row 0  y:0       [ 登录页 ]
Row 1  y:872     [ L1-01工作台 ] [ L1-02功能中心 ] [ L1-03个人中心 ]
Row 2  y:1784    [ L2-01审批中心 ] [ L2-06日报历史 ] [ L2-08审核列表 ]
Row 3  y:2696    [ L3-01审批详情 ] [ L3-02发起审批 ] [ L3-07公出日志 ]
Row 4  y:3608    [ L3-06日报详情 ]
```

### 新会话启动提示词

```
加载项目记忆 Y:\AI\WX-APP-OA\.workbuddy\memory\MEMORY.md
加载设计规范 skill: wx-design-spec
打开设计稿 https://ardot.tencent.com/file/687736275492780
我上次做到10个页面的交互设计，接下来需要______
```
