# 蓝图 10 章节详细参考

> 本文档是 `arch-foundation-blueprint` 的详细参考。
> SKILL.md 只含铁律与章节概要，每个章节的详细模板、目录结构示例、表格格式在此文档中。

## 章节 1 — 项目目录结构

### backend

```
backend/src/features/<module>/
├── routes/
│   └── <module>.routes.js        # 路由定义
├── controllers/
│   └── <module>.controller.js    # 控制器
├── services/
│   └── <module>.service.js       # 业务逻辑
└── middleware/
    └── <module>.middleware.js    # 模块专属中间件（可选）
```

### miniapp

```
miniapp/src/pages/<module>/
├── index.vue                     # 列表页（L2）
├── detail.vue                    # 详情页（L3）
├── edit.vue                      # 编辑页（L3）
└── components/                   # 模块专属组件（可选）
    └── <Component>.vue
```

### webapp

```
webapp/src/views/<module>/
├── index.vue                     # 列表页
├── detail.vue                    # 详情页
├── edit.vue                      # 编辑页
└── components/                   # 模块专属组件（可选）
    └── <Component>.vue
```

### 输出格式

```markdown
## 1. 项目目录结构

### backend
（目录树）

### miniapp
（目录树）

### webapp
（目录树）
```

---

## 章节 2 — 前端组件树

### Miniapp 页面组件树

```
<Page>
├── <Section1>
│   ├── <SubComponent1>
│   └── <SubComponent2>
└── <Section2>
    └── <SubComponent3>
```

每个页面需标注：

- 复用的现有组件（来自 miniapp 11 组件清单）
- 新增的模块专属组件

### Webapp 组件树

```
<view>
├── <el-table> / <el-form> / 其他 el-* 组件
├── <ModuleComponent>
└── <CommonComponent>
```

每个页面需标注：

- 使用的 Element Plus 组件
- 复用的现有组件（AppHeader / AppSidebar / DefaultLayout / CommonTable / CommonForm）
- 新增的模块专属组件

### 复用标注格式

```markdown
### <页面名> 组件树

（组件树）

**复用组件**：
- `nav-bar` — 顶部导航
- `empty-state` — 空状态

**新增组件**：
- `<NewComponent>` — <用途>
```

---

## 章节 3 — 前端路由设计

### Miniapp pages.json

新增条目格式：

```json
{
  "path": "pages/<module>/index",
  "style": {
    "navigationBarTitleText": "<页面标题>",
    "navigationStyle": "default"
  }
}
```

需列出该模块所有新增页面的 pages.json 条目。

### Webapp router/index.ts

新增路由格式：

```typescript
{
  path: '/<module>',
  component: () => import('@/views/<module>/index.vue'),
  meta: {
    title: '<页面标题>',
    icon: '<图标>',
    roles: ['<角色>']
  }
}
```

### meta 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 页面标题，显示在标签页和面包屑 |
| `icon` | string | 菜单图标 |
| `roles` | string[] | 允许访问的角色（employee/admin/superadmin） |

### 输出格式

```markdown
## 3. 前端路由设计

### Miniapp pages.json 新增条目

（JSON 列表）

### Webapp router/index.ts 新增路由

（TS 路由定义列表）
```

---

## 章节 4 — 前端状态管理

### Pinia store 定义

每个 store 需说明：

- **store 名称**：`use<Module>Store`
- **state**：状态字段列表
- **getters**：计算属性
- **actions**：操作方法（含 API 调用）

### 数据流

```
API 请求 → store action → state 更新 → 组件响应式渲染
```

### 输出格式

```markdown
## 4. 前端状态管理

### Miniapp Store

#### use<Module>Store

**state**：
| 字段 | 类型 | 说明 |
|------|------|------|
| <字段> | <类型> | <说明> |

**getters**：
- `<getter名>` — <说明>

**actions**：
- `<action名>(<参数>)` — 调用 `<api函数>`，更新 `<state字段>`

### Webapp Store

（同上格式）

### 数据流

（数据流说明）
```

---

## 章节 5 — 前端 API 服务层

### Miniapp services/modules/

文件路径：`services/modules/<module>.js`

每个函数需说明：

- 函数名
- 参数
- 返回值
- 对应后端端点

### Webapp api/

文件路径：`api/<module>.ts`

每个接口需提供 TypeScript 定义：

- 接口名
- 请求类型（Request）
- 响应类型（Response）
- 对应后端端点

### 输出格式

```markdown
## 5. 前端 API 服务层

### Miniapp — services/modules/<module>.js

| 函数 | 参数 | 返回值 | 端点 |
|------|------|--------|------|
| `<函数名>` | `<参数类型>` | `<返回类型>` | `POST /api/<module>/<action>` |

### Webapp — api/<module>.ts

```typescript
// 请求类型
interface <Module>Request {
  <字段>: <类型>;
}

// 响应类型
interface <Module>Response {
  <字段>: <类型>;
}

// API 函数
export function <apiName>(data: <Module>Request): Promise<{ code: number; data: <Module>Response }>;
```
```

---

## 章节 6 — 后端模块划分

### 分层架构

```
routes → controllers → services → data
```

- **routes**：路由定义，全部 POST，挂载中间件
- **controllers**：请求解析 + 响应封装，不含业务逻辑
- **services**：业务逻辑，数据操作
- **data**：数据库访问层（如使用 ORM/查询构造器）

### Route 文件

- 文件路径：`routes/<module>.routes.js`
- 路由分组
- 挂载的中间件（authenticate / requireRole）

### Controller 方法签名

每个方法需说明：

- 方法名
- 请求参数（req.body / req.params / req.query）
- 返回数据

### Service 函数签名

每个函数需说明：

- 函数名
- 参数
- 返回值
- 依赖的其他 Service（如有）

### 输出格式

```markdown
## 6. 后端模块划分

### Route — routes/<module>.routes.js

| 端点 | 中间件 | Controller 方法 |
|------|--------|----------------|
| `POST /api/<module>/<action>` | `authenticate, requireRole('admin')` | `<controller>.<method>` |

### Controller — controllers/<module>.controller.js

| 方法 | 请求参数 | 返回数据 |
|------|---------|---------|
| `<method>` | `req.body: { <字段> }` | `{ code, data }` |

### Service — services/<module>.service.js

| 函数 | 参数 | 返回值 | 依赖 |
|------|------|--------|------|
| `<函数名>` | `<参数>` | `<返回类型>` | `<其他Service>` |
```

---

## 章节 7 — 后端数据库模型映射

### 表 → Service 映射

| 表名 | 对应 Service | 说明 |
|------|-------------|------|
| `<table>` | `<module>.service.js` | <说明> |

### 实体关系

```
<实体A> 1:N <实体B>（外键：<字段>）
<实体C> M:N <实体D>（中间表：<中间表名>）
```

### 索引建议

| 表名 | 索引字段 | 类型 | 说明 |
|------|---------|------|------|
| `<table>` | `<字段>` | 普通/唯一 | <说明> |

### 输出格式

```markdown
## 7. 后端数据库模型映射

### 表 → Service 映射

（映射表）

### 实体关系

（关系说明）

### 索引建议

（索引表）
```

---

## 章节 8 — 后端中间件设计

### authenticate（JWT 验证）

- 位置：`middleware/authenticate.js`（已有，复用）
- 作用：验证 `Authorization: Bearer <token>`，解析 JWT，挂载 `req.user`
- 失败响应：`{ code: 401, message: "未认证" }`

### requireRole（角色控制）

- 位置：`middleware/requireRole.js`（已有，复用）
- 用法：`requireRole('admin')` / `requireRole('superadmin')`
- 作用：校验 `req.user.role` 是否符合要求
- 失败响应：`{ code: 403, message: "无权限" }`

### errorHandler（统一错误处理）

- 位置：`middleware/errorHandler.js`（已有，复用）
- 作用：捕获全局错误，统一返回 HTTP 200 + JSON `{ code, message }`
- 策略：业务错误返回对应 code，系统错误返回 500 且不暴露堆栈

### 模块专属中间件（可选）

如模块有特殊校验需求（如数据权限、业务前置检查），可新增模块专属中间件：

- 文件路径：`features/<module>/middleware/<module>.middleware.js`
- 作用说明
- 使用位置

### 输出格式

```markdown
## 8. 后端中间件设计

### 通用中间件（复用）

| 中间件 | 文件 | 作用 |
|--------|------|------|
| `authenticate` | `middleware/authenticate.js` | JWT 验证 |
| `requireRole` | `middleware/requireRole.js` | 角色控制 |
| `errorHandler` | `middleware/errorHandler.js` | 统一错误处理 |

### 模块专属中间件（新增）

| 中间件 | 文件 | 作用 | 使用位置 |
|--------|------|------|---------|
| `<名称>` | `<路径>` | <说明> | <路由> |
```

---

## 章节 9 — Agent 归属表

### 表格格式

| 文件路径 | 归属 Agent | 类型 | 上游依赖 |
|----------|-----------|------|---------|
| `backend/src/features/<module>/routes/<module>.routes.js` | `<agent>` | route | — |
| `backend/src/features/<module>/controllers/<module>.controller.js` | `<agent>` | controller | routes |
| `backend/src/features/<module>/services/<module>.service.js` | `<agent>` | service | controller |
| `miniapp/src/pages/<module>/index.vue` | `<agent>` | page | — |
| `miniapp/src/services/modules/<module>.js` | `<agent>` | service | page |
| `miniapp/src/store/<module>.js` | `<agent>` | store | service |
| `webapp/src/views/<module>/index.vue` | `<agent>` | view | — |
| `webapp/src/api/<module>.ts` | `<agent>` | api | view |
| `webapp/src/store/<module>.ts` | `<agent>` | store | api |

### 字段说明

- **文件路径**：相对于项目根目录的路径
- **归属 Agent**：负责编写和维护该文件的 Agent 名称
- **类型**：route / controller / service / page / view / store / api / component / middleware
- **上游依赖**：该文件依赖的其他文件（先完成上游才能编写本文件）

### 输出格式

```markdown
## 9. Agent 归属表

| 文件路径 | 归属 Agent | 类型 | 上游依赖 |
|----------|-----------|------|---------|
| ... | ... | ... | ... |
```

---

## 章节 10 — 关键依赖

### 新增 npm 包

| 包名 | 用途 | 安装位置 |
|------|------|---------|
| `<package>` | <说明> | backend / miniapp / webapp |

### 复用模块

| 模块 | 来源 | 用途 |
|------|------|------|
| `<模块名>` | `<路径>` | <说明> |

### 外部服务依赖

| 服务 | 用途 | 接入方式 |
|------|------|---------|
| `<服务名>` | <说明> | <SDK / API / Webhook> |

### 输出格式

```markdown
## 10. 关键依赖

### 新增 npm 包

（表格，无新增则写「无」）

### 复用模块

（表格）

### 外部服务依赖

（表格，无外部依赖则写「无」）
```

---

## 完整输出文件

将以上 10 个章节合并写入：

**路径**：`大纲/PRD/<功能名>/architecture-blueprint.md`

**文件头部**：

```markdown
# 架构蓝图 — <功能名>

> 阶段：3 架构蓝图
> 输入：00-index ~ 09-milestones 共 10 份维度文档
> 产出：代码骨架设计（不含实际代码）
> 日期：YYYY-MM-DD

## 1. 项目目录结构
...
## 2. 前端组件树
...
## 3. 前端路由设计
...
## 4. 前端状态管理
...
## 5. 前端 API 服务层
...
## 6. 后端模块划分
...
## 7. 后端数据库模型映射
...
## 8. 后端中间件设计
...
## 9. Agent 归属表
...
## 10. 关键依赖
...
```
