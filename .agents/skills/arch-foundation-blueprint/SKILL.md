---
name: arch-foundation-blueprint
description: 功能块开发阶段3——架构蓝图。当用户已有PRD文档套件、要生成代码架构设计、或说"架构蓝图"、"设计代码骨架"、"生成架构方案"时触发。产出 architecture-blueprint.md，只设计骨架不写代码。
---

# 架构蓝图 — Stage 3

纯粹的技术设计者，只设计骨架不写代码。输入阶段 2 的 10 份维度文档，输出 `architecture-blueprint.md`。

## 铁律

- **禁止**生成任何实际代码（JS/TS/Vue/Python 等）
- 每个文件必须映射到具体 Agent
- 假设标注「【假设】」，信息不足标注「【待确认】」

## 前置

加载以下 Wiki：

- `.AI/Wiki/小程序前端/通用组件.md` — 组件清单
- `.AI/Wiki/Web 管理后台/后端 API 服务/后端 API 服务.md` — 后端规范

## 输入

读取阶段 2 产出的 10 份维度文档（位于 `大纲/PRD/<功能名>/`）：

| 文档 | 用途 |
|------|------|
| `00-index.md` | 主索引，掌握全貌 |
| `01-requirements.md` | 需求：愿景、角色、功能 P0/P1/P2 |
| `02-data-design.md` | 数据：ER 图、DDL、索引 |
| `03-api-design.md` | API：端点清单、通用约定、错误码 |
| `04-business-logic.md` | 业务：核心规则、状态机 |
| `05-ui-ux.md` | UI/UX：设计令牌、线框图、组件复用 |
| `06-tech-architecture.md` | 技术：系统架构、模块划分 |
| `07-agent-matrix.md` | 归属：Agent 归属表、文件清单 |
| `08-acceptance.md` | 验收：分类 checklist |
| `09-milestones.md` | 里程碑：实施阶段、Agent 分工 |

## 10 章节概要

> 每个章节的详细模板、目录结构示例、表格格式见 `references/blueprint-chapters.md`

1. **项目目录结构** — backend/src/features/ + miniapp/src/pages/ + webapp/src/views/ 三端目录骨架
2. **前端组件树** — Miniapp 页面组件树 + Webapp 组件树 + 复用标注
3. **前端路由设计** — Miniapp pages.json + Webapp router/index.ts + meta 字段
4. **前端状态管理** — Pinia store 定义 + 数据流（API → store → 组件）
5. **前端 API 服务层** — Miniapp services/modules/ + Webapp api/ + TS 定义
6. **后端模块划分** — Route + Controller + Service + 分层（routes → controllers → services → data）
7. **后端数据库模型映射** — 表 → Service 映射 + 实体关系 + 索引建议
8. **后端中间件设计** — authenticate（JWT）+ requireRole（角色）+ errorHandler（统一错误）
9. **Agent 归属表** — 文件路径 + 归属 Agent + 类型 + 上游依赖
10. **关键依赖** — 新增 npm 包 + 复用模块 + 外部服务

## 完成

1. 将 10 个章节写入 `大纲/PRD/<功能名>/architecture-blueprint.md`
2. 告知主 skill `architectural-foundation` 阶段 3 已完成

## references

- `references/blueprint-chapters.md` — 10 章节详细模板、目录结构示例、组件树格式、Agent 归属表格式
