---
name: import-daily-report
description: 将公出日志 Excel 数据批量导入数据库 daily_reports 表。读取 xlsx 文件，按列映射生成 INSERT，上传服务器执行，默认 approved 状态。
agent_created: true
---

# 公出日志数据导入

## 触发条件

用户提到以下任一关键词时加载此 skill：
- "导入公出日志" / "上传数据" / "批量导入" / "导入 Excel"
- "补充数据" / "6-10数据" / "daily_report 导入"

## 前置条件

执行前必须确认：
1. 能通过 SSH 连接生产服务器
2. MySQL 数据库 `wx_app_oa` 可访问
3. 本地已安装 `openpyxl`（`pip install openpyxl`）

## 执行流程

### 1. 读取 Excel 数据

```bash
python -X utf8 scripts/import_610.py
```

脚本自动从 `y:\AI\WX-APP-OA\6-10数据.xlsx` 读取，如需更换文件，修改脚本中 `wb = openpyxl.load_workbook(...)` 路径。

### 2. 列映射规则（19 列 → daily_reports）

| Excel 列 | DB 字段 | 说明 |
|:---:|------|------|
| 0 | `report_date` | 汇报日期 |
| 2 | `initial_biz_trip_date` | 初次出差日期 |
| 3 | `entry_date` | 入场日期 |
| 4 | `project` | 项目名称 |
| 5 | `area` | 项目区域 |
| 6 | `related_party` | 关联方单位 |
| 7 | `workers` | 作业人员 |
| 9 | `machine_model` | 机型 |
| 11 | `work_content` | 工作内容 |
| 12 | `required_qty` | 需求数量 |
| 13 | `completed_qty` | 完成数量 |
| 15 | `remark` | 备注 |
| 16 | `today_work` | 当日工作 |
| 17 | `today_work_type` | 今日状态（工作/待工/在途） |
| 18 | `tomorrow_work_type` | 明日状态（工作/待工/在途） |

自动计算字段：`biz_trip_days`、`personal_biz_trip_days`、`progress_percent`

### 3. 默认值

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `status` | `approved` | **直接入库可见**，wps_reports_view 仅查 approved |
| `timeliness` | `on_time` | 准时 |
| `user_id` | `NULL` / 自动匹配 | 人员名在 users 表存在则自动关联 |

### 4. 去重

按 `(report_date, project, initial_biz_trip_date)` 三重组合去重，相同组合的后续行自动跳过。

### 5. 上传并执行

```bash
# 上传 SQL
scp -i ~/.ssh/wx_app_key.pem sql/import_610.sql root@warblood.online:/tmp/import_610.sql

# 执行导入
ssh -i ~/.ssh/wx_app_key.pem root@warblood.online \
  "mysql -u root wx_app_oa < /tmp/import_610.sql && echo OK"

# 验证
ssh -i ~/.ssh/wx_app_key.pem root@warblood.online \
  "mysql -u root wx_app_oa -e \"
    SELECT COUNT(*) AS total FROM wps_reports_view;
    SELECT report_date, COUNT(*) AS cnt FROM daily_reports 
    WHERE report_date >= CURDATE() - INTERVAL 7 DAY 
    GROUP BY report_date ORDER BY report_date;
  \""
```

### 6. 结果报告

导入后必须向用户报告：
- 导入条数 / 跳过重复条数
- 用户匹配情况
- 最终 daily_reports 总行数
- wps_reports_view 视图行数（应与主表一致）

## 关键约束

- **状态默认 `approved`**：wps_reports_view 只查 `status='approved'`，设错会导致视图不更新
- **SSH 端口 22**：使用密钥 `~/.ssh/wx_app_key.pem`，用户 root，域名 warblood.online
- **文件编码**：SQL 文件必须 UTF-8，Windows 下 Python 脚本需 `-X utf8` 参数
- **单次导入 ≤ 500 行**：超出需分批执行，避免 MySQL 超时
