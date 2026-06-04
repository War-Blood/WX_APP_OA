# Git 工作流规范 — Git Workflow

## 适用范围

- **适用对象**: 所有 AI 工具（Qoder / Cursor / Claude Code / Trae）
- **触发场景**: 任何 Git 操作（提交、分支、合并）
- **预期产出**: 规范的 Git 历史记录

---

## 分支策略

### 长期分支

| 分支 | 用途 | 保护规则 |
|------|------|---------|
| `main` | 生产环境代码 | 禁止直接推送，仅通过 PR 合并 |
| `develop` | 开发集成分支 | 禁止直接推送，仅通过 PR 合并 |

### 短期分支

| 分支类型 | 命名格式 | 来源 | 目标 |
|---------|---------|------|------|
| 功能分支 | `feature/xxx` | `develop` | `develop` |
| Bug 修复 | `fix/xxx` | `develop` | `develop` |
| 紧急修复 | `hotfix/xxx` | `main` | `main` + `develop` |
| 发布分支 | `release/v*.*.*` | `develop` | `main` |

### 命名规则

```
feature/简短描述        → feature/add-export-report
fix/问题编号-描述        → fix/142-fix-login-crash
hotfix/紧急描述          → hotfix/critical-security-patch
release/v主版本.次版本.修订 → release/v1.2.0
```

---

## Commit 规范

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（既不修复 Bug 也不添加功能） |
| `style` | 代码格式调整（不影响逻辑） |
| `test` | 添加或修改测试 |
| `docs` | 文档更新 |
| `chore` | 构建/工具/依赖更新 |
| `perf` | 性能优化 |

### 示例

```
feat(approval): 新增审批抄送功能

- 新增 approval_cc 表存储抄送关系
- POST /api/approval/create 支持 ccIds 参数
- 被抄送人可在审批详情查看

Closes #142
```

### 规则

- 标题不超过 72 字符
- 正文每行不超过 72 字符
- 使用中文描述（技术术语保留英文）
- 一次提交只做一件事

---

## 工作流约束

### 提交前检查
- [ ] 运行 `npm run lint` 无错误
- [ ] 运行 `npm run test` 测试通过
- [ ] Web 项目运行 `npm run type-check`
- [ ] 无 `console.log` / `debugger` 残留
- [ ] 无硬编码敏感信息（token、密码、密钥）

### PR 合并条件
- [ ] 所有 Check 通过
- [ ] 至少 1 人 Code Review 通过
- [ ] 无未解决的对话
- [ ] 分支已 rebase 到目标分支

---

## 环境文件管理

```
.env           → 受保护，禁止提交
.env.example   → 必须提交，包含占位符
.env.prod      → 仅在生产服务器维护
```

- `.env` 文件已加入 `.gitignore`
- 新增环境变量时同步更新 `.env.example`

---

## 推送策略

### AI 自动操作
- 每次任务完成后自动执行 `git add` + `git commit`（仅本地仓库）
- 提交信息遵循本文 Commit 规范

### 需要人工确认的操作
- `git push` 到远程仓库 → **严禁 AI 自动执行**
- `git push --force` → **绝对禁止**（无论是否人工要求）
- `git rebase` / `git reset --hard` → **必须人工确认**

### 推送前检查清单
- [ ] 代码已通过本地 lint/type-check/test
- [ ] 无硬编码敏感信息（API key、密码、token）
- [ ] commit message 清晰准确
- [ ] 确认目标分支正确
