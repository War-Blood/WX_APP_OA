# 智慧办公助手 OA 小程序 — 后端接口文档

> **版本：** v1.0.0  
> **生成日期：** 2026-05-29  
> **基础地址：** `https://warblood.online`  
> **认证方式：** Bearer Token（JWT），除登录接口外均需在 Header 中携带 `Authorization: Bearer <token>`  
> **统一响应格式：**

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| code 值 | 含义 |
|---------|------|
| 0 | 成功 |
| 401 | 未授权/Token 过期 |
| 403 | 无权限 |
| 1001 | 参数校验失败 |
| 1002 | 资源不存在 |
| 2001 | 业务逻辑错误 |

---

## 目录

1. [认证模块](#1-认证模块-auth)
2. [用户模块](#2-用户模块-user)
3. [审批模块](#3-审批模块-approval)
4. [日报模块](#4-日报模块-report)
5. [审核模块](#5-审核模块-review)
6. [消息模块](#6-消息模块-message)
7. [公告模块](#7-公告模块-announcement)
8. [项目管理模块](#8-项目管理模块-project)
9. [资产管理模块](#9-资产管理模块-asset)
10. [数据统计模块](#10-数据统计模块-stats)
11. [通用数据结构](#11-通用数据结构)
12. [角色权限体系](#12-角色权限体系)
13. [错误码汇总](#13-错误码汇总)

---

## 1. 认证模块 (Auth)

### 1.1 微信登录

**POST** `/api/auth/login`

微信小程序端调用 `wx.login()` 获取 `code`，发送到后端换取用户 Token 和基本信息。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信登录凭证 wx.login() 返回的 code |

**请求示例：**

```json
{
  "code": "0a3xxx..."
}
```

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | JWT Token，后续请求携带 |
| userInfo | object | 用户基本信息 |
| userInfo.openid | string | 微信 OpenID |
| userInfo.nickName | string | 用户昵称 |
| userInfo.avatarUrl | string | 头像 URL |
| userInfo.role | string | 角色：`employee` / `admin` / `superadmin` |
| userInfo.department | string | 所属部门 |
| userInfo.userId | string | 系统用户 ID |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userInfo": {
      "openid": "oXXXX...",
      "nickName": "张三",
      "avatarUrl": "https://...",
      "role": "employee",
      "department": "技术部",
      "userId": "U10001"
    }
  }
}
```

**备注：**
- 后端需调用微信 `code2Session` 接口：`GET https://api.weixin.qq.com/sns/jscode2session?appid=APPID&secret=SECRET&js_code=CODE&grant_type=authorization_code`
- 首次登录自动注册用户，已有用户直接返回信息
- Token 有效期建议 7 天，过期返回 401

---

## 2. 用户模块 (User)

### 2.1 获取用户资料

**GET** `/api/user/profile`

获取当前登录用户的详细资料。

**请求头：**

| Header | 值 |
|--------|-----|
| Authorization | Bearer \<token\> |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | string | 用户 ID |
| nickName | string | 昵称 |
| avatarUrl | string | 头像 |
| role | string | 角色 |
| department | string | 部门 |
| phone | string | 手机号 |
| email | string | 邮箱 |
| joinDate | string | 入职日期 |
| permissions | string[] | 权限列表 |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": "U10001",
    "nickName": "张三",
    "avatarUrl": "https://...",
    "role": "employee",
    "department": "技术部",
    "phone": "138****1234",
    "email": "zhangsan@company.com",
    "joinDate": "2025-03-01",
    "permissions": ["approval:create", "report:submit", "message:read"]
  }
}
```

### 2.2 更新用户资料

**PUT** `/api/user/profile`

更新当前用户的基本资料。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickName | string | 否 | 昵称 |
| avatarUrl | string | 否 | 头像 URL |
| phone | string | 否 | 手机号 |
| email | string | 否 | 邮箱 |

**响应数据：** 同 2.1 获取用户资料

### 2.3 获取用户列表（管理员）

**POST** `/api/admin/users`

管理员获取系统用户列表，支持分页和筛选。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |
| keyword | string | 否 | 搜索关键词（姓名/部门） |
| role | string | 否 | 角色筛选 |
| department | string | 否 | 部门筛选 |
| status | string | 否 | 状态筛选：active / disabled |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| list | object[] | 用户列表 |
| list[].userId | string | 用户 ID |
| list[].nickName | string | 昵称 |
| list[].avatarUrl | string | 头像 |
| list[].role | string | 角色 |
| list[].department | string | 部门 |
| list[].status | string | 状态：active / disabled |
| list[].lastLoginTime | string | 最后登录时间 |

### 2.4 设置管理员（管理员）

**POST** `/api/admin/setAdmin`

设置或取消用户的管理员角色。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 目标用户 ID |
| role | string | 是 | 目标角色：admin / employee |

**响应数据：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": "U10002",
    "role": "admin"
  }
}
```

### 2.5 禁用/启用用户（管理员）

**POST** `/api/admin/toggleUser`

禁用或启用指定用户。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 目标用户 ID |
| status | string | 是 | active / disabled |

---

## 3. 审批模块 (Approval)

### 3.1 获取审批列表

**POST** `/api/approval/list`

获取审批列表，支持按 Tab（待审批/我发起的/已处理）和类型筛选。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tab | string | 是 | pending（待审批）/ mine（我发起的）/ done（已处理） |
| type | string | 否 | 审批类型筛选：all / leave / expense / seal / travel / purchase |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| list | object[] | 审批列表 |
| list[].id | string | 审批 ID |
| list[].title | string | 审批标题（如"请假申请"） |
| list[].type | string | 审批类型：leave / expense / seal / travel / purchase / general |
| list[].applicant | string | 申请人姓名 |
| list[].applicantDept | string | 申请人部门 |
| list[].applicantId | string | 申请人用户 ID |
| list[].date | string | 申请日期 |
| list[].status | string | 状态：pending / approved / rejected |
| list[].statusText | string | 状态文案：待审批 / 已通过 / 已驳回 |
| list[].iconBg | string | 图标背景色 |
| list[].iconSrc | string | 图标路径 |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 15,
    "list": [
      {
        "id": "AP20260527001",
        "title": "请假申请",
        "type": "leave",
        "applicant": "李四",
        "applicantDept": "技术部",
        "applicantId": "U10002",
        "date": "2026-05-27",
        "status": "pending",
        "statusText": "待审批",
        "iconBg": "#FFF3E0",
        "iconSrc": "/static/images/approval/leave.png"
      }
    ]
  }
}
```

### 3.2 获取审批详情

**POST** `/api/approval/detail`

获取单条审批的详细信息。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 审批 ID |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 审批 ID |
| title | string | 审批标题 |
| type | string | 审批类型 |
| status | string | 状态 |
| statusText | string | 状态文案 |
| applicant | object | 申请人信息 |
| applicant.userId | string | 申请人 ID |
| applicant.nickName | string | 申请人姓名 |
| applicant.department | string | 申请人部门 |
| applicant.avatarUrl | string | 申请人头像 |
| formData | object | 审批表单数据（按类型不同，见下方说明） |
| approver | object | 审批人信息 |
| approver.userId | string | 审批人 ID |
| approver.nickName | string | 审批人姓名 |
| ccList | object[] | 抄送人列表 |
| ccList[].userId | string | 抄送人 ID |
| ccList[].nickName | string | 抄送人姓名 |
| createTime | string | 创建时间 |
| updateTime | string | 最后更新时间 |
| reviewOpinion | string | 审批意见 |
| reviewTime | string | 审批时间 |

**审批表单数据 formData（按类型）：**

请假 (leave)：

| 字段 | 类型 | 说明 |
|------|------|------|
| leaveType | string | 请假类型：年假/事假/病假/婚假 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| days | number | 请假天数 |
| reason | string | 请假事由 |

报销 (expense)：

| 字段 | 类型 | 说明 |
|------|------|------|
| amount | string | 报销金额 |
| category | string | 报销类别：差旅/餐饮/办公/其他 |
| detail | string | 费用明细 |

用章 (seal)：

| 字段 | 类型 | 说明 |
|------|------|------|
| sealType | string | 用章类型：公章/合同章/财务章/法人章 |
| count | string | 用章数量 |
| reason | string | 用章事由 |

出差 (travel)：

| 字段 | 类型 | 说明 |
|------|------|------|
| destination | string | 出差地点 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| days | number | 出差天数 |
| reason | string | 出差事由 |

采购 (purchase)：

| 字段 | 类型 | 说明 |
|------|------|------|
| items | string | 采购物品 |
| amount | string | 采购金额 |
| reason | string | 采购事由 |

通用 (general)：

| 字段 | 类型 | 说明 |
|------|------|------|
| reason | string | 申请事由 |

### 3.3 发起审批

**POST** `/api/approval/create`

创建一条新的审批申请。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 审批类型：leave / expense / seal / travel / purchase / general |
| title | string | 是 | 审批标题 |
| formData | object | 是 | 审批表单数据（结构同 3.2 中对应类型） |
| approverId | string | 是 | 审批人用户 ID |
| ccIds | string[] | 否 | 抄送人用户 ID 列表 |

**响应数据：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "AP20260527002",
    "status": "pending",
    "createTime": "2026-05-27 14:30:00"
  }
}
```

### 3.4 审批操作（通过/驳回）

**POST** `/api/approval/approve`

审批人对审批单进行通过或驳回操作。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 审批 ID |
| action | string | 是 | approve（通过）/ reject（驳回） |
| opinion | string | 驳回时必填 | 审批意见 |

**响应数据：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "AP20260527001",
    "status": "approved",
    "reviewOpinion": "同意",
    "reviewTime": "2026-05-27 16:00:00"
  }
}
```

---

## 4. 日报模块 (Report)

### 4.1 获取日报列表

**POST** `/api/report/list`

获取日报列表，支持按状态筛选和分页。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选：all / pending / approved / rejected，默认 all |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |
| startDate | string | 否 | 开始日期筛选 |
| endDate | string | 否 | 结束日期筛选 |
| userId | string | 否 | 指定用户 ID（管理员查看他人日报） |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| list | object[] | 日报列表 |
| list[].id | string | 日报 ID |
| list[].date | string | 日报日期（2026/05/27） |
| list[].weekday | string | 星期 |
| list[].project | string | 项目名称 |
| list[].workers | string | 作业人员 |
| list[].workContent | string | 工作内容 |
| list[].todayWorkType | string | 今日工作类型：工作/待工/在途 |
| list[].summary | string | 工作小结 |
| list[].status | string | 状态：pending / approved / rejected |
| list[].statusText | string | 状态文案 |
| list[].progressText | string | 进度百分比文本 |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 30,
    "list": [
      {
        "id": "RPT20260527001",
        "date": "2026/05/27",
        "weekday": "周三",
        "project": "明阳国电投邢台巨鹿Ipc项目",
        "workers": "王腾",
        "workContent": "Ipc故障处理",
        "todayWorkType": "工作",
        "summary": "16#风机载荷排查，更换跳线，重启plc通讯恢复",
        "status": "pending",
        "statusText": "待审核",
        "progressText": "67%"
      }
    ]
  }
}
```

### 4.2 获取日报详情

**POST** `/api/report/detail`

获取单条日报的完整详情。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 日报 ID |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 日报 ID |
| date | string | 日报日期 |
| weekday | string | 星期 |
| entryDate | string | 入场日期 |
| initialBizTripDate | string | 初始出差日期 |
| project | string | 项目名称 |
| area | string | 区域 |
| relatedParty | string | 相关方 |
| workers | string | 作业人员 |
| machineModel | string | 机型 |
| workerCount | string | 人数 |
| workContent | string | 工作内容 |
| todayWorkType | string | 今日工作类型：工作/待工/在途 |
| todayWork | string | 当日工作详情 |
| requiredQty | number | 需要完成数量 |
| completedQty | number | 累计完成数量 |
| tomorrowWorkType | string | 明日工作类型 |
| tomorrowPlan | string | 明日计划 |
| issues | string | 问题与风险 |
| remark | string | 备注 |
| bizTripDays | number | 项目出差天数 |
| personalBizTripDays | number | 个人累计出差天数 |
| images | string[] | 图片 URL 列表 |
| status | string | 状态：pending / approved / rejected |
| statusText | string | 状态文案 |
| reviewer | string | 审核人 |
| reviewOpinion | string | 审核意见 |
| reviewTime | string | 审核时间 |
| createTime | string | 创建时间 |
| updateTime | string | 更新时间 |

### 4.3 提交日报

**POST** `/api/report/submit`

提交或更新日报。含草稿保存功能。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 否 | 日报 ID（更新时传入，新建不传） |
| date | string | 是 | 日报日期 |
| entryDate | string | 否 | 入场日期 |
| initialBizTripDate | string | 否 | 初始出差日期 |
| project | string | 是 | 项目名称 |
| area | string | 否 | 区域 |
| relatedParty | string | 否 | 相关方 |
| workers | string | 是 | 作业人员 |
| machineModel | string | 否 | 机型 |
| workerCount | string | 否 | 人数 |
| workContent | string | 否 | 工作内容 |
| todayWorkType | string | 是 | 今日工作类型：工作/待工/在途 |
| todayWork | string | 是 | 当日工作详情 |
| requiredQty | number | 否 | 需要完成数量 |
| completedQty | number | 否 | 累计完成数量 |
| tomorrowWorkType | string | 否 | 明日工作类型 |
| tomorrowPlan | string | 否 | 明日计划 |
| issues | string | 否 | 问题与风险 |
| remark | string | 否 | 备注 |
| images | string[] | 否 | 图片 URL 列表 |
| isDraft | boolean | 否 | 是否保存为草稿，默认 false |

**响应数据：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "RPT20260527002",
    "status": "pending",
    "createTime": "2026-05-27 18:00:00"
  }
}
```

### 4.4 获取草稿

**POST** `/api/report/draft`

获取当前用户的日报草稿。

**请求参数：** 无

**响应数据：** 同 4.2 日报详情结构，无草稿时 data 为 null

### 4.5 删除日报

**DELETE** `/api/report/delete`

删除指定日报（仅限草稿或被驳回的日报）。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 日报 ID |

---

## 5. 审核模块 (Review)

> 管理员专属模块，非管理员访问返回 403

### 5.1 获取审核列表

**POST** `/api/project/reviewList`

管理员获取待审核/已审核的日报列表。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选：pending / approved / rejected，默认 pending |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |
| keyword | string | 否 | 搜索关键词（用户名/项目名） |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| stats | object | 统计信息 |
| stats.pending | number | 待审核数 |
| stats.todayReviewed | number | 今日已审核数 |
| stats.avgTime | string | 平均审核耗时 |
| list | object[] | 审核列表 |
| list[].id | string | 日报 ID |
| list[].user | string | 提交人 |
| list[].project | string | 项目名称 |
| list[].time | string | 提交时间 |
| list[].status | string | 状态 |
| list[].statusText | string | 状态文案 |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 12,
    "stats": {
      "pending": 3,
      "todayReviewed": 5,
      "avgTime": "2h"
    },
    "list": [
      {
        "id": "RPT20260527001",
        "user": "张三",
        "project": "XX项目建设",
        "time": "05-27 14:30",
        "status": "pending",
        "statusText": "待审核"
      }
    ]
  }
}
```

### 5.2 获取审核详情

**POST** `/api/project/reviewDetail`

管理员获取待审核日报的完整详情。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 日报 ID |

**响应数据：** 同 4.2 日报详情结构

### 5.3 审核操作（通过/驳回）

**POST** `/api/project/reviewAction`

管理员对日报进行审核操作。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 日报 ID |
| action | string | 是 | approve（通过）/ reject（驳回） |
| note | string | 驳回时必填 | 审核意见/驳回原因 |

**响应数据：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "RPT20260527001",
    "status": "approved",
    "reviewOpinion": "内容完整，同意",
    "reviewTime": "2026-05-27 16:00:00"
  }
}
```

### 5.4 获取审核统计

**POST** `/api/project/reviewStats`

管理员获取审核统计数据。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| period | string | 否 | 统计周期：week / month / quarter，默认 week |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| totalPending | number | 待审核总数 |
| todayReviewed | number | 今日审核数 |
| avgReviewTime | string | 平均审核耗时 |
| approvalRate | string | 通过率 |
| trendList | object[] | 趋势数据 |
| trendList[].date | string | 日期 |
| trendList[].count | number | 审核数量 |

---

## 6. 消息模块 (Message)

### 6.1 获取消息列表

**POST** `/api/message/list`

获取当前用户的消息列表。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 消息类型筛选：all / approval / report / task / system，默认 all |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| unreadCount | number | 未读数 |
| list | object[] | 消息列表 |
| list[].id | string | 消息 ID |
| list[].type | string | 消息类型：approval / report / task / system |
| list[].title | string | 消息标题 |
| list[].desc | string | 消息摘要 |
| list[].time | string | 时间 |
| list[].isRead | boolean | 是否已读 |
| list[].icon | string | 图标标识 |
| list[].iconBg | string | 图标背景色 |

**响应示例：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 25,
    "unreadCount": 3,
    "list": [
      {
        "id": "MSG20260527001",
        "type": "approval",
        "title": "审批通知",
        "desc": "张三提交了请假申请",
        "time": "刚刚",
        "isRead": false,
        "icon": "approval",
        "iconBg": "#EDF2FF"
      }
    ]
  }
}
```

### 6.2 获取消息详情

**POST** `/api/message/detail`

获取单条消息的详细内容。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 消息 ID |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 消息 ID |
| title | string | 消息标题 |
| time | string | 消息时间 |
| body | string | 消息正文（支持换行 \n） |
| actionText | string | 操作按钮文案（如"查看详情"） |
| actionRoute | string | 操作跳转路由（如 /pages/approval/detail?id=xxx） |
| relatedId | string | 关联业务 ID（审批 ID / 日报 ID 等） |
| type | string | 消息类型 |

### 6.3 获取未读消息数

**POST** `/api/message/unread`

获取当前用户的未读消息数量。

**请求参数：** 无

**响应数据：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "count": 3
  }
}
```

### 6.4 标记消息已读

**POST** `/api/message/markRead`

标记指定消息为已读。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 否 | 消息 ID（传入则标记单条，不传则标记全部已读） |

**响应数据：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "markedCount": 3
  }
}
```

---

## 7. 公告模块 (Announcement) ⏳ 待实现

> **状态**: 后端路由未实现。以下为规划文档。

### 7.1 获取公告列表

**POST** `/api/announcement/list`

获取公告列表，置顶优先。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| list | object[] | 公告列表 |
| list[].id | string | 公告 ID |
| list[].title | string | 公告标题 |
| list[].summary | string | 摘要 |
| list[].publisher | string | 发布人 |
| list[].publishTime | string | 发布时间 |
| list[].isTop | boolean | 是否置顶 |
| list[].readCount | number | 阅读数 |

### 7.2 获取公告详情

**POST** `/api/announcement/detail`

获取公告详情。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 公告 ID |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 公告 ID |
| title | string | 标题 |
| content | string | 正文（富文本/Markdown） |
| publisher | string | 发布人 |
| publishTime | string | 发布时间 |
| readCount | number | 阅读数 |
| isTop | boolean | 是否置顶 |

### 7.3 发布公告（管理员）

**POST** `/api/announcement/publish`

管理员发布公告。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 公告标题 |
| content | string | 是 | 公告正文 |
| isTop | boolean | 否 | 是否置顶，默认 false |

---

## 8. 项目管理模块 (Project)

### 8.1 获取项目列表

**POST** `/api/project/list`

获取项目日报列表。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 20 |
| keyword | string | 否 | 搜索关键词 |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| list | object[] | 项目列表 |
| list[].id | string | 项目 ID |
| list[].name | string | 项目名称 |
| list[].area | string | 区域 |
| list[].status | string | 项目状态：active / completed / paused |
| list[].memberCount | number | 参与人数 |
| list[].progress | string | 进度百分比 |
| list[].lastReportDate | string | 最近日报日期 |

### 8.2 获取项目详情

**POST** `/api/project/detail`

获取项目详情及关联日报。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 项目 ID |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 项目 ID |
| name | string | 项目名称 |
| area | string | 区域 |
| status | string | 项目状态 |
| members | object[] | 项目成员列表 |
| members[].userId | string | 用户 ID |
| members[].nickName | string | 姓名 |
| members[].role | string | 项目角色 |
| reports | object[] | 关联日报列表（结构同 4.1 list 项） |
| stats | object | 项目统计 |
| stats.totalReports | number | 日报总数 |
| stats.approvalRate | string | 通过率 |
| stats.avgWorkDays | number | 平均工作天数 |

### 8.3 获取项目统计

**POST** `/api/project/stats`

获取项目日报统计数据。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | string | 否 | 项目 ID（不传则返回全部项目汇总） |
| period | string | 否 | 统计周期：week / month / quarter |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| totalReports | number | 日报总数 |
| approvedCount | number | 已通过数 |
| pendingCount | number | 待审核数 |
| rejectedCount | number | 已驳回数 |
| approvalRate | string | 通过率 |
| trendList | object[] | 趋势数据 |
| trendList[].date | string | 日期 |
| trendList[].count | number | 提交数量 |

### 8.4 提交项目日报

**POST** `/api/project/submit`

提交项目日报（与 4.3 日报提交相同，此接口为项目维度入口）。

**请求参数：** 同 4.3，额外增加 `projectId` 字段

---

## 9. 资产管理模块 (Asset) ⏳ 待实现

> **状态**: 后端路由未实现。以下为规划文档。

### 9.1 获取资产列表

**POST** `/api/asset/list`

获取企业资产列表。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页条数 |
| category | string | 否 | 资产分类筛选 |
| keyword | string | 否 | 搜索关键词 |
| status | string | 否 | 状态筛选：in_use / idle / scrapped |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总数 |
| list | object[] | 资产列表 |
| list[].id | string | 资产 ID |
| list[].name | string | 资产名称 |
| list[].category | string | 分类 |
| list[].status | string | 状态 |
| list[].location | string | 存放位置 |
| list[].currentHolder | string | 当前持有人 |

### 9.2 获取资产详情

**POST** `/api/asset/detail`

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 资产 ID |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 资产 ID |
| name | string | 资产名称 |
| category | string | 分类 |
| status | string | 状态 |
| location | string | 存放位置 |
| purchaseDate | string | 购入日期 |
| currentValue | string | 当前价值 |
| usageHistory | object[] | 使用记录 |
| currentHolder | object | 当前持有人 |

### 9.3 资产申购申请

**POST** `/api/asset/apply`

提交资产申购申请。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| items | string | 是 | 申购物品 |
| amount | string | 是 | 预估金额 |
| reason | string | 是 | 申购事由 |

---

## 10. 数据统计模块 (Stats)

### 10.1 首页统计数据

**POST** `/api/stats/home`

获取首页工作台所需的统计数据。

**请求参数：** 无（根据当前用户角色自动返回对应数据）

**响应数据（员工）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| pendingApproval | number | 待审批数 |
| pendingReport | number | 待提交日报数 |
| processedCount | number | 已处理数 |
| unreadMessage | number | 未读消息数 |

**响应数据（管理员）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| pendingApproval | number | 待审批数 |
| pendingReview | number | 待审核日报数 |
| processedCount | number | 已处理数 |
| unreadMessage | number | 未读消息数 |

**响应示例（管理员）：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pendingApproval": 3,
    "pendingReview": 5,
    "processedCount": 28,
    "unreadMessage": 5
  }
}
```

### 10.2 最近动态

**POST** `/api/stats/activities`

获取首页最近动态列表。

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回条数，默认 5 |

**响应数据：**

| 字段 | 类型 | 说明 |
|------|------|------|
| list | object[] | 动态列表 |
| list[].id | string | 动态 ID |
| list[].text | string | 动态描述 |
| list[].time | string | 时间 |
| list[].date | string | 日期标签 |
| list[].type | string | 类型：approval / report / task |
| list[].iconSrc | string | 图标路径 |
| list[].iconBg | string | 图标背景色 |

### 10.3 个人中心统计

**POST** `/api/stats/profile`

获取个人中心页面的统计数据。

**请求参数：** 无

**响应数据：** 同 10.1 首页统计数据

---

## 11. 通用数据结构

### 11.1 分页请求

```json
{
  "page": 1,
  "pageSize": 20
}
```

### 11.2 分页响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "list": []
  }
}
```

### 11.3 状态枚举

**审批状态：**

| 值 | 说明 |
|----|------|
| pending | 待审批 |
| approved | 已通过 |
| rejected | 已驳回 |

**日报状态：** 同审批状态

**用户角色：**

| 值 | 说明 |
|----|------|
| employee | 普通员工 |
| admin | 管理员 |
| superadmin | 超级管理员 |

**今日工作类型：**

| 值 | 说明 |
|----|------|
| 工作 | 正常工作 |
| 待工 | 等待中 |
| 在途 | 出差途中 |

**审批类型：**

| 值 | 说明 |
|----|------|
| leave | 请假 |
| expense | 报销 |
| seal | 用章 |
| travel | 出差 |
| purchase | 采购 |
| general | 通用 |

**消息类型：**

| 值 | 说明 |
|----|------|
| approval | 审批通知 |
| report | 日报相关 |
| task | 任务提醒 |
| system | 系统通知 |

---

## 12. 角色权限体系

### 12.1 权限映射表

| 权限标识 | 说明 | employee | admin | superadmin |
|----------|------|----------|-------|------------|
| approval:create | 发起审批 | ✅ | ✅ | ✅ |
| approval:review | 审批管理 | ❌ | ✅ | ✅ |
| report:submit | 提交日报 | ✅ | ✅ | ✅ |
| report:review | 审核日报 | ❌ | ✅ | ✅ |
| message:read | 查看消息 | ✅ | ✅ | ✅ |
| user:manage | 用户管理 | ❌ | ✅ | ✅ |
| announcement:publish | 发布公告 | ❌ | ✅ | ✅ |
| system:config | 系统配置 | ❌ | ❌ | ✅ |

### 12.2 接口权限要求

| 接口 | 最低权限 |
|------|----------|
| /api/auth/login | 无需认证 |
| /api/user/profile (GET) | 已登录用户 |
| /api/user/profile (PUT) | 已登录用户 |
| /api/approval/* | 已登录用户 |
| /api/report/* | 已登录用户 |
| /api/project/review* | admin / superadmin |
| /api/admin/* | admin / superadmin |
| /api/announcement/publish | admin / superadmin |
| /api/stats/* | 已登录用户（按角色返回不同数据） |

---

## 13. 错误码汇总

| code | HTTP Status | 说明 | 前端处理 |
|------|-------------|------|----------|
| 0 | 200 | 成功 | 正常处理 |
| 401 | 401 | 未授权/Token 过期 | 跳转登录页 |
| 403 | 403 | 无权限访问 | Toast 提示"无权限访问" |
| 1001 | 400 | 参数校验失败 | Toast 显示具体错误信息 |
| 1002 | 404 | 资源不存在 | Toast 提示 |
| 2001 | 200 | 业务逻辑错误（如重复提交） | Toast 显示具体错误信息 |
| 2002 | 200 | 审批已处理 | 刷新列表 |
| 2003 | 200 | 日报已审核 | 刷新详情 |

---

## 附录：前端请求封装说明

前端使用 `src/services/request.js` 统一封装请求：

- **Base URL：** `https://warblood.online`
- **请求头：** `Content-Type: application/json`，登录后自动携带 `Authorization: Bearer <token>`
- **Mock 模式：** 通过环境变量 `VITE_USE_MOCK=true` 开启，返回模拟数据
- **401 处理：** 自动跳转登录页
- **错误提示：** 非 0 code 自动 Toast 显示错误信息

**API 模块文件结构：**

```
src/services/
├── request.js              # 请求封装（get/post/put/del）
└── modules/
    ├── auth.js             # 认证相关
    ├── approval.js         # 审批相关
    ├── report.js           # 日报相关
    ├── review.js           # 审核相关
    └── message.js          # 消息相关
```
