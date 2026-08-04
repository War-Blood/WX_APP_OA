# Orchestration Guide — 功能块开发编排器总览

> 本文档是 `architectural-foundation` 编排器的完整参考。
> SKILL.md 只含路由与调度逻辑，详细规范在此文档中。

## 1. 全局流程

```
用户需求
    ↓
[architectural-foundation 编排器]
    ↓ 路由判断
    ├── 全新模块 → 4 阶段流程（下方）
    └── 已有模块增量 → agile-iteration（快捷迭代）
```

### 4 阶段流程

```
阶段 1           阶段 2            阶段 3           阶段 4
需求探针   ──→   主规生成器   ──→   架构蓝图   ──→   基建执行
(probe)          (spec)           (blueprint)     (implement)
访谈摸需求       10份维度文档      代码骨架设计     代码+质量门
```

| 阶段 | 子 Skill | 产出 |
|------|---------|------|
| 1 需求探针 | `arch-foundation-probe` | `结构化需求笔记.md` |
| 2 主规生成 | `arch-foundation-spec` | `00-index.md` ~ `09-milestones.md` 共 10 份 |
| 3 架构蓝图 | `arch-foundation-blueprint` | `architecture-blueprint.md` |
| 4 基建执行 | `arch-foundation-implement` | 后端/小程序/Webapp 代码 + README.md |

## 2. 阶段切换规则

- **首次进入**：自动从阶段 1 开始
- **已有笔记无文档**：从阶段 2 开始
- **已有文档无蓝图**：从阶段 3 开始
- **蓝图已有**：从阶段 4 开始
- **用户指定阶段**：如"直接生成架构蓝图" → 调用对应子 skill

## 3. 阶段完成校验标准

| 阶段 | 校验项 | 通过条件 |
|------|--------|---------|
| 1 probe | `结构化需求笔记.md` 存在 | 7 个维度章节齐全，「待补充」占比 < 50% |
| 2 spec | 10 份文档存在 | `00-index` 含文档导航 + `01-requirements` 含功能清单 + `03-api-design` 含端点清单 |
| 3 blueprint | `architecture-blueprint.md` 存在 | 10 个章节齐全 + Agent 归属表非空 |
| 4 implement | 代码文件 + README.md | 质量门 9 项全通过 + git commit 完成 |

## 4. 设计 Skill 调用矩阵

子 skill 不再各自定义调用规则，统一引用此矩阵。

| 阶段 | 步骤 | 调用 | 用途 |
|------|------|------|------|
| 2 spec | step 3 (05-ui-ux) | `frontend-design` | 视觉方向：配色/字体/布局/签名元素 |
| 2 spec | step 3 (05-ui-ux) | `ui-ux-pro-max` | 风格选择：50+风格/161配色/57字体（仅 Webapp） |
| 4 implement | Webapp 代码前 | `frontend-design` + `ui-ux-pro-max` | 组件模式 + 视觉落地 |
| 4 implement | 小程序代码前 | `frontend-design` | 适配 OA 设计令牌 + rpx |
| agile | UI 变更时 | `frontend-design` | 增量视觉优化 |

## 5. 文档结构（11 份维度文档）

全部统一保存在 `大纲/PRD/<功能名>/` 目录下。

```
大纲/PRD/<功能名>/
├── 结构化需求笔记.md          ← probe 产出
├── 00-index.md                (主索引 · 唯一真相源)
├── 01-requirements.md         (需求：愿景 · 角色 · 场景 · 功能 P0/P1/P2)
├── 02-data-design.md          (数据：ER 图 · DDL · 索引 · 迁移脚本)
├── 03-api-design.md           (API：通用约定 · 错误码 · 端点清单 · 请求/响应示例)
├── 04-business-logic.md       (业务：核心规则 · 状态机 · 伪代码 · 映射表)
├── 05-ui-ux.md                (UI/UX：设计令牌 · 线框图 · 组件复用 · 交互流程)
├── 06-tech-architecture.md    (技术：系统架构图 · 模块划分 · 服务层 · 中间件)
├── 07-agent-matrix.md         (归属：Agent 归属表 · 目录结构 · 文件清单 · 依赖)
├── 08-acceptance.md           (验收：分类 checklist · 质量门 9 项 · 测试要点)
├── 09-milestones.md           (里程碑：实施阶段 · 依赖关系 · Agent 分工 · 工期)
├── architecture-blueprint.md  (蓝图：代码骨架汇总 · 蓝图阶段产出)
└── README.md                  (模块概述 + 文档索引 · implement 收尾产出)
```

### 每份文档统一头部

```markdown
# <文档名>
> 维度：<一句话描述>
> 读者：<谁需要读这份文档>
> 上游依赖：<依赖哪些前置文档>
> 下游影响：<哪些后续文档依赖本文档>
```

### 可扩展性

- 编号留间隔（01/02/03...），新增维度时插入编号不打乱顺序
- 每份文档聚焦单一信息维度，改一处不影响其他
- `00-index.md` 是唯一真相源，只放索引和导航

## 6. 文档先后顺序

### 生成顺序

```
结构化需求笔记.md              ← probe
        ↓
00-index.md + 01-requirements.md  ← spec step 1（产品维度）
        ↓
02-data-design.md               ← spec step 2（后端·数据）
03-api-design.md                ← spec step 2（后端·接口）
04-business-logic.md            ← spec step 2（后端·业务）
        ↓
05-ui-ux.md                     ← spec step 3（设计 · 调用 frontend-design）
        ↓
06-tech-architecture.md         ← spec step 4（技术·架构）
07-agent-matrix.md              ← spec step 4（技术·归属）
        ↓
08-acceptance.md                ← spec step 5（质量·验收）
09-milestones.md                ← spec step 5（质量·里程碑）
        ↓
architecture-blueprint.md       ← blueprint（汇总 01-09 → 代码骨架）
        ↓
代码文件                         ← implement
        ↓
README.md                       ← implement 收尾
```

### 阅读顺序（Agent 接手时）

```
 1. 00-index.md              → 30秒掌握全貌
 2. 01-requirements.md       → 需求全貌
 3. 03-api-design.md         → 接口契约
 4. 02-data-design.md        → 数据模型
 5. 04-business-logic.md     → 业务规则
 6. 05-ui-ux.md              → UI 规格
 7. 06-tech-architecture.md  → 技术架构
 8. 07-agent-matrix.md       → Agent 归属
 9. architecture-blueprint.md → 代码骨架
10. 08-acceptance.md         → 验收标准（按需）
11. 09-milestones.md         → 里程碑（按需）
```

### 依赖关系

- `00-index` 是所有后续文档的上游
- `02-data` / `03-api` / `04-business` 互相独立，可并行生成
- `05-ui-ux` 依赖 `01-requirements`（需要知道有哪些页面）
- `06-tech` / `07-agent` 依赖 `02-data` + `03-api`
- `architecture-blueprint` 汇总全部 01-09
- 代码依赖 `blueprint` + 全部 10 份文档

## 7. 交互体验规范

### 7.1 编排器交互

**阶段进入卡片** — 每次进入新阶段输出：

```
┌──────────────────────────────────────┐
│  阶段 N：<阶段名>                      │
│  目标：<一句话目标>                    │
│  预期产出：<文件列表>                  │
│  预计步骤：<N 步>                      │
│  设计 skill：<调用时机说明>            │
│  前置条件：<上一阶段完成确认>          │
└──────────────────────────────────────┘
```

**阶段完成确认** — 每阶段完成后输出：

```
✅ 阶段 N 完成
  产出文件（X/X）：
    ✅ <文件名> (<大小>) — <一句话描述>
    ...
  校验：<校验结果>
  下一阶段：<阶段名>（预计 N 步）
```

**中断恢复** — 用户回来时自动检测已有文档：

```
📋 进度检测
  阶段 1：✅ 完成
  阶段 2：⏳ 进行中（10 份文档中已有 6 份）
    ✅ 00-05 已完成
    ❌ 06-09 缺失
  建议：续接阶段 2 步骤 4
```

### 7.2 probe 交互

**访谈引导** — 开始时输出：

```
🔍 需求探针启动
  将覆盖 7 个维度，预计 5-8 轮对话
  模式：混合访谈（先提取已知，再追问缺失）
  当前维度：1/7 产品愿景与目标
```

**进度可视化** — 每完成一个维度：

```
进度：[████░░░] 4/7 维度完成
  ✅ 1. 产品愿景与目标
  ✅ 2. 用户与场景
  ✅ 3. 功能清单
  ✅ 4. 业务规则与数据实体
  ⬜ 5. UI/UX 风格
  ⬜ 6. 技术偏好与约束
  ⬜ 7. API 需求
  → 下一问：维度 5 — 整体风格关键词？
```

**缺失检测** — 每轮结束自动扫描未覆盖维度，优先追问缺失项。

### 7.3 implement 交互

**执行前确认** — 列出即将生成的全部文件：

```
📋 即将生成 N 个文件：
  后端（X）：...
  小程序（X）：...
  Webapp（X）：...
确认后开始生成？
```

**逐文件进度** — 每生成一个文件：

```
[1/12] backend/.../routes/xxx.routes.js ✅ (1.2KB)
[2/12] backend/.../controllers/xxx.controller.js ✅ (2.8KB)
```

**质量门实时报告** — 逐项检查即时输出，不等到最后批量报告。

## 8. 关键约束

- 子 skill 各自独立，不得跨阶段修改其他 skill 的产出
- 每个阶段产出必须写入文件，不能仅输出到对话
- 阶段 4 代码生成后执行质量门全部 9 项检查
- 生成后立即 `git add` + `git commit`
- 所有文档统一保存在 `大纲/PRD/<功能名>/` 目录下
