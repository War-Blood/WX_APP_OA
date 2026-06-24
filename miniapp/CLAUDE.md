# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 架构

**OA 微信小程序** — uni-app (Vue 3 + Vite) + Pinia + uni-ui，面向员工的移动办公端。

### 数据流

```
Page (<script setup>)
  → services/modules/xxx.js (API 封装)
    → services/request.js (uni.request + Token 注入 + 401 拦截)
      → https://warblood.online/api/*
```

状态管理：`stores/`（Pinia Setup 语法）→ 持久化到 `uni.getStorageSync/setStorageSync`

### 源码组织

```
miniapp/src/
├── pages/           # 页面（L1-L4 层级）
│   ├── home/        # L1 工作台
│   ├── features/    # L1 功能中心
│   ├── profile/     # L1 个人中心
│   ├── approval/    # L2-L3 审批
│   ├── employee/    # L2-L3 日报
│   ├── message/     # L2-L3 消息
│   ├── admin/       # L2-L3 审核
│   ├── compliance/  # L2-L3 合规
│   └── login/       # 登录
├── components/      # 公共组件
├── composables/     # 组合式函数（useAuth, usePagination）
├── services/        # request.js + modules/（API 调用层）
├── stores/          # Pinia（user, app）
├── pages.json       # 路由 + TabBar + 窗口配置
└── manifest.json    # AppID 等应用配置
```

### 页面层级

| L1 (3页) | L2 (11页) | L3 (12页) | L4 (9个) |
|----------|-----------|-----------|----------|
| 底部 Tab 直达 | 功能列表/首页 | 详情/编辑 | 弹窗/浮层 |

---

## 设计令牌

| 令牌 | 值 | 用途 |
|------|----|------|
| `--color-primary` | `#2B6DE8` | 按钮、链接、Tab |
| `--color-primary-bg` | `#EDF2FF` | 标签背景 |
| `--color-bg-page` | `#F0F2F8` | 页面背景 |
| `--color-bg-card` | `#FFFFFF` | 卡片背景 |

- 单位：`rpx`（750rpx = 屏幕宽度）
- 圆角：卡片 `16rpx`，按钮 `48rpx`
- 间距：`24rpx`

---

## 常用命令

```bash
npm run dev:mp-weixin     # 开发编译 → 微信开发者工具打开 dist/dev/mp-weixin/
npm run build:mp-weixin   # 生产构建
npm run dev:h5            # H5 开发（浏览器调试）
```

---

## 代码模式

```js
// API 模块 — services/modules/report.js
import { post } from '../request'
export const reportApi = {
  getList: (params) => post('/api/report/list', params),
  submit:  (data)   => post('/api/report/submit', data),
}

// Pinia Store — stores/user.js
export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const isLoggedIn = computed(() => !!token.value)
  function setToken(t) { token.value = t; uni.setStorageSync('token', t) }
  return { token, isLoggedIn, setToken }
})
```

### 页面组件模式

```vue
<script setup>
import { ref } from 'vue'
import { reportApi } from '@/services/modules/report'

const submitting = ref(false)
async function handleSubmit() {
  submitting.value = true
  try {
    await reportApi.submit(form.value)
    uni.showToast({ title: '提交成功', icon: 'success' })
    uni.navigateBack()
  } catch (err) {
    uni.showToast({ title: err.message || '失败', icon: 'none' })
  } finally { submitting.value = false }
}
</script>
```

### 关键约束

- **纯前端项目**：数据全部通过 `services/modules/` 获取，禁止硬编码假数据
- 统一 `<script setup>` + SCSS + CSS 变量
- Request 层自动注入 Bearer Token，401 时 `uni.reLaunch` 到登录页
- 页面路由和 TabBar 在 `pages.json` 中配置，非 Vue Router