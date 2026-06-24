# 智慧办公助手 OA 小程序 — 后端补全 & 前端对接需求分析文档

| 文档版本 | 修订日期   | 修订内容                       | 修订人     |
| -------- | ---------- | ------------------------------ | ---------- |
| V1.0     | 2026-05-29 | 完整需求分析（后端补全+前端对接） | 许清楚 PM |

---

## 一、需求范围总览

本次需求的总体目标是：**让前后端真正跑通，消除所有假数据和空桩代码**。

### 范围全景

```
┌────────────────────────────────────────────────────────────────────┐
│                      需求范围全景图                                  │
├──────────┬────────────────────────┬───────────────────────────────┤
│  模块     │ 后端 (features/ 补全)  │ 小程序前端 (对接改造)          │
├──────────┼────────────────────────┼───────────────────────────────┤
│ 认证/用户 │ ✅ 已完成              │ ✅ 已完成 (登录页)             │
│ 审批      │ ⏳ core/ 有基础实现     │ ❌ 假数据 (首页 + 审批列表)   │
│ 日报      │ ⏳ core/ 有基础实现     │ ❌ 假数据 (日报历史列表)       │
│ 审核      │ ❌ features/ 空桩       │ ❌ 假数据 (审核列表)           │
│ 消息      │ ⏳ core/ 有基础实现     │ ❌ 未接入 API (消息列表)       │
│ 数据统计   │ ❌ features/ 空桩       │ ❌ 硬编码数据 (首页统计)       │
│ 公告      │ ❌ features/ 空桩       │ ⏳ 页面未创建                 │
│ 项目      │ ❌ features/ 空桩       │ ⏳ 页面未创建                 │
│ 资产      │ ❌ features/ 空桩       │ ⏳ 页面未创建                 │
│ 用户管理  │ ❌ features/ 空桩       │ ⏳ 页面未创建                 │
└──────────┴────────────────────────┴───────────────────────────────┘
```

---

## 二、后端补全需求明细

### 2.1 审批模块 (Approval) — 对 core/ 已有实现做兼容补齐

**现状**：core/ 下已有 list、detail、create、approve 四个接口的 controller/service/route。但 API 文档定义的参数与 core 实现不完全一致。

**需补齐内容**：

| 接口 | API 文档路径 | 现状 | 改动要求 |
|------|-------------|------|---------|
| 审批列表 | POST /api/approval/list | core/ 已实现 | **需改造**：API 文档用 `tab` (pending/mine/done) + `type` 参数；core 实现用 `status` + `typeId`。需调整 controller 做参数映射，或统一到 API 文档标准 |
| 审批详情 | POST /api/approval/detail | core/ 已实现 | 基本可用，需确认返回字段对齐 API 文档（含 applicant 对象、formData 等） |
| 发起审批 | POST /api/approval/create | core/ 已实现 | 参数名需对齐：core 用 `approvalTypeId`，API 文档用 `type` + `formData` + `approverId` + `ccIds` |
| 审批操作 | POST /api/approval/approve | core/ 已实现 | 参数名需统一：core 用 `action` (approved/rejected) + `comment`，API 文档用 `action` (approve/reject) + `opinion` |

> **建议方案**：以 API 文档为标准改造 core 实现，同时在 controller 层做兼容适配。

---

### 2.2 日报模块 (Report) — 完善 core/ 已有实现

**现状**：core/ 下已有 list、detail、submit 三个接口，但 submit 的参数字段较少，缺少 draft、delete 接口。

**需补齐内容**：

| 接口 | API 文档路径 | 现状 | 改动要求 |
|------|-------------|------|---------|
| 日报列表 | POST /api/report/list | core/ 已实现 | 基本可用，检查字段映射 |
| 日报详情 | POST /api/report/detail | core/ 已实现 | 基本可用，需对齐 API 文档的完整字段集（50+ 字段） |
| 提交日报 | POST /api/report/submit | core/ 已实现 | **需改造**：core 仅支持 content/reportDate/todayWork/tomorrowPlan/issues 5个字段，API 文档定义超过20个字段。需扩展 formData 支持 |
| 获取草稿 | POST /api/report/draft | ❌ 未实现 | **需新增** |
| 删除日报 | DELETE /api/report/delete | ❌ 未实现 | **需新增** |

---

### 2.3 审核模块 (Review) — 全新开发

**现状**：features/ 下全部为空桩。API 文档定义在 `/api/project/review*` 路径下。

**需完全新建的内容**：

| 接口 | API 文档路径 | 优先级 | 说明 |
|------|-------------|--------|------|
| 审核列表 | POST /api/project/reviewList | P0 | 管理员获取待审核/已审核日报，支持分页筛选 |
| 审核详情 | POST /api/project/reviewDetail | P0 | 查看日报完整内容 |
| 审核操作 | POST /api/project/reviewAction | P0 | 通过/驳回，驳回必须填写原因 |
| 审核统计 | POST /api/project/reviewStats | P1 | 待审核数/今日审核数/通过率/趋势 |

**建议存放位置**：新建 `backend/src/review/` 模块 (controllers/routes/services)，或在 features/ 下实现。

---

### 2.4 数据统计模块 (Stats) — 全新开发

**现状**：features/ 下全部为空桩。

**需完全新建的内容**：

| 接口 | API 文档路径 | 优先级 | 说明 |
|------|-------------|--------|------|
| 首页统计 | POST /api/stats/home | P0 | 按角色返回待审批/待审核/已处理/未读消息数 |
| 最近动态 | POST /api/stats/activities | P0 | 返回首页时间线动态数据 |
| 个人中心统计 | POST /api/stats/profile | P1 | 个人数据统计 |

**建议存放位置**：新建 `backend/src/stats/` 模块。

---

### 2.5 消息模块 (Message) — 完善已有实现

**现状**：core/ 下已有完整实现（list/detail/unreadCount/markRead），无需大改。

**需确认/补齐**：

| 接口 | API 文档路径 | 状态 | 操作 |
|------|-------------|------|------|
| 消息列表 | POST /api/message/list | ✅ 已实现 | 确认字段对齐（type/title/desc/time/isRead/icon/iconBg） |
| 消息详情 | POST /api/message/detail | ✅ 已实现 | 确认字段对齐（body/actionText/actionRoute/relatedId） |
| 未读消息数 | POST /api/message/unread | ✅ 已实现 | 确认返回值字段名为 count |
| 标记已读 | POST /api/message/markRead | ✅ 已实现 | 确认 id 可选（传 id 标记单条，不传标全部） |

---

### 2.6 公告模块 (Announcement) — 全新开发（P1）

**需新建**：

| 接口 | API 文档路径 | 优先级 |
|------|-------------|--------|
| 公告列表 | POST /api/announcement/list | P1 |
| 公告详情 | POST /api/announcement/detail | P1 |
| 发布公告 | POST /api/announcement/publish | P1 |

---

### 2.7 项目管理模块 (Project) — 全新开发（P1）

**需新建**：

| 接口 | API 文档路径 | 优先级 |
|------|-------------|--------|
| 项目列表 | POST /api/project/list | P1 |
| 项目详情 | POST /api/project/detail | P1 |
| 项目统计 | POST /api/project/stats | P1 |
| 提交项目日报 | POST /api/project/submit | P1 |

---

### 2.8 用户管理模块 (Admin) — 全新开发（P1）

**需新建**：

| 接口 | API 文档路径 | 优先级 |
|------|-------------|--------|
| 用户列表 | POST /api/admin/users | P1 |
| 设置管理员 | POST /api/admin/setAdmin | P1 |
| 禁用/启用用户 | POST /api/admin/toggleUser | P1 |

---

### 2.9 资产管理模块 (Asset) — 全新开发（P2）

**需新建**：

| 接口 | API 文档路径 | 优先级 |
|------|-------------|--------|
| 资产列表 | POST /api/asset/list | P2 |
| 资产详情 | POST /api/asset/detail | P2 |
| 资产申购 | POST /api/asset/apply | P2 |

---

## 三、前端对接改造需求明细

### 3.1 首页 (pages/home/index.vue)

**问题清单**：

| 问题 | 代码位置 | 当前行为 | 目标行为 |
|------|---------|---------|---------|
| ❌ 统计数据硬编码 | L152-L167 | stats 直接写死数字 (待审批3/待审核5/已处理28/待阅读5) | 调用 POST /api/stats/home 获取实时数据 |
| ❌ 动态列表硬编码 | L200-L237 | activities 是4条写死的假数据 | 调用 POST /api/stats/activities 获取真实动态 |
| ❌ 下拉刷新使用 setTimeout | L239-L245 | setTimeout 1秒后模拟刷新成功 | 真实调用 stats/home 和 stats/activities 接口 |
| ❌ 上拉加载使用 setTimeout | L247-L254 | setTimeout 1秒后标记"没有更多" | 真实分页调用 activities 接口 |
| ❌ 未读消息数硬编码 | L150 | unreadCount = ref(5) | 调用 POST /api/message/unread 获取真实未读数 |
| ❌ 待办事项数量硬编码 | L185-L198 | tasks 数字写死 | 从 stats/home 返回值中提取 |

**改造要求**：
- 页面 onMounted 时调用 statsApi.getHomeStats() 填充统计数据
- 页面 onMounted 时调用 statsApi.getActivities() 填充动态列表
- 下拉刷新时重新请求上述两个接口
- 上拉加载时传入分页参数请求更多动态
- 顶部通知铃铛角标从 messageApi.getUnreadCount() 获取

---

### 3.2 审批中心 (pages/approval/index/index.vue)

**问题清单**：

| 问题 | 代码位置 | 当前行为 | 目标行为 |
|------|---------|---------|---------|
| ❌ 审批列表硬编码 | L94-L128 | 3条写死的假数据 | 调用 POST /api/approval/list 获取实时列表 |
| ❌ Tab 切换无 API 调用 | L138-L140 | switchTab 只改本地 activeTab | Tab 切换时重新调用 approvalApi.getList({ tab: key }) |
| ❌ 筛选标签无 API 调用 | L74 | activeFilter 只做本地状态 | 筛选变化时调用 approvalApi.getList({ tab, type }) |

**改造要求**：
- onMounted 时调用 approvalApi.getList({ tab: 'pending' }) 获取数据
- switchTab 时重新请求对应 tab 的数据
- 筛选标签变化时附加 type 参数重新请求
- 分页支持：上拉加载更多时 page++ 继续请求

---

### 3.3 日报历史 (pages/employee/report-history/index.vue)

**问题清单**：

| 问题 | 代码位置 | 当前行为 | 目标行为 |
|------|---------|---------|---------|
| ❌ 日报列表硬编码 | L88-L97 | 8条写死的假数据 | 调用 POST /api/report/list 获取实时列表 |
| ❌ Tab 切换无 API 调用 | L124-L127 | 只改本地 activeTab | Tab 切换时调用 reportApi.getList({ status: key }) |
| ❌ 上拉加载使用 setTimeout | L141-L146 | setTimeout 标记"没有更多" | 真实分页加载 |

**改造要求**：
- onMounted 时调用 reportApi.getList({ status: 'all', page: 1, pageSize: 20 })
- 切换 Tab 时重新请求
- 上拉加载更多数据

---

### 3.4 消息中心 (pages/message/index.vue) — 未接入 API

**问题**：消息列表未接入 API，疑似无数据或 mock 数据。

**改造要求**：
- onMounted 时调用 messageApi.getList({ type: 'all', page: 1 })
- 分类 Tab 切换时调用 messageApi.getList({ type: tabKey })
- 点击消息时调用 messageApi.markRead(id) 标记已读
- 接入 messageApi.getUnreadCount() 获取未读数

---

### 3.5 登录页 (pages/login/index.vue)

**问题清单**：

| 问题 | 代码位置 | 当前行为 | 目标行为 |
|------|---------|---------|---------|
| ⚠️ 跳过登录存假 token | L93-L100 | 存 'dev-mode-token' 和假 userInfo | 保留开发模式但添加标识，确保 API 调用不会发送假 token 到后端 |
| ❌ 微信登录直接调 uni.request | L117-L128 | 直接写 HTTP 调用，未使用 authApi | 改用 authApi.login(code) 统一请求封装 |

**改造要求**：
- 微信登录改用 authApi.login(code) 封装好的方法
- 开发调试模式保留，但所有 API 调用应能识别 dev-token 并跳过真实请求或返回 mock

---

### 3.6 其他页面数据源检查

需检查以下页面是否使用了后端 API 或硬编码数据：

| 页面路径 | 可能问题 | 优先级 |
|---------|---------|--------|
| pages/approval/detail.vue | 审批详情数据来源 | P0 |
| pages/approval/create/index.vue | 发起审批提交逻辑 | P0 |
| pages/employee/report-detail/index.vue | 日报详情数据来源 | P0 |
| pages/employee/report-edit/index.vue | 日报编辑/提交逻辑 | P0 |
| pages/employee/rejected-edit/index.vue | 驳回重提逻辑 | P0 |
| pages/admin/review-list/index.vue | 审核列表数据来源 | P0 |
| pages/admin/review-detail/index.vue | 审核详情/操作逻辑 | P0 |
| pages/message/detail.vue | 消息详情数据来源 | P1 |

---

## 四、优先级分级

### P0 — 阻塞级（本次必须完成）

| 编号 | 模块 | 内容 | 原因 |
|------|------|------|------|
| P0-01 | 后端 | stats/home + stats/activities 接口 | 首页核心数据，阻塞首页改造 |
| P0-02 | 后端 | approval/list 参数对齐 API 文档 tab+type | 阻塞审批中心改造 |
| P0-03 | 后端 | review/reviewList + reviewDetail + reviewAction | 阻塞审核管理改造 |
| P0-04 | 后端 | report/draft + report/delete + report/submit 字段补齐 | 阻塞日报编辑/详情改造 |
| P0-05 | 前端 | 首页 stats + activities 改为 API 调用 | 核心页面，用户最先看到 |
| P0-06 | 前端 | 审批中心列表改为 API 调用 | 核心功能 |
| P0-07 | 前端 | 日报历史列表改为 API 调用 | 核心功能 |
| P0-08 | 前端 | 消息中心接入 API | 核心功能 |
| P0-09 | 前端 | 移除首页 setTimeout 模拟刷新/加载 | 消除假数据 |

### P1 — 重要级（建议本次完成）

| 编号 | 模块 | 内容 | 原因 |
|------|------|------|------|
| P1-01 | 后端 | review/reviewStats 接口 | 管理员审核统计 |
| P1-02 | 后端 | announcement/list + detail + publish | 公告模块 |
| P1-03 | 后端 | project/list + detail + stats + submit | 项目模块 |
| P1-04 | 后端 | admin/users + setAdmin + toggleUser | 用户管理 |
| P1-05 | 前端 | 审批详情页对接 API | 审批流程完整闭环 |
| P1-06 | 前端 | 发起审批页对接 API | 审批流程完整闭环 |
| P1-07 | 前端 | 日报详情页对接 API | 日报流程完整闭环 |
| P1-08 | 前端 | 审核列表/详情页对接 API | 管理端核心功能 |
| P1-09 | 前端 | 消息详情页对接 API | 消息流程完整闭环 |

### P2 — 增强级（可选）

| 编号 | 模块 | 内容 |
|------|------|------|
| P2-01 | 后端+前端 | 资产管理模块（list/detail/apply） |
| P2-02 | 后端+前端 | 项目统计/数据可视化 |

---

## 五、交互要求

### 5.1 数据加载状态

所有列表/详情页面必须实现以下三种状态：

| 状态 | 表现 |
|------|------|
| **加载中** | 页面/区域显示 Loading 组件或骨架屏。列表页首次加载显示全屏 loading，切换 Tab/筛选时显示局部 loading |
| **加载成功** | 正常渲染数据。有数据时显示列表/卡片，无数据时显示空状态组件 |
| **加载失败** | Toast 提示错误信息，提供"重试"按钮或下拉刷新触发重试 |

### 5.2 错误处理

| 场景 | 前端处理 |
|------|---------|
| 401 Token 过期 | request.js 已实现：自动跳转登录页 |
| 403 无权限 | Toast 提示"无权限访问"，返回上一页 |
| 400 参数错误 | Toast 显示后端返回的具体错误信息 |
| 网络异常 | Toast 提示"网络异常，请检查网络连接" |
| 后端 500 | Toast 提示"服务器繁忙，请稍后重试" |

### 5.3 空状态

| 场景 | 空状态文案 |
|------|-----------|
| 审批列表为空 | "暂无审批记录" + "当前筛选条件下没有审批单" |
| 日报列表为空 | "暂无日报" + "当前筛选条件下没有日报记录" |
| 消息列表为空 | "暂无消息" + "当前分类下没有消息" |
| 动态列表为空 | "暂无动态" + "团队动态将在有操作时显示" |
| 审核列表为空 | "暂无待审核日报" + "所有日报已审核完毕" |

### 5.4 操作反馈

| 操作 | 反馈 |
|------|------|
| 提交日报 | 提交中显示 Loading → 成功 Toast "提交成功" → 返回列表页 |
| 审批通过/驳回 | 操作中显示 Loading → 成功 Toast → 刷新列表 |
| 标记已读 | 无感操作，不显示 Toast |
| 下拉刷新 | 显示刷新指示器 → 刷新成功后 Toast "刷新成功" |
| 上拉加载更多 | 底部显示"加载中..." → 加载完毕显示数据 / "已经到底啦" |

---

## 六、依赖关系

### 6.1 模块依赖图

```
                          ┌──────────────────┐
                          │  Auth (已完成)     │
                          │  /api/auth/login  │
                          │  /api/user/profile │
                          └────────┬─────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            ▼                      ▼                      ▼
    ┌──────────────┐     ┌──────────────────┐   ┌────────────────┐
    │  Stats (新建) │     │  Approval (补齐)  │   │  Message (已有) │
    │ 依赖: Auth    │     │ 依赖: Auth        │   │ 依赖: Auth      │
    │ 无其他依赖    │     │ 依赖: users 表    │   │ 无其他依赖      │
    └──────┬───────┘     └──────────────────┘   └────────────────┘
           │                      
           ▼                      
    ┌──────────────┐     ┌──────────────────┐
    │  Report (补齐) │◄────│ Review (新建)    │
    │ 依赖: Auth    │     │ 依赖: Auth       │
    │              │     │ 依赖: Report     │
    └──────────────┘     └──────────────────┘
           │
           ▼
    ┌──────────────────┐   ┌──────────────────┐
    │  Project (新建)   │   │  Announcement     │
    │ 依赖: Auth        │   │  (新建)           │
    │ 依赖: Report     │   │ 依赖: Auth       │
    └──────────────────┘   └──────────────────┘
```

### 6.2 开发顺序建议

```
第一梯队 (P0 后端)
  1. stats/home + stats/activities (无依赖，可最先开发)
  2. approval/list 参数对齐 (已有 core，改造即可)
  3. review 模块 (新建，依赖 approval.list 基础逻辑)
  4. report/draft + delete + submit 字段补齐
  
第二梯队 (P0 前端)
  5. 首页对接 stats API
  6. 审批中心对接 approval API
  7. 日报历史对接 report API
  8. 审核列表对接 review API
  9. 消息中心对接 message API

第三梯队 (P1)
  10. reviewStats 接口
  11. 审批详情页对接
  12. 发起审批页对接
  13. 公告/项目/用户管理模块
```

---

## 七、新增 API 模块建议文件结构

### 7.1 Stats 模块

```
backend/src/stats/
├── controllers/
│   └── stats.controller.js    # home / activities / profile
├── routes/
│   └── stats.routes.js        # 挂载到 /api/stats/*
└── services/
    └── stats.service.js       # 统计查询逻辑
```

### 7.2 Review 模块

```
backend/src/review/
├── controllers/
│   └── review.controller.js   # reviewList / reviewDetail / reviewAction / reviewStats
├── routes/
│   └── review.routes.js       # 挂载到 /api/project/review*
└── services/
    └── review.service.js      # 审核逻辑
```

### 7.3 前端新增 API 模块

```
miniapp/src/services/modules/
├── stats.js                   # 新增：统计相关 API
└── announcement.js            # 新增：公告相关 API（P1）

miniapp/src/services/index.js  # 更新导出
```

---

## 八、风险与注意事项

| 风险 | 说明 | 缓释措施 |
|------|------|---------|
| 数据库表结构与 API 文档字段不匹配 | core/ 的 daily_reports 表字段少于 API 文档定义 | 建新表或 alter 表加字段，优先保证 API 返回结构一致 |
| Approval 参数不统一 | API 文档与 core 实现参数名/结构不同 | 后端做参数映射转换，前端按 API 文档格式传参 |
| 开发调试模式影响 | "跳过登录"存的假 token 会被发往后端 | 在 request.js 中判断 dev-mode-token 时跳过真实请求，或返回 mock |
| 分页参数约定 | API 文档用 POST + body 传 page/pageSize | 后端统一接收 body 参数，前端统一用 POST |
| 审核与日报的关系 | review 复用 report 数据，两者有耦合 | review service 可直接查询 daily_reports 表 + 审核相关表 |

---

## 九、成功验收标准

### 9.1 功能验收

| 验收项 | 验收标准 |
|--------|---------|
| 首页数据 | 打开首页展示真实统计数据，动态列表来自 API |
| 审批中心 | Tab 切换、类型筛选均请求后端，数据真实 |
| 日报历史 | 列表数据来自 API，Tab 筛选生效 |
| 审核管理 | 管理员可查看待审核列表，执行通过/驳回 |
| 消息中心 | 列表展示真实消息，未读标记正常，分类切换生效 |
| 无假数据 | 全页面无硬编码列表数据，无 setTimeout 模拟 |

### 9.2 质量验收

| 验收项 | 验收标准 |
|--------|---------|
| Loading 状态 | 每个列表/详情页有加载中反馈 |
| 空状态 | 无数据时显示对应的空状态组件 |
| 错误处理 | 网络异常/Token 过期/无权限友好提示 |
| 分页 | 列表页面支持上拉加载更多 |
