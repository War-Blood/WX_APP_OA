---
name: arch-foundation-blueprint
description: 功能块开发阶段3——架构蓝图。当用户已有PRD文档套件、要生成代码架构设计、或说"架构蓝图"、"设计代码骨架"、"生成架构方案"时触发。产出 architecture-blueprint.md，只设计骨架不写代码。
---

# 架构蓝图 — Stage 3

纯粹的技术设计者，只设计骨架不写代码。输入阶段 2 的 tech-overview.md + api-spec.md，输出 `architecture-blueprint.md`。

## 铁律

- **禁止**生成任何实际代码（JS/TS/Vue/Python 等）
- 每个文件必须映射到具体 Agent
- 假设标注「【假设】」，信息不足标注「【待确认】」

## 前置

加载以下 Wiki：
- `.AI/Wiki/小程序前端/通用组件.md` — 组件清单
- `.AI/Wiki/Web 管理后台/后端 API 服务/后端 API 服务.md` — 后端规范

## 必须涵盖的 10 个章节

写入 `大纲/PRD/<功能名>/architecture-blueprint.md`：

### 1. 项目目录结构
```
backend/src/features/<module>/  → routes/ controllers/ services/
miniapp/src/pages/<module>/     → 页面目录
webapp/src/views/<module>/      → 页面目录
```

### 2. 前端 — 组件树
- Miniapp 页面组件树（page → sections → sub-components）
- Webapp 页面组件树（views → el-* 组件）
- 标注复用现有组件（11 组件清单）

### 3. 前端 — 路由设计
- **Miniapp pages.json**：新增条目，含 path + navigationBarTitleText + navigationStyle
- **Webapp router/index.ts**：路径 + 组件懒加载 + meta（title/icon/roles）

### 4. 前端 — 状态管理
- Pinia store（useXxxStore），state/getters/actions
- 数据流：API → store → 组件

### 5. 前端 — API 服务层
- **Miniapp**：`services/modules/<module>.js` 函数签名
- **Webapp**：`api/<module>.ts` 接口 TypeScript 定义

### 6. 后端 — 模块划分
- Route 文件及分组（全部 POST）
- Controller 方法签名
- Service 函数签名及依赖关系
- 遵循 routes → controllers → services → data 分层

### 7. 后端 — 数据库模型映射
- 表 → Service 映射
- 实体关系 + 索引建议

### 8. 后端 — 中间件设计
- `authenticate`（JWT 验证）
- `requireRole('admin')`（角色控制）
- `errorHandler`（统一错误 → HTTP 200 JSON）

### 9. Agent 归属表
| 文件路径 | 归属 Agent | 类型 | 上游依赖 |
|----------|-----------|------|---------|

### 10. 关键依赖
- 新增 npm 包 / 现有复用模块 / 外部服务依赖

## 完成

输出 `architecture-blueprint.md` 后告知主 skill 阶段 3 已完成。
