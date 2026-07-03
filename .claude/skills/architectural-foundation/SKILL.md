---
name: architectural-foundation
description: 当用户要从零开始新建、开发、规划、搭建功能模块、业务子系统或完整产品需求时使用。触发场景："功能块开发"、"新建模块"、"开发新功能"、"架构基础流程"、"从0开始做"、"帮我规划XX模块"、"我要新建XX系统"、"做一个XX功能"、或描述了需要完整PRD文档的新业务需求。通过四阶段流程（需求探针→主规生成→架构蓝图→基建执行）产出完整PRD文档套件到 大纲/PRD/<功能名>/ 下。如果是对已有模块的小改动或增量开发，触发 agile-iteration 而非此技能。
---

# Architectural Foundation — 功能块开发编排器

你是 OA 项目的功能块开发总编排器。接收用户需求后，按四阶段流程分派到子 skill：

```
阶段 1           阶段 2            阶段 3           阶段 4
需求探针   ──→   主规生成器   ──→   架构蓝图   ──→   基建执行
(访谈摸需求)     (5份PRD文档)      (代码骨架)       (代码+质量门)
```

## 流程控制

1. **判断当前阶段**：检查 `大纲/PRD/<功能名>/` 下已有文档，确定进度
2. **按序推进**：阶段 N 产出不完整时禁止跳到 N+1
3. **调用子 skill**：通过 Skill 工具按阶段名调用对应子 skill

| 阶段 | 子 Skill | 产出 |
|------|---------|------|
| 1 需求探针 | `arch-foundation-probe` | `结构化需求笔记.md` |
| 2 主规生成 | `arch-foundation-spec` | `master-spec.md` `prd.md` `ui-ux.md` `tech-overview.md` `api-spec.md` |
| 3 架构蓝图 | `arch-foundation-blueprint` | `architecture-blueprint.md` |
| 4 基建执行 | `arch-foundation-implement` | 后端/小程序/Webapp 代码文件 |

## 阶段切换规则

- **首次进入**：自动从阶段 1 开始
- **已有笔记无文档**：从阶段 2 开始
- **已有文档无蓝图**：从阶段 3 开始
- **蓝图已有**：从阶段 4 开始
- **用户指定阶段**：如"直接生成架构蓝图"→ 调用对应子 skill

## 设计 Skill 调用

| 阶段 | 时机 | 调用的 Skill | 作用 |
|------|------|------------|------|
| 阶段 2 步骤 3 | 生成 ui-ux.md 前 | `ui-ux-pro-max` | 选风格/配色/字体/UX 规范（50+风格/161配色/57字体） |
| 阶段 2 步骤 3 | 设计细化 | `frontend-design` | 反模板化、视觉差异化、签名元素 |
| 阶段 4 Webapp | 生成 Web 端代码前 | `frontend-design` + `ui-ux-pro-max` | 组件模式 + 视觉落地 |
| 阶段 4 小程序 | 生成小程序代码前 | `frontend-design` | 适配 OA 设计令牌 + rpx |

## 关键约束

- 子 skill 各自独立，不得跨阶段修改其他 skill 的产出
- 每个阶段产出必须写入文件，不能仅输出到对话
- 阶段 4 代码生成后执行质量门全部 9 项检查
- 生成后立即 `git add` + `git commit`
