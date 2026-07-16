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

## 时区规范（强制 🔴）

**所有时间操作必须使用 UTC+8 北京时间。禁止直接使用 `new Date(dateStr)`。**

```js
// ✅ 正确
const { beijingDate, beijingToday } = require('../../../common/utils/date');
const cur = beijingDate(startDate);

// ❌ 错误
const cur = new Date(startDate);  // 依赖服务器本地时区，可能偏移
```

### 后端工具

`backend/src/common/utils/date.js`：

| 函数 | 用途 | 示例 |
|------|------|------|
| `beijingDate(str)` | 解析 `YYYY-MM-DD` 为北京时间 00:00 | `beijingDate('2026-07-16')` |
| `beijingToday()` | 北京时间今天的 `YYYY-MM-DD` 字符串 | `beijingToday()` → `'2026-07-16'` |
| `beijingNow()` | 北京时间今天 00:00 的 Date 对象 | `beijingNow()` |

### 小程序端

```js
// 小程序日期统一使用本地时间截取（手机已设置北京时间）
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
```

## 禁止项（全部端）

- ❌ `console.log` / `debugger`（提交前清理）
- ❌ 硬编码密钥/密码
- ❌ 注释掉的代码块
- ❌ `catch {}` 空块（至少记录 toast 或日志）
- ❌ Mock/假数据
- ❌ `new Date(dateStr)` 无时区指定（必须走 `beijingDate()`）
