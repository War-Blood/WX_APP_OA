# 小程序设计模式规范

> 基于 `pages/employee/report-edit/index.vue` 提炼，供后续页面开发复用。
> 颜色/间距/字号令牌定义于 `miniapp/src/uni.scss`。

---

## 1. 页面结构

```
.page (flex column, 100vh, bg $bg-color #F7F7F7)
  ├── NavBar（:showBack / 右插槽）
  ├── [状态提示条]（today-status-bar / warning-bar）  ← 可选
  ├── [Tab 切换栏]（.type-tab-bar）
  ├── .content-scroll（flex:1, height:0, padding 0 $spacing-base）
  │   ├── .section-card × N（卡片列表）
  │   └── .bottom-placeholder（40-120rpx 底部留白）
  └── .bottom-bar（fixed, safe-area-inset-bottom）
```

## 2. Tab 切换

```scss
.tab-bar {
  display: flex;
  margin: $spacing-sm $spacing-base;  // 16rpx 24rpx
  background: $bg-card;
  border-radius: $radius-base;        // 12rpx
  padding: 6rpx;
}
.tab-item { flex:1; text-align:center; padding:16rpx 0; border-radius:10rpx; }
.tab-active { background: $primary-color; }  // #2B6DE8
.tab-active .tab-text { color: #FFFFFF; }
```

## 3. 卡片模式

| 属性 | 值 | 变量 |
|------|----|------|
| background | `#FFFFFF` | `$bg-card` |
| border-radius | `16rpx` | `$radius-lg` |
| padding | `24rpx` | `$spacing-base` |
| margin-bottom | `20rpx`（编辑页）/ `24rpx`（详情页） | — |
| box-shadow | `0 2rpx 12rpx rgba(0,0,0,0.04)` | — |

```scss
.section-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-base;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 20rpx;
  display: block;
}
```

## 4. 表单模式

| 元素 | background | border-radius | height | font-size |
|------|-----------|---------------|--------|-----------|
| `.form-input` | `$bg-form` #F7F8FA | `$radius-base` 12rpx | `72rpx` | `$font-base` 28rpx |
| `.form-picker` | `$bg-form` | `$radius-base` | `72rpx` | `$font-base` |
| `.form-textarea` | `$bg-form` | `$radius-base` | min `144rpx` | `$font-base` |

```scss
.form-label {
  font-size: 26rpx;
  color: $text-regular;
  font-weight: 500;
  margin-bottom: 12rpx;
  display: block;
}
.form-input {
  height: 72rpx;
  padding: 0 20rpx;
  background: $bg-form;
  border-radius: $radius-base;
  font-size: $font-base;
  color: $text-primary;
  width: 100%;
  box-sizing: border-box;
}
.form-picker {
  height: 72rpx;
  padding: 0 20rpx;
  background: $bg-form;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

## 5. 状态标签/徽章体系

**统一规则**：背景用浅色、文字用对应深色，徽章用 `padding: 4rpx 12rpx; border-radius: $radius-sm; font-size: $font-xs; font-weight: 500`。

| 状态 | 背景色 | 文字色 | CSS 类示例 |
|------|--------|--------|-----------|
| 公出日志 / 已提交 / 主色 | `#EDF2FF` | `#2B6DE8` | `.badge--submitted` / `.badge--office` |
| 审核中 / 补公出 / 警告 | `#FFF8E1` | `#F59E0B` | `.badge--supplement` |
| 已通过 / 公司日报 / 成功 | `#EFFDF5` | `#22C55E` | `.badge--success` |
| 已驳回 / 缺失 / 延迟 | `#FFF0F0` | `#EF4444` | `.badge--missing` |
| 被代填 | `#FFF0F5` | `#6366F1` | `.badge--substituted` |
| 请假 | `#F5F3FF` | `#8B5CF6` | `.badge--leave` |
| 调休 | `#FDF2F8` | `#EC4899` | `.badge--rest` |

```scss
// 在页面 scoped 样式中定义
.badge--submitted   { background: #EFFDF5; color: $success-color; }
.badge--supplement  { background: #FFF8E1; color: $warning-color; }
.badge--office      { background: $primary-bg; color: $primary-color; }
.badge--missing     { background: #FFF0F0; color: $danger-color; }
```

## 6. 底部操作栏

```scss
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 20rpx $spacing-base;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: $bg-card;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}
.btn-submit {
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, $primary-color, $primary-light);
  font-size: $font-lg;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}
.btn-submit:active { opacity: 0.9; }
```

## 7. 颜色令牌速查

| 令牌 | 值 | 用途 |
|------|----|------|
| `$primary-color` | `#2B6DE8` | 按钮、链接、Tab 激活、强调 |
| `$primary-light` | `#5B8DF0` | 按钮渐变 |
| `$primary-bg` | `#EDF2FF` | 标签背景、信息条 |
| `$success-color` | `#22C55E` | 成功/已通过 |
| `$warning-color` | `#F59E0B` | 警告/审核中 |
| `$danger-color` | `#EF4444` | 危险/已驳回/缺失 |
| `$info-color` | `#909399` | 信息/次要 |
| `$text-primary` | `#333333` | 标题、输入值 |
| `$text-regular` | `#666666` | 标签文本 |
| `$text-secondary` | `#999999` | 占位符、次要信息、字数统计 |
| `$text-placeholder` | `#C0C4CC` | 输入占位 |
| `$bg-color` | `#F7F7F7` | 页面背景 |
| `$bg-card` | `#FFFFFF` | 卡片/导航栏背景 |
| `$bg-form` | `#F7F8FA` | 输入框/选择器背景 |
| `$border-color` | `#E8E8E8` | 边框 |
| `$border-light` | `#F0F0F0` | 浅边框、进度条背景 |

## 8. 间距量表

| 令牌 | 值 | 场景 |
|------|----|------|
| `$spacing-xs` | `8rpx` | 标签间距、图标间隙 |
| `$spacing-sm` | `16rpx` | 卡片间隙、字段间距 |
| `$spacing-base` | `24rpx` | 页面内边距、卡片内边距 |
| `$spacing-lg` | `32rpx` | 弹窗头部内边距 |
| `$spacing-xl` | `48rpx` | Logo 区域间距 |

## 9. 字号量表

| 令牌 | 值 | 场景 |
|------|----|------|
| `$font-xs` | `22rpx` | 字数统计、辅助文本、徽章文本 |
| `$font-sm` | `24rpx` | 标签文本、元数据、状态描述 |
| `$font-base` | `28rpx` | 输入值、选择器文本、卡片标题 |
| `$font-lg` | `32rpx` | 提交按钮、弹窗标题、日期标题 |
| `$font-xl` | `36rpx` | 数字突出 |
| `$font-title` | `48rpx` | 页面大标题 |

## 10. 圆角量表

| 令牌 | 值 | 场景 |
|------|----|------|
| `$radius-sm` | `8rpx` | 标签、徽章、进度条 |
| `$radius-base` | `12rpx` | 输入框、选择器、Tab 栏 |
| `$radius-lg` | `16rpx` | 卡片、状态栏 |
| `$radius-xl` | `24rpx` | 大圆角容器 |
| `$radius-round` | `50%` | 圆形元素 |

## 11. 开发规范

1. **禁止内联样式**：颜色/间距/字号一律用 SCSS 变量或语义化 CSS 类，禁止 `style="color:#xxx"`
2. **颜色用变量**：`#FFFFFF` → `$bg-card`，`#333333` → `$text-primary`，`#999999` → `$text-secondary` 等
3. **徽章用修饰符**：`.badge--success` / `.badge--warning` 而非内联 `:style`
4. **数值颜色用类**：`.stat-value--primary` / `.stat-value--danger` 动态切换
5. **间距用变量**：`padding: $spacing-base` 而非 `padding: 24rpx`
6. **字号用变量**：`font-size: $font-base` 而非 `font-size: 28rpx`
7. **卡片统一**：一律用 `.section-card` 模式，不另起类名
8. **底部栏统一**：一律用 `.bottom-bar` + `env(safe-area-inset-bottom)`
