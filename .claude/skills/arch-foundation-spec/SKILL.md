---
name: arch-foundation-spec
description: 功能块开发阶段2——主规生成器。当用户已有结构化需求笔记、要生成PRD文档套件、或说"生成PRD"、"写产品文档"、"输出规格文档"、"主规生成"时触发。将阶段1的笔记转化为10份维度文档。
---

# 主规生成器 — Stage 2

将阶段 1 的结构化需求笔记转化为 10 份维度文档，输出到 `大纲/PRD/<功能名>/`。

## 前置条件

- `大纲/PRD/<功能名>/结构化需求笔记.md` 已存在（阶段 1 probe 产出）
- 笔记中 7 个维度章节齐全，「待补充」占比 < 50%

## 参考模板

10 份维度文档的详细模板位于 `references/`：

| 模板文件 | 用途 |
|---------|------|
| `references/00-index-template.md` | 主索引模板 |
| `references/01-requirements-template.md` | 需求模板 |
| `references/02-data-design-template.md` | 数据设计模板 |
| `references/03-api-design-template.md` | API 设计模板 |
| `references/04-business-logic-template.md` | 业务逻辑模板 |
| `references/05-ui-ux-template.md` | UI/UX 模板 |
| `references/06-tech-architecture-template.md` | 技术架构模板 |
| `references/07-agent-matrix-template.md` | Agent 归属模板 |
| `references/08-acceptance-template.md` | 验收模板 |
| `references/09-milestones-template.md` | 里程碑模板 |

生成每份文档前，读取对应模板按格式填充。

## 5 步流程

### step 1：产品维度

产出：
- `大纲/PRD/<功能名>/00-index.md` — 主索引（唯一真相源：产品一句话概述 + 文档导航表 + 产品定位表）
- `大纲/PRD/<功能名>/01-requirements.md` — 需求（产品愿景 + 目标用户与场景 + 功能清单 P0/P1/P2 + 复用机会）

### step 2：后端维度

产出（三份互相独立，可并行生成）：
- `大纲/PRD/<功能名>/02-data-design.md` — 数据设计（ER 图 + 完整建表 DDL + 索引设计 + 迁移脚本）
- `大纲/PRD/<功能名>/03-api-design.md` — API 设计（通用约定 + 错误码表 + 端点清单 + 请求/响应示例）
- `大纲/PRD/<功能名>/04-business-logic.md` — 业务逻辑（核心规则 + 状态机 + 伪代码 + 映射表）

### step 3：设计维度

**生成前调用 `frontend-design` skill** 确定视觉方向（配色/字体/布局/签名元素），再基于方向编写设计文档。

产出：
- `大纲/PRD/<功能名>/05-ui-ux.md` — UI/UX（设计令牌表 + 小程序端线框图 + Webapp 端组件布局 + 组件复用表）

### step 4：技术维度

产出：
- `大纲/PRD/<功能名>/06-tech-architecture.md` — 技术架构（系统架构图 + 模块划分 + 服务层设计 + 前端 API 封装 + 中间件设计）
- `大纲/PRD/<功能名>/07-agent-matrix.md` — Agent 归属（归属表 + 目录结构树 + 文件清单 + 依赖关系图）

### step 5：质量维度

产出：
- `大纲/PRD/<功能名>/08-acceptance.md` — 验收（分类 checklist + 质量门 9 项 + 测试要点）
- `大纲/PRD/<功能名>/09-milestones.md` — 里程碑（实施阶段 + 依赖关系 + Agent 分工表 + 风险项）

## 完成

全部 10 份文档生成后输出摘要：

```
✅ 阶段 2 完成
  产出文件（10/10）：
    ✅ 00-index.md — 主索引
    ✅ 01-requirements.md — 需求
    ✅ 02-data-design.md — 数据
    ✅ 03-api-design.md — API
    ✅ 04-business-logic.md — 业务
    ✅ 05-ui-ux.md — UI/UX
    ✅ 06-tech-architecture.md — 技术
    ✅ 07-agent-matrix.md — 归属
    ✅ 08-acceptance.md — 验收
    ✅ 09-milestones.md — 里程碑
  📁 全部写入 大纲/PRD/<功能名>/
```

告知主 skill 阶段 2 已完成。
