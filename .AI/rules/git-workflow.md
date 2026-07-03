# Git 工作流规范 — Git Workflow

> **本文是项目 Git 规则的唯一权威文件**。所有其他文件（CLAUDE.md、AGENTS.md、COLLABORATION-RULES.md、各子项目 rules）中的 Git 相关内容均以本文为准。

## 适用范围

- **适用对象**: Claude Code（AI 代理）
- **触发场景**: 任何 Git 操作（提交、分支、推送）
- **预期产出**: 规范的 Git 历史记录

---

## 远程仓库

| 远程名称 | GitHub 仓库 | 用途 |
|---------|------------|------|
| `origin` | `War-Blood/WX_APP_RB` | 默认远程（stable/main 所在） |
| `WX_APP_OA` | `War-Blood/WX_APP_OA` | **test 分支所在，AI push 目标** |

---

## 分支策略（三支模型）

```
feature/fix/hotfix → test → stable → main（用户手动）
```

| 分支 | 用途 | AI 可 push 远程？ |
|------|------|:---:|
| `main` | 生产就绪代码 | ❌ **禁止**（红线） |
| `stable` | 验证通过的稳定版本 | ❌ **禁止** |
| `test` | 功能集成测试环境 | ✅ **允许**（WX_APP_OA） |

### 短期分支

| 分支类型 | 命名格式 | 来源 | 合并到 |
|---------|---------|------|--------|
| 功能分支 | `feature/xxx` | `test` | `test` |
| Bug 修复 | `fix/xxx` | `test` | `test` |
| 紧急修复 | `hotfix/xxx` | `stable` | `stable` → `test` |
| 发布分支 | `release/vX.Y.Z` | `test` | `stable` |

### 命名规则

```
feature/简短描述        → feature/attendance-module
fix/问题描述             → fix/login-crash
hotfix/紧急问题           → hotfix/payment-error
release/vX.Y.Z          → release/v1.2.0
```

---

## AI 权限边界

| 操作 | 本地 | 远程 |
|------|:--:|:---:|
| `git commit` | ✅ 自动 | — |
| `git push WX_APP_OA <branch>:test` | — | ✅ **自动** |
| `git push origin stable` | — | ❌ |
| `git push origin main` | — | ❌（红线） |
| `git push --force`（任何分支） | — | ❌ 绝对禁止 |
| 合并到 `stable` / `main` | ❌ | ❌ |

---

## 工作流

1. AI 在 `feature/xxx` 或 `fix/xxx` 上开发，commit 到本地
2. **每次 `git commit` 后自动执行** `git push WX_APP_OA <current-branch>:test`（无需用户确认）
3. 测试验证通过 → **用户手动**合并 `test` → `stable`
4. 确认可用 → **用户手动**合并 `stable` → `main` 并 push

---

## Commit 规范

### 提交格式

```
<type>(<scope>): <subject>    → 标题 ≤ 72 字符，中文描述
```

### Type 类型

| Type | 说明 | Type | 说明 |
|------|------|------|------|
| `feat` | 新功能 | `fix` | Bug 修复 |
| `refactor` | 重构 | `docs` | 文档 |
| `chore` | 构建/依赖 | `perf` | 性能优化 |
| `style` | 格式调整 | `test` | 测试 |

### 规则

- 标题 ≤ 72 字符，中文描述
- 一次提交聚焦一个主题。涉及多个文件时，在 commit body 中用 1 句话概括变更之间的逻辑关联
- 提交前通过 `npm run lint` / `npm run type-check`
- 禁止残留 `console.log`、`debugger`、注释掉的代码、硬编码密钥

---

## Pre-commit Hooks

| 子项目 | Husky | 说明 |
|--------|:---:|------|
| `webapp/` | ✅ | `pre-commit`（lint-staged）+ `commit-msg`（commitlint） |
| `backend/` | ❌ | 提交前手动 `npm run lint` |
| `miniapp/` | ❌ | 提交前手动检查 |

---

## 环境文件管理

```
.env           → 受保护，禁止提交
.env.example   → 必须提交，包含占位符
.env.prod      → 仅在生产服务器维护
```

---

## 推送前检查清单

- [ ] lint / type-check 通过
- [ ] 无硬编码敏感信息（API key、密码、token）
- [ ] 无 `console.log` / `debugger` 残留
- [ ] commit message 清晰准确
- [ ] 目标分支：仅 push 到 `WX_APP_OA` 的 `test`
