# Skill 体系设计审查与完善方案（v2）

> 日期：2026-07-10
> 范围：`.claude/skills/` 下与「功能块开发编排器」相关的全部 skill
> v2 变更：文档结构从 5 份大文档重设计为 11 份维度文档；新增交互体验增强；路径统一确认；内容精细化

## 一、现状清单

| Skill | 角色 | SKILL.md 行数 | references/ | 状态 |
|-------|------|--------------|-------------|------|
| `architectural-foundation` | 编排器（主） | 52 | 无 | 可用，需增强 |
| `arch-foundation-probe` | 阶段1 需求探针 | 91 | 无 | 可用，模板可外拆 |
| `arch-foundation-spec` | 阶段2 主规生成 | 111 | 无 | 偏长，5份模板应拆 |
| `arch-foundation-blueprint` | 阶段3 架构蓝图 | 75 | 无 | 可用，10章节模板可外拆 |
| `arch-foundation-implement` | 阶段4 基建执行 | 140 | 无 | 偏长，质量门+规范应拆 |
| `agile-iteration` | 快捷迭代（互补） | 263 | 无 | 可用，路径需修正 |

## 二、问题诊断

### P0 — 文档结构不可扩展（最高优先级，v2 新增）

当前 spec 阶段产出 5 份大文档，`prd.md` 单文件包含数据库设计 + 接口设计 + 业务逻辑 + 验收标准 + 代码归属 + 实施里程碑。项目规模扩大后单文件会超过 500 行，难以维护、难以并行编辑、难以按维度检索。

**根因**：按"文档类型"拆分（PRD/UI/技术/API），而非按"信息维度"拆分。一个 `prd.md` 混装了 6 个不相关维度的内容。

**目标**：每份文档聚焦单一信息维度，编号化可扩展，改一处不影响其他。

### P1 — 路径不统一（必须修复）

所有文档统一保存在 `大纲/PRD/` 目录下，保持项目文件结构的一致性和可追溯性。

| Skill | 当前路径 | 修正为 |
|-------|---------|--------|
| architectural-foundation 系列 | `大纲/PRD/<功能名>/` | ✅ 保持 |
| agile-iteration | `需求/PRD/<功能名>/` | → `大纲/PRD/<功能名>/` |
| agile-iteration 加载上下文 | `需求/PRD/<功能名>/master-spec.md` | → `大纲/PRD/<功能名>/00-index.md` |
| task-list | `需求/任务进度/` | → `大纲/任务进度/` |

**影响**：agile-iteration 找不到 architectural-foundation 产出的文档，两个 skill 无法互操作。

### P2 — 交互体验不完善（v2 新增）

| 场景 | 当前问题 | 目标 |
|------|---------|------|
| probe 访谈 | 无进度反馈，用户不知道还剩几个维度 | 每轮标注进度，缺失维度优先追问 |
| 编排器阶段切换 | 只输出"阶段 N 已完成"，无产出清单 | 输出文件列表 + 校验结果 + 下一阶段预告 |
| implement 代码生成 | 一次性输出全部代码，无逐文件进度 | 逐文件输出进度，质量门逐项实时报告 |
| 中断恢复 | 用户回来后需手动说明进度 | 自动检测已有文档，输出进度摘要 + 续接建议 |

### P3 — references 缺失（progressive disclosure 违规）

Skill Creator 最佳实践：SKILL.md body < 500 行，详细模板拆到 `references/`。

当前 5 个子 skill 全部把模板塞在 SKILL.md body 里，每次触发都加载全部内容，浪费 context。

### P4 — 阶段完成校验缺失

编排器当前只检查文件名是否存在，缺少内容完整性校验（如：文档是否包含全部必需章节）。

### P5 — 设计 skill 调用重复定义

| 位置 | 调用描述 |
|------|---------|
| architectural-foundation L41-44 | 阶段2/4 调用 ui-ux-pro-max + frontend-design |
| arch-foundation-spec L67 | 步骤3 生成前调用 frontend-design |
| arch-foundation-implement L19-24 | 生成前端代码前调用 frontend-design |
| agile-iteration L52-58 | UI 变更时调用 frontend-design |

四处描述不一致，应集中到编排器的 `references/orchestration-guide.md` 统一管理。

## 三、完善方案

### 3.1 文档结构重设计（核心变更）

从 5 份大文档 → 11 份维度文档（编号化，可扩展）：

```
大纲/PRD/<功能名>/
├── 00-index.md                (主索引 · 唯一真相源 · 产品一句话概述 + 文档导航)
├── 01-requirements.md         (需求：产品愿景 · 目标用户与场景 · 功能清单 P0/P1/P2)
├── 02-data-design.md          (数据：ER 图 · 完整建表 DDL · 索引设计 · 迁移脚本)
├── 03-api-design.md           (API：通用约定 · 错误码表 · 端点清单 · 请求/响应示例)
├── 04-business-logic.md       (业务：核心规则 · 状态机 · 伪代码 · 映射表)
├── 05-ui-ux.md                (UI/UX：设计令牌表 · 线框图 · 组件复用表 · 交互流程)
├── 06-tech-architecture.md    (技术：系统架构图 · 模块划分 · 服务层设计 · 中间件)
├── 07-agent-matrix.md         (归属：Agent 归属表 · 目录结构 · 文件清单 · 依赖关系)
├── 08-acceptance.md           (验收：分类 checklist · 质量门 9 项 · 测试要点)
├── 09-milestones.md           (里程碑：实施阶段 · 依赖关系 · Agent 分工 · 预估工期)
└── architecture-blueprint.md  (蓝图：代码骨架汇总 · 蓝图阶段产出 · 不写代码只设计骨架)
```

**可扩展性设计**：
- 编号留间隔（01/02/03...），新增维度时插入编号不打乱顺序
- 每份文档顶部有「文档目标」章节，说明这份文档解决什么问题、读者是谁
- `00-index.md` 是唯一真相源，只放索引和导航，不放详细内容
- `architecture-blueprint.md` 汇总 01-09 的关键结论，是蓝图阶段的输入

**每份文档统一结构**：
```markdown
# <文档名>
> 维度：<一句话描述>
> 读者：<谁需要读这份文档>
> 上游依赖：<依赖哪些前置文档>
> 下游影响：<哪些后续文档依赖本文档>

## 文档目标
<这份文档解决什么问题>

## 正文
（维度专属内容）

## 变更记录
| 日期 | 变更内容 | 变更人 |
```

### 3.2 交互体验增强（v2 新增）

#### 编排器交互

**1. 阶段进入卡片** — 每次进入新阶段输出：
```
┌──────────────────────────────────────┐
│  阶段 2：主规生成                      │
│  目标：将需求笔记转化为 10 份维度文档    │
│  预期产出：00-09 共 10 份 .md 文件      │
│  预计步骤：5 步，每步 1-3 份文档        │
│  设计 skill：步骤 3 调用 frontend-design│
│  前置条件：阶段 1 结构化需求笔记.md 已完成│
└──────────────────────────────────────┘
```

**2. 阶段完成确认** — 每阶段完成后输出：
```
✅ 阶段 2 完成
  产出文件（10/10）：
    ✅ 00-index.md (2.3KB) — 主索引
    ✅ 01-requirements.md (4.1KB) — 需求
    ✅ 02-data-design.md (3.8KB) — 数据
    ✅ 03-api-design.md (5.2KB) — API
    ✅ 04-business-logic.md (2.9KB) — 业务
    ✅ 05-ui-ux.md (4.5KB) — UI/UX
    ✅ 06-tech-architecture.md (3.6KB) — 技术
    ✅ 07-agent-matrix.md (2.1KB) — 归属
    ✅ 08-acceptance.md (1.8KB) — 验收
    ✅ 09-milestones.md (2.0KB) — 里程碑
  校验：10/10 文档完整 ✅
  下一阶段：阶段 3 架构蓝图（预计 1 步）
```

**3. 中断恢复** — 用户回来时自动检测：
```
📋 进度检测
  阶段 1：✅ 完成（结构化需求笔记.md 存在，7/7 维度）
  阶段 2：⏳ 进行中（10 份文档中已有 6 份）
    ✅ 00-05 已完成
    ❌ 06-tech-architecture.md 缺失
    ❌ 07-agent-matrix.md 缺失
    ❌ 08-acceptance.md 缺失
    ❌ 09-milestones.md 缺失
  建议：续接阶段 2 步骤 4（06-tech + 07-agent）
```

#### probe 交互

**1. 访谈引导** — 开始时输出：
```
🔍 需求探针启动
  将覆盖 7 个维度，预计 5-8 轮对话
  模式：混合访谈（先提取已知，再追问缺失）
  当前维度：1/7 产品愿景与目标
```

**2. 进度可视化** — 每完成一个维度输出：
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

**3. 缺失检测** — 每轮结束自动扫描未覆盖维度，优先追问缺失项，不重复已确认维度。

#### implement 交互

**1. 执行前确认** — 列出即将生成的全部文件：
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

**2. 逐文件进度** — 每生成一个文件输出：
```
[1/12] backend/.../routes/okr.routes.js ✅ (1.2KB)
[2/12] backend/.../controllers/okr.controller.js ✅ (2.8KB)
[3/12] backend/.../services/okr.service.js ✅ (3.1KB)
...
```

**3. 质量门实时报告** — 逐项检查即时输出：
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

### 3.3 路径统一

全部文档统一保存在 `大纲/PRD/` 目录下：

| 路径 | 用途 |
|------|------|
| `大纲/PRD/<功能名>/` | 功能块 PRD 文档（00-09 + blueprint） |
| `大纲/PRD/<功能名>/结构化需求笔记.md` | probe 产出的需求笔记 |
| `大纲/任务进度/` | 任务清单（task-list skill 读取） |

修正项：
- `agile-iteration/SKILL.md`：`需求/PRD/` → `大纲/PRD/`（3 处）
- `agile-iteration/SKILL.md`：`master-spec.md` → `00-index.md`（引用变更）
- `task-list/SKILL.md`：`需求/任务进度/` → `大纲/任务进度/`

### 3.4 references 拆分

```
.claude/skills/
├── architectural-foundation/
│   ├── SKILL.md                          (精简：路由 + 阶段调度 + 校验规则)
│   └── references/
│       └── orchestration-guide.md        (全局流程图 + 阶段依赖 + 设计skill调用矩阵
│                                           + 完成校验标准 + 交互体验规范)
│
├── arch-foundation-probe/
│   ├── SKILL.md                          (精简：交互规则 + 7维度概要 + 进度可视化)
│   └── references/
│       └── interview-dimensions.md       (7维度详细模板 + 示例问题 + 输出格式)
│
├── arch-foundation-spec/
│   ├── SKILL.md                          (精简：5步流程概要 + 前置条件)
│   └── references/
│       ├── 00-index-template.md          (主索引模板)
│       ├── 01-requirements-template.md   (需求文档模板)
│       ├── 02-data-design-template.md    (数据设计模板)
│       ├── 03-api-design-template.md     (API 设计模板)
│       ├── 04-business-logic-template.md (业务逻辑模板)
│       ├── 05-ui-ux-template.md          (UI/UX 设计模板)
│       ├── 06-tech-architecture-template.md (技术架构模板)
│       ├── 07-agent-matrix-template.md   (Agent 归属模板)
│       ├── 08-acceptance-template.md     (验收标准模板)
│       └── 09-milestones-template.md     (里程碑模板)
│
├── arch-foundation-blueprint/
│   ├── SKILL.md                          (精简：铁律 + 10章节概要)
│   └── references/
│       └── blueprint-chapters.md        (10章节详细模板 + 示例)
│
├── arch-foundation-implement/
│   ├── SKILL.md                          (精简：执行模式 + 质量门概要 + 逐文件进度)
│   └── references/
│       ├── quality-gate.md              (9项检查详细说明 + 修复方法)
│       └── coding-standards.md          (三端编码规范表 + 代码输出格式)
│
├── agile-iteration/
│   └── SKILL.md                          (修正路径 + 引用 00-index.md)
│
└── (其他 skill 不变)
```

### 3.5 编排器增强

在 `references/orchestration-guide.md` 中新增：

#### 阶段完成校验标准

| 阶段 | 校验项 | 通过条件 |
|------|--------|---------|
| 1 probe | `结构化需求笔记.md` 存在 | 7 个维度章节齐全，「待补充」占比 < 50% |
| 2 spec | 10 份文档存在 | 00-index 含文档导航 + 01 含功能清单 + 03 含端点清单 |
| 3 blueprint | `architecture-blueprint.md` 存在 | 10 个章节齐全 + Agent 归属表非空 |
| 4 implement | 代码文件 + README.md | 质量门 9 项全通过 + git commit 完成 |

#### 设计 skill 调用矩阵（统一）

| 阶段 | 步骤 | 调用 | 用途 |
|------|------|------|------|
| 2 spec | step 3 (05-ui-ux) | `frontend-design` | 视觉方向：配色/字体/布局/签名元素 |
| 2 spec | step 3 (05-ui-ux) | `ui-ux-pro-max` | 风格选择：50+风格/161配色/57字体（仅 Webapp） |
| 4 implement | Webapp 代码前 | `frontend-design` + `ui-ux-pro-max` | 组件模式 + 视觉落地 |
| 4 implement | 小程序代码前 | `frontend-design` | 适配 OA 设计令牌 + rpx |
| agile | UI 变更时 | `frontend-design` | 增量视觉优化 |

> 子 skill 不再各自定义调用规则，统一引用此矩阵。

## 四、文档先后顺序

### 生成顺序（编排器执行时，从无到有）

```
结构化需求笔记.md              ← probe 产出
        ↓
00-index.md + 01-requirements.md  ← spec step 1（产品维度）
        ↓
02-data-design.md               ← spec step 2（后端维度·数据）
03-api-design.md                ← spec step 2（后端维度·接口）
04-business-logic.md            ← spec step 2（后端维度·业务）
        ↓
05-ui-ux.md                     ← spec step 3（设计维度·调用 frontend-design）
        ↓
06-tech-architecture.md         ← spec step 4（技术维度·架构）
07-agent-matrix.md              ← spec step 4（技术维度·归属）
        ↓
08-acceptance.md                ← spec step 5（质量维度·验收）
09-milestones.md                ← spec step 5（质量维度·里程碑）
        ↓
architecture-blueprint.md       ← blueprint（汇总 01-09 → 代码骨架）
        ↓
代码文件                         ← implement（后端/小程序/Webapp）
        ↓
README.md                       ← implement 收尾（模块概述 + 文档索引）
```

### 阅读顺序（Agent 接手时，按依赖优先级）

```
 1. 00-index.md              → 30秒掌握全貌（唯一真相源）
 2. 01-requirements.md       → 需求全貌（愿景/角色/功能）
 3. 03-api-design.md         → 接口契约（前后端对接基础）
 4. 02-data-design.md        → 数据模型（ER/DDL/索引）
 5. 04-business-logic.md     → 业务规则（状态机/伪代码）
 6. 05-ui-ux.md              → UI 规格（页面/组件）
 7. 06-tech-architecture.md  → 技术架构（模块/服务层）
 8. 07-agent-matrix.md       → Agent 归属（谁改什么）
 9. architecture-blueprint.md → 代码骨架（目录结构）
10. 08-acceptance.md         → 验收标准（按需）
11. 09-milestones.md         → 里程碑（按需）
```

### 依赖关系

```
笔记 ──→ 00-index ──→ 01-requirements ──→ {02-data, 03-api, 04-business}
                                                    ↓
                                              05-ui-ux（需 frontend-design）
                                                    ↓
                                              {06-tech, 07-agent}
                                                    ↓
                                              {08-acceptance, 09-milestones}
                                                    ↓
                                              architecture-blueprint
                                                    ↓
                                                代码文件
```

- `00-index` 是所有后续文档的上游
- `02-data` / `03-api` / `04-business` 互相独立，可并行生成
- `05-ui-ux` 依赖 `01-requirements`（需要知道有哪些页面）
- `06-tech` / `07-agent` 依赖 `02-data` + `03-api`（需要知道表结构和接口）
- `architecture-blueprint` 汇总全部 01-09
- 代码依赖 `blueprint` + 全部 10 份文档

## 五、执行计划

| 序号 | 任务 | 影响文件 | 优先级 |
|------|------|---------|--------|
| 1 | 修正 `agile-iteration/SKILL.md` 路径 + 引用名 | 修改 | P0 |
| 2 | 修正 `task-list/SKILL.md` 路径 | 修改 | P0 |
| 3 | 创建 `architectural-foundation/references/orchestration-guide.md` | 新增 | P0 |
| 4 | 拆分 `arch-foundation-spec` → SKILL.md 精简 + 10 份 references 模板 | 重写+新增 | P1 |
| 5 | 拆分 `arch-foundation-implement` → SKILL.md 精简 + 2 份 references | 重写+新增 | P1 |
| 6 | 拆分 `arch-foundation-probe` → SKILL.md 精简 + 1 份 references | 重写+新增 | P1 |
| 7 | 拆分 `arch-foundation-blueprint` → SKILL.md 精简 + 1 份 references | 重写+新增 | P1 |
| 8 | 精简 `architectural-foundation/SKILL.md`（引用 orchestration-guide + 交互体验） | 修改 | P1 |
| 9 | 更新 `arch-foundation-spec/SKILL.md` 产出从 5 份 → 10 份维度文档 | 修改 | P1 |

### spec 步骤映射（5 步 → 10 份文档）

| 步骤 | 产出文档 | 维度 |
|------|---------|------|
| step 1 | 00-index + 01-requirements | 产品 |
| step 2 | 02-data + 03-api + 04-business | 后端 |
| step 3 | 05-ui-ux（调用 frontend-design） | 设计 |
| step 4 | 06-tech + 07-agent | 技术 |
| step 5 | 08-acceptance + 09-milestones | 质量 |

## 六、不变项

以下 skill 不在本次完善范围内：
- `find-skills` — 独立工具 skill
- `frontend-design` — 设计 skill（被调用方）
- `karpathy-guidelines` — 编码指南
- `skill-creator` — skill 创建工具
- `daily-work-log` — 日志 skill
