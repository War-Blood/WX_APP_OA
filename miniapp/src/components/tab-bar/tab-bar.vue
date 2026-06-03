<template>
  <view class="tab-bar">
    <view
      v-for="tab in tabList"
      :key="tab.key"
      class="tab-item"
      @tap="switchTab(tab.key)"
    >
      <image :src="tab.icon" class="tab-icon" mode="aspectFit" />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activeTab: {
    type: String,
    required: true,
    validator: (value) => ['home', 'features', 'profile'].includes(value)
  }
})

const emit = defineEmits(['change'])

const ICON_BASE = '/static/icons/'

const tabList = computed(() => {
  const active = props.activeTab
  return ['home', 'features', 'profile'].map((key) => ({
    key,
    icon: `${ICON_BASE}tab-${key}${key === active ? '-active' : ''}.svg`
  }))
})

function switchTab(key) {
  if (key === props.activeTab) return
  emit('change', key)
  const pages = { home: '/pages/home/index', features: '/pages/features/index', profile: '/pages/profile/index' }
  uni.switchTab({ url: pages[key] })
}
</script>

<style scoped>
.tab-bar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 100rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #F0F0F0;
  padding-bottom: env(safe-area-inset-bottom);
  flex-shrink: 0;
}
.tab-item {
  width: 250rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tab-icon {
  width: 56rpx;
  height: 56rpx;
}
</style>
