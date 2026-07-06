<template>
  <view class="page">
    <nav-bar :title="editId ? '修改请假' : '请假申请'" :showBack="true" />
    <scroll-view class="content" scroll-y>
      <view class="card">
        <text class="card-title">请假信息</text>
        <view class="form-item">
          <text class="label">请假类型 <text class="required">*</text></text>
          <picker :value="leaveTypeIdx" :range="leaveTypes" @change="onTypeChange">
            <view class="picker">{{ form.leaveSubtype ? leaveTypes[leaveTypeIdx] : '请选择' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">开始日期 <text class="required">*</text></text>
          <picker mode="date" :value="form.startDate" :start="today" @change="onStartDate">
            <view class="picker">{{ form.startDate || '请选择' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">结束日期 <text class="required">*</text></text>
          <picker mode="date" :value="form.endDate" :start="form.startDate || today" @change="onEndDate">
            <view class="picker">{{ form.endDate || '请选择' }}</view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">请假天数</text>
          <text class="value days">{{ computedDays }} 天</text>
        </view>
        <view class="form-item">
          <text class="label">请假原因 <text class="required">*</text></text>
          <textarea v-model="form.reason" placeholder="请输入请假原因" :maxlength="500" />
        </view>
      </view>
      <view class="btn-area">
        <view class="btn-primary" :class="{ 'btn-disabled': submitting }" @tap="handleSubmit">
          <text class="btn-text">{{ submitting ? '提交中...' : (editId ? '保存修改' : '提交申请') }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'
import { showSuccess, showError, showToast } from '@/utils/toast'

const leaveTypes = ['年假', '事假', '病假', '婚假', '丧假', '其他']
const leaveTypeMap = { '年假': 'annual', '事假': 'personal', '病假': 'sick', '婚假': 'marriage', '丧假': 'funeral', '其他': 'other' }
const leaveTypeReverse = { annual: 0, personal: 1, sick: 2, marriage: 3, funeral: 4, other: 5 }
const leaveTypeIdx = ref(-1)
const today = new Date().toISOString().slice(0, 10)
const submitting = ref(false)
const editId = ref('')

const form = ref({ leaveSubtype: '', startDate: '', endDate: '', reason: '' })

onMounted(() => {
  const pages = getCurrentPages()
  const q = pages[pages.length - 1].options || pages[pages.length - 1].$route?.query || {}
  if (q.editId) {
    editId.value = q.editId
    form.value.leaveSubtype = q.type || ''
    form.value.startDate = q.start || ''
    form.value.endDate = q.end || ''
    form.value.reason = q.reason || ''
    if (q.type && leaveTypeReverse[q.type] !== undefined) {
      leaveTypeIdx.value = leaveTypeReverse[q.type]
    }
  }
})

const computedDays = computed(() => {
  if (!form.value.startDate || !form.value.endDate) return 0
  const diff = new Date(form.value.endDate) - new Date(form.value.startDate)
  return Math.round((diff / 86400000 + 1) * 10) / 10
})

function onTypeChange(e) {
  leaveTypeIdx.value = e.detail.value
  form.value.leaveSubtype = leaveTypeMap[leaveTypes[e.detail.value]]
}
function onStartDate(e) { form.value.startDate = e.detail.value }
function onEndDate(e) { form.value.endDate = e.detail.value }

async function handleSubmit() {
  if (!form.value.leaveSubtype) return showError('请选择请假类型')
  if (!form.value.startDate || !form.value.endDate) return showError('请选择日期')
  if (!form.value.reason) return showError('请输入请假原因')
  if (computedDays.value <= 0) return showError('结束日期不能早于开始日期')
  submitting.value = true
  try {
    if (editId.value) {
      await attendanceApi.updateLeave({ requestId: editId.value, ...form.value })
    } else {
      await attendanceApi.applyLeave(form.value)
    }
    showSuccess(editId.value ? '修改成功' : '提交成功')
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) {
    showError(e.message || '提交失败')
  } finally { submitting.value = false }
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F7F7F7; display: flex; flex-direction: column; }
.content { flex: 1; height: 0; padding: 24rpx; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; margin-bottom: 24rpx; }
.form-item { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-top: 1rpx solid #F0F0F0; }
.form-item:first-of-type { border-top: none; }
.label { font-size: 28rpx; color: #333; flex-shrink: 0; width: 160rpx; }
.required { color: #EF4444; }
.picker { font-size: 28rpx; color: #2B6DE8; text-align: right; }
.value { font-size: 28rpx; color: #333; text-align: right; }
.days { color: #2B6DE8; font-weight: 600; font-size: 32rpx; }
textarea { width: 320rpx; height: 120rpx; font-size: 26rpx; padding: 12rpx; background: #F7F7F7; border-radius: 8rpx; text-align: right; }
.btn-area { padding: 24rpx 0 48rpx; }
.btn-primary { height: 96rpx; display: flex; align-items: center; justify-content: center; border-radius: 48rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary:active { opacity: .9; }
.btn-disabled { opacity: .5; }
.btn-text { font-size: 32rpx; font-weight: 600; color: #FFF; letter-spacing: 2rpx; }
</style>
