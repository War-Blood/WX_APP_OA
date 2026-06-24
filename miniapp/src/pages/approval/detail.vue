<template>
  <view class="page">
    <nav-bar title="审批详情" :showBack="true" />

    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <!-- Header card: type icon + title + applicant, 48×48 icon cornerRadius 12 -->
      <view class="header-card">
        <view class="header-left">
          <view class="header-icon" :style="{ backgroundColor: getTypeBg(detailData.type) }">
            <image class="header-icon-img" :src="getTypeIcon(detailData.type)" mode="aspectFit" />
          </view>
          <view class="header-info">
            <view class="header-type-badge" :style="{ backgroundColor: getTypeBg(detailData.type) }">
              <text class="header-type-text" :style="{ color: '#2B6DE8' }">{{ detailData.typeName || getTypeName(detailData.type) }}</text>
            </view>
            <text class="header-title">{{ detailData.title }}</text>
          </view>
        </view>
        <text class="header-number">{{ detailData.applyNo || 'NO.' + detailData.id }}</text>
      </view>

      <!-- Info fields card -->
      <view class="info-card">
        <view class="info-row">
          <text class="info-label">申请人</text>
          <text class="info-value">{{ detailData.applicant }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">申请时间</text>
          <text class="info-value">{{ detailData.applyTime }}</text>
        </view>
        <view v-if="detailData.status !== 'pending'" class="info-row">
          <text class="info-label">审批状态</text>
          <text class="info-value" :style="{ color: getStatusColor(detailData.status) }">{{ detailData.statusText }}</text>
        </view>
        <view v-if="detailData.department" class="info-row">
          <text class="info-label">所属部门</text>
          <text class="info-value">{{ detailData.department }}</text>
        </view>
      </view>

      <!-- Form fields card: shows all form fields -->
      <view v-if="formFields.length > 0" class="form-card">
        <text class="section-title">审批表单详情</text>
        <view class="form-rows">
          <view v-for="field in formFields" :key="field.label" class="form-row">
            <text class="form-label">{{ field.label }}</text>
            <text class="form-value">{{ field.value }}</text>
          </view>
        </view>
      </view>

      <!-- Timeline: vertical stepper -->
      <view class="timeline-card">
        <text class="section-title">审批进度</text>
        <view class="timeline">
          <view v-for="(item, index) in detailData.timeline" :key="index" class="timeline-item">
            <!-- Dot + line connector -->
            <view class="timeline-track">
              <view class="timeline-dot" :class="'dot-' + (item.status || 'pending')" />
              <view v-if="index < detailData.timeline.length - 1" class="timeline-line" :class="'line-' + (item.status || 'pending')" />
            </view>
            <!-- Content -->
            <view class="timeline-body">
              <text class="timeline-action">{{ item.action }}</text>
              <text class="timeline-operator">{{ item.operator }}</text>
              <text v-if="item.time" class="timeline-time">{{ item.time }}</text>
              <text v-if="item.remark" class="timeline-remark">{{ item.remark }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Bottom action bar: only shown for pending -->
    <view v-if="detailData.status === 'pending'" class="bottom-bar">
      <view class="btn-reject" hover-class="btn-reject-press" @tap="handleReject">
        <text class="btn-reject-text">驳回</text>
      </view>
      <view class="btn-approve" hover-class="btn-approve-press" @tap="handleApprove">
        <text class="btn-approve-text">通过</text>
      </view>
    </view>

    <loading-overlay :visible="isSubmitting" text="处理中..." />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import LoadingOverlay from '@/components/loading-overlay/index.vue'
import { approvalApi } from '@/services/modules/approval'

const userStore = useUserStore()

const isSubmitting = ref(false)
const isLoading = ref(true)
const approvalId = ref('')

const detailData = ref({
  id: 0,
  type: 'general',
  typeName: '',
  title: '',
  applicant: '',
  applyTime: '',
  applyNo: '',
  department: '',
  status: 'pending',
  statusText: '待审批',
  formData: {},
  timeline: []
})

const props = defineProps({
  id: { type: [String, Number], default: '' }
})

onMounted(() => {
  if (!userStore.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  approvalId.value = props.id || ''
  if (!approvalId.value) {
    // Try from query params
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    approvalId.value = page?.options?.id || ''
  }
  loadDetail()
})

async function loadDetail() {
  isLoading.value = true
  try {
    const res = await approvalApi.getDetail(approvalId.value)
    if (res.data) {
      const d = res.data
      detailData.value = {
        id: d.id,
        type: d.type || 'general',
        typeName: d.typeName || '',
        title: d.title || '',
        applicant: d.applicant || '',
        applyTime: d.applyTime || d.createTime || '',
        applyNo: d.applyNo || '',
        department: d.department || '',
        status: d.status || 'pending',
        statusText: d.statusText || getDefaultStatusText(d.status),
        formData: d.formData || {},
        timeline: d.timeline || []
      }
    }
  } catch (err) {
    console.error('加载审批详情失败', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

function getDefaultStatusText(status) {
  const map = { pending: '待审批', approved: '已通过', rejected: '已驳回' }
  return map[status] || '待审批'
}

const formFields = computed(() => {
  const fd = detailData.value.formData
  const type = detailData.value.type

  if (type === 'leave') {
    return [
      { label: '请假类型', value: fd.leaveType },
      { label: '开始时间', value: fd.startDate },
      { label: '结束时间', value: fd.endDate },
      { label: '请假天数', value: fd.days ? fd.days + '天' : '' },
      { label: '请假事由', value: fd.reason }
    ]
  }
  if (type === 'expense') {
    return [
      { label: '报销金额', value: fd.amount ? '¥' + fd.amount : '' },
      { label: '报销类别', value: fd.category },
      { label: '费用明细', value: fd.detail }
    ]
  }
  if (type === 'seal') {
    return [
      { label: '用章类型', value: fd.sealType },
      { label: '用章事由', value: fd.reason },
      { label: '用章数量', value: fd.count ? fd.count + '份' : '' }
    ]
  }
  if (type === 'travel') {
    return [
      { label: '出差地点', value: fd.destination },
      { label: '开始时间', value: fd.startDate },
      { label: '结束时间', value: fd.endDate },
      { label: '出差天数', value: fd.days ? fd.days + '天' : '' },
      { label: '出差事由', value: fd.reason }
    ]
  }
  if (type === 'purchase') {
    return [
      { label: '采购物品', value: fd.items },
      { label: '采购金额', value: fd.amount ? '¥' + fd.amount : '' },
      { label: '采购事由', value: fd.reason }
    ]
  }
  return fd.reason ? [{ label: '申请事由', value: fd.reason }] : []
})

// Type helpers
const typeIconMap = {
  leave: '/static/icons/feat-clock.svg',
  expense: '/static/icons/feat-cart.svg',
  seal: '/static/icons/feat-shield.svg',
  travel: '/static/icons/feat-book.svg',
  purchase: '/static/icons/feat-cart.svg',
  general: '/static/icons/feat-document.svg'
}

const typeBgMap = {
  leave: '#EDF2FF',
  expense: '#FFF3E0',
  seal: '#FCE4EC',
  travel: '#E8F5E9',
  purchase: '#F3E5F5',
  general: '#F5F5F5'
}

const typeNameMap = {
  leave: '请假',
  expense: '报销',
  seal: '售后',
  travel: '出差',
  purchase: '采购',
  general: '通用'
}

function getTypeIcon(type) {
  return typeIconMap[type] || typeIconMap.general
}

function getTypeBg(type) {
  return typeBgMap[type] || typeBgMap.general
}

function getTypeName(type) {
  return typeNameMap[type] || '通用'
}

function getStatusColor(status) {
  const map = { pending: '#F59E0B', approved: '#22C55E', rejected: '#EF4444' }
  return map[status] || '#F59E0B'
}

// Timeline helpers
function getTimelineDotColor(status) {
  if (status === 'completed' || status === 'current') return '#2B6DE8'
  return '#D0D5DD'
}

function getTimelineLineColor(status) {
  if (status === 'completed') return '#2B6DE8'
  return '#E8E8E8'
}

async function handleApprove() {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const res = await approvalApi.approve(approvalId.value, { action: 'approve' })
    if (res.code === 0) {
      detailData.value.status = 'approved'
      detailData.value.statusText = '已通过'
      detailData.value.timeline.push({
        action: '审批通过',
        operator: '我',
        time: new Date().toISOString().slice(0, 16).replace('T', ' '),
        status: 'completed'
      })
      uni.showToast({ title: '已通过', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 1000)
    } else {
      uni.showToast({ title: res.message || '操作失败', icon: 'none' })
    }
  } catch (err) {
    console.error('审批操作失败', err)
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

function handleReject() {
  if (isSubmitting.value) return
  uni.showModal({
    title: '驳回原因',
    content: '',
    editable: true,
    placeholderText: '请填写驳回原因',
    success: async (res) => {
      if (res.confirm && res.content) {
        isSubmitting.value = true
        try {
          const result = await approvalApi.approve(approvalId.value, {
            action: 'reject',
            remark: res.content
          })
          if (result.code === 0) {
            detailData.value.status = 'rejected'
            detailData.value.statusText = '已驳回'
            detailData.value.timeline.push({
              action: '审批驳回',
              operator: '我',
              time: new Date().toISOString().slice(0, 16).replace('T', ' '),
              status: 'completed',
              remark: res.content
            })
            uni.showToast({ title: '已驳回', icon: 'none' })
            setTimeout(() => uni.navigateBack(), 1000)
          } else {
            uni.showToast({ title: result.message || '操作失败', icon: 'none' })
          }
        } catch (err) {
          console.error('审批驳回失败', err)
          uni.showToast({ title: '操作失败', icon: 'none' })
        } finally {
          isSubmitting.value = false
        }
      } else if (res.confirm && !res.content) {
        uni.showToast({ title: '请填写驳回原因', icon: 'none' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F7F7F7;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
  padding-bottom: 180rpx;
}

/* Header card: 343×88px, white, cornerRadius 16 */
.header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
  min-width: 0;
}
.header-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.header-icon-img {
  width: 44rpx;
  height: 44rpx;
}
.header-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}
.header-type-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
}
.header-type-text {
  font-size: 22rpx;
  font-weight: 500;
}
.header-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.header-number {
  font-size: 20rpx;
  color: #B0B0B0;
  flex-shrink: 0;
}

/* Info card: white, key-value rows */
.info-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
}
.info-row + .info-row {
  border-top: 1rpx solid #F0F0F0;
}
.info-label {
  font-size: 26rpx;
  color: #666666;
}
.info-value {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
}

/* Form details card */
.form-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333333;
  margin-bottom: 24rpx;
  display: block;
}
.form-rows {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.form-row {
  display: flex;
  align-items: flex-start;
}
.form-label {
  width: 160rpx;
  font-size: 26rpx;
  color: #666666;
  flex-shrink: 0;
}
.form-value {
  flex: 1;
  font-size: 26rpx;
  color: #333333;
  text-align: right;
}

/* Timeline card */
.timeline-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.timeline {
  display: flex;
  flex-direction: column;
  padding-left: 4rpx;
}
.timeline-item {
  display: flex;
  gap: 24rpx;
}
.timeline-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20rpx;
  flex-shrink: 0;
  padding-top: 4rpx;
}
.timeline-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #D0D5DD;
}
.dot-current, .dot-completed {
  background: #2B6DE8;
}
.timeline-line {
  width: 2rpx;
  flex: 1;
  min-height: 48rpx;
  background: #E8E8E8;
}
.line-completed {
  background: #2B6DE8;
}
.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding-bottom: 32rpx;
  flex: 1;
}
.timeline-action {
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}
.timeline-operator {
  font-size: 24rpx;
  color: #666666;
}
.timeline-time {
  font-size: 22rpx;
  color: #B0B0B0;
}
.timeline-remark {
  font-size: 22rpx;
  color: #EF4444;
  margin-top: 4rpx;
}

/* Bottom action bar: B类 驳回 (330×88rpx) + A类 通过 (702×96rpx) */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #FFFFFF;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

/* B类: 165×44px → 330×88rpx */
.btn-reject {
  width: 330rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  border: 2rpx solid #EF4444;
  flex-shrink: 0;
}
.btn-reject-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #EF4444;
}
.btn-reject-press {
  background: #FFF0F0;
}

/* A类: 351×48px → 702×96rpx */
.btn-approve {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: #2B6DE8;
}
.btn-approve-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #FFFFFF;
}
.btn-approve-press {
  opacity: 0.9;
}
</style>
