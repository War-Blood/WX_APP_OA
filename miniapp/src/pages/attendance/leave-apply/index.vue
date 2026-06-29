<template>
  <view class="page">
    <nav-bar title="请假申请" :showBack="true" />
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
          <text class="btn-text">{{ submitting ? '提交中...' : '提交申请' }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { attendanceApi } from '@/services/modules/attendance'

const leaveTypes = ['年假', '事假', '病假', '婚假', '丧假', '其他']
const leaveTypeMap = { '年假': 'annual', '事假': 'sick', '病假': 'personal', '婚假': 'marriage', '丧假': 'funeral', '其他': 'other' }
const leaveTypeIdx = ref(-1)
const today = new Date().toISOString().slice(0, 10)
const submitting = ref(false)

const form = ref({ leaveSubtype: '', startDate: '', endDate: '', reason: '' })

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
  if (!form.value.leaveSubtype) return uni.showToast({ title: '请选择请假类型', icon: 'none' })
  if (!form.value.startDate || !form.value.endDate) return uni.showToast({ title: '请选择日期', icon: 'none' })
  if (!form.value.reason) return uni.showToast({ title: '请输入请假原因', icon: 'none' })
  if (computedDays.value <= 0) return uni.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
  submitting.value = true
  try {
    await attendanceApi.applyLeave(form.value)
    uni.showToast({ title: '提交成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
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
