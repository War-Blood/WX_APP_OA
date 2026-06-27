# 模块管理系统 PRD

> 版本: v1.0 | 日期: 2026-06-16 | 状态: 架构已完成，待实装验证

---

## 一、当前状态总览

### 1.1 已完成

| 模块 | 状态 | 说明 |
|------|:--:|------|
| 后端 `module.service.js` | ✅ | 模块配置 CRUD，存储在 `system_config` 表 |
| 后端 `GET /api/modules` | ✅ | 公开接口，小程序拉取可见模块 |
| 后端 `POST /api/admin/modules` | ✅ | 管理接口，Web 后台读取/保存模块配置 |
| Web 独立模块管理页 | ✅ | `/modules` 路由，超级管理员可见 |
| Web 侧边栏权限过滤 | ✅ | 根据 `userInfo.role` 动态显示/隐藏菜单 |
| 小程序 `appStore.fetchModules()` | ✅ | 启动时拉取模块列表，失败兜底硬编码 |
| 小程序 `features` 动态渲染 | ✅ | 从 `appStore.modules` 生成功能中心 |
| 小程序 `home` 快捷操作 | ✅ | 动态取前 4 个可见模块 |

### 1.2 待完成

| 项目 | 优先级 | 说明 |
|------|:--:|------|
| 后端上传部署 | **P0** | worker.service.js + admin.controller.js 待上传 |
| 工号自动生成 | **P0** | `POST /api/admin/workers { action: 'generateCodes' }` |
| Web 侧边栏从模块配置动态渲染 | P1 | 当前用 `roles` 硬编码过滤，应改为读取模块配置 |
| 小程序 role 参数传递 | P1 | `fetchModules` 应传当前用户 role 做服务端过滤 |
| 模块开关实际控制 API | P2 | 关闭模块后对应 API 应返回 403 |

---

## 二、架构设计

### 2.1 数据流

```
┌─────────────────────────────────────────────────────────┐
│                 system_config 表                         │
│  config_key = 'module_visibility'                        │
│  config_value = JSON [{ key, name, visible, platforms,   │
│                         roles, route, sort }]             │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    GET /api/modules  POST /api/admin/modules
    (小程序调用)       (Web后台调用)
         │             │
         ▼             ▼
   ┌──────────┐  ┌──────────────┐
   │ 小程序    │  │ Web 管理后台  │
   │ appStore │  │ modules.vue  │
   │ .modules │  │ 表格+开关     │
   └────┬─────┘  └──────────────┘
        │
   ┌────┴────┐
   ▼         ▼
features  home/index
动态渲染   快捷操作
```

### 2.2 模块数据结构

```json
{
  "key": "approval",
  "name": "审批管理",
  "icon": "approval",
  "route": "/pages/approval/index/index",
  "visible": true,
  "platforms": ["miniapp", "web"],
  "roles": ["admin", "employee", "superadmin"],
  "sort": 1
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | 唯一标识 |
| `name` | string | 显示名称 |
| `visible` | boolean | 总开关，false 则所有端隐藏 |
| `platforms` | string[] | 在哪些端显示：`miniapp` / `web` |
| `roles` | string[] | 哪些角色可见，空数组=不可见 |
| `route` | string | 页面路径（小程序完整路径/Web 路由） |
| `sort` | number | 排序权重，越小越前 |

### 2.3 默认模块列表

| key | 名称 | 小程序 | Web | 可见角色 |
|-----|------|:--:|:--:|------|
| approval | 审批管理 | ✅ | ✅ | 全员 |
| report | 公出日志 | ✅ | ✅ | 全员 |
| report_history | 日报历史 | ✅ | — | 全员 |
| review | 审核管理 | ✅ | — | 管理员+ |
| message | 消息中心 | ✅ | — | 全员 |
| compliance | 合规记录 | ✅ | — | 全员 |
| stats | 公出统计 | ✅ | — | 全员 |
| contacts | 通讯录 | ❌ | — | — |
| notice | 通知公告 | ❌ | — | — |

---

## 三、角色权限体系

### 3.1 三级角色

| 角色 | 标识 | Web 菜单 | 小程序可见模块 |
|------|------|---------|-------------|
| 超级管理员 | `superadmin` | 全部（含模块管理、系统设置、角色管理） | 全部 |
| 管理员 | `admin` | 仪表盘/日志/用户/审批/项目/合规 | 全部（除超管专属） |
| 员工 | `employee` | 仪表盘/日志管理（仅日报/统计/月度占比） | 审批/日志/历史/消息/统计 |

### 3.2 过滤规则

- **Web 侧边栏**: `AppSidebar/index.vue` 中每个菜单项有 `roles` 数组，`computed` 按当前用户 role 过滤
- **小程序功能中心**: `appStore.modules` 按 `visible` + `roles` 过滤
- **API 层**: 后端按 `platform` + `userRole` 过滤返回

---

## 四、高效更新流程

### 4.1 新增一个模块

**场景**: 要新增"资产管理"模块，仅管理员可见，仅在小程序展示

**步骤**:
1. Web → 模块管理 → 小程序端 → 找到"资产管理"行
2. 开关拨到 ✅ 可见
3. 可见角色勾选 `管理员`
4. 保存
5. 小程序重启 → 自动拉取新配置 → 功能中心出现"资产管理"

**无需改代码，无需发版。**

### 4.2 隐藏未完成功能

**场景**: "通讯录"功能还在开发中

**步骤**:
1. Web → 模块管理 → 关闭"通讯录"开关
2. 保存
3. 小程序端立即不显示

### 4.3 控制不同端展示

**场景**: "审核管理"只需要小程序端，Web 后台不需要

**步骤**:
1. 模块配置中 `platforms` 只保留 `["miniapp"]`
2. Web 后台不会显示该模块入口

### 4.4 开发→测试→上线流程

```
feature/v2.0-report (本地开发)
    ↓ 本地测试通过
test (集成测试)
    ↓ 验证通过
stable → 部署服务器
    ↓ 生产验证
main (打 tag)
```

## 五、当前待解决

| # | 问题 | 影响 | 方案 |
|:--:|------|------|------|
| 1 | 工号全为 NULL | 花名册选人组件无数据 | 执行 `generateCodes` 自动分配 |
| 2 | 后端代码未上传 | generateCodes 不可用 | 上传 `worker.service.js` 等 |
| 3 | 模块开关未控制 API | 关闭模块后 API 仍可访问 | 添加中间件校验 |
| 4 | Web 侧边栏未读取模块配置 | 关闭的模块仍显示在菜单 | 改用 module config 动态渲染 |

---

## 六、下一步建议

1. **P0**: 上传后端 → 生成工号 → 验证花名册选人
2. **P1**: 侧边栏改为读取模块配置动态渲染（而非硬编码 roles）
3. **P1**: 小程序 `fetchModules` 传 role 参数实现服务端过滤
4. **P2**: 关闭模块后对应 API 返回 403
