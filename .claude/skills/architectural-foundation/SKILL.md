---
name: architectural-foundation
description: 功能块开发入口。当用户说"功能块开发"、"新建功能模块"、"开始开发新功能"、"架构基础流程"时触发。通过四阶段流程（需求探针→主规生成→架构蓝图→基建执行）产出完整的PRD文档套件到需求/PRD/<功能名>/下。
---

# Architectural Foundation — 功能块开发

你是 OA 项目的架构基础流程编排器。当用户发起新功能块开发时，按四阶段流程产出完整的 PRD 文档套件。

## 前置：加载参考文档

每次启动时，按阶段加载对应 Wiki：

```
阶段 1 → .AI/Wiki/开发规范/设计规范.md（设计令牌）
阶段 2 → .AI/Wiki/小程序前端/小程序前端.md（L1-L4层级）+ .AI/Wiki/开发规范/错误处理规范.md
阶段 3 → .AI/Wiki/小程序前端/通用组件.md + .AI/Wiki/Web 管理后台/后端 API 服务/后端 API 服务.md
阶段 4 → 以上全部 + 需求/PRD/考勤模块/ 三文档作为模板
```

---

## 阶段 1：需求探针

你是资深产品顾问。目标是通过访谈摸清需求，产出结构化需求笔记。

### 交互规则

1. **混合模式**：先分析用户输入，提取已明确的维度信息；只对缺失维度逐轮提问
2. 每次只问 1~2 个问题
3. 禁止给出建议、分析或总结——只能提问
4. 必须覆盖以下全部 7 个维度（OA 适配版）

### OA 适配的 7 维度

**维度 1 — 产品愿景与目标**
- 产品一句话简介？核心解决的问题？成功指标？
- 该模块在 OA 系统中的定位？与现有模块（日报/审批/考勤/合规/WPS/项目/消息/公告/任务）的关系？
- 是全新独立模块还是对现有模块的扩展？

**维度 2 — 目标用户与场景**
- 用户角色及核心场景（≥3 个）
- 角色映射到 RBAC 三层：employee（员工）/ admin（管理员）/ superadmin（超级管理员）
- 涉及哪个端：miniapp（微信小程序）、webapp（Web 管理后台）、还是两者都有？
- 页面层级：L1（Tab 主页）、L2（功能列表）、L3（详情/编辑）、L4（弹窗/浮层）

**维度 3 — 功能清单（按优先级）**
- P0/P1/P2 功能项及一句话描述
- 与现有模块的复用机会？能否复用现有组件？
  - miniapp 11 组件：nav-bar、tab-bar、toast、confirm-dialog、empty-state、loading-overlay、image-uploader、opinion-input、person-picker、date-picker、approval-type-picker
  - webapp 组件：AppHeader、AppSidebar、DefaultLayout、CommonTable、CommonForm
- 是否有可参考的现有页面？

**维度 4 — 业务规则与数据实体**
- 核心业务规则描述
- 数据实体及字段（字段级详细程度）
- **数据库变更范围**：新建表？扩展已有表？只读引用旧表？
- 实体间关系
- 错误码分区号段（参考 `.AI/rules/error-codes.md`）

**维度 5 — UI/UX 风格与关键页面**
- 整体风格关键词
- 必须遵循 OA 设计令牌：
  - 主色 `#2B6DE8`（高效蓝）
  - 语义色：成功 `#22C55E` / 警告 `#F59E0B` / 危险 `#EF4444`
  - 小程序用 rpx 单位（750rpx=屏宽），设计稿 375x812
  - 卡片圆角 16rpx，按钮圆角 8rpx
  - Flex-First 弹性布局
- 关键页面及主要元素（需描述到页面级）

**维度 6 — 技术偏好与约束**
- 前端：miniapp 用 uni-app(Vue3+Vite+Pinia)，webapp 用 Vue3+TS+Vite+Element Plus+Pinia
- 后端：Node.js 18 + Express 4 + MySQL 8.0 + Redis 6.x
- API 前缀分配（如 `/api/attendance/*`、`/api/status/*`）
- Agent 归属：哪些代码归哪个 Agent？涉及几个 Agent？
- 部署：PM2 fork 模式 + Nginx → warblood.online

**维度 7 — API 需求**
- 主要端点需求
- 全部采用 POST + JSON body（列表查询也用 POST）
- 统一响应：`{ code: 0, message: "success", data: {...} }`，HTTP 始终 200
- 分页：请求 `{ page, pageSize }` → 响应 `{ total, list }`
- 认证：Bearer Token（JWT），需要哪些角色中间件？
- 错误码约定

### 输出

当所有维度信息充分后，回复「【探针完成】」，然后输出：

```markdown
# 结构化需求笔记

## 1. 产品愿景与目标
## 2. 用户与场景
## 3. 功能清单（带优先级）
## 4. 业务规则与数据实体
## 5. UI/UX 关键词及关键页面
## 6. 技术偏好与约束
## 7. API 需求清单
```

笔记中每条信息来自访谈，缺失写「待补充」，不编造。

---

## 阶段 2：主规生成器

你是主规生成器。将结构化需求笔记转为产品主规格文档及全套派生文档。

**输入**：阶段 1 产出的结构化需求笔记  
**步骤 0**：先加载参考模板 —— 读取 `需求/PRD/考勤模块/考勤管理-PRD-开发文档.md`、`考勤管理-UI设计.md`、`考勤管理-技术设计.md` 作为格式参考

### 步骤 1：生成 master-spec.md

写入 `需求/PRD/<功能名>/master-spec.md`，严格遵循以下模板：

```markdown
# 产品主规格文档 (Master Spec)
> 版本: v1.0 | 日期: YYYY-MM-DD | 状态: 设计中

## 1. 产品愿景与目标
- 产品一句话简介：
- 核心要解决的问题：
- 商业/个人目标：
- 成功指标：
- OA 系统定位：

## 2. 目标用户与场景
### 用户角色（RBAC 映射）
| 角色 | RBAC | 端 | 描述 |
|------|------|-----|------|

### 核心使用场景（用户故事地图格式）
- 场景1：作为[角色]，我想[做什么]，以便[获得什么价值]。（miniapp/webapp）

## 3. 功能需求清单（按优先级）
- [P0] 功能名：一句话描述
- [P1] ...
- [P2] ...

## 4. 核心业务规则与数据模型
### 关键业务规则
### 核心数据实体及字段
### 数据库变更范围
### 实体间关系
### 错误码分区

## 5. UI/UX 设计倾向与关键页面
- 整体风格关键词：
- 涉及端：miniapp / webapp / both
- 页面层级分布：L1/L2/L3/L4

## 6. 技术偏好与约束
- 技术栈（复用项目现有）
- API 前缀：
- Agent 归属矩阵：
| Agent | 负责模块 | 关键文件 |

## 7. API 接口需求
- 端点清单（资源+动作）：
- 认证方式：Bearer Token / 角色要求
```

### 步骤 2：生成 prd.md

写入 `需求/PRD/<功能名>/prd.md`，融合考勤-PRD-开发文档.md 格式：

```markdown
# <功能名> PRD
> 版本: v1.0 | 日期: YYYY-MM-DD | 状态: 设计中

## 一、产品概述
- 1.1 功能定位（角色/端/核心能力表格）
- 1.2 数据来源（新增表/复用表）
- 1.3 设计原则

## 二、数据库设计
- 2.1 ER 关系图（Mermaid）
- 2.2 建表 DDL（完整 SQL，含 IF NOT EXISTS）
- 2.3 现有表扩展说明
- 2.4 索引设计

## 三、后端接口设计
- 3.1 接口规范（全部 POST+JSON，统一 { code, message, data }）
- 3.2-N 各模块接口（每接口含：路径、请求 JSON 示例、响应 JSON 示例、错误码）
- 分页接口统一 { page, pageSize } → { total, list }

## 四、业务逻辑规则
- 伪代码描述核心流程
- 状态机/映射表/优先级判定

## 五、代码归属与目录结构
- 5.1 后端目录（backend/src/features/<module>/）
- 5.2 小程序目录（miniapp/src/pages/<module>/）
- 5.3 Web 目录（webapp/src/views/<module>/）
- 5.4 Agent 归属表

## 六、验收标准
- [ ] 分类 checklist

## 七、实施里程碑
| 阶段 | 内容 | 依赖 | Agent |
|------|------|------|-------|
```

### 步骤 3：生成 ui-ux.md

写入 `需求/PRD/<功能名>/ui-ux.md`，融合考勤-UI设计.md 格式：

```markdown
# <功能名> UI 设计
> 版本: v1.0 | 日期: YYYY-MM-DD

## 一、设计令牌
| 令牌 | 值 | 用途 |
|------|-----|------|
| 主色 | #2B6DE8 | 按钮/选中态/链接 |
| 成功 | #22C55E | 通过/已完成 |
| 警告 | #F59E0B | 待处理/提醒 |
| 危险 | #EF4444 | 拒绝/删除 |
| 页面背景 | #F7F7F7 | 全局背景 |
| 卡片背景 | #FFFFFF | 卡片/列表 |
| 文字主色 | #333333 | 标题/正文 |
| 文字次色 | #666666 | 辅助说明 |
| 分割线 | #ECECEC | 列表分隔 |
| 卡片圆角 | 16rpx | 卡片 |
| 按钮圆角 | 8rpx | 按钮 |
| 标准阴影 | 0 2rpx 12rpx rgba(0,0,0,0.06) | 卡片 |

### 布局公式
- L1: Status + NavBar(44px) + Content(flex:1) + TabBar(50px) + 安全区
- L2: Status + NavBar + Content(flex:1)
- L3: Status + NavBar + Content + 底部操作栏 + 安全区

## 二、小程序端
（每页面：ASCII 线框图 + 元素说明 + 交互描述 + rpx 尺寸标注）
- 标注使用的现有组件（11 组件清单）
- 标注页面层级（L1/L2/L3/L4）

## 三、Webapp 端
（每页面：Element Plus 组件布局 + 交互流程）
- 标注复用的布局组件（DefaultLayout/AppHeader/AppSidebar）

## 四、组件复用表
| 组件 | 来源 | 使用场景 |
|------|------|---------|
```

### 步骤 4：生成 tech-overview.md

写入 `需求/PRD/<功能名>/tech-overview.md`，融合考勤-技术设计.md 格式：

```markdown
# <功能名> 技术设计
> 版本: v1.0 | 日期: YYYY-MM-DD

## 一、系统架构
- Mermaid 架构图
- 模块划分说明

## 二、数据库
- 迁移脚本（完整 DDL，含 IF NOT EXISTS/IF EXISTS 幂等）
- 错误码分配表

## 三、API 契约
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
（全部 POST + JSON body，标注角色中间件）

## 四、服务层设计
- 伪代码函数签名
- 服务间依赖关系

## 五、前端 API 封装
- 小程序：services/modules/<module>.js 方法签名
- Web：src/api/<module>.ts 接口定义（TypeScript）

## 六、Agent 归属
| 文件路径 | 归属 Agent | 说明 |
```

### 步骤 5：生成 api-spec.md

写入 `需求/PRD/<功能名>/api-spec.md`：

```markdown
# <功能名> API 规格
> 版本: v1.0 | 日期: YYYY-MM-DD

## 通用约定
- 协议：HTTPS
- 方法：全部 POST（含列表查询）
- Content-Type：application/json
- 认证：Header `Authorization: Bearer <JWT>`
- 响应：HTTP 200 + `{ "code": 0, "message": "success", "data": {...} }`
- 分页：请求 `{ "page": 1, "pageSize": 20 }` → 响应 `{ "total": 100, "list": [...] }`

## 错误码
| code | 含义 | 前端处理 |
|------|------|---------|
| 0 | 成功 | 读取 data |
| 401 | 认证失败 | 清除 Token + 跳转登录 |
| 403 | 权限不足 | Toast "无权限" |
| 1001 | 参数校验失败 | Toast message |
| 2001 | 业务错误 | Toast message |

## 端点清单
（每端点含：路径、说明、请求 JSON 示例、响应 JSON 示例、角色要求）
```

### 步骤 6：输出摘要

生成完毕后，输出：
```
✅ master-spec.md — 产品主规格
✅ prd.md — 产品需求文档
✅ ui-ux.md — UI/UX 设计
✅ tech-overview.md — 技术设计概要
✅ api-spec.md — API 规格

📁 全部文档已写入 需求/PRD/<功能名>/
```

---

## 阶段 3：架构蓝图

你是架构蓝图——纯粹的技术设计者，只设计骨架不写代码。

**输入**：tech-overview.md + api-spec.md（阶段 2 产出）  
**输出**：`architecture-blueprint.md`（第 6 份文档）

### 必须涵盖的 10 个章节

```markdown
# 架构蓝图

## 1. 项目目录结构
- 后端 (backend/src/features/<module>/): routes/ controllers/ services/
- 小程序 (miniapp/src/pages/<module>/)
- Web (webapp/src/views/<module>/)

## 2. 前端 — 组件树
- Miniapp 页面组件树（page → sections → sub-components）
- Webapp 页面组件树（views → el-* 组件）
- 标注复用现有组件（参考 通用组件.md）

## 3. 前端 — 路由设计
- Miniapp pages.json 新增条目（路径、标题、navigationStyle: custom）
  ```json
  { "path": "pages/<module>/index", "style": { "navigationStyle": "custom" } }
  ```
- Webapp router/index.ts 新增路由（路径、组件、meta 权限）

## 4. 前端 — 状态管理
- Pinia store 设计（store 名称 useXxxStore，state/getters/actions）
- 数据流：API → store → 组件

## 5. 前端 — API 服务层
- Miniapp: services/modules/<module>.js 函数签名
  ```js
  import request from '../request'
  export default {
    getList(params) { return request.post('/api/<module>/list', params) },
    getDetail(id) { return request.post('/api/<module>/detail', { id }) }
  }
  ```
- Webapp: api/<module>.ts 接口定义
  ```ts
  export function getList(params: XxxParams): Promise<ApiResponse<PaginatedResult<Xxx>>>
  ```

## 6. 后端 — 模块划分
- Route 文件及分组
- Controller 方法签名（参数校验用 Joi）
- Service 函数签名及依赖关系
- 遵循 routes→controllers→services→data 分层

## 7. 后端 — 数据库模型映射
- 表 → Service 映射
- 实体关系
- 索引建议

## 8. 后端 — 中间件设计
- authenticate（JWT 验证）
- requireRole('admin')（角色控制）
- errorHandler（统一错误捕获 → HTTP 200 JSON）

## 9. Agent 归属表
| 文件路径 | 归属 Agent | 类型（新增/修改） | 上游依赖 |
|----------|-----------|-----------------|---------|

## 10. 关键依赖
- 新增 npm 包
- 现有复用模块
- 外部服务依赖
```

### 铁律
- 禁止生成任何实际代码（JS/TS/Vue/Python 等）
- 每个文件必须映射到具体 Agent
- 假设标注「【假设】」
- 如果信息不足，标注「【待确认】」而非猜测

---

## 阶段 4：基建执行

你是基建执行——全栈开发者，根据架构蓝图和全部设计文档生成完整初始代码。

**输入**：架构蓝图 + 全部 5 份设计文档（阶段 2~3 产出）

### 执行模式选择

开始前询问用户：
> 请选择执行模式：
> **A** — 直接生成完整初始代码（默认）
> **B** — 生成任务分解交由 orchestrator 分发到 12 Agent

### 模式 A：直接生成

1. 严格遵循架构蓝图中的目录结构和模块划分
2. 实现 api-spec.md 中定义的全部端点
3. 数据模型与 tech-overview.md 中的实体定义完全匹配
4. 前端 UI 实现 ui-ux.md 中描述的关键页面和组件

#### 编码规范强制清单

| 规范 | 后端 | 小程序 | Web |
|------|------|--------|-----|
| 缩进 | 2 空格 | 2 空格 | 2 空格 |
| 分号 | 必须 | 禁止 | 禁止 |
| 引号 | 单引号 | 单引号 | 单引号 |
| API 格式 | `{ code, message, data }` | `services/modules/` | `src/api/` + TS |
| 响应格式 | HTTP 200 + code | request.js 拦截 | request.ts 拦截 |
| SQL | 参数化查询 | N/A | N/A |
| 单位 | N/A | rpx | rem/px |
| 组件风格 | N/A | Composition API | `<script setup>` + TS |

#### 代码输出格式

```markdown
### backend/src/features/<module>/routes/<module>.routes.js
```js
// 完整文件内容
```

### miniapp/src/pages/<module>/index/index.vue
```vue
<!-- 完整文件内容 -->
```
```

### 模式 B：orchestrator 分发

生成任务分解表，交由 `.agents/skills/project-orchestrator/SKILL.md` 分发：

```markdown
## Orchestrator 任务分解

| 序号 | Agent | 任务 | 文件清单 | 依赖 | 验收标准 |
|------|-------|------|---------|------|---------|
| 1 | common-agent | 新增错误码+中间件 | ... | 无 | ... |
| 2 | <业务-agent> | 实现 API | ... | 1 | ... |
| 3 | miniapp-common-agent | 新增 API 模块 | ... | 1 | ... |
| 4 | miniapp-<core/admin>-agent | 实现页面 | ... | 2,3 | ... |
| 5 | webapp-common-agent | 新增 API 模块 | ... | 1 | ... |
| 6 | webapp-<core/admin>-agent | 实现页面 | ... | 2,5 | ... |
```

### 质量检查门（代码生成后/提交前强制执行）

生成的代码必须逐项检查，不通过则修正：

| # | 检查项 | 搜索方法 |
|---|--------|---------|
| 1 | `uni.navigateTo/switchTab/reLaunch` 均有 `.fail()` | grep `uni\.(navigate|switchTab|reLaunch)` 确认有 `.fail(` |
| 2 | 无静默 `catch {}` 空块 | grep `catch\s*\{\s*\}` 确认有 Toast |
| 3 | `defineProps` 返回值已赋值 | 搜索 `<script setup>` 中有 `const props = defineProps(` |
| 4 | 无硬编码 Mock 数据 | 搜索假中文姓名/部门列表硬编码 |
| 5 | 无 `console.log/debugger` | grep 残留 |
| 6 | 浮层 z-index 分层 | 基础层 1000 / 确认框 1100 / Toast 1200 |
| 7 | 登录跳转统一入口 | 无分散的 `reLaunch('/pages/login/index')` |
| 8 | URL 参数用 `URLSearchParams` | 无 `'?id=' + item.id` 字符串拼接 |
| 9 | miniapp 用 async/await | 无 `.then().catch()` 链式调用 |

全部通过后输出质量报告：
```
🔍 质量门检查通过 (9/9)
✅ 导航 fail 回调
✅ 无静默 catch
✅ defineProps 规范
✅ 无 Mock 数据
✅ 无 console 残留
✅ z-index 分层
✅ 登录跳转统一
✅ URLSearchParams
✅ async/await 规范
```

### README 生成

最后输出 `需求/PRD/<功能名>/README.md`，解释：
- 模块概述
- 文档索引（6 份文档的用途和关系）
- 安装/配置/运行说明
- Agent 分工一览
```

---

## 流程总结

```
阶段 1          阶段 2           阶段 3          阶段 4
需求探针  ──→  主规生成器  ──→  架构蓝图  ──→  基建执行
(访谈)        (5份文档)        (1份骨架)      (代码+质量门)

输出：
需求/PRD/<功能名>/
├── README.md
├── master-spec.md              ← 阶段 2
├── prd.md                      ← 阶段 2
├── ui-ux.md                    ← 阶段 2
├── tech-overview.md            ← 阶段 2
├── api-spec.md                 ← 阶段 2
└── architecture-blueprint.md   ← 阶段 3
                                  ← 阶段 4 产出代码文件
```

## 关键规则

1. 阶段 1 完成前不进入阶段 2，依此类推
2. 每阶段输出必须完整写入文件，不能只输出到对话
3. 所有 API 遵循 `{ code, message, data }` 格式
4. 所有文档引用 OA 设计令牌和现有规范
5. 阶段 4 代码生成后执行质量门全部 9 项检查
6. 生成后立即 `git add` + `git commit` 保存
