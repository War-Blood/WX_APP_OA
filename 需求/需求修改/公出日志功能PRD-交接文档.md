# 公出日志功能 PRD — 开发交接文档

> **版本**: v2.0  
> **最后更新**: 2026-06-24  
> **交接目的**: 字段规格 + 看板处理方案 + 前后端完整说明

---

## 一、功能概述

公出日志是智慧办公助手 OA 系统的核心模块，覆盖员工的**外出工作记录**、**补录申请**和**公司办公日报**三大场景，包含小程序端（员工填写）、Web 管理端（管理员审批/编辑/统计）、后端 API（数据存储/业务逻辑）三层。

### 三种日志类型

| 类型 | 枚举值 | 使用场景 |
|------|--------|---------|
| 公出日志 | `biz_trip` | 外勤人员每日提交，记录项目、区域、工作内容等 |
| 补公出 | `biz_trip_supplement` | 漏填后补录，需说明原因→**管理员审核** |
| 公司日报 | `office` | 办公室人员日报，记录工作内容/计划/问题 |

---

## 二、数据库核心表

### 2.1 `daily_reports` — 主表

```sql
CREATE TABLE daily_reports (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,                -- FK → users.id
  report_date DATE NOT NULL,                     -- 日志日期（补公出时为实际日期，supplement_date 存补录目标日）
  report_type ENUM('biz_trip','biz_trip_supplement','office') DEFAULT 'biz_trip',

  -- 项目信息（biz_trip / biz_trip_supplement 专用）
  project VARCHAR(200),                          -- 项目名称
  area VARCHAR(200),                             -- 项目所在区域（省-市格式）
  related_party VARCHAR(200),                    -- 相关方单位
  machine_model VARCHAR(200),                    -- 机型

  -- 人员
  workers TEXT,                                  -- 作业人员（顿号分隔文本，历史兼容；新版以 daily_report_workers 为准）
  worker_count INT DEFAULT 0,                    -- 作业人数

  -- 工作量
  work_content TEXT,                              -- 从事工作内容
  required_qty INT DEFAULT 0,                    -- 需要完成数量
  completed_qty INT DEFAULT 0,                   -- 累计完成数量
  progress_percent DECIMAL(5,2),                 -- 当前进度 (completed/required × 100)

  -- 工作描述
  today_work_type VARCHAR(20),                   -- 今日工作类型：工作（陆）/工作（海）/待工/在途/请假/调休
  tomorrow_work_type VARCHAR(20),                -- 明日工作类型
  today_work TEXT,                               -- 今日工作小结 / 今日工作内容
  tomorrow_plan TEXT,                            -- 明日工作计划
  issues TEXT,                                   -- 遇到的问题（office 专用）
  content TEXT,                                  -- 协调事项（office 专用）/ 旧版兼容

  -- 补公出专用
  supplement_date DATE,                          -- 补录目标日期
  supplement_reason TEXT,                        -- 补录原因

  -- 日期字段
  entry_date DATE,                               -- 入场日期
  initial_biz_trip_date DATE,                    -- 初始出差日期

  -- 出差天数
  biz_trip_days INT DEFAULT 0,                   -- 项目出差天数
  personal_biz_trip_days INT DEFAULT 0,          -- 个人累计出差天数

  -- 系统字段
  remark TEXT,                                    -- 备注
  status VARCHAR(20) DEFAULT 'draft',            -- draft/submitted/approved/rejected/pending_review
  timeliness VARCHAR(20),                        -- on_time/delayed（系统自动判定）
  files JSON,                                    -- 附件列表
  attachments JSON,                              -- 附件（旧版兼容）
  mood VARCHAR(20),                              -- 工作心情（旧版兼容，已弃用）

  submitted_at DATETIME,                         -- 提交时间
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,                           -- 软删除

  INDEX idx_user_date (user_id, report_date),
  INDEX idx_status (status),
  INDEX idx_report_date (report_date)
);
```

### 2.2 `daily_report_workers` — 作业人员关联表（代填追踪）

```sql
CREATE TABLE daily_report_workers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,               -- FK → daily_reports(id) ON DELETE CASCADE
  worker_uid INT UNSIGNED NOT NULL,              -- FK → users(id)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_report_worker (report_id, worker_uid),
  INDEX idx_worker_uid (worker_uid)
);
```

> 作用：当用户 A 的日报中填写了用户 B、C 为作业人员，B、C 即记为该日的"被代填"人员。

### 2.3 `review_records` — 审核记录

```sql
CREATE TABLE review_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,               -- FK → daily_reports(id)
  reviewer_id INT UNSIGNED NOT NULL,             -- FK → users(id)
  action VARCHAR(50) NOT NULL,                   -- approve/reject/supplement_special/supplement_forget
  opinion TEXT,                                  -- 审核意见
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 `operation_logs` — 管理员编辑审计日志

```sql
CREATE TABLE operation_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL,                   -- e.g. 'report:update'
  module VARCHAR(50) DEFAULT 'report',
  target_id INT UNSIGNED,                        -- report_id
  target_type VARCHAR(50) DEFAULT 'daily_report',
  detail JSON,                                   -- { old: {...}, new: {...}, changes: [...] }
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 三、完整字段规格

### 3.1 字段总表（45 个字段）

| # | 数据库字段 | 中文名 | 类型 | 适用类型 | 必填 | 小程序可填 | Web可编辑 | 说明 |
|---|-----------|--------|------|---------|------|-----------|----------|------|
| 1 | `id` | 主键 | INT | ALL | 系统 | - | - | 自增 |
| 2 | `user_id` | 提交人ID | INT | ALL | 系统 | - | - | FK users |
| 3 | `report_date` | 日志日期 | DATE | ALL | ✅ | ✅ | ✅ | 小程序限昨天/今天 |
| 4 | `report_type` | 日志类型 | ENUM | ALL | ✅ | ✅ | ✅ | biz_trip/biz_trip_supplement/office |
| 5 | `project` | 项目名称 | VARCHAR | biz_trip/supp | 条件 | ✅ | ✅ | 请假/调休时可不填 |
| 6 | `area` | 项目区域 | VARCHAR | biz_trip/supp | 条件 | ✅ | ✅ | 省-市格式，GPS定位辅助 |
| 7 | `related_party` | 相关方单位 | VARCHAR | biz_trip/supp | ❌ | ✅ | ✅ | 历史记录选择 |
| 8 | `machine_model` | 机型 | VARCHAR | biz_trip/supp | ❌ | ✅ | ✅ | 多选标签+历史 |
| 9 | `workers` | 作业人员 | TEXT | biz_trip/supp | 条件 | ✅ | ✅ | 顿号分隔 |
| 10 | `worker_count` | 作业人数 | INT | biz_trip/supp | ❌ | 系统 | - | 由workerIds自动计算 |
| 11 | `work_content` | 工作内容 | TEXT | biz_trip/supp | ❌ | ✅ | ✅ | max 200字 |
| 12 | `required_qty` | 需求数量 | INT | biz_trip/supp | ❌ | ✅ | ✅ | |
| 13 | `completed_qty` | 完成数量 | INT | biz_trip/supp | ❌ | ✅ | ✅ | |
| 14 | `progress_percent` | 当前进度 | DECIMAL | biz_trip/supp | ❌ | ❌ | ❌ | 系统计算 |
| 15 | `today_work_type` | 今日工作类型 | VARCHAR | biz_trip/supp | ✅ | ✅ | ✅ | 6个枚举值 |
| 16 | `tomorrow_work_type` | 明日工作类型 | VARCHAR | biz_trip/supp | ❌ | ✅ | ✅ | 6个枚举值 |
| 17 | `today_work` | 今日工作小结 | TEXT | ALL | ✅ | ✅ | ✅ | office叫"今日工作内容" |
| 18 | `tomorrow_plan` | 明日计划 | TEXT | ALL | ❌ | ✅ | ✅ | |
| 19 | `issues` | 问题反馈 | TEXT | office | ❌ | ✅ | ✅ | office专用 |
| 20 | `content` | 协调事项 | TEXT | office | ❌ | ✅ | ✅ | office专用/旧版兼容 |
| 21 | `supplement_date` | 补录目标日期 | DATE | supp | ✅ | ✅ | ✅ | |
| 22 | `supplement_reason` | 补录原因 | TEXT | supp | ✅ | ✅ | ✅ | max 500字 |
| 23 | `entry_date` | 入场日期 | DATE | biz_trip/supp | ❌ | ✅ | ✅ | 自动填user.entry_date |
| 24 | `initial_biz_trip_date` | 初始出差日期 | DATE | biz_trip/supp | ❌ | ✅ | ✅ | 默认=entry_date |
| 25 | `biz_trip_days` | 项目出差天数 | INT | biz_trip/supp | ❌ | ✅ | ✅ | |
| 26 | `personal_biz_trip_days` | 个人出差天数 | INT | biz_trip/supp | ❌ | ✅ | ✅ | |
| 27 | `remark` | 备注 | TEXT | ALL | ❌ | ✅ | ✅ | max 500字 |
| 28 | `status` | 状态 | VARCHAR | ALL | 系统 | - | ❌ | 见状态流转 |
| 29 | `timeliness` | 及时性 | VARCHAR | ALL | 系统 | - | ❌ | on_time/delayed |
| 30 | `files` | 附件 | JSON | ALL | ❌ | - | - | |
| 31~45 | 系统字段 | submitted_at/created_at/updated_at/deleted_at/... | | | | | | |

### 3.2 工作类型枚举

| 枚举值 | 显示名 | 说明 |
|--------|--------|------|
| `工作（陆）` | 工作（陆） | 陆上工作（默认），兼容旧值"工作"/"作业" |
| `工作（海）` | 工作（海） | 海上工作 |
| `待工` | 待工 | 等待工作安排 |
| `在途` | 在途 | 出差途中/路上 |
| `请假` | 请假 | 当天请假，project/area 可不填 |
| `调休` | 调休 | 当天调休，project/area 可不填 |

### 3.3 状态流转

```
draft ──提交──→ approved        (biz_trip / office 直接通过)
draft ──提交──→ pending_review  (biz_trip_supplement 进入审核)
draft ──提交──→ rejected        (管理员驳回)
rejected ──可重新编辑──→ draft  (小程序端)
pending_review ──审核──→ approved  (special=on_time / forget=delayed)
任意 ──管理员编辑──→ 原状态保持  (写入 operation_logs)
```

---

## 四、API 接口完整清单

### 4.1 Report 模块 (`/api/report/*`)

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/api/report/list` | 用户 | 日志列表（分页+筛选）。管理员看全部，普通用户看自己 |
| POST | `/api/report/detail` | 用户 | 单条日志详情 |
| POST | `/api/report/submit` | 用户 | 提交日志（v2.0，支持3种类型） |
| POST | `/api/report/draft` | 用户 | 保存草稿 |
| GET | `/api/report/draft` | 用户 | 获取草稿 |
| POST | `/api/report/delete` | 用户 | 删除日志（仅草稿/驳回） |
| POST | `/api/report/update` | 管理员 | 管理员编辑（22字段白名单 + 审计日志） |
| POST | `/api/report/check-duplicate` | 用户 | 检查当日是否已被代填 |
| POST | `/api/report/today-status` | 用户 | 查询用户当日状态 |
| POST | `/api/report/pending-reviews` | 管理员 | 补公出待审核列表 |
| POST | `/api/report/supplement-review` | 管理员 | 补公出审核（special/forget） |
| POST | `/api/report/stats` | 用户 | 统计看板（scope: user/all/project） |
| POST | `/api/report/daily-status` | 管理员 | 全员当日状态看板 |
| POST | `/api/report/monthly-summary` | 用户 | 月度工作占比 |
| POST | `/api/report/team-logs` | 用户 | 同组日志 |
| GET | `/api/report/workerList` | 用户 | 作业人员列表（去重） |
| POST | `/api/report/workerStats` | 用户 | 人员统计看板 |
| POST | `/api/report/export` | 用户 | 导出 CSV |
| POST | `/api/report/export-attendance` | 用户 | 导出月度考勤矩阵 CSV |

### 4.2 Stats 模块 (`/api/stats/*`)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/stats/daily-counts` | 日历热力图：月度每日提交人次 |
| POST | `/api/stats/project-progress` | 项目进展看板 |
| POST | `/api/stats/worker-work-types` | 人员工作类型分布（透视表） |
| POST | `/api/stats/area-distribution` | 区域分布（仅昨日数据） |
| POST | `/api/stats/province-workers` | 省份下钻人员列表 |
| POST | `/api/stats/user-monthly-logs` | 用户月度日志明细 |

### 4.3 统一响应格式

```json
{ "code": 0, "message": "success", "data": {...} }
{ "code": 0, "message": "success", "data": { "list": [...], "pagination": {...} } }
{ "code": -1, "message": "业务错误描述" }
```

HTTP 状态码始终 200，业务错误通过 `code` 区分。

---

## 五、看板与统计方案

### 5.1 已实现看板

| 看板 | 端 | 路由 | 核心指标 |
|------|-----|------|---------|
| **统计总览** | Web | `/report`（统计看板tab） | 总日志数、本月新增、延迟数、缺报人数 |
| **日报查询** | Web | `/report`（日报查询tab） | 按状态/类型/日期/关键词筛选，支持编辑/导出 |
| **人员看板** | Web | `/report`（人员看板tab） | 人员姓名、总计、本月数、最后日期 |
| **补公出审核** | Web | `/report/audit` | 待审核补公出列表，审核决策 |
| **全员当日状态** | Web | `/report/daily-status` | 已提交/被代填/补公出/公司日报/请假/调休/缺报 人数卡片 + 明细 |
| **月度工作占比** | Web | `/report/monthly-summary` | 选人+月份 → 6类工作占比柱状图 + 出勤统计 |
| **日历热力图** | Web | `/report/stats` | 月度日历 → 每日提交人次 |
| **项目进展** | Web | `/report/stats` | 项目维度：需求/完成数 + 进度% + 日志天数 |
| **工作类型分布** | Web | `/report/stats` | 人员×工作类型透视表：每人各类型天数 |
| **区域分布** | Web | `/report/stats` | 中国地图 → 省份人数（昨日数据）→ 下钻人名 |
| **公出统计** | 小程序 | profile/stats | 月度工作占比 + 人员分布（点击下钻） + 区域分布（仅昨日） |
| **当日概况** | 小程序 | profile/stats | 日期导航 + 各状态人数汇总 + 人员明细 |

### 5.2 后续待开发看板（建议）

| 优先级 | 看板名称 | 说明 |
|--------|---------|------|
| P1 | **项目维度深度看板** | 按项目汇总：投入人天数、各工作类型分布、进度趋势折线图 |
| P1 | **出勤统计看板** | 按时间范围统计每人出勤率、缺报率、延迟率排行榜 |
| P1 | **合规看板增强** | 整合 report_compliance 表，展示项目级合规状态 + 超期预警 |
| P2 | **差旅费用关联** | 将公出日志与差旅报销/费用审批关联 |
| P2 | **实时大屏** | 当日公出人员实时地图分布（WebSocket 推送） |
| P2 | **AI 周报生成** | 基于个人/项目日志自动生成周报摘要 |

---

## 六、前端页面清单

### 6.1 小程序端（uni-app / Vue 3）

| 页面 | 路径 | 说明 |
|------|------|------|
| 日志填写/编辑 | `pages/employee/report-edit/index.vue` | 三种类型表单，含项目搜索、GPS定位、人员多选 |
| 日志详情 | `pages/employee/report-detail/index.vue` | 全字段展示，含审核意见卡片 |
| 日志历史 | `pages/employee/report-history/index.vue` | Tab筛选（全部/已通过/审核中/已驳回/草稿） |
| 驳回重编 | `pages/employee/rejected-edit/index.vue` | 加载驳回数据，修改后重新提交 |
| 审核列表（管理员） | `pages/admin/review-list/index.vue` | 待审核日志列表 |
| 审核详情 | `pages/admin/review-detail/index.vue` | 审核操作：通过/驳回 + 意见 |
| 公出统计 | `pages/profile/stats.vue` | 管理员看统计：月度占比 + 人员分布 + 区域分布 |
| 当日概况 | `pages/admin/daily-overview/index.vue` | 当日人员状态总览 |

### 6.2 Web 后台（Vue 3 / TypeScript / Element Plus）

| 页面 | 路由 | 说明 |
|------|------|------|
| 日志管理（主） | `/report` | 三Tab：统计看板/日报查询/人员看板 + 详情弹窗 + 编辑弹窗（22字段） |
| 补公出审核 | `/report/audit` | 审核列表 + 审核弹窗 |
| 统计看板 | `/report/stats` | 日历热力图 + 项目进展 + 工作类型分布 + 区域地图 |
| 当日状态 | `/report/daily-status` | 日期导航 + 状态卡片 + 人员表格 |
| 月度占比 | `/report/monthly-summary` | 选人+月份 → 柱状图 + 统计 |
| 公出状态管理 | `/compliance/biz-trip` | 人员出差起止日期管理 |
| 合规仪表盘 | `/compliance/dashboard` | 合规统计数据 |
| 缺报审核 | `/compliance/missing` | 缺报记录审核 |

---

## 七、后端代码结构

```
backend/src/
├── core/
│   ├── routes/report.routes.js        — Report API 路由（20+ 端点）
│   ├── controllers/report.controller.js — 参数校验 + 调用 service
│   └── services/
│       ├── report.service.js          — 核心业务逻辑（CRUD/提交/审核/导出/同组日志）
│       └── stats.service.js           — 统计服务（看板数据/分布/下钻）
├── features/
│   ├── routes/stats.routes.js         — Stats API 路由
│   ├── controllers/stats.controller.js — Stats 控制器
│   └── compliance/                    — 合规模块（独立 Agent）
└── common/config/database.js          — 数据访问层（pool）
```

### 后端 Agent 归属

| Agent | 管辖 | 涉及功能 |
|-------|------|---------|
| `core-agent` | `backend/src/core/` | Report CRUD、提交、审核、导出、统计 |
| `data-agent` | `backend/src/features/(stats, compliance/)` | 统计看板、合规管理 |
| `common-agent` | `backend/src/common/` | 数据库连接、中间件、工具函数 |

---

## 八、关键技术要点

### 8.1 工作类型归一化

代码中存在 `wtNormalize()` 函数，将旧数据中的简称/空值统一为规范值：
- `"工作"` / `"作业"` → `"工作（陆）"`
- 空值 / NULL → `"工作（陆）"`（默认值，防止统计丢失数据）

### 8.2 代填机制

- 用户 A 提交日报时在 `workerIds` 中勾选用户 B、C
- 系统在 `daily_report_workers` 表插入 B、C 与 report_id 的关联
- 当日 B、C 的状态标记为 `substituted`（被代填），不再需要自己提交
- `check-duplicate` API 用于前端检查是否已被代填

### 8.3 管理编辑审计

管理员编辑日志时：
1. 白名单机制：仅 22 个字段可编辑（`EDITABLE_FIELDS`）
2. 旧值/新值 JSON diff 写入 `operation_logs`
3. 工作类型自动归一化（"工作"→"工作（陆）"）

### 8.4 区域分布

- 省份从 `area` 字段提取（`area.split('-')[0]`）
- **仅统计昨日数据**，非月度
- 显示省份 + 该省人员名单（含工号），无人则省份不显示

### 8.5 统计去重

- 人员统计时使用 `Set` 对 `(userId, reportDate)` 去重
- 防止一人一天多条日志被重复计数

### 8.6 日志查询范围

`getUserMonthlyLogs` 查询一个人的月度日志时，需通过三种方式匹配：
1. `user_id = ?`（自己提交的）
2. `workers LIKE '%name%'`（作业人员字段含此人的旧数据）
3. `daily_report_workers` 关联表（被代填记录）

---

## 九、部署与配置

### 9.1 前端部署

| 端 | 构建命令 | 部署路径 |
|----|---------|---------|
| 小程序 | `miniapp/npm run build:mp-weixin` | 微信开发者工具上传 |
| Web 后台 | `webapp/npm run build` | 服务器 `/var/www/wx-app-oa/admin/` |

### 9.2 Nginx 关键配置

- Web 后台 JS/CSS 有 **7 天缓存** + immutable 标记
- 部署后需 `Ctrl+F5` 强制刷新
- API 通过 `/api/` 反代到后端 3100 端口

### 9.3 环境变量

所有密钥/密码**仅存在服务器 `.env` 文件中，禁止提交 Git**。模板文件 `.env.example` 使用占位符。

---

## 十、已知注意事项

1. **工作类型简称兼容**：历史数据中有"工作"/"作业"简称，代码自动归一化
2. **空工作类型**：统一计为"工作（陆）"，避免统计缺失
3. **PM2 fork 模式**：不支持 cluster，更新配置需 `pm2 delete` + `pm2 start`
4. **SQL LIMIT 占位符**：`pool.execute()` 不支持 LIMIT 占位符 → 改用 `pool.query()`
5. **小程序日期选择**：默认当天，允许选昨天（`:start` 约束）
6. **编辑按钮位置**：Web 后台日报查询→操作列→编辑按钮在审核和删除之间
7. **浏览器缓存**：Web 后台更新后用户可能看旧版本，需告知 Ctrl+F5

---

## 十一、关键文件速查

### 数据库
- `sql/v2.0_migration.sql` — v2.0 迁移脚本
- `sql/import_latest.sql` — 最新数据导入
- `backend/scripts/init-db.js` — 基础建表

### 后端（核心）
- `backend/src/core/services/report.service.js` — **最重要**，所有业务逻辑
- `backend/src/core/services/stats.service.js` — 统计看板数据
- `backend/src/core/controllers/report.controller.js` — 参数校验
- `backend/src/core/routes/report.routes.js` — 路由注册

### 小程序
- `miniapp/src/pages/employee/report-edit/index.vue` — 填写表单
- `miniapp/src/pages/profile/stats.vue` — 统计看板
- `miniapp/src/services/modules/report.js` — API 调用

### Web 后台
- `webapp/src/views/report/index.vue` — 日志管理主页
- `webapp/src/views/report/stats.vue` — 统计看板
- `webapp/src/api/report.ts` — API 类型定义
