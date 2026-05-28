<template>
  <view class="tab-bar" role="navigation" aria-label="底部导航">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      :class="['tab-item', { 'tab-item-active': activeTab === tab.key }]"
      @tap="switchTab(tab.key)"
      role="button"
      :aria-label="tab.label"
      :aria-current="activeTab === tab.key ? 'page' : undefined"
    >
      <Home
        v-if="tab.key === 'home'"
        :theme="activeTab === 'home' ? 'filled' : 'outline'"
        size="24"
        :fill="activeTab === 'home' ? '#2B6DE8' : '#999999'"
      />
      <AllApplication
        v-if="tab.key === 'features'"
        :theme="activeTab === 'features' ? 'filled' : 'outline'"
        size="24"
        :fill="activeTab === 'features' ? '#2B6DE8' : '#999999'"
      />
      <User
        v-if="tab.key === 'profile'"
        :theme="activeTab === 'profile' ? 'filled' : 'outline'"
        size="24"
        :fill="activeTab === 'profile' ? '#2B6DE8' : '#999999'"
      />
      <text :class="['tab-text', { 'tab-text-active': activeTab === tab.key }]">
        {{ tab.label }}
      </text>
    </view>
  </view>
</template>

<script setup>
import { Home, AllApplication, User } from '@icon-park/vue-next'

const props = defineProps({
  activeTab: {
    type: String,
    required: true,
    validator: (value) => ['home', 'features', 'profile'].includes(value)
  }
})

const tabs = [
  { key: 'home', label: '首页', route: '/pages/home/index' },
  { key: 'features', label: '功能', route: '/pages/features/index' },
  { key: 'profile', label: '我的', route: '/pages/profile/index' }
]

function switchTab(tabKey) {
  if (tabKey === props.activeTab) {
    return
  }

  const targetRoute = tabs.find(tab => tab.key === tabKey)?.route
  if (targetRoute) {
    uni.redirectTo({ url: targetRoute })
  }
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 112rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #F0F0F0;
  padding-bottom: env(safe-area-inset-bottom);
  flex-shrink: 0;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex: 1;
  height: 100%;
  transition: all 0.2s ease;
}

.tab-item:active {
  opacity: 0.7;
}

.tab-text {
  font-size: 22rpx;
  color: #999999;
  line-height: 1;
}

.tab-text-active {
  color: #2B6DE8;
  font-weight: 500;
}
</style>
