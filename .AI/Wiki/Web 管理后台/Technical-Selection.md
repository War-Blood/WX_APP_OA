# 技术选型决策文档

> **项目**: WX-APP-OA Web端管理后台  
> **文档版本**: v1.0.0  
> **生成日期**: 2026-05-29  
> **状态**: ✅ 已确认

---

## 1. 选型原则

1. **成熟稳定**: 优先选择社区活跃、文档完善的技术方案
2. **生态兼容**: 与Vue 3生态深度整合，减少学习成本
3. **对标一致**: 与小程序端技术栈保持一致（SCSS、Pinia等）
4. **轻量可控**: 避免过度封装，保持代码可维护性
5. **企业级**: 支持中后台系统高频场景（表格、表单、权限）

---

## 2. 技术栈总览

| 层级 | 技术选型 | 版本 | 说明 |
|------|----------|------|------|
| **核心框架** | Vue 3 | ^3.4.x | Composition API + `<script setup>` |
| **构建工具** | Vite | ^5.x | 极速开发体验 |
| **语言** | TypeScript | ^5.x | 严格类型检查 |
| **UI组件库** | Element Plus | ^2.7.x | 企业级中后台UI |
| **状态管理** | Pinia | ^2.1.x | Vue官方推荐 |
| **路由** | Vue Router | ^4.3.x | 组合式API支持 |
| **HTTP客户端** | Axios | ^1.7.x | 拦截器/错误处理 |

---

## 3. 核心依赖选型

### 3.1 UI组件库: Element Plus

**选型理由:**
- Vue 3生态最成熟的中后台UI库，社区最大
- 表格、表单、树形、对话框等中后台核心组件完善
- 中文文档齐全，示例丰富
- 主题定制系统成熟，支持CSS变量
- 与Vue 3 + TypeScript深度整合

**使用策略:**
```typescript
// 按需引入（推荐）
import { ElTable, ElForm, ElButton } from 'element-plus'
import 'element-plus/es/components/table/style/css'
```

**主题定制:**
- 覆盖CSS变量实现主题色（高效蓝 #2B6DE8）
- 统一组件尺寸（默认medium）
- 统一圆角、阴影、间距规范

---

### 3.2 数据表格方案: Element Plus Table + 二次封装

**选型理由:**
- 本后台大量使用表格（用户/审批/日报/资产/公告等）
- EP Table已满足90%需求，无需引入额外库
- 通过二次封装实现通用表格组件，统一分页/筛选/批量操作

**封装目标:**
```vue
<!-- 通用表格组件 -->
<CommonTable
  :columns="columns"
  :data="tableData"
  :pagination="pagination"
  :loading="loading"
  @page-change="handlePageChange"
  @selection-change="handleSelectionChange"
/>
```

---

### 3.3 HTTP请求: Axios + 手动封装

**选型理由:**
- 成熟稳定，社区生态完善
- 拦截器机制完善，适合统一处理认证/错误
- 与后端API规范（JWT Bearer Token）完美契合

**封装设计:**
```typescript
// src/utils/request.ts
import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
})

// 请求拦截器: 注入Token
request.interceptors.request.use((config) => {
  const token = useUserStore().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器: 统一错误处理
request.interceptors.response.use(
  (response) => {
    const { code, message, data } = response.data
    if (code === 0) return data
    ElMessage.error(message)
    return Promise.reject(new Error(message))
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token过期，跳转登录
      router.push('/login')
    }
    return Promise.reject(error)
  }
)
```

---

### 3.4 图表库: ECharts (Apache)

**选型理由:**
- 最成熟的JavaScript图表库
- 所有图表类型全覆盖（折线/柱状/饼图/雷达/仪表盘等）
- 文档齐全，配置灵活
- 支持响应式/主题定制

**使用场景:**
- 仪表盘数据可视化
- 日报提交率趋势图
- 审批统计图表
- 资产分布饼图

---

### 3.5 Excel处理: xlsx (SheetJS)

**选型理由:**
- 最主流的Excel处理库
- 支持读取/写入/解析
- 满足用户批量导入导出、日报导出需求

**使用场景:**
- 用户批量导入（模板下载/数据导入）
- 日报数据导出
- 资产台账导出

---

### 3.6 富文本编辑器: Tiptap

**选型理由:**
- 基于Prosemirror，现代化架构
- Vue 3友好，组件化设计
- 可扩展性强，支持自定义扩展
- 轻量，无需加载大量资源

**使用场景:**
- 公告发布编辑器
- 消息模板编辑

---

## 4. 样式方案

### 4.1 CSS预处理: SCSS + CSS Variables

**选型理由:**
- 与小程序端保持一致（小程序也使用SCSS）
- SCSS嵌套语法提升开发效率
- CSS Variables实现动态主题切换

**目录结构:**
```
src/styles/
├── variables.scss      # SCSS变量（颜色/字号/间距）
├── element-theme.scss  # Element Plus主题覆盖
├── mixins.scss         # 混入工具
├── common.scss         # 全局通用样式
└── index.scss          # 入口文件
```

**主题变量定义:**
```scss
// variables.scss
:root {
  --primary-color: #2B6DE8;
  --success-color: #67C23A;
  --warning-color: #E6A23C;
  --danger-color: #F56C6C;
  --text-primary: #303133;
  --text-regular: #606266;
  --text-secondary: #909399;
  --border-color: #DCDFE6;
  --bg-color: #F5F7FA;
}
```

---

## 5. 代码质量工具

| 工具 | 用途 | 配置 |
|------|------|------|
| **ESLint** | 代码规范检查 | `@antfu/eslint-config` 或标准Vue配置 |
| **Prettier** | 代码格式化 | 统一格式化规则 |
| **Husky** | Git钩子管理 | pre-commit钩子 |
| **lint-staged** | 暂存区检查 | 提交前自动检查修改的文件 |
| **commitlint** | 提交信息规范 | Conventional Commits规范 |

**提交规范:**
```
feat: 新增功能
fix: 修复bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

---

## 6. 开发辅助工具

### 6.1 Mock方案: 前端本地JSON模拟

**选型理由:**
- 轻量，无需额外依赖
- 开发阶段快速模拟接口
- 与真实API切换方便

**实现方式:**
```typescript
// 开发环境使用Mock
const isMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'

export const getUserList = (params: UserListParams) => {
  if (isMock) {
    return Promise.resolve(mockUserList)
  }
  return request.get('/api/admin/users', { params })
}
```

---

## 7. 目录结构规范

```
webapp/
├── public/                    # 静态资源
├── src/
│   ├── api/                   # API接口定义
│   │   ├── auth.ts            # 认证相关
│   │   ├── user.ts            # 用户管理
│   │   ├── approval.ts        # 审批管理
│   │   ├── report.ts          # 日报管理
│   │   ├── project.ts         # 项目管理
│   │   ├── asset.ts           # 资产管理
│   │   ├── announcement.ts    # 公告管理
│   │   └── ...
│   ├── assets/                # 图片、字体等资源
│   ├── components/            # 公共组件
│   │   ├── CommonTable/       # 通用表格
│   │   ├── CommonForm/        # 通用表单
│   │   ├── AppHeader/         # 顶部导航
│   │   ├── AppSidebar/        # 侧边栏
│   │   └── ...
│   ├── composables/           # 组合式函数
│   │   ├── usePermission.ts   # 权限检查
│   │   ├── useTable.ts        # 表格逻辑
│   │   └── ...
│   ├── layouts/               # 布局组件
│   │   ├── DefaultLayout.vue  # 默认布局（侧边栏+顶栏）
│   │   ├── AuthLayout.vue     # 登录页布局
│   │   └── ...
│   ├── router/                # 路由配置
│   │   ├── index.ts           # 路由入口
│   │   ├── routes.ts          # 路由定义
│   │   └── guards.ts          # 路由守卫
│   ├── stores/                # Pinia状态管理
│   │   ├── user.ts            # 用户信息
│   │   ├── permission.ts      # 权限状态
│   │   ├── app.ts             # 应用状态
│   │   └── ...
│   ├── styles/                # 全局样式
│   ├── utils/                 # 工具函数
│   │   ├── request.ts         # Axios封装
│   │   ├── storage.ts         # 本地存储
│   │   ├── format.ts          # 格式化工具
│   │   └── ...
│   ├── views/                 # 页面视图
│   │   ├── login/             # 登录页
│   │   ├── dashboard/         # 仪表盘
│   │   ├── user/              # 用户管理
│   │   ├── approval/          # 审批管理
│   │   ├── report/            # 日报管理
│   │   ├── project/           # 项目管理
│   │   ├── asset/             # 资产管理
│   │   ├── announcement/      # 公告管理
│   │   ├── settings/          # 系统设置
│   │   └── ...
│   ├── App.vue                # 根组件
│   └── main.ts                # 入口文件
├── .env                       # 环境变量
├── .env.development           # 开发环境
├── .env.production            # 生产环境
├── eslint.config.js           # ESLint配置
├── prettier.config.js         # Prettier配置
├── tsconfig.json              # TypeScript配置
└── vite.config.ts             # Vite配置
```

---

## 8. 环境变量配置

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=OA管理后台
VITE_USE_MOCK=true

# .env.production
VITE_API_BASE_URL=https://api.example.com/api
VITE_APP_TITLE=OA管理后台
VITE_USE_MOCK=false
```

---

## 9. 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 格式化代码
npm run format
```

---

## 10. 依赖清单

### 10.1 核心依赖
```json
{
  "vue": "^3.4.x",
  "vue-router": "^4.3.x",
  "pinia": "^2.1.x",
  "element-plus": "^2.7.x",
  "axios": "^1.7.x",
  "echarts": "^5.5.x",
  "xlsx": "^0.18.x",
  "@tiptap/vue-3": "^2.x",
  "@tiptap/starter-kit": "^2.x"
}
```

### 10.2 开发依赖
```json
{
  "typescript": "^5.x",
  "vite": "^5.x",
  "@vitejs/plugin-vue": "^5.x",
  "sass": "^1.x",
  "eslint": "^8.x",
  "prettier": "^3.x",
  "husky": "^9.x",
  "lint-staged": "^15.x",
  "@commitlint/cli": "^19.x",
  "@commitlint/config-conventional": "^19.x"
}
```

---

## 11. 技术选型决策记录

| 日期 | 决策项 | 选择 | 决策者 |
|------|--------|------|--------|
| 2026-05-29 | UI组件库 | Element Plus | 产品经理 |
| 2026-05-29 | 脚手架 | Vite + Vue 3 + TS 原生 | 产品经理 |
| 2026-05-29 | HTTP请求 | Axios + 手动封装 | 产品经理 |
| 2026-05-29 | 数据表格 | EP Table + 二次封装 | 产品经理 |
| 2026-05-29 | 图表库 | ECharts | 产品经理 |
| 2026-05-29 | Excel处理 | xlsx (SheetJS) | 产品经理 |
| 2026-05-29 | CSS方案 | SCSS + CSS Variables | 产品经理 |
| 2026-05-29 | 质量工具 | ESLint+Prettier+Husky+lint-staged+commitlint | 产品经理 |
| 2026-05-29 | Mock方案 | 前端本地JSON模拟 | 产品经理 |
| 2026-05-29 | 富文本编辑器 | Tiptap | 产品经理 |
| 2026-05-29 | 国际化 | 暂不需要 | 产品经理 |

---

## 12. 附录

### 12.1 参考文档
- [Vue 3 官方文档](https://vuejs.org/)
- [Element Plus 官方文档](https://element-plus.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [ECharts 官方文档](https://echarts.apache.org/)

### 12.2 相关文档
- [Web-PRD.md](./Web-PRD.md) - 产品需求文档
- [Mini-PRD.md](./Mini-PRD.md) - 小程序端PRD（参考）
- [API-Interfaces.md](../backend/docs/API-Interfaces.md) - 后端接口文档

---

**文档维护**: 技术选型变更时需同步更新本文档
