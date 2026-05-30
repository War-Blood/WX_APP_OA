---
name: webapp-project
description: 智慧办公助手 Web 管理后台前端项目约束规则。对 webapp/ 目录下的所有操作自动生效，确保行为符合项目规范。
agent_created: true
---

# Web 管理后台前端项目约束规则

## 项目概览

**智慧办公助手 Web 管理后台** — 小程序内容中控台 + 系统运维平台，为系统管理员提供基于浏览器的管理界面。

- **技术栈**：Vue 3 + TypeScript + Vite + Element Plus + Pinia + Vue Router
- **当前阶段**：M0 已完成（项目初始化），M1 未启动（用户与权限）
- **后端地址**：`https://warblood.online`

## 强制性要求

1. **上下文加载**: 每次任务执行前必须在上下文中加载 `webapp/.trae/rules/project.md`
2. **意图确认**: 接受任务后需仔细分析用户意图，如有疑问应反问确认
3. **Git 维护**: 每次修改都需要维护 Git 仓库，不得擅自提交到远程仓库
4. **PRD 对齐**: 开发前必须阅读 `docs/Web-PRD.md`，严格按照 PRD 定义的功能开发

## 核心原则

### 后端 API 调用规范

- **这是一个纯粹的前端项目**
- 遇到后端 API 问题时，**严格按后端 SDK 文档调用**
- 如果发现后端 SDK 有问题，**直接指出问题在后端**，不得强行修改前端业务逻辑适配后端

### 代码规范
- 使用 Vue 3 Composition API + TypeScript
- 严格类型检查：提交前运行 `npm run type-check`
- 代码格式化和 lint：提交前运行 `npm run lint`
- 移除 console.log / debugger 后提交
- UI 组件库使用 Element Plus

## 项目里程碑

| 里程碑 | 阶段 | 状态 | 主要交付物 |
|--------|------|------|-----------|
| M0 | 项目初始化 | ✅ 已完成 | 项目搭建、PRD 文档、目录结构、基础配置 |
| M1 | 用户与权限 | 🔜 进行中 | 登录页、用户CRUD+导入导出、部门树、角色权限矩阵 |
| M2 | 内容编排 | ⚪ 待开发 | 工作台配置、模块开关、角色菜单可见性 |
| M3 | 审批管理 | ⚪ 待开发 | 审批模板+流程设计器、实例管理、超时监控 |
| M4 | 仪表盘+日报 | ⚪ 待开发 | 数据看板、日报审核统计导出、模板配置 |
| M5 | 系统运维 | ⚪ 待开发 | 企业信息、安全策略、操作日志、运行监控、数据备份 |
| M6 | 项目+资产 | ⚪ 待开发 | 项目看板、任务拖拽、资产台账、领用审批、盘点 |
| M7 | 公告+消息 | ⚪ 待开发 | 公告发布统计、消息模板推送、功能联调 |
| M8 | 发布上线 | ⚪ 待开发 | 全量测试、性能优化、文档完善、生产部署 |

## 分支管理

- `main` — 生产分支
- `develop` — 开发分支
- `feature/*` — 功能分支

## 目录结构

```
webapp/
├── docs/               # 产品文档（PRD 等）
├── public/             # 静态资源
├── src/
│   ├── api/            # API接口定义
│   ├── assets/         # 图片、样式等资源
│   ├── components/     # 公共组件
│   ├── composables/    # 组合式函数
│   ├── layouts/        # 布局组件
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia状态管理
│   ├── styles/         # 全局样式
│   ├── utils/          # 工具函数
│   ├── views/          # 页面视图
│   ├── App.vue         # 根组件
│   └── main.ts         # 入口文件
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 开发命令

```bash
npm run dev           # 启动开发服务器
npm run build         # 构建生产版本
npm run lint          # 代码检查
npm run type-check    # 类型检查
npm run format        # 代码格式化
```
