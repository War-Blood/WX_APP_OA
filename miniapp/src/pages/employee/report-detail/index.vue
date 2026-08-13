<template>
  <view class="page">
    <nav-bar title="日报详情" :showBack="true" />

    <scroll-view class="content-scroll" scroll-y>
      <view v-if="loading" class="loading-wrap">
        <text class="loading-text">加载中...</text>
      </view>
      <template v-else-if="report">
        <!-- 头部卡片 -->
        <view class="header-card">
          <view class="header-row">
            <text class="header-date">{{ report.date || report.reportDate }}</text>
            <StatusTag :status="report.reportType === 'biz_trip_supplement' ? report.supplementStatus : report.status" />
          </view>
          <!-- 日志类型标签 -->
          <view class="header-tags">
            <StatusTag :status="report.reportType" />
            <!-- 补公出审核状态 -->
            <StatusTag v-if="report.reportType === 'biz_trip_supplement'" :status="report.supplementStatus" />
          </view>
          <text class="header-meta">提交时间：{{ report.submitTime || report.time || report.createdAt || report.createTime || '' }}</text>
        </view>

        <!-- 补公出审核结果卡片 -->
        <view v-if="report.reportType === 'biz_trip_supplement' && report.supplementStatus" class="review-card">
          <text class="card-title">审核结果</text>
          <view class="field-row">
            <text class="field-label">审核状态</text>
            <StatusTag :status="report.supplementStatus" />
          </view>
          <view v-if="report.supplementDate" class="field-row">
            <text class="field-label">补录日期</text>
            <text class="field-value">{{ report.supplementDate }}</text>
          </view>
          <view v-if="report.supplementReason" class="field-row">
            <text class="field-label">补录原因</text>
            <text class="field-value">{{ report.supplementReason }}</text>
          </view>
          <view v-if="report.reviewer" class="field-row">
            <text class="field-label">审核人</text>
            <text class="field-value">{{ report.reviewer }}</text>
          </view>
          <view v-if="report.reviewOpinion" class="field-row">
            <text class="field-label">审核意见</text>
            <text class="field-value">{{ report.reviewOpinion }}</text>
          </view>
          <view v-if="report.reviewTime" class="field-row">
            <text class="field-label">审核时间</text>
            <text class="field-value">{{ report.reviewTime }}</text>
          </view>
        </view>

        <!-- 项目信息（公出日志/补公出） -->
        <view v-if="report.reportType !== 'office'" class="field-card">
          <text class="card-title">项目信息</text>
          <view v-if="report.project" class="field-row">
            <text class="field-label">项目名称</text>
            <text class="field-value">{{ report.project }}</text>
          </view>
          <view v-if="report.area" class="field-row">
            <text class="field-label">项目区域</text>
            <text class="field-value">{{ report.area }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">工作类型</text>
            <text class="field-value field-value-accent">{{ report.todayWorkType || report.workType || '-' }}</text>
          </view>
          <view v-if="report.relatedParty" class="field-row">
            <text class="field-label">关联方</text>
            <text class="field-value">{{ report.relatedParty }}</text>
          </view>
          <view v-if="report.machineModel" class="field-row">
            <text class="field-label">机型</text>
            <text class="field-value">{{ report.machineModel }}</text>
          </view>
          <view v-if="report.workers || report.workerNames" class="field-row">
            <text class="field-label">作业人员</text>
            <text class="field-value">{{ report.workers || report.workerNames }}</text>
          </view>
          <view v-if="report.workerCount > 0" class="field-row">
            <text class="field-label">作业人数</text>
            <text class="field-value">{{ report.workerCount }}</text>
          </view>
        </view>

        <!-- 基本信息 -->
        <view v-if="report.entryDate || report.initialBizTripDate || report.personalBizTripDays > 0 || report.bizTripDays > 0 || report.timeliness" class="field-card">
          <text class="card-title">基本信息</text>
          <view v-if="report.entryDate" class="field-row">
            <text class="field-label">入场日期</text>
            <text class="field-value">{{ report.entryDate }}</text>
          </view>
          <view v-if="report.initialBizTripDate" class="field-row">
            <text class="field-label">初始出差日期</text>
            <text class="field-value">{{ report.initialBizTripDate }}</text>
          </view>
          <view v-if="report.personalBizTripDays > 0" class="field-row">
            <text class="field-label">个人出差天数</text>
            <text class="field-value">{{ report.personalBizTripDays }}</text>
          </view>
          <view v-if="report.bizTripDays > 0" class="field-row">
            <text class="field-label">项目出差天数</text>
            <text class="field-value">{{ report.bizTripDays }}</text>
          </view>
          <view v-if="report.timeliness" class="field-row">
            <text class="field-label">及时性</text>
            <text class="field-value" :class="{ 'reject-text': report.timeliness === 'delayed' }">{{ report.timeliness === 'delayed' ? '延迟' : report.timeliness === 'on_time' ? '正常' : report.timeliness }}</text>
          </view>
        </view>

        <!-- 工作量 -->
        <view v-if="report.reportType !== 'office' && (report.requiredQty > 0 || report.completedQty > 0)" class="field-card">
          <text class="card-title">工作量统计</text>
          <view class="field-row">
            <text class="field-label">需求数量</text>
            <text class="field-value">{{ report.requiredQty || 0 }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">完成数量</text>
            <text class="field-value">{{ report.completedQty || 0 }}</text>
          </view>
          <view v-if="progressPercent > 0" class="card-progress">
            <view class="progress-bar-bg">
              <view class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></view>
            </view>
            <text class="progress-pct">{{ progressPercent }}%</text>
          </view>
        </view>

        <!-- 今日工作 -->
        <view class="content-card">
          <text class="card-title">{{ report.reportType === 'office' ? '今日工作内容' : '今日工作小结' }}</text>
          <view class="card-text-content">{{ report.todayWork || report.workContent || '无工作内容' }}</view>
        </view>

        <!-- 明日计划 -->
        <view v-if="report.tomorrowPlan || report.tomorrowWorkType" class="content-card">
          <text class="card-title">明日计划</text>
          <view v-if="report.tomorrowWorkType" class="field-row" style="padding-top:0;">
            <text class="field-label">明日类型</text>
            <text class="field-value">{{ report.tomorrowWorkType }}</text>
          </view>
          <view v-if="report.tomorrowPlan" class="card-text-content">{{ report.tomorrowPlan }}</view>
        </view>

        <!-- 问题与协调（公司日报 + 公出日志） -->
        <view v-if="report.issues || report.coordination || report.content" class="content-card">
          <text class="card-title">其他事项</text>
          <view v-if="report.issues" style="margin-bottom:20rpx;">
            <text class="field-label" style="display:block;margin-bottom:8rpx;">遇到的问题</text>
            <text class="card-text-content">{{ report.issues }}</text>
          </view>
          <view v-if="report.coordination || report.content">
            <text class="field-label" style="display:block;margin-bottom:8rpx;">需协调事项</text>
            <text class="card-text-content">{{ report.coordination || report.content }}</text>
          </view>
        </view>

        <!-- 备注 -->
        <view v-if="report.remark" class="content-card">
          <text class="card-title">备注</text>
          <view class="card-text-content">{{ report.remark }}</view>
        </view>

        <!-- 原有审核卡片（非补公出类型） -->
        <view v-if="report.reportType !== 'biz_trip_supplement' && report.status !== 'pending' && report.reviewer" class="review-card">
          <text class="card-title">审核信息</text>
          <view class="field-row">
            <text class="field-label">审核状态</text>
            <StatusTag :status="report.status" />
          </view>
          <view class="field-row">
            <text class="field-label">审核人</text>
            <text class="field-value">{{ report.reviewer || '' }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">审核意见</text>
            <text class="field-value" :class="{ 'reject-text': report.status === 'rejected' }">{{ report.reviewOpinion || '无' }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">审核时间</text>
            <text class="field-value">{{ report.reviewTime || '' }}</text>
          </view>
        </view>

        <view class="bottom-placeholder"></view>
      </template>
    </scroll-view>

    <!-- 补公出审核操作栏 -->
    <view v-if="report?.reportType === 'biz_trip_supplement' && report?.status === 'pending_review'" class="bottom-bar supplement-bar">
      <view class="btn-reject" hover-class="btn-press" @tap="handleSupplementReject">
        <text class="btn-reject-text">驳回</text>
      </view>
      <view class="btn-approve" hover-class="btn-press" @tap="handleSupplementApprove">
        <text class="btn-approve-text">通过</text>
      </view>
    </view>
    <view v-if="report?.status === 'rejected'" class="bottom-bar">
      <view class="btn-revise" hover-class="btn-press" @tap="goToRevise">
        <text class="btn-revise-text">修改重提</text>
      </view>
    </view>
    <view v-if="isSubmitting" class="loading-overlay">
      <text class="loading-overlay-text">跳转中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import StatusTag from '@/components/status-tag/index.vue'
import { reportApi } from '@/services/modules/report'
import { showSuccess, showError, showToast } from '@/utils/toast'

const isSubmitting = ref(false)
const loading = ref(true)
const report = ref(null)
const reportId = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (currentPage.options && currentPage.options.id) {
    reportId.value = currentPage.options.id
    loadReportDetail()
  } else {
    loading.value = false
    showError('缺少参数')
  }
})

async function loadReportDetail() {
  loading.value = true
  try {
    const res = await reportApi.getDetail(reportId.value)
    report.value = res.data
  } catch {
    showError('加载失败')
  } finally {
    loading.value = false
  }
}

const progressPercent = computed(() => {
  if (!report.value) return 0
  if (report.value.progress !== undefined) return Number(report.value.progress)
  if (report.value.requiredQty > 0) {
    const pct = Math.round((report.value.completedQty / report.value.requiredQty) * 100)
    return Math.min(pct, 100)
  }
  return 0
})

async function goToRevise() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  if (!report.value) return
  uni.navigateTo({ url: '/pages/employee/rejected-edit/index?id=' + report.value.id })
  isSubmitting.value = false
}

async function handleSupplementApprove() {
  uni.showModal({
    title: '审核通过',
    content: '确认通过该补公出日志？',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      try {
        await reportApi.reviewSupplement({ reportId: report.value.id, decision: 'special' })
        showSuccess('已通过')
        report.value.status = 'special'
      } catch (e) {
        showError(e.message || '操作失败')
      }
    }
  })
}

async function handleSupplementReject() {
  uni.showModal({
    title: '驳回审核',
    content: '确认驳回该补公出日志？',
    success: async (modalRes) => {
      if (!modalRes.confirm) return
      try {
        await reportApi.reviewSupplement({ reportId: report.value.id, decision: 'forget' })
        showSuccess('已驳回')
        report.value.status = 'delayed'
      } catch (e) {
        showError(e.message || '操作失败')
      }
    }
  })
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

.content-scroll {
  flex: 1;
  height: 0;
  padding: $spacing-base;
}

.header-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-date {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 12rpx;
}

.header-meta {
  font-size: $font-sm;
  color: $text-secondary;
  margin-top: $spacing-sm;
  display: block;
}

.field-card,
.content-card,
.review-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
}

.card-title {
  font-size: $font-base;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 20rpx;
  display: block;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.field-row + .field-row {
  border-top: 1rpx solid $border-light;
}

.field-label {
  font-size: $font-sm;
  color: $text-regular;
  flex-shrink: 0;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-value {
  font-size: $font-sm;
  color: $text-primary;
  font-weight: 500;
  text-align: right;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: $spacing-sm;
}

.field-value-accent {
  color: $primary-color;
}

.reject-text {
  color: $danger-color;
}

.card-text-content {
  font-size: 26rpx;
  color: $text-primary;
  line-height: 44rpx;
  word-break: break-all;
  overflow-wrap: break-word;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-top: 20rpx;
}

.progress-bar-bg {
  flex: 1;
  height: 12rpx;
  background: $bg-form;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: $success-color;
  border-radius: 6rpx;
}

.progress-pct {
  font-size: $font-sm;
  font-weight: 600;
  color: $success-color;
  min-width: 72rpx;
  text-align: right;
}

.bottom-placeholder {
  height: 120rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx $spacing-base;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: $bg-card;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.btn-revise {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: $bg-card;
  border: 2rpx solid $danger-color;
}

.btn-revise:active {
  background: #FFF0F0;
}

.btn-revise-text {
  font-size: $font-lg;
  font-weight: 600;
  color: $danger-color;
  letter-spacing: 2rpx;
}

.btn-press {
  opacity: 0.85;
}

.supplement-bar {
  display: flex;
  gap: $spacing-base;
}

.btn-reject {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: $bg-card;
  border: 2rpx solid $danger-color;
}

.btn-reject:active {
  background: #FFF0F0;
}

.btn-reject-text {
  font-size: $font-lg;
  font-weight: 600;
  color: $danger-color;
  letter-spacing: 2rpx;
}

.btn-approve {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: linear-gradient(135deg, $primary-color, $primary-light);
}

.btn-approve:active {
  opacity: 0.9;
}

.btn-approve-text {
  font-size: $font-lg;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.loading-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-text {
  font-size: $font-base;
  color: $text-secondary;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-overlay-text {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>
