# 智慧办公助手 OA 小程序 — 技术方案 (Tech Plan)

| 文档版本 | 修订日期   | 修订内容                     | 修订人     |
| -------- | ---------- | ---------------------------- | ---------- |
| V1.0     | 2026-05-29 | 完整技术方案（后端+前端+数据库） | 程晓技 TM |

---

## 目录

1. [技术可行性分析](#1-技术可行性分析)
2. [后端新增模块设计](#2-后端新增模块设计)
3. [后端已有模块改造方案](#3-后端已有模块改造方案)
4. [前端对接方案](#4-前端对接方案)
5. [数据库表结构建议](#5-数据库表结构建议)
6. [工程分拆方案](#6-工程分拆方案)
7. [风险与关键决策](#7-风险与关键决策)

---

## 1. 技术可行性分析

### 1.1 总体评估

| 评估维度 | 结论 | 说明 |
|---------|------|------|
| 技术可行性 | ✅ 可行 | 全部使用现有技术栈（Node.js + Express + MySQL + uni-app），无新技术引入 |
| 架构合理性 | ✅ 合理 | 后端模块化分层（controller/service/route），前端 API 层统一封装 |
| 数据兼容性 | ⚠️ 需注意 | `daily_reports` 表字段少于前端表单字段，需新增 `wx_app_oa` 库表或补充字段 |
| 工期可行性 | ✅ 可行 | P0 任务可并行开发，依赖关系清晰 |

### 1.2 技术栈确认

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| 后端运行时 | Node.js | 18.x | 现有 |
| 后端框架 | Express | 4.x | 现有 |
| 数据库 | MySQL | 8.0 | 双库: wx_app_oa(主) + daily_report(旧) |
| 缓存 | Redis | 6.x | 可选优化 |
| 认证 | JWT | Bearer Token | 现有 auth 模块已完成 |
| 前端框架 | uni-app + Vue3 | latest | 现有 |
| HTTP 请求 | uni.request | 已有封装 | `request.js` 提供 post/get/put/del |

### 1.3 风险矩阵

| 风险 | 等级 | 影响 | 缓释措施 |
|------|------|------|---------|
| daily_reports 表字段不足 | 高 | report/submit 无法存储完整数据 | 方案A: 在 wx_app_oa 库建新表 `oa_daily_reports` 替代；方案B: alter 旧表加字段 |
| 旧版库(daily_report)与新库(wx_app_oa)数据隔离 | 中 | 日报数据跨库查询 | Stats 模块需跨库 JOIN，用 `oldQuery` + `query` 分别查再合并 |
| dev-mode-token 污染真实 API | 中 | 前端 dev 模式发假 token 到后端 | request.js 增加 dev-token 拦截，直接返回 mock 数据 |
| 审批参数不统一 | 中 | API 文档与 core 参数名不同 | Controller 层做参数映射，保持向下兼容 |

---

## 2. 后端新增模块设计

### 2.1 Stats 模块 — 全新开发

#### 2.1.1 接口定义

**POST /api/stats/home** — 首页统计
```json
// Request Body
{ "role": "employee" | "admin" }

// Response Data
{
  "pendingCount": 3,         // 待审批数
  "reviewCount": 5,          // 待审核数 (admin 专用)
  "submitCount": 1,          // 待提交数 (employee 专用)
  "processedCount": 28,      // 已处理数
  "unreadCount": 5,          // 未读消息数
  "taskCount": 0             // 待办任务数
}
```

**POST /api/stats/activities** — 最近动态
```json
// Request Body
{ "page": 1, "pageSize": 20 }

// Response Data (分页)
{
  "list": [
    {
      "id": 1,
      "type": "approval" | "report" | "task" | "system",
      "text": "完成审批 王明 的请假申请",
      "time": "10:30",
      "date": "今天",
      "iconSrc": "/static/images/home/icon_daily_green.png",
      "iconBg": "#F0FDF4"
    }
  ],
  "total": 50,
  "page": 1,
  "pageSize": 20
}
```

**POST /api/stats/profile** — 个人中心统计 (P1)
```json
// Response Data
{
  "reportCount": 45,         // 累计日报数
  "approvalCount": 12,       // 累计审批数
  "pendingApprovalCount": 2, // 待审批数
  "continuousDays": 5        // 连续提交天数
}
```

#### 2.1.2 文件结构

```
backend/src/features/
├── controllers/
│   └── stats.controller.js    # home / activities / profile
├── routes/
│   └── stats.routes.js        # 挂载到 /api/stats/*
└── services/
    └── stats.service.js       # 统计查询 + 动态查询
```

#### 2.1.3 核心逻辑

```javascript
// stats.service.js 核心伪代码
async function getHomeStats(userId, role) {
  // 并行查询多个统计
  const [pendingCount, approvalCount, unreadCount] = await Promise.all([
    // 待审批数: approval_instances WHERE 用户是审批人 AND status='pending'
    db.query(`SELECT COUNT(*) AS count FROM approval_instances ai 
              JOIN approval_flow_nodes afn ON ai.current_node_id = afn.id 
              WHERE afn.approver_id = ? AND ai.status = 'pending'`, [userId]),
    
    // 已处理数: 用户参与的已完成的审批/审核
    db.query(`SELECT COUNT(*) AS count FROM approval_flow_nodes 
              WHERE approver_id = ? AND action IS NOT NULL`, [userId]),
    
    // 未读消息数: 直接复用 messageService.unreadCount
  ]);
  
  // admin 额外查待审核数
  if (role === 'admin') {
    reviewCount = await db.query(`SELECT COUNT(*) FROM daily_reports WHERE status = 'pending'`);
  }
  
  return { pendingCount, reviewCount, processedCount, unreadCount };
}

async function getActivities(userId, page, pageSize) {
  // 从审批操作日志、日报提交记录、系统消息中聚合动态
  // 使用 UNION ALL 合并排序
  const offset = (page - 1) * pageSize;
  const sql = `
    (SELECT 'approval' AS type, ... FROM approval_flow_nodes WHERE ...)
    UNION ALL
    (SELECT 'report' AS type, ... FROM daily_reports WHERE ...)
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `;
  return db.query(sql, [pageSize, offset]);
}
```

### 2.2 Review 模块 — 全新开发

#### 2.2.1 接口定义

**POST /api/project/reviewList** — 审核列表
```json
// Request Body
{
  "page": 1,
  "pageSize": 20,
  "status": "pending" | "approved" | "rejected",
  "keyword": ""              // 搜索项目/填报人
}

// Response Data (分页)
{
  "list": [
    {
      "id": 1,
      "userId": 1,
      "userName": "张三",
      "department": "技术部",
      "project": "XX项目建设",
      "reportDate": "2026-05-27",
      "status": "pending",
      "statusText": "待审核",
      "submitTime": "2026-05-27 14:30"
    }
  ]
}
```

**POST /api/project/reviewDetail** — 审核详情
```json
// Request Body
{ "id": 1 }

// Response Data (完整日报内容)
{
  "id": 1,
  "userId": 1,
  "userName": "张三",
  "department": "技术部",
  "project": "XX项目建设",
  "reportDate": "2026-05-27",
  "weekday": "周三",
  "todayWork": "完成了需求评审和原型设计...",
  "tomorrowPlan": "开始编码实现...",
  "issues": "无",
  "workContent": "Ipc故障处理",
  "workers": "王腾",
  "todayWorkType": "工作",
  "progressPercent": 67,
  "status": "pending",
  "statusText": "待审核",
  "files": [{ "url": "...", "name": "..." }],
  "reviewRecord": null       // 审核记录（如有）
}
```

**POST /api/project/reviewAction** — 审核操作
```json
// Request Body
{
  "id": 1,
  "action": "approve" | "reject",
  "opinion": "内容完整，同意"   // reject 时必须
}

// Response Data
{ "success": true }
```

**POST /api/project/reviewStats** — 审核统计 (P1)
```json
// Response Data
{
  "pendingCount": 3,          // 待审核数
  "todayReviewedCount": 5,    // 今日审核数
  "avgProcessTime": "2h",     // 平均处理时间
  "approveRate": "85%"        // 通过率
}
```

#### 2.2.2 文件结构

```
backend/src/features/
├── controllers/
│   └── review.controller.js   # reviewList / reviewDetail / reviewAction / reviewStats
├── routes/
│   └── review.routes.js       # 挂载到 /api/project/review*
└── services/
    └── review.service.js      # 审核业务逻辑
```

#### 2.2.3 核心逻辑

```javascript
// review.service.js
async function reviewList({ page, pageSize, status, keyword }) {
  // 从 daily_reports 表查询，JOIN users 获取用户名
  // 支持 status 筛选和 keyword 模糊搜索
}

async function reviewAction({ reportId, reviewerId, action, opinion }) {
  // 1. 校验 action 为 approve/reject
  // 2. 校验日报状态为 pending
  // 3. reject 必须填写 opinion
  // 4. 更新 daily_reports.status
  // 5. 写入 review_records 表（需新建）
  // 6. 创建消息通知
}
```

### 2.3 前端新增 API 模块 — stats.js

```
miniapp/src/services/modules/
├── stats.js                   # 新增
```

```javascript
// miniapp/src/services/modules/stats.js
import { post } from '../request'

export const statsApi = {
  getHomeStats(role) {
    return post('/api/stats/home', { role })
  },

  getActivities(params) {
    return post('/api/stats/activities', params)
  },

  getProfileStats() {
    return post('/api/stats/profile')
  }
}
```

更新 `miniapp/src/services/index.js`：
```javascript
export { authApi } from './modules/auth'
export { reportApi } from './modules/report'
export { approvalApi } from './modules/approval'
export { messageApi } from './modules/message'
export { reviewApi } from './modules/review'
export { statsApi } from './modules/stats'     // 新增
```

---

## 3. 后端已有模块改造方案

### 3.1 Approval 模块 — 参数对齐

#### 3.1.1 改造前后对比

| 接口 | 当前(core)参数 | 目标(API文档)参数 | 改造方案 |
|------|---------------|------------------|---------|
| POST /api/approval/list | `{ status, typeId }` | `{ tab, type }` | Controller 做参数映射 |
| POST /api/approval/create | `{ approvalTypeId }` | `{ type, formData, approverId, ccIds }` | Controller 映射 + Service 扩展 |
| POST /api/approval/approve | `{ action: 'approved'/'rejected', comment }` | `{ action: 'approve'/'reject', opinion }` | Controller 映射 |

#### 3.1.2 approval.controller.js 改造

```javascript
// 🆕 改造前
async function list(req, res, next) {
  const { page = 1, pageSize = 10, status, typeId } = req.body;

// 🆕 改造后 — 同时兼容新旧参数
async function list(req, res, next) {
  const { page = 1, pageSize = 10, status, typeId, tab, type } = req.body;

  // 参数映射: tab → status, type → typeId
  const mappedStatus = status || mapTabToStatus(tab);
  const mappedTypeId = typeId || type;

  const { list: approvalList, total } = await approvalService.list(userId, {
    page: Number(page),
    pageSize: Number(pageSize),
    status: mappedStatus,
    typeId: mappedTypeId,
  });

function mapTabToStatus(tab) {
  const map = {
    'pending': 'pending',
    'mine': null,          // 'mine' 在 service 层特殊处理
    'done': 'approved',
  };
  return tab ? map[tab] : undefined;
}
```

```javascript
// 🆕 create 控制器改造
async function create(req, res, next) {
  const { approvalTypeId, title, formData, attachments, urgent, type, approverId, ccIds } = req.body;

  const instance = await approvalService.create({
    userId,
    approvalTypeId: approvalTypeId || type,  // 兼容新旧参数
    title,
    formData,
    attachments,
    urgent,
    approverId: approverId,     // 新增字段
    ccIds: ccIds,              // 新增字段
  });
  res.json(success(instance));
}

// 🆕 approve 控制器改造
async function approve(req, res, next) {
  const { id: instanceId, action, comment, opinion } = req.body;

  // action 映射: 'approve' → 'approved', 'reject' → 'rejected'
  const mappedAction = mapAction(action);
  // comment/opinion 兼容
  const mappedComment = comment || opinion;

  const result = await approvalService.approve({
    userId,
    instanceId,
    action: mappedAction,
    comment: mappedComment,
  });
  res.json(success(result));
}

function mapAction(action) {
  const map = { 'approve': 'approved', 'reject': 'rejected' };
  return map[action] || action;  // 如果已经是 approved/rejected 则直接使用
}
```

#### 3.1.3 approval.service.js 改造

```javascript
// 🆕 list 方法改造 — 支持 tab='mine' 查询"我发起的"
async function list(userId, { page, pageSize, status, typeId }) {
  let whereClause;
  const params = [];

  if (status === null && arguments[1].status === undefined) {
    // tab='mine' 情况: 只查我发起的
    whereClause = 'WHERE ai.applicant_id = ?';
    params.push(userId);
  } else {
    whereClause = 'WHERE (ai.applicant_id = ? OR ai.id IN (SELECT afn.instance_id FROM approval_flow_nodes afn WHERE afn.approver_id = ?))';
    params.push(userId, userId);
  }

  // ... 后续 keep 现有逻辑
}

// 🆕 create 方法改造 — 支持 approverId 和 ccIds
async function create({ userId, approvalTypeId, title, formData, attachments, urgent, approverId, ccIds }) {
  const result = await db.transaction(async (conn) => {
    // 插入审批实例 (同上)
    const [instanceResult] = await conn.execute(`INSERT INTO approval_instances ...`);

    const instanceId = instanceResult.insertId;

    // 创建初始审批节点 — 使用 approverId
    const approver = approverId || null; // 如果没有指定审批人则设为 null
    const [nodeResult] = await conn.execute(
      `INSERT INTO approval_flow_nodes (instance_id, node_order, approver_id, created_at) VALUES (?, 1, ?, NOW())`,
      [instanceId, approver]
    );

    // 如果传了 ccIds，写入抄送表
    if (ccIds && Array.isArray(ccIds) && ccIds.length > 0) {
      const ccValues = ccIds.map(ccUserId => `(${instanceId}, ${ccUserId}, NOW())`).join(',');
      await conn.execute(
        `INSERT INTO approval_cc (instance_id, user_id, created_at) VALUES ${ccValues}`
      );
    }

    // ...
  });
}
```

### 3.2 Report 模块 — 补齐功能

#### 3.2.1 改造计划

| 变更 | 文件 | 说明 |
|------|------|------|
| 改造 | report.controller.js | submit 扩展 formData 支持 | 
| 改造 | report.service.js | submit 逻辑扩展 + 草稿/删除逻辑 |
| 新增 | report.controller.js + report.service.js | draft 接口 |
| 新增 | report.controller.js + report.service.js | delete 接口 |
| 改造 | report.routes.js | 新增路由 |

#### 3.2.2 submit 接口改造

```javascript
// 🆕 改造前 — controller 接收 5 个字段
const { content, reportDate, todayWork, tomorrowPlan, issues } = req.body;

// 🆕 改造后 — 接收完整 formData
async function submit(req, res, next) {
  const { formData, reportDate, status } = req.body;
  const userId = req.user.id;

  // formData 包含前端所有表单字段
  const report = await reportService.submit({
    userId,
    reportDate: reportDate || formData?.date,
    formData: formData || req.body,   // 兼容两种传参方式
    status: status || 'submitted',    // submitted | draft
  });

  res.json(success(report));
}
```

```javascript
// 🆕 service 层改造
async function submit({ userId, reportDate, formData, status }) {
  const now = new Date();

  // 检查当天是否已有日报（草稿或已提交）
  const existing = await db.query(
    'SELECT id, status FROM daily_reports WHERE user_id = ? AND report_date = ?',
    [userId, reportDate]
  );

  // 构建完整字段
  const fields = {
    user_id: userId,
    report_date: reportDate,
    project: formData.project || null,
    area: formData.area || null,
    today_work_type: formData.todayWorkType || null,
    today_work: formData.todayWork || null,
    tomorrow_work_type: formData.tomorrowWorkType || null,
    tomorrow_plan: formData.tomorrowPlan || null,
    work_content: formData.workContent || null,
    workers: formData.workers || null,
    machine_model: formData.machineModel || null,
    worker_count: formData.workerCount || null,
    required_qty: formData.requiredQty || 0,
    completed_qty: formData.completedQty || 0,
    progress_percent: formData.progressPercent || 0,
    issues: formData.issues || null,
    remark: formData.remark || null,
    entry_date: formData.entryDate || null,
    initial_biz_trip_date: formData.initialBizTripDate || null,
    related_party: formData.relatedParty || null,
    personal_biz_trip_days: formData.personalBizTripDays || 0,
    content: formData.content || null,
    files: formData.files ? JSON.stringify(formData.files) : null,
    status: status || 'submitted',
    updated_at: now,
  };

  if (existing.length > 0 && existing[0].status === 'draft') {
    // 更新已有草稿
    // UPDATE daily_reports SET ... WHERE id = existing[0].id
  } else if (existing.length > 0 && existing[0].status === 'submitted') {
    // 重复提交判定
    if (status === 'submitted') {
      throw new BusinessError('该日期已提交日报，请勿重复提交');
    }
    // 草稿则允许覆盖
  } else {
    // INSERT 新记录
    fields.created_at = now;
    // INSERT INTO daily_reports ...
  }
}
```

#### 3.2.3 新增 draft 接口

```javascript
// report.controller.js — 新增
async function saveDraft(req, res, next) {
  try {
    const { formData, reportDate } = req.body;
    const userId = req.user.id;

    const report = await reportService.submit({
      userId,
      reportDate: reportDate || formData?.date,
      formData,
      status: 'draft',
    });

    res.json(success(report));
  } catch (err) {
    next(err);
  }
}

// report.controller.js — 新增获取草稿
async function getDraft(req, res, next) {
  try {
    const { reportDate } = req.body;
    const userId = req.user.id;

    const draft = await reportService.getDraft(userId, reportDate);
    res.json(success(draft));
  } catch (err) {
    next(err);
  }
}
```

```javascript
// report.service.js — 新增
async function getDraft(userId, reportDate) {
  const rows = await db.query(
    'SELECT * FROM daily_reports WHERE user_id = ? AND report_date = ? AND status = ?',
    [userId, reportDate, 'draft']
  );
  return rows[0] || null;  // 没有草稿返回 null 而不是 404
}
```

#### 3.2.4 新增 delete 接口

```javascript
// report.controller.js — 新增
async function deleteReport(req, res, next) {
  try {
    const { id } = req.body;
    const userId = req.user.id;

    await reportService.deleteReport(id, userId);
    res.json(success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
}

// report.service.js — 新增
async function deleteReport(id, userId) {
  const rows = await db.query(
    'SELECT id, status FROM daily_reports WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (rows.length === 0) {
    throw new NotFoundError('日报不存在');
  }

  // 只允许删除草稿或已驳回的日报
  if (!['draft', 'rejected'].includes(rows[0].status)) {
    throw new BusinessError('仅可删除草稿或已驳回的日报');
  }

  await db.execute(
    'DELETE FROM daily_reports WHERE id = ? AND user_id = ?',
    [id, userId]
  );
}
```

#### 3.2.5 report.routes.js 改造

```javascript
// 🆕 新增路由
router.post('/submit', authenticate, reportController.submit);
router.post('/draft', authenticate, reportController.saveDraft);
router.get('/draft', authenticate, reportController.getDraft);   // 获取草稿
router.delete('/delete', authenticate, reportController.deleteReport);
```

### 3.3 Message 模块 — 字段验证确认

#### 3.3.1 返回字段对齐

当前 message service 使用 `SELECT *` 直接返回数据库行。需要确认 messages 表字段对齐 API 文档要求：

| API文档字段 | 数据库字段 | 状态 |
|------------|-----------|------|
| type | type | ✅ |
| title | title | ✅ |
| desc | content | ⚠️ 别名映射：`content AS \`desc\`` |
| time | created_at | ⚠️ 格式化处理 |
| isRead | is_read | ⚠️ 别名映射 |
| icon | — | ❌ 需后端根据 type 映射 |
| iconBg | — | ❌ 需后端根据 type 映射 |
| body | body | ✅ (detail) |
| actionText | action_text | ⚠️ 别名 |
| actionRoute | action_route | ⚠️ 别名 |
| relatedId | related_id | ⚠️ 别名 |

**解决方案**：在 message.service.js 的 list 和 detail 方法中做字段映射：

```javascript
// message.service.js — 字段映射函数
function formatMessage(row) {
  const iconMap = {
    'approval': { icon: 'approval', iconBg: '#EDF2FF' },
    'report': { icon: 'report', iconBg: '#F0FDF4' },
    'task': { icon: 'task', iconBg: '#F3E8FF' },
    'system': { icon: 'system', iconBg: '#F5F5F5' },
  };

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    desc: row.content,           // 字段映射
    time: formatTime(row.created_at),
    isRead: !!row.is_read,       // 布尔化
    icon: iconMap[row.type]?.icon || 'notification',
    iconBg: iconMap[row.type]?.iconBg || '#F5F5F5',
  };
}
```

---

## 4. 前端对接方案

### 4.1 请求层改造 (request.js)

#### 4.1.1 移除 mock 逻辑

```javascript
// 🆕 改造前 — 有 mock 分支且有 isMock 环境变量
const isMock = import.meta.env.VITE_USE_MOCK === 'true'

function request(config) {
  if (isMock) {
    return mockRequest(config)    // ❌ 需要移除
  }
  return realRequest(config)
}

// 🆕 改造后 — 直接走真实请求，仅保留 dev-token 处理
function request(config) {
  return realRequest(config)
}
```

#### 4.1.2 dev-mode-token 处理

```javascript
// 🆕 在 realRequest 中添加 dev-token 处理逻辑
async function realRequest(config) {
  const { url, method, data, params } = config
  const token = getToken()

  // dev-mode-token: 直接返回 mock 数据，不发送真实请求
  if (token === 'dev-mode-token') {
    return handleDevMock(url, method, data)
  }

  // ... 原有真实请求逻辑
}

// 🆕 开发模式 mock 数据工厂
function handleDevMock(url, method, data) {
  // 根据 URL 返回合理的 mock 数据
  const mockMap = {
    '/api/stats/home': {
      code: 0, data: { pendingCount: 3, reviewCount: 5, processedCount: 28, unreadCount: 5 }
    },
    '/api/stats/activities': {
      code: 0, data: { list: [], total: 0, page: 1, pageSize: 20 }
    },
    // ... 其他接口 mock
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockMap[url] || { code: 0, data: null, message: 'success' })
    }, 200)
  })
}
```

### 4.2 首页改造 (pages/home/index.vue)

#### 4.2.1 改造清单

| 问题 | 行号 | 改造方式 |
|------|------|---------|
| stats 硬编码 | L152-L167 | 改为 statsApi.getHomeStats() 调用 |
| activities 硬编码 | L200-L237 | 改为 statsApi.getActivities() 调用 |
| unreadCount 硬编码 | L150 | 改为 messageApi.getUnreadCount() 调用 |
| onRefresh setTimeout | L239-L245 | 移除 setTimeout，真实接口调用 |
| onLoadMore setTimeout | L247-L254 | 移除 setTimeout，分页加载 |

#### 4.2.2 核心改造代码

```html
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { statsApi } from '@/services/modules/stats'
import { messageApi } from '@/services/modules/message'
// ... 其他 import

const userStore = useUserStore()

const stats = ref([])
const activities = ref([])
const unreadCount = ref(0)
const activityPage = ref(1)
const isLoadingMore = ref(false)
const noMoreData = ref(false)
const isRefreshing = ref(false)

onMounted(() => {
  loadPageData()
})

async function loadPageData() {
  try {
    const [statsRes, activitiesRes, unreadRes] = await Promise.all([
      statsApi.getHomeStats(userStore.isAdmin ? 'admin' : 'employee'),
      statsApi.getActivities({ page: 1, pageSize: 20 }),
      messageApi.getUnreadCount()
    ])

    const statsData = statsRes.data
    const role = userStore.isAdmin ? 'admin' : 'employee'

    if (role === 'admin') {
      stats.value = [
        { key: 'pending', label: '待审批', count: statsData.pendingCount },
        { key: 'review', label: '待审核', count: statsData.reviewCount },
        { key: 'processed', label: '已处理', count: statsData.processedCount },
        { key: 'unread', label: '待阅读', count: statsData.unreadCount }
      ]
    } else {
      stats.value = [
        { key: 'pending', label: '待审批', count: statsData.pendingCount },
        { key: 'submit', label: '待提交', count: statsData.submitCount },
        { key: 'processed', label: '已处理', count: statsData.processedCount },
        { key: 'unread', label: '待阅读', count: statsData.unreadCount }
      ]
    }

    activities.value = activitiesRes.data.list
    unreadCount.value = unreadRes.data.count
    activityPage.value = 1
    noMoreData.value = false
  } catch (err) {
    console.error('首页数据加载失败', err)
  }
}

async function onRefresh() {
  isRefreshing.value = true
  await loadPageData()
  isRefreshing.value = false
  uni.showToast({ title: '刷新成功', icon: 'success', duration: 1500 })
}

async function onLoadMore() {
  if (isLoadingMore.value || noMoreData.value) return
  isLoadingMore.value = true
  try {
    activityPage.value++
    const res = await statsApi.getActivities({ page: activityPage.value, pageSize: 20 })
    if (res.data.list.length === 0) {
      noMoreData.value = true
    } else {
      activities.value = [...activities.value, ...res.data.list]
    }
  } catch {
    activityPage.value--
  } finally {
    isLoadingMore.value = false
  }
}
</script>
```

### 4.3 审批中心改造 (pages/approval/index/index.vue)

#### 4.3.1 改造清单

| 问题 | 改造方式 |
|------|---------|
| approvalList 硬编码 3 条假数据 | 改为 approvalApi.getList() |
| switchTab 只改本地状态 | Tab 切换时调用 API |
| activeFilter 只做本地筛选 | 筛选变化时调用 API |
| 无分页支持 | 上拉加载更多 |

#### 4.3.2 核心改造

```html
<script setup>
import { ref, computed, onMounted } from 'vue'
import { approvalApi } from '@/services/modules/approval'

const activeTab = ref('pending')
const activeFilter = ref('all')
const approvalList = ref([])
const currentPage = ref(1)
const noMoreData = ref(false)

onMounted(() => {
  loadApprovalList()
})

async function loadApprovalList(reset = true) {
  if (reset) {
    currentPage.value = 1
    noMoreData.value = false
  }

  try {
    const params = {
      page: currentPage.value,
      pageSize: 20,
      tab: activeTab.value,
      type: activeFilter.value === 'all' ? undefined : activeFilter.value,
    }

    const res = await approvalApi.getList(params)

    if (reset) {
      approvalList.value = res.data.list
    } else {
      approvalList.value = [...approvalList.value, ...res.data.list]
    }

    if (res.data.list.length < 20) {
      noMoreData.value = true
    }
  } catch (err) {
    console.error('加载审批列表失败', err)
  }
}

function switchTab(key) {
  activeTab.value = key
  loadApprovalList(true)
}

// 筛选变化时触发
watch(activeFilter, () => {
  loadApprovalList(true)
})
</script>
```

### 4.4 日报历史改造 (pages/employee/report-history/index.vue)

#### 4.4.1 改造清单

| 问题 | 改造方式 |
|------|---------|
| reportList 硬编码 8 条假数据 | 改为 reportApi.getList() |
| switchTab 只改本地状态 | Tab 切换时调用 API |
| onLoadMore setTimeout | 真实分页加载 |

```html
<script setup>
import { ref, computed, onMounted } from 'vue'
import { reportApi } from '@/services/modules/report'

const activeTab = ref('all')
const reportList = ref([])
const currentPage = ref(1)
const noMoreData = ref(false)

onMounted(() => {
  loadReportList()
})

async function loadReportList(reset = true) {
  if (reset) {
    currentPage.value = 1
    noMoreData.value = false
  }

  try {
    const statusMap = {
      'all': undefined,
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected'
    }

    const res = await reportApi.getList({
      page: currentPage.value,
      pageSize: 20,
      status: statusMap[activeTab.value],
    })

    if (reset) {
      reportList.value = res.data.list
    } else {
      reportList.value = [...reportList.value, ...res.data.list]
    }

    if (res.data.list.length < 20) {
      noMoreData.value = true
    }
  } catch (err) {
    console.error('加载日报列表失败', err)
  }
}

function switchTab(key) {
  activeTab.value = key
  loadReportList(true)
}

function onLoadMore() {
  if (noMoreData.value) return
  currentPage.value++
  loadReportList(false)
}
</script>
```

### 4.5 消息中心改造 (pages/message/index.vue)

#### 4.5.1 改造清单

| 问题 | 改造方式 |
|------|---------|
| messageList 硬编码 6 条假数据 | 改为 messageApi.getList() |
| switchTab 只做本地筛选 | Tab 切换时调用 API |
| goToDetail 本地改 isRead | 改为 messageApi.markRead() |

```html
<script setup>
import { ref, onMounted } from 'vue'
import { messageApi } from '@/services/modules/message'

const activeTab = ref('all')
const messageList = ref([])

onMounted(() => {
  loadMessages()
})

async function loadMessages() {
  try {
    const res = await messageApi.getList({
      type: activeTab.value === 'all' ? undefined : activeTab.value,
      page: 1,
      pageSize: 50,
    })
    messageList.value = res.data.list
  } catch (err) {
    console.error('加载消息列表失败', err)
  }
}

function switchTab(key) {
  activeTab.value = key
  loadMessages()
}

async function goToDetail(item) {
  try {
    if (!item.isRead) {
      await messageApi.markRead(item.id)
      item.isRead = true
    }
  } catch (err) {
    console.error('标记已读失败', err)
  }
  uni.navigateTo({ url: '/pages/message/detail?id=' + item.id })
}
</script>
```

### 4.6 审核管理改造 (pages/admin/review-list/index.vue)

#### 4.6.1 改造清单

| 问题 | 改造方式 |
|------|---------|
| stats 硬编码 | 改为 reviewApi.getReviewStats() |
| reviewList 硬编码 5 条假数据 | 改为 reviewApi.getList() |
| switchTab 本地筛选 | Tab 切换时调用 API |

```html
<script setup>
import { ref, onMounted } from 'vue'
import { reviewApi } from '@/services/modules/review'

const activeTab = ref('pending')
const reviewList = ref([])
const stats = ref({ pending: 0, todayReviewed: 0, avgTime: '-' })

onMounted(() => {
  loadAll()
})

async function loadAll() {
  try {
    const [listRes, statsRes] = await Promise.all([
      reviewApi.getList({ page: 1, pageSize: 20, status: activeTab.value }),
      reviewApi.getReviewStats()
    ])
    reviewList.value = listRes.data.list
    stats.value = {
      pending: statsRes.data.pendingCount,
      todayReviewed: statsRes.data.todayReviewedCount,
      avgTime: statsRes.data.avgProcessTime,
    }
  } catch (err) {
    console.error('加载审核数据失败', err)
  }
}

function switchTab(key) {
  activeTab.value = key
  loadAll()
}
</script>
```

### 4.7 登录页改造 (pages/login/index.vue)

| 问题 | 改造方式 |
|------|---------|
| 微信登录直接 uni.request | 改为 authApi.login(code) |
| dev-mode-token 处理 | 保留, 依赖 request.js 统一处理 |

```javascript
// 🆕 改造 handleLogin
async function handleLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请先阅读并同意协议', icon: 'none' })
    return
  }

  isLogging.value = true
  try {
    const { code } = await uni.login({ provider: 'weixin' })
    const res = await authApi.login(code)    // 改用封装好的方法
    if (res.data?.token) {
      uni.setStorageSync('token', res.data.token)
      uni.setStorageSync('userInfo', res.data.userInfo)
      goHome()
    } else {
      uni.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
  } finally {
    isLogging.value = false
  }
}
```

---

## 5. 数据库表结构建议

### 5.1 现有表结构确认

基于现有代码分析，已使用的表：

| 表名 | 所在库 | 用途 | 备注 |
|------|--------|------|------|
| users | wx_app_oa | 用户表 | auth 模块使用 |
| approval_instances | wx_app_oa | 审批实例 | approval 模块使用 |
| approval_flow_nodes | wx_app_oa | 审批流节点 | approval 模块使用 |
| approval_types | wx_app_oa | 审批类型 | 推测存在 |
| messages | wx_app_oa | 消息表 | message 模块使用 |
| daily_reports | daily_report | 日报表 | report 模块使用 |

### 5.2 需新建/扩展的表

#### 5.2.1 daily_reports 表扩展（ALTER 旧表）

```sql
-- 在 daily_report 库中执行
ALTER TABLE daily_reports
  ADD COLUMN `project` varchar(255) DEFAULT NULL COMMENT '项目名称',
  ADD COLUMN `area` varchar(255) DEFAULT NULL COMMENT '项目区域',
  ADD COLUMN `today_work_type` varchar(50) DEFAULT NULL COMMENT '今日工作类型(工作/待工/在途)',
  ADD COLUMN `tomorrow_work_type` varchar(50) DEFAULT NULL COMMENT '明日工作类型',
  ADD COLUMN `work_content` varchar(500) DEFAULT NULL COMMENT '从事工作内容',
  ADD COLUMN `workers` varchar(255) DEFAULT NULL COMMENT '作业人员',
  ADD COLUMN `machine_model` varchar(100) DEFAULT NULL COMMENT '机型',
  ADD COLUMN `worker_count` int(11) DEFAULT '0' COMMENT '人数',
  ADD COLUMN `required_qty` int(11) DEFAULT '0' COMMENT '需要完成数量',
  ADD COLUMN `completed_qty` int(11) DEFAULT '0' COMMENT '累计完成数量',
  ADD COLUMN `progress_percent` int(11) DEFAULT '0' COMMENT '进度百分比',
  ADD COLUMN `remark` text DEFAULT NULL COMMENT '备注',
  ADD COLUMN `entry_date` date DEFAULT NULL COMMENT '入场时间',
  ADD COLUMN `initial_biz_trip_date` date DEFAULT NULL COMMENT '初始出差时间',
  ADD COLUMN `related_party` varchar(255) DEFAULT NULL COMMENT '相关方单位',
  ADD COLUMN `personal_biz_trip_days` int(11) DEFAULT '0' COMMENT '个人累计出差天数',
  ADD COLUMN `files` json DEFAULT NULL COMMENT '附件文件列表',
  ADD COLUMN `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  ADD INDEX `idx_status` (`status`),
  ADD INDEX `idx_report_date` (`report_date`),
  ADD INDEX `idx_user_date` (`user_id`, `report_date`);
```

#### 5.2.2 审核记录表（新建，wx_app_oa 库）

```sql
-- 在 wx_app_oa 库中执行
CREATE TABLE IF NOT EXISTS `review_records` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `report_id` int(11) NOT NULL COMMENT '日报ID',
  `reviewer_id` int(11) NOT NULL COMMENT '审核人ID',
  `action` varchar(20) NOT NULL COMMENT '审核操作: approve/reject',
  `opinion` text DEFAULT NULL COMMENT '审核意见',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_report_id` (`report_id`),
  INDEX `idx_reviewer_id` (`reviewer_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审核记录表';
```

#### 5.2.3 审批抄送表（新建，wx_app_oa 库）

```sql
-- 在 wx_app_oa 库中执行
CREATE TABLE IF NOT EXISTS `approval_cc` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `instance_id` int(11) NOT NULL COMMENT '审批实例ID',
  `user_id` int(11) NOT NULL COMMENT '抄送人ID',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_instance_id` (`instance_id`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审批抄送表';
```

### 5.3 数据库兼容方案

**方案选择**：ALTER daily_reports 表（推荐）

理由：
1. 已有大量旧数据在 daily_report 库中，新建表会导致数据隔离
2. 前端 report-edit.vue 表单字段多达 20+ 个，需要完整存储
3. ALTER 操作为非破坏性变更，线上可平滑执行

**备选方案**：在 wx_app_oa 库建 oa_daily_reports 新表
- 适用场景：旧表结构差异过大
- 缺点：需做数据迁移，审核逻辑需跨库查询
- 选择条件：如旧表字段名与前端表单差异太大，无法通过 ALTER 兼容

---

## 6. 工程分拆方案

### 6.1 并行开发子任务

#### 子任务 A: Stats 模块（后端全新开发）

| 内容 | 文件变更 |
|------|---------|
| 新建 stats.controller.js | `backend/src/features/controllers/stats.controller.js` |
| 新建 stats.service.js | `backend/src/features/services/stats.service.js` |
| 新建 stats.routes.js | `backend/src/features/routes/stats.routes.js` |
| 注册路由到 app.js | `backend/src/app.js` (新增 `app.use('/api/stats', statsRoutes)`) |
| 新增前端 stats.js | `miniapp/src/services/modules/stats.js` |
| 更新 index.js | `miniapp/src/services/index.js` (导出 statsApi) |

#### 子任务 B: Review 模块（后端全新开发）

| 内容 | 文件变更 |
|------|---------|
| 新建 review.controller.js | `backend/src/features/controllers/review.controller.js` |
| 新建 review.service.js | `backend/src/features/services/review.service.js` |
| 新建 review.routes.js | `backend/src/features/routes/review.routes.js` |
| 注册路由到 app.js | `backend/src/app.js` (新增 `app.use('/api', reviewRoutes)`) |
| 数据库迁移 | 执行 review_records 建表 SQL |

#### 子任务 C: Approval 模块改造（后端改造）

| 内容 | 文件变更 |
|------|---------|
| controller 参数映射 | `backend/src/core/controllers/approval.controller.js` |
| service list 扩展 | `backend/src/core/services/approval.service.js` |
| service create 扩展 | `backend/src/core/services/approval.service.js` |
| 数据库迁移 | 执行 approval_cc 建表 SQL |

#### 子任务 D: Report 模块补齐（后端改造）

| 内容 | 文件变更 |
|------|---------|
| controller submit 扩展 | `backend/src/core/controllers/report.controller.js` |
| controller 新增 draft/delete | `backend/src/core/controllers/report.controller.js` |
| service submit 扩展 | `backend/src/core/services/report.service.js` |
| service 新增 getDraft/deleteReport | `backend/src/core/services/report.service.js` |
| routes 新增路由 | `backend/src/core/routes/report.routes.js` |
| 数据库迁移 | 执行 daily_reports ALTER SQL |
| 前端 report.js 扩展 | `miniapp/src/services/modules/report.js` (新增 saveDraft/getDraft/delete 方法) |

#### 子任务 E: Message 字段对齐（后端调整）

| 内容 | 文件变更 |
|------|---------|
| 字段映射格式化 | `backend/src/core/services/message.service.js` |

#### 子任务 F: 前端首页改造

| 内容 | 文件变更 |
|------|---------|
| 对接 stats API | `miniapp/src/pages/home/index.vue` |
| 对接 message unread | `miniapp/src/pages/home/index.vue` |
| 移除 setTimeout | `miniapp/src/pages/home/index.vue` |

#### 子任务 G: 前端审批中心改造

| 内容 | 文件变更 |
|------|---------|
| 对接 approval API | `miniapp/src/pages/approval/index/index.vue` |
| Tab/筛选联动 API | `miniapp/src/pages/approval/index/index.vue` |
| 新增分页 | `miniapp/src/pages/approval/index/index.vue` |

#### 子任务 H: 前端日报历史改造

| 内容 | 文件变更 |
|------|---------|
| 对接 report API | `miniapp/src/pages/employee/report-history/index.vue` |
| Tab 切换 API 调用 | `miniapp/src/pages/employee/report-history/index.vue` |
| 移除 setTimeout | `miniapp/src/pages/employee/report-history/index.vue` |

#### 子任务 I: 前端消息中心改造

| 内容 | 文件变更 |
|------|---------|
| 对接 message API | `miniapp/src/pages/message/index.vue` |
| Tab 切换 API 调用 | `miniapp/src/pages/message/index.vue` |
| markRead API 调用 | `miniapp/src/pages/message/index.vue` |

#### 子任务 J: 前端审核管理改造

| 内容 | 文件变更 |
|------|---------|
| 对接 review API | `miniapp/src/pages/admin/review-list/index.vue` |
| 对接 reviewStats API | `miniapp/src/pages/admin/review-list/index.vue` |

#### 子任务 K: 前端登录页改造

| 内容 | 文件变更 |
|------|---------|
| 改用 authApi | `miniapp/src/pages/login/index.vue` |

#### 子任务 L: request.js 改造

| 内容 | 文件变更 |
|------|---------|
| 移除 mock 分支 | `miniapp/src/services/request.js` |
| 添加 dev-token 处理 | `miniapp/src/services/request.js` |

### 6.2 依赖关系与并行策略

```
                        第一波并行 (可同时开工)
                        ┌─────────────────────┐
                        │  子任务A: Stats模块  │  ← 无依赖
                        │  子任务B: Review模块  │  ← 需先确认 daily_reports 表结构
                        │  子任务C: Approval改造│  ← 依赖现有 core 代码
                        │  子任务E: Message对齐 │  ← 无依赖
                        │  子任务L: request.js  │  ← 无依赖
                        └─────────┬───────────┘
                                  │
                        第二波并行 (后端完成后)
                        ┌─────────────────────┐
                        │  子任务D: Report补齐  │  ← 需子任务E确认表字段 (回退: 可独立)
                        │  子任务F: 首页改造     │  ← 需子任务A完成
                        │  子任务G: 审批中心改造  │  ← 需子任务C完成
                        │  子任务K: 登录页改造   │  ← 无依赖 (可并行第一波)
                        └─────────┬───────────┘
                                  │
                        第三波并行
                        ┌─────────────────────┐
                        │  子任务H: 日报历史改造 │  ← 需子任务D完成
                        │  子任务I: 消息中心改造 │  ← 需子任务E完成
                        │  子任务J: 审核管理改造  │  ← 需子任务B完成
                        └─────────────────────┘
```

### 6.3 推荐开发顺序

| 优先级 | 子任务 | 预估工时 | 开发者 |
|--------|--------|---------|--------|
| P0-1 | L: request.js 改造 | 1h | 前端工程师 |
| P0-2 | E: Message 字段对齐 | 0.5h | 后端工程师 |
| P0-3 | A: Stats 模块 | 3h | 后端工程师 |
| P0-4 | C: Approval 改造 | 2h | 后端工程师 |
| P0-5 | B: Review 模块 | 4h | 后端工程师 |
| P0-6 | F: 首页改造 | 3h | 前端工程师 |
| P0-7 | G: 审批中心改造 | 2h | 前端工程师 |
| P0-8 | D: Report 补齐 | 4h | 后端工程师 |
| P0-9 | K: 登录页改造 | 0.5h | 前端工程师 |
| P0-10 | H: 日报历史改造 | 2h | 前端工程师 |
| P0-11 | I: 消息中心改造 | 2h | 前端工程师 |
| P0-12 | J: 审核管理改造 | 2h | 前端工程师 |

---

## 7. 风险与关键决策

### 7.1 待决策事项

| 决策项 | 选项 | 建议 |
|--------|------|------|
| daily_reports 表扩展方式 | A: ALTER 旧表 / B: 新建 oa_daily_reports 表 | **建议 A**，兼容已有数据 |
| Review API 路径 | A: `/api/project/review*` / B: `/api/review/*` | **建议 A**，保持与前端 review.js 一致 |
| 审核记录的独立存储 | A: 新建 review_records 表 / B: 复用 approval_flow_nodes | **建议 A**，逻辑清晰独立 |
| dev-token mock 数据范围 | A: 全部接口 mock / B: 仅关键接口 mock | **建议 B**，按需添加，降低维护成本 |

### 7.2 关键风险与缓释

| 风险 | 触发条件 | 影响 | 缓释措施 |
|------|---------|------|---------|
| daily_reports 表已有数据与扩展字段冲突 | ALTER 执行时旧数据无默认值 | 迁移失败 | ALTER 使用 DEFAULT NULL |
| 审批参数映射遗漏 | 前端按 API 文档格式传参但后端未映射 | 接口返回空/异常 | Controller 层做双向映射，新旧参数都支持 |
| API 网关/CORS 问题 | 前端请求跨域 | 请求失败 | 确认后端 CORS 配置已涵盖小程序域名 |
| 分页参数 POST vs GET | 全部使用 POST 传 body 分页 | 与 REST 习惯不符 | 保持统一用 POST + body，前后端约定一致 |

### 7.3 验收检查清单

- [ ] POST /api/stats/home 返回正确统计数据
- [ ] POST /api/stats/activities 返回分页动态
- [ ] POST /api/approval/list 支持 tab(type) 参数
- [ ] POST /api/approval/approve 支持 action: approve/reject
- [ ] POST /api/project/reviewList 返回审核列表
- [ ] POST /api/project/reviewAction 执行审核操作
- [ ] POST /api/report/submit 支持完整 formData
- [ ] POST /api/report/draft 保存草稿
- [ ] DELETE /api/report/delete 删除日报
- [ ] 首页数据来自 API (无硬编码)
- [ ] 审批中心列表来自 API (Tab/筛选联动)
- [ ] 日报历史列表来自 API (Tab 筛选)
- [ ] 消息中心列表来自 API (Tab 分类)
- [ ] 审核管理列表来自 API (Tab 筛选)
- [ ] request.js 无 setTimeout mock
- [ ] request.js 正确处理 dev-mode-token
