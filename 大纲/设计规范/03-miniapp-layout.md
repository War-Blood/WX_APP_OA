# 03 — 小程序页面布局规范

## 页面结构

```
┌──────────────────────────────┐
│  nav-bar (title + back)       │  ← 自定义导航栏
├──────────────────────────────┤
│                              │
│  内容区 (scroll-view)          │  ← flex:1; padding:24rpx
│                              │
│  padding-bottom 留出底部空间   │
│                              │
├──────────────────────────────┤
│  bottom-bar (fixed)           │  ← 操作按钮必须置底
│  16rpx gap / 20rpx 24rpx pad │
│  safe-area-inset-bottom       │
└──────────────────────────────┘
```

## 核心规则

### 1. 按钮置底（强制 🔴）

**所有操作按钮必须 `position: fixed; bottom: 0`。禁止放在 content 内。**

```scss
.bottom-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
  display: flex;
  gap: 16rpx;
  z-index: 100;
}

// 内容区需留空白底空间
.content {
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}
```

### 2. 按钮样式

```scss
.btn-primary { flex:1; height:88rpx; display:flex; align-items:center; justify-content:center; border-radius:44rpx; background:linear-gradient(135deg,#2B6DE8,#4A8AF4); font-size:28rpx; font-weight:600; color:#FFF; }
.btn-outline { flex:1; height:88rpx; display:flex; align-items:center; justify-content:center; border-radius:44rpx; border:2rpx solid #E4E7ED; font-size:28rpx; color:#666; }
.btn-danger  { flex:1; height:88rpx; display:flex; align-items:center; justify-content:center; border-radius:44rpx; background:#EF4444; font-size:28rpx; font-weight:600; color:#FFF; }
```

### 3. 页面骨架模板

```vue
<template>
  <view class="page">
    <nav-bar title="页面标题" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <!-- 内容区 -->
    </scroll-view>
    <view class="bottom-bar">
      <view class="btn-primary" @tap="handleAction"><text>操作按钮</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { showError, showSuccess } from '@/utils/toast'
// ...
</script>

<style lang="scss" scoped>
.page { width:100%; height:100vh; background:#F7F7F7; display:flex; flex-direction:column; }
.content { flex:1; height:0; padding:24rpx; padding-bottom:calc(140rpx+env(safe-area-inset-bottom)); }
.bottom-bar { position:fixed; bottom:0; left:0; right:0; padding:20rpx 24rpx; padding-bottom:calc(20rpx+env(safe-area-inset-bottom)); background:#FFF; box-shadow:0 -2rpx 12rpx rgba(0,0,0,.04); display:flex; gap:16rpx; }
</style>
```

### 4. 生命周期

```js
// onShow — 从 @dcloudio/uni-app 导入，非 vue
import { onShow } from '@dcloudio/uni-app'
// ref, computed, onMounted — 从 vue 导入
import { ref, computed } from 'vue'
```

### 5. 卡片规范

```scss
.card { background:#FFF; border-radius:16rpx; padding:24rpx; margin-bottom:24rpx; box-shadow:0 2rpx 12rpx rgba(0,0,0,.04); }
.card-title { font-size:28rpx; font-weight:600; color:#333; display:block; margin-bottom:16rpx; }
```

### 6. 空态

```html
<view v-else class="empty">暂无数据</view>
<!-- .empty { text-align:center; padding:120rpx 0; font-size:28rpx; color:#999; } -->
```

### 7. pages.json 注册

```json
{
  "path": "pages/xxx/index",
  "style": {
    "navigationBarTitleText": "页面标题",
    "navigationStyle": "custom",
    "componentPlaceholder": { "nav-bar": "view" }
  }
}
```
