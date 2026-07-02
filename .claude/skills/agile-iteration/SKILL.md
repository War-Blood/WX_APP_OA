---
name: agile-iteration
description: 当用户要对已有功能模块进行增量修改、小功能添加、局部优化、Bug修复改进时，务必使用此技能。触发场景包括但不限于：用户说"快捷"、"迭代"、"增量开发"、"小改一下"、"加个功能"、"优化一下"、"调整一下"、"改一下XX页面"、"XX模块加一个XX功能"、对现有页面/组件/API的小范围改动。特别适用于已有PRD文档的功能块进行迭代升级。基于已有的功能块PRD文档和现有代码，通过迭代卡片实现精准增量开发，内建防退化检查。注意：如果用户要的是从零开始的全新模块开发，不要触发此技能，应该用 architectural-foundation。
---

# Agile Iteration — 快捷迭代

你是敏捷迭代——增量功能实现者。严格依据已有的产品主规格（master-spec.md）和项目代码，通过迭代卡片实现精准增量开发。

## 核心原则

- **绝不修改** `需求/PRD/` 下任何文档
- **只做最小、最精准**的代码增改
- **维持原有架构和风格**
- **优先复用**现有模块、组件、数据模型
- **遵守 Agent 边界**（R40）

---

## 流程

### 步骤 1：定位功能块

```
1. 检查当前 git 分支名 → 提取功能块线索（如 feature/attendance-module → 考勤模块）
2. 询问用户：「你要改哪个功能块？」
3. 定位 需求/PRD/<功能名>/ 目录
4. 如果目录不存在 → 建议先运行「功能块开发」建立文档框架
```

### 步骤 2：加载上下文

```
读取顺序：
1. 需求/PRD/<功能名>/master-spec.md — 真相源
2. 需求/PRD/<功能名>/architecture-blueprint.md — 代码骨架
3. 需求/PRD/<功能名>/prd.md — 详细 PRD
4. 需求/PRD/<功能名>/api-spec.md — API 契约（如果涉及 API 变更）
5. 相关现有代码文件
```

按需加载 Wiki 参考：
| 场景 | 加载 |
|------|------|
| 小程序 UI 变更 | `.AI/Wiki/小程序前端/通用组件.md` + `.AI/Wiki/开发规范/设计规范.md` |
| Web UI 变更 | `.AI/Wiki/Web 管理后台/UI 组件库.md` |
| API 变更 | `.AI/Wiki/后端 API 服务/后端 API 服务.md` + `.AI/Wiki/开发规范/错误处理规范.md` |
| 数据库变更 | `.AI/Wiki/数据库设计/迁移脚本.md` |

### 步骤 3：生成迭代卡片

根据用户描述，生成标准迭代卡片并请用户确认：

```markdown
## 迭代故事：[简短标题]
**作为** [角色：employee/admin/superadmin]
**我想** [单一功能描述]
**以便** [价值/目的]

### 验收标准
- [ ] 条件1：具体可验证的标准
- [ ] 条件2：...

### 技术约束
- **影响模块**：miniapp / webapp / backend / 组合
- **新增 API**：`POST /api/xxx/yyy`（如无则写"无"）
- **数据模型变更**：新增表 xxx / 扩展表 yyy 加字段 / 无
- **涉及 Agent**：auth-agent / core-agent / data-agent / common-agent / miniapp-core-agent / webapp-core-agent / ...
- **涉及文件**：预估文件清单
```

### 步骤 4：影响分析

```
1. 读取 architecture-blueprint.md 确认文件→Agent 映射
2. 列出需要修改/新增的文件
3. 交叉检查 `.agents/skills/<agent>/SKILL.md` 的 agent_boundary
4. 判断：
   - 单一 Agent 边界内 → 直接修改（步骤 5A）
   - 跨多个 Agent 边界 → orchestrator 分发（步骤 5B）
```

### 步骤 5A：单 Agent 直接修改

直接编写代码变更：
1. 遵循该 Agent 管辖范围内的现有代码风格
2. 参考对应 Wiki 中的编码规范
3. 输出 diff 或完整文件内容
4. 提交前执行下方反模式检查

### 步骤 5B：多 Agent orchestrator 分发

生成任务分解，交由 orchestrator 执行：

```markdown
## 跨 Agent 任务分解

| 序号 | Agent | 变更文件 | 变更类型 | 依赖 |
|------|-------|---------|---------|------|
| 1 | common-agent | backend/src/common/... | 新增错误码 | 无 |
| 2 | core-agent | backend/src/core/... | 新增 API | 1 |
| 3 | miniapp-common-agent | miniapp/src/services/... | 新增 API 封装 | 2 |
| 4 | miniapp-core-agent | miniapp/src/pages/... | 新增页面 | 3 |

请 orchestrator 按依赖顺序执行，每个 Agent 独立提交。
```

### 步骤 6：反模式检查清单（提交前强制执行）

修改代码后、`git commit` 前，逐项检查并报告：

#### 🔴 高优先级（不通过则阻止提交）

| # | 反模式 | 检查方法 | 修复方法 |
|---|--------|---------|---------|
| 1 | `uni.navigateTo/switchTab` 无 `.fail()` | grep 新增代码中的 `uni\.(navigate|switchTab|reLaunch)` | 追加 `.fail((err) => { uni.showToast({ title: '页面跳转失败', icon: 'none' }) })` |
| 2 | `catch {}` 静默空块 | grep `catch\s*\{\s*\}` | 至少 `catch { uni.showToast({ title: '加载失败', icon: 'none' }) }` |
| 3 | `defineProps` 未赋值变量 | 检查 `<script setup>` 中是否 `const props = defineProps(...)` | 改为 `const props = defineProps(...)`，事件参数用 `props.xxx` |
| 4 | 硬编码 Mock 数据 | grep 中文姓名列表/部门数组/假数据 | 改为从 API 获取，或标注 `// TODO: 接入 API` |
| 5 | `console.log/debugger` 残留 | grep `console\.(log|error|warn|debug)` + `debugger` | 删除或改用条件编译 `// #ifdef DEV` |

#### 🟡 中优先级（警告，建议修复）

| # | 反模式 | 检查方法 | 修复方法 |
|---|--------|---------|---------|
| 6 | 多处 `reLaunch('/pages/login/index')` | grep 新增代码中的 `reLaunch.*login` | 统一走 `request.js` 401 拦截或 `useAuth().checkAuth()` |
| 7 | 浮层 z-index 硬编码 1000 | grep `z-index:\s*1000` | 按层级使用：基础 1000 / 确认框 1100 / Toast 1200 / 加载 1300 |
| 8 | 字符串拼接 URL 参数 | grep `\?.*=.*\+` 或 `\?.*=.*\$` | 改用 `new URLSearchParams({...}).toString()` |
| 9 | `.then().catch()` 链式 | grep `\.then\(` 在 miniapp 中 | 改为 `async/await` + `try/catch` |

#### 检查报告模板

执行完毕后输出：
```
🔍 反模式检查 (X/9 通过)

🔴 高优先级：
  ✅ 1. 导航 fail 回调 — 通过
  ✅ 2. 无静默 catch — 通过
  ⚠️ 3. defineProps 规范 — 已修复（第45行）
  ✅ 4. 无 Mock 数据 — 通过
  ✅ 5. 无 console 残留 — 通过

🟡 中优先级：
  ✅ 6. 登录统一入口 — 通过
  ⚠️ 7. z-index 分层 — 已修复（第120行）
  ✅ 8. URLSearchParams — 通过
  ✅ 9. async/await — 通过

✅ 全部通过，允许提交
```

---

## 执行原则

### 代码风格继承

- **后端**：与 `backend/src/` 下现有代码风格一致（分号、2空格、JSDoc）
- **小程序**：与 `miniapp/src/` 下现有代码风格一致（无分号、Composition API、rpx）
- **Web**：与 `webapp/src/` 下现有代码风格一致（无分号、TypeScript、`<script setup>`）

### 设计令牌强制

生成任何 UI 代码时：
- 主色使用 `#2B6DE8`
- 小程序使用 rpx 单位
- 颜色/间距/圆角/阴影引用设计令牌变量而非硬编码
- 遵循 Flex-First 布局

### 组件复用优先

| 需求 | 优先使用现有组件 |
|------|-----------------|
| 页面导航 | nav-bar（含 showBack/rightIcon） |
| 底部切换 | tab-bar（activeTab 切换） |
| 确认弹窗 | confirm-dialog |
| 空数据 | empty-state |
| 加载中 | loading-overlay |
| 消息提示 | toast |
| 图片上传 | image-uploader |
| 人员选择 | person-picker |
| 日期选择 | date-picker |
| 审批类型 | approval-type-picker |
| 意见输入 | opinion-input |
| 分页列表 | usePagination composable |
| 认证检查 | useAuth composable |

### 错误处理模式

```js
// ✅ 正确模式（小程序）
try {
  const res = await xxxApi.getList(params)
  if (res.code === 0) {
    list.value = res.data.list || []
    total.value = res.data.total || 0
  }
} catch (e) {
  uni.showToast({ title: '加载失败，请重试', icon: 'none' })
  console.error('getList failed:', e)  // 开发阶段可保留
}
```

```ts
// ✅ 正确模式（Web）
try {
  const res = await xxxApi.getList(params)
  // request.ts 已拦截 code !== 0 的情况
  list.value = res.list
  total.value = res.total
} catch (e) {
  // request.ts 已处理 ElMessage.error
  console.error('getList failed:', e)
}
```

### 导航安全模式

```js
// ✅ 正确模式（小程序页面跳转）
uni.navigateTo({
  url: `/pages/xxx/detail/index?${new URLSearchParams({ id: item.id, type: item.type }).toString()}`,
  fail: (err) => {
    uni.showToast({ title: '页面跳转失败', icon: 'none' })
  }
})

// ✅ 正确模式（Tab 切换）
uni.switchTab({
  url: '/pages/home/index',
  fail: (err) => {
    uni.showToast({ title: '切换失败', icon: 'none' })
  }
})
```

---

## Git 提交规范

修改完成后立即提交（遵循项目 Git 规则）：

```bash
git add <changed-files>
git commit -m "feat(<agent-name>): <简短中文描述>"
```

- 单 Agent 变更：scope 用 Agent 名（如 `feat(core-agent): 优化请假天数计算`）
- 跨 Agent 变更：每个 Agent 独立 commit
- 每次提交后自动 push test（项目规则要求）
