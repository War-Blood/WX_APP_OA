# 前后端联调对接指南

> **版本：** v1.0.0  
> **生成日期：** 2026-05-29  
> **适用对象：** 后端开发人员

---

## 1. 前端项目概况

| 项目 | 说明 |
|------|------|
| 框架 | uni-app (Vue 3 + Vite) |
| 目标平台 | 微信小程序 |
| 状态管理 | Pinia |
| 请求封装 | `src/services/request.js` |
| API 模块 | `src/services/modules/` |
| Base URL | `https://warblood.online` |
| 认证方式 | Bearer Token (JWT) |

---

## 2. 必读文件清单（按优先级）

### 🔴 必须阅读

| 文件 | 路径 | 说明 |
|------|------|------|
| API 接口文档 | `docs/API-Interfaces.md` | 所有接口定义、请求/响应结构、错误码 |
| 请求封装 | `src/services/request.js` | 前端如何发请求、如何处理响应、401 逻辑 |
| 用户状态管理 | `src/stores/user.js` | 角色权限模型、PERMISSIONS_MAP |

### 🟡 建议阅读

| 文件 | 路径 | 说明 |
|------|------|------|
| PRD | `docs/PRD.md` | 产品需求全貌 |
| 交互设计 | `docs/UI-Design.md` | 界面交互流程 |
| 认证 API | `src/services/modules/auth.js` | 登录/用户资料接口 |
| 审批 API | `src/services/modules/approval.js` | 审批相关接口 |
| 日报 API | `src/services/modules/report.js` | 日报相关接口 |
| 审核 API | `src/services/modules/review.js` | 审核相关接口 |
| 消息 API | `src/services/modules/message.js` | 消息相关接口 |

### 🟢 参考阅读（了解前端数据使用方式）

| 文件 | 路径 | 说明 |
|------|------|------|
| 首页 | `src/pages/home/index.vue` | 首页统计数据、快捷入口、待办事项的数据结构 |
| 审批中心 | `src/pages/approval/index/index.vue` | 审批列表的数据结构 |
| 审批创建 | `src/pages/approval/create/index.vue` | 各类型审批表单字段定义 |
| 日报编辑 | `src/pages/employee/report-edit/index.vue` | 日报表单完整字段 |
| 日报详情 | `src/pages/employee/report-detail/index.vue` | 日报详情展示字段 |
| 审核管理 | `src/pages/admin/review-list/index.vue` | 审核列表数据结构 |
| 审核详情 | `src/pages/admin/review-detail/index.vue` | 审核操作逻辑 |
| 消息中心 | `src/pages/message/index.vue` | 消息列表数据结构 |
| 个人中心 | `src/pages/profile/index.vue` | 用户信息展示 |

---

## 3. 前端请求机制详解

### 3.1 请求封装 (`src/services/request.js`)

```
前端请求流程：
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ 页面调用   │────▶│ API 模块  │────▶│ request() │────▶│ uni.request│
│           │     │ (auth.js) │     │ (封装层)   │     │ (微信API)  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
```

**后端必须遵守的响应格式：**

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

前端判断逻辑：
- `code === 0` → 成功，取 `data`
- `code !== 0` → 失败，Toast 显示 `message`
- HTTP 401 → 跳转登录页
- HTTP 非 2xx → Toast "服务器错误"

### 3.2 认证流程

```
1. 用户点击"微信登录"
2. 前端调用 wx.login() 获取 code
3. 前端 POST /api/auth/login { code }
4. 后端返回 { token, userInfo }
5. 前端存储 token 到 Storage
6. 后续请求 Header 自动携带 Authorization: Bearer <token>
```

### 3.3 Mock 模式

当前前端通过 `VITE_USE_MOCK=true` 环境变量控制是否走 Mock：
- Mock 模式：请求不发出，返回 `{ code: 0, data: { mock: true } }`
- 真实模式：请求发到 `https://warblood.online`

**后端开发期间建议：** 先让前端保持 Mock 模式开发，后端接口逐个就绪后逐个切换。

---

## 4. 前端数据模型与后端字段映射

### 4.1 首页统计数据

**前端期望的响应结构：**

```json
// POST /api/stats/home
// 员工端
{
  "code": 0,
  "data": {
    "pendingApproval": 3,
    "pendingReport": 1,
    "processedCount": 28,
    "unreadMessage": 5
  }
}

// 管理员端
{
  "code": 0,
  "data": {
    "pendingApproval": 3,
    "pendingReview": 5,
    "processedCount": 28,
    "unreadMessage": 5
  }
}
```

> 后端根据请求中的 token 解析用户角色，返回对应字段。

### 4.2 审批列表

**前端期望的响应结构：**

```json
// POST /api/approval/list
{
  "code": 0,
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

**前端筛选参数：**

| 参数 | 前端传值 | 说明 |
|------|----------|------|
| tab | `pending` / `mine` / `done` | 待审批/我发起的/已处理 |
| type | `all` / `leave` / `expense` / `seal` / `travel` / `purchase` | 审批类型筛选 |

### 4.3 审批创建表单字段（按类型）

**请假 (leave)：**

| 前端字段 key | 类型 | 说明 |
|--------------|------|------|
| title | string | 审批标题 |
| leaveType | string | 年假/事假/病假/婚假 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| days | number | 天数（前端自动计算） |
| reason | string | 事由 |
| approver | string | 审批人 ID |
| cc | string | 抄送人 ID |

**报销 (expense)：**

| 前端字段 key | 类型 | 说明 |
|--------------|------|------|
| title | string | 审批标题 |
| amount | string | 金额 |
| category | string | 差旅/餐饮/办公/其他 |
| detail | string | 明细 |
| approver | string | 审批人 ID |
| cc | string | 抄送人 ID |

**用章 (seal)：**

| 前端字段 key | 类型 | 说明 |
|--------------|------|------|
| title | string | 审批标题 |
| sealType | string | 公章/合同章/财务章/法人章 |
| count | string | 数量 |
| reason | string | 事由 |
| approver | string | 审批人 ID |
| cc | string | 抄送人 ID |

**出差 (travel)：**

| 前端字段 key | 类型 | 说明 |
|--------------|------|------|
| title | string | 审批标题 |
| destination | string | 目的地 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |
| days | number | 天数 |
| reason | string | 事由 |
| approver | string | 审批人 ID |
| cc | string | 抄送人 ID |

**采购 (purchase)：**

| 前端字段 key | 类型 | 说明 |
|--------------|------|------|
| title | string | 审批标题 |
| items | string | 物品 |
| amount | string | 金额 |
| reason | string | 事由 |
| approver | string | 审批人 ID |
| cc | string | 抄送人 ID |

### 4.4 日报表单完整字段

```json
// POST /api/report/submit
{
  "date": "2026/05/27",
  "entryDate": "2026/05/25",
  "initialBizTripDate": "2026/05/25",
  "project": "明阳国电投邢台巨鹿Ipc项目",
  "area": "河北省邢台市",
  "relatedParty": "浙江贝良",
  "workers": "王腾",
  "machineModel": "MySE200",
  "workerCount": "1",
  "workContent": "Ipc故障处理",
  "todayWorkType": "工作",
  "todayWork": "当日工作详情...",
  "requiredQty": 3,
  "completedQty": 1,
  "tomorrowWorkType": "工作",
  "tomorrowPlan": "明日计划...",
  "issues": "无",
  "remark": "",
  "images": ["https://..."],
  "isDraft": false
}
```

| 前端字段 | 类型 | 必填 | 说明 |
|----------|------|------|------|
| date | string | ✅ | 日报日期 |
| entryDate | string | ❌ | 入场日期 |
| initialBizTripDate | string | ❌ | 初始出差日期 |
| project | string | ✅ | 项目名称 |
| area | string | ❌ | 区域 |
| relatedParty | string | ❌ | 相关方 |
| workers | string | ✅ | 作业人员 |
| machineModel | string | ❌ | 机型 |
| workerCount | string | ❌ | 人数 |
| workContent | string | ❌ | 工作内容 |
| todayWorkType | string | ✅ | 今日工作类型：工作/待工/在途 |
| todayWork | string | ✅ | 当日工作详情 |
| requiredQty | number | ❌ | 需要完成数量 |
| completedQty | number | ❌ | 累计完成数量 |
| tomorrowWorkType | string | ❌ | 明日工作类型 |
| tomorrowPlan | string | ❌ | 明日计划 |
| issues | string | ❌ | 问题与风险 |
| remark | string | ❌ | 备注 |
| images | string[] | ❌ | 图片 URL 列表 |
| isDraft | boolean | ❌ | 是否草稿 |

### 4.5 审核列表

```json
// POST /api/project/reviewList
{
  "code": 0,
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

### 4.6 消息列表

```json
// POST /api/message/list
{
  "code": 0,
  "data": {
    "total": 25,
    "unreadCount": 3,
    "list": [
      {
        "id": "MSG001",
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

---

## 5. 后端需反馈的验证项

### 5.1 接口联调检查清单

后端每完成一个接口，请按以下格式反馈：

```
接口：POST /api/auth/login
状态：✅ 已完成
测试地址：https://warblood.online/api/auth/login
测试账号：[提供测试用 code 或测试 token]
响应示例：[粘贴实际响应 JSON]
偏差说明：[与文档不一致的地方，如有]
```

### 5.2 必须反馈的关键信息

| 序号 | 反馈项 | 说明 | 优先级 |
|------|--------|------|--------|
| 1 | **测试 Token** | 提供至少 2 个角色的测试 Token（employee + admin） | 🔴 必须 |
| 2 | **微信 AppID 对接确认** | 确认 `wx56609483f0ee55b6` 对应的 AppSecret 已配置 | 🔴 必须 |
| 3 | **接口偏差说明** | 字段名、类型、结构与文档不一致的地方 | 🔴 必须 |
| 4 | **分页参数约定** | 确认使用 page/pageSize 还是 offset/limit | 🟡 重要 |
| 5 | **日期格式约定** | 确认日期字段格式：`2026-05-27` vs `2026/05/27` | 🟡 重要 |
| 6 | **图片上传方案** | 日报图片是直传 OSS 还是走后端中转 | 🟡 重要 |
| 7 | **文件导出方案** | 报表导出是生成下载链接还是发送邮件 | 🟡 重要 |
| 8 | **WebSocket 需求** | 消息实时推送是否需要 WebSocket | 🟢 可选 |
| 9 | **部署环境信息** | 测试/生产环境地址、是否 HTTPS | 🔴 必须 |
| 10 | **数据库表结构** | 后端 ER 图或建表 SQL，前端确认字段映射 | 🟡 重要 |

### 5.3 联调顺序建议

```
第1轮：基础连通
├── POST /api/auth/login          ← 最高优先，其他接口依赖 Token
├── GET  /api/user/profile        ← 验证 Token 机制
└── POST /api/stats/home          ← 首页数据，验证角色差异化

第2轮：核心业务
├── POST /api/report/submit       ← 日报提交
├── POST /api/report/list         ← 日报列表
├── POST /api/report/detail       ← 日报详情
├── POST /api/approval/list       ← 审批列表
├── POST /api/approval/create     ← 发起审批
└── POST /api/approval/approve    ← 审批操作

第3轮：管理功能
├── POST /api/project/reviewList  ← 审核列表
├── POST /api/project/reviewDetail← 审核详情
├── POST /api/project/reviewAction← 审核操作
└── POST /api/admin/users         ← 用户管理

第4轮：辅助功能
├── POST /api/message/list        ← 消息列表
├── POST /api/message/unread      ← 未读数
├── POST /api/message/markRead    ← 标记已读
└── POST /api/announcement/list   ← 公告列表
```

---

## 6. 前端切换 Mock → 真实接口的方式

### 6.1 环境变量控制

```bash
# Mock 模式（当前默认）
VITE_USE_MOCK=true

# 真实接口模式
VITE_USE_MOCK=false
```

### 6.2 逐接口切换（推荐）

后端接口逐个就绪时，可在 `request.js` 中按 URL 精细控制：

```javascript
// 示例：只让登录接口走真实，其他继续 Mock
const REAL_APIS = ['/api/auth/login', '/api/user/profile']

function request(config) {
  if (isMock && !REAL_APIS.includes(config.url)) {
    return mockRequest(config)
  }
  return realRequest(config)
}
```

### 6.3 前端联调验证步骤

每个接口联调时，前端验证：

1. ✅ 请求能发出（检查网络面板）
2. ✅ 响应格式符合 `{ code: 0, message, data }`
3. ✅ Token 认证生效（401 正确返回）
4. ✅ 角色权限生效（管理员/员工返回不同数据）
5. ✅ 分页参数生效（page/pageSize 返回正确分页数据）
6. ✅ 错误场景处理（参数错误、权限不足、资源不存在）
7. ✅ 页面渲染正常（数据结构与前端模型匹配）

---

## 7. 通信协议约定

### 7.1 字段命名

| 规范 | 说明 |
|------|------|
| 请求/响应字段 | 统一使用 **camelCase**（如 `userId`、`nickName`） |
| 数据库字段 | 后端自行决定，API 层转换 |
| 枚举值 | 统一使用 **小写英文**（如 `pending`、`approved`） |
| 日期格式 | `yyyy-MM-dd`（如 `2026-05-27`） |
| 日期时间格式 | `yyyy-MM-dd HH:mm:ss`（如 `2026-05-27 14:30:00`） |

### 7.2 空值处理

| 场景 | 约定 |
|------|------|
| 字段无值 | 返回 `null`，不返回空字符串 |
| 列表无数据 | 返回 `[]`，不返回 `null` |
| 分页无数据 | 返回 `{ total: 0, list: [] }` |

### 7.3 图片资源

| 场景 | 约定 |
|------|------|
| 日报图片上传 | 前端上传到 OSS → 获取 URL → 提交时传 URL 字符串数组 |
| 头像 | 返回完整 URL |
| 静态图标 | 前端本地资源，后端无需提供 |
