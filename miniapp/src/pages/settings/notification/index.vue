<template>
  <view class="page">
    <NavBar title="消息通知" :showBack="true" />
    <view class="content">
      <view class="section">
        <view class="setting-item">
          <text class="label">审批通知</text>
          <switch :checked="settings.approval" @change="toggleLocal('approval')" color="#2B6DE8" />
        </view>
        <view class="setting-item">
          <text class="label">日报提醒</text>
          <switch :checked="settings.report" @change="toggleReport" color="#2B6DE8" />
        </view>
        <view class="setting-item last">
          <text class="label">系统通知</text>
          <switch :checked="settings.system" @change="toggleLocal('system')" color="#2B6DE8" />
        </view>
      </view>
      <view class="tip">日报提醒为微信一次性订阅：授权一次可收到一条服务通知；勾选"总是保持以上选择，不再询问"后不再弹窗，之后在小程序内点一下即续订。</view>
      <view class="tip-link" @tap="goOpenSetting">订阅消息修改 / 关闭 → 小程序设置 ›</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { statsApi } from '@/services/modules/stats'
import { showError } from '@/utils/toast'

const SUBSCRIBE_TEMPLATE_ID = 'VHg7c_RAaB1hu772YDtQllDOSDelBUR20h_PtDLxgKc'
const settings = ref({ approval: true, report: false, system: true })

onShow(async () => {
  try {
    const saved = uni.getStorageSync('notificationSettings')
    if (saved) settings.value = { ...settings.value, ...JSON.parse(saved) }
  } catch { /* */ }
  // 回显真实订阅状态
  try {
    const res = await statsApi.getSubscribeStatus()
    settings.value.report = !!res.data?.subscribed
  } catch { /* 忽略 */ }
})

function toggleLocal(key) {
  settings.value[key] = !settings.value[key]
  uni.setStorageSync('notificationSettings', JSON.stringify(settings.value))
}

// 打开小程序设置页(用户可在其中修改订阅消息授权)
function goOpenSetting() {
  uni.openSetting({
    fail: () => uni.showToast({ title: '请在微信右上角…→设置中修改', icon: 'none' }),
  })
}

async function toggleReport(e) {
  // 关闭: 一次性订阅无法手动撤销, 提示并保持真实状态
  if (!e.detail.value) {
    settings.value.report = true
    uni.showToast({ title: '日报提醒为一次性订阅，发送一条后自动失效，无需关闭', icon: 'none' })
    return
  }
  // 开启: 请求微信订阅授权 → 后端记录
  try {
    const res = await uni.requestSubscribeMessage({ tmplIds: [SUBSCRIBE_TEMPLATE_ID] })
    if (res[SUBSCRIBE_TEMPLATE_ID] === 'accept') {
      await statsApi.recordSubscribe([SUBSCRIBE_TEMPLATE_ID])
      settings.value.report = true
      uni.showToast({ title: '已开启日报提醒', icon: 'success' })
    } else {
      settings.value.report = false
    }
  } catch (err) {
    settings.value.report = false
    if (!err.errMsg?.includes('cancel')) showError('当前版本不支持订阅消息')
  }
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; padding: 24rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 0 24rpx; }
.setting-item { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.last { border-bottom: none; }
.label { font-size: 28rpx; color: #333; }
.tip { margin-top: 20rpx; padding: 0 8rpx; font-size: 24rpx; color: #909399; line-height: 1.6; }
.tip-link { margin-top: 16rpx; padding: 20rpx 8rpx; font-size: 26rpx; color: #2B6DE8; }
</style>
