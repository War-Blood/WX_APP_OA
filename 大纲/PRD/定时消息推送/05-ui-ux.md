# 05-ui-ux — UI/UX 设计

> 维度：界面结构与配置字段（Web 管理后台）
> 读者：前端开发、产品、测试
> 上游依赖：`03-api-design.md`
> 下游影响：`06-tech-architecture.md`、前端实现

## 文档目标

定义「消息推送」菜单的三张页面：脚本管理 / 群机器人 / 执行日志。

## 1. 导航与路由

- 一级菜单「消息推送」：`config/modules.ts` 新增
  `{ key:'push', icon:'ChatDotRound', title:'消息推送', path:'/push', roles:['admin','superadmin'], children:[脚本管理/群机器人/执行日志] }`
- 路由：`/push/scripts`（默认）、`/push/webhooks`、`/push/logs`；roles 均为 admin/superadmin。
- 同步后端 `core/services/module.service.js` web 默认模块清单（key='push'，sort=20）。

## 2. 脚本管理页（/push/scripts）

### 2.1 列表
- 列：名称、状态（el-switch 快捷启停，熔断禁用时展示"已熔断"tag 且需确认后手动恢复）、触发时间（`每天 08:30` / cron 原文 + 时区）、目标群、最近执行（时间/状态）、操作（编辑/删除/测试）。
- 工具栏：关键字搜索、状态筛选、新建按钮。

### 2.2 新建/编辑弹窗（el-dialog + el-form，宽 720px，Tab 分组）

| 分组 | 字段 | 控件 | 校验 |
|------|------|------|------|
| 基本信息 | 名称 | el-input | 必填 ≤100 |
| | 描述 | el-input | ≤255 |
| | 启用 | el-switch | — |
| 触发时间 | 类型 | el-radio（每天固定时间 / cron 表达式） | — |
| | 时间 | el-time-picker（daily） | 必填 |
| | cron | el-input + 校验提示（daily 时隐藏） | 合法 cron（后端 2704） |
| | 时区 | el-select（Asia/Shanghai 默认） | 必填 |
| 目标与内容 | 目标群 | el-select（push_webhooks，disabled 项置灰并标注"未配置凭证/已停用"） | 必填 |
| | 消息类型 | el-radio（text / markdown） | — |
| | 消息模板 | el-input type=textarea（rows=6）+ 变量提示面板 | 必填；变量面板点击插入 `{{var}}` |
| | @ 方式 | el-radio（不@ / @所有人 / 按角色 / 指定人员） | — |
| | @ 角色 | el-select multiple（角色列表） | roles 时必填 |
| | @ 人员 | el-select multiple filterable remote（用户远程搜索） | users 时必填 |
| 发送条件 | 条件组逻辑 | el-radio（AND / OR） | — |
| | 规则列表 | 动态表单：数据源下拉（data-sources/list）→ 字段下拉（按数据源联动）→ 操作符下拉（按字段类型）→ 值输入（数字/文本/布尔/多值） | 至少 1 条（后端 2706） |
| 重试与告警 | 重试次数 | el-input-number（0-5） | — |
| | 重试间隔（秒） | el-input-number（10-3600） | — |
| | 每日发送上限 | el-input-number（1-100，默认 20） | — |
| | 失败站内告警 | el-switch（默认开） | — |

- 底部操作：保存 / **测试发送**（下拉：dryRun 预览 / 真实发送；dryRun 结果展示条件判定明细 + 渲染后内容预览；真实发送展示 sendStatus）。

## 3. 群机器人页（/push/webhooks）

| 字段 | 控件 | 说明 |
|------|------|------|
| 名称 | el-input | 必填，如「生产日报群」 |
| Webhook | el-input | 必填：粘贴企微群机器人完整 Webhook 地址（或纯 Key）；**编辑时留空=保持不变**（placeholder 提示当前脱敏值） |
| 高级安全设置（折叠） | el-collapse | 可选：**加签密钥**（type=password；企微「安全设置」开启加签后填写，未开启可不填） |
| 启用 | el-switch | 未配置凭证时禁用开关并提示 |
| 备注 | el-input | ≤255 |

- 列表列：名称 / Webhook（脱敏 key）/ 凭证状态（已配置/未配置）/ 启用开关 / 备注 / 操作（编辑/删除）。
- 删除保护：被脚本引用时后端拒绝，前端提示"请先修改引用该机器人的脚本"。
- 顶部使用说明卡：凭证零回显、建议加签 + IP 白名单。

## 4. 执行日志页（/push/logs）

- 列表列：脚本名、计划时间（schedule_key 展示为 `YYYY-MM-DD HH:mm`）、条件结果（tag：pass/fail/error）、发送状态（tag：success/failed/skipped/condition_fail）、耗时（ms）、错误摘要。
- 筛选：脚本下拉、状态、日期范围（el-date-picker daterange）。
- 详情抽屉（el-drawer）：条件明细（表格：字段/操作符/实际值/期望值/结果）、渲染后内容（pre 代码块）、@ 目标（脱敏）、发送尝试（每次：attempt 序号/http_status/响应截断/耗时/error）、熔断记录。

## 5. 空态与异常

- 无脚本：引导文案 + 新建按钮。
- 无已配置群机器人：脚本弹窗目标群下拉显示空态提示"请先在群机器人页登记并配置 .env 凭证"。
- dryRun 校验失败（未知变量/条件错误）：错误提示定位到具体项。

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-18 | 初始创建 | 殇血轮回 |
