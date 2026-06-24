# 公出日志模块升级 PRD — 小程序 (miniapp/)

> 关联: 总览 `公出日志模块升级-PRD.md` | 配合: 后端 PRD / Web 后台 PRD

---

## 1. 改动概览

| 页面 | 路径 | 改动类型 |
|------|------|:--:|
| 日报填写页 | `pages/employee/report.vue` | **重写** |
| 统计看板 | `pages/profile/stats.vue` | **新增** |
| API 调用层 | `services/modules/report.js` | 扩展 |
| 花名册选人组件 | `components/worker-picker.vue` | **新增** |

---

## 2. 日报填写页（核心改造）

### 2.1 页面顶部 — 日志类型 Tab

```
┌─────────────────────────────┐
│  [公出日志] [补公出日志] [公司日报] │  ← 三个 Tab 切换
├─────────────────────────────┤
│  选择日期: [2026-06-12] ▼    │  ← 公出日志默认今天
│                             │  ← 补公出日志可选历史日期
├─────────────────────────────┤
│  工作类型: (六个按钮)         │
│  [工作陆][工作海][待工]       │
│  [在途][请假][调休]          │
└─────────────────────────────┘
```

### 2.2 公出日志表单（reportType = biz_trip）

```
项目名称   [搜索/输入]            ← 必填
项目区域   [搜索/输入]            ← 必填
关联方     [浙江贝良 ▼]         ← 从历史记录选择
作业人员   [张云峰 ×] [韦少校 ×]  ← 花名册搜索多选（必填）
          [+ 添加人员]
机型       [MySE233 ▼]
工作内容   [文本输入]
需求数量   [___]
完成数量   [___]
备注       [文本输入]
今日工作   [文本输入]            ← 必填
今日类型   = 上方工作类型选择
明日类型   [工作（陆） ▼]
```

### 2.3 补公出日志表单（reportType = biz_trip_supplement）

同公出日志表单 + 额外字段：

```
补录日期   [2026-06-10] ▼       ← 必选，不超过今天
补录原因   [说明为什么漏填...]    ← 必填
```

提交后 toast："已提交，等待管理员审核"，日志不立即显示在看板中。

**提交函数**：entryDate/initialBizTripDate 不要求用户填写，从 store 自动带入：
```js
async function handleSubmit() {
  const payload = {
    reportType: currentTab.value,        // 'biz_trip' | 'biz_trip_supplement' | 'office'
    reportDate: selectedDate.value,
    todayWorkType: selectedWorkType.value,
    tomorrowWorkType: tomorrowType.value,
    // entryDate/initialBizTripDate 从 store 自动获取，用户不可见
    entryDate: userStore.entryDate,
    initialBizTripDate: userStore.entryDate,
    // 请假/调休 → workerIds 传空数组
    workerIds: (selectedWorkType.value === '请假' || selectedWorkType.value === '调休') 
      ? [] : selectedWorkers.value.map(w => w.userId),
    // ... 其余字段
  }
  await reportApi.submit(payload)
}
```

### 2.4 公司日报表单（reportType = office）

简化表单：

```
今日工作内容   [文本输入]        ← 必填
明日工作计划   [文本输入]
遇到的问题     [文本输入]
需协调事项     [文本输入]
```

---

## 3. 花名册选人组件 (worker-picker)

### 交互

```
点击 [+ 添加人员]
       ↓
弹出搜索面板
  ┌───────────────────┐
  │ 🔍 [搜索人员...]   │
  │                   │
  │ ☑ 张云峰(UID1026) │  ← 搜索结果，勾选
  │ ☐ 韦少校(UID1038) │
  │ ☑ 王腾(UID1042)   │
  │                   │
  │ 已选: 张云峰, 王腾  │
  │     [确认] [取消]   │
  └───────────────────┘
```

### 数据来源

调用 `POST /api/admin/workers { action: 'list' }` 获取花名册。

---

## 4. 选择「请假/调休」后的行为

```js
watch(todayWorkType, (val) => {
  if (val === '请假' || val === '调休') {
    showContentFields = false   // 隐藏 project/area/workers/machine/qty/workContent/todayWork
  } else {
    showContentFields = true
  }
})
```

提交时传 `workerIds: []`（空数组），后端跳过代填关联写入。`entryDate` 和 `initialBizTripDate` 从 store 自动带入，无需手填。

---

## 5. 代填检测（进入页面时）

```js
onMounted(async () => {
  const res = await reportApi.checkDuplicate({
    userId: userStore.userId,
    reportDate: selectedDate
  })
  if (res.code === 2001) {
    // 展示"已代填"提示，隐藏表单
    showForm = false
    substituteMsg = `当日公出日志已由 ${res.data.submittedBy} 代填`
  }
})
```

**UI 表现**：

```
┌─────────────────────────────┐
│  📋 当日公出日志已提交        │
│  由 张云峰 代填               │
│                             │
│  [查看日志]  ← 只读模式       │
└─────────────────────────────┘
```

---

## 6. 统计看板（新增页面 pages/profile/stats）

### 页面布局

```
┌─────────────────────────────┐
│  📊 公出日志统计              │
│  入场日期: 2026-03-04         │
├─────────────────────────────┤
│                             │
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 156  │ │  12  │ │  5   │ │
│  │累计条│ │当月条│ │缺失天│ │
│  └──────┘ └──────┘ └──────┘ │
│  ┌──────┐                   │
│  │  3   │                   │
│  │延迟条│                   │
│  └──────┘                   │
│                             │
├─────────────────────────────┤
│  缺失日期 (最近)              │
│  • 06-08 • 06-07 • 06-05     │
│  • 06-03 • 06-01             │
├─────────────────────────────┤
│  同组日志 (最近7天)           │
│  冯双     06-11 工作（陆）→  │
│  曹国永   06-11 在途    →   │
│  冯双     06-10 待工    →   │
└─────────────────────────────┘
```

### 同组日志点击

点击某条同组日志 → 跳转只读详情页（不可编辑），展示完整内容。

### 月度工作占比

在统计看板页面下方新增「月度工作占比」区块：

```
┌─────────────────────────────┐
│  6月工作占比                 │
│  已填报: 13天               │
├─────────────────────────────┤
│  工作（陆） ████████████  61.5%  8天 │
│  工作（海） ████          15.4%  2天 │
│  待工       ██            7.7%  1天 │
│  请假       ██            7.7%  1天 │
│  调休       ██            7.7%  1天 │
└─────────────────────────────┘
```

---

## 7. 管理层看板（管理员专属）

### 7.1 员工当日状态（管理员在统计看板可切换）

管理员进入统计看板后，顶部增加 Tab 切换：「个人统计」「全员当日」

```
┌─────────────────────────────┐
│  [个人统计] [全员当日]        │
├─────────────────────────────┤
│  2026-06-13                 │
│  已提交30 | 已代填5 | 补公出2 │
│  请假2 | 调休1 | 缺失2       │
├─────────────────────────────┤
│  张云峰  BL001 锡盟基地     │
│  工作（陆） 已提交 08:30    │
│  韦少校  BL002 莆田平海湾   │
│  工作（海） 已代填(张云峰)   │
│  田子民  BL004 —           │
│  请假     —                │
│  李余伟  BL005 —           │
│  未提交   ⚠                │
└─────────────────────────────┘
```

列表按状态排序：未提交 → 已代填 → 补公出 → 已提交 → 请假/调休（方便管理员优先关注异常）。

> **说明**：具体看板交互可后续精进，当前先实现基础列表 + 状态汇总。

---

## 8. API 调用层扩展 (services/modules/report.js)

```js
import { post } from '../request'

export const reportApi = {
  // 原有
  getList:    (params) => post('/api/report/list', params),
  submit:     (data)   => post('/api/report/submit', data),

  // 新增
  checkDuplicate:   (params) => post('/api/report/check-duplicate', params),
  getStats:         (params) => post('/api/report/stats', { scope: 'user', ...params }),
  getTeamLogs:      (params) => post('/api/report/team-logs', params),
  supplementReview: (params) => post('/api/report/supplement-review', params),

  // 管理层看板
  getDailyStatus:   (params) => post('/api/report/daily-status', params),
  getMonthlySummary:(params) => post('/api/report/monthly-summary', params),
}

// services/modules/admin.js — 花名册调用（供选人组件使用）
import { post } from '../request'
export const adminApi = {
  getWorkerList: (params) => post('/api/admin/workers', { action: 'list', ...params }),
}
```

---

## 9. 路由配置 (pages.json)

```json
{
  "pages": [
    // 新增统计看板（含个人统计 + 管理员全员当日状态）
    {
      "path": "pages/profile/stats",
      "style": { "navigationBarTitleText": "公出统计" }
    }
  ]
}
```

---

## 10. 状态管理 (stores/user.js)

新增字段：

```js
export const useUserStore = defineStore('user', () => {
  // 原有...
  const entryDate = ref(null)           // 入场日期
  const workerStatus = ref('active')    // 外场人员状态

  return { ..., entryDate, workerStatus }
})
```

---

## 11. 交互细节

| 场景 | 行为 |
|------|------|
| 选"请假/调休" | 动画收起内容区，标签显示"无需填写" |
| 补公出日志审核中 | 列表页该条目显示「审核中」tag，点击可查看但不可编辑 |
| 审核通过 | 推送通知："补公出日志已通过审核" |
| 审核驳回（非特殊） | 推送通知："补公出日志已标记为延迟" |
| 网络异常 | 草稿自动保存到本地 Storage（防丢） |
| 管理员看全员状态 | 统计看板切换「全员当日」Tab，默认按异常优先排序 |
| 月度占比 | 统计看板下方展示，按工作类型条形图 + 百分比 |
