<template>
  <view class="page">
    <NavBar title="昨日工作一览" :showBack="true" />

    <!-- 日期选择 + 导航 -->
    <view class="date-bar">
      <view class="date-nav-btn" @tap="prevDay"><text class="date-nav-icon">‹</text></view>
      <picker mode="date" :value="currentDate" :end="todayStr" @change="onDateChange">
        <view class="date-picker">
          <text class="date-text">{{ displayDate }}</text>
          <text class="date-arrow">▾</text>
        </view>
      </picker>
      <view class="date-nav-btn" :class="{ 'date-nav-disabled': isToday }" @tap="nextDay">
        <text class="date-nav-icon">›</text>
      </view>
    </view>

    <!-- 加载 / 列表 -->
    <view v-if="loading || response" class="daily-panel-wrap">
      <DailyStatusPanel
        class="daily-panel-fill"
        :response="response"
        :loading="loading"
        :show-total="false"
        :refreshing="refreshing"
        @go-detail="goToDetail"
        @refresherrefresh="onRefresh"
      />
    </view>

    <!-- 空状态 -->
    <EmptyState v-else title="暂无数据" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import DailyStatusPanel from '@/components/daily-status-panel/index.vue'
import EmptyState from '@/components/empty-state/index.vue'
import { reportApi } from '@/services/modules/report'

// 工具函数
function formatToday() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 状态
const todayStr = ref(formatToday())
const currentDate = ref(yesterday())
const loading = ref(false)
const refreshing = ref(false)
const response = ref(null)

function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 计算属性
const isToday = computed(() => currentDate.value === todayStr.value)

const displayDate = computed(() => {
  const today = formatToday()
  const yesterdayStr = yesterday()
  if (currentDate.value === today) return '今天 ' + currentDate.value
  if (currentDate.value === yesterdayStr) return '昨天 ' + currentDate.value
  return currentDate.value
})

// 数据加载
async function loadData() {
  loading.value = true
  try {
    const res = await reportApi.getDailyStatus({ date: currentDate.value })
    if (res.code === 0 && res.data) {
      response.value = res.data
    }
  } catch {
    response.value = null
  } finally {
    loading.value = false
  }
}

// 事件
function prevDay() {
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() - 1)
  currentDate.value = d.toISOString().slice(0, 10)
  loadData()
}

function nextDay() {
  if (isToday.value) return
  const d = new Date(currentDate.value)
  d.setDate(d.getDate() + 1)
  currentDate.value = d.toISOString().slice(0, 10)
  loadData()
}

function onDateChange(e) {
  currentDate.value = e.detail.value
  loadData()
}

async function onRefresh() {
  refreshing.value = true
  await loadData()
  refreshing.value = false
}

function goToDetail(worker) {
  if (worker.reportId) {
    uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + worker.reportId })
  }
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

// ===== 页面布局 =====
.page {
  width: 100%;
  height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
}

// ===== 日期导航 =====
.date-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-base;
  background: $bg-card;
  flex-shrink: 0;
}
.date-nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F7F8FA;
  border-radius: $radius-base;
}
.date-nav-btn:active { background: #EBEDF0; }
.date-nav-icon {
  font-size: 40rpx;
  color: $text-regular;
  line-height: 1;
}
.date-nav-disabled {
  opacity: 0.3;
}
.date-picker {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: #F7F8FA;
  border-radius: $radius-base;
  min-width: 280rpx;
  justify-content: center;
}
.date-text {
  font-size: $font-base;
  color: $text-primary;
  font-weight: 500;
}
.date-arrow {
  font-size: 24rpx;
  color: $text-secondary;
}

// ===== 面板容器 =====
.daily-panel-wrap {
  flex: 1;
  height: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
// 自定义组件宿主参与 flex 高度链（uni-app 自定义组件在 flex 布局中的标准兼容，class 落到宿主节点）
.daily-panel-fill {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 0;
  min-height: 0;
}
</style>
