# 智慧办公助手 AI 协作规则体系

> 版本: v1.0 | 最后更新: 2026-06-03
> 本文件定义了项目协作中 AI 智能体（Trae、Work Buddy、Qoder）与专家团队的完整分工、执行流程和档案归档规则。

---

## 目录

- [1. 角色定义与分工矩阵](#1-角色定义与分工矩阵)
- [2. 重叠能力优先级](#2-重叠能力优先级)
- [3. 规则清单（R001-R013）](#3-规则清单r001-r013)
- [4. 文件夹结构规范](#4-文件夹结构规范)
- [5. 迭代档案标准](#5-迭代档案标准)
- [6. 仓库工具隔离原则](#6-仓库工具隔离原则)
- [附录A: AI 执行全流程](#附录a-ai-执行全流程)
- [附录B: 变更摘要模板](#附录b-变更摘要模板)

---

## 1. 角色定义与分工矩阵

### 1.1 角色总览

| 角色类型 | 角色名称 | 来源 | 主要职责 |
|---------|---------|------|---------|
| **协调者** | Project Orchestrator | `.AI/skills/project-orchestrator/` | 任务路由、跨项目协调、迭代归档 |
| **AI 智能体** | Work Buddy | `.AI/skills/` | 默认 AI 助手，处理常规开发任务、子项目约束执行 |
| **AI 智能体** | Trae | `.AI/rules/` | Spec 驱动开发、代码生成/重构/审查 |
| **AI 智能体** | Qoder | `.AI/Wiki/` | Wiki 知识库维护、跨文档索引 |
| **专家团队** | 测试专家 | `.AI/skills/api-testing-expert/` | API 回归测试、Bug 生命周期管理 |
| **专家团队** | UI/UX 专家 | `.AI/skills/ui-ux-pro-max/` | 界面设计规范、无障碍评审 |
| **专家团队** | 后端调试专家 | `.AI/skills/backend-debug/` | 日志分析、性能诊断、内存泄漏排查 |

### 1.2 分工矩阵

| 工作环节 | 主要负责人 | 协助方 | 输入 | 输出 | 交接标准 |
|---------|-----------|--------|------|------|---------|
| **任务接收与分析** | Project Orchestrator | - | 用户命令 | 任务分配决策树 | 输出影响范围和 skill 加载列表 |
| **后端 API 开发** | backend-project (WB) | Trae（代码生成辅助） | API 需求 / PRD | 后端代码 + API 文档 | API 通过单元测试 + Swagger 更新 |
| **前端页面对接** | miniapp/webapp-project (WB) | ui-ux-pro-max（设计评审） | API 文档 + 设计稿 | 页面代码 | 无硬编码数据 + UI 评审通过 |
| **API 回归测试** | api-testing-expert (Skill) | test-project (WB) | API 文档 + 测试用例 | 测试报告 + Bug 记录 | 测试报告生成 |
| **Bug 修复** | 对应子项目 skill | bugpack-manager（状态跟踪） | Bug 报告 | 修复代码 + 验证 | Bug 状态 → fixed + 测试通过 |
| **UI/UX 评审** | ui-ux-pro-max | miniapp/webapp-project | 页面/组件代码 | 评审报告 + 改进建议 | 无 Critical 问题 |
| **性能诊断** | backend-debug (Skill) | backend-project | 错误日志 + 指标 | 根因分析报告 | 问题定位 + 优化建议 |
| **Wiki 文档更新** | Qoder (RepoWiki) | 各子项目 skill | 代码变更摘要 | Wiki 文档更新 | 文档与代码同步 |
| **迭代档案生成** | Project Orchestrator | 所有参与方 | 本周期变更记录 | 归档到 memory/ | 档案模板字段齐全 |
| **生产部署** | backend-project (WB) | Project Orchestrator | 版本发布计划 | 部署报告 | 健康检查通过 |

---

## 2. 重叠能力优先级

当多个 AI 工具具备相同能力时，按以下优先级执行：

| 能力领域 | 优先级顺序 | 说明 |
|---------|-----------|------|
| **任务路由与子项目约束** | Work Buddy > Trae > Qoder | project-orchestrator 是顶层入口 |
| **Bug 管理** | Work Buddy = Trae | 两者共享 bugpack-manager 配置 |
| **UI/UX 设计** | Work Buddy = Trae | 两者共享 ui-ux-pro-max 配置 |
| **代码生成与重构** | Trae > Work Buddy | Trae 的 Spec 驱动更适合复杂重构 |
| **知识库维护** | Qoder (RepoWiki) > Work Buddy (memory) | Qoder 专注文档，WB 专注项目记忆 |
| **测试专家能力** | Skill (api-testing-expert) > WB (test-project) | Skill 提供更专业的测试流程 |

---

## 3. 规则清单（R001-R013）

### R001: 项目入口路由规则

| 字段 | 内容 |
|------|------|
| **适用对象** | Project Orchestrator |
| **触发场景** | 用户提出任何开发/测试/优化任务 |
| **执行步骤** | 1. 分析任务影响范围（单项目/跨项目/全栈）<br>2. 按目录路径匹配对应子项目 skill<br>3. 按依赖顺序加载 skill（后端→前端→测试）<br>4. 明确主变更方与连带影响方 |
| **预期产出** | 任务分配决策树、skill 加载列表、执行优先级说明 |

### R002: 跨项目 API 同步规则

| 字段 | 内容 |
|------|------|
| **适用对象** | backend-project + miniapp/webapp-project |
| **触发场景** | 后端新增/修改 API 接口 |
| **执行步骤** | 1. 后端更新 API 文档或生成变更摘要<br>2. 通知前端更新 `services/modules` 调用层<br>3. 测试项目同步更新回归测试用例 |
| **预期产出** | API 变更通知、前端适配清单、测试用例更新记录 |

### R003: Bug 分级处理规则

| 字段 | 内容 |
|------|------|
| **适用对象** | bugpack-manager + 各子项目 skill |
| **触发场景** | 发现或报告 Bug |
| **执行步骤** | 1. 使用 bugpack 创建 Bug，强制指定归属项目<br>2. 按严重性分级（Critical/High/Medium/Low）<br>3. Critical → 立即修复；Medium/Low → 纳入迭代计划<br>4. 修复后由对应 skill 验证关闭 |
| **预期产出** | Bug 记录、修复 commit、验证报告 |

### R004: UI/UX 评审规则

| 字段 | 内容 |
|------|------|
| **适用对象** | ui-ux-pro-max |
| **触发场景** | 新建页面/组件或重构界面 |
| **执行步骤** | 1. 加载设计规范（高效蓝主题）<br>2. 检查无障碍标准（对比度/焦点状态/触摸目标）<br>3. 验证响应式布局（移动端优先）<br>4. 输出评审报告与改进建议 |
| **预期产出** | 设计规范文档、UI 评审报告、改进建议清单 |

### R005: 分层架构约束规则

| 字段 | 内容 |
|------|------|
| **适用对象** | backend-project |
| **触发场景** | 编写/修改后端代码 |
| **执行步骤** | 1. 确认代码所在层级（routes/controllers/services）<br>2. 禁止跨层调用（如 routes 直接操作数据库）<br>3. 控制器只做参数校验与响应封装<br>4. 服务层包含所有业务逻辑 |
| **预期产出** | 符合分层架构的代码、架构违规警告 |

### R006: 前端 API 调用规范

| 字段 | 内容 |
|------|------|
| **适用对象** | miniapp/webapp-project |
| **触发场景** | 前端调用后端接口 |
| **执行步骤** | 1. 严格按后端 API 文档构造请求<br>2. 禁止硬编码假数据<br>3. 统一通过 `services/modules` 模块调用<br>4. 遇到后端问题直接指出，不强行适配 |
| **预期产出** | 规范的 API 调用代码、后端问题报告 |

### R007: 测试覆盖率规则

| 字段 | 内容 |
|------|------|
| **适用对象** | test-project |
| **触发场景** | 提交新功能或修复 Bug |
| **执行步骤** | 1. 新增功能必须编写单元测试<br>2. 核心业务逻辑覆盖率 ≥ 60%<br>3. API 接口必须有集成测试<br>4. 测试失败不得合并到主分支 |
| **预期产出** | 测试用例文件、覆盖率报告 |

### R008: TypeScript 类型检查规则

| 字段 | 内容 |
|------|------|
| **适用对象** | webapp-project |
| **触发场景** | Web 管理后台代码提交 |
| **执行步骤** | 1. 运行 `npm run type-check`<br>2. 禁止使用 `any` 类型（除非有注释说明）<br>3. 接口定义与后端响应结构对齐<br>4. 移除 `console.log` / `debugger` |
| **预期产出** | 类型检查通过报告、清理后的代码 |

### R009: RepoWiki 同步规则

| 字段 | 内容 |
|------|------|
| **适用对象** | 所有子项目 skill |
| **触发场景** | 完成重大功能开发或架构调整 |
| **执行步骤** | 1. 识别变更影响的 Wiki 模块<br>2. 更新对应文档（API 接口/数据库表/页面结构）<br>3. 添加跨文档索引链接<br>4. 更新快速开始指南中的相关章节 |
| **预期产出** | 更新的 Wiki 文档、交叉引用索引 |

### R010: 项目记忆归档规则

| 字段 | 内容 |
|------|------|
| **适用对象** | Project Orchestrator |
| **触发场景** | 每轮迭代结束（每周/每月/重大版本发布） |
| **执行步骤** | 1. 生成本次迭代变更摘要<br>2. 记录 Token 消耗与效率指标（如可获取）<br>3. 提炼经验教训与检查清单<br>4. 归档到 `.AI/memory/YYYY-MM-DD.md` |
| **预期产出** | 迭代档案文件（参照第5节模板） |

### R011: shared-docs 维护规则

| 字段 | 内容 |
|------|------|
| **适用对象** | 所有专家角色 |
| **触发场景** | 跨端共享的文档发生变更 |
| **执行步骤** | 1. 识别文档归属领域（API 契约/技术规划/开发规范）<br>2. 确保文档版本与代码同步<br>3. 在 `README.md` 中维护文档索引<br>4. 标记过期文档并归档 |
| **预期产出** | 更新的共享文档、文档版本记录 |

### R012: 生产环境部署规则

| 字段 | 内容 |
|------|------|
| **适用对象** | backend-project |
| **触发场景** | 准备发布新版本到生产服务器 |
| **执行步骤** | 1. 确认所有测试通过且无 Critical Bug<br>2. 生成数据库迁移脚本（如有 schema 变更）<br>3. 更新 PM2 配置并重新注册进程<br>4. 验证健康检查接口返回正常 |
| **预期产出** | 部署 checklist、迁移脚本、健康检查报告 |

### R013: 环境变量管理规则

| 字段 | 内容 |
|------|------|
| **适用对象** | 所有子项目 |
| **触发场景** | 新增配置项或修改敏感信息 |
| **执行步骤** | 1. 将敏感信息写入 `.env` 文件<br>2. 在 `.env.example` 中添加占位符<br>3. 禁止将 `.env` 提交到 Git<br>4. 更新项目记忆中的环境信息 |
| **预期产出** | 更新的 .env 文件、配置变更日志 |

---

## 4. 文件夹结构规范

### 4.1 统一 `.AI/` 目录结构

所有 AI 协作相关的规则、技能和文档统一在 `.AI/` 目录下管理：

```
.AI/
├── rules/                  # 规则文件（编码规范、Git 工作流、项目规则）
│   ├── coding-standards.md
│   ├── git-workflow.md
│   ├── review-checklist.md
│   ├── backend-rules.md
│   ├── miniapp-rules.md
│   └── webapp-rules.md
├── skills/                 # 技能定义（SKILL.md）
│   ├── project-orchestrator/
│   ├── backend-project/
│   ├── miniapp-project/
│   ├── webapp-project/
│   ├── test-project/
│   ├── bugpack-manager/
│   ├── ui-ux-pro-max/
│   ├── api-testing-expert/
│   ├── backend-debug/
│   └── bugpack-operations/
└── Wiki/                   # 项目知识库文档
    ├── _index.md
    ├── 快速开始.md
    ├── 项目概述.md
    ├── 后端 API 服务/
    ├── 小程序前端/
    ├── Web 管理后台/
    ├── 数据库设计/
    ├── 开发规范/
    ├── 测试策略/
    ├── 部署配置/
    ├── 故障排查/
    └── 共享文档/
```

### 4.2 顶层目录职责

| 目录 | 存放内容 | 维护者 | 命名规范 | Git 纳入 |
|------|---------|--------|---------|---------|
| `.AI/rules/` | 通用规则 + 子项目专属规则 | Project Orchestrator | `kebab-case.md` | 是 |
| `.AI/skills/` | 所有 AI 技能定义（SKILL.md） | 子项目 maintainer | `skill-name/SKILL.md` | 是 |
| `.AI/Wiki/` | 项目知识库文档 | Qoder + 各子项目 skill | 中文命名，模块自包含 | 是 |
| `.AI/memory/` | 项目记忆档案（迭代记录、经验总结） | Project Orchestrator | `YYYY-MM-DD.md` | 是 |
| `sql/migrations/` | 增量数据库迁移脚本 | backend-project | `NNN_description.sql` | 是 |

### 4.3 子项目目录规范

#### backend/ — 后端 API 服务

```
backend/
├── src/
│   ├── app.js              # 应用入口
│   ├── routes/             # 路由层（仅分发，无业务逻辑）
│   ├── controllers/        # 控制器层（参数校验、响应封装）
│   ├── services/           # 服务层（业务逻辑、事务）
│   ├── middleware/          # 中间件（auth、error、logging）
│   ├── config/             # 配置（database.js、redis.js）
│   ├── utils/              # 工具函数
│   └── common/tasks/       # 定时任务（node-cron）
├── scripts/                # SQL 迁移脚本
├── tests/                  # 单元测试 + 集成测试
└── docs/                   # 后端专属文档
```

#### miniapp/ — 微信小程序

```
miniapp/
├── src/
│   ├── pages/              # 页面（L1-L4 层级）
│   ├── components/         # 公共组件
│   ├── services/modules/   # API 调用层
│   ├── stores/             # Pinia 状态管理
│   ├── composables/        # 组合式函数
│   └── utils/              # 工具函数
```

#### webapp/ — Web 管理后台

```
webapp/
├── src/
│   ├── views/              # 页面视图
│   ├── components/         # 公共组件
│   ├── api/                # API 接口定义
│   ├── stores/             # Pinia 状态管理
│   ├── router/             # 路由配置
│   └── utils/              # 工具函数
```

#### test/ — 测试项目

```
test/
├── cloudfunctions/         # 后端 API 集成测试
├── utils/                  # 工具函数测试
├── setup.js                # Jest 全局配置
└── project.md              # 测试项目上下文
```

---

## 5. 迭代档案标准

### 5.1 档案生成时机

| 触发条件 | 频率 | 负责人 |
|---------|------|--------|
| 每周迭代结束 | 每周一次 | Project Orchestrator |
| 重大版本发布 | 按需 | Project Orchestrator |
| 所有 Bug 修复完成 | 按需 | Project Orchestrator |

### 5.2 档案模板

**文件路径**: `.AI/memory/YYYY-MM-DD.md`

```markdown
# 迭代档案 - YYYY-MM-DD

## 基本信息

| 字段 | 值 |
|------|-----|
| 迭代周期 | YYYY-MM-DD ~ YYYY-MM-DD |
| 负责人 | [角色/姓名] |
| 主要目标 | [核心目标描述] |
| 涉及子项目 | backend / miniapp / webapp / test |

---

## 变更摘要

### 后端 (backend/)
- [类型] 变更描述
  - 影响文件: `src/routes/xxx`, `src/controllers/xxx`
  - API 变更: 新增/修改 `POST /api/xxx`
  - 数据库变更: 新增表/ALTER 表

### 小程序 (miniapp/)
- [类型] 变更描述
  - 影响页面: `src/pages/xxx/index.vue`
  - API 对接: `services/modules/xxx.js`

### Web 管理后台 (webapp/)
- [类型] 变更描述
  - 影响视图: `src/views/xxx/index.vue`

### 测试 (test/)
- [类型] 测试变更
  - 覆盖模块: `xxx.test.js`
  - 覆盖率变化: +X%

---

## Token 消耗记录

| AI 工具 | 预估 Token | 主要用途 |
|---------|-----------|---------|
| Work Buddy | ~XXX,XXX | 任务路由、开发 |
| Trae | ~XXX,XXX | Spec 驱动重构 |
| Qoder | ~XX,XXX | Wiki 更新 |
| **合计** | **~XXX,XXX** | - |

### 效率改进建议
- [建议1] 减少重复会话，合并相似任务
- [建议2] 提前准备上下文文件，降低 Token 浪费

---

## Bug 统计

| 严重性 | 新增 | 修复 | 遗留 |
|--------|------|------|------|
| Critical | X | X | X |
| High | X | X | X |
| Medium | X | X | X |
| Low | X | X | X |
| **合计** | **X** | **X** | **X** |

---

## 经验教训与检查清单

### 本次发现的问题
1. [问题] → [根因] → [预防措施]

### 新增检查清单项
- [ ] [检查项 - 适用于后续迭代]

---

## 下一步计划

| 优先级 | 任务 | 负责子项目 |
|--------|------|-----------|
| P0 | [紧急任务] | backend/miniapp |
| P1 | [重要任务] | webapp/test |

---

## 附录

- Git Commit: [SHA]
- API 文档: [Swagger URL]
- 相关 Wiki: [path/to/doc]
```

---

## 6. 仓库工具隔离原则

### 6.1 统一管理

从 v2.0 起，所有 AI 协作相关文件统一在 `.AI/` 目录下管理：

```
.AI/
├── rules/          ← 规则文件（编码规范、Git 工作流、Review 清单、子项目规则）
├── skills/         ← 技能定义（orchestrator、子项目 skill、专家 skill）
└── Wiki/           ← 项目知识库文档（API 文档、设计文档、共享文档）
```

`.AI/memory/` 保留用于项目记忆档案（迭代记录、经验总结）。

### 6.2 Git 管理策略

| 内容 | gitignore 策略 | 说明 |
|------|---------------|------|
| `.env` | 加入 `.gitignore` | 敏感信息，禁止提交 |
| `node_modules/` | 加入 `.gitignore` | 依赖包，不纳入版本管理 |
| `.AI/` | 纳入版本管理 | 规则、技能和 Wiki 是项目资产 |
| `.AI/memory/` | 纳入版本管理 | 项目记忆是团队共享资产 |

### 6.3 冲突处理原则

当两个工具指令冲突时：

| 冲突类型 | 处理方式 |
|---------|---------|
| 规则冲突 | 以本文件 `COLLABORATION-RULES.md` 为准 |
| 分工冲突 | 以第2节"重叠能力优先级"为准 |
| 代码冲突 | 以最新的 Git commit 为准 |
| 配置冲突 | 以 `.AI/rules/` 下的共享规则为准 |

---

## 附录A: AI 执行全流程

当你（AI）接收到一条命令时，按以下流程执行：

```
用户命令
    ↓
阶段一: 指令解析与意图识别
  - 提取关键词（动作 + 目标 + 范围）
  - 分类命令类型（代码生成/问题解答/Bug 修复/文件操作/部署运维）
  - 标注优先级（P0/P1/P2）
    ↓
阶段二: 上下文加载与规则匹配
  - 读取项目记忆 (MEMORY.md)
  - 匹配协作规则 (COLLABORATION-RULES.md → R001-R013)
  - 按 R001 路由到对应子项目 skill
  - 按需加载 RepoWiki 文档（不加载全量，只加载目标模块）
    ↓
阶段三: 任务分解与路径规划
  - 创建 TODO 清单（3-10 个子步骤）
  - 标记依赖关系（哪些步骤有先后顺序）
  - 估算影响范围（模块/文件/API/数据库）
    ↓
阶段四: 规则约束执行
  - 按 TODO 清单逐项执行
  - 每项执行前检查适用的 R005-R013 规则
  - 不满足则调整方案 / 拦截并报告
    ↓
阶段五: 工具调用与代码操作
  - 先读后写（Read → Edit/Write）
  - 优先 Edit（diff 模式），减少 token 消耗
  - 跨项目任务按依赖顺序执行（后端→前端→测试）
    ↓
阶段六: 验证与自检
  - lint 检查 (npm run lint)
  - 类型检查 (npm run type-check) — Web 项目
  - 测试运行 (npm run test)
  - 规则回顾（确认 R005-R013 已满足）
    ↓
阶段七: 结果输出与归档触发
  - 生成变更摘要（按下文模板）
  - 判断是否满足归档条件（R010）
  - 输出回复给用户
```

---

## 附录B: 变更摘要模板

每次任务完成后，按以下模板输出变更摘要：

```
## 变更摘要

| 文件 | 操作 | 说明 |
|------|------|------|
| path/to/file | 新增/修改/删除 | 变更内容简述 |

### 影响模块
- [ ] 后端：影响说明
- [ ] 前端：影响说明
- [ ] 数据库：影响说明

### 验证结果
- [x] lint 通过
- [x] 测试通过
- [x] 规则检查通过

### 未解决问题
- [问题描述]（如有）
