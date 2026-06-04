# 技术方案：智慧办公助手 — UI 统一与布局优化

> 文档版本：v1.0  
> 编写日期：2026-05-29  
> 编写人：技术经理 · 程晓技  
> 适用范围：微信小程序「智慧办公助手」(uni-app 框架，`src/` 目录结构)

---

## 目录

1. [uni-icons 集成方案](#1-uni-icons-集成方案)
2. [分阶段工程方案](#2-分阶段工程方案)
3. [文件变更清单](#3-文件变更清单)
4. [风险与关键决策](#4-风险与关键决策)
5. [技术可行性结论](#5-技术可行性结论)

---

## 1. uni-icons 集成方案

### 1.1 easycom 自动引入配置

`@dcloudio/uni-ui` v1.4.0 已安装在 `devDependencies` 中，uni-app 框架默认支持 uni-ui 的 easycom 自动引入，**无需额外配置**。

验证方式：在任意页面直接使用 `<uni-icons type="search" size="24" color="#333"></uni-icons>`，编译时框架会自动从 `node_modules/@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue` 引入组件。

**如果 easycom 未生效**，在 `pages.json` 中添加：

```json
{
  "easycom": {
    "autoscan": true,
    "custom": {
      "uni-(.*)": "@dcloudio/uni-ui/lib/uni-$1/uni-$1.vue"
    }
  }
}
```

### 1.2 uni-icons 使用语法

```html
<!-- 基础用法 -->
<uni-icons type="search" size="24" color="#999999"></uni-icons>

<!-- 大图标（如首页快捷入口 56rpx） -->
<uni-icons type="person" size="56" color="#333333"></uni-icons>

<!-- 带点击事件 -->
<uni-icons type="close" size="20" color="#FFFFFF" @click="handleClose"></uni-icons>
```

**属性说明**：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | String | '' | 图标名称，必填 |
| size | Number/String | 16 | 图标大小，单位 rpx（传入数字即 rpx） |
| color | String | '#333333' | 图标颜色 |
| customPrefix | String | '' | 自定义图标前缀 |
| @click | Event | - | 点击事件 |

> **注意**：uni-icons 的 `size` 默认单位是 `px`，但在本项目中我们传数字（如 `size="24"`），组件内部检测到纯数字会拼接 `px`。为统一使用 `rpx`，建议传数字时按 rpx 值传入（如 `size="48"`），组件内部会拼接为 `48px`，在小程序中 1px = 2rpx，效果一致。

### 1.3 精确图标映射表

以下映射表基于 uni-icons 实际可用图标（共 110+ 图标），经逐项核对确认：

#### 1.3.1 OaIcon 组件图标映射（20 个图标）

| OaIcon 名称 | uni-icons type | 语义说明 | 使用页面 |
|---|---|---|---|
| `approval` | `checkbox` | 审批/勾选 | features, login |
| `report` | `compose` | 撰写/日报 | features, login |
| `notification` | `notification` | 通知/消息 | features, login, profile, message/empty-state |
| `project` | `folder-add` | 项目/文件夹 | features |
| `asset` | `wallet` | 资产/钱包 | features |
| `announcement` | `mail-open` | 公告/邮件打开 | features |
| `statistics` | `bars` | 统计/柱状 | features |
| `contacts` | `contact` | 通讯录/联系人 | features |
| `document` | `paperclip` | 文档/附件 | features |
| `user` | `person` | 用户/个人 | features, profile |
| `security` | `locked` | 安全/锁定 | features, profile |
| `help` | `help` | 帮助/问号 | profile |
| `info` | `info` | 信息/关于 | profile |
| `cache` | `trash` | 缓存/清理 | profile |
| `edit` | `compose` | 编辑/撰写 | profile |
| `search` | `search` | 搜索 | features, review-list |
| `message` | `chat` | 消息/聊天 | message/index（动态绑定） |
| `task` | `list` | 任务/列表 | message/index（动态绑定） |
| `pending` | `circle` | 待办/圆点 | message/index（动态绑定） |
| `more` | `more` | 更多/省略号 | features |
| `calendar` | `calendar` | 日历 | report-history |
| `right` | `arrow-right` | 右箭头 | report-edit, message-detail |
| `history` | `redo` | 历史/重做 | report-edit |
| `chevron-down` | `arrow-down` | 下拉箭头 | report-edit |
| `close` | `close` | 关闭/删除 | report-edit |
| `plus` | `plus` | 添加/加号 | report-edit |
| `empty`（空状态默认） | `inbox` → 改用 `mail-open` | 空状态 | empty-state 组件 |

#### 1.3.2 IconPark 组件图标映射（5 个 PNG）

| IconPark name | 当前 PNG | uni-icons type | 使用位置 |
|---|---|---|---|
| `approval` | `Vector_13_2290.png` | `checkbox` | home/index 快捷入口 |
| `report` | `Vector_13_2298.png` | `compose` | home/index 快捷入口 |
| `announcement` | `Vector_13_2307.png` | `mail-open` | home/index 快捷入口 |
| `contacts` | `Vector_13_2315.png` | `contact` | home/index 快捷入口 |
| `bell` | `svg1.png` | `notification` | home/index（未使用，预留） |

#### 1.3.3 @icon-park/vue-next 图标映射（6 个）

| IconPark 组件 | uni-icons type | filled 变体 | 使用位置 |
|---|---|---|---|
| `Home` | `home` | `home-filled` | TabBar 首页 |
| `AllApplication` | `bars` | `bars`（无 filled） | TabBar 功能 |
| `Audit` | `checkbox` | `checkbox-filled` | TabBar 审核 |
| `User` | `person` | `person-filled` | TabBar 我的 |
| `Remind` | `notification` | `notification-filled` | NavBar 通知按钮 |
| `Setting` | `settings` | `settings-filled` | NavBar 设置按钮 |

#### 1.3.4 审批静态 PNG 图标映射（3 个类型）

| 审批类型 | 当前 PNG | uni-icons type | 说明 |
|---|---|---|---|
| `leave`（请假） | `leave.png` | `calendar` | 请假使用日历图标 |
| `expense`（报销） | `reimburse.png` | `wallet` | 报销使用钱包图标 |
| `seal`（用章） | `seal.png` | `locked` | 用章使用锁定图标 |
| `travel`（出差） | `leave.png`（复用） | `map-pin` | 出差使用地图定位 |
| `purchase`（采购） | `reimburse.png`（复用） | `cart` | 采购使用购物车 |
| `general`（通用） | `seal.png`（复用） | `compose` | 通用使用撰写 |

#### 1.3.5 返回/更多按钮映射

| 当前资源 | uni-icons type | 使用位置 |
|---|---|---|
| `back.png` | `arrow-left` | 5 个内联 NavBar 页面 |
| `more.png` | `more` | approval/index 更多按钮 |

---

## 2. 分阶段工程方案

### 2.1 P0: Icon 统一替换（预估 6.5h）

#### 任务 P0-1: 确认 uni-icons easycom 配置（0.5h）

**操作**：
1. 检查 `src/pages.json` 中是否已配置 easycom（目前确认 `@dcloudio/uni-ui` 在依赖中）
2. 在任意页面（如 `login/index.vue`）添加测试代码：
   ```html
   <uni-icons type="search" size="28" color="#999999"></uni-icons>
   ```
3. 运行 `npm run dev:mp-weixin` 编译验证组件是否正常渲染
4. 如不生效，在 `pages.json` 中添加 easycom 配置

#### 任务 P0-2: 替换 features/index.vue 中 OaIcon（0.75h）

**文件**：`src/pages/features/index.vue`

**变更**：
- 删除 `import OaIcon`（原文件未显式 import，通过全局注册或 easycom 使用）
- 搜索栏第 8 行：`<OaIcon name="search" size="28" color="#C0C4CC" />`
  → `<uni-icons type="search" size="28" color="#C0C4CC"></uni-icons>`
- 动态图标第 31 行：`<OaIcon :name="item.icon" size="40" />`
  → `<uni-icons :type="getUniIcon(item.icon)" size="40" color="#333333"></uni-icons>`
- 在 script 中添加图标映射函数：
  ```js
  function getUniIcon(iconName) {
    const map = {
      approval: 'checkbox',
      report: 'compose',
      project: 'folder-add',
      asset: 'wallet',
      announcement: 'mail-open',
      statistics: 'bars',
      contacts: 'contact',
      document: 'paperclip',
      user: 'person',
      security: 'locked',
      more: 'more'
    }
    return map[iconName] || 'help'
  }
  ```
- 模板中所有 OaIcon 替换为 uni-icons

#### 任务 P0-3: 替换 profile/index.vue 中 OaIcon（0.5h）

**文件**：`src/pages/profile/index.vue`

**变更（7 处）**：
- 第 16 行：`<OaIcon name="edit" size="28" color="#FFFFFF" />`
  → `<uni-icons type="compose" size="28" color="#FFFFFF"></uni-icons>`
- 第 43 行：`<OaIcon :name="item.icon" size="32" color="#666666" />`
  → `<uni-icons :type="getSettingIcon(item.icon)" size="32" color="#666666"></uni-icons>`
- 添加映射函数：
  ```js
  function getSettingIcon(icon) {
    const map = {
      notification: 'notification',
      security: 'locked',
      cache: 'trash',
      help: 'help',
      info: 'info',
      user: 'person'
    }
    return map[icon] || 'help'
  }
  ```

#### 任务 P0-4: 替换 login/index.vue 中 OaIcon（0.25h）

**文件**：`src/pages/login/index.vue`

**变更（3 处）**：
- 第 16 行（v-for 中）：`<OaIcon :name="item.icon" size="36" />`
  → `<uni-icons :type="getLoginIcon(item.icon)" size="36" color="#333333"></uni-icons>`
- 添加映射函数：
  ```js
  function getLoginIcon(icon) {
    const map = { approval: 'checkbox', report: 'compose', notification: 'notification' }
    return map[icon] || 'notification'
  }
  ```

#### 任务 P0-5: 替换 message/index.vue 中 OaIcon（0.5h）

**文件**：`src/pages/message/index.vue`

**变更（动态绑定 + 1 处静态）**：
- 第 29 行：`<OaIcon :name="item.icon" size="32" :color="getIconColor(item.type)" />`
  → `<uni-icons :type="getMsgIcon(item.icon)" size="32" :color="getIconColor(item.type)"></uni-icons>`
- 添加映射函数：
  ```js
  function getMsgIcon(icon) {
    const map = {
      notification: 'notification',
      message: 'chat',
      task: 'list',
      pending: 'circle',
      approval: 'checkbox',
      report: 'compose',
      system: 'settings'
    }
    return map[icon] || 'notification'
  }
  ```
- 第 41 行 EmptyState icon：`icon="notification"` 保持不变（empty-state 组件内部处理）

#### 任务 P0-6: 替换 message/detail.vue 中 OaIcon（0.25h）

**文件**：`src/pages/message/detail.vue`

**变更（1 处）**：
- 第 13 行：`<OaIcon name="right" size="24" color="#2B6DE8" />`
  → `<uni-icons type="arrow-right" size="24" color="#2B6DE8"></uni-icons>`

#### 任务 P0-7: 替换 admin/review-list/index.vue 中 OaIcon（0.25h）

**文件**：`src/pages/admin/review-list/index.vue`

**变更（2 处）**：
- 第 42 行：`<OaIcon name="search" size="28" color="#999999" />`
  → `<uni-icons type="search" size="28" color="#999999"></uni-icons>`
- 第 65 行 EmptyState：`icon="empty"` → `icon="mail-open"`（传递实际 icon 给 empty-state）

#### 任务 P0-8: 替换 employee/report-history/index.vue 中 OaIcon（0.25h）

**文件**：`src/pages/employee/report-history/index.vue`

**变更（1 处）**：
- 第 9 行：`<OaIcon name="calendar" size="36" color="#666666" />`
  → `<uni-icons type="calendar" size="36" color="#666666"></uni-icons>`
- 第 66 行 EmptyState：`icon="empty"` → `icon="mail-open"`

#### 任务 P0-9: 替换 employee/report-edit/index.vue 中 OaIcon（0.5h）

**文件**：`src/pages/employee/report-edit/index.vue`

**变更（6 处）**：
- 第 14 行：`<OaIcon name="history" size="28" color="#2B6DE8" />`
  → `<uni-icons type="redo" size="28" color="#2B6DE8"></uni-icons>`
- 第 16 行：`<OaIcon name="right" size="24" color="#2B6DE8" />`
  → `<uni-icons type="arrow-right" size="24" color="#2B6DE8"></uni-icons>`
- 第 27 行：`<OaIcon name="chevron-down" size="28" color="#999999" />`
  → `<uni-icons type="arrow-down" size="28" color="#999999"></uni-icons>`
- 第 97 行：同上（第 2 个 chevron-down）
- 第 144 行：同上（第 3 个 chevron-down）
- 第 196 行：`<OaIcon name="close" size="20" color="#FFFFFF" />`
  → `<uni-icons type="close" size="20" color="#FFFFFF"></uni-icons>`
- 第 200 行：`<OaIcon name="plus" size="40" color="#CCCCCC" />`
  → `<uni-icons type="plus" size="40" color="#CCCCCC"></uni-icons>`

#### 任务 P0-10: 替换 empty-state/index.vue 中 OaIcon（0.25h）

**文件**：`src/components/empty-state/index.vue`

**变更（1 处模板 + props 调整）**：
- 第 4 行：`<OaIcon :name="icon" :size="iconSize" :color="iconColor" />`
  → `<uni-icons :type="getEmptyIcon(icon)" :size="iconSize" :color="iconColor"></uni-icons>`
- 添加映射函数：
  ```js
  function getEmptyIcon(icon) {
    const map = {
      empty: 'mail-open',
      notification: 'notification',
      search: 'search'
    }
    return map[icon] || 'mail-open'
  }
  ```
- 默认 icon prop 值：`default: 'mail-open'`

#### 任务 P0-11: 替换 home/index.vue 中 IconPark（0.5h）

**文件**：`src/pages/home/index.vue`

**变更（4 处）**：
- 删除 import：`import IconPark from '@/components/icon-park/icon-park.vue'`
- 第 63 行：`<IconPark :name="entry.icon" size="56" />`
  → `<uni-icons :type="getHomeIcon(entry.icon)" size="56" color="#333333"></uni-icons>`
- 添加映射函数：
  ```js
  function getHomeIcon(icon) {
    const map = { approval: 'checkbox', report: 'compose', announcement: 'mail-open', contacts: 'contact' }
    return map[icon] || 'help'
  }
  ```

#### 任务 P0-12: 替换 nav-bar.vue 中 @icon-park（0.5h）

**文件**：`src/components/nav-bar/nav-bar.vue`

**变更（2 处）**：
- 删除 import：`import { Remind, Setting } from '@icon-park/vue-next'`
- 第 17 行：`<Remind theme="outline" size="24" :fill="showBack ? '#666666' : '#ffffff'" />`
  → `<uni-icons type="notification" size="48" :color="showBack ? '#666666' : '#ffffff'"></uni-icons>`
- 第 23 行：`<Setting theme="outline" size="24" :fill="showBack ? '#666666' : '#ffffff'" />`
  → `<uni-icons type="settings" size="48" :color="showBack ? '#666666' : '#ffffff'"></uni-icons>`

> 说明：24px = 48rpx，统一使用 48 作为 size 值

#### 任务 P0-13: 替换 tab-bar.vue 中 @icon-park（0.75h）

**文件**：`src/components/tab-bar/tab-bar.vue`

**变更（4 组图标，每组需处理 active/inactive 双状态）**：
- 删除 import：`import { Home, AllApplication, User, Audit } from '@icon-park/vue-next'`
- 替换方案：使用 uni-icons 的 color 属性切换 active/inactive，注意 `AllApplication`(bars) 和 `Audit`(checkbox) 没有 filled 变体

```html
<!-- Home - 有 filled 变体 -->
<uni-icons 
  :type="activeTab === 'home' ? 'home-filled' : 'home'" 
  size="48" 
  :color="activeTab === 'home' ? '#2B6DE8' : '#999999'"
></uni-icons>

<!-- Features (AllApplication) - 无 filled 变体，仅切换颜色 -->
<uni-icons 
  type="bars" 
  size="48" 
  :color="activeTab === 'features' ? '#2B6DE8' : '#999999'"
></uni-icons>

<!-- Review (Audit) - 有 filled 变体 -->
<uni-icons 
  :type="activeTab === 'review' ? 'checkbox-filled' : 'checkbox'" 
  size="48" 
  :color="activeTab === 'review' ? '#2B6DE8' : '#999999'"
></uni-icons>

<!-- Profile (User) - 有 filled 变体 -->
<uni-icons 
  :type="activeTab === 'profile' ? 'person-filled' : 'person'" 
  size="48" 
  :color="activeTab === 'profile' ? '#2B6DE8' : '#999999'"
></uni-icons>
```

#### 任务 P0-14: 替换 approval 类型静态 PNG（0.75h）

**两个文件需要修改**：

**A. `src/pages/approval/detail.vue`**
- 删除 `typeIconMap` 中所有 PNG 路径
- 第 11 行：`<image class="info-icon-img" :src="getTypeIcon(detailData.type)" mode="aspectFit" />`
  → `<uni-icons :type="getApprovalTypeIcon(detailData.type)" size="36" color="#FFFFFF"></uni-icons>`
- 修改 `getTypeIcon` 返回 uni-icons type：
  ```js
  function getTypeIcon(type) {
    const map = {
      leave: 'calendar',
      expense: 'wallet',
      seal: 'locked',
      travel: 'map-pin',
      purchase: 'cart',
      general: 'compose'
    }
    return map[type] || 'compose'
  }
  ```
- 同步修改 `.info-icon-img` 样式为 uni-icons 样式

**B. `src/pages/approval/create/index.vue`**
- 同理修改 `getTypeIcon` 函数
- 第 16 行：`<image class="type-icon-img" :src="getTypeIcon(type.key)" mode="aspectFit" />`
  → `<uni-icons :type="getTypeIcon(type.key)" size="36" color="#333333"></uni-icons>`
- 注意创建页面的 type-icon 背景色已提供，图标颜色用 `#333333` 或白色取决于背景

> **注意**：approval/index.vue 中的 `item.iconSrc` 是从 API 返回的动态数据，非本地静态 PNG，**无需替换**。首页 `activity.iconSrc` 同样来自 API，**无需替换**。

#### 任务 P0-15: 删除废弃组件与资源（0.5h）

**文件删除清单**：

| 操作 | 路径 | 说明 |
|------|------|------|
| 删除目录 | `src/components/oa-icon/` | 整个 OaIcon 组件 |
| 删除目录 | `src/components/icon-park/` | 整个 IconPark 组件 |
| 删除目录 | `src/static/images/home/generated/` | PNG 图标资源 |
| 删除文件 | `src/static/fonts/iconfont.css` | 自定义字体图标 CSS |
| 删除 npm 包 | `@icon-park/vue-next` | 从 `package.json` 移除依赖 |
| 保留 | `src/static/images/approval/back.png` | 暂保留，待 P1 NavBar 统一后再确认是否删除 |
| 保留 | `src/static/images/approval/more.png` | 同上 |

**删除依赖命令**：
```bash
npm uninstall @icon-park/vue-next
```

### 2.2 P1: 布局一致性优化（预估 5.5h）

#### 任务 P1-1: NavBar 组件增强（1h）

**文件**：`src/components/nav-bar/nav-bar.vue`

**变更**：
1. **添加 nav-right slot 增强**：当前已有 `slot name="right"`，但需要确保它在 `showNotification` 和 `showSetting` 都为 false 时也能渲染自定义内容
2. **添加 Back 按钮图标替换**：将 `back.png` 替换为 uni-icons：

```html
<!-- 替换第 5 行 -->
<view v-if="showBack" class="back-btn" @tap="goBack">
  <uni-icons type="arrow-left" size="48" :color="showBack ? '#333333' : '#ffffff'"></uni-icons>
</view>
```

3. **模板结构调整**：确保 slot 优先级高于默认按钮

```html
<view class="nav-right">
  <!-- 先渲染 slot，如果有 slot 内容则覆盖默认按钮 -->
  <slot name="right">
    <view v-if="showNotification" class="nav-icon-btn" ...>
      <uni-icons type="notification" size="48" :color="showBack ? '#666666' : '#ffffff'" />
      ...
    </view>
    <view v-if="showSetting" class="nav-icon-btn" ...>
      <uni-icons type="settings" size="48" :color="showBack ? '#666666' : '#ffffff'" />
      ...
    </view>
  </slot>
</view>
```

**向后兼容性**：`showBack`、`showNotification`、`showSetting` 属性签名不变，现有 7 个页面无需修改

#### 任务 P1-2: 替换 5 个内联 NavBar 为共享组件（2h）

**文件清单**：

| 文件 | 当前 NavBar 类型 | 替换代码 | 额外处理 |
|------|-----------------|---------|---------|
| `src/pages/approval/index/index.vue` | 内联（返回+标题+more） | `<NavBar title="审批中心" :showBack="true" />` | 删除内联 nav-bar 整段 HTML（约 10 行）和对应 CSS；右侧 more 按钮通过 slot 传入 |
| `src/pages/admin/review-list/index.vue` | 内联（返回+标题） | `<NavBar title="审核管理" :showBack="true" />` | 删除内联 nav-bar 整段 HTML 和 CSS |
| `src/pages/employee/report-history/index.vue` | 内联（返回+标题+日历） | `<NavBar title="日报历史" :showBack="true" />` | 右侧日历图标通过 slot 传入 |
| `src/pages/employee/report-detail/index.vue` | 内联（返回+标题） | `<NavBar title="日报详情" :showBack="true" />` | 删除内联 nav-bar 整段 HTML 和 CSS |
| `src/pages/employee/report-edit/index.vue` | 内联（返回+标题+草稿） | `<NavBar title="写日报" :showBack="true" />` | 右侧"保存草稿"按钮通过 slot 传入 |

**带 slot 的替换示例**（approval/index）：

```html
<NavBar title="审批中心" :showBack="true">
  <template #right>
    <view class="nav-more-btn" @tap="showMore">
      <uni-icons type="more" size="48" color="#666666"></uni-icons>
    </view>
  </template>
</NavBar>
```

**带 slot 的替换示例**（report-history）：

```html
<NavBar title="日报历史" :showBack="true">
  <template #right>
    <view class="nav-cal-btn" @tap="showCalendar">
      <uni-icons type="calendar" size="48" color="#666666"></uni-icons>
    </view>
  </template>
</NavBar>
```

**带 slot 的替换示例**（report-edit）：

```html
<NavBar title="写日报" :showBack="true">
  <template #right>
    <view class="nav-draft-btn" @tap="saveDraft">
      <text class="nav-draft-text">保存草稿</text>
    </view>
  </template>
</NavBar>
```

**删除内联 NavBar 后需清理的 CSS**：
- 每个文件删除 `.nav-bar`、`.nav-icon`、`.nav-title`、`.nav-left`、`.nav-right`、`.nav-icon-hover` 等样式定义
- 修改 `content-scroll` 的 padding-top，因为共享 NavBar 不占用页面内边距（position: static）

#### 任务 P1-3: 卡片样式统一（1.5h）

**统一标准**：

```scss
// 卡片统一规范
$card-bg: #FFFFFF;
$card-border-radius: 16rpx;     // 统一 16rpx
$card-padding: 24rpx;           // 统一 24rpx
$card-margin-bottom: 20rpx;     // 统一 20rpx
$card-box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
```

**各文件修改**：

| 文件 | 当前 CSS 类 | 当前值 | 改为 |
|------|------------|--------|------|
| `src/pages/features/index.vue` | `.panel` | `padding: 28rpx; border-radius: 20rpx` | `padding: 24rpx; border-radius: 16rpx` |
| `src/pages/approval/index/index.vue` | `.approval-card` | `padding: 28rpx 32rpx` | `padding: 24rpx` |
| `src/pages/message/detail.vue` | `.message-card` | `padding: 32rpx 24rpx` | `padding: 24rpx` |
| `src/pages/profile/index.vue` | `.panel` | `border-radius: 20rpx` | `border-radius: 16rpx` |
| `src/pages/home/index.vue` | `.card` | 已是 `border-radius: 16rpx; padding: 24rpx` | ✅ 符合标准，无需修改 |

#### 任务 P1-4: 页面内边距统一（1h）

**统一标准**：

```scss
$content-padding: 24rpx;   // 统一 24rpx
```

**各文件修改**：

| 文件 | 当前 CSS 选择器 | 当前值 | 改为 |
|------|----------------|--------|------|
| `src/pages/features/index.vue` | `.features-content` | `padding: 20rpx 32rpx` | `padding: 24rpx` |
| `src/pages/features/index.vue` | `.search-bar` | `padding: 20rpx 32rpx` | `padding: 24rpx` |
| `src/pages/approval/index/index.vue` | `.content-scroll` | `padding: 16rpx 24rpx` | `padding: 24rpx` |
| `src/pages/approval/index/index.vue` | `.filters` | `padding: 16rpx 24rpx` | `padding: 24rpx` |
| `src/pages/employee/report-history/index.vue` | `.content-scroll` | `padding: 16rpx 24rpx` | `padding: 24rpx` |
| `src/pages/profile/index.vue` | `.panel`（父容器 margin） | `margin: 0 32rpx 20rpx` | `margin: 0 24rpx 20rpx` |
| `src/pages/profile/index.vue` | `.user-card` | `margin: 20rpx 32rpx` | `margin: 20rpx 24rpx` |
| `src/pages/profile/index.vue` | `.btn-area` | `margin: 20rpx 32rpx` | `margin: 20rpx 24rpx` |
| `src/pages/message/index.vue` | `.message-list` | `padding: 16rpx 24rpx` | `padding: 24rpx` |
| `src/pages/admin/review-list/index.vue` | `.content-scroll` | `padding: 0 24rpx 24rpx` | `padding: 24rpx` |
| `src/pages/admin/review-list/index.vue` | `.stats-row` | `margin: 20rpx 24rpx` | `margin: 20rpx 24rpx`（已符合） |
| `src/pages/admin/review-list/index.vue` | `.tabs` | `margin: 0 24rpx` | `margin: 0 24rpx`（已符合） |
| `src/pages/admin/review-list/index.vue` | `.search-bar` | `margin: 16rpx 24rpx` | `margin: 16rpx 24rpx`（已符合） |

### 2.3 P2: 样式规范落地（预估 5.5h）

#### 任务 P2-1: 增强 uni.scss + 建立全局 .card 类（1h）

**文件**：`src/uni.scss`

**添加内容**：

```scss
// ===== 全局 .card 类 =====
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

// ===== 内容区域统一 padding =====
.content-padding {
  padding: 24rpx;
}
```

**注意**：`src/uni.scss` 中的变量在 scoped style 中需要 `@import` 才能使用，但 全局 `.card` 类可以直接在模板中使用 class="card"。

#### 任务 P2-2: 页面变量清理 + 导入 uni.scss（2h）

**涉及文件（12 个）**：

| 文件 | 当前变量声明 | 操作 |
|------|-------------|------|
| `src/pages/home/index.vue` | `$text-primary: rgba(0,0,0,0.9)` ... 等 10+ 变量 | 🔴 修复不一致 + 删除重复变量 |
| `src/pages/features/index.vue` | 无显式声明（使用硬编码值） | 添加 `@import '@/uni.scss'` |
| `src/pages/profile/index.vue` | 无显式声明 | 添加 `@import '@/uni.scss'` |
| `src/pages/login/index.vue` | 无显式声明 | 添加 `@import '@/uni.scss'` |
| `src/pages/message/index.vue` | 6 个 SCSS 变量声明 | 删除重复声明，添加 `@import '@/uni.scss'` |
| `src/pages/message/detail.vue` | 6 个 SCSS 变量声明 | 同上 |
| `src/pages/approval/index/index.vue` | 7 个 SCSS 变量声明 | 同上 |
| `src/pages/approval/detail.vue` | 8 个 SCSS 变量声明 | 同上 |
| `src/pages/approval/create/index.vue` | 6 个 SCSS 变量声明 | 同上 |
| `src/pages/admin/review-list/index.vue` | 6 个 SCSS 变量声明 | 同上 |
| `src/pages/employee/report-history/index.vue` | 6 个 SCSS 变量声明 | 同上 |
| `src/pages/employee/report-detail/index.vue` | 8 个 SCSS 变量声明 | 同上 |
| `src/pages/employee/report-edit/index.vue` | 7 个 SCSS 变量声明 | 同上 |

**统一操作**：
```scss
// 在每个页面的 style 块中，删除所有重复声明的 SCSS 变量，替换为：
<style lang="scss" scoped>
@import '@/uni.scss';
// 仅保留页面特有的变量和样式
...
</style>
```

**home/index.vue 特殊处理**：
- 将 `$text-primary: rgba(0,0,0,0.9)` → 删除，使用 uni.scss 的 `#333333`
- 将 `$text-secondary: rgba(0,0,0,0.6)` → 删除，使用 uni.scss 的 `#666666`
- 将 `$text-tertiary: rgba(0,0,0,0.4)` → 删除，使用 uni.scss 的 `#999999`
- 将 `$bg-page: #F7F7F7` → 删除，使用 uni.scss 的 `$bg-color`
- 其他变量同理删除，然后添加 `@import '@/uni.scss'`

#### 任务 P2-3: home 变量不一致修复（0.5h）

**文件**：`src/pages/home/index.vue`

具体修复内容已在 P2-2 中覆盖：

| 当前值 | 标准值（uni.scss） |
|--------|-------------------|
| `rgba(0, 0, 0, 0.9)` | `#333333`（`$text-primary`） |
| `rgba(0, 0, 0, 0.6)` | `#666666`（`$text-regular`） |
| `rgba(0, 0, 0, 0.4)` | `#999999`（`$text-secondary`） |
| `$color-primary: #2B6DE8` | 删除，使用 `$primary-color` |
| `$bg-page: #F7F7F7` | 删除，使用 `$bg-color` |
| `$bg-card: #FFFFFF` | 删除，使用 `$bg-card`（同名） |
| `$radius-sm: 8rpx` | 删除，使用 `$radius-sm`（同名） |
| `$radius-md: 12rpx` | 删除，使用 `$radius-base` |
| `$radius-lg: 16rpx` | 删除，使用 `$radius-lg`（同名） |

#### 任务 P2-4: 下拉刷新/上拉加载统一（2h）

**涉及文件**：

| 文件 | 当前状态 | 需增加 |
|------|---------|--------|
| `src/pages/approval/index/index.vue` | 仅上拉加载 | 增加下拉刷新 |
| `src/pages/employee/report-history/index.vue` | 仅上拉加载 | 增加下拉刷新 |
| `src/pages/admin/review-list/index.vue` | 无 | 增加下拉刷新 + 上拉加载 |
| `src/pages/message/index.vue` | 无 | 增加下拉刷新 |

**实现方式**（微信小程序 refresher 方案）：

```html
<scroll-view
  class="content-scroll"
  scroll-y
  @scrolltolower="onLoadMore"
  :refresher-enabled="true"
  :refresher-triggered="isRefreshing"
  @refresherrefresh="onRefresh"
>
```

**script 部分**：

```js
const isRefreshing = ref(false)

async function onRefresh() {
  isRefreshing.value = true
  await loadData(true) // reset = true
  isRefreshing.value = false
  uni.showToast({ title: '刷新成功', icon: 'success' })
}
```

**注意**：需要确认后端 API 是否支持 `?page=1&pageSize=20` 这类分页参数。目前 `approvalApi.getList`、`reportApi.getList` 已支持分页参数，`reviewApi.getList` 也支持，`messageApi.getList` 也支持。所以上拉加载功能可以直接复用现有分页逻辑。

---

## 3. 文件变更清单

### 3.1 P0: Icon 统一替换

| 序号 | 文件路径 | 变更类型 | 说明 |
|------|---------|---------|------|
| 1 | `src/pages/features/index.vue` | 修改 | OaIcon→uni-icons，8 处引用 |
| 2 | `src/pages/profile/index.vue` | 修改 | OaIcon→uni-icons，7 处引用 |
| 3 | `src/pages/login/index.vue` | 修改 | OaIcon→uni-icons，3 处引用 |
| 4 | `src/pages/message/index.vue` | 修改 | OaIcon→uni-icons，动态绑定 |
| 5 | `src/pages/message/detail.vue` | 修改 | OaIcon→uni-icons，1 处 |
| 6 | `src/pages/admin/review-list/index.vue` | 修改 | OaIcon→uni-icons，2 处 |
| 7 | `src/pages/employee/report-history/index.vue` | 修改 | OaIcon→uni-icons，1 处 |
| 8 | `src/pages/employee/report-edit/index.vue` | 修改 | OaIcon→uni-icons，6 处 |
| 9 | `src/components/empty-state/index.vue` | 修改 | OaIcon→uni-icons，组件内部 |
| 10 | `src/pages/home/index.vue` | 修改 | IconPark→uni-icons，4 处 |
| 11 | `src/components/nav-bar/nav-bar.vue` | 修改 | @icon-park→uni-icons，2 处 |
| 12 | `src/components/tab-bar/tab-bar.vue` | 修改 | @icon-park→uni-icons，4 组 |
| 13 | `src/pages/approval/detail.vue` | 修改 | 审批 PNG→uni-icons，6 个类型映射 |
| 14 | `src/pages/approval/create/index.vue` | 修改 | 审批 PNG→uni-icons，6 个类型映射 |
| 15 | `src/components/oa-icon/`（整目录） | **删除** | 废弃组件 |
| 16 | `src/components/icon-park/`（整目录） | **删除** | 废弃组件 |
| 17 | `src/static/images/home/generated/`（整目录） | **删除** | 废弃 PNG 资源 |
| 18 | `src/static/fonts/iconfont.css` | **删除** | 废弃字体 CSS |
| 19 | `package.json` | 修改 | 移除 `@icon-park/vue-next` 依赖 |

**P0 小计：14 个文件修改，4 个目录/文件删除，1 个配置文件修改**

### 3.2 P1: 布局一致性优化

| 序号 | 文件路径 | 变更类型 | 说明 |
|------|---------|---------|------|
| 1 | `src/components/nav-bar/nav-bar.vue` | 修改 | back.png→uni-icons arrow-left；slot 增强 |
| 2 | `src/pages/approval/index/index.vue` | 修改 | 内联 NavBar→共享组件 + slot |
| 3 | `src/pages/admin/review-list/index.vue` | 修改 | 内联 NavBar→共享组件 |
| 4 | `src/pages/employee/report-history/index.vue` | 修改 | 内联 NavBar→共享组件 + slot |
| 5 | `src/pages/employee/report-detail/index.vue` | 修改 | 内联 NavBar→共享组件 |
| 6 | `src/pages/employee/report-edit/index.vue` | 修改 | 内联 NavBar→共享组件 + slot |
| 7 | `src/pages/features/index.vue` | 修改 | 卡片 border-radius/padding 统一 |
| 8 | `src/pages/approval/index/index.vue` | 修改 | 卡片 padding 统一 |
| 9 | `src/pages/message/detail.vue` | 修改 | 卡片 padding 统一 |
| 10 | `src/pages/profile/index.vue` | 修改 | 卡片 border-radius 统一 |
| 11 | `src/pages/features/index.vue` | 修改 | content padding 统一 |
| 12 | `src/pages/approval/index/index.vue` | 修改 | content padding 统一 |
| 13 | `src/pages/employee/report-history/index.vue` | 修改 | content padding 统一 |
| 14 | `src/pages/profile/index.vue` | 修改 | margin/padding 统一 |
| 15 | `src/pages/message/index.vue` | 修改 | content padding 统一 |
| 16 | `src/pages/admin/review-list/index.vue` | 修改 | content padding 统一 |

**P1 小计：6 个文件涉及 NavBar 替换，10 个文件涉及卡片/padding 调整（部分文件重复计数）**

### 3.3 P2: 样式规范落地

| 序号 | 文件路径 | 变更类型 | 说明 |
|------|---------|---------|------|
| 1 | `src/uni.scss` | 修改 | 添加全局 `.card` 类、`.card-header`、`.card-title` |
| 2 | `src/pages/home/index.vue` | 修改 | 变量清理 + import uni.scss + 颜色值修复 |
| 3 | `src/pages/features/index.vue` | 修改 | 添加 import uni.scss |
| 4 | `src/pages/profile/index.vue` | 修改 | 添加 import uni.scss |
| 5 | `src/pages/login/index.vue` | 修改 | 添加 import uni.scss |
| 6 | `src/pages/message/index.vue` | 修改 | 删除重复变量 + import uni.scss |
| 7 | `src/pages/message/detail.vue` | 修改 | 同上 |
| 8 | `src/pages/approval/index/index.vue` | 修改 | 同上 |
| 9 | `src/pages/approval/detail.vue` | 修改 | 同上 |
| 10 | `src/pages/approval/create/index.vue` | 修改 | 同上 |
| 11 | `src/pages/admin/review-list/index.vue` | 修改 | 同上 |
| 12 | `src/pages/employee/report-history/index.vue` | 修改 | 同上 |
| 13 | `src/pages/employee/report-detail/index.vue` | 修改 | 同上 |
| 14 | `src/pages/employee/report-edit/index.vue` | 修改 | 同上 |
| 15 | `src/pages/approval/index/index.vue` | 修改 | 增加下拉刷新 |
| 16 | `src/pages/employee/report-history/index.vue` | 修改 | 增加下拉刷新 |
| 17 | `src/pages/admin/review-list/index.vue` | 修改 | 增加下拉刷新 + 上拉加载 |
| 18 | `src/pages/message/index.vue` | 修改 | 增加下拉刷新 |

**P2 小计：1 个全局文件（uni.scss）+ 12 个 SCSS 变量清理 + 4 个页面刷新增强**

### 3.4 总计

| 阶段 | 新增 | 修改 | 删除 | 合计 |
|------|------|------|------|------|
| P0 | 0 | 14 | 4 目录 + 1 文件 + 1 配置 | 20 |
| P1 | 0 | 10-16 | 0 | 10-16 |
| P2 | 0 | 15-17 | 0 | 15-17 |
| **总计** | **0** | **~20** | **~5** | **约 25 个文件/目录操作** |

---

## 4. 风险与关键决策

### 🔴 高风险

#### R1: uni-icons 对 TabBar 双状态图标的支持

**风险描述**：当前 TabBar 使用 `@icon-park/vue-next` 的 `theme="filled/outline"` 实现 active/inactive 双状态切换。uni-icons 中部分图标没有 filled 变体。

**影响分析**：

| TabBar 图标 | 有 filled 变体？ | 方案 |
|---|---|---|
| `home` | ✅ `home` / `home-filled` | 双状态切换，效果一致 |
| `bars`（AllApplication） | ❌ 无 `bars-filled` | 仅切换颜色（active='#2B6DE8', inactive='#999999'） |
| `checkbox`（Audit） | ✅ `checkbox` / `checkbox-filled` | 双状态切换，效果一致 |
| `person`（User） | ✅ `person` / `person-filled` | 双状态切换，效果一致 |

**决策**：`bars` 图标使用颜色切换方案，虽然与原有 filled/outline 切换效果略有差异但在可接受范围内。

#### R2: NavBar 增强的向后兼容性

**风险描述**：增强 NavBar slot 后需确保现有的 7 个页面不受影响。

**评估**：当前 NavBar 的 `slot name="right"` 已在模板中存在，且默认内容即为 `showNotification`/`showSetting` 按钮。slot 机制本身具有"slot 内容存在时覆盖默认内容"的特性，**完全向后兼容**。

**验证方式**：编译后逐页检查以下页面 NavBar 显示是否正常：
- home（蓝色渐变 + 通知 + 设置）
- features（蓝色渐变）
- profile（蓝色渐变）
- approval/detail（白底 + 返回）
- approval/create（白底 + 返回）
- message/index（蓝色渐变）
- message/detail（白底 + 返回）

#### R3: 删除废弃组件后的影响面

**风险描述**：删除 OaIcon、IconPark 组件和 `@icon-park/vue-next` npm 包，需确保所有引用已替换完毕。

**应对方案**：
1. 在删除前，全局搜索确认无残留引用：
   ```bash
   grep -r "oa-icon\|oa-icon\|IconPark\|icon-park\|@icon-park" src/ --include="*.vue" --include="*.js" --include="*.ts"
   ```
2. 在 `package.json` 中删除依赖后运行 `npm install` 确认无报错
3. 编译运行 `npm run dev:mp-weixin` 确认无编译错误

### 🟡 中风险

#### R4: 审批类型图标语义准确性

**风险描述**：审批类型（请假/报销/用章）使用 uni-icons 通用图标（calendar/wallet/locked），语义可能不够精确。

**评估**：原 PNG 图标也是通用设计（leave.png 是日历风格、reimburse.png 是文件风格、seal.png 是印章风格），uni-icons 的 calendar/wallet/locked 在语义上等同或更优。wallet 对于报销场景比原文件图标更直观。

**建议**：如果业务方对图标语义有更高要求，可后续考虑使用自定义字体图标扩展 uni-icons。

#### R5: 首页快捷入口图标尺寸（56rpx）

**风险描述**：首页 `IconPark` 组件的 size 为 56rpx，uni-icons 是否支持该尺寸。

**评估**：uni-icons 的 size 属性接受 Number 或 String，无上限限制。传入 `size="56"` 将渲染为 56px（112rpx 等效），完全支持。

### 🟢 低风险

#### R6: P0 完成后即可独立发版

P0 不涉及任何布局/逻辑变更，仅替换图标方案，可以独立测试和发布。建议 P0 完成后做一次完整回归测试。

#### R7: back.png 和 more.png 的删除时机

当前这 2 个 PNG 在 P0 保留，在 P1 中：
- `back.png`：被 NavBar 组件中的 `uni-icons type="arrow-left"` 替代
- `more.png`：被 approval/index 的 slot 中的 `uni-icons type="more"` 替代

**建议**：在 P1 完成后删除 `src/static/images/approval/back.png` 和 `more.png`。但如果其他页面（如 review-detail、rejected-edit）也使用了 back.png，需检查清除。

---

## 5. 技术可行性结论

**结论：方案可行，风险可控。**

1. **uni-icons 覆盖度**：uni-icons 的 110+ 图标完全覆盖本项目 25+ 业务图标需求，仅有 1 个（`bars` 无 filled 变体）需要降级为颜色切换方案
2. **无新增依赖**：`@dcloudio/uni-ui` 已在依赖中，无需额外安装
3. **easycom 自动引入**：开箱即用，无需配置
4. **分阶段可交付**：P0 是纯替换，风险最低；P1 涉及组件增强但向后兼容；P2 是样式规范清理
5. **删除量可控**：废弃组件引用关系清晰，通过全局搜索可确保无遗漏
