# OKR 目标协同系统 PRD

> 版本: v1.0 | 日期: 2026-07-10 | 状态: 需求定义完成，待评审
> 参考原型: Worktile OKR 目标协同（用户提供截图）
> 关联文档: `Y:/AI/Uni-Task/OKR_SYSTEM_DESIGN.md`、`Y:/AI/Uni-Task/MIGRATION_CODEBASE_MAP.md`

---

## 一、需求背景与目标

### 1.1 为什么需要 OKR

当前 WX-APP-OA 系统已具备：公出日志、审批管理、考勤合规、消息通知等**日常执行层**功能。但缺少**战略目标管理层**——无法回答：
- "公司/部门/个人本季度要达成什么？"
- "我的日常工作如何对齐公司战略？"
- "各项目/任务的进展是否支撑了战略目标？"

OKR 模块填补这一空白，在现有的**任务执行层**之上叠加**目标对齐层**。

### 1.2 核心目标

| 目标 | 描述 | 成功标准 |
|------|------|---------|
| **目标可视** | 全员可见公司→部门→个人的目标对齐关系树 | 打开小程序/Web 能看到自己的 O/KR 及上下级对齐 |
| **进度追踪** | KR 可度量、可更新进度，自动回算 O 进度 | 更新任一 KR 进度 → O 总进度自动重算 |
| **战略承接** | O 可挂靠现有 Project，KR 可拆解为 Task | 从目标一路下钻到具体任务 |
| **周期管理** | 按季度创建/关闭评分周期 | 季度末可对 O/KR 打分并归档 |
| **双端可用** | 小程序 + Web 后台均可操作 | 小程序查看/更新；Web 管理全局/看报告 |

### 1.3 不做（边界）

| 不做的功能 | 原因 | 未来可能 |
|-----------|------|---------|
| AI 自动生成 OKR / 智能推荐 | 复杂度高，非 MVP 必需 | Phase 2+ |
| 与企业微信/飞书 OKR 对接 | 当前无此集成需求 | 按需 |
| 目标地图（自动生成关联图谱） | 功能炫酷但使用频率低 | Phase 2 |
| 绩效薪酬直接挂钩 | 涉及 HR 敏感数据，需单独模块 | 独立绩效系统 |
| 多租户/SaaS 多公司隔离 | 当前为单公司内部工具 | — |

---

## 二、用户角色与场景

### 2.1 角色定义

| 角色 | 标识 | 可见范围 | 核心操作 |
|------|------|---------|---------|
| 超级管理员 | `superadmin` | 全部 + 系统配置 | 创建周期、管理全部目标、查看所有报告 |
| 管理者（部门负责人） | `admin` | 本部门及下属目标 | 创建部门/个人目标、对齐上级、评分子属KR |
| 普通员工 | `employee` | 自己参与的目标 | 查看对齐、更新KR进度、自评 |

> 角色体系复用现有 `users.role` 字段和 RBAC 中间件（`requireRole`），无需新建。

### 2.2 核心场景

#### 场景 A：CEO 设定公司级目标
```
CEO 登录 Web 后台 → OKR 模块 → 选择 Q3 周期 → 新建 Objective
  → 标题："将产品打磨至行业领先水平"
  → 对齐类型：company
  → 负责人：自己
  → 关联项目：（可选）
  → 保存 → 系统自动创建 O 记录
```

#### 场景 B：部门经理对齐并分解
```
技术总监登录 Web/小程序 → 目标列表 → 点击"对齐目标"
  → 选择 CEO 的 O 作为父目标
  → 创建本部门 O："重构后端架构提升性能 50%"
  → 添加 3 个 KR：
    KR1: "API 平均响应时间 < 200ms" (度量: 数字, 目标: 200, 单位: ms)
    KR2: "核心接口覆盖率 > 90%"     (度量: 百分比, 目标: 90)
    KR3: "消除 P0 级别线上故障"      (度量: 二进制, 目标: 0)
  → 保存 → 出现在 CEO 目标树的子节点位置
```

#### 场景 C：工程师更新 KR 进度
```
工程师打开小程序 → 我的目标 → 看到"重构后端架构"O 下的 KR1
  → 点击 KR → 输入当前值: 250ms
  → 系统计算 progress = (200/250)*100 = 80%? 不对，
  → 实际逻辑: progress = min(100, target/current * 100) 当数字越小越好时需反转
  → 或直接让用户输入 progress %
  → 保存 → 该 KR 进度变为 80% → O 总进度自动回算(加权平均)
```

#### 场景 D：季度末评分
```
管理员进入 Web → OKR → Q3 周期 → "开始评分"
  → 为每个 KR 打分 (0.0 ~ 1.0)
  → 为每个 O 打综合分 (基于 KR 加权)
  → 生成本季度评分报告
  → 归档该周期（status → closed）
  → 创建新周期 Q4
```

---

## 三、系统现状（可复用资产盘点）

### 3.1 后端资产（可直接用）

| 资产 | 文件路径 | 用法 |
|------|---------|------|
| Express 应用骨架 | `backend/src/app.js` | 新增一行 `app.use('/api/okr', okrRoutes)` |
| 数据库连接池（oaPool） | `backend/src/common/config/database.js` | OKR 所有 SQL 查询走 `oaPool.query()` / `execute()` |
| JWT 鉴权中间件 | `backend/src/common/middleware/auth.js` | `authenticate` 保护 OKR 接口 |
| RBAC 权限中间件 | 同上 | `requireRole('admin')` 管理接口，`requirePermission('okr:*')` 细粒度 |
| 统一响应格式 | `backend/src/common/utils/response.js` | `{ code: 0, message, data }` |
| 参数校验 | Joi（已依赖） | OKR 请求体校验 schema |
| 操作日志表 | `operation_logs`（已有） | OKR 操作记录写入此表 |
| 定时任务调度 | `node-cron`（已依赖） | 季度末自动提醒/归档 |
| Swagger 文档 | 已配置 | OKR 接口自动纳入 `/api-docs` |
| 测试框架 | Jest（覆盖率阈值 70%） | OKR 测试文件放 `backend/tests/okr/` |
| **projects 表** | `init-db.js` 已建 | O.project_id 外键指向它（目前空置，正好启用）|
| **tasks 表** | `init-db.js` 已建 | KR.task_ids JSON 关联它（目前空置）|
| **users 表** | 已建 | O.owner_id 外键 |
| **departments 表** | 已建（含 parent_id 树形） | O.department_id 外键 |

### 3.2 小程序资产

| 资产 | 文件路径 | 用法 |
|------|---------|------|
| 请求封装 | `miniapp/src/services/request.js` | OKR API 调用走 `post('/api/okr/...', params)` |
| 服务模块模式 | `miniapp/src/services/modules/*.js` | 新建 `services/modules/okr.js` |
| 用户状态 | `stores/user.js` | token/userInfo/role 直接用于 OKR 请求 |
| 页面注册 | `pages.json` | 新增 `pages/okr/*` 路由 |
| 公共组件 | `components/` | nav-bar, person-picker, image-uploader 等复用 |
| TabBar | pages.json tabBar 配置 | 可考虑新增 OKR 入口（或放在 features 功能中心）|

### 3.3 Web 后台资产

| 资产 | 文件路径 | 用法 |
|------|---------|------|
| 请求封装（axios） | `webapp/src/utils/request.ts` | Bearer Token 自动附加 + 刷新 |
| API 模块模式 | `webapp/src/api/*.ts` | 新建 `api/okr.ts` |
| 路由守卫 | `router/index.ts beforeEach` | OKR 页面自动鉴权 |
| 布局框架 | `layouts/DefaultLayout.vue` | 侧边栏新增 OKR 菜单组 |
| ECharts | 已依赖 | 报告页面图表渲染 |
| Element Plus | 已依赖 | 表单/表格/树形组件 |
| Pinia Store | `stores/user.ts` | 用户信息/权限读取 |

### 3.4 空白区（需要从零建设）

| 区域 | 说明 |
|------|------|
| **4 张新表** | okr_objectives / okr_key_results / okr_cycles / okr_logs |
| **后端业务代码** | routes / service / controller（约 15-20 个接口）|
| **小程序页面** | 约 8-10 个新页面（目标 CRUD + 关系树 + KR 编辑 + 报告）|
| **Web 页面** | 约 6-8 个新视图（管理后台 + 关系树 + 报告仪表盘）|
| **目标关系树组件** | Web 端（vue-okr-tree 或 ECharts tree）/ 小程序端（自定义递归组件）|

---

## 四、功能清单（MVP 范围）

### 4.1 P0 — 必须有（首期交付）

| # | 功能 | 端 | 说明 |
|:-:|------|----|------|
| 1 | 周期管理（CRUD） | Web | 创建/查看/切换/关闭 OKR 周期 |
| 2 | 目标 CRUD | 双端 | 创建/编辑/删除/查看 Objective |
| 3 | 目标对齐 | 双端 | 选择 parent_id 建立上下级对齐关系 |
| 4 | KR CRUD | 双端 | 在目标下添加/编辑/删除 Key Result |
| 5 | KR 进度更新 | 双端 | 更新 current_value 或 progress % |
| 6 | 进度自动回算 | 后端 | KR 进度变化 → 加权重算 O.progress |
| 7 | **目标关系树（核心 UI）** | 双端 | 展示公司→部门→个人目标层级（Web 左右树/小程序垂直树）|
| 8 | 我的目标 | 小程序 | 个人视角：我负责的 O/KR、我参与的 O/KR |
| 9 | 全局目标 | Web 管理 | 管理员视角：全公司目标总览 |

### 4.2 P1 — 应当有（二期交付）

| # | 功能 | 端 | 说明 |
|:-:|------|----|------|
| 10 | KR 评分 | Web | 周期结束时给 KR 打分 (0.0-1.0) |
| 11 | O 综合评分 | Web | 基于 KR 分数加权计算 O 分数 |
| 12 | OKR 仪表盘 | Web | 聚合统计：完成率/平均进度/分布图 |
| 13 | 进度报告 | Web | 时间线趋势图（ECharts line chart）|
| 14 | 目标状态流转 | 双端 | draft → active → completed/closed/archived |
| 15 | 草稿箱 | 双端 | 未发布的 draft 状态目标 |
| 16 | 信心指数 | 双端 | 每个 O/KR 标注 low/medium/high |

### 4.3 P2 — 可以有（三期交付）

| # | 功能 | 端 | 说明 |
|:-:|------|----|------|
| 17 | 预测报告 | Web | 基于历史趋势预测期末达成率 |
| 18 | 目标跟踪（变更历史） | Web | okr_logs 的可视化展示 |
| 19 | 知识沉淀 / 案例 | 双端 | OKR 案例库、复盘模板 |
| 20 | 沟通汇报（日/周/月报） | 双端 | 基于 OKR 进度的汇报生成 |
| 21 | O ↔ Project 挂靠 | 双端 | 目标关联到具体项目 |
| 22 | KR ↔ Task 拆解 | 双端 | KR 拆解为多个 Task（打通现有 task 系统）|
| 23 | 消息通知 | 双端 | KR 进度变化/评分提醒（复用 messages 表）|
| 24 | 数据导出（Excel） | Web | 目标/评分导出（exceljs 已有依赖）|

---

## 五、数据模型

### 5.1 ER 关系

```
users (1) ────< okr_objectives (N) ────< okr_key_results (N)
                     │                        │
                     ├── (self) parent_id     │
                     │                        └──> tasks (N) [JSON]
                     ├──> projects (1)           [通过 task_ids]
                     ├──> departments (1)
                     └──> okr_cycles (1)

okr_cycles (1) ────< okr_objectives (N)

users (1) ────< okr_logs (N)
```

### 5.2 DDL（完整建表语句）

```sql
-- ============================================================
-- 迁移文件: sql/v2.5_okr.sql
-- 执行方式: 手动或在 migrate 脚本中引入
-- ============================================================

-- 1. OKR 周期表
CREATE TABLE IF NOT EXISTS okr_cycles (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '周期ID',
  name        VARCHAR(50)  NOT NULL COMMENT '周期名称，如 2026年Q3',
  year        INT          NOT NULL COMMENT '年份',
  quarter     TINYINT      NOT NULL COMMENT '季度 1-4',
  start_date  DATE         NOT NULL COMMENT '周期开始日期',
  end_date    DATE         NOT NULL COMMENT '周期结束日期',
  org_scope   ENUM('company','department','team') DEFAULT 'company' COMMENT '适用范围',
  status      ENUM('upcoming','active','grading','closed') DEFAULT 'upcoming' COMMENT '周期状态',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_year_quarter (year, quarter)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OKR周期表';

-- 2. OKR 目标表
CREATE TABLE IF NOT EXISTS okr_objectives (
  id            BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '目标ID',
  title         VARCHAR(200)  NOT NULL COMMENT '目标名称',
  description   TEXT          NULL COMMENT '目标详细描述',

  -- 所属与负责人
  owner_id      BIGINT        NOT NULL COMMENT '负责人ID → users.id',
  department_id BIGINT        DEFAULT NULL COMMENT '所属部门 → departments.id',
  cycle_id      BIGINT        NOT NULL COMMENT '所属周期 → okr_cycles.id',

  -- 对齐关系
  parent_id     BIGINT        DEFAULT NULL COMMENT '父目标ID（对齐上级）→ self.id',
  align_type    ENUM('company','department','personal') DEFAULT 'personal' COMMENT '对齐类型',

  -- 进度与状态
  progress      INT           DEFAULT 0 COMMENT '总体进度 0-100（由KR加权计算）',
  status        ENUM('draft','active','completed','closed','archived') DEFAULT 'draft' COMMENT '目标状态',
  confidence    ENUM('low','medium','high') DEFAULT 'medium' COMMENT '信心指数',

  -- 关联
  project_id    BIGINT        DEFAULT NULL COMMENT '关联项目ID → projects.id',

  -- 时间
  start_date    DATE          DEFAULT NULL,
  end_date      DATE          DEFAULT NULL,

  -- 审计字段
  created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    DATETIME      DEFAULT NULL COMMENT '软删除时间',

  INDEX idx_owner (owner_id),
  INDEX idx_parent (parent_id),
  INDEX idx_cycle_status (cycle_id, status),
  INDEX idx_department (department_id),
  INDEX idx_align_type (align_type),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OKR目标表';

-- 3. OKR 关键结果表
CREATE TABLE IF NOT EXISTS okr_key_results (
  id              BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT 'KR ID',
  objective_id    BIGINT         NOT NULL COMMENT '归属目标ID → okr_objectives.id',
  title           VARCHAR(300)   NOT NULL COMMENT 'KR 描述',
  description     TEXT           NULL COMMENT '详细说明',

  -- 度量方式
  measure_type    ENUM('number','percentage','currency','task','binary','milestone')
                  DEFAULT 'number' COMMENT '度量类型',
  target_value    DECIMAL(12,2)  DEFAULT NULL COMMENT '目标值',
  current_value   DECIMAL(12,2)  DEFAULT 0.00 COMMENT '当前值',
  unit            VARCHAR(20)    DEFAULT '' COMMENT '单位（元/%/个/人/次）',

  -- 进度与评分
  progress        INT            DEFAULT 0 COMMENT '手动进度 0-100（优先于自动计算）',
  score           DECIMAL(3,1)   DEFAULT NULL COMMENT '周期评分 0.0-1.0',
  confidence      ENUM('low','medium','high') DEFAULT 'medium' COMMENT '信心指数',

  -- 状态
  status          ENUM('active','completed','dropped') DEFAULT 'active' COMMENT 'KR 状态',

  -- 关联任务
  task_ids        JSON           DEFAULT NULL COMMENT '关联的任务ID数组 [task_id, ...]',

  sort_order      INT            DEFAULT 0 COMMENT '同级排序',
  created_at      DATETIME       DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_objective (objective_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OKR关键结果表';

-- 4. OKR 操作日志表
CREATE TABLE IF NOT EXISTS okr_logs (
  id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  target_type ENUM('objective','key_result','cycle') NOT NULL COMMENT '目标实体类型',
  target_id   BIGINT       NOT NULL COMMENT '目标实体ID',
  action      ENUM('create','update','delete','score','align','status_change','progress_update')
              NOT NULL COMMENT '操作类型',
  user_id     BIGINT       NOT NULL COMMENT '操作人 → users.id',
  detail      JSON         DEFAULT NULL COMMENT '变更详情 {old:{}, new:{}}',
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_target (target_type, target_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='OKR操作日志表';
```

### 5.3 字段说明与约束

#### okr_objectives 关键设计决策

| 决策点 | 方案 | 原因 |
|--------|------|------|
| parent_id 自引用 | 允许 NULL（顶级目标无父） | 公司级目标没有上级 |
| soft delete | deleted_at 而非物理删除 | 保留历史数据和日志追溯 |
| progress 存储 | 冗余存储（而非每次查询时实时计算） | 减少查询复杂度，定时任务或触发器同步 |
| align_type 枚举 | company / department / personal | 截图中三种级别对应 |
| project_id 可空 | 不是每个目标都关联项目 | 战略目标可能不绑定具体项目 |

#### okr_key_results 度量类型

| measure_type | target 示例 | current 示例 | progress 计算 |
|-------------|------------|-------------|--------------|
| number | 200 (ms) | 250 | min(100, target/current × 100) *需处理越小越好* |
| percentage | 90 (%) | 75 | current/target × 100 |
| currency | 50000 (元) | 35000 | current/target × 100 |
| task | 5 (个) | 3 | current/target × 100 |
| binary | 1 (是/否) | 0 | current === target ? 100 : 0 |
| milestone | 里程碑名 | — | 手动设 progress % |

> **重要**: `progress` 字段支持手动覆盖。当 `progress` > 0 时以手动值为准；当 `progress = 0` 时根据 `measure_type` 和 `(current_value, target_value)` 自动计算。

---

## 六、API 设计（完整契约）

### 6.1 通用约定

- **Base URL**: `/api/okr`
- **Method**: 全部 POST（与现有系统一致）
- **认证**: 除公开只读接口外，均需 `Bearer <JWT>`
- **响应格式**: `{ code: 0, message: "success", data: {...} }`
- **错误码**: 复用现有体系（1001 参数错 / 1003 未授权 / 1004 无权限）

### 6.2 周期管理

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| POST | `/cycles/list` | `{ page?, pageSize?, status? }` | 周期列表 |
| POST | `/cycles/create` | `{ name, year, quarter, startDate, endDate, orgScope }` | 创建周期 |
| POST | `/cycles/:id/detail` | `{ id }` | 周期详情（含目标统计）|
| POST | `/cycles/:id/status` | `{ id, status }` | 切换状态（active/grading/closed）|

### 6.3 目标 CRUD

| 方法 | 路径 | 参数 | 说明 | 权限 |
|------|------|------|------|------|
| POST | `/objectives/list` | `{ cycleId?, ownerId?, deptId?, status?, alignType?, page, pageSize }` | 目标列表 | authenticate |
| POST | `/objectives/mine` | `{ cycleId? }` | **我的目标**（当前用户负责/参与的）| authenticate |
| POST | `/objectives/create` | `{ title, description?, ownerId, departmentId?, cycleId, parentId?, alignType, projectId?, startDate?, endDate? }` | 创建目标 | authenticate |
| POST | `/objectives/:id/detail` | `{ id }` | 目标详情（含 KR 列表）| authenticate |
| POST | `/objectives/:id/update` | `{ id, title?, description?, parentId?, alignType?, projectId?, status?, confidence? }` | 更新目标 | ownOrAdmin |
| POST | `/objectives/:id/delete` | `{ id }` | 软删除 | ownOrAdmin |
| POST | `/objectives/align` | `{ objectiveId, parentObjectiveId }` | 设置对齐关系 | authenticate |

### 6.4 关键结果 CRUD

| 方法 | 路径 | 参数 | 说明 | 权限 |
|------|------|------|------|------|
| POST | `/:objectiveId/krs` | `{ objectiveId }` | 某目标的 KR 列表 | authenticate |
| POST | `/:objectiveId/krs/create` | `{ objectiveId, title, description?, measureType, targetValue?, unit?, sortOrder? }` | 创建 KR | ownOrAdmin |
| POST | `/krs/:id/update` | `{ id, title?, description?, currentValue?, targetValue?, progress?, score?, confidence?, status?, taskIds? }` | 更新 KR | ownOrAdmin |
| POST | `/krs/:id/delete` | `{ id }` | 删除 KR | ownOrAdmin |
| POST | `/krs/:id/progress` | `{ id, progress, currentValue? }` | **更新进度**（自动回算 O）| authenticate |
| POST | `/krs/:id/score` | `{ id, score }` | 给 KR 打分 | adminOrOwner |
| POST | `/krs/:id/sort` | `{ krIds: [id,...] }` | KR 排序调整 | ownOrAdmin |

### 6.5 目标关系树 ⭐

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| POST | `/tree` | `{ cycleId, scope?: 'all'\|'my'\|'department', deptId? }` | **完整目标树 JSON** |
| POST | `/tree/user/:userId` | `{ userId, cycleId }` | 某人对齐子树 |
| POST | `/tree/department/:deptId` | `{ deptId, cycleId }` | 某部门对齐子树 |

**Tree API 返回结构**（供前端 vue-okr-tree / 递归树组件消费）:
```json
{
  "code": 0,
  "data": {
    "cycle": { "id": 1, "name": "2026年Q3", "status": "active" },
    "tree": [
      {
        "id": 101, "title": "将产品打磨至行业领先",
        "owner": { "id": 1, "name": "CEO", "avatar": "url" },
        "progress": 62, "confidence": "medium",
        "alignType": "company", "status": "active",
        "krCount": 3, "childCount": 3,
        "children": [
          {
            "id": 102, "title": "重构后端架构提升性能",
            "owner": { "id": 5, "name": "CTO", "avatar": "url" },
            "progress": 45, "childCount": 0,
            "keyResults": [
              { "id": 201, "title": "API < 200ms", "progress": 80, "score": null },
              { "id": 202, "title": "覆盖率 > 90%", "progress": 60 }
            ],
            "children": []
          }
        ]
      }
    ]
  }
}
```

### 6.6 报告

| 方法 | 路径 | 参数 | 说明 | 阶段 |
|------|------|------|------|------|
| POST | `/reports/dashboard` | `{ cycleId }` | **仪表盘聚合** | P1 |
| POST | `/reports/progress` | `{ cycleId, objectiveId? }` | 进度趋势 | P1 |
| POST | `/reports/score` | `{ cycleId }` | 评分汇总 | P1 |
| POST | `/reports/forecast` | `{ cycleId }` | 预测报告 | P2 |

---

## 七、前端页面规划

### 7.1 小程序（uni-app Vue3）

```
pages/okr/
├── index.vue                    # OKR 入口页（显示当前周期概览 + 进入各子页面）
├── objective/
│   ├── list.vue                 # 目标列表（我的目标 / 全局目标 tab 切换）
│   ├── detail.vue               # 目标详情（头部 O 信息 + KR 列表 + 新增 KR 按钮）
│   └── form.vue                 # 新建/编辑目标表单
├── tree/
│   └── index.vue                # ⭐ 目标关系树（垂直递归缩进树）
├── kr/
│   └── form.vue                 # 新建/编辑 KR 表单（含度量方式选择）
└── reports/
    └── my-progress.vue          # 我的进度概览
```

**关键组件（新建）**:
```
components/okr/
├── okr-tree-node.vue           # 递归树节点（小程序端关系树核心组件）
├── progress-bar.vue             # 进度条（带颜色：绿≥80/黄50-79/红<50）
├── confidence-badge.vue        # 信心指数标签（低/中/高 三色）
├── kr-card.vue                 # KR 卡片（标题+度量+进度+信心+评分）
├── objective-card.vue          # O 卡片（标题+负责人+进度+对齐线+子项数）
└── cycle-picker.vue             # 周期选择器
```

### 7.2 Web 后台（Vue3 + TS + Element Plus）

```
views/okr/
├── index.vue                    # OKR 首页（仪表盘入口）
├── objective/
│   ├── List.vue                # 目标管理列表（el-table + 搜索 + 批量操作）
│   ├── Detail.vue              # 目标详情（含 KR 子表格 + 关系树预览）
│   └── Form.vue                # 新建/编辑目标对话框
├── tree/
│   └── AlignTree.vue           # ⭐ 目标对齐树（vue-okr-tree 或 ECharts tree）
├── kr/
│   └── ScoreDialog.vue         # KR 评分对话框
├── cycle/
│   └── Manage.vue              # 周期管理
└── reports/
    ├── Dashboard.vue           # 仪表盘（ECharts 图表）
    ├── ProgressReport.vue      # 进度趋势报告
    └── ScoreReport.vue         # 评分报告
```

**路由配置**（追加到 `router/index.ts` Layout children）:
```typescript
{
  path: '/okr',
  name: 'Okr',
  component: () => import('@/views/okr/index.vue'),
  meta: { title: '目标协同', roles: ['admin', 'superadmin'] },  // 员工也可见部分页面
  children: [
    { path: '', redirect: '/okr/objectives' },
    { path: 'objectives', component: () => import('./objective/List'), meta: { title: '目标管理' } },
    { path: 'tree', component: () => import('./tree/AlignTree'), meta: { title: '目标关系树' } },
    { path: 'cycles', component: () => import('./cycle/Manage'), meta: { title: '周期管理' } },
    { path: 'reports/dashboard', component: () => import('./reports/Dashboard'), meta: { title: 'OKR仪表盘' } },
  ]
}
```

---

## 八、目标关系树技术方案

### 8.1 Web 端：两种实现对比

| 维度 | 方案 A: vue-okr-tree | 方案 B: ECharts Tree Graph | 推荐 |
|------|---------------------|--------------------------|:----:|
| 视觉效果 | 左右双向树（最接近截图原型）| 横向/纵向树（灵活配置）| A 更接近原型 |
| Vue 版本 | Vue2 → 需适配 Vue3 | 原生支持 Vue3 | B 更省事 |
| 小程序兼容 | ❌ 不可用 | ✅ uCharts 可移植 | — |
| 交互能力 | 内置展开/折叠/拖拽 | 展开/折叠/高亮/tooltip | A 更丰富 |
| 维护风险 | 社区不活跃（2024年后少更新）| ECharts 活跃维护 | B 更稳 |
| 学习成本 | 低（开箱即用）| 中（需配 option）| A更低 |

**建议**: 首选 **方案 A (vue-okr-tree)** 快速出原型验证效果；若适配 Vue3 成本过高（> 1 天），降级为 **方案 B (ECharts)** 作为统一方案（Web + 小程序共用同一套 tree graph 配置，仅容器不同）。

### 8.2 小程序端：自定义递归树组件

由于 uni-app 小程序环境无 DOM 操作，必须自写：

```
components/okr/okr-tree-node.vue  （递归组件）
  ├─ props: node (Object), level (Number), expanded (Boolean)
  ├─ 渲染:
  │   ├─ objective-card（O 节点卡片）
  │   │   ├─ 标题 + 负责人头像 + 名字
  │   │   ├─ 进度条 (progress-bar 组件)
  │   │   ├─ 信心标签 (confidence-badge)
  │   │   └─ 展开/收起按钮
  │   └─ v-if expanded:
  │       └─ keyResults 列表 (kr-card 循环)
  │       └─ children 循环:
  │           └─ <okr-tree-node :node="child" :level="level+1" />
  └─ 样式: level * 24px 左缩进表示层级深度（限制最多 4 层）
```

**性能保障**:
- 默认只展开 L1 + L2，L3/L4 点击按需加载
- 大量节点时分页加载（每层最多 20 个子节点）
- 使用虚拟列表（如后续节点超过 50 个）

---

## 九、与现有系统的集成细节

### 9.1 用户体系对接

```
OKR.owner_id → users.id          (直接外键，无需转换)
OKR 请求头   → Bearer JWT         (复用 auth 中间件 authenticate)
角色判断     → req.user.role      (employee/admin/superadmin)
部门归属     → users.department_id + departments.parent_id (组织树)
```

### 9.2 项目/任务打通（P2 阶段）

```
O.project_id ──→ projects.id
  - O 详情页展示"关联项目"卡片（跳转到项目详情）
  - 项目详情页反向展示"关联目标"

KR.task_ids ──→ [tasks.id, tasks.id, ...]  (JSON 数组)
  - KR 详情页展示"拆解任务"列表（点击跳转任务详情）
  - 任务完成时可选"回写 KR 进度"
```

> **注意**: 当前 `projects` 和 `tasks` 表虽然存在于 DB schema 中，但**无任何业务代码读写它们**。这意味着：
> 1. OKR 可以安全地使用这两张表作为关联锚点
> 2. 但在 P2 集成前，project_id 和 task_ids 字段实际为空（UI 上应灰显或隐藏）
> 3. 当 uni-task 迁移完成后，这两张表才有真实数据

### 9.3 消息通知集成（P2）

```
KR 进度更新 → 写入 messages 表 (ref_type='kr_progress', ref_id=kr.id)
KR 评分完成 → 写入 messages 表 (ref_type='kr_scored', ref_id=kr.id)
O 状态变更 → 写入 messages 表 (ref_type='obj_status', ref_id=o.id)

接收方: O.owner_id（目标负责人）
消息模板: "{userName} 更新了 [{krTitle}] 进度至 {progress}%"
```

### 9.4 操作日志集成

```
每次 OKR 写操作 → 同时写入两张表:
  1. okr_logs (专用，结构化 JSON detail)
  2. operation_logs (通用审计日志，module='okr')

这样既满足 OKR 专属追踪需求，又保持全系统审计一致性。
```

---

## 十、后端目录结构与 Agent 归属

### 10.1 目录结构（遵循现有多 Agent 规范）

```
backend/src/features/okr/              ← 新增：OKR 专属目录
├── index.js                           # 导出 router
├── routes/
│   └── okr.routes.js                  # 路由定义（全部 POST + /api/okr 前缀）
├── controllers/
│   └── okr.controller.js              # 请求解析 + 调用 service
├── services/
│   ├── okr.objective.service.js       # 目标 CRUD + 对齐逻辑
│   ├── okr.kr.service.js             # KR CRUD + 进度更新 + 评分
│   ├── okr.cycle.service.js          # 周期管理
│   ├── okr.tree.service.js           # ⭐ 树构建算法（递归查询+组装 JSON）
│   ├── okr.progress.service.js       # 进度回算引擎（KR→O 加权）
│   └── okr.report.service.js         # 报告数据聚合
└── validators/
    └── okr.schema.js                  # Joi 校验 schemas

backend/tests/okr/                      ← 新增：测试
├── objective.test.js
├── kr.test.js
├── tree.test.js
└── progress.test.js

sql/v2.5_okr.sql                       ← 新增：DDL 迁移文件
```

### 10.2 app.js 接入（仅加 1 行）

```javascript
// 在现有路由挂载区域追加
const okrRoutes = require('./features/okr');
app.use('/api/okr', okrRoutes);   // ← 仅此一行
```

### 10.3 Agent 归属建议

| 职责 | 建议 Agent | 原因 |
|------|----------|------|
| 后端路由/控制器 | data-agent 或新建 okr-agent | 独立模块，职责清晰 |
| 后端服务（业务逻辑） | 同上 | 与路由同 Agent 减少跨 Agent 协调 |
| 小程序页面 | mini-app-agent | 遵循"前端页面归属对应端 Agent"规范 |
| Web 页面 | web-agent | 同上 |
| DDL / 迁移脚本 | core-agent | 数据库 schema 属基础设施 |
| 跨层协调 | orchestrator | 树构建涉及前后端数据格式协商 |

> **R40 铁律**: 跨 Agent 修改需 orchestrator 协调，不得擅自修改其他 Agent 管辖的文件。

---

## 十一、实施计划与里程碑

### Phase 1: 数据基础 + 核心 API（预估 3-4 天）

- [ ] 创建 `sql/v2.5_okr.sql` 并执行建表
- [ ] 实现 okr_routes + controller 骨架
- [ ] Cycle Service（CRUD + 状态机）
- [ ] Objective Service（CRUD + 对齐 + soft-delete）
- [ ] KR Service（CRUD + 度量类型处理）
- [ ] Progress Service（回算引擎：KR 进度 → O 进度加权）
- [ ] Tree Service（递归查询 + 组装树 JSON）
- [ ] Joi validator schemas
- [ ] 单元测试（目标覆盖率 ≥ 70%）

**交付物**: 后端 15+ API 可用，Swagger 文档自动更新

### Phase 2: 核心前端（预估 4-5 天）

- [ ] 小程序：services/modules/okr.js + 页面注册
- [ ] 小程序：目标列表/详情/表单 3 页面
- [ ] 小程序：目标关系树（递归组件 okr-tree-node.vue）
- [ ] 小程序：KR 表单 + 进度更新
- [ ] Web：api/okr.ts + 路由配置
- [ ] Web：目标管理列表/详情/表单
- [ ] Web：目标关系树（vue-okr-tree 或 ECharts）
- [ ] Web：周期管理页面

**交付物**: 双端可用的 OKR 目标 CRUD + 关系树

### Phase 3: 报告与分析（预估 2-3 天）

- [ ] OKR 仪表盘（Web，ECharts）
- [ ] 进度趋势报告
- [ ] KR/O 评分流程
- [ ] 评分汇总报告

**交付物**: 管理者可查看团队 OKR 全貌

### Phase 4: 集成与高级功能（预估 3-4 天）

- [ ] O ↔ Project 挂靠
- [ ] KR ↔ Task 拆解（待 task 系统就绪后）
- [ ] 消息通知集成
- [ ] 操作日志可视化
- [ ] Excel 导出
- [ ] 知识沉淀/案例库（基础版）

**交付物**: OKR 与 OA 系统完全打通

---

## 十二、风险与应对

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|:----:|---------|
| vue-okr-tree Vue3 适配失败 | Web 关系树延期 | 中 | 降级 ECharts tree graph（备选方案已在手）|
| 递归树组件在小程序深层嵌套时卡顿 | 小程序体验差 | 中 | 限制 4 层深度 + 虚拟列表 + 懒加载 |
| 进度回算公式争议（权重怎么定）| 数据不准确 | 低 | P0 先用简单平均；P1 支持自定义权重 |
| KR 度量类型不够用（用户有特殊指标）| 功能不足 | 低 | P0 先支持 6 种；P2 开放自定义 formula |
| 周期切换时旧数据处理不当 | 数据丢失 | 低 | closed 周期只读不可改；强制归档后才允许新建下一周期 |
| 并发更新冲突（两人同时改同一 KR）| 数据覆盖 | 低 | 乐观锁（updated_at 版本号校验）或最后写入胜出 + 日志记录 |

---

## 十三、扩展性设计（未来可做什么）

### 13.1 可扩展方向

| 方向 | 当前预留 | 如何扩展 |
|------|---------|---------|
| 更多度量类型 | measure_type ENUM | 新增枚举值 + progress.service 新增计算策略 |
| 自定义权重 | KR 目前等权 | KR 表增加 weight 字段（默认 1.0） |
| 目标地图（自动关联图） | tree API 已返回完整结构 | 基于树数据 + ECharts graph 渲染关联网络 |
| AI 辅助写 OKR | — | 接入 LLM API，根据项目/描述自动生成 KR 草稿 |
| 多周期对比 | 单周期查询 | reports API 增加 compare 参数 |
| 子公司/多组织 | org_scope 当前仅 company/dept/team | 增加 company_id 字段做多租户隔离 |
| 移动端原生体验 | H5 性能一般 | 将 OKR 模块编译为微信小程序独立分包 |
| 与企微/飞书打通 | — | webhook 回调 + 对端 API 对接 |

### 13.2 不影响当前实现的扩展点

- `okr_objectives` 的 `description` 字段存富文本（未来支持 Markdown 渲染）
- `okr_key_results` 的 `detail` JSON 字段存扩展属性（未来不加字段也能存额外数据）
- `okr_logs` 的 `detail` JSON 字段存任意变更快照
- Tree API 返回结构中的 `children` 递归天然支持无限层级（前端限制即可）

---

## 附录 A：参考资源

- Worktile OKR 截图（用户提供原型）
- vue-okr-tree 组件: CSDN 实战教程 (`https://blog.csdn.net/weixin_27011811/article/details/159849472`)
- BurningOKR (Apache 2.0): `https://burningokr.org/demo`
- Uni-Task 迁移地图: `Y:/AI/Uni-Task/MIGRATION_CODEBASE_MAP.md`
- 本系统架构说明: `Y:/AI/WX-APP-OA/CLAUDE.md`
- 现有 PRD 格式参考: `Y:/AI/WX-APP-OA/大纲/PRD/模块管理-PRD.md`
