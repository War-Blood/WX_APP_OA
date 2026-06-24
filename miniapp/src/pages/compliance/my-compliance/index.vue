<template>
  <view class="compliance-page">
    <!-- 统计卡片 -->
    <view class="stats-card">
      <view class="stat-item">
        <text class="stat-value">{{ stats.onTimeCount }}</text>
        <text class="stat-label">准时提交</text>
      </view>
      <view class="stat-item">
        <text class="stat-value warning">{{ stats.delayedCount }}</text>
        <text class="stat-label">延迟提交</text>
      </view>
      <view class="stat-item">
        <text class="stat-value danger">{{ stats.missingCount }}</text>
        <text class="stat-label">缺失报告</text>
      </view>
    </view>
    
    <!-- 及时率展示 -->
    <view class="rate-card">
      <view class="rate-header">
        <text class="rate-title">本月及时率</text>
        <text class="rate-value">{{ stats.onTimeRate }}%</text>
      </view>
      <view class="rate-progress">
        <view class="progress-bar" :style="{ width: stats.onTimeRate + '%' }"></view>
      </view>
    </view>
    
    <!-- 合规记录列表 -->
    <scroll-view class="record-list" scroll-y @scrolltolower="loadMore">
      <view v-if="records.length === 0 && !isLoading" class="empty-state">
        <text class="empty-text">暂无合规记录</text>
      </view>
      
      <view v-for="item in records" :key="item.id" class="record-card">
        <view class="record-header">
          <text class="record-date">{{ formatDate(item.report_date) }}</text>
          <view class="timeliness-badge" :class="item.timeliness">
            {{ getTimelinessText(item.timeliness) }}
          </view>
        </view>
        <view class="record-info">
          <text class="info-item">项目: {{ item.project || item.dr_project || '未指定' }}</text>
          <text class="info-item">提交时间: {{ formatDateTime(item.submit_time) }}</text>
          <text class="info-item" v-if="item.is_auto_approved">✓ 自动审核通过</text>
          <text class="info-item pending" v-else>⏳ 待人工审核</text>
        </view>
      </view>
      
      <!-- 加载状态 -->
      <view v-if="isLoading" class="loading-more">加载中...</view>
      <view v-else-if="noMoreData && records.length > 0" class="no-more">— 没有更多了 —</view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { complianceApi } from '@/services/modules/compliance'

const stats = ref({
  month: '',
  totalReports: 0,
  onTimeCount: 0,
  delayedCount: 0,
  missingCount: 0,
  onTimeRate: 0
})

const records = ref([])
const isLoading = ref(false)
const noMoreData = ref(false)
const currentPage = ref(1)
const pageSize = 20

onMounted(() => {
  loadData()
})

async function loadData() {
  isLoading.value = true
  
  try {
    const res = await complianceApi.getMyCompliance()
    stats.value = res.data.stats || {}
    records.value = res.data.records || []
    noMoreData.value = true // 当前只加载一次,不分页
  } catch (err) {
    console.error('加载合规记录失败', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

function loadMore() {
  if (noMoreData.value || isLoading.value) return
  currentPage.value++
  loadData()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dateStr.substring(0, 10)
}

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return ''
  return dateTimeStr.replace('T', ' ').substring(0, 16)
}

function getTimelinessText(timeliness) {
  const map = {
    'on_time': '准时',
    'delayed': '延迟',
    'missing': '缺失'
  }
  return map[timeliness] || timeliness
}
</script>

<style lang="scss" scoped>
.compliance-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20rpx;
}

.stats-card {
  display: flex;
  justify-content: space-around;
  background: white;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12rpx;
    
    .stat-value {
      font-size: 48rpx;
      font-weight: 700;
      color: #4caf50;
      
      &.warning {
        color: #ff9800;
      }
      
      &.danger {
        color: #f44336;
      }
    }
    
    .stat-label {
      font-size: 24rpx;
      color: #666;
    }
  }
}

.rate-card {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
  
  .rate-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .rate-title {
      font-size: 28rpx;
      color: #333;
      font-weight: 600;
    }
    
    .rate-value {
      font-size: 36rpx;
      font-weight: 700;
      color: #4caf50;
    }
  }
  
  .rate-progress {
    height: 16rpx;
    background: #e0e0e0;
    border-radius: 8rpx;
    overflow: hidden;
    
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
      border-radius: 8rpx;
      transition: width 0.3s ease;
    }
  }
}

.record-list {
  height: calc(100vh - 400rpx);
  
  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 100rpx 0;
    
    .empty-text {
      font-size: 28rpx;
      color: #999;
    }
  }
  
  .record-card {
    background: white;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
    
    .record-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .record-date {
        font-size: 28rpx;
        color: #333;
        font-weight: 600;
      }
      
      .timeliness-badge {
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
        font-size: 22rpx;
        
        &.on_time {
          background: #e8f5e9;
          color: #4caf50;
        }
        
        &.delayed {
          background: #fff3e0;
          color: #ff9800;
        }
        
        &.missing {
          background: #ffebee;
          color: #f44336;
        }
      }
    }
    
    .record-info {
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .info-item {
        font-size: 24rpx;
        color: #666;
        
        &.pending {
          color: #ff9800;
        }
      }
    }
  }
}

.loading-more, .no-more {
  text-align: center;
  padding: 20rpx 0;
  font-size: 24rpx;
  color: #999;
}
</style>
