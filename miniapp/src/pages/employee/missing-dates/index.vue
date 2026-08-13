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
      <EmptyState
        v-else-if="list.length === 0"
        title="本月暂无未填写记录"
        description="未填写指出差期间未提交公出日志的日期"
      />
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
import EmptyState from '@/components/empty-state/index.vue'
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
@import '@/uni.scss';

.page {
  width: 100%;
  height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
}

.summary-bar {
  padding: $spacing-base;
  background: #FFF8E1;
  border-bottom: 1rpx solid $border-light;
}

.summary-text {
  font-size: $font-base;
  color: $warning-color;
  font-weight: 500;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: $spacing-base;
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
  color: $text-primary;
  font-weight: 500;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.person-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-base;
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
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
}

.person-code {
  font-size: $font-sm;
  color: $text-secondary;
}

.person-total {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.total-num {
  font-size: $font-xxl;
  font-weight: 700;
  color: $danger-color;
}

.total-label {
  font-size: $font-sm;
  color: $text-regular;
}

.project-line {
  margin-top: $spacing-sm;
  display: flex;
}

.project-label {
  font-size: $font-sm;
  color: $text-secondary;
}

.project-value {
  font-size: $font-sm;
  color: $text-primary;
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
  border-radius: $radius-sm;
  font-size: $font-sm;
  color: $danger-color;
}

.bottom-placeholder {
  height: 40rpx;
}
</style>
