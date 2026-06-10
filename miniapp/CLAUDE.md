# 微信小程序 — CLAUDE.md

> 本文件是 miniapp/ 目录的 Claude Code 入口文档。每次在此目录下操作时自动加载。

---

## 项目身份

**智慧办公助手 OA 微信小程序** — 为员工提供移动办公能力（日报提交、审批流转、消息通知等）。

| 项 | 值 |
|----|-----|
| 框架 | uni-app (Vue 3 + Vite) → 微信小程序 |
| UI | uni-ui + SCSS |
| 状态管理 | Pinia（Setup 语法） |
| 后端地址 | https://warblood.online |
| 微信 AppID | wx56609483f0ee55b6 |
| 设计主题 | 高效蓝 `#2B6DE8` |

---

## 页面层级体系（L1-L4）

| 层级 | 说明 | 数量 |
|------|------|------|
| L1 | 主 Tab 页（底部导航栏直接访问） | 3 页 |
| L2 | 功能模块首页/列表页 | 11 页 |
| L3 | 详情/编辑页 | 12 页 |
| L4 | 操作弹窗/浮层 | 9 个 |

### 页面目录

```
miniapp/src/pages/
├── home/          # L1 工作台首页
├── features/      # L1 功能中心
├── profile/       # L1 个人中心
├── login/         # 登录页
├── approval/      # L2-L3 审批模块
├── message/       # L2-L3 消息模块
├── employee/      # L2-L3 员工端（日报）
├── admin/         # L2-L3 管理员端（审核）
├── compliance/    # L2-L3 合规管理
└── settings/      # L3 设置
```

---

## 目录结构

```
miniapp/
├── src/
│   ├── App.vue             # 应用入口
│   ├── main.js             # 主入口（注册 Pinia + 全局组件）
│   ├── pages.json          # 页面路由 + TabBar + 窗口配置
│   ├── manifest.json       # 应用配置（AppID、权限等）
│   ├── pages/              # 页面目录
│   ├── components/         # 公共组件
│   ├── composables/        # 组合式函数（useAuth, usePagination）
│   ├── services/           # API 服务层
│   │   ├── request.js      # 统一请求封装（Token + 错误处理）
│   │   ├── index.js        # 统一导出
│   │   └── modules/        # 各模块 API
│   ├── stores/             # Pinia 状态管理（user, app）
│   ├── utils/              # 工具函数
│   ├── static/             # 静态资源
│   └── uni.scss            # 全局 SCSS 变量
├── .env                    # 环境变量（不入库）
├── .env.example
└── package.json
```

---

## 设计令牌（高效蓝主题）

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--color-primary` | `#2B6DE8` | 主色：按钮、链接、Tab 激活 |
| `--color-primary-light` | `#5B8DF0` | 悬停/按压状态 |
| `--color-primary-dark` | `#1A4FC7` | 按钮按压态、导航栏 |
| `--color-primary-bg` | `#EDF2FF` | 标签浅色背景 |
| `--color-bg-page` | `#F0F2F8` | 页面背景 |
| `--color-bg-card` | `#FFFFFF` | 卡片背景 |

- **响应式单位**：使用 `rpx`（750rpx = 屏幕宽度）
- **圆角**：卡片 `16rpx`，按钮 `48rpx`（胶囊），输入框 `8rpx`
- **间距**：页面内边距 `24rpx`，卡片内边距 `24rpx`，表单项间距 `24rpx`

---

## 开发命令

```bash
npm run dev:mp-weixin     # 开发模式（微信小程序）
npm run build:mp-weixin   # 生产构建
npm run dev:h5            # H5 开发模式
npm run build:h5          # H5 生产构建
```

开发时需用**微信开发者工具**打开 `dist/dev/mp-weixin/` 目录预览。

---

## 核心原则

1. **纯前端项目**：所有业务数据通过后端 API 获取，禁止硬编码假数据
2. **遇后端问题直接指出**：不强行修改前端适配后端
3. **Vue 3 Composition API**：统一 `<script setup>` 语法
4. **SCSS + CSS 变量**：禁止行内样式，使用设计令牌
5. **Pinia Setup 语法**：`defineStore('name', () => {})` 模式

---

## 标准代码模式

### API 服务模块 (`src/services/modules/xxx.js`)

```js
import { post } from '../request';

export const reportApi = {
  getList(params) { return post('/api/report/list', params); },
  submit(data)   { return post('/api/report/submit', data); },
  deleteDraft(id) { return post('/api/report/delete', { id }); },
};
```

### 请求封装核心 (`src/services/request.js`)

```js
const BASE_URL = 'https://warblood.online';

export function post(url, data) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    uni.request({
      url: `${BASE_URL}${url}`,
      method: 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode === 401) {
          uni.reLaunch({ url: '/pages/login/index' });
          return reject(new Error('Unauthorized'));
        }
        if (res.data.code === 0) resolve(res.data);
        else reject(new Error(res.data.message || '请求失败'));
      },
      fail: (err) => reject(err),
    });
  });
}
```

### Pinia Store (`src/stores/user.js`)

```js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '');
  const userInfo = ref(uni.getStorageSync('userInfo') || null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => userInfo.value?.role === 'admin' || userInfo.value?.role === 'superadmin');

  function setToken(t) { token.value = t; uni.setStorageSync('token', t); }
  function setUserInfo(info) { userInfo.value = info; uni.setStorageSync('userInfo', info); }

  function logout() {
    token.value = ''; userInfo.value = null;
    uni.removeStorageSync('token'); uni.removeStorageSync('userInfo');
    uni.reLaunch({ url: '/pages/login/index' });
  }

  return { token, userInfo, isLoggedIn, isAdmin, setToken, setUserInfo, logout };
});
```

### 页面组件 (`<script setup>`)

```vue
<script setup>
import { ref } from 'vue';
import { reportApi } from '@/services/modules/report';

const form = ref({ project: '', workContent: '' });
const submitting = ref(false);

async function handleSubmit() {
  if (!form.value.project) {
    uni.showToast({ title: '请填写项目名称', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await reportApi.submit(form.value);
    uni.showToast({ title: '提交成功', icon: 'success' });
    uni.navigateBack();
  } catch (err) {
    uni.showToast({ title: err.message || '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view class="form-card">
      <view class="form-item">
        <text class="label">项目名称</text>
        <input v-model="form.project" placeholder="请输入" />
      </view>
    </view>
    <button class="submit-btn" :disabled="submitting" :loading="submitting" @tap="handleSubmit">
      {{ submitting ? '提交中...' : '提交' }}
    </button>
  </view>
</template>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #F0F2F8; min-height: 100vh; }
.form-card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.form-item { margin-bottom: 24rpx;
  .label { display: block; font-size: 28rpx; color: #333; margin-bottom: 12rpx; }
  input { width: 100%; padding: 20rpx; border: 1px solid #E8E8E8; border-radius: 8rpx; font-size: 28rpx; }
}
.submit-btn { margin-top: 40rpx; background: #2B6DE8; color: #fff; border-radius: 48rpx; }
</style>
```

---

## 关键模式速查

| 层级 | 职责 | 关键模式 |
|------|------|----------|
| Page | 用户交互、调用 API、Toast 反馈 | `<script setup>`, `ref()`, `try/catch/finally`, `uni.showToast/navigateBack` |
| API Service | 封装后端接口 | `import { post } from '../request'`, 所有方法返回 Promise |
| Request | Token 注入 + 401 拦截 + 错误格式化 | `uni.request` + Bearer 头 + 401→reLaunch 登录页 |
| Pinia Store | 全局状态 + uni 持久化 | `defineStore('name', () => {})`, `uni.getStorageSync/setStorageSync` |
| Composables | 可复用逻辑 | `useAuth.js`, `usePagination.js` |

---

## 规则与文档索引

| 加载时机 | 文件 |
|---------|------|
| **始终** | 项目根 `CLAUDE.md` |
| 小程序开发 | `.AI/rules/miniapp-rules.md` |
| 代码规范 | `.AI/rules/coding-standards.md` |
| Git 操作 | `.AI/rules/git-workflow.md` |
| Code Review | `.AI/rules/review-checklist.md` |
| Skill 定义 | `.AI/skills/miniapp-project/SKILL.md` |
| Wiki | `.AI/Wiki/小程序前端/` |