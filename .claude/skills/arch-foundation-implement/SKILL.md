---
name: arch-foundation-implement
description: 功能块开发阶段4——基建执行。当用户已有架构蓝图和全部设计文档、要生成初始代码、或说"开始写代码"、"基建执行"、"生成代码"时触发。根据蓝图生成完整初始代码，并通过质量门检查。
---

# 基建执行 — Stage 4

全栈开发者。根据阶段 2~3 的全部设计文档生成完整初始代码，执行质量门检查后提交。

## 输入

- 阶段 2：全部 5 份文档（master-spec / prd / ui-ux / tech-overview / api-spec）
- 阶段 3：架构蓝图（architecture-blueprint.md）

## 设计技能调用

生成前端代码前，按端调用对应设计 skill：

| 端 | 调用的 Skill | 用途 |
|----|------------|------|
| **Webapp** | `frontend-design` | 视觉方向、配色、字体、布局、签名元素 |
| **小程序** | `frontend-design` | 适配 rpx + OA 设计令牌 |

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
2. 实现 api-spec.md 中定义的全部端点
3. 数据模型与 tech-overview.md 中的实体定义完全匹配
4. 前端 UI 实现 ui-ux.md 中描述的关键页面和组件

#### 编码规范

| 规范 | 后端 | 小程序 | Web |
|------|------|--------|-----|
| 缩进 | 2 空格 | 2 空格 | 2 空格 |
| 分号 | 必须 | 禁止 | 禁止 |
| 引号 | 单引号 | 单引号 | 单引号 |
| API 格式 | `{ code, message, data }` | `services/modules/` | `src/api/` + TS |
| 响应格式 | HTTP 200 + code | request.js 拦截 | request.ts 拦截 |
| SQL | 参数化查询 | — | — |
| 单位 | — | rpx | rem/px |
| 语法 | — | Composition API | `<script setup lang="ts">` |

#### 代码输出格式

每个文件独立输出，标注路径：

```
### backend/src/features/<module>/routes/<module>.routes.js
```js
// 完整文件
```

### miniapp/src/pages/<module>/index.vue
```vue
<!-- 完整文件 -->
```
```

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

## 质量门（代码生成后强制执行）

所有代码生成完毕后，逐项检查，不通过则修正后重新检查：

### 高优先级（不通过禁止提交）

| # | 检查项 | 方法 |
|---|--------|------|
| 1 | `uni.navigateTo/switchTab/reLaunch` 均有 `.fail()` | grep 新增代码 |
| 2 | 无静默 `catch {}` 空块 | grep `catch\s*\{\s*\}` |
| 3 | `defineProps` 返回值已赋值 `const props = defineProps(...)` | 检查 `<script setup>` |
| 4 | 无硬编码 Mock 数据 | 搜索假中文姓名/部门列表 |
| 5 | 无 `console.log` / `debugger` 残留 | grep 全部新增文件 |

### 中优先级（警告，建议修复）

| # | 检查项 | 方法 |
|---|--------|------|
| 6 | 浮层 z-index 分层（1000/1100/1200/1300） | grep `z-index` |
| 7 | 登录跳转统一入口 | grep `reLaunch.*login` |
| 8 | URL 参数用 `URLSearchParams` 而非字符串拼接 | grep 字符串 URL |
| 9 | miniapp 用 async/await 非 `.then().catch()` | grep `.then(` |

### 质量报告模板

```
🔍 质量门检查 (X/9 通过)

🔴 高优先级：
  ✅ 1. 导航 fail 回调
  ✅ 2. 无静默 catch
  ✅ 3. defineProps 规范
  ✅ 4. 无 Mock 数据
  ✅ 5. 无 console 残留

🟡 中优先级：
  ✅ 6. z-index 分层
  ✅ 7. 登录跳转统一
  ✅ 8. URLSearchParams
  ✅ 9. async/await 规范

✅ 全部通过，允许提交
```

## 完成

代码生成 + 质量门通过后：
1. `git add` + `git commit` 保存所有新增文件
2. 生成 `大纲/PRD/<功能名>/README.md`（模块概述 + 文档索引 + Agent 分工）
3. 告知主 skill 阶段 4 已完成
