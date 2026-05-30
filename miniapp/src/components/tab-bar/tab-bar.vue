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
      <uni-icons
        v-if="tab.key === 'home'"
        :type="activeTab === 'home' ? 'home-filled' : 'home'"
        size="56"
        :color="activeTab === 'home' ? '#2B6DE8' : '#999999'"
      />
      <uni-icons
        v-if="tab.key === 'features'"
        :type="activeTab === 'features' ? 'grid-filled' : 'grid'"
        size="56"
        :color="activeTab === 'features' ? '#2B6DE8' : '#999999'"
      />
      <uni-icons
        v-if="tab.key === 'profile'"
        :type="activeTab === 'profile' ? 'person-filled' : 'person'"
        size="56"
        :color="activeTab === 'profile' ? '#2B6DE8' : '#999999'"
      />
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  activeTab: {
    type: String,
    required: true,
    validator: (value) => ['home', 'features', 'profile'].includes(value)
  }
})

const emit = defineEmits(['change'])

const tabs = [
  { key: 'home', label: '首页', route: '/pages/home/index' },
  { key: 'features', label: '功能', route: '/pages/features/index' },
  { key: 'profile', label: '我的', route: '/pages/profile/index' }
]

function switchTab(tabKey) {
  if (tabKey === props.activeTab) {
    return
  }

  emit('change', tabKey)

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
  height: 100rpx;
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
  flex: 1;
  height: 100%;
  transition: all 0.2s ease;
}

.tab-item:active {
  opacity: 0.7;
}
</style>
