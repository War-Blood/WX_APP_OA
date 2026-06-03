<template>
  <view class="page">
    <NavBar title="帮助反馈" />
    <view class="content">
      <view class="section">
        <text class="section-title">常见问题</text>
        <view class="faq-item"><text class="faq-q">如何提交日报？</text><text class="faq-a">点击工作台「公出日志」或底部「功能」→「公出日志」，填写项目信息后提交。</text></view>
        <view class="faq-item"><text class="faq-q">日报审核流程？</text><text class="faq-a">提交后自动进入「待审核」状态，管理员审核通过后显示「已通过」。</text></view>
        <view class="faq-item last"><text class="faq-q">如何联系管理员？</text><text class="faq-a">请通过企业微信联系系统管理员。</text></view>
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
.section { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; margin-bottom: 20rpx; }
.faq-item { padding: 20rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.last { border-bottom: none; }
.faq-q { font-size: 28rpx; color: #2B6DE8; display: block; margin-bottom: 8rpx; }
.faq-a { font-size: 26rpx; color: #666; line-height: 1.6; }
</style>
