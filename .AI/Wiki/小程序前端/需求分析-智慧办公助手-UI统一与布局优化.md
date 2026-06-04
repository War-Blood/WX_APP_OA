# 需求分析：智慧办公助手 — UI 统一与布局优化

> 文档版本：v1.0  
> 分析日期：2026-05-29  
> 分析人：产品经理 · 许清楚  
> 适用范围：微信小程序「智慧办公助手」(uni-app 框架)

---

## 目录

1. [现状全貌](#1-现状全貌)
2. [方案一：Icon 统一切换方案](#2-icon-统一切换方案)
3. [方案二：布局优化方案](#3-布局优化方案)
4. [优先级与排期](#4-优先级与排期)
5. [风险与注意事项](#5-风险与注意事项)

---

## 1. 现状全貌

### 1.1 页面与路由总览（共 14 个页面）

| 路由路径 | 页面标题 | 导航栏 | TabBar | 下拉刷新 | 上拉加载 |
|---|---|---|---|---|---|
| `/pages/login/index` | 登录 | 自定义 NavBar ✗（独立布局） | ✗ | ✗ | ✗ |
| `/pages/home/index` | 工作台 | 共享 NavBar（蓝色渐变） | ✅ | ✅ | ✅ |
| `/pages/features/index` | 功能中心 | 共享 NavBar（蓝色渐变） | ✅ | ✗ | ✗ |
| `/pages/profile/index` | 个人中心 | 共享 NavBar（蓝色渐变） | ✅ | ✗ | ✗ |
| `/pages/approval/index/index` | 审批中心 | **内联自定义**（白底） | ✗ | ✗ | ✅ |
| `/pages/approval/detail` | 审批详情 | 共享 NavBar（白底带返回） | ✗ | ✗ | ✗ |
| `/pages/approval/create/index` | 发起审批 | 共享 NavBar（白底带返回） | ✗ | ✗ | ✗ |
| `/pages/employee/report-history/index` | 日报历史 | **内联自定义**（白底） | ✗ | ✗ | ✅ |
| `/pages/employee/report-detail/index` | 日报详情 | **内联自定义**（白底） | ✗ | ✗ | ✗ |
| `/pages/employee/report-edit/index` | 写日报 | **内联自定义**（白底） | ✗ | ✗ | ✗ |
| `/pages/employee/rejected-edit/index` | 编辑日报 | 未读取 | ✗ | ✗ | ✗ |
| `/pages/admin/review-list/index` | 审核管理 | **内联自定义**（白底） | ✗ | ✗ | ✗ |
| `/pages/admin/review-detail/index` | 审核详情 | 未读取 | ✗ | ✗ | ✗ |
| `/pages/message/index` | 消息中心 | 共享 NavBar（蓝色渐变） | ✗ | ✗ | ✗ |
| `/pages/message/detail` | 消息详情 | 共享 NavBar（白底带返回） | ✗ | ✗ | ✗ |

### 1.2 Icon 使用现状（三套方案+静态图片，混乱严重）

#### 方案 A：OaIcon 组件（自定义字体图标）
- **文件**：`components/oa-icon/oa-icon.vue`
- **原理**：基于 `@font-face` 自定义字体 `oa-icons`（Base64 内嵌），通过 `.oa-icon-{name}` CSS class 映射 unicode
- **注册图标**（20 个）：approval, report, notification, project, asset, announcement, statistics, contacts, more, document, user, security, help, info, cache, edit, search, message, task, pending
- **使用范围**（跨 8 个文件）：
  - `pages/features/index.vue` — 功能图标网格（8 处）
  - `pages/profile/index.vue` — 设置列表图标（6 处：edit, notification, security, cache, help, info, user）
  - `pages/login/index.vue` — 功能卡片图标（3 处：approval, report, notification）
  - `pages/message/index.vue` — 消息列表图标（动态绑定）
  - `pages/message/detail.vue` — 操作按钮箭头（1 处：right）
  - `pages/admin/review-list/index.vue` — 搜索图标 + 搜索箭头（2 处：search, chevron-down）
  - `pages/employee/report-history/index.vue` — 日历按钮（1 处：calendar）
  - `pages/employee/report-edit/index.vue` — 多处操作图标（5 处：history, right, chevron-down, close, plus）
  - `components/empty-state/index.vue` — 空状态图标（动态绑定）

#### 方案 B：IconPark 组件（本地 PNG）
- **文件**：`components/icon-park/icon-park.vue`
- **原理**：映射为 `/static/images/home/generated/` 下的 5 个 PNG 图片
- **注册图标**：approval, report, announcement, contacts, bell
- **使用范围**：仅 `pages/home/index.vue` — 快捷入口图标（4 处）

#### 方案 C：@icon-park/vue-next npm 包（矢量组件）
- **使用范围**：
  - `components/nav-bar/nav-bar.vue` — Remind(通知), Setting(设置)
  - `components/tab-bar/tab-bar.vue` — Home(首页), AllApplication(功能), Audit(审核), User(我的)

#### 方案 D：静态 PNG 图片
- **路径**：`/static/images/approval/`（9 个 PNG）
- **使用范围**：
  - back.png — 所有内联自定义 NavBar 的返回按钮
  - more.png — 审批中心的更多按钮
  - leave.png, reimburse.png, seal.png — 审批创建/详情页面的类型图标
  - leave_sub.png, reimburse_sub.png, seal_sub1.png, seal_sub2.png — 未使用的附属图标

### 1.3 布局与样式问题汇总

#### ⚠️ 导航栏不统一（最高优先级问题）
- **两套 NavBar 实现并存**：
  - ✅ 共享 NavBar 组件（`components/nav-bar/nav-bar.vue`）— 7 个页面使用
  - ❌ 内联自定义 NavBar — 5 个页面各自重复实现（`approval/index`, `admin/review-list`, `employee/report-history`, `employee/report-detail`, `employee/report-edit`）
  - 内联版本与共享组件的样式、间距、交互完全一致但代码冗余

#### ⚠️ 卡片样式不统一
| 页面 | 卡片类名 | padding | border-radius | margin-bottom |
|---|---|---|---|---|
| home/index | `.card` | 24rpx | 16rpx (`$radius-lg`) | 20rpx |
| features/index | `.panel` | 28rpx | **20rpx** | 20rpx (gap) |
| approval/index | `.approval-card` | **28rpx 32rpx** | **16rpx** | 12rpx |
| approval/detail | `.info-card`, `.form-card` | 24rpx | **16rpx** | 20rpx |
| approval/create | `.section-card` | 24rpx | **16rpx** | 20rpx |
| admin/review-list | `.review-card` | 24rpx | **16rpx** | — (gap 16rpx) |
| employee/report-history | `.report-card` | 24rpx | **16rpx** | — (gap 16rpx) |
| employee/report-detail | `.section-card` | 24rpx | **16rpx** | 20rpx |
| employee/report-edit | `.section-card` | 24rpx | **16rpx** | 20rpx |
| message/index | `.message-item` | 24rpx | **16rpx** | — (gap 12rpx) |
| message/detail | `.message-card` | **32rpx 24rpx** | **16rpx** | — |

#### ⚠️ 页面内边距（content padding）不统一
| 页面 | content padding |
|---|---|
| home | 24rpx（两侧+底部） |
| features | **20rpx 32rpx**（顶部20，两侧32） |
| approval/index | **16rpx 24rpx**（顶部16，两侧24） |
| approval/detail/create | **24rpx**（等宽） |
| admin/review-list | **0 24rpx 24rpx**（顶部0） |
| employee/report-history | **16rpx 24rpx** |
| employee/report-edit/detail | **24rpx** |
| profile | **32rpx**（margin 方式） |
| message/index | **16rpx 24rpx** |

#### ⚠️ SCSS 变量重复声明
- 几乎所有页面都重新声明了 `$color-primary: #2B6DE8`、`$bg-page: #F7F7F7`、`$text-primary: #333333` 等变量
- `uni.scss` 中已有完整的变量体系（主色、文字色、间距、圆角、字号），但极少页面 `@import` 它
- `home/index.vue` 甚至使用了不同的变量名体系（`$text-primary: rgba(0,0,0,0.9)` 而非标准的 `#333333`）

#### ⚠️ 下拉刷新与上拉加载不一致
- 只有 `home/index` 同时启用了下拉刷新 + 上拉加载
- `approval/index` 和 `employee/report-history` 只有上拉加载
- `admin/review-list`、`profile`、`message/index`、`features/index` 都没有

---

## 2. Icon 统一切换方案

### 2.1 选型建议：标准化为 uni-icons（@dcloudio/uni-ui）

**理由**：
1. **已在依赖中** — `@dcloudio/uni-ui: ^1.4.0` 已在 `package.json` 的 devDependencies
2. **WE UI 理念对齐** — uni-ui 是 DCloud 官方为 uni-app 设计的组件库，遵循微信小程序设计规范，与"WE UI 浅色组件库"的精神一致
3. **生态兼容** — 原生支持 uni-app 多端编译，不存在兼容问题
4. **图标丰富度** — uni-icons 包含 100+ 常用图标，完全覆盖当前项目用的 20+ 图标需求
5. **轻量无额外依赖** — 无需额外安装字体文件或 npm 包

**Icon 映射对照表**：

| 当前 OaIcon 名称 | uni-icons 对应 | 使用页面 | 功能场景 |
|---|---|---|---|
| approval | `checkbox` / `checkbox-filled` | features, login | 审批管理 |
| report | `compose` / `order` | features, login | 日报提交 |
| notification | `notification` / `bell` | features, login, profile | 通知/消息 |
| notification | `notification` | admin/review-list | 消息中心空状态 |
| project | `briefcase` / `folder` | features | 项目管理 |
| asset | `wallet` | features | 资产申购 |
| announcement | `notification` / `mail` | features | 通知公告 |
| statistics | `chart` / `bar-chart` | features | 数据统计 |
| contacts | `person` / `people` | features | 通讯录 |
| document | `folder` / `file` | features | 文档中心 |
| user | `person` | features, profile | 用户管理/个人设置 |
| security | `shield` / `lock` | features, profile | 安全中心 |
| help | `help` / `question` | profile | 帮助与反馈 |
| info | `info` | profile | 关于我们 |
| cache | `trash` / `clear` | profile | 缓存清理 |
| edit | `compose` / `edit` | profile | 编辑 |
| search | `search` | features, review-list | 搜索 |
| message | `email` / `chat` | message | 消息 |
| task | `list` / `order` | message | 任务 |
| pending | `clock` / `time` | message | 待办 |
| more | `more` / `ellipsis` | features | 更多 |
| calendar | `calendar` | report-history | 日历 |
| right | `arrow-right` | report-edit, message-detail | 箭头 |
| history | `undo` / `redo` | report-edit | 历史 |
| chevron-down | `arrow-down` | report-edit | 下拉 |
| close | `close` | report-edit | 关闭 |
| plus | `plus` / `plus-empty` | report-edit | 添加 |
| empty | `inbox` / `email` | empty-state | 空状态 |

> 注：部分 icon 名称需根据 uni-icons 实际提供的图标名确认，以上为参照映射。

### 2.2 替换范围与影响面

| 替换项 | 影响文件 | 替换量 | 备注 |
|---|---|---|---|
| OaIcon → uni-icons | 8 个页面文件 + empty-state 组件 | ~30 处 | 需调整属性（uni-icons 使用 type/size/color） |
| IconPark → uni-icons | 仅 home/index.vue | 4 处 | 快捷入口图标 |
| @icon-park/vue-next → uni-icons | nav-bar + tab-bar | 6 处 | Remind/Setting/Home/AllApplication/Audit/User |
| 审批静态 PNG → uni-icons | approval/create, approval/detail | ~6 处 | leave/reimburse/seal 等类型图标 |
| 返回按钮 PNG → 文字或 uni-icons | 5 个内联 NavBar 页面 | 5 处 | back.png → uni-icons arrow-left |
| more.png → uni-icons | approval/index | 1 处 | more.png → uni-icons more |

**总计替换：约 50 处 icon 引用，涉及 13 个文件**

### 2.3 是否需要保留 Fallback

**建议：不保留任何 fallback，一步到位全部替换**。

理由：
- uni-icons 作为 `@dcloudio/uni-ui` 的内置组件，与 uni-app 框架绑定，不存在兼容风险
- 保留多重方案只会增加维护成本（当前混乱的根源就是多方案并存）
- 替换后可以移除：
  - `components/oa-icon/` 整个目录
  - `components/icon-park/` 整个目录
  - `/static/images/home/generated/` 整个目录
  - `/static/fonts/iconfont.css` 文件
  - `@icon-park/vue-next` npm 依赖
  - `/static/images/approval/` 中的类型图标（leave.png, reimburse.png, seal.png 等）

**但需保留** `/static/images/approval/back.png` 和 `/static/images/approval/more.png` — 如果统一 NavBar 后这些被 `NavBar` 组件的 slot 取代，则也可删除。

### 2.4 操作步骤

1. **安装 uni-icons**（如未安装）：
   ```bash
   npm install @dcloudio/uni-ui  # 已在 devDependencies，确认可用即可
   ```
   在 `pages.json` 中配置 `easycom` 自动引入 uni-ui 组件（或手动 import）。

2. **逐文件替换**（建议按影响面从大到小）：
   - 第一轮：OaIcon 使用最多的文件（features → profile → login → message → empty-state）
   - 第二轮：IconPark 使用文件（home）
   - 第三轮：@icon-park/vue-next 使用文件（nav-bar, tab-bar）
   - 第四轮：审批静态 PNG（approval/create, approval/detail）

3. **清理**：删除废弃组件和静态资源

---

## 3. 布局优化方案

### 3.1 NavBar 统一（P1 最高优先级）

**问题**：5 个内联 NavBar 页面与共享 NavBar 组件功能完全相同，代码重复。

**方案**：将这 5 个页面的内联 NavBar 全部替换为共享 `NavBar` 组件。

| 页面 | 当前 NavBar | 替换方案 |
|---|---|---|
| `/pages/approval/index/index.vue` | 内联自定义（白底, 返回+标题+more） | `<NavBar title="审批中心" :showBack="true" />` + 右侧 slot 放 more 按钮 |
| `/pages/admin/review-list/index.vue` | 内联自定义（白底, 返回+标题） | `<NavBar title="审核管理" :showBack="true" />` |
| `/pages/employee/report-history/index.vue` | 内联自定义（白底, 返回+标题+日历） | `<NavBar title="日报历史" :showBack="true" />` + 右侧 slot 放日历图标 |
| `/pages/employee/report-detail/index.vue` | 内联自定义（白底, 返回+标题） | `<NavBar title="日报详情" :showBack="true" />` |
| `/pages/employee/report-edit/index.vue` | 内联自定义（白底, 返回+标题+草稿） | `<NavBar title="写日报" :showBack="true" />` + 右侧 slot 放保存草稿按钮 |

**对 NavBar 组件的增强需求**：
- 需要支持右侧 slot 传入自定义内容（目前右侧只有 `showNotification` 和 `showSetting` 两种模式）
- 需要 slot name="nav-left" 和 slot name="nav-right" 的插槽能力

### 3.2 卡片样式统一（P1）

**目标**：统一所有页面的卡片样式，建立标准卡片组件或统一的 CSS 类。

**建议标准**：
```scss
// 统一卡片规范
$card-bg: #FFFFFF;
$card-border-radius: 16rpx;     // 统一 16rpx
$card-padding: 24rpx;           // 统一 24rpx
$card-margin-bottom: 20rpx;     // 统一 20rpx
$card-box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
$card-header-margin-bottom: 20rpx;
$card-title-font-size: 28rpx;
$card-title-font-weight: 600;
```

**变更文件**：
| 文件 | 当前值 | 需改为 |
|---|---|---|
| `features/index.vue` `.panel` | `padding: 28rpx; border-radius: 20rpx` | `padding: 24rpx; border-radius: 16rpx` |
| `approval/index.vue` `.approval-card` | `padding: 28rpx 32rpx` | `padding: 24rpx` |
| `message/detail.vue` `.message-card` | `padding: 32rpx 24rpx` | `padding: 24rpx` |
| `profile/index.vue` `.panel` | `border-radius: 20rpx` | `border-radius: 16rpx` |

**建议**：提取为全局 CSS 类 `.card`（在 uni.scss 或 App.vue 定义），各页面复用：
```scss
// App.vue 或统一 CSS 文件
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
}
```

### 3.3 页面内边距统一（P1）

**目标**：所有页面 `content-scroll` 使用统一 padding 标准。

**建议标准**：
```scss
// 统一内容区域 padding
$content-padding: 24rpx;   // 统一 24rpx
```

| 文件 | 当前值 | 需改为 |
|---|---|---|
| `features/index.vue` .features-content | `20rpx 32rpx` | `24rpx`（gap 保持） |
| `approval/index.vue` .content-scroll | `16rpx 24rpx` | `24rpx` |
| `employee/report-history.vue` .content-scroll | `16rpx 24rpx` | `24rpx` |
| `profile/index.vue` .panel | `margin: 0 32rpx 20rpx` | `margin: 0 24rpx 20rpx` |
| `message/index.vue` .message-list | `16rpx 24rpx` | `24rpx` |
| `admin/review-list.vue` .content-scroll | `0 24rpx 24rpx` | `24rpx` |

### 3.4 SCSS 变量体系复用（P2）

**问题**：各页面重复声明相同的颜色/间距变量，存在不一致（如 home 使用 `rgba(0,0,0,0.9)` 而非 `#333333`）。

**方案**：
1. **增强 uni.scss** — 确保已有变量覆盖所有需求
2. **导入机制** — 各页面通过 `@import '@/uni.scss'` 或使用 uni-app 的全局样式机制引用
3. **清理** — 删除各页面重复且与 uni.scss 一致的变量声明
4. **不一致修复** — `home/index.vue` 的 `$text-primary` 应从 `rgba(0,0,0,0.9)` 改为 `#333333`

**修改量**：涉及约 12 个页面文件的 scoped style 头部变量声明。

### 3.5 下拉刷新与上拉加载统一（P2）

**建议统一策略**：

| 页面 | 当前 | 建议 |
|---|---|---|
| home/index | 下拉刷新 + 上拉加载 | ✅ 保持 |
| features/index | 无 | 无需（功能网格固定，不需要分页） |
| profile/index | 无 | 无需（用户资料+设置列表，无分页） |
| approval/index | 上拉加载 | 建议增加下拉刷新（审批列表需要刷新） |
| approval/detail | 无 | 无需（详情页） |
| approval/create | 无 | 无需（表单页） |
| employee/report-history | 上拉加载 | 建议增加下拉刷新 |
| employee/report-detail | 无 | 无需 |
| employee/report-edit | 无 | 无需（表单页） |
| admin/review-list | 无 | 建议增加下拉刷新 + 上拉加载 |
| admin/review-detail | 未读取 | 无需（预计详情页） |
| message/index | 无 | 建议增加下拉刷新 |
| message/detail | 无 | 无需 |
| login/index | 无 | 无需 |

**待确认**：
- 后端 API 是否已支持分页参数（page/pageSize）？目前 approval, report-history, message 已有上拉加载实现，表明支持
- admin/review-list 需要后端确认是否支持分页

---

## 4. 优先级与排期

### P0 — 全局 Icon 统一替换
| 事项 | 预估工时 | 说明 |
|---|---|---|
| uni-icons 集成确认 | 0.5h | 确认 easycom 配置是否生效 |
| 替换 OaIcon（features, profile, login, message, message-detail, empty-state） | 3h | 8 个文件，约 20 处引用 |
| 替换 IconPark（home） | 0.5h | 1 个文件，4 处引用 |
| 替换 @icon-park/vue-next（nav-bar, tab-bar） | 1h | 2 个文件，6 处引用，注意主题切换逻辑 |
| 替换审批静态 PNG（approval/create, approval/detail） | 1h | 2 个文件，6 处引用 |
| 删除废弃组件与资源 | 0.5h | 删除 oa-icon, icon-park 组件, iconfont.css, generated PNG, @icon-park 依赖 |
| **P0 合计** | **6.5h** | |

### P1 — 布局一致性优化
| 事项 | 预估工时 | 说明 |
|---|---|---|
| NavBar 增强（添加 slot 支持） | 1h | 修改 nav-bar.vue 组件 |
| 替换 5 个内联 NavBar | 2h | 5 个文件 |
| 卡片样式统一 | 1.5h | 6 个文件，统一 border-radius/padding |
| 页面内边距统一 | 1h | 6 个文件 |
| **P1 合计** | **5.5h** | |

### P2 — 样式规范落地
| 事项 | 预估工时 | 说明 |
|---|---|---|
| 增强 uni.scss / 建立全局 .card 类 | 1h | 提取公共样式 |
| 页面变量清理+import | 2h | 12 个文件 |
| home 变量不一致修复 | 0.5h | 1 个文件 |
| 下拉刷新/上拉加载统一 | 2h | 4 个页面（approval/index, admin/review-list, employee/report-history, message/index） |
| **P2 合计** | **5.5h** | |

### 📊 总体预估

| 阶段 | 工时 | 关键交付 |
|---|---|---|
| P0: Icon 统一 | 6.5h | 所有 icon 切换为 uni-icons，废弃组件清理 |
| P1: 布局优化 | 5.5h | NavBar 统一，卡片/间距标准化 |
| P2: 规范落地 | 5.5h | 样式体系落地，刷新加载统一 |
| **合**计 | **17.5h** | |

---

## 5. 风险与注意事项

### 🔴 技术风险
1. **uni-icons 可用图标确认** — 需要实际编译后确认 uni-icons 的图标集合是否完全覆盖本项目的 20+ 图标需求；如果缺少某些图标（如"待工""在途"等业务特有图标），需要回退方案
2. **@icon-park/vue-next 替换后的主题切换** — NavBar 中 Remind/Setting 图标用到了 `theme="outline"` 和动态 fill 颜色切换；uni-icons 是否支持类似的 color 动态绑定需要验证
3. **TabBar 图标 active/inactive 双状态** — 当前 TabBar 中每个图标使用 `theme="filled/outline"` 做 active 切换，uni-icons 需要找到对应的 filled/outline 变体

### 🟡 业务风险
4. **审批 type icon 语义** — 审批类型图标（请假用 leave.png、报销用 reimburse.png、用章用 seal.png）具有业务语义，替换为 uni-icons 后需确保语义相近
5. **home 页面 IconPark 替换** — 首页快捷入口的图标（approval/report/announcement/contacts）尺寸为 56rpx，需确认 uni-icons 最大 size 支持

### 🟢 建议
6. **分批上线** — P0 完成后即可发版测试，不必等全部完成
7. **回归清单** — 准备一份回归测试清单，逐页检查 icon 显示是否正常、颜色是否正确、交互是否有变化
