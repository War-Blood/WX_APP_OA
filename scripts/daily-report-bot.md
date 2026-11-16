# 日报机器人（daily-report-bot）

把当天的工作内容自动导入到自己账号的「工作日报」里，**不改小程序、不改后端、不发版**。

## 为什么不动小程序也能做

小程序只是 OA 接口的一个客户端。提交工作日报本质上是三次接口调用：

| 步骤 | 接口 | 说明 |
|------|------|------|
| 登录 | \`POST /api/auth/account-login\` | 账号密码换 JWT（小程序端同款接口） |
| 查重 | \`POST /api/report/today-status\` | 当日已提交则跳过，草稿则覆盖 |
| 提交 | \`POST /api/report/submit\` | \`reportType: 'office'\` 即「工作日报」 |

脚本直接走这三步，小程序一行代码都不用改，也不需要发版。

## 前置条件

1. **账号已设置密码**。没有密码时 \`account-login\` 会返回「该账号未设置密码，请联系管理员」，需管理员在后台先设密码（微信登录不受影响）。
2. Node.js 18+（脚本只用内置 \`fetch\` / \`fs\`，无第三方依赖）。

## 用法

\`\`\`bash
# 1. 预览（不联网、不提交）——先看看生成的内容对不对
node scripts/daily-report-bot.js
node scripts/daily-report-bot.js --date 2026-11-17

# 2. 真正提交
OA_ACCOUNT=工号 OA_PASSWORD=密码 node scripts/daily-report-bot.js --submit
\`\`\`

### 参数

| 参数 | 说明 |
|------|------|
| \`-d, --date\` | 日报日期，缺省今天（Asia/Shanghai） |
| \`--source auto\\|log\\|git\` | 内容来源。auto=优先任务日志、缺失回退 git 提交（默认） |
| \`--limit\` | git 回退时最多取几条提交（默认 12） |
| \`--submit\` / \`--yes\` | 真正提交；不传只预览 |
| \`--account\` / \`--password\` | 登录凭证，缺省读环境变量（**推荐环境变量**，命令行会留在 shell 历史） |
| \`--base\` | API 根地址，缺省 \`OA_API_BASE\` 或 \`https://warblood.online\` |

环境变量：\`OA_ACCOUNT\`、\`OA_PASSWORD\`、\`OA_API_BASE\`。

## 内容从哪来

1. **首选**：\`需求/任务日志/YYYY-MM-DD.md\`（\`daily-work-log\` 技能每次开发结束都会写），解析其中四段：
   - \`## 今日工作内容\` → 今日工作内容
   - \`## 明日工作计划\` → 明日计划
   - \`## 遇到的问题\` → 遇到的问题
   - \`## 需协调事项\` → 需协调事项

   \`## 开发补充\` 及其后内容会被忽略（那部分只给开发自己看）。
2. **回退**：没有任务日志或缺少「今日工作内容」时，取当日 git 提交主题（自动去掉 \`feat(xxx):\` 之类前缀），最多 \`--limit\` 条。

两类内容都没有时脚本直接报错退出，不会提交一篇空日报。

## 幂等与覆盖规则

| 当日状态 | 行为 |
|----------|------|
| 无记录 | 新建并提交（\`status=approved\`） |
| 草稿 | 覆盖为已提交 |
| 已提交 / 已审核 | **跳过**，打印已有 reportId（服务端也会以 2002 拒绝重复提交） |

所以定时任务重复跑是安全的，不会产生重复日报。

## 定时执行

Windows（每天 18:30，使用任务计划里的用户环境变量）：

\`\`\`powershell
schtasks /create /tn "OA工作日报" /tr "node D:\Projects\OA\scripts\daily-report-bot.js --submit" /sc daily /st 18:30
\`\`\`

Linux / macOS（crontab）：

\`\`\`cron
30 18 * * * cd /path/to/OA && OA_ACCOUNT=工号 OA_PASSWORD=密码 node scripts/daily-report-bot.js --submit >> /tmp/oa-daily.log 2>&1
\`\`\`

## 与日常开发流程串联

\`\`\`
开发结束 → daily-work-log 技能写 需求/任务日志/YYYY-MM-DD.md
        → node scripts/daily-report-bot.js           # 预览
        → node scripts/daily-report-bot.js --submit  # 导入 OA
\`\`\`

## 安全

- 不要把账号密码写进仓库或 \`.env.example\`；用环境变量或系统任务计划里的用户环境变量。
- 脚本只调用 OA 自己的登录接口，不保存 token、不落盘任何凭证。

## 已知问题

小程序「工作日报 → 明日工作计划」填写后可能未真正上传，原因是提交时用公出日志的 \`tomorrowWork\` 兜底（\`miniapp/src/pages/employee/report-edit/index.vue\`）。该问题已在代码中修复，但**需要下一次小程序发版才生效**；本脚本直接调接口，不受该缺陷影响。
