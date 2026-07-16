# 小程序 Icon 索引

> 所有 icon 统一存放在 `miniapp/image/`，方便直接替换修改。
> 尺寸规范：功能图标 48×48px / Tab 图标 48×48px / 导航图标 32×32px

---

## 功能中心图标 (`feat-*.svg`)

| 文件 | 模块 | 引用位置 |
|------|------|---------|
| `feat-clipboard.svg` | 审批管理 | `pages/features/index.vue` |
| `feat-document.svg` | 公出日志 | `pages/features/index.vue` |
| `feat-folder.svg` | 日报历史 | `pages/features/index.vue` |
| `feat-shield.svg` | 审核管理/合规 | `pages/features/index.vue` |
| `feat-bell.svg` | 消息中心 | `pages/features/index.vue` |
| `feat-chart.svg` | 公出统计 | `pages/features/index.vue` |
| `feat-clock.svg` | 考勤打卡 | `pages/features/index.vue` |
| `feat-edit.svg` | 在线考试 | `pages/features/index.vue` |
| `feat-users.svg` | 用户（预留） | — |
| `feat-grid.svg` | 默认图标 | `pages/features/index.vue` |
| `feat-book.svg` | 预留 | — |
| `feat-cart.svg` | 预留 | — |
| `feat-gear.svg` | 预留 | — |

## 快捷入口图标 (`quick-*.svg`)

| 文件 | 用途 | 引用位置 |
|------|------|---------|
| `quick-bell.svg` | 通知 | `pages/home/index.vue` |
| `quick-check.svg` | 审批 | `pages/home/index.vue` |
| `quick-clipboard.svg` | 日报 | `pages/home/index.vue` |
| `quick-clock.svg` | 考勤 | `pages/home/index.vue` |
| `quick-document.svg` | 文件 | `pages/home/index.vue` |

## Tab 图标 (`tab-*.svg`)

| 文件 | 用途 |
|------|------|
| `tab-home.svg` / `tab-home-active.svg` | 首页 Tab |
| `tab-features.svg` / `tab-features-active.svg` | 功能 Tab |
| `tab-profile.svg` / `tab-profile-active.svg` | 我的 Tab |

## 导航图标

| 文件 | 用途 |
|------|------|
| `nav-back.svg` | 返回箭头 |

## 设置图标 (`set-*.svg`)

| 文件 | 用途 |
|------|------|
| `set-notification.svg` | 消息通知 |
| `set-shield.svg` | 账号安全 |
| `set-help.svg` | 帮助反馈 |
| `set-info.svg` | 关于我们 |
| `set-person.svg` | 个人设置 |

## 其他

| 文件 | 用途 |
|------|------|
| `invite.svg` | 邀请 |
| `edit.svg` | 考试/编辑（通用） |

## 修改指引

1. 找到对应 SVG 文件，直接替换内容
2. SVG 使用 `currentColor` 或硬编码色值（`#2B6DE8` 为主色）
3. 新增图标统一存放到 `miniapp/image/` 下
4. 在代码中引用路径为 `/static/icons/xxx.svg`（uni-app 自动映射 `static/` 目录）