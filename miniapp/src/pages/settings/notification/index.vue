<template>
  <view class="page">
    <NavBar title="消息通知" />
    <view class="content">
      <view class="section">
        <view class="setting-item">
          <text class="label">审批通知</text>
          <switch :checked="settings.approval" @change="toggle('approval')" color="#2B6DE8" />
        </view>
        <view class="setting-item">
          <text class="label">日报提醒</text>
          <switch :checked="settings.report" @change="toggle('report')" color="#2B6DE8" />
        </view>
        <view class="setting-item last">
          <text class="label">系统通知</text>
          <switch :checked="settings.system" @change="toggle('system')" color="#2B6DE8" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'

const settings = ref({ approval: true, report: true, system: true })

onMounted(() => {
  try {
    const saved = uni.getStorageSync('notificationSettings')
    if (saved) settings.value = { ...settings.value, ...JSON.parse(saved) }
  } catch {}
})

function toggle(key) {
  settings.value[key] = !settings.value[key]
  uni.setStorageSync('notificationSettings', JSON.stringify(settings.value))
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; padding: 24rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 0 24rpx; }
.setting-item { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.last { border-bottom: none; }
.label { font-size: 28rpx; color: #333; }
</style>
