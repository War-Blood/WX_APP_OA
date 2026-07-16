# 07 — 组件复用规范

## 小程序端

| 组件 | 路径 | 用途 | 必用 |
|------|------|------|:--:|
| `nav-bar` | `@/components/nav-bar/nav-bar.vue` | 页面导航（title + showBack） | ✅ |
| `tab-bar` | `@/components/tab-bar/tab-bar.vue` | 底部 Tab | L1 页 |
| `opinion-input` | `@/components/opinion-input/index.vue` | 审批意见输入 | 审批页 |
| `worker-picker` | `@/components/worker-picker/index.vue` | 作业人员选择 | 日报页 |
| `image-uploader` | `@/components/image-uploader/index.vue` | 图片上传 | 日报页 |
| `date-picker` | `@/components/date-picker/index.vue` | 日期选择 | 日报页 |

| 工具 | 路径 | 用途 |
|------|------|------|
| `toast.js` | `@/utils/toast.js` | 统一提示 `showSuccess/showError/showToast` |
| `request.js` | `@/services/request.js` | API 调用 + Token 注入 |
| `alert.js` | `@/utils/alert.js` | 弹窗确认 |

## Web 端

| 组件 | 来源 | 用途 |
|------|------|------|
| `TopBar` | `@/components/TopBar/index.vue` | 48px 顶栏 |
| `PrimaryNav` | `@/components/PrimaryNav/index.vue` | 56px 一级图标栏 |
| `ModuleSidebar` | `@/components/ModuleSidebar/index.vue` | 180px 二级侧栏 |
| `el-table` | Element Plus | 数据表格 |
| `el-dialog` | Element Plus | 弹窗（480-700px） |
| `el-form` | Element Plus | 表单 |
| `el-tree` / `el-tree-select` | Element Plus | 树形选择（分类/部门） |
| `ECharts` | 已有依赖 | 图表（复用 dataviz 配色） |

| 工具 | 路径 | 用途 |
|------|------|------|
| `toast.ts` | `@/utils/toast.ts` | 统一提示 `toast.success/error/warning/info` |
| `request.ts` | `@/utils/request.ts` | API 调用 + Token 注入 + 错误拦截 |
| `ElMessageBox` | Element Plus | 确认弹窗、输入弹窗 |

## 新增模块接入步骤

### 小程序

1. `services/modules/<name>.js` — API 封装
2. `pages/<name>/` — 页面组件（nav-bar + content + bottom-bar）
3. `stores/app.js` `getFallbackModules()` — 模块注册
4. `pages/features/index.vue` `iconConfig` + `groupConfig` — 图标+分组
5. `pages.json` — 路由注册

### Web

1. `api/<name>.ts` — API 类型 + 函数
2. `views/<name>/` — 页面组件（el-card + toolbar + table + dialog）
3. `config/modules.ts` `modules[]` — 模块+子菜单注册
4. `router/index.ts` — 路由注册
