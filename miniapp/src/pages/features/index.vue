<template>
  <view class="page">
    <NavBar title="功能中心" />
    <scroll-view class="content" scroll-y>
      <view class="section" v-for="group in featureGroups" :key="group.name">
        <view class="group-card">
          <view class="group-header">
            <view class="group-bar" />
            <text class="group-title">{{ group.name }}</text>
          </view>
          <view class="group-grid">
            <view
              v-for="item in group.items"
              :key="item.label"
              class="feature-item"
              hover-class="feature-item-hover"
              :hover-stay-time="100"
              @tap="goToFeature(item.route)"
            >
              <view class="feature-icon" :style="{ backgroundColor: item.bg }">
                <image class="feature-icon-img" :src="item.iconSrc" mode="aspectFit" />
              </view>
              <text class="feature-label">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    <TabBar activeTab="features" />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import TabBar from '@/components/tab-bar/tab-bar.vue'

const appStore = useAppStore()
const ICON = '/static/icons/feat-'

// 模块 key → 图标及背景色映射
const iconConfig = {
  approval: { iconSrc: ICON + 'clipboard.svg', bg: '#EDF2FF' },
  report: { iconSrc: ICON + 'document.svg', bg: '#F0FDF4' },
  report_history: { iconSrc: ICON + 'folder.svg', bg: '#E8F4FD' },
  review: { iconSrc: ICON + 'shield.svg', bg: '#E6F7FF' },
  message: { iconSrc: ICON + 'bell.svg', bg: '#F3E8FF' },
  compliance: { iconSrc: ICON + 'shield.svg', bg: '#FFF0F0' },
  stats: { iconSrc: ICON + 'chart.svg', bg: '#FEF3E2' }
}

// 模块 key → 所属分组
const groupConfig = {
  approval: '办公协作',
  report: '办公协作',
  report_history: '办公协作',
  review: '办公协作',
  compliance: '办公协作',
  message: '信息中心',
  stats: '信息中心'
}

// 默认图标配置（新模块未配置时使用）
const defaultIcon = { iconSrc: ICON + 'grid.svg', bg: '#FAFAFA' }
const defaultGroup = '办公协作'

const featureGroups = computed(() => {
  const groups = {}
  const visibleModules = appStore.modules
    .filter(m => m.visible !== false)
    .sort((a, b) => (a.sort || 99) - (b.sort || 99))

  visibleModules.forEach(m => {
    const group = groupConfig[m.key] || defaultGroup
    if (!groups[group]) groups[group] = []
    const icon = iconConfig[m.key] || defaultIcon
    groups[group].push({
      label: m.name,
      iconSrc: icon.iconSrc,
      bg: icon.bg,
      route: m.route || ''
    })
  })

  return Object.entries(groups).map(([name, items]) => ({ name, items }))
})

function goToFeature(route) {
  if (route) uni.navigateTo({ url: route })
}
</script>

<style lang="scss" scoped>
.page {
  width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; overflow: hidden;
}

.content { flex: 1; height: 0; padding: 24rpx; }

.section { margin-bottom: 32rpx; }
.section:last-child { margin-bottom: 0; }

.group-card {
  background: #FFFFFF; border-radius: 40rpx; padding: 40rpx;
  box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.06);
}
.group-header { display: flex; align-items: center; gap: 20rpx; margin-bottom: 32rpx; }
.group-bar { width: 6rpx; height: 32rpx; background: #2B6DE8; border-radius: 4rpx; flex-shrink: 0; }
.group-title { font-size: 28rpx; font-weight: 600; color: #333333; }

.group-grid { display: flex; flex-wrap: wrap; }
.feature-item { width: 25%; display: flex; flex-direction: column; align-items: center; gap: 16rpx; margin-bottom: 24rpx; }
.feature-item:nth-child(n+5) { margin-bottom: 0; }
.feature-icon { width: 96rpx; height: 96rpx; border-radius: 28rpx; display: flex; align-items: center; justify-content: center; }
.feature-icon-img { width: 48rpx; height: 48rpx; }
.feature-label { font-size: 22rpx; color: #666666; text-align: center; }
</style>
