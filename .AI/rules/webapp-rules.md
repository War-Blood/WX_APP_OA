# Web端管理后台 - 项目规则

> 本文件为项目级规则，会被所有 Agent 自动加载。Git 规范详见 `.AI/rules/git-workflow.md`，编码规范详见 `.AI/rules/coding-standards.md`。

---

## 项目概述

本项目是 **WX-APP-OA** 系统的 Web 端管理后台，定位为 **小程序内容中控台 + 系统运维平台**，为运维人员（系统管理员）提供基于浏览器的管理界面，用于：

- 小程序内容编排（工作台配置、功能模块开关、角色菜单可见性）
- 用户管理（用户CRUD、部门管理、批量导入）
- 角色权限管理（自定义角色、权限矩阵配置、角色分配）
- 审批管理（审批模板/流程配置、实例监控）
- 日报管理（提交率统计、批量审核、导出、模板配置）
- 任务与项目管理（项目总览、任务看板、进度统计）
- 资产管理（资产台账、领用审批、盘点、报表）
- 公告管理（发布、阅读统计、范围控制）
- 消息管理（消息模板、手动推送）
- 系统设置（企业信息、安全策略、操作日志、运行监控、数据备份）

**当前阶段**: M1 用户与权限开发中 | 文档: `.AI/Wiki/Web 管理后台/Web-PRD.md`

---

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **HTTP客户端**: Axios
- **后端地址**: `https://warblood.online`

---

## 强制要求（所有 Agent 必须遵守）

1. **上下文加载**: 每次任务执行前必须在上下文中加载 `.AI/rules/webapp-rules.md`
2. **意图确认**: 接受任务后需仔细分析用户意图，如有疑问应反问确认
3. **Git 维护**: 每次修改都需要维护 Git 仓库（Git 规范详见 `.AI/rules/git-workflow.md`）
4. **PRD 对齐**: 开发前必须阅读 `.AI/Wiki/Web 管理后台/Web-PRD.md`，严格按照 PRD 定义的功能开发

---

## 核心原则

> **这是一个纯粹的前端项目**
>
> 在遇到调用后端问题时，需要严格按照后端 API 文档进行调用。
> **如果发现后端 API 有问题，则直接指出问题在后端**，不得强行改变前端业务逻辑来适配后端。

---

## 项目开发里程碑

| 里程碑 | 阶段 | 状态 | 主要交付物 |
|--------|------|------|-----------|
| M0 | 项目初始化 | ✅ 已完成 | 项目搭建、PRD文档、目录结构、基础配置 |
| M1 | 用户与权限 | 🔜 进行中 | 登录页、用户CRUD+导入导出、部门树、角色权限矩阵 |
| M2 | 内容编排 | ⚪ 待开发 | 工作台配置、模块开关、角色菜单可见性 |
| M3 | 审批管理 | ⚪ 待开发 | 审批模板+流程设计器、实例管理、超时监控 |
| M4 | 仪表盘+日报 | ⚪ 待开发 | 数据看板、日报审核统计导出、模板配置 |
| M5 | 系统运维 | ⚪ 待开发 | 企业信息、安全策略、操作日志、运行监控、数据备份 |
| M6 | 项目+资产 | ⚪ 待开发 | 项目看板、任务拖拽、资产台账、领用审批、盘点 |
| M7 | 公告+消息 | ⚪ 待开发 | 公告发布统计、消息模板推送、功能联调 |
| M8 | 发布上线 | ⚪ 待开发 | 全量测试、性能优化、文档完善、生产部署 |

---

## 代码规范

- 使用 Vue 3 Composition API + TypeScript
- **分号**: 语句末尾不加分号 `;`（与后端风格区分，ESLint flat config 不检查分号，Prettier 负责格式化）
- 严格类型检查：提交前运行 `npm run type-check`
- 禁止使用 `any` 类型（特殊情况须加注释说明）
- 组件使用 Element Plus 组件库
- 状态管理使用 Pinia，路由使用 Vue Router
- 移除 console.log / debugger 后提交

---

## 环境变量

```
# 开发环境
VITE_API_BASE_URL=http://localhost:3100/api
VITE_APP_TITLE=OA管理后台

# 生产环境
VITE_API_BASE_URL=https://warblood.online/api
VITE_APP_TITLE=OA管理后台
```

---

## 开发命令

```bash
npm install            # 安装依赖
npm run dev            # 启动开发服务器
npm run build          # 构建生产版本
npm run lint           # 代码检查
npm run type-check     # 类型检查
```

---

## 目录结构规范

```
webapp/
├── public/              # 静态资源
├── src/
│   ├── api/             # API接口定义
│   ├── assets/          # 图片、样式等资源
│   ├── components/      # 公共组件
│   ├── composables/     # 组合式函数
│   ├── layouts/         # 布局组件
│   ├── router/          # 路由配置
│   ├── stores/          # Pinia状态管理
│   ├── styles/          # 全局样式
│   ├── utils/           # 工具函数
│   ├── views/           # 页面视图
│   ├── App.vue          # 根组件
│   └── main.ts          # 入口文件
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md            # 项目说明
```

> 产品文档已统一迁移至 `.AI/Wiki/Web 管理后台/` 和 `.AI/Wiki/共享文档/`。
