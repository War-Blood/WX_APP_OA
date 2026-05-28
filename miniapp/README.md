# 智慧办公助手（OA办公小程序）

> 轻量化办公，高效能协作

## 项目简介

基于 uni-app（Vue 3 + Vite）构建的微信小程序 OA 办公系统，面向中小微企业提供零部署、快速上线的移动办公解决方案。覆盖审批流程、日报管理、任务协作、项目管理、资产管理、公告通知等核心办公场景。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | uni-app（Vue 3 + Vite） |
| 语言 | JavaScript / TypeScript |
| 样式 | SCSS + CSS Variables |
| 状态管理 | Pinia |
| UI 组件 | uni-ui |
| 构建工具 | Vite |
| 输出平台 | 微信小程序 |
| 后端 | warblood.online |
| 设计工具 | Pixso |

## 项目结构

```
miniapp/
├── src/
│   ├── pages/
│   │   ├── login/          # 登录页
│   │   ├── home/           # 首页（工作台）
│   │   ├── features/       # 功能中心
│   │   └── profile/        # 个人中心
│   ├── stores/
│   │   └── user.js         # Pinia 用户状态
│   ├── static/images/      # TabBar 图标
│   ├── App.vue             # 应用入口
│   ├── main.js             # 初始化（Vue3 + Pinia）
│   ├── pages.json          # 路由 + TabBar 配置
│   ├── manifest.json       # 小程序配置
│   └── uni.scss            # 设计变量
├── dist/build/mp-weixin/   # 构建产物（微信小程序）
├── .trae/rules/            # 项目规范
├── docs/                   # 需求与设计文档
├── package.json
├── vite.config.js
└── index.html
```

## 开发命令

```bash
# 安装依赖
npm install

# 微信小程序开发模式
npm run dev:mp-weixin

# 微信小程序生产构建
npm run build:mp-weixin

# H5 开发模式
npm run dev:h5
```

构建产物位于 `dist/build/mp-weixin/`，可直接导入微信开发者工具运行。

## 当前阶段

**P0 阶段已完成** — 基础页面开发与路由配置。

已完成：
- uni-app 项目骨架搭建（Vue 3 + Vite + Pinia）
- 4个 P0 核心页面（登录页、首页工作台、功能中心、个人中心）
- TabBar 三栏导航（首页 / 功能 / 我的）
- 登录态管理与页面权限守卫
- 设计系统变量（高效蓝 #2B6DE8）

待开发：
- 审批流程模块（6种审批类型）
- 日报管理模块（填写 / 提交 / 审核）
- 消息通知模块
- 任务管理模块
- 项目管理模块
- 资产管理模块
- 公告系统模块

## 功能模块

| 模块 | 优先级 | 说明 |
|------|--------|------|
| 工作台 | P0 ✅ | 快捷入口、待办提醒、数据概览、最近动态 |
| 登录 | P0 ✅ | 微信一键登录、隐私协议确认 |
| 功能中心 | P0 ✅ | 全功能网格入口、分类检索 |
| 个人中心 | P0 ✅ | 用户信息、数据统计、设置、退出登录 |
| 审批流程 | P0 | 6种审批类型、审批引擎、审批中心 |
| 日报管理 | P0 | 日报填写、提交、审核、驳回、导出 |
| 消息通知 | P0 | 审批/任务/日报通知推送 |
| 任务管理 | P1 | 任务看板/列表、创建分配、进度跟踪 |
| 项目管理 | P1 | 项目列表/详情、成员管理、进度统计 |
| 资产管理 | P1 | 资产台账、领用/归还、盘点 |
| 公告系统 | P1 | 企业/部门两级公告、发布、置顶 |

## 设计规范

| 属性 | 值 |
|------|-----|
| 主色调 | #2B6DE8（高效蓝） |
| 渐变色 | #2B6DE8 → #5B8DF0 |
| 背景色 | #F7F7F7 |
| 卡片圆角 | 20rpx |
| 按钮圆角 | 48rpx |
| 内容边距 | 32rpx |

## 相关文档

- [uni-app 官方文档](https://uniapp.dcloud.net.cn/)
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [项目技术规范](.trae/rules/技术规范.md)
