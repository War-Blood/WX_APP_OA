---
name: 微信小程序设计规范
description: >
  智慧办公助手微信小程序 UI 设计规范。包含页面布局、导航栏、TabBar、WE UI 图标、
  色彩系统、字体层级等完整规范。当用户进行小程序界面设计、修改现有页面、创建新页面、
  调整布局组件时使用。触发词：界面设计、页面设计、UI设计、布局、导航栏、TabBar、
  NavBar、底部导航、设计规范、小程序设计、微信规范、WE UI。
---

# 微信小程序设计规范

## 核心设计原则

### 弹性盒子优先（Flex-First）

**所有容器必须使用弹性盒子布局**（`layout: "horizontal"` 或 `"vertical"`），严禁绝对定位兜底。

| 原则 | 规则 |
|------|------|
| 容器 | `layoutMode` = `HORIZONTAL` 或 `VERTICAL` |
| 对齐 | `SPACE_BETWEEN` / `CENTER` / `MIN` / `MAX` |
| 尺寸 | `FIXED` / `HUG` / `FILL` (`layoutGrow: 1`) |
| 间距 | `itemSpacing` + `padding`，不用手动坐标 |
| 禁止 | ❌ `layoutPositioning: "ABSOLUTE"` |

**弹性盒子不生效时的排查顺序**：
1. 子元素是否 `RESIZE_TO_FIT`？（→ 改 `FIXED` 让 `layoutGrow` 能工作）
2. 父容器是否 `FIXED` 宽度？（`HUG` 的父容器无法分配剩余空间）
3. 是否误用 `layoutGrow`？（优先 `SPACE_BETWEEN` + 固定 `width`）

**布局决策树**：
```
需要靠右对齐？
├─ 父 horizontal + SPACE_BETWEEN → 最左/最右自然撑开 ✅
├─ 父 horizontal + MAX → 所有子元素靠右
├─ spacer 占位 → 插入空 frame layoutGrow:1 顶推
└─ ❌ 不要用 ABSOLUTE 定位
```

本规范适用于「智慧办公助手」OA 小程序所有界面设计。在 Ardot 画布上操作时，严格遵循本文档中各项数值标准。

## 快速索引

| 需要查什么 | 看哪里 |
|-----------|--------|
| 页面整体结构怎么搭 | → [页面布局](#页面布局) |
| NavBar 尺寸和样式 | → [导航栏 NavBar](#导航栏-navbar) |
| 底部导航怎么做 | → [底部导航栏 TabBar](#底部导航栏-tabbar) |
| 用什么颜色 | → [色彩系统](#色彩系统) 或 `references/colors.md` |
| 图标怎么画 | → [WE UI 图标规范](#we-ui-图标规范) |
| 字号用多大 | → [字体层级](#字体层级) |
| 间距多少 | → [间距体系](#间距体系) |
| 怎么适配 | → [适配关系](#适配关系) |

---

## 页面布局

所有页面均为 **375×812px** 竖屏（对应 iPhone X / 750rpx）。

### L1 首页（含 TabBar）

```
┌─ Status  44px 白 ────────────────────┐
├─ NavBar  44px 白 ────────────────────┤
├─ Content layoutGrow:1 ───────────────┤
├─ TabBar  50px 白 ────────────────────┤
└───────────────────────────────────────┘
  812 = 44 + 44 + 674 + 50
```

### L2 列表页（无 TabBar）

```
┌─ Status  44px 白 ────────────────────┐
├─ NavBar  44px 白 ← 标题 ⋯ ──────────┤
├─ Content layoutGrow:1 ───────────────┤
└───────────────────────────────────────┘
  812 = 44 + 44 + 724
```

### L3 详情/编辑页（含底部操作栏）

```
┌─ Status  44px 白 ────────────────────┐
├─ NavBar  44px 白 ← 标题 ─────────────┤
├─ Content layoutGrow:1 (FIXED) ───────┤
├─ 底部操作 60-64px 白 ────────────────┤
└───────────────────────────────────────┘
  812 = 44 + 44 + Content + 底部操作
```

### 关键原则

- 父容器用 `layout: "vertical"` + `clipsContent: true` + 固定 `height: 812`
- Content 区设 `layoutGrow: 1` + `primaryAxisSizingMode: "FIXED"` 自适应填充
- **禁止** Content 区用 `RESIZE_TO_FIT`，会导致底部导航无法沉底
- TabBar 设 `layoutGrow: 0` 固定在底部

---

## 导航栏 NavBar

| 属性 | 值 |
|------|-----|
| 高度 | **44px** |
| 背景 | **`#FFFFFF`** 纯白，统一所有页面 |
| 标题 | 17px SemiBold `#333333`，居中 |
| 返回按钮 | 左上角 44×44，`←` SVG 2px `#333333` |
| 右侧按钮 | 44×44，`#F5F5F5` 圆形底 |

**L1 页特有**: 标题纯居中，无返回按钮。左侧为 Logo(蓝底 `#2B6DE8`) + 应用名(黑字)。

---

## 底部导航栏 TabBar

| 属性 | 值 |
|------|-----|
| 高度 | **50px** |
| 背景 | `#FFFFFF` + 顶部 1px `#F0F0F0` 边框 |
| 分布 | **等宽分布**，每 Tab = 375÷N px |
| 图标 | 28px SVG，2px 描边 |
| 选中态 | 图标 `#2B6DE8`，不加底不换字 |
| 未选中 | 图标 `#999999` |
| 无文字 | 纯图标模式 |
| 标签数 | 3 个（首页/功能/我的） |

**构建方式**: 父 `horizontal` 布局，每个 Tab 容器 `width: 125` + `height: "fill_container"` + `layout: "vertical"` 居中。**不要用 `layoutGrow`**（在该框架中不生效）。

---

## 底部操作栏（L3 详情/编辑页）

| 属性 | 值 |
|------|-----|
| 高度 | **60-64px** |
| 背景 | `#FFFFFF` |
| 位置 | 页面最底部，`layoutGrow: 0` |
| 结构 | `horizontal`，左右 padding 12-16px |

### 按钮分类系统

构建任何按钮前，先判断类型，再查表取值。

**A 类 — 全宽主操作按钮**（提交/重新提交/确认）

| 属性 | 值 |
|------|-----|
| 宽度 | **351px**（固定）或 `fill_container` |
| 高度 | **48px** |
| 圆角 | **24px** |
| 背景 | 蓝渐变 `#2B6DE8 → #5B8DF0` |
| 文字 | 15-16px SemiBold `#FFFFFF` |
| layoutGrow | **0**（禁止使用） |
| 容器 | 包裹在底部操作栏 `horizontal` 中 |

示例: `{type: "frame", width: 351, height: 48, cornerRadius: 24, layoutGrow: 0, fills: [蓝渐变], layout: "vertical", counterAxisAlignItems: "CENTER", primaryAxisAlignItems: "CENTER"}`

**B 类 — 半宽操作按钮**（存草稿/驳回/取消，双按钮场景左侧）

| 属性 | 值 |
|------|-----|
| 宽度 | **165-166px**（固定） |
| 高度 | **44-48px** |
| 圆角 | **22-24px** |
| 背景 | `#F5F5F5` 纯色 |
| 文字 | 15px Medium `#666666` |
| layoutGrow | **0**（禁止使用） |

示例: `{type: "frame", width: 165, height: 44, cornerRadius: 22, layoutGrow: 0, fills: [{type: "SOLID", color: {r: 0.96, g: 0.96, b: 0.96}}], ...}`

**C 类 — 危险操作按钮**（退出登录/删除）

| 属性 | 值 |
|------|-----|
| 宽度 | **351px**（固定） |
| 高度 | **44px** |
| 圆角 | **20-22px** |
| 背景 | `#FFFFFF` |
| 文字 | 15px Medium `#EF4444` |
| layoutGrow | **0**（禁止使用） |
| 位置 | 在 content 内，非底部操作栏 |

**D 类 — 筛选/类型 Pill 标签**

| 属性 | 值 |
|------|-----|
| 宽度 | **hug_contents**（自动） |
| padding | 4-6px 垂直，12-16px 水平 |
| 圆角 | **14-16px** |
| 选中 | 蓝底 `#2B6DE8` + 白字 |
| 未选中 | 灰底 `#F5F5F5` + 黑字 `#666666` |
| layoutGrow | **0** |

**E 类 — 状态徽章**（已通过/待审核/待补充）

| 属性 | 值 |
|------|-----|
| 宽度 | **44px**（固定） |
| 高度 | **20px**（固定） |
| 圆角 | **4px** |
| 文字 | 10px Medium，居中 |
| layout | `vertical, CENTER, CENTER` |
| layoutGrow | **0** |
| 举例 | 已通过: `#F0FDF4` 底 + `#22C55E` 字 |

### 按钮构建铁律

- ✅ **永远固定宽度**，不用 `layoutGrow`
- ✅ 底部操作栏按钮直接置入容器 `horizontal` 中
- ✅ 容器内 padding 12px，按钮 351px 或 165+12+166
- ❌ 不要把按钮放在 content 内部（除 C 类）
- ❌ 不要用 `RESIZE_TO_FIT` 作为按钮的 sizing mode（会导致 100×100 膨胀）
- ❌ 不要给按钮设置 `padding`（用固定 width+height）

---

## WE UI 图标规范

| 属性 | 值 |
|------|-----|
| 风格 | SVG 纯线条，2px stroke，不填充 |
| 功能图标 | 48px 圆角底(14px) + 内嵌 24px SVG |
| 列表图标 | 20px SVG，行首 |
| TabBar 图标 | 28px SVG，居中 |

语义色对应：
- 蓝 `#2B6DE8` — 审批、用户、信息
- 绿 `#22C55E` — 日报、完成、成功
- 橙 `#F59E0B` — 统计、待处理、警告
- 紫 `#6366F1` — 通知、消息、公告
- 红 `#EF4444` — 资产、安全、退出

---

## 色彩系统

| 令牌 | 色值 | 用途 |
|------|------|------|
| 主色 | `#2B6DE8` | 按钮、选中态、统计数字 |
| 成功 | `#22C55E` | 已通过、已完成 |
| 警告 | `#F59E0B` | 待审批、待处理 |
| 危险 | `#EF4444` | 驳回、删除、退出 |
| 信息 | `#6366F1` | 未读消息 |
| 页面背景 | `#F7F7F7` | 所有页面底色 |
| 卡片 | `#FFFFFF` | 白色卡片 |
| 分割线 | `#ECECEC` | 列表分割 |
| 标题文字 | `#333333` | 主标题 |
| 次要文字 | `#666666` | 副标题 |
| 辅助文字 | `#999999` | 时间、标签 |
| 禁用 | `#C0C4CC` | 占位符 |

详细色板见 `references/colors.md`

---

## 字体层级

| 层级 | 字号 | 字重 | 使用场景 |
|------|------|------|---------|
| 统计数字 | 20px | Bold | 首页/个人中心统计 |
| 导航标题 | 17px | SemiBold | NavBar 标题 |
| 卡片标题 | 14-16px | SemiBold | 信息类卡片标题 |
| 正文 | 13-14px | Regular | 列表项、内容 |
| 辅助 | 11-12px | Regular | 时间、状态标签 |
| Tab 标签 | 10px | Medium | 底部导航(有文字时) |

---

## 间距体系

| 场景 | 值 |
|------|-----|
| 页面左右 padding | 16-20px |
| 卡片内 padding | 16-24px |
| 卡片间距 | 12-16px |
| 列表项间距 | 12px |
| 区块间距 | 16px |

---

## 圆角

| 场景 | 值 |
|------|-----|
| 标准卡片 | 16-20px |
| 用户卡片 | 24px |
| 搜索条 | 20px |
| 功能图标底 | 14px |
| 状态标签 | 4px |

---

## 适配关系

| 设计稿(px) | 小程序(rpx) | 换算 |
|-----------|------------|------|
| 375 | 750 | 1px = 2rpx |
| Status 44 | 88 | `--status-bar-height` |
| NavBar 44 | 88 | `--nav-bar-height` |
| TabBar 50 | 100 | + `safe-area-inset-bottom` |
| Content | auto | `flex:1` |

---

## 构建前检查清单

执行任何 `batch_edit` 插入前，逐项确认：

1. □ 此节点是否按钮？ → 查[按钮分类系统](#按钮分类系统)，按 A/B/C/D/E 固定 width/height
2. □ 此节点是否状态徽章？ → E 类：width:44, height:20, layout:vertical+CENTER+CENTER
3. □ 此容器是否含文本？ → `clipsContent: true` + 固定宽度
4. □ 是否 Content 区？ → **必须显式设置 `primaryAxisSizingMode: \"FIXED\"`**（`layoutGrow: 1` 与 `RESIZE_TO_FIT` 矛盾，会导致不填充）
5. □ 是否用了 `layoutGrow`？ → 删除，改用固定数值
6. □ 是否用了 `RESIZE_TO_FIT`？ → 按钮/Content 禁用，仅卡片内部可用
7. □ 同行多字段？ → 按比例分配固定 width，不用 layoutGrow

## 构建禁忌

- ❌ **严禁 `layoutPositioning: \"ABSOLUTE\"`**（破坏弹性盒子扩展性）
- ❌ 不要用 `layoutGrow: 1` 来实现等宽（TabBar/Tab/按钮均用固定 width）
- ❌ 不要用 `RESIZE_TO_FIT` 在按钮/状态徽章上（导致 100×100 膨胀）
- ❌ 不要在底部导航加文字
- ❌ 不要把 A/B 类提交按钮放在 Content 区域内（必须作为独立的底部操作栏）
- ❌ 不要用 `RESIZE_TO_FIT` 在 Content 区（会导致沉底失败）
- ❌ **表单输入框/文本域/所有文字容器必须 `clipsContent: true`**
- ❌ **文字内容不得超出容器宽度**（超出部分会被 `clipsContent` 裁切，视觉异常）
- ✅ 构建按钮前先查[按钮分类系统](#按钮分类系统)，确定 A/B/C/D/E 类型
- ✅ 状态徽章统一 E 类：44×20, VERTICAL+CENTER+CENTER, cornerRadius:4
- ✅ 同行多字段按比例分配宽度，不用 `layoutGrow`
- ✅ 渐变色 `gradientStops` 中 color 需含 `a: 1` 键
- ✅ Tab 选中指示条居中：`x:50`（125px 宽 Tab 中 24px 指示条）
