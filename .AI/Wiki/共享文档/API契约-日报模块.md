# API 契约 — 日报模块

> **提供方**: core-agent（`backend/src/core/`）
> **消费方**: miniapp-core-agent（`miniapp/src/pages/employee/`）、webapp-core-agent（`webapp/src/views/report/`）
> **版本**: v2.0 | **最后更新**: 2026-06-13

---

## 契约原则

1. **提供方负责**: core-agent 保证 API 签名和响应格式稳定，接口变更前必须提前通知消费方
2. **消费方负责**: miniapp-core-agent / webapp-core-agent 严格按此契约构造请求，不自行猜测字段
3. **变更流程**: 消费方需要新字段 → 向 orchestrator 提需求 → core-agent 评估 → 扩展 API → 更新本文档 → 消费方对接

---

## 接口清单

### 1. POST /api/report/submit — 提交日报（v2.0 改造）

**请求体**:
```json
{
  "reportType": "biz_trip",
  "reportDate": "2026-06-13",
  "project": "锡盟基地",
  "area": "内蒙古",
  "relatedParty": "浙江贝良",
  "workerIds": [7, 8],
  "machineModel": "MySE233",
  "workContent": "日常巡检",
  "requiredQty": 10,
  "completedQty": 5,
  "remark": "",
  "todayWork": "完成巡检任务",
  "todayWorkType": "工作（陆）",
  "tomorrowWorkType": "工作（陆）",
  "entryDate": "2026-03-04",
  "initialBizTripDate": "2026-05-27",
  "supplementDate": "2026-06-10",
  "supplementReason": "海上无信号",
  "todayWork": "完成文档整理",
  "tomorrowPlan": "继续整理",
  "issues": "",
  "coordination": ""
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|:--:|------|
| `reportType` | enum | ✅ | `biz_trip` / `biz_trip_supplement` / `office` |
| `reportDate` | date | ✅ | 日报日期，格式 `YYYY-MM-DD` |
| `project` | string | biz_trip时必填 | 项目名称 |
| `area` | string | biz_trip时必填 | 项目区域 |
| `workerIds` | int[] | biz_trip时必填 | 作业人员 UID 数组，请假/调休传 `[]` |
| `todayWorkType` | string | ✅ | 工作（陆）/工作（海）/待工/在途/请假/调休 |
| `supplementDate` | date | supplement时必填 | 补录目标日期 |
| `supplementReason` | text | supplement时必填 | 补录原因 |
| `todayWork` | string | office时必填 | 今日工作内容 |

**成功响应**:
```json
{ "code": 0, "message": "success", "data": { "reportId": 1908 } }
```

**错误码**:
| code | 含义 | 前端处理 |
|------|------|---------|
| `0` | 成功 | 跳转返回 |
| `2001` | 当日已被代填 | 显示"已由XX代填"提示，隐藏表单 |
| `1001` | 参数校验失败 | 显示 `message` 字段内容，标红对应字段 |
| `1002` | 权限不足 | 跳转登录页 |

**调用时序**:
```
小程序日报填写页:
  onMounted → check-duplicate（检测是否被代填）
           → 未被代填 → 加载草稿（如有）
           → 用户填写 → submit
           → 成功 → toast → 返回列表

Web后台日报管理:
  不直接调用 submit（Web后台只做管理，不做提交）
```

---

### 2. POST /api/report/check-duplicate — 检查当日是否已被代填（v2.0 新增）

**请求体**:
```json
{ "userId": 7, "reportDate": "2026-06-13" }
```

**响应 — 未被代填**:
```json
{ "code": 0, "message": "success", "data": { "canSubmit": true } }
```

**响应 — 已被代填**:
```json
{
  "code": 2001,
  "message": "当日公出日志已由 张云峰 代填",
  "data": { "submittedBy": "张云峰", "reportId": 1906 }
}
```

---

### 3. POST /api/report/stats — 统计看板（v2.0 新增）

**请求体（三种 scope）**:
```json
{ "scope": "user", "userId": 7 }
{ "scope": "all" }
{ "scope": "project" }
```

**scope=user 响应**:
```json
{
  "code": 0,
  "data": {
    "scope": "user",
    "totalCount": 156,
    "monthCount": 12,
    "missingDays": 5,
    "missingDates": ["2026-06-08", "2026-06-07", "..."],
    "delayedCount": 3,
    "entryDate": "2026-03-04"
  }
}
```

**scope=all 响应**:
```json
{
  "code": 0,
  "data": {
    "scope": "all",
    "totalLogs": 1907,
    "monthNew": 54,
    "delayedTotal": 12,
    "missingPersonCount": 23
  }
}
```

**scope=project 响应**:
```json
{
  "code": 0,
  "data": {
    "scope": "project",
    "projects": [
      { "project": "锡盟基地", "total": 45, "month": 3, "missing": 0 }
    ]
  }
}
```

---

### 4. POST /api/report/pending-reviews — 补公出待审核列表（v2.0 新增）

**请求体**:
```json
{ "status": "pending", "page": 1, "pageSize": 20 }
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "reportId": 1910,
        "reportDate": "2026-06-10",
        "supplementDate": "2026-06-08",
        "submitterName": "张云峰",
        "project": "广西百色板桃国家电投风电场",
        "supplementReason": "海上无信号",
        "status": "pending_review",
        "createdAt": "2026-06-11 09:30:00"
      }
    ],
    "total": 5
  }
}
```

---

### 5. POST /api/report/supplement-review — 补公出审核判定（v2.0 新增）

**请求体**:
```json
{ "reportId": 1910, "decision": "special", "comment": "海上作业无信号" }
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `decision` | enum | `special`(特殊情况→正常) / `forget`(忘记→延迟) |
| `comment` | string | 审核意见（可选） |

**响应**:
```json
{ "code": 0, "message": "审核完成" }
```

---

### 6. POST /api/report/daily-status — 全员当日状态（v2.0 新增）

**请求体**:
```json
{ "date": "2026-06-13" }
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "date": "2026-06-13",
    "totalWorkers": 45,
    "summary": {
      "submitted": 30,
      "supplement": 2,
      "office": 3,
      "substituted": 5,
      "leave": 2,
      "rest": 1,
      "missing": 2
    },
    "workers": [
      {
        "userId": 7,
        "userName": "张云峰",
        "workerCode": "BL001",
        "project": "锡盟基地",
        "workType": "工作（陆）",
        "status": "submitted",
        "submittedAt": "2026-06-13 08:30:00",
        "substituteBy": null
      }
    ]
  }
}
```

**status 枚举**: `submitted`(已提交) | `supplement`(补公出) | `office`(公司日报) | `substituted`(已代填) | `leave`(请假) | `rest`(调休) | `missing`(未提交)

---

### 7. POST /api/report/monthly-summary — 月度工作占比（v2.0 新增）

**请求体**:
```json
{ "userId": 7, "month": "2026-06" }
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "userId": 7,
    "userName": "张云峰",
    "month": "2026-06",
    "totalSubmitted": 13,
    "workDays": 22,
    "breakdown": {
      "工作（陆）": 8,
      "工作（海）": 2,
      "待工": 1,
      "在途": 0,
      "请假": 1,
      "调休": 1
    },
    "ratio": {
      "工作（陆）": "61.5%",
      "工作（海）": "15.4%",
      "待工": "7.7%",
      "在途": "0%",
      "请假": "7.7%",
      "调休": "7.7%"
    }
  }
}
```

---

### 8. POST /api/report/team-logs — 同组日志（v2.0 新增，P2）

**请求体**:
```json
{ "userId": 7, "days": 7 }
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "teamMembers": [
      { "userId": 8, "userName": "冯双" }
    ],
    "logs": []
  }
}
```

---

## 前端消费方对接清单

| 接口 | 小程序调用位置 | Web后台调用位置 |
|------|--------------|---------------|
| `/api/report/submit` | `report-edit → handleSubmit()` | — |
| `/api/report/check-duplicate` | `report-edit → onMounted()` | — |
| `/api/report/stats` (user) | `stats → onMounted()` | — |
| `/api/report/stats` (all/project) | — | `views/report/stats.vue` |
| `/api/report/pending-reviews` | `review-list` | `views/report/audit.vue` |
| `/api/report/supplement-review` | `review-detail` | `views/report/audit.vue` |
| `/api/report/daily-status` | `stats（管理员Tab）` | `views/report/daily-status.vue` |
| `/api/report/monthly-summary` | `stats（月度占比区块）` | `views/report/monthly-summary.vue` |
| `/api/report/team-logs` | `stats（同组日志）` | — |
