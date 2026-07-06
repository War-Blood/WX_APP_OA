# Web 端考勤模块交互问题报告

> 审计日期：2026-07-06 | 范围：排班日历、排班规则、考勤汇总、请假出差管理

---

## 一、排班日历（Schedule.vue）— 4 个严重问题 + 4 个一般问题

### 🔴 严重

#### 1.1 粉刷 Popover 交互混乱（第17、154行）

**现象**：点击日历格弹出 Popover，但 Popover 的 `:visible` 和 `trigger="click"` 同时存在产生冲突。`openPaint(date)` 设置 `paintDate = date`，但若用户点开 Popover 不做任何操作就关闭，下次再点击同一日期时 `paintDate === data.day` 始终为 true，Popover 不会重新弹出。

**代码位置**：
- 模板第17行：`:visible="paintDate === data.day"` 与 `trigger="click"` 冲突
- 脚本第154行：`function openPaint(date) { paintStatus.value = 'work'; paintDate.value = date }`

**根因**：`paintStatus` 变量在函数中赋值但模板中从未使用，`openPaint` 内部逻辑是废代码；Popover 的显示/隐藏依赖 `paintDate` 字符串比较，但关闭逻辑靠 `@hide` 事件重置，两个机制互相打架。

#### 1.2 死代码 `doPaint` 函数（第166-175行）

**现象**：`doPaint` 函数定义了但从未被模板调用。它内部调用 `ElMessageBox.confirm` 做二次确认，但 Popover 中的4个按钮全部绑定的是 `doPaintDirect`（直接执行无确认）。用户点击粉刷按钮后，排班立即生效，没有任何确认步骤——风险操作缺少保护。

#### 1.3 日历视图中多个状态人数相等时判断有偏差（第194-200行）

**现象**：
```js
if (c.biz_trip >= max) summary[date] = 'biz_trip'
else if (c.leave >= max) summary[date] = 'leave'
else if (c.work >= max) summary[date] = 'work'
else summary[date] = 'rest'
```
当某个日期 `出差2人、请假2人、上班0人`，`max=2`，`biz_trip >= max` 为 true，主导状态显示"出差"——这是对的。但若 `上班3人、休息3人、出差0人、请假0人`，`max=3`，`work >= max` 为 true，主导状态显示"上班"——但实际上休息和上班人数相同，显示哪个都片面。日历格无法反映"混合状态"的日期。

#### 1.4 粉刷直接将全员设为同一状态，过于粗暴（第215-222行）

**现象**：`doPaintDirect` 获取**全部用户**（userOptions），将某一日期全员设为同一状态（如"请假"）。这意味着一键把所有人包括管理员自己都设为请假。操作没有任何范围限制或二次确认。

---

### 🟡 一般

#### 1.5 `filters` 变量声明但未绑定到 UI（第135行）

声明了 `filters = reactive({ departmentId: null })`，但模板中没有部门筛选器。日历始终加载全员数据，`filters.departmentId` 被传入 `loadData` 但始终为 null——属于无效代码。

#### 1.6 编辑规则深拷贝可能失败（第264-270行）

`JSON.parse(JSON.stringify(row))` 深拷贝对包含 Date 对象或 undefined 的数据会损坏数据。`altWeekConfig` 可能是 null（JSON 不支持 undefined），需要显式处理。

#### 1.7 规则编辑中大小周模式 `altWeekConfig` 运行时可能为 undefined（第96行）

`editingRule.altWeekConfig![String(w)]` 使用了 TypeScript 非空断言，但如果后端返回的规则没有 `altWeekConfig` 字段而 `alternating` 为 true，会导致 `Cannot read properties of undefined` 运行时崩溃。

#### 1.8 应用规则时多次点击不防重（第291-299行）

`doApply` 没有 loading 状态或防重复点击保护。用户快速双击"生成排班"会发送两次请求，可能产生重复数据。

---

## 二、排班规则管理（Schedule.vue 规则部分）— 2 个严重问题 + 1 个一般问题

### 🔴 严重

#### 2.1 清除排班 + 重新应用规则的流程不合理（第249-259行）

**现象**：`handleClear()` 清除当前月全部排班后，toast 提示"已清除，请应用排班规则重新生成"。但：

- 用户必须**手动**打开规则对话框 → 选规则 → 选日期 → 点"生成排班"
- 清除排班后日历全部变空白，没有引导用户下一步
- 如果用户清除了排班但忘记重新应用，所有人将无排班状态

**建议**：清除排班后自动弹出"应用规则"对话框，或至少提供一键"清除并重新应用"的合并操作。

#### 2.2 外场人员排班被隐式强制改出差 — 管理员不可见（后端 schedule.service.js 第180行）

**现象**：`applyRule` 函数中有一行硬编码逻辑：
```js
if (user.is_field_worker && status === 'work') status = 'biz_trip';
```
所有 `is_field_worker=1` 的用户，排班规则设为"上班"的日期，在应用时会被**静默**改为"出差"。这条规则在前端完全没有任何提示或说明，管理员不知道这个隐式转换的存在。

---

### 🟡 一般

#### 2.3 `el-divider` 放在 `el-form-item` 内不符合 Element Plus 规范（模板第88、94行）

大小周模式下，"单周"和"双周"的分隔线放在了表单内部，虽然是视觉分隔但语义上是表单项的子元素，可能导致样式错乱。

---

## 三、考勤汇总（Summary.vue）— 2 个问题

### 🟡 一般

#### 3.1 导出文件名不准确（第101行）

导出文件名硬编码为 `技术工程中心公出加班统计表.xlsx`，但实际上考勤汇总导出的是排班汇总 + 公出加班，名称与内容不完全对应。

#### 3.2 缺少按姓名/工号搜索（第18-41行）

表格只能按部门筛选，没有姓名搜索框。如果管理员想查某一个员工的考勤汇总，需要翻页找。

#### 3.3 默认日期范围月初当天数据太少（第68-70行）

默认显示"本月1号~今天"。如果今天是7月1日，则只显示1天数据。应默认为"上月1号~上月最后一天"或"本月1号~今天（含提示）"。

---

## 四、请假出差管理（LeaveManage.vue）— 2 个严重问题

### 🔴 严重

#### 4.1 管理员页面调用的是个人接口，看不到全员数据

**现象**：LeaveManage.vue 第118行调用 `getLeaveList(params)`，API 层映射到 `/attendance/leave/my-list`。但后端的 `myList`（leave.service.js 第104行）强制过滤 `lr.applicant_id = ?`，只返回**当前登录用户**自己的请假/出差记录。

**结论**：管理员打开「请假出差管理」页面，看到的实际是**自己的**请假出差记录，不是全员的。这是一个功能性 Bug——页面名叫"请假出差管理"，但完全没有"管理全员"的能力。

**代码位置**：
- 前端：`webapp/src/views/attendance/LeaveManage.vue` 第118行
- 后端：`backend/src/features/attendance/services/leave.service.js` 第104-120行
- 路由：`backend/src/features/attendance/routes/attendance.routes.js` 第25行 —— 路由没有 `requireRole('admin')` 中间件

#### 4.2 缺少申请人搜索

即使修复了 4.1，表格也没有按申请人姓名搜索的功能。管理员如果需要找张三的所有请假记录，只能逐页翻。

---

## 五、后端问题汇总

### 🔴 严重

#### 5.1 管理员缺少全员请假/出差查询接口

现有 `/attendance/leave/my-list` 只能查自己的记录。缺少一个 `/attendance/leave/all-list` 或类似接口供管理员查询全员请假出差记录。

### 🟡 一般

#### 5.2 `batch` 函数时区可能出问题（schedule.service.js 第64行）

```js
const dateStr = cur.toISOString().slice(0, 10);
```
`toISOString()` 返回 UTC 时间。如果北京时间为 2026-07-06 23:30，UTC 为 2026-07-06 15:30。但如果 cur 是从 `beijingDate(startDate)` 创建的，其内部时间应该是 UTC+8 的午夜，`toISOString()` 会退一天。需要验证 `beijingDate` 的实现是否正确处理了时区。

#### 5.3 错误提示信息过于泛化

所有 catch 块都只显示"加载失败"/"操作失败"/"保存失败"，用户无法判断是什么原因（网络问题？权限问题？数据冲突？）。应该在后端返回明确的错误消息，前端展示具体内容。

---

## 六、问题严重等级汇总

| 等级 | 数量 | 关键问题 |
|------|------|----------|
| 🔴 严重 | 8 | Popover 交互冲突、管理员看不到全员请假、外场人员隐式改出差、粉刷无确认、清除排班流程断裂 |
| 🟡 一般 | 7 | 死代码、时区风险、缺少搜索、文件名不匹配、错误提示模糊 |

## 七、修复优先级建议

1. **P0（立即修复）**：4.1 — 管理员请假出差管理页面看不到全员数据
2. **P0（立即修复）**：1.1/1.4 — 粉刷 Popover 交互混乱 + 全员粉刷无确认
3. **P1**：2.2 — 外场人员排班隐式改为出差，需增加 UI 提示
4. **P1**：2.1 — 清除排班后缺少引导流程
5. **P2**：5.2 — 时区边界问题验证
6. **P3**：其余一般问题（死代码清理、搜索补全、错误提示优化）
