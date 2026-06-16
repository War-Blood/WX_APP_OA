<template>
  <view class="page">
    <NavBar title="账号安全" />
    <view class="content">
      <view class="section">
        <view class="setting-item" @tap="changePassword">
          <text class="label">修改密码</text>
          <text class="arrow">›</text>
        </view>
        <view class="setting-item last">
          <text class="label">登录设备管理</text>
          <text class="desc">当前设备：微信小程序</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import NavBar from '@/components/nav-bar/nav-bar.vue'

function changePassword() {
  uni.showModal({
    title: '修改密码',
    content: '请联系管理员在Web后台重置密码',
    showCancel: false,
    confirmText: '我知道了'
  })
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; padding: 24rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 0 24rpx; }
.setting-item { display: flex; align-items: center; padding: 28rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.last { border-bottom: none; }
.label { font-size: 28rpx; color: #333; flex: 1; }
.desc { font-size: 24rpx; color: #999; margin-right: 8rpx; }
.arrow { font-size: 32rpx; color: #C0C4CC; }
</style>
