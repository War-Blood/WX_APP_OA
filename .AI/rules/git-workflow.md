# Git 工作流规范 — Git Workflow

## 适用范围

- **适用对象**: Claude Code
- **触发场景**: 任何 Git 操作（提交、分支、推送）
- **预期产出**: 规范的 Git 历史记录

---

## 分支策略（三支模型）

```
feature/fix → test → stable → main（用户手动）
```

| 分支 | 用途 | AI 可 push 远程？ |
|------|------|:---:|
| `main` | 生产就绪代码，完整项目 | ❌ **禁止**（红线） |
| `stable` | 验证通过的稳定可用版本 | ❌ **禁止** |
| `test` | 功能集成测试环境 | ✅ 允许 |

### 短期分支

| 分支类型 | 命名格式 | 来源 | 合并到 |
|---------|---------|------|--------|
| 功能分支 | `feature/xxx` | `test` | `test` |
| Bug 修复 | `fix/xxx` | `test` | `test` |

### 命名规则

```
feature/简短描述        → feature/add-export-report
fix/问题描述             → fix/login-crash
```

---

## AI 权限边界

| 操作 | 本地 | 远程 |
|------|:--:|:---:|
| `git commit` | ✅ 自动 | — |
| `git push test` | — | ✅ |
| `git push stable` | — | ❌ |
| `git push main` | — | ❌（红线） |
| `git push --force`（任何分支） | — | ❌ 绝对禁止 |
| 合并到 `stable` / `main` | ❌ | ❌ |

---

## 工作流

1. AI 在 `feature/xxx` 或 `fix/xxx` 上开发，commit 到本地
2. **每次 commit 后自动** push 到 `origin/test`（无需用户确认）
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
- 一次提交只做一件事（变更 ≤ 3 文件，超出需在 body 中说明逻辑关联）
- 提交前通过 `npm run lint` / `npm run type-check`

---

## 环境文件管理

```
.env           → 受保护，禁止提交
.env.example   → 必须提交，包含占位符
.env.prod      → 仅在生产服务器维护
```

---

## 推送前检查清单

- [ ] lint / type-check / test 通过
- [ ] 无硬编码敏感信息（API key、密码、token）
- [ ] 无 `console.log` / `debugger` 残留
- [ ] commit message 清晰准确
- [ ] 确认目标分支：仅 push 到 `test`
