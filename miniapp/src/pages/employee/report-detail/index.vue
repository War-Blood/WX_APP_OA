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
            <view class="status-badge" :style="{ background: getStatusBg(report) }">
              <text class="status-badge-text" :style="{ color: getStatusColor(report) }">{{ getStatusText(report) }}</text>
            </view>
          </view>
          <!-- 日志类型标签 -->
          <view class="header-tags">
            <view class="type-tag" :style="{ background: getTypeBg(report.reportType) }">
              <text class="type-tag-text" :style="{ color: getTypeColor(report.reportType) }">
                {{ getTypeLabel(report.reportType) }}
              </text>
            </view>
            <!-- 补公出审核状态 -->
            <view v-if="report.reportType === 'biz_trip_supplement'" class="supplement-tag" :style="{ background: getSupplementBg(report.supplementStatus) }">
              <text class="supplement-tag-text" :style="{ color: getSupplementColor(report.supplementStatus) }">
                {{ getSupplementLabel(report.supplementStatus) }}
              </text>
            </view>
          </view>
          <text class="header-meta">提交时间：{{ report.submitTime || report.time || report.createdAt || report.createTime || '' }}</text>
        </view>

        <!-- 补公出审核结果卡片 -->
        <view v-if="report.reportType === 'biz_trip_supplement' && report.supplementStatus" class="review-card">
          <text class="card-title">审核结果</text>
          <view class="field-row">
            <text class="field-label">审核状态</text>
            <view class="status-badge" :style="{ background: getSupplementBg(report.supplementStatus) }">
              <text class="status-badge-text" :style="{ color: getSupplementColor(report.supplementStatus) }">
                {{ getSupplementLabel(report.supplementStatus) }}
              </text>
            </view>
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
            <view class="status-badge" :style="{ background: getStatusBg(report) }">
              <text class="status-badge-text" :style="{ color: getStatusColor(report) }">{{ getStatusText(report) }}</text>
            </view>
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

// ===== 日志类型 =====
function getTypeLabel(type) {
  const map = { biz_trip: '公出日志', biz_trip_supplement: '补公出日志', office: '工作日报' }
  return map[type] || type || '日报'
}

function getTypeBg(type) {
  const map = { biz_trip: '#EDF2FF', biz_trip_supplement: '#FFF8E1' }
  return map[type] || '#F5F5F5'
}

function getTypeColor(type) {
  const map = { biz_trip: '#2B6DE8', biz_trip_supplement: '#F59E0B' }
  return map[type] || '#999999'
}

// ===== 补公出审核状态 =====
function getSupplementLabel(status) {
  const map = { pending_review: '审核中', approved: '审核通过', delayed: '延迟标记', special: '通过(特殊)' }
  return map[status] || status || '待审核'
}

function getSupplementBg(status) {
  const map = { pending_review: '#FFF8E1', approved: '#EFFDF5', delayed: '#FFF0F0', special: '#EDF2FF' }
  return map[status] || '#F5F5F5'
}

function getSupplementColor(status) {
  const map = { pending_review: '#F59E0B', approved: '#22C55E', delayed: '#EF4444', special: '#2B6DE8' }
  return map[status] || '#999999'
}

// ===== 通用状态 =====
function getStatusText(report) {
  if (report.reportType === 'biz_trip_supplement') {
    return getSupplementLabel(report.supplementStatus)
  }
  const map = { approved: '已通过', pending: '待审核', rejected: '已驳回', draft: '草稿', submitted: '已提交', delayed: '延迟' }
  return map[report.status] || report.status || '未知'
}

function getStatusBg(report) {
  if (report.reportType === 'biz_trip_supplement') {
    return getSupplementBg(report.supplementStatus)
  }
  const map = { approved: '#EFFDF5', pending: '#FFF8F0', rejected: '#FFF0F0', draft: '#F5F5F5', submitted: '#EDF2FF', delayed: '#FFF0F0' }
  return map[report.status] || '#F5F5F5'
}

function getStatusColor(report) {
  if (report.reportType === 'biz_trip_supplement') {
    return getSupplementColor(report.supplementStatus)
  }
  const map = { approved: '#22C55E', pending: '#F59E0B', rejected: '#EF4444', draft: '#999999', submitted: '#2B6DE8', delayed: '#EF4444' }
  return map[report.status] || '#999999'
}

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
.page {
  width: 100%;
  height: 100vh;
  background: #F7F7F7;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
}

.header-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-date {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
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

.type-tag {
  height: 36rpx;
  padding: 0 14rpx;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-tag-text {
  font-size: 20rpx;
  font-weight: 500;
}

.supplement-tag {
  height: 36rpx;
  padding: 0 14rpx;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.supplement-tag-text {
  font-size: 20rpx;
  font-weight: 500;
}

.status-badge {
  height: 40rpx;
  padding: 0 16rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-badge-text {
  font-size: 20rpx;
  font-weight: 500;
}

.header-meta {
  font-size: 24rpx;
  color: #999999;
  margin-top: 16rpx;
  display: block;
}

.field-card,
.content-card,
.review-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
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
  border-top: 1rpx solid #F5F5F5;
}

.field-label {
  font-size: 24rpx;
  color: #666666;
  flex-shrink: 0;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-value {
  font-size: 24rpx;
  color: #333333;
  font-weight: 500;
  text-align: right;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 16rpx;
}

.field-value-accent {
  color: #2B6DE8;
}

.reject-text {
  color: #EF4444;
}

.card-text-content {
  font-size: 26rpx;
  color: #333333;
  line-height: 44rpx;
  word-break: break-all;
  overflow-wrap: break-word;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
}

.progress-bar-bg {
  flex: 1;
  height: 12rpx;
  background: #EFF2F5;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #22C55E;
  border-radius: 6rpx;
}

.progress-pct {
  font-size: 24rpx;
  font-weight: 600;
  color: #22C55E;
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
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.btn-revise {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: #FFFFFF;
  border: 2rpx solid #EF4444;
}

.btn-revise:active {
  background: #FFF5F5;
}

.btn-revise-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #EF4444;
  letter-spacing: 2rpx;
}

.btn-press {
  opacity: 0.85;
}

.supplement-bar {
  display: flex;
  gap: 24rpx;
}

.btn-reject {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: #FFFFFF;
  border: 2rpx solid #EF4444;
}

.btn-reject:active {
  background: #FFF5F5;
}

.btn-reject-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #EF4444;
  letter-spacing: 2rpx;
}

.btn-approve {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #2B6DE8, #4A8AF4);
}

.btn-approve:active {
  opacity: 0.9;
}

.btn-approve-text {
  font-size: 32rpx;
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
  font-size: 28rpx;
  color: #999999;
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
