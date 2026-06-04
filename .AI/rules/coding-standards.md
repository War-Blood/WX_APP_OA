# 编码规范 — Coding Standards

## 适用范围

- **适用对象**: 所有 AI 工具（Qoder / Cursor / Claude Code / Trae）
- **触发场景**: 执行任何代码生成、重构、修改任务时
- **预期产出**: 符合规范的代码

---

## 通用规范

### 语言与风格
- 前端: JavaScript/TypeScript (Vue 3 Composition API, `<script setup>`)
- 后端: Node.js (CommonJS, `require/module.exports`)
- 数据库: SQL (参数化查询，禁止拼接字符串)

### 命名约定

| 元素 | 规范 | 示例 |
|------|------|------|
| 文件名 (JS/TS) | kebab-case | `user-service.js`, `approval-controller.ts` |
| 文件名 (Vue) | kebab-case | `user-list.vue`, `approval-detail.vue` |
| 变量/函数 | camelCase | `userList`, `getUserById()` |
| 类/构造函数 | PascalCase | `UserService`, `DatabasePool` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DB_CONFIG` |
| 数据库表 | snake_case | `review_records`, `daily_reports` |
| 数据库字段 | snake_case | `user_name`, `create_time` |
| API 路由 | kebab-case | `/api/approval/list`, `/api/report/detail` |

### 缩进与格式
- 缩进: 2 空格（禁止 Tab）
- 行尾: LF（Unix），禁止 CRLF
- 末尾空行: 文件末尾保留一个空行
- 行最大长度: 120 字符
- 引号: 单引号 `'string'`（JS/TS），双引号 `"string"`（SQL）
- 分号: 必须加分号

---

## 后端规范 (backend/)

### 分层架构

```
routes/ → 路由层（分发、中间件绑定）
controllers/ → 控制器层（参数校验 Joi、响应封装）
services/ → 服务层（业务逻辑、事务管理）
config/ → 数据访问层（MySQL 参数化查询、Redis）
```

**约束**:
- 路由层只做分发，不写业务逻辑
- 控制器层负责参数校验和响应格式化
- 服务层包含所有业务逻辑，可跨控制器复用
- 数据访问层只做 SQL 执行，不掺杂业务判断

### 统一响应格式

```javascript
// 成功
{ code: 0, message: "success", data: { ... } }

// 失败
{ code: 1001, message: "参数校验失败", data: null }

// 分页
{ code: 0, message: "success", data: { list: [...], total: 100 } }
```

> 完整错误码清单和错误处理分层请参见 `.AI/Wiki/开发规范/错误处理规范.md`

### API 路由规范
- 统一前缀: `/api/`
- 路径: 模块名/动作，如 `/api/approval/list`
- 方法: GET（查询）、POST（创建/操作）、PATCH（部分更新）、DELETE（删除）

---

## 前端规范 (miniapp/)

### 样式规范
- 单位: rpx（小程序）、px（Web）
- 主色: `#2B6DE8`（高效蓝）
- 背景色: `#F7F7F7`
- 卡片圆角: `20rpx`

### API 调用
- 统一通过 `services/modules/*.js` 调用后端
- 禁止硬编码假数据
- 统一错误处理: `showToast` + 日志

---

## Web 管理后台规范 (webapp/)

- TypeScript 严格模式
- 禁止使用 `any` 类型（特殊情况须加注释说明）
- 组件使用 Element Plus 组件库
- 状态管理使用 Pinia
- 路由配置使用 Vue Router

---

## 注释规范

```javascript
// 行注释: 解释复杂逻辑，与代码同行或上一行

/**
 * JSDoc: 公共函数/方法必须添加
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 用户信息
 */
```

- 公共函数/API 接口必须加 JSDoc
- 复杂业务逻辑必须加行注释
- 禁止注释掉的死代码（直接删除）

---

## 参数校验（Joi）

### 校验中间件工厂

项目已内置 `src/middleware/validator.js`，提供基于 Joi 的声明式参数校验：

```javascript
// src/middleware/validator.js — 核心模式
const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,   // 一次返回所有错误，而非遇到第一个就停止
      allowUnknown: false, // 拒绝未定义的字段
      stripUnknown: true,  // 自动剔除未定义字段
    });

    if (error) {
      const messages = error.details.map(d =>
        `${d.path.join('.')}: ${d.message.replace(/"/g, '')}`
      );
      throw new ValidationError(`参数校验失败: ${messages.join('; ')}`);
    }

    req[source] = value; // 用校验净化后的值替换原始数据
    next();
  };
}
```

### Schema 定义示例

```javascript
const Joi = require('joi');

// 创建用户 — 请求体校验
const createUserSchema = Joi.object({
  username: Joi.string().min(2).max(30).required()
    .messages({ 'string.empty': '用户名不能为空' }),
  password: Joi.string().min(6).max(50).required(),
  nickName: Joi.string().max(20).optional().allow(''),
  role: Joi.string().valid('employee', 'admin', 'superadmin').default('employee'),
  department: Joi.string().max(50).optional(),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional()
    .messages({ 'string.pattern.base': '手机号格式不正确' }),
  email: Joi.string().email().optional(),
});

// 分页查询 — 查询参数校验
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  keyword: Joi.string().max(50).optional().allow(''),
  status: Joi.string().valid('active', 'disabled').optional(),
});

// 审批创建 — 嵌套对象 + 数组
const createApprovalSchema = Joi.object({
  approvalTypeId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  title: Joi.string().min(2).max(100).required(),
  formData: Joi.object().default({}),
  attachments: Joi.array().items(Joi.string().uri()).default([]),
  urgent: Joi.boolean().default(false),
  approverId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  ccIds: Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number())).default([]),
});
```

### 路由中使用

```javascript
const { validate } = require('../../common/middleware/validator');

// 校验 body
router.post('/create', authenticate, validate(createUserSchema), userController.create);

// 校验 query 参数
router.get('/list', authenticate, validate(paginationSchema, 'query'), userController.list);

// 组合多个校验（body + params）
// 可通过两次 validate 串联：
// router.post('/:id/update', validate(paramsSchema, 'params'), validate(updateSchema, 'body'), handler);
```

### Joi 常用方法速查

| 方法 | 说明 | 示例 |
|------|------|------|
| `.required()` | 必填 | `Joi.string().required()` |
| `.optional()` | 可选 | `Joi.string().optional()` |
| `.default(v)` | 默认值 | `Joi.number().default(10)` |
| `.allow('')` | 允许空字符串 | `Joi.string().allow('')` |
| `.valid(...)` | 枚举值 | `Joi.string().valid('a', 'b')` |
| `.min(n)` / `.max(n)` | 最小/最大 | `Joi.string().min(2).max(50)` |
| `.pattern(r)` | 正则 | `Joi.string().pattern(/^1[3-9]\d{9}$/)` |
| `.email()` | 邮箱格式 | `Joi.string().email()` |
| `.integer()` | 整数 | `Joi.number().integer()` |
| `.items(s)` | 数组元素 | `Joi.array().items(Joi.string())` |
| `.messages({})` | 自定义错误消息 | `{ 'string.empty': '不能为空' }` |
| `.alternatives().try()` | 多类型兼容 | `Joi.alternatives().try(Joi.string(), Joi.number())` |

---

## ESLint 配置

### Web 管理后台 (`webapp/eslint.config.js`)

采用 ESLint Flat Config，融合 TypeScript + Vue 规则：

```javascript
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default [
  // 忽略目录
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/node_modules/**', '**/*.d.ts']
  },
  // 基础推荐规则
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  // 项目自定义规则
  {
    files: ['**/*.{vue,ts,tsx}'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'all',
        argsIgnorePattern: '^_',           // 允许 _ 前缀的未使用参数
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',   // 允许 _ 前缀的 catch 变量
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
]
```

### 后端 (`backend/`) — ESLint 8 传统配置模式

```javascript
// .eslintrc.json
{
  "env": {
    "node": true,
    "es2022": true,
    "jest": true
  },
  "extends": ["eslint:recommended"],
  "parserOptions": {
    "ecmaVersion": 2022
  },
  "rules": {
    "no-console": "off",              // 后端使用 winston，console 用于调试
    "no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }],
    "semi": ["error", "always"],
    "quotes": ["error", "single", { "avoidEscape": true }],
    "indent": ["error", 2],
    "no-trailing-spaces": "error",
    "eol-last": ["error", "always"],
    "max-len": ["warn", { "code": 120 }]
  }
}
```

### 关键 ESLint 规则对照

| 规则 | 前端 (webapp) | 后端 (backend) | 说明 |
|------|---------------|----------------|------|
| 分号 | TypeScript 默认 | `semi: always` | 必须加分号 |
| 引号 | TypeScript 默认 | `quotes: single` | 单引号 |
| 缩进 | TypeScript 默认 (4) | `indent: 2` | 后端 2 空格 |
| 未使用变量 | `@typescript-eslint/no-unused-vars` | `no-unused-vars` | `_` 前缀免检 |
| 行长度 | 默认 120 | `max-len: 120` | 120 字符 |
| any 类型 | `off` (允许) | N/A | Vue 模板中部分场景需 any |
| 组件名 | `multi-word: off` | N/A | 允许单名单文件组件 |

> **提交前检查**: 前端 `npm run lint` / `npm run type-check`，后端 `npm run lint`
