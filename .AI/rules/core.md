# 核心规则 — Core Rules

> **加载策略**: 本文件为所有任务上下文的基础规则文件，AI Agent 必须在每次会话中首先加载。
> 
> **规则文件清单**（本项目共 8 个规则文件，`core.md` 为唯一入口）:
>
> | 文件 | 角色 | 加载方式 |
> |------|------|---------|
> | `core.md` | 全局铁律入口（本文件） | **始终加载** |
> | `tech-stack.md` | 技术栈单一来源 | 技术选型/环境配置时加载 |
> | `coding-standards.md` | 命名/格式/分层架构/响应格式 | 代码生成/修改时加载 |
> | `git-workflow.md` | 分支/Commit/推送策略 | Git 操作时加载 |
> | `backend-rules.md` | 后端技术选型/分层约束/文档索引 | backend/ 操作时加载 |
> | `miniapp-rules.md` | 小程序页面层级/设计令牌/API调用 | miniapp/ 操作时加载 |
> | `miniapp-design-patterns.md` | 小程序设计模式（页面/卡片/表单/标签/令牌） | miniapp/ UI 开发时加载 |
> | `webapp-rules.md` | Web 管理后台技术栈/里程碑/目录规范 | webapp/ 操作时加载 |
> | `error-codes.md` | 错误码字典 + 编码分区规范 | 新增/修改错误码时加载 |
> | `review-checklist.md` | 功能/安全/性能/测试审查清单 | Code Review / PR 时加载 |

---

## 一、全局铁律（跨项目通用）

这些规则适用于所有子项目（backend / miniapp / webapp），违反任何一条即视为不合格。

### 任务执行
1. **[R1] 上下文加载**: 每次任务开始前，必须在回复中先引用对应规则文件的至少 1 条核心约束（格式: `` `[文件名](路径:行号)` ``），确认已读取该文件
2. **[R2] 意图确认**: 收到任务后，若满足以下任一条件必须反问用户：
   - 任务涉及 2 个及以上子项目
   - 用户未指定数据范围（如"所有用户" vs "某部门"）
   - 存在两种及以上技术方案且性能差异 > 30%
3. **[R3] PRD 对齐**: 所有新增功能必须先在对应 PRD 文档中找到匹配的功能条目（PRD 中功能名称 + 至少 1 条验收条件匹配），否则拒绝实现并提示补充 PRD
4. **[R4] 分项目独立**: 三个子项目代码目录（`backend/`、`miniapp/`、`webapp/`）内的修改不得影响其他子项目的编译/运行。唯一允许的跨项目变更是 `.AI/rules/`、`.AI/Wiki/`、`.AI/skills/` 中的共享文件，且须在 commit message 的 scope 中标注 `shared`

### 输出标准
5. **[R5] 无死代码**: 提交的代码中禁止包含：被注释掉的行（单行或多行）、`console.log`、`debugger` 语句、已声明但未引用的变量
6. **[R6] 无硬编码密钥**: 禁止硬编码任何密码、token、API key、密钥（统一用 `.env` 管理）
7. **[R7] 单引号**: JS/TS 代码统一使用单引号 `'`
8. **[R8] 缩进统一**: 使用 2 空格缩进，禁止 Tab；行尾使用 LF（Unix），禁止 CRLF

---

## 二、编码核心约束

### 命名规则（全局强制）

| 元素 | 规范 | 违规示例 | 合规示例 |
|------|------|---------|---------|
| 文件名 (JS/TS/Vue) | `kebab-case` | `UserService.js` | `user-service.js` |
| 变量/函数 | `camelCase` | `user_list` | `userList` |
| 类/构造函数 | `PascalCase` | `userService` | `UserService` |
| 常量 | `UPPER_SNAKE_CASE` | `maxRetry` | `MAX_RETRY_COUNT` |
| 数据库表/字段 | `snake_case` | `userName` | `user_name` |
| API 路由 | `kebab-case` | `/api/userList` | `/api/user-list` |

### 通用格式
9. **[R9] 行宽限制**: 单行代码不超过 120 字符
10. **[R10] 文件末尾**: 每个文件末尾保留一个空行
11. **[R11] 空行限制**: 函数之间保留一个空行，函数体内部最多连续 2 个空行

### 注释规则
12. **[R12] JSDoc 必加**: 所有通过 `module.exports` / `export` 导出的函数必须添加 JSDoc，至少包含：
    - `@description` — 1 句功能说明
    - `@param` — 每个参数的类型和名称
    - `@returns` — 返回值类型和含义
13. **[R13] 复杂逻辑必注释**: 圈复杂度 ≥ 5 的逻辑块必须在分支入口处写行注释，格式为 `// <触发条件> : <处理策略>`（如 `// 超时退避: 等间隔累加 2s`）

---

## 三、后端核心约束 (backend)

> 完整规则见 `backend-rules.md`，此处仅列出铁律级约束。

### 分层架构（强制）
```
routes/ → controllers/ → services/ → config/(database.js + redis.js)
```

14. **[R14] 分号强制**: 语句末尾必须加分号 `;`（ESLint `semi: always` 强制检查）
15. **[R15] 路由层只做分发**: 不得包含业务逻辑、数据库操作、参数校验
16. **[R16] 控制器层负责校验**: 使用 Joi 校验入参，调用 service 后格式化响应
17. **[R17] 服务层包含全部业务逻辑**: 可被多个 controller 复用
18. **[R18] 数据层只做 SQL 执行**: 不得掺杂业务判断

### 统一响应格式（强制）
```javascript
{ code: 0, message: "success", data: {...} }       // 成功
{ code: 1001, message: "参数校验失败", data: null }  // 失败
{ code: 0, message: "success", data: { list: [...], total: 100 } }  // 分页
```

19. **[R19] HTTP 状态码统一 200**: 所有业务错误通过 `code` 字段区分，HTTP 层面始终返回 200
20. **[R20] 分页字段名固定**: 请求 `{ page, pageSize }`，响应 `{ list, total }`

### API 路由规范（强制）
21. **[R21] 前缀 `/api/`**: 所有接口路径以 `/api/` 开头
22. **[R22] RESTful 方法**: GET=查询, POST=创建/操作, PATCH=部分更新, DELETE=删除

### SQL 安全
23. **[R23] 参数化查询 100%**: 所有 SQL 使用 `mysql2` 的 prepared statements，禁止字符串拼接（此规则同时覆盖安全底线中的数据库安全要求）

---

## 四、小程序核心约束 (miniapp)

> 完整规则见 `miniapp-rules.md`

24. **[R24] 无分号**: JS 代码不加分号 `;`（与后端风格区分，通过编辑器/Prettier 保持一致）
25. **[R25] Composition API**: 必须使用 `<script setup>` 语法
26. **[R26] 数据来源**: 所有页面数据通过 `services/modules/*.js` 获取，禁止硬编码假数据
27. **[R27] 样式单位**: 小程序使用 `rpx` 单位，Web/H5 使用 `px`

### 设计令牌
| 令牌 | 值 | 用途 |
|------|----|------|
| `--color-primary` | `#2B6DE8` | 主色 |
| `--color-bg-page` | `#F0F2F8` | 页面背景 |

---

## 五、Web 管理后台核心约束 (webapp)

> 完整规则见 `webapp-rules.md`

28. **[R28] 无分号**: TS/JS 代码不加分号 `;`（与后端风格区分，ESLint flat config 不检查分号，Prettier 负责格式化）
29. **[R29] TypeScript 严格模式**: 提交前运行 `npm run type-check`，确保零错误
30. **[R30] 禁止 `any` 类型**: 禁止使用 `any` 类型。唯一例外：第三方库类型定义不完整时，允许使用 `any` 并在同一行上方加注释，格式为 `// any: <库名> 缺少 <类型名> 定义`

---

## 六、Git 铁律（全局强制）

> 完整规则见 `git-workflow.md`

### 提交格式（强制）
```
<type>(<scope>): <subject>    → 标题 ≤ 72 字符，中文描述
```

| Type | 用途 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构 |
| `docs` | 文档 |
| `chore` | 构建/依赖 |

31. **[R31] 提交必检查**: 每次 `git commit` 前运行 `npm run lint`，确保零错误
32. **[R32] 一次一事**: 每次 commit 的变更范围不超过 3 个文件。若超过 3 个文件，必须在 commit body 中用 1 句话概括所有变更之间的逻辑关联

### 推送策略（按分支）

| 分支 | AI 可 push 远程 |
|------|:---:|
| `test` | ✅ 允许 |
| `stable` | ❌ 禁止 |
| `main` | ❌ 禁止（红线） |

33. **[R33] 仅 push test**: AI 只允许 `git push` 到 `test` 分支，禁止 push `main` / `stable`
34. **[R34] 禁止 force push**: 任何情况下禁止 `git push --force`

### 分支命名
35. **[R35] 分支前缀固定**: 功能=`feature/xxx`、修复=`fix/xxx`、紧急=`hotfix/xxx`、发布=`release/vX.Y.Z`

---

## 七、安全底线（全局强制）

> 完整检查清单见 `review-checklist.md`

36. **[R36] 输入校验**: 所有用户输入必须经过 Joi（后端）或表单验证（前端）后方可使用
37. **[R37] 权限检查 100%**: 每个受保护的 API 端点必须有 JWT 验证中间件
38. **[R38] 敏感信息不入日志**: 密码、token、身份证号不得出现在日志中
39. **[R39] 无硬编码凭证**: 密钥/密码/API key 只能在 `.env` 中，且 `.env` 文件不得提交
40. **[R40] Agent 边界检查**: 代码修改前检查目标文件是否属于当前 Agent 的 `agent_boundary`（定义在 `.AI/skills/<agent-name>/SKILL.md` 的 frontmatter 中）。跨边界修改必须先向 orchestrator 申请，由对应 Agent 执行。禁止任何 Agent 修改不属于自己管辖范围的代码

---

## 八、任务计划管理

41. **[R41] 计划归档**: 每次生成/更新任务计划时，必须将完整计划写入 `需求/任务进度/` 目录
42. **[R42] 文件命名**: 计划文件命名格式为 `YYYY-MM-DD_HHMM.md`（如 `2026-06-22_0826.md`），便于按时间排序阅读
43. **[R43] 计划覆盖**: 同一天多次更新计划时生成新文件（时间戳不同），旧文件保留不覆盖，形成计划演进历史

---

## 九、错误码管理

> 完整字典见 `error-codes.md`，权威源文件: `backend/src/common/utils/constants.js`

44. **[R44] 错误码独立**: 每个业务错误场景必须有独立错误码，禁止复用。新增错误码前必须先 `grep constants.js` 确认未占用。
45. **[R45] 错误码分区**: 编码按模块分区（1000 系统/1100 认证/1200 用户/2000 日报/2100 审批/2200 审核/2300 管理/2400 邀请码/2500 统计），新增时追加到对应分区末尾。
46. **[R46] 禁止硬编码**: 代码中必须使用 `ErrorCode.CONST_NAME`，禁止直接写数字（如 `code: 2001`）。

---

## 十、审查通过标准

> 详细检查清单见 `review-checklist.md`

### 一票否决（出现任一即退回）
- ❌ 存在 SQL 字符串拼接
- ❌ 存在 `console.log` / `debugger` 残留
- ❌ 存在硬编码密钥/密码
- ❌ 未做参数校验的公开 API
- ❌ 函数圈复杂度 > 10 且无注释说明

### 量化阈值
| 指标 | 上限 | 测量方法 |
|------|------|---------|
| 单函数行数 | ≤ 100 | `eslint max-lines-per-function` 规则 |
| 圈复杂度 | ≤ 10 | `eslint complexity` 规则 |
| 嵌套层数 | ≤ 4 | `eslint max-depth` 规则 |
| API 响应时间 | P90 ≤ 500ms | 后端 PR 合并前运行集成测试，使用 `jest + supertest + process.hrtime` 测量 |
| 测试覆盖率 | ≥ 70% | `jest --coverage --collectCoverageFrom='src/**/*.js'`，branches/functions/lines/statements 四项均 ≥ 70%（与 `backend/package.json` jest.coverageThreshold 一致） |
| 测试命名 | `should_xxx_when_xxx` | 如 `should_return_401_when_token_expired` |

---

> **关联文件**: 本文件是核心约束的合集。各专项规则的完整版本请参见：
> - `.AI/rules/coding-standards.md` — 完整编码规范
> - `.AI/rules/git-workflow.md` — 完整 Git 工作流
> - `.AI/rules/review-checklist.md` — 完整审查清单
> - `.AI/rules/backend-rules.md` — 后端完整规则
> - `.AI/rules/miniapp-rules.md` — 小程序完整规则
> - `.AI/rules/webapp-rules.md` — Web 管理后台完整规则
