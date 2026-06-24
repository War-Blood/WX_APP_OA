# 公出日志模块升级 — PRD 总览

> 版本: v2.0 | 日期: 2026-06-13 | 状态: 三端PRD衔接修复完成
> 思维导图: `公出日志模块升级-思维导图.html`

---

## 子 PRD（按端独立，各端只读自己的）

| 端 | 文件 | 内容 |
|------|------|------|
| 🔧 后端 | [公出日志模块升级-PRD-后端.md](公出日志模块升级-PRD-后端.md) | 数据模型 / API / Service 逻辑 |
| 📱 小程序 | [公出日志模块升级-PRD-小程序.md](公出日志模块升级-PRD-小程序.md) | 日报填写页 / 选人组件 / 统计看板 |
| 🖥️ Web 后台 | [公出日志模块升级-PRD-Web管理后台.md](公出日志模块升级-PRD-Web管理后台.md) | 审核页 / 统计看板 / 花名册管理 |

---

## 七大需求速览

| # | 需求 | 关键点 |
|:--:|------|------|
| 1 | **人员花名册** | 每人独立 UID，选人用勾选替代手敲文本 |
| 2 | **同组绑定** | A 勾选 B → B 当日自动标记已提交 |
| 3 | **工作类型扩展** | 工作（陆/海）/待工/在途/请假/调休，请假调休隐藏内容区 |
| 4 | **日报三类型** | 公出日志 / 补公出日志（需审核）/ 公司日报（简化字段） |
| 5 | **补公出审核** | 管理员判定：特殊情况→正常 / 忘记→延迟 |
| 6 | **管理层看板** | 员工当日状态总览 + 员工月度工作占比，具体看板可后续精进 |

---

## 数据变更一览

| 表 | 操作 | 说明 |
|------|:--:|------|
| `users` | ALTER | + worker_code / entry_date / worker_status |
| `daily_reports` | ALTER | + report_type / supplement_date / supplement_reason，MODIFY work_type |
| `daily_report_workers` | **CREATE** | report_id ↔ worker_uid 关联，代填去重 |

---

## API 一览

| 路径 | 说明 | 类型 |
|------|------|:--:|
| `POST /api/report/submit` | 改造支持三种 report_type | 修改 |
| `POST /api/report/check-duplicate` | 检查当日是否已被代填 | 新增 |
| `POST /api/report/pending-reviews` | 补公出日志待审核列表 | 新增 |
| `POST /api/report/supplement-review` | 管理员审核补公出日志 | 新增 |
| `POST /api/report/stats` | 统计看板（user/all/project 三种 scope） | 新增 |
| `POST /api/report/team-logs` | 同组日志列表 | 新增 |
| `POST /api/admin/workers` | 外场人员花名册 CRUD（统一 action 入口） | 新增 |
| `POST /api/report/daily-status` | 管理层看板 — 全员当日状态总览 | 新增 |
| `POST /api/report/monthly-summary` | 管理层看板 — 单员工月度工作类型占比 | 新增 |
| `wps_reports_view` | 重建视图，关联 daily_report_workers，排除 office | 修改 |

---

## 验收标准

| # | 条件 |
|:--:|------|
| AC1 | 管理员可增删改查外场人员，每个有独立 UID |
| AC2 | 日报填写从花名册搜索+多选，不再手敲 |
| AC3 | A 勾选 B 后，B 当日显示"已由 A 代填"且无法提交 |
| AC4 | 六个工作类型切换正确，请假/调休隐藏内容区 |
| AC5 | 三个日报 Tab 切换后表单字段正确变化 |
| AC6 | 补公出日志审核（特殊/忘记）状态正确更新 |
| AC7 | 统计看板累计/当月/缺失/延迟数据正确 |
| AC8 | 同组人员可查看彼此日志（只读） |
| AC9 | 小程序 + Web 后台 + 后端 API 三端数据一致 |
| AC10 | 管理层看板可查看每个员工当日状态（已提交/已代填/请假/调休/待工/在途/未提交） |
| AC11 | 管理层看板可查看每个员工月度工作类型占比（陆/海/待工/在途/请假/调休） |
