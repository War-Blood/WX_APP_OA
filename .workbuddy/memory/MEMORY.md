# MEMORY.md - 长期记忆

_最后更新: 2026-05-25_

## 项目概览

**员工日报微信小程序**（AppID: wx56609483f0ee55b6）

- **前端**: `Y:\AI\WX-APP-OA\miniapp`（微信小程序）
- **后端**: `Y:\AI\WX-app\daily-report-api\server.js`（Node.js Express，1200+行，含排班模块）
- **管理后台**: `Y:\AI\WX-app\daily-report-api\web-admin`
- **生产服务器**: Ubuntu 24.04，IP 111.229.107.123，SSH alias `wx-app-server`
- **SSH 私钥**: `C:\Users\WarBlood\.ssh\wx_app_key.pem`

## 服务器环境

| 组件 | 状态 | 说明 |
|------|------|------|
| Node.js | 已安装 | v18+ |
| MySQL | active | 数据库 daily_report |
| Nginx | active | 端口 80/443，反代到 3000 |
| PM2 | online | fork 模式，脚本 server.js |
| 开机自启 | enabled | systemctl enable pm2-root |

**部署路径**: `/var/www/daily-report/server/`
**PM2 配置**: `/var/www/daily-report/server/ecosystem.config.js`（fork 单实例）

## 数据库

- **数据库名**: daily_report
- **用户**: daily_report_user / DailyReport@2024
- **表结构**:
  - `users`: 用户表（openid 主键）
  - `daily_project_progress`: 主数据表（空，原有 1587 条数据已放弃）
  - `daily_reports`: 废弃旧表
  - `schedule_daily`: 排班汇总表（日期→人数）
  - `schedule_workers`: 排班明细表（日期→工人信息）

## API 路由一览

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

## 关键技术坑

1. **db.js LIMIT 参数**: `pool.execute()` 不支持 LIMIT 占位符，需改用 `pool.query()`
2. **PM2 脚本不更新**: `pm2 restart` 会使用缓存路径，需 `pm2 delete + pm2 start` 重新注册
3. **PM2 cluster 模式**: app.js 不支持 cluster 端口共享，必须用 fork 单实例
4. **miniapp config**: `miniapp/config/index.js` 需手动创建，包含 BASE_URL/TIMEOUT/storageKeys/apiPaths

## 个人信息

- 具备全栈开发能力（微信小程序 + Node.js + Linux 运维）
- 调试风格：提供完整错误日志，精准定位问题
- 注重稳定性与兼容性
