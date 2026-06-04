# 项目规则 - 智慧办公助手微信小程序

> 本文件为项目级规则，会被所有 Agent 自动加载。修改后需同步更新 `COLLABORATION-RULES.md`。

---

## 项目性质

这是「智慧办公助手」OA 系统的**微信小程序前端**。

- **技术栈**：uni-app (Vue 3 + Vite) -> 微信小程序
- **UI 框架**：uni-ui + Pinia 状态管理
- **AppID**：wx56609483f0ee55b6
- **编译命令**：`npm run dev:mp-weixin`（开发）/ `npm run build:mp-weixin`（生产）
- **开发工具**：微信开发者工具
- **后端地址**：`https://warblood.online`
- **设计主题**：高效蓝 (#2B6DE8)

---

## 强制规则（所有 Agent 必须遵守）

1. **上下文加载**: 每次任务执行前必须在上下文中加载 `.AI/rules/miniapp-rules.md`
2. **意图确认**: 接受任务后需仔细分析用户意图，如有疑问应反问确认
3. **Git 维护**: 每次修改都需要维护 Git 仓库，不得擅自提交到远程仓库
4. **PRD 对齐**: 所有新增功能必须在 PRD 中有明确定义

---

## 核心原则

### 后端 API 调用规范

- **这是一个纯粹的前端项目**，所有业务数据通过后端 API 获取
- 遇到后端 API 问题时，**严格按后端 API 文档调用**
- 如果发现后端 API 有问题，**直接指出问题在后端**，不得强行修改前端业务逻辑适配后端

### 代码规范
- 使用 Vue 3 Composition API（`<script setup>` 语法）
- 样式使用 SCSS + CSS 变量
- 所有页面级数据通过 `services/` API 模块获取，禁止硬编码假数据
- 使用 `composables/` 组合式函数复用逻辑（如 `useAuth.js`, `usePagination.js`）
- 全局状态使用 Pinia（`stores/user.js`, `stores/app.js`）

---

## 页面层级体系（L1-L4）

| 层级 | 说明 |
|------|------|
| L1 | 一级页面（主Tab页，底部导航栏直接访问）共3页 |
| L2 | 二级页面（功能模块首页/列表页）共11页 |
| L3 | 三级页面（详情/编辑页）共12页 |
| L4 | 四级页面（操作弹窗/浮层）共9个 |

---

## 设计规范（高效蓝主题）

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--color-primary` | `#2B6DE8` | 主色：按钮、链接、Tab激活 |
| `--color-primary-light` | `#5B8DF0` | 悬停/按压状态 |
| `--color-primary-dark` | `#1A4FC7` | 按钮按压态、导航栏 |
| `--color-primary-bg` | `#EDF2FF` | 标签浅色背景 |
| `--color-bg-page` | `#F0F2F8` | 页面背景 |
| `--color-bg-card` | `#FFFFFF` | 卡片背景 |

---

## 目录结构

```
miniapp/src/
├── components/              # 公共组件
├── composables/             # 组合式函数
│   ├── useAuth.js
│   └── usePagination.js
├── pages/                   # 页面目录
│   ├── login/               # 登录页
│   ├── home/                # 首页（工作台）
│   ├── features/            # 功能中心
│   ├── profile/             # 个人中心
│   ├── approval/            # 审批模块
│   ├── message/             # 消息模块
│   ├── employee/            # 员工端（日报）
│   ├── admin/               # 管理员端（审核）
│   ├── task/                # 任务模块
│   ├── asset/               # 资产模块
│   └── announcement/        # 公告模块
├── services/                # API 服务层
│   ├── request.js           # 统一请求封装
│   ├── index.js             # 统一导出
│   └── modules/             # 各模块 API
├── stores/                  # Pinia 状态管理
├── utils/                   # 工具函数
├── static/                  # 静态资源
├── App.vue                  # 应用入口
├── main.js                  # 主入口
├── pages.json               # 页面配置
└── manifest.json            # 应用配置
```

---

## 开发命令

```bash
npm run dev:mp-weixin     # 开发模式（微信小程序）
npm run build:mp-weixin   # 生产构建
npm run dev:h5            # H5 开发模式
npm run build:h5          # H5 生产构建
```
