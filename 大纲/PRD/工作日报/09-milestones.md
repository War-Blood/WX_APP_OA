# 09-milestones — 里程碑

> 维度：实施计划（阶段、依赖、Agent 分工、风险）
> 读者：项目负责人、所有开发 Agent
> 上游依赖：`07-agent-matrix.md`、`08-acceptance.md`
> 下游影响：阶段 4 implement

## 文档目标

定义工作日报的实施计划。**本期实现已完成**（commit `12e3963`），本文档作为实施记录与后续 P1/P2 排期依据。

## 1. 实施阶段

### 阶段概览

| 阶段 | 内容 | 产出 | 依赖 | 状态 |
|------|------|------|------|------|
| 1 | 后端放行与统计放开 | report.controller/service + stats.service | 无 | ✅ 已完成 |
| 2 | 小程序接入 | Tab/标签/统计渲染 | 阶段 1 | ✅ 已完成 |
| 3 | Web 管理页 | daily.vue + 路由/菜单/标签 | 阶段 1 | ✅ 已完成 |
| 4 | 构建验证 | node --check / vue-tsc / build:mp-weixin | 阶段 2+3 | ✅ 已完成 |
| 5 | P1 补填历史 | 放开工作日报日期限制 | 阶段 4 | ⬜ 待排期 |
| 6 | P2 草稿/统计扩展 | 草稿恢复 + 未填写/个人统计纳入 | 阶段 5 | ⬜ 待排期 |

### 阶段详细

#### 阶段 1：后端放行与统计放开（已完成）

- **内容**：submit 白名单放行 office、office 跳过工作类型校验；list 支持 reportType 筛选；stats 当日/明日/日历放开 office
- **产出文件**：
  - `backend/src/core/controllers/report.controller.js`
  - `backend/src/core/services/report.service.js`
  - `backend/src/core/services/stats.service.js`
- **校验**：node --check 通过

#### 阶段 2：小程序接入（已完成）

- **内容**：写日报页工作日报 Tab、四字段表单、类型/状态标签
- **产出文件**：
  - `miniapp/src/pages/employee/report-edit/index.vue`
  - `miniapp/src/pages/profile/stats.vue`
  - `miniapp/src/pages/employee/report-history/index.vue`
  - `miniapp/src/pages/employee/report-detail/index.vue`
  - `miniapp/src/pages/admin/daily-overview/index.vue`
- **校验**：build:mp-weixin 构建成功

#### 阶段 3：Web 管理页（已完成）

- **内容**：工作日报管理页 + 路由/菜单 + office 标签
- **产出文件**：
  - `webapp/src/views/report/daily.vue`（新建）
  - `webapp/src/views/report/index.vue`、`daily-status.vue`
  - `webapp/src/api/report.ts`、`router/index.ts`、`config/modules.ts`、`components/ReportDetailDialog.vue`
- **校验**：vue-tsc type-check 零错误

#### 阶段 5：P1 补填历史（待排期）

- **内容**：工作日报放开日期限制，可补录过去日期
- **产出**：report-edit 日期 picker 条件放开 + 后端（如需）校验调整
- **校验**：可补录历史日期并进入统计

#### 阶段 6：P2 草稿/统计扩展（待排期）

- **内容**：工作日报草稿恢复；首页「未填写」统计卡、个人统计纳入工作日报
- **产出**：草稿逻辑 + features stats 口径调整
- **校验**：草稿可续写；未填写/个人统计含工作日报

## 2. 依赖关系

```
阶段1（后端放行+统计）
   ↓
阶段2（小程序）─┐
   ↓           ├→ 阶段4（构建验证）→ 部署
阶段3（Web）──┘
   ↓
阶段5（P1 补填）→ 阶段6（P2 扩展）
```

- 阶段 2 与 3 依赖阶段 1（接口放行后前端才能联调）
- 阶段 5/6 为后续迭代，依赖本期上线

## 3. Agent 分工表

| 阶段 | Agent | 任务 | 状态 |
|------|-------|------|------|
| 1 | core-agent（stats 跨 data-agent，orchestrator 协调） | controller/service/stats 改动 | ✅ |
| 2 | miniapp-core-agent + miniapp-admin-agent | Tab/标签/统计 | ✅ |
| 3 | webapp-core-agent + webapp-common-agent | 管理页/路由/标签 | ✅ |
| 4 | orchestrator | 构建验证（node/vue-tsc/uni build） | ✅ |
| 5 | miniapp-core-agent + core-agent | 补填历史 | ⬜ |
| 6 | miniapp-core-agent + data-agent | 草稿/统计扩展 | ⬜ |

## 4. 风险项

| # | 风险 | 影响 | 概率 | 应对 |
|---|------|------|------|------|
| 1 | office 与现有统计过滤冲突 | 某统计视图把工作日报算错 | 中 | 保留排除位置（项目/人员/个人统计）按需求文档冻结 |
| 2 | 日历 submitted > total | 工作日报提交者未计入 total | 低 | 已实现 officeDateSet 计入 total，验证确认 |
| 3 | 员工误在出差日填工作日报 | 公出统计口径失真 | 低 | 目前二选一由用户自选，暂不强制 |
| 4 | 工作日报无审核 | 填报质量风险 | 中 | 已明确不引入审核，靠管理员 Web 编辑纠偏 |

## 5. 里程碑节点

| 里程碑 | 完成标志 | 状态 |
|--------|---------|------|
| M1 后端就绪 | 接口放行 office、统计放开 | ✅ |
| M2 前端就绪 | 小程序 Tab/标签 + Web 管理页 | ✅ |
| M3 质量通过 | node --check / vue-tsc / uni build 通过 | ✅ |
| M4 上线就绪 | commit 12e3963 推送 test;待部署 | 🔄 进行中（待部署验证） |
| M5 P1 补填 | 可补录历史 | ⬜ |
| M6 P2 扩展 | 草稿/统计扩展 | ⬜ |

## 变更记录

| 日期 | 变更内容 | 变更人 |
|------|---------|--------|
| 2026-08-05 | 初始创建（本期已完成，P1/P2 待排期） | 殇血轮回 |
