# 技术栈声明 — Tech Stack

> 本文件为项目技术栈的唯一权威来源（Single Source of Truth）。所有 Rules、Skills、Wiki 中的技术栈描述必须以本文件为准。版本变更时只需更新本文件。

## 适用范围

- **适用对象**: 所有 AI 工具（Qoder / Cursor / Claude Code / Trae）
- **触发场景**: 任何需要了解项目技术选型的任务（代码生成、依赖安装、环境配置、架构设计）
- **预期产出**: 统一的技术栈认知，消除多文件间的版本不一致

---

## 一、后端 API 服务 (backend/)

### 运行时与框架

| 组件 | 选型 | 版本 | 来源 |
|------|------|------|------|
| 语言/运行时 | Node.js | ≥ 18（推荐 20，由 `webapp/package.json` → `@tsconfig/node20` 确定） | `webapp/package.json` |
| Web 框架 | Express | 4.18.2 | `backend/package.json` |
| 数据库 | MySQL | 8.0（驱动 mysql2 3.9.0） | `backend/package.json` |
| 缓存 | Redis | 6.x（驱动 redis 4.6.0） | `backend/package.json` |

### 核心依赖

| 类别 | 选型 | 版本 | 用途 |
|------|------|------|------|
| 认证 | jsonwebtoken | 9.0.2 | JWT Bearer Token（微信 openid / 账号密码） |
| 参数校验 | Joi | 17.11.0 | 请求体/查询参数校验 |
| 安全 | helmet | 7.1.0 | HTTP 安全头 |
| 限流 | express-rate-limit | 7.1.5 | API 请求频率限制 |
| 跨域 | cors | 2.8.5 | CORS 请求控制 |
| 配置 | dotenv | 16.3.1 | `.env` 环境变量加载 |
| 密码 | bcryptjs | 3.0.3 | 密码哈希 |
| 日志 | winston | 3.11.0 | 结构化日志 |
| API 文档 | swagger-jsdoc + swagger-ui-express | 6.2.8 / 5.0.0 | JSDoc 注释 → OpenAPI 文档 |
| 定时任务 | node-cron | 3.0.3 | 自动备份、公告定时发布、合规提醒 |
| 文件处理 | exceljs | 4.4.0 | Excel 批量导入/导出 |
| 图片处理 | sharp | 0.33.0 | 头像压缩裁剪 |
| 验证码 | svg-captcha | 1.4.0 | Web 端图形验证码 |
| HTTP 客户端 | axios | 1.6.0 | 微信 API / 外部服务调用 |
| TOTP | otplib | 13.4.1 | 二次验证 |
| 二维码 | qrcode | 1.5.4 | 二维码生成 |

### 测试与质量

| 类别 | 选型 | 版本 | 用途 |
|------|------|------|------|
| 测试框架 | Jest | 29.7.0 | 单元测试 + 集成测试 |
| HTTP 测试 | Supertest | 6.3.0 | API 端点集成测试 |
| Lint | ESLint | 8.56.0 | 代码规范检查 |
| 覆盖率阈值 | branches=70, functions=70, lines=70, statements=70 | — | `backend/package.json` jest.coverageThreshold |
| 开发热重载 | Nodemon | 3.0.0 | 开发时自动重启 |

### 部署

| 类别 | 选型 | 配置 |
|------|------|------|
| 进程管理 | PM2 | fork 模式，1 实例，max 256MB，autorestart=true |
| 部署路径 | /var/www/wx-app-oa/backend | `backend/ecosystem.config.js` |
| 服务地址 | https://warblood.online | 生产环境 |

### 数据库连接

| 数据库 | Host | Port | 用途 |
|--------|------|------|------|
| wx_app_oa | 111.229.107.123 | 3306 | 新版 OA 主库（pool: 2-10） |
| daily_report | 111.229.107.123 | 3306 | 旧版日报库（pool: 1-5） |
| Redis | 127.0.0.1 | 6379 | 缓存（key 前缀 `oa:`） |

---

## 二、微信小程序 (miniapp/)

| 组件 | 选型 | 版本 | 来源 |
|------|------|------|------|
| 框架 | uni-app（DCloud） | 3.0.0-alpha-5010120260525001 | `miniapp/package.json` |
| UI 语言 | Vue 3（Composition API） | 3.4.0 | `miniapp/package.json` |
| 构建工具 | Vite | 5.0.0 | `miniapp/package.json` |
| 状态管理 | Pinia | 2.1.0 | `miniapp/package.json` |
| UI 组件库 | @dcloudio/uni-ui | 1.4.0 | `miniapp/package.json` |
| CSS 预处理 | Sass | 1.69.7 | `miniapp/package.json` |
| 微信 AppID | wx56609483f0ee55b6 | — | `backend/.env.example` |
| 设计主色 | #2B6DE8（高效蓝） | — | `miniapp-rules.md` |

### 开发命令

| 命令 | 用途 |
|------|------|
| `npm run dev:mp-weixin` | 微信小程序开发模式 |
| `npm run build:mp-weixin` | 微信小程序生产构建 |
| `npm run dev:h5` | H5 开发模式 |
| `npm run build:h5` | H5 生产构建 |

### 缺失项

| 缺失项 | 说明 |
|--------|------|
| Lint 工具 | ❓ `package.json` 无 lint 脚本、无 ESLint 依赖 |
| 测试框架 | ❓ `package.json` 无 test 脚本、无 Jest/Vitest 依赖 |

---

## 三、Web 管理后台 (webapp/)

| 组件 | 选型 | 版本 | 来源 |
|------|------|------|------|
| 框架 | Vue 3（Composition API） | 3.4.21 | `webapp/package.json` |
| 语言 | TypeScript | 5.4 | `webapp/package.json` |
| 构建工具 | Vite | 5.2.8 | `webapp/package.json` |
| UI 组件库 | Element Plus | 2.7.3 | `webapp/package.json` |
| 状态管理 | Pinia | 2.1.7 | `webapp/package.json` |
| 路由 | Vue Router | 4.3.2 | `webapp/package.json` |
| HTTP 客户端 | Axios | 1.7.2 | `webapp/package.json` |
| 图表 | ECharts | 5.5.0 | `webapp/package.json` |
| CSS 预处理 | Sass | 1.77.2 | `webapp/package.json` |
| Excel | xlsx | 0.18.5 | `webapp/package.json` |
| Node 版本要求 | Node 20 | — | `@tsconfig/node20` |

### 质量工具

| 类别 | 选型 | 版本 |
|------|------|------|
| Lint | ESLint | 8.57.0 + eslint-plugin-vue 9.23 + @vue/eslint-config-typescript 13.0 |
| 格式化 | Prettier | 3.2.5 |
| 类型检查 | vue-tsc | 2.0.11 |
| Git Hooks | Husky | 9.0.11 |
| 暂存区检查 | lint-staged | 15.2.2 |
| 提交信息检查 | @commitlint/cli + config-conventional | 19.3.0 / 19.2.2 |

### 开发命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | vue-tsc + vite build |
| `npm run lint` | ESLint 检查并修复 |
| `npm run format` | Prettier 格式化 |
| `npm run type-check` | 纯类型检查（不构建） |

### 缺失项

| 缺失项 | 说明 |
|--------|------|
| 测试框架 | ❓ `package.json` 无 test 脚本、无 Jest/Vitest 依赖 |

---

## 四、全局基础设施

| 组件 | 选型/信息 | 来源 |
|------|----------|------|
| 版本管理 | Git | `.git/` |
| 环境变量 | dotenv 16.3.1 | `backend/package.json` |
| CI/CD | ❓ 未检测到 | — |
| Docker | ❓ 有 Wiki 文档但无 `docker-compose.yml` | — |

---

> **关联文件**: 本文件为技术栈单一来源。其他文件中出现的版本信息仅供参考，以本文件为准。
> - `.AI/rules/core.md` — 全局铁律 + 量化阈值
> - `.AI/rules/backend-rules.md` — 后端项目约束
> - `.AI/rules/miniapp-rules.md` — 小程序项目约束
> - `.AI/rules/webapp-rules.md` — Web 管理后台约束
> - `.AI/rules/coding-standards.md` — 编码规范
> - `.AI/rules/git-workflow.md` — Git 工作流
