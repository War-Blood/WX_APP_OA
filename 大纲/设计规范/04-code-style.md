# 04 — 代码编写规范

## 后端 (Node.js)

### 基本要求

- 分号结尾（semicolons）
- 2 空格缩进
- JSDoc 注释所有导出函数
- `'use strict'` 文件头

### 文件模式

```js
'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 函数说明
 * @param {string} name - 参数
 * @returns {Promise<Object>}
 */
async function doSomething(name) {
  const rows = await db.query('SELECT * FROM table WHERE col = ?', [name]);
  return rows;
}

module.exports = { doSomething };
```

### 相对路径规则

从 `backend/src/features/<module>/services/` 引用 `common/` 时：
```js
// ✅ 正确：3 级上溯
require('../../../common/config/database')
// ❌ 错误：4 级（多了一层到 backend/）
require('../../../../common/config/database')
```

| 文件位置 | → common/ | 路径 |
|---------|-----------|------|
| `features/<mod>/services/*.js` | `src/common/` | `../../../common/` |
| `features/<mod>/controllers/*.js` | `src/common/` | `../../../common/` |
| `features/<mod>/routes/*.js` | `src/common/` | `../../../common/` |
| `core/services/*.js` | `src/common/` | `../../common/` |

## 小程序 (uni-app)

- 无分号
- 2 空格缩进
- `rpx` 单位
- `<script setup>` 语法
- SCSS scoped

## Webapp (Vue 3 + TS)

- 无分号
- 2 空格缩进
- `<script setup lang="ts">` 语法
- 懒加载路由 `() => import(...)`
- 操作后必须 `loadData()` 刷新

## 禁止项（全部端）

- ❌ `console.log` / `debugger`（提交前清理）
- ❌ 硬编码密钥/密码
- ❌ 注释掉的代码块
- ❌ `catch {}` 空块（至少记录 toast 或日志）
- ❌ Mock/假数据
