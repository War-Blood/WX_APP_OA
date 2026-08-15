# 08-acceptance — 验收

> 维度：功能验收标准（可执行清单）
> 读者：测试、orchestrator
> 上游依赖：`01-requirements.md`、`04-business-logic.md`

## 文档目标

提供可直接执行的验收清单，覆盖功能、安全、可靠性。

## 1. 功能验收

- [ ] 群机器人 CRUD：新建（envName 格式校验）、编辑、启停、删除（被引用时拒绝）。
- [ ] 脚本 CRUD：创建/编辑/启停/删除；daily `HH:mm` 与 cron 表达式均校验；变更后调度即时生效（重同步）。
- [ ] 定时触发：daily 与 cron 命中正确；时区取脚本 timezone（Asia/Shanghai 边界：23:59→00:00、夏令时场景不适用亚洲时区）。
- [ ] 条件判定：满足 → 发送；不满足 → 不发送且日志 `condition_fail`；AND/OR 组合正确；空规则保存被拒（2706）。
- [ ] 模板渲染：内置变量 + 数据源字段全部替换；超长内容截断；dryRun 可预览渲染结果。
- [ ] @ 解析：text → mentioned_mobile_list（phone）；markdown → mentioned_list（qywx_userid）；缺失标识用户跳过并在 mention_detail 记录。
- [ ] 手动测试：dryRun 不发送只预览；真实发送成功返回 sendStatus；脚本 disabled 时测试被拒（2708）。
- [ ] 日志：列表筛选（脚本/状态/日期范围）；详情含条件明细、渲染内容、@ 目标、attempts。

## 2. 安全验收

- [ ] 凭证零暴露：遍历所有 API 响应、前端页面、日志文件，无完整 webhook key/secret；错误信息 URL 脱敏。
- [ ] 加签正确：sign 计算符合企微规范（HMAC-SHA256 + base64 + `timestamp\nsecret`）；联调验证错误 secret 的请求被企微 93000 拒绝。
- [ ] 凭证缺失防护：env 未配置时 `configured=false`；保存启用被拒（2709）；发送失败并告警。
- [ ] 固定 URL：配置项中无任何 URL 输入点；key 格式校验 `^[A-Za-z0-9\-_]{8,}$` 生效。
- [ ] 熔断：连续 3 次失败自动 `status='disabled'` + 站内告警（标注已停用）；手动 toggle 恢复后正常。
- [ ] 限流：每日发送上限生效（超限当日 `skipped`）；测试端点每分钟 ≤3，超限 429。
- [ ] 幂等：同分钟重复触发（模拟双实例/手动连点）只发送一次、只落一条日志。
- [ ] 权限：employee 访问 `/api/push/*` 返回 403；前端无菜单入口。
- [ ] 审计：webhook/script 增删改与测试发送写入 operation_logs（模块='push'）。

## 3. 告警验收

- [ ] 发送最终失败且 notify_on_fail=1 → 仅 superadmin 角色的用户收到 messages 站内消息（type='push_fail'），admin 不收。
- [ ] 告警内容含脚本名、执行时间、错误摘要；熔断场景额外标注"已自动停用"。
- [ ] notify_on_fail=0 时不发告警但日志照常。

## 4. 回归验收

- [ ] 现有 scheduler 其他任务（提醒/合规/统计/答题超时）不受影响。
- [ ] 后端 `npm test`（含新增单测/集成测试）通过，覆盖率不下降。
- [ ] webapp `npm run type-check` 零错误；`npm run build` 通过；无新增 `any`、无 console/debugger。
- [ ] 生产部署后 `/api/health` 正常；`.env` 新增变量后服务启动正常。

## 5. 验收数据准备

- 测试群机器人：真实企微群机器人 webhook（key+secret 测试值，验收后可从 .env 移除或保留）。
- 测试脚本：daily `08:30` + 条件 `daily_report.missing_count > 0` + 真实/模拟数据。
- 模拟失败：临时配置错误 secret / 停用机器人 / 断网，验证熔断与告警。

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-18 | 初始创建 | 殇血轮回 |
