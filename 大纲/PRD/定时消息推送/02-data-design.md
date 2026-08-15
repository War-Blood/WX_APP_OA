# 02-data-design — 数据设计

> 维度：数据模型（表结构、索引、约束）
> 读者：后端开发、DBA、测试
> 上游依赖：`01-requirements.md`
> 下游影响：`03-api-design.md`、`04-business-logic.md`

## 文档目标

定义 3 张新表的 DDL 与约束，以及凭证存储策略（服务端 env，不入库）。

## 1. 凭证存储策略（2026-08-15 定稿）

- **群机器人设置仅需「名称 + Webhook 地址（或 Key）」**（用户确认：后台不提供 env 等其它设置方式）。
- `webhook_key` 存库（`push_webhooks.webhook_key`）；**零回显**——任何 API 响应只返回脱敏摘要（`maskedKey`，保留后 4 位），编辑时留空表示保持原值；日志/异常同样脱敏。
- 可选**加签密钥**（`secret`，高级安全设置）：配置了发送带 sign（HMAC-SHA256），未配置则普通发送（企微未开启加签时自动兼容）。
- 发送端解析：`sender.service.getCredential(webhook)` 直接读 `webhook_key` / `secret`。

## 2. 表结构

### 2.1 `push_webhooks` — 群机器人配置

```sql
CREATE TABLE IF NOT EXISTS push_webhooks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '展示名（如：生产日报群）',
  enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '启用；凭证缺失时强制不可启用',
  remark VARCHAR(255) DEFAULT '' COMMENT '备注',
  credential_type ENUM('direct','env') NOT NULL DEFAULT 'direct' COMMENT '恒为 direct（保留列，历史兼容）',
  webhook_key VARCHAR(128) DEFAULT NULL COMMENT '企微 webhook key（脱敏零回显）',
  secret VARCHAR(128) DEFAULT NULL COMMENT '可选加签密钥（有值则发送带 sign）',
  env_name VARCHAR(50) DEFAULT NULL COMMENT '历史 env 引用列（不再使用）',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='企微群机器人配置（名称+Webhook，凭证存库零回显）';
```

### 2.2 `push_scripts` — 推送脚本

```sql
CREATE TABLE IF NOT EXISTS push_scripts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '脚本名称',
  description VARCHAR(255) DEFAULT '' COMMENT '描述',
  status ENUM('enabled','disabled') NOT NULL DEFAULT 'enabled' COMMENT '启停',
  schedule_type ENUM('daily','cron') NOT NULL DEFAULT 'daily' COMMENT 'daily=每天固定时间；cron=cron 表达式',
  schedule_value VARCHAR(64) NOT NULL COMMENT 'HH:mm 或 cron 表达式',
  timezone VARCHAR(32) NOT NULL DEFAULT 'Asia/Shanghai' COMMENT '调度时区',
  webhook_id INT UNSIGNED NOT NULL COMMENT '关联 push_webhooks.id',
  msgtype ENUM('text','markdown') NOT NULL DEFAULT 'text' COMMENT '消息类型',
  template_content TEXT NOT NULL COMMENT '消息模板，支持 {{var}}',
  mention_type ENUM('none','all','roles','users','filtered') NOT NULL DEFAULT 'none' COMMENT '@ 方式（filtered=按条件筛选不满足人员）',
  mention_targets JSON DEFAULT NULL COMMENT 'roles=角色数组；users=userId 数组',
  mention_source VARCHAR(50) DEFAULT NULL COMMENT 'filtered 模式：数据源 id（如 daily_report），取该源人员名单',
  condition_config JSON DEFAULT NULL COMMENT '{logic, rules:[{source,field,operator,value}]}',
  retry_times TINYINT UNSIGNED NOT NULL DEFAULT 2 COMMENT '失败重试次数',
  retry_interval INT UNSIGNED NOT NULL DEFAULT 60 COMMENT '重试间隔秒（指数退避）',
  max_daily_sends INT UNSIGNED NOT NULL DEFAULT 20 COMMENT '每日发送上限',
  consecutive_failures INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '连续失败计数（熔断，内部维护）',
  notify_on_fail TINYINT(1) NOT NULL DEFAULT 1 COMMENT '失败是否站内告警',
  last_run_at DATETIME DEFAULT NULL COMMENT '最近执行时间',
  last_run_status VARCHAR(20) DEFAULT NULL COMMENT '最近执行状态',
  last_error VARCHAR(500) DEFAULT NULL COMMENT '最近错误',
  created_by INT UNSIGNED DEFAULT NULL COMMENT '创建人 userId',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_status (status),
  INDEX idx_webhook (webhook_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='条件化定时推送脚本';
```

### 2.3 `push_task_logs` — 执行日志

```sql
CREATE TABLE IF NOT EXISTS push_task_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  script_id INT UNSIGNED NOT NULL COMMENT '关联 push_scripts.id',
  schedule_key VARCHAR(14) NOT NULL COMMENT 'yyyyMMddHHmm 幂等键',
  condition_result ENUM('pass','fail','error') DEFAULT NULL COMMENT '条件判定结果',
  condition_detail JSON DEFAULT NULL COMMENT '逐条条件判定明细',
  rendered_content TEXT DEFAULT NULL COMMENT '渲染后的消息体',
  mention_detail JSON DEFAULT NULL COMMENT '@ 目标（手机号/userid 脱敏）',
  send_status ENUM('success','failed','skipped','condition_fail') NOT NULL DEFAULT 'skipped' COMMENT '最终状态',
  attempts JSON DEFAULT NULL COMMENT '每次发送尝试（http_status/响应截断/error/耗时）',
  error_message VARCHAR(500) DEFAULT NULL COMMENT '最终错误',
  duration_ms INT UNSIGNED DEFAULT NULL COMMENT '总耗时毫秒',
  created_at DATETIME DEFAULT NOW(),
  UNIQUE KEY uk_script_schedule (script_id, schedule_key),
  INDEX idx_created_at (created_at),
  INDEX idx_send_status (send_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推送执行日志';
```

## 3. 约束与说明

| 项 | 说明 |
|----|------|
| 幂等 | `UNIQUE(script_id, schedule_key)` + `INSERT IGNORE`，同分钟重复执行只落一条 |
| 凭证 | key/secret 永不入库；`push_webhooks` 仅引用名；接口返回 `configured` 布尔 |
| 条件配置 | `condition_config` 结构 `{"logic":"AND","rules":[{"source":"daily_report","field":"missing_count","operator":">","value":0}]}`；空 rules 视为未配置 → 保存校验拒绝（默认不发送） |
| @ 目标 | `mention_targets` 存 userId/角色名（非手机号），发送时动态解析，避免手机号变更失联 |
| 日志脱敏 | `mention_detail`/`attempts`/`error_message` 不含完整 key；响应体截断 500 字符 |
| 软删除 | 不提供软删，`push_webhooks` 被脚本引用时禁止物理删除（先改脚本） |

## 4. 预定义数据源（条件判定用，注册表可扩展）

| source | 说明 | 字段 | 人员名单（people） |
|--------|------|------|-------------------|
| `daily_report` | 公出日志（日报） | 昨日：`total_count`、`submitted_count`、`missing_count`、`on_time_count`、`late_count`、`coverage`；**今日：`today_total_count`、`today_submitted_count`、`today_missing_count`**（当日应填的出差/外场人员口径，与合规提醒同源） | `missing_workers`（昨日未提交）、**`today_missing_workers`（今日未填写——当天还没填公出日志的出差人员）** |
| `compliance` | 昨日合规 | `missing_projects`、`checked_projects`、`missing_count` | — |
| `attendance` | 今日考勤 | `is_workday`（bool）、`leave_count`、`biz_trip_count` | — |
| `users` | 用户统计 | `active_count`、`pending_count` | — |
| `system` | 系统日期 | `date`、`weekday`（1-7）、`day_of_month`、`month` | — |

> `people` 名单能力：支持「按条件筛选 @」的数据源在元信息中声明 `people`（`getSourceMeta` 下发）；`mention_source` 格式为 `source` 或 `source.peopleField`（如 `daily_report.today_missing_workers`），发送时动态取该名单；名单为空（全员满足）→ 不触发 @。`today_missing_workers` 口径：出差中（`attendance_leave_requests` biz_trip 进行中）且当日无日报的在职外场人员（与合规提醒 `getDailyStatus` 的 `status='missing'` 一致）。

> 字段元信息（名称/类型/说明）由 `/api/push/data-sources/list` 下发，前端条件编辑器动态渲染。

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-18 | 初始创建 | 殇血轮回 |
