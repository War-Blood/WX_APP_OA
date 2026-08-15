# 04-business-logic — 业务逻辑

> 维度：核心业务流程（调度、执行链路、安全、熔断、告警）
> 读者：后端开发、测试
> 上游依赖：`02-data-design.md`、`03-api-design.md`
> 下游影响：`06-tech-architecture.md`

## 文档目标

定义调度注册、单次执行全链路、加签算法、熔断/限流、告警规则。

## 1. 调度机制

- `common/tasks/push.task.js` 提供 `syncScripts()`：
  - 启动时（scheduler.js 挂载）从 DB 加载全部 `status='enabled'` 脚本；
  - 每脚本注册一个 `node-cron` 实例（`timezone` 取脚本字段，默认 Asia/Shanghai）；
  - 脚本 create/update/toggle/delete 后调用 `syncScripts()` 全量重同步（脚本量级小，简单可靠）。
- cron 命中回调 → `executor.execute(script)`（异步执行，不阻塞主进程；错误由 task 层捕获记日志）。

## 2. 单次执行链路（executor.service.js）

```
1  Redis 锁        SET oa:push:lock:<scriptId>:<yyyyMMddHHmm> NX EX 60
                   └─ 未获取到锁 → 结束（另一实例已执行）
2  幂等            INSERT IGNORE push_task_logs(script_id, schedule_key)
                   └─ 影响行数=0 → 结束（本分钟已执行过）
3  每日限流        INCR oa:push:daily:<scriptId>:<yyyyMMdd>（首日 SETEX 86400）
                   └─ 计数 > max_daily_sends → 更新日志 send_status='skipped' → 结束
4  加载数据源      condition.service 按白名单执行查询 → context 对象
5  条件判定        rules 逐条比较 → 全部通过（AND）/任一通过（OR）
                   └─ 不通过 → 日志 condition_result='fail'、send_status='condition_fail' → 结束
6  模板渲染        template.service 替换 {{var}} → rendered_content
                   （内容可直接写固定文本，变量可选；text 超 2048 字节 / markdown 超 4096 字节 → 截断并记日志）
7  解析 @ 目标     mention.service.resolve(script, context)
                   none: 不@；all/roles/users: 查 users → text: mentioned_mobile_list(phone) / markdown: mentioned_list(qywx_userid)
                   filtered: 从数据源人员名单（如 daily_report.missing_workers）动态取"不满足人员"
                     → 名单为空（全员满足）→ 不触发 @（detail 记录原因）
                   └─ 无对应标识的用户跳过，mention_detail 记录姓名与缺失原因
8  安全发送        sender.service.send(webhook, msgtype, content, mentions)
                   a. 读凭证（push_webhooks.webhook_key/secret）→ key 缺失 → 抛 PUSH_WEBHOOK_NOT_CONFIGURED
                   b. 格式校验 key（secret 有值也校验）
                   c. 固定拼 URL：https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=<key>
                   d. secret 有值 → sign = base64(HMAC-SHA256(secret, timestamp+"\n"+secret))，URL 追加 &timestamp=&sign=
                      （无 secret 则普通发送，企微未开启加签时自动兼容）
                   e. axios POST（timeout 30s）→ errcode===0 视为成功
                   f. 失败按 retry_times 指数退避重试（间隔 retry_interval * 2^n）
9  落库与熔断      更新 push_task_logs（send_status/attempts/error_message/duration_ms）
                   └─ 成功 → consecutive_failures=0
                   └─ 失败 → consecutive_failures+1；≥3 → status='disabled'（自动熔断）
10 失败告警        最终失败且 notify_on_fail=1 →
                   向全部 role='superadmin' 的 users 插入 messages 站内消息
                   （type='push_fail'，title 含脚本名，content 含时间/错误摘要；熔断时标注"已自动停用"）
```

## 3. 条件判定引擎

- 数据源注册表（白名单）：`daily_report` / `compliance` / `attendance` / `users` / `system`（字段见 02 文档 §4）。
- 操作符：`==`、`!=`、`>`、`>=`、`<`、`<=`、`in`、`not_in`、`contains`、`is_true`、`is_false`、`is_empty`、`not_empty`。
- 组合：`logic: 'AND' | 'OR'`；规则为空 → 保存时拒绝（2706），执行时视为恒假不发送。
- 数据源查询失败 → 条件结果 `error`，日志记录，不发送（避免误发）。

## 4. 模板渲染

- 内置变量：`{{date}}`（YYYY-MM-DD）、`{{date_n}}`（N 天前，如 `{{date_1}}`）、`{{weekday}}`、`{{time}}`（HH:mm:ss）、`{{script_name}}`、`{{mention_names}}`（@ 人员姓名顿号列表）。
- 数据源字段：`{{<source>.<field>}}`（如 `{{daily_report.missing_count}}`）。
- 未知变量保留原样并在日志 warning（不阻断发送）；strict 校验仅在测试 dryRun 时提示。

## 5. 安全规则（详见 00-index 安全基线）

| # | 规则 | 实现 |
|---|------|------|
| 1 | 凭证零回显 | key 存库但 API 只返回脱敏摘要（保留后 4 位）；编辑留空不修改；日志/错误 URL 脱敏（key 替换 `***`） |
| 2 | 加签（可选） | secret 有值则发送带 sign（HMAC-SHA256）；未开启加签的机器人自动兼容（sign 被企微忽略） |
| 3 | 固定出站 URL | 不接受自定义 URL；key/secret 格式校验防注入 |
| 4 | 熔断 | 连续失败 ≥3 自动 disabled + 告警 |
| 5 | 限流 | 每日上限（Redis 计数）+ 测试端点每分钟 ≤3（Redis 计数） |
| 6 | 权限 | 全部 admin+；写操作审计到 operation_logs（模块='push'） |
| 7 | 企微侧 | 文档指引：群机器人"安全设置"配置可信 IP 白名单（服务器出口 IP） |

> **加签兼容性说明（2026-08-15 验收确认）**：企微群机器人**未开启加签**时，请求携带 `sign` 参数会被企微忽略（实测 `errcode=0` 正常投递），因此 secret 可配置占位值，系统始终带 sign 发送，两种模式均兼容；**开启加签后**，secret 必须与企微侧安全设置中的密钥一致，否则企微返回 93000 拒绝投递。建议生产环境开启加签并配置可信 IP 白名单。

## 6. 幂等与并发

- 同分钟重复触发：Redis 锁 + `UNIQUE(script_id, schedule_key)` 双保险。
- PM2 fork 多实例：各实例都注册 cron，但锁保证只有一台执行。
- 重试期间的再次调度命中：锁已释放可能再次触发 —— 由幂等键拦截（schedule_key 相同）。

## 7. 错误分类与日志

| 阶段 | 日志字段 |
|------|---------|
| 锁/幂等/限流跳过 | send_status='skipped'，error_message=原因 |
| 条件不满足 | condition_result='fail'，send_status='condition_fail'，condition_detail 全量 |
| 数据源异常 | condition_result='error'，error_message=异常摘要 |
| 发送失败（重试耗尽） | send_status='failed'，attempts 全量（响应截断 500 字符，URL 脱敏） |
| 成功 | send_status='success'，attempts 含 http_status=200/errcode=0 |

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-18 | 初始创建 | 殇血轮回 |
