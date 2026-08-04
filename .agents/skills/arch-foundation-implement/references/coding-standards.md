# Coding Standards — 三端编码规范

> 本文档是 `arch-foundation-implement` 阶段 4 的编码规范完整参考。
> SKILL.md 只含概要，详细规范、代码示例、组件复用清单均在此文档。
> 生成代码时严格遵循本规范，保证三端一致性。

---

## 1. 三端编码规范表

| 规范 | 后端（Node.js） | 小程序（uni-app） | Web（Vue3 + TS） |
|------|----------------|------------------|-----------------|
| 缩进 | 2 空格 | 2 空格 | 2 空格 |
| 分号 | 必须 | 禁止 | 禁止 |
| 引号 | 单引号 | 单引号 | 单引号 |
| API 格式 | `{ code, message, data }` | `services/modules/` | `src/api/` + TS |
| 响应格式 | HTTP 200 + code | request.js 拦截 | request.ts 拦截 |
| SQL | 参数化查询 | — | — |
| 单位 | — | rpx | rem/px |
| 语法 | CommonJS / ESM | Composition API | `<script setup lang="ts">` |

### 后端补充

- 统一响应：`{ code: 0, message: 'success', data: {...} }`，HTTP 恒为 200
- 错误抛出：Controller 抛 `ValidationError`，Service 抛 `BusinessError` / `NotFoundError`
- SQL：必须参数化查询，禁止字符串拼接

```javascript
// ✅ 正确：参数化查询
const user = await db.query('SELECT * FROM users WHERE id = ?', [id])

// ❌ 错误：字符串拼接（SQL 注入风险）
const user = await db.query(`SELECT * FROM users WHERE id = '${id}'`)
```

### 小程序补充

- 全部使用 Composition API（`<script setup>`）
- 尺寸单位统一用 `rpx`（750 设计稿基准）
- API 封装在 `services/modules/` 下，按业务模块分文件

### Web 补充

- 全部使用 `<script setup lang="ts">`
- API 封装在 `src/api/` 下，TS 强类型
- 尺寸单位：响应式用 `rem`，固定像素用 `px`

---

## 2. 代码输出格式

每个文件独立输出，**标注完整路径** + 代码块。路径标注使用 `### ` 三级标题，代码块标注语言。

### 后端文件示例

````markdown
### backend/src/features/<module>/routes/<module>.routes.js
```js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/<module>.controller');

router.get('/', controller.list);
router.post('/', controller.create);

module.exports = router;
```
````

### 小程序文件示例

````markdown
### miniapp/src/pages/<module>/index.vue
```vue
<template>
  <view class="page">
    <nav-bar title="模块名" :show-back="true" />
    <!-- 内容 -->
  </view>
</template>

<script setup>
import { ref } from 'vue';
import NavBar from '@/components/nav-bar/nav-bar.vue';

const list = ref([]);
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}
</style>
```
````

### Web 文件示例

````markdown
### webapp/src/views/<module>/index.vue
```vue
<template>
  <div class="page">
    <!-- 内容 -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getList } from '@/api/<module>';

const list = ref([]);
</script>

<style scoped>
.page {
  padding: 1rem;
}
</style>
```
````

---

## 3. 错误处理模式

### 小程序 try/catch 模式

所有 API 调用必须使用 `async/await` + `try/catch`，catch 块至少包含错误日志 + 用户提示。

```javascript
// services/modules/approval.js
import request from '@/services/request';

export const approvalApi = {
  // 获取审批列表
  getList: (params) => request.get('/approval/list', params),

  // 提交审批
  submit: (data) => request.post('/approval/submit', data),

  // 审批操作（同意/拒绝）
  approve: (id, action, opinion) =>
    request.post(`/approval/${id}/approve`, { action, opinion })
};

// pages/approval/list/index.vue
<script setup>
import { ref, onMounted } from 'vue';
import { approvalApi } from '@/services/modules/approval';

const list = ref([]);
const loading = ref(false);
const finished = ref(false);

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await approvalApi.getList({ page: 1 });
    list.value = res.data || [];
  } catch (e) {
    console.error('获取审批列表失败', e);
    list.value = [];
    uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' });
  } finally {
    loading.value = false;
    finished.value = true;
  }
};

const handleApprove = async (id) => {
  try {
    await approvalApi.approve(id, 'agree', '同意');
    uni.showToast({ title: '审批成功', icon: 'success' });
    fetchList();
  } catch (e) {
    console.error('审批操作失败', e);
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  }
};

onMounted(fetchList);
</script>
```

### Web try/catch 模式

Web 端使用 TS 强类型，错误处理同样使用 `try/catch`，可结合 Element Plus / 自定义组件提示。

```typescript
// src/api/approval.ts
import request from '@/utils/request';

export interface ApprovalItem {
  id: string;
  title: string;
  applicant: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ApprovalListRes {
  code: number;
  message: string;
  data: ApprovalItem[];
}

export const getApprovalList = (params: { page: number }): Promise<ApprovalListRes> =>
  request.get('/approval/list', { params });

export const approveApproval = (
  id: string,
  action: 'agree' | 'reject',
  opinion: string
): Promise<{ code: number; message: string }> =>
  request.post(`/approval/${id}/approve`, { action, opinion });

// src/views/approval/list.vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getApprovalList, approveApproval, type ApprovalItem } from '@/api/approval';

const list = ref<ApprovalItem[]>([]);
const loading = ref(false);

const fetchList = async () => {
  loading.value = true;
  try {
    const res = await getApprovalList({ page: 1 });
    list.value = res.data || [];
  } catch (e) {
    console.error('获取审批列表失败', e);
    list.value = [];
    ElMessage.error('加载失败，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleApprove = async (id: string) => {
  try {
    await approveApproval(id, 'agree', '同意');
    ElMessage.success('审批成功');
    fetchList();
  } catch (e) {
    console.error('审批操作失败', e);
    ElMessage.error((e as Error).message || '操作失败');
  }
};

onMounted(fetchList);
</script>
```

---

## 4. 导航安全模式

所有 `uni.navigateTo` / `uni.switchTab` / `uni.reLaunch` / `uni.redirectTo` 必须含 `fail` 回调。

### navigateTo + fail 回调

```javascript
// 跳转到详情页
const goDetail = (id) => {
  uni.navigateTo({
    url: `/pages/detail/index?id=${id}`,
    fail: (err) => {
      console.error('跳转详情页失败', err);
      uni.showToast({ title: '页面跳转失败', icon: 'none' });
    }
  });
};

// 带多参数跳转（使用 encodeURIComponent 编码）
const goEdit = (item) => {
  const params = encodeURIComponent(JSON.stringify(item));
  uni.navigateTo({
    url: `/pages/edit/index?data=${params}`,
    fail: () => {
      uni.showToast({ title: '跳转失败', icon: 'none' });
    }
  });
};
```

### switchTab + fail 回调

```javascript
// 切换到首页 tab
const goHome = () => {
  uni.switchTab({
    url: '/pages/home/index',
    fail: (err) => {
      console.error('切换首页失败', err);
      uni.showToast({ title: '切换失败', icon: 'none' });
    }
  });
};
```

### reLaunch + fail 回调（登录跳转统一入口）

```javascript
// utils/login.js — 统一登录跳转入口
export const goLogin = () => {
  uni.reLaunch({
    url: '/pages/login/index',
    fail: (err) => {
      console.error('跳转登录页失败', err);
      uni.showToast({ title: '请重新进入应用', icon: 'none' });
    }
  });
};

// 各页面调用
import { goLogin } from '@/utils/login';
const handleAuthFail = () => goLogin();
```

### redirectTo + fail 回调

```javascript
// 关闭当前页跳转
const redirectResult = () => {
  uni.redirectTo({
    url: '/pages/result/index',
    fail: () => {
      uni.showToast({ title: '跳转失败', icon: 'none' });
    }
  });
};
```

---

## 5. 组件复用表（13 个优先使用组件）

小程序端已有 13 个通用组件，生成代码时**必须优先复用**，禁止重复造轮子。组件源码位于 `miniapp/src/components/` 下。

| # | 组件 | 路径 | 用途 | 关键 props / 事件 |
|---|------|------|------|------------------|
| 1 | 导航栏 | `components/nav-bar/nav-bar.vue` | 页面顶部导航 | `title` `showLogo` `showBack` `rightIcon` `unreadCount`；事件 `back` `rightClick` |
| 2 | 标签栏 | `components/tab-bar/tab-bar.vue` | 底部导航切换 | `activeTab`（home/features/profile）；事件 `change` |
| 3 | 加载遮罩 | `components/loading-overlay/index.vue` | 表单提交期间阻塞交互 | `visible` `text`（默认"提交中..."） |
| 4 | 确认对话框 | `components/confirm-dialog/index.vue` | 删除/危险操作二次确认 | `visible` `title` `description` `icon` `confirmText`；事件 `confirm` `cancel` |
| 5 | 消息提示 | `components/toast/index.vue` | 成功/失败/警告提示 | `visible` `type`（success/error/warning/info）`message` `duration`；事件 `close` |
| 6 | 空态 | `components/empty-state/index.vue` | 列表无数据占位 | `icon` `title` `description` `showAction` `actionText`；事件 `action` |
| 7 | 日期选择器 | `components/date-picker/index.vue` | 底部弹层日期选择 | `visible` `value` `minDate` `maxDate`；事件 `confirm` `cancel` |
| 8 | 人员选择器 | `components/person-picker/index.vue` | 部门树+成员选择 | `visible` `multiple` `selected`；事件 `confirm` `cancel` |
| 9 | 图片上传器 | `components/image-uploader/index.vue` | 网格布局图片上传 | `list` `maxCount`；事件 `add` `remove` `preview` |
| 10 | 意见输入 | `components/opinion-input/index.vue` | 审批意见输入 | `visible` `required` `title`；事件 `confirm` `cancel` |
| 11 | 审批类型选择器 | `components/approval-type-picker/index.vue` | 审批流程类型选择 | `visible` `value` `options`；事件 `confirm` `cancel` |
| 12 | 返回按钮 | 内置或 `nav-bar` 的 `showBack` | 返回上一页 | — |
| 13 | 品牌标识 | `nav-bar` 的 `showLogo` + `leftCustom` 插槽 | 首页品牌展示 | — |

### 使用示例

```vue
<template>
  <view class="page">
    <!-- 1. 导航栏 -->
    <nav-bar title="审批列表" :show-back="true" right-icon="filter" @right-click="onFilter" />

    <!-- 6. 空态 -->
    <empty-state
      v-if="!loading && list.length === 0"
      title="暂无审批"
      description="暂无待处理审批"
      :show-action="true"
      action-text="刷新"
      @action="fetchList"
    />

    <!-- 3. 加载遮罩 -->
    <loading-overlay :visible="submitting" text="提交中..." />

    <!-- 4. 确认对话框 -->
    <confirm-dialog
      :visible="confirmVisible"
      title="确认删除"
      description="删除后不可恢复"
      @confirm="onConfirmDelete"
      @cancel="confirmVisible = false"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import NavBar from '@/components/nav-bar/nav-bar.vue';
import EmptyState from '@/components/empty-state/index.vue';
import LoadingOverlay from '@/components/loading-overlay/index.vue';
import ConfirmDialog from '@/components/confirm-dialog/index.vue';

const submitting = ref(false);
const confirmVisible = ref(false);
const list = ref([]);

const fetchList = async () => { /* ... */ };
const onFilter = () => { /* ... */ };
const onConfirmDelete = () => { /* ... */ };
</script>
```

### 复用规则

- **必须复用**：上述 13 个组件覆盖的场景，禁止新建同类组件
- **扩展优先**：如需定制，通过 props / 事件 / 插槽扩展，不修改组件源码
- **新增组件**：上述组件无法覆盖的场景才新建，并在 `通用组件.md` 中补充文档
- **样式统一**：组件视觉由 `uni.scss` 主题变量驱动，禁止在业务页面硬编码颜色/尺寸

---

## 6. 提交规则

- 代码生成后立即 `git add` + `git commit`，commit message 注明功能块名
- 高优先级质量门（详见 `quality-gate.md`）未通过禁止提交
- 中优先级未修复项需在 commit message 中注明 `TODO: <项名>`
