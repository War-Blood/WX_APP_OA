---
name: arch-foundation-implement
description: 功能块开发阶段4——基建执行。当用户已有架构蓝图和全部设计文档、要生成初始代码、或说"开始写代码"、"基建执行"、"生成代码"时触发。根据蓝图生成完整初始代码，并通过质量门检查。
---

# 基建执行 — Stage 4

全栈开发者。根据阶段 2~3 的全部设计文档生成完整初始代码，执行质量门检查后提交。

## 输入

- 阶段 2：10 份维度文档（`00-index.md` ~ `09-milestones.md`）
- 阶段 3：架构蓝图（`architecture-blueprint.md`）

全部位于 `大纲/PRD/<功能名>/` 目录下。

## 设计技能调用

生成前端代码前，按端调用对应设计 skill。调用矩阵详见 `architectural-foundation/references/orchestration-guide.md` 第 4 节：

| 端 | 调用 | 用途 |
|----|------|------|
| **Webapp** | `frontend-design` + `ui-ux-pro-max` | 组件模式 + 视觉落地（50+风格/161配色/57字体） |
| **小程序** | `frontend-design` | 适配 OA 设计令牌 + rpx |

> `frontend-design` 提供反模板化设计指导——避免千篇一律的 AI 风格，产出有辨识度的界面。

## 前置

加载全部相关 Wiki：

- `.AI/Wiki/开发规范/设计规范.md`
- `.AI/Wiki/小程序前端/通用组件.md`
- `.AI/Wiki/Web 管理后台/后端 API 服务/后端 API 服务.md`
- `.AI/Wiki/开发规范/错误处理规范.md`

## 执行模式

开始前询问用户：

> 请选择执行模式：
> **A** — 直接生成完整初始代码（默认）
> **B** — 生成任务分解交由 orchestrator 分发到 12 Agent

### 模式 A：直接生成

1. 严格遵循架构蓝图中的目录结构和模块划分
2. 实现 `03-api-design.md` 中定义的全部端点
3. 数据模型与 `02-data-design.md` 中的实体定义完全匹配
4. 前端 UI 实现 `05-ui-ux.md` 中描述的关键页面和组件

编码规范详见 `references/coding-standards.md`，核心要点：

- 三端规范：后端 2 空格+分号 / 小程序 & Web 2 空格无分号 + 单引号
- 代码输出：每个文件独立输出，标注完整路径 + 代码块
- 错误处理：全部使用 `try/catch`，禁止静默 catch
- 导航安全：所有 `uni.navigateTo/switchTab/reLaunch` 必须含 `fail` 回调
- 组件复用：小程序 13 个通用组件优先复用，禁止重复造轮子

### 模式 B：orchestrator 分发

生成任务分解表，由 project-orchestrator 分发到 12 Agent：

| 序号 | Agent | 任务 | 文件清单 | 依赖 | 验收标准 |
|------|-------|------|---------|------|---------|
| 1 | common-agent | 错误码+基础设施 | ... | — | ... |
| 2 | <业务-agent> | 实现 API | ... | 1 | ... |
| 3 | miniapp-common-agent | API 封装层 | ... | 1 | ... |
| 4 | miniapp-<core/admin>-agent | 实现页面 | ... | 2,3 | ... |
| 5 | webapp-common-agent | API 封装层 | ... | 1 | ... |
| 6 | webapp-<core/admin>-agent | 实现页面 | ... | 2,5 | ... |

## 质量门概要

代码生成完毕后强制执行 9 项检查，详细检查方法、修复方法、代码示例见 `references/quality-gate.md`。

### 🔴 高优先级（不通过禁止提交）

1. **导航 fail 回调** — `uni.navigateTo/switchTab/reLaunch/reLaunch` 均有 `.fail()`
2. **无静默 catch** — 禁止空 `catch {}` 块，至少含错误日志 + 用户提示
3. **defineProps 规范** — `<script setup>` 中 `const props = defineProps(...)`
4. **无 Mock 数据** — 禁止硬编码中文姓名/部门列表等假数据
5. **无 console 残留** — 禁止 `console.log` / `console.debug` / `debugger`

### 🟡 中优先级（警告，建议修复）

6. **z-index 分层** — 浮层 1000 / 遮罩 1100 / 弹窗 1200 / 顶层 1300
7. **登录跳转统一** — 统一走 `utils/login.js` 的 `goLogin()` 入口
8. **URLSearchParams** — URL 参数用 `URLSearchParams` 或 `encodeURIComponent`
9. **async/await 规范** — 小程序用 `async/await`，禁止 `.then().catch()`

## 交互体验

### 执行前确认

列出即将生成的全部文件，用户确认后开始：

```
📋 即将生成 12 个文件：
  后端（4）：
    · backend/src/features/<module>/routes/<module>.routes.js
    · backend/src/features/<module>/controllers/<module>.controller.js
    · backend/src/features/<module>/services/<module>.service.js
    · backend/src/middleware/<module>.middleware.js
  小程序（4）：pages + services + store + components
  Webapp（4）：views + api + store + components
确认后开始生成？
```

### 逐文件进度

每生成一个文件输出进度：

```
[1/12] backend/.../routes/okr.routes.js ✅ (1.2KB)
[2/12] backend/.../controllers/okr.controller.js ✅ (2.8KB)
[3/12] backend/.../services/okr.service.js ✅ (3.1KB)
...
```

### 质量门实时报告

逐项检查即时输出，不等到最后批量报告：

```
🔍 质量门检查（进行中）
  🔴 高优先级：
    ✅ 1. 导航 fail 回调 — 通过
    ✅ 2. 无静默 catch — 通过
    ⚠️ 3. defineProps 规范 — 已修复（第45行）
    ✅ 4. 无 Mock 数据 — 通过
    ✅ 5. 无 console 残留 — 通过
  🟡 中优先级：
    ✅ 6. z-index 分层 — 通过
    ⚠️ 7. 登录跳转统一 — 已修复（第120行）
    ...
✅ 9/9 通过，允许提交
```

## 完成

代码生成 + 质量门通过后：

1. `git add` + `git commit` 保存所有新增文件
2. 生成 `大纲/PRD/<功能名>/README.md`（模块概述 + 文档索引 + Agent 分工）
3. 告知主 skill 阶段 4 已完成
