<template>
  <view class="page">
    <NavBar title="关于我们" :showBack="true" />
    <view class="content">
      <view class="logo-section">
        <view class="logo-box"><text class="logo-text">OA</text></view>
        <text class="app-name">智慧办公助手</text>
        <text class="version">v1.0.0</text>
      </view>
      <view class="section">
        <view class="info-item"><text class="info-label">产品定位</text><text class="info-value">轻量化办公 · 高效能协作</text></view>
        <view class="info-item"><text class="info-label">技术支持</text><text class="info-value">殇血轮回</text></view>
        <view class="info-item last"><text class="info-label">更新日期</text><text class="info-value">2026-06-01</text></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import NavBar from '@/components/nav-bar/nav-bar.vue'
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; padding: 24rpx; }
.logo-section { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0; }
.logo-box { width: 120rpx; height: 120rpx; background: linear-gradient(135deg, #2B6DE8, #5B8DEF); border-radius: 30rpx; display: flex; align-items: center; justify-content: center; }
.logo-text { font-size: 44rpx; font-weight: 700; color: #fff; }
.app-name { font-size: 34rpx; font-weight: 600; color: #333; margin-top: 20rpx; }
.version { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.info-item { padding: 24rpx 0; border-bottom: 1rpx solid #F5F5F5; display: flex; justify-content: space-between; }
.last { border-bottom: none; }
.info-label { font-size: 28rpx; color: #666; }
.info-value { font-size: 28rpx; color: #333; }
</style>
