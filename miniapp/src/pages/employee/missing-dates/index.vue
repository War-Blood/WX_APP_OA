<template>
  <view class="page">
    <nav-bar title="未填写明细" :showBack="true" />

    <view class="summary-bar">
      <text class="summary-text">{{ summaryText }}</text>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <view v-if="loading" class="state-wrap">
        <text class="state-text">加载中...</text>
      </view>
      <view v-else-if="list.length === 0" class="state-wrap">
        <text class="state-text">本月暂无未填写记录</text>
        <text class="state-desc">未填写指出差期间未提交公出日志的日期</text>
      </view>
      <view v-else class="list">
        <view v-for="item in list" :key="item.userId" class="person-card">
          <view class="person-header">
            <view class="person-info">
              <text class="person-name">{{ item.userName }}</text>
              <text v-if="item.workerCode" class="person-code">{{ item.workerCode }}</text>
            </view>
            <view class="person-total">
              <text class="total-num">{{ item.total }}</text>
              <text class="total-label">天未填写</text>
            </view>
          </view>
          <view v-if="item.project" class="project-line">
            <text class="project-label">项目：</text>
            <text class="project-value">{{ item.project }}</text>
          </view>
          <view class="date-tags">
            <text v-for="d in item.missingDates" :key="d" class="date-tag">{{ formatDate(d) }}</text>
          </view>
        </view>
      </view>
      <view class="bottom-placeholder"></view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { statsApi } from '@/services/modules/stats'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(true)
const list = ref([])
const month = ref('')

const summaryText = computed(() => {
  if (loading.value) return '正在查询...'
  const totalDays = list.value.reduce((sum, item) => sum + (item.total || 0), 0)
  if (userStore.isAdmin) {
    return `本月 ${list.value.length} 人共未填写 ${totalDays} 天`
  }
  return totalDays > 0 ? `本月您有 ${totalDays} 天未填写` : '本月暂无未填写记录'
})

onMounted(async () => {
  try {
    const res = await statsApi.getMissingDetails()
    const data = res.data || {}
    month.value = data.month || ''
    list.value = data.list || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
})

function formatDate(d) {
  return d ? d.slice(5) : ''
}
</script>

<style lang="scss" scoped>
.page {
  width: 100%;
  height: 100vh;
  background: #F5F5F5;
  display: flex;
  flex-direction: column;
}

.summary-bar {
  padding: 24rpx;
  background: #FFF8F0;
  border-bottom: 1rpx solid #F0E4D2;
}

.summary-text {
  font-size: 28rpx;
  color: #B26A00;
  font-weight: 500;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
}

.state-wrap {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.state-text {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.state-desc {
  font-size: 24rpx;
  color: #999;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.person-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.person-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.person-info {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.person-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.person-code {
  font-size: 24rpx;
  color: #999;
}

.person-total {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.total-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #EF4444;
}

.total-label {
  font-size: 24rpx;
  color: #666;
}

.project-line {
  margin-top: 16rpx;
  display: flex;
}

.project-label {
  font-size: 24rpx;
  color: #999;
}

.project-value {
  font-size: 24rpx;
  color: #333;
  flex: 1;
}

.date-tags {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.date-tag {
  padding: 8rpx 18rpx;
  background: #FFF0F0;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #EF4444;
}

.bottom-placeholder {
  height: 40rpx;
}
</style>
