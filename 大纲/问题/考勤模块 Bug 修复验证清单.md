# 考勤模块 Bug 修复验证清单

> 开发修复完成后，按此清单逐项验证。所有 P0 项必须全部 ✅ 才能通过。

---

## BUG-01 🔴 P0 — 请假类型映射 swap

### 修复内容
| 文件 | 修改 |
|------|------|
| `miniapp/src/pages/attendance/leave-apply/index.vue:49` | `'事假': 'sick'` → `'事假': 'personal'`，`'病假': 'personal'` → `'病假': 'sick'` |
| `miniapp/src/pages/attendance/leave-detail/index.vue:46` | `sick: '事假'` → `sick: '病假'`，`personal: '病假'` → `personal: '事假'` |

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 在 leave-apply 选择「事假」提交 | 后端收到 leaveSubtype="personal" | |
| 2 | 在 leave-apply 选择「病假」提交 | 后端收到 leaveSubtype="sick" | |
| 3 | 在 leave-list 查看步骤1的记录 | 显示「事假」 | |
| 4 | 在 leave-list 查看步骤2的记录 | 显示「病假」 | |
| 5 | 在 leave-detail 查看步骤1的记录 | 显示「事假」 | |
| 6 | 在 leave-detail 查看步骤2的记录 | 显示「病假」 | |
| 7 | 选择「年假」提交 | 全链路显示「年假」 | |
| 8 | 选择「婚假」提交 | 全链路显示「婚假」 | |
| 9 | 选择「丧假」提交 | 全链路显示「丧假」 | |
| 10 | 在 leave-apply 编辑已有请假（修改入口） | leaveTypeIdx 正确回显 | |
| 11 | **历史数据验证**：检查修复前创建的 sadfk/personal 数据 | Web/小程序展示是否受影响 | |

> ⚠️ 步骤 11 是关键：需评估是否需要数据迁移脚本。

---

## BUG-02 🔴 P0 — my-schedule 调用管理员端点

### 修复内容
| 文件 | 修改 |
|------|------|
| `miniapp/src/pages/attendance/my-schedule/index.vue:112` | `attendanceApi.getScheduleList(...)` → `attendanceApi.getMySchedule(...)` |
| `miniapp/src/pages/attendance/my-schedule/index.vue:114` | `res.data?.list` → `res.data`（getMySchedule 返回数组而非分页对象） |

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 普通员工登录小程序，进入「我的排班」 | 页面正常加载，不 403 | |
| 2 | 查看日历数据 | 显示该员工排班 | |
| 3 | 管理员登录，进入「我的排班」 | 页面正常加载 | |
| 4 | 切换月份 | 数据正确刷新 | |

---

## BUG-03 🟡 P1 — leave-detail leaveMap 错误

### 修复内容
与 BUG-01 中 leave-detail 的修复相同。

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 在 leave-detail 查看 sick 类型请假详情 | 显示「病假」 | |
| 2 | 在 leave-detail 查看 personal 类型请假详情 | 显示「事假」 | |

---

## BUG-04 🟡 P1 — leaveSubtype 无白名单

### 修复内容
| 文件 | 修改 |
|------|------|
| `backend/src/features/attendance/services/leave.service.js` | apply() 和 updateRequest() 开头添加白名单校验 |

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 发送 `leaveSubtype: "annual"` | 正常接受 | |
| 2 | 发送 `leaveSubtype: "sick"` | 正常接受 | |
| 3 | 发送 `leaveSubtype: "personal"` | 正常接受 | |
| 4 | 发送 `leaveSubtype: "marriage"` | 正常接受 | |
| 5 | 发送 `leaveSubtype: "funeral"` | 正常接受 | |
| 6 | 发送 `leaveSubtype: "other"` | 正常接受 | |
| 7 | 发送 `leaveSubtype: "invalid_xyz"` | 返回 400 "无效的请假类型" | |
| 8 | 发送 `leaveSubtype: ""` | 返回 code=2810 "请假必须指定子类型" | |

---

## BUG-05 🟡 P1 — 时区依赖

### 修复内容
| 文件 | 修改 |
|------|------|
| 多处 service 文件 | `new Date(dateStr)` → 统一使用 UTC+8 解析 |

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 提交跨日请假 (startDate="2026-07-06", endDate="2026-07-07") | days=2 | |
| 2 | 在 UTC+0 服务器环境验证 | 与 UTC+8 环境结果一致 | |
| 3 | 批量排班跨月 (6月30日~7月2日) | 日期范围正确 | |

---

## BUG-06 🟢 P2 — 出差并发锁

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 正常开始出差 | code=0 | |
| 2 | 已有进行中时再开始 | code=2811 | |
| 3 | 模拟并发：2 个请求同时开始出差 | 仅创建 1 条记录，另 1 条返回 2811 | |

---

## BUG-07 🟢 P2 — 消息通知日志

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 正常请假→消息成功 | 日志无 warn | |
| 2 | 模拟消息写入失败 | 日志出现 warn 级别记录，含 error/receiverId/title | |

---

## BUG-10 🔴 P0 — leave/detail 二次解构返回2802

### 修复内容
| 文件 | 修改 |
|------|------|
| `backend/src/features/attendance/services/leave.service.js:50` | `const [rows] = await db.query(...)` → `const rows = await db.query(...)` |

### 验证步骤

| 步骤 | 操作 | 预期结果 | 结果 |
|:--:|------|------|:--:|
| 1 | 提交一条请假，记下 requestId | code=0 | |
| 2 | 调用 detail 传入该 requestId | code=0，返回完整详情（含 applicantName、leaveSubtype 等） | |
| 3 | 调用 detail 传入不存在的 requestId | code=2802 "申请单不存在" | |
| 4 | 调用 detail 传入出差记录的 requestId | code=0，返回出差详情（含 tripStartedAt、missingDates） | |

---

## 验证结果汇总

| BUG 编号 | 验证人 | 日期 | 结果 |
|:--:|------|------|:--:|
| BUG-01 | | | |
| BUG-02 | | | |
| BUG-03 | | | |
| BUG-04 | | | |
| BUG-05 | | | |
| BUG-06 | | | |
| BUG-07 | | | |
| BUG-10 | | | |

> 验证人签字：_________ 日期：_________ 结论：□ 通过 □ 有条件通过 □ 不通过
