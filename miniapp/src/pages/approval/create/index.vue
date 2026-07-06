<template>
  <view class="create-page">
    <nav-bar title="发起审批" :showBack="true" />

    <!-- Type selector: compact pill tags -->
    <view class="type-bar">
      <view
        v-for="type in approvalTypes"
        :key="type.key"
        class="type-pill"
        :class="{ 'type-pill-active': selectedType === type.key }"
        @tap="selectType(type.key)"
      >
        <text
          class="type-pill-text"
          :class="{ 'type-pill-text-active': selectedType === type.key }"
        >{{ type.label }}</text>
      </view>
    </view>

    <!-- Dynamic form card -->
    <scroll-view class="form-scroll" scroll-y :show-scrollbar="false">
      <!-- Form card -->
      <view class="form-card">
        <block v-for="field in currentFields" :key="field.key">
          <!-- Picker type -->
          <view v-if="field.type === 'picker'" class="form-item">
            <text class="form-label">{{ field.label }}</text>
            <view class="picker-wrap" @tap="handlePicker(field)">
              <text
                class="picker-val"
                :class="{ 'picker-placeholder': !formData[field.key] }"
              >{{ formData[field.key] || field.placeholder || '请选择' }}</text>
              <text class="picker-arrow">&gt;</text>
            </view>
          </view>

          <!-- Date picker -->
          <view v-if="field.type === 'date'" class="form-item">
            <text class="form-label">{{ field.label }}</text>
            <view class="picker-wrap" @tap="handleDatePicker(field)">
              <text
                class="picker-val"
                :class="{ 'picker-placeholder': !formData[field.key] }"
              >{{ formData[field.key] || field.placeholder || '请选择' }}</text>
              <text class="picker-arrow">&gt;</text>
            </view>
          </view>

          <!-- Input type -->
          <view v-if="field.type === 'input'" class="form-item">
            <text class="form-label">{{ field.label }}</text>
            <input
              class="form-input"
              :placeholder="field.placeholder || ''"
              :type="field.inputType || 'text'"
              v-model="formData[field.key]"
            />
          </view>

          <!-- Textarea type -->
          <view v-if="field.type === 'textarea'" class="form-item">
            <text class="form-label">{{ field.label }}</text>
            <view class="textarea-wrap">
              <textarea
                class="form-textarea"
                :placeholder="field.placeholder || ''"
                v-model="formData[field.key]"
                :maxlength="200"
              />
              <text class="textarea-count">{{ (formData[field.key] || '').length }}/200</text>
            </view>
          </view>

          <!-- Date row: start + end side by side -->
          <view v-if="field.type === 'daterow'" class="form-item">
            <text class="form-label">{{ field.label }}</text>
            <view class="double-row">
              <view class="picker-wrap half-picker" @tap="handleDatePicker(field.start)">
                <text
                  class="picker-val"
                  :class="{ 'picker-placeholder': !formData[field.start.key] }"
                >{{ formData[field.start.key] || field.start.placeholder || '开始' }}</text>
                <text class="picker-arrow">&gt;</text>
              </view>
              <view class="picker-wrap half-picker" @tap="handleDatePicker(field.end)">
                <text
                  class="picker-val"
                  :class="{ 'picker-placeholder': !formData[field.end.key] }"
                >{{ formData[field.end.key] || field.end.placeholder || '结束' }}</text>
                <text class="picker-arrow">&gt;</text>
              </view>
            </view>
          </view>

          <!-- Approver row: approver + cc side by side -->
          <view v-if="field.type === 'persons'" class="form-item">
            <text class="form-label">{{ field.label }}</text>
            <view class="double-row">
              <view class="picker-wrap half-picker" @tap="handlePersonPicker(field.approver)">
                <text
                  class="picker-val"
                  :class="{ 'picker-placeholder': !formData[field.approver.key] }"
                >{{ formData[field.approver.key] || field.approver.placeholder || '审批人' }}</text>
                <text class="picker-arrow">&gt;</text>
              </view>
              <view class="picker-wrap half-picker" @tap="handlePersonPicker(field.cc)">
                <text
                  class="picker-val"
                  :class="{ 'picker-placeholder': !formData[field.cc.key] }"
                >{{ formData[field.cc.key] || field.cc.placeholder || '抄送人' }}</text>
                <text class="picker-arrow">&gt;</text>
              </view>
            </view>
          </view>
        </block>
      </view>

      <!-- Bottom spacer for submit button -->
      <view style="height: 160rpx;" />
    </scroll-view>

    <!-- Bottom submit bar -->
    <view class="bottom-bar">
      <view class="submit-btn" hover-class="submit-btn-press" @tap="handleSubmit">
        <text class="submit-text">提交</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { approvalApi } from '@/services/modules/approval'
import { showSuccess, showError, showToast } from '@/utils/toast'

const selectedType = ref('leave')
const isSubmitting = ref(false)

const approvalTypes = [
  { key: 'leave', label: '请假' },
  { key: 'expense', label: '报销' },
  { key: 'material', label: '物料' },
]

const formData = ref(initFormData('leave'))

function initFormData(type) {
  const base = {
    approver: '',
    cc: '',
    remark: '',
  }
  switch (type) {
    case 'leave':
      return {
        ...base,
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: '',
      }
    case 'expense':
      return {
        ...base,
        expenseType: '',
        amount: '',
        date: '',
        description: '',
      }
    case 'material':
      return {
        ...base,
        itemName: '',
        itemSpec: '',
        quantity: '',
        purpose: '',
      }
    default:
      return base
  }
}

// Field definitions per type
const fieldConfigs = {
  leave: [
    { key: 'leaveType', label: '请假类型', type: 'picker', placeholder: '请选择请假类型', options: ['病假', '事假', '年假'] },
    { key: 'daterow', label: '时间范围', type: 'daterow',
      start: { key: 'startDate', placeholder: '开始时间' },
      end: { key: 'endDate', placeholder: '结束时间' },
    },
    { key: 'reason', label: '请假事由', type: 'textarea', placeholder: '请输入请假事由' },
    { key: 'persons', label: '审批设置', type: 'persons',
      approver: { key: 'approver', placeholder: '审批人' },
      cc: { key: 'cc', placeholder: '抄送人' },
    },
  ],
  expense: [
    { key: 'expenseType', label: '报销类型', type: 'picker', placeholder: '请选择报销类型', options: ['差旅费', '办公费', '招待费'] },
    { key: 'amount', label: '报销金额', type: 'input', placeholder: '请输入金额', inputType: 'digit' },
    { key: 'date', label: '报销日期', type: 'date', placeholder: '请选择日期' },
    { key: 'description', label: '费用明细', type: 'textarea', placeholder: '请输入费用明细' },
    { key: 'persons', label: '审批设置', type: 'persons',
      approver: { key: 'approver', placeholder: '审批人' },
      cc: { key: 'cc', placeholder: '抄送人' },
    },
  ],
  material: [
    { key: 'itemName', label: '物品名称', type: 'input', placeholder: '请输入物品名称' },
    { key: 'itemSpec', label: '规格型号', type: 'input', placeholder: '请输入规格型号' },
    { key: 'quantity', label: '数量', type: 'input', placeholder: '请输入数量', inputType: 'digit' },
    { key: 'purpose', label: '用途说明', type: 'textarea', placeholder: '请输入用途说明' },
    { key: 'persons', label: '审批设置', type: 'persons',
      approver: { key: 'approver', placeholder: '审批人' },
      cc: { key: 'cc', placeholder: '抄送人' },
    },
  ],
}

const currentFields = computed(() => fieldConfigs[selectedType.value] || [])

// Watch for date changes to calculate days
watch(
  () => [formData.value.startDate, formData.value.endDate],
  ([start, end]) => {
    if (start && end && start <= end) {
      const s = new Date(start.replace(/-/g, '/'))
      const e = new Date(end.replace(/-/g, '/'))
      const days = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1
      if (days > 0) {
        formData.value.leaveDays = days
      }
    }
  }
)

function selectType(key) {
  if (selectedType.value === key) return
  selectedType.value = key
  formData.value = initFormData(key)
}

function handlePicker(field) {
  const options = field.options || []
  uni.showActionSheet({
    itemList: options,
    success: (res) => {
      formData.value[field.key] = options[res.tapIndex]
    },
  })
}

function handleDatePicker(field) {
  uni.showModal({
    title: '选择日期',
    editable: true,
    placeholderText: '格式: 2026-05-30',
    success: (res) => {
      if (res.confirm && res.content) {
        formData.value[field.key] = res.content
      }
    },
  })
}

async function handlePersonPicker(field) {
  try {
    const res = await approvalApi.getApprovers()
    const users = res.data?.list || []
    if (!users.length) {
      showError('暂无可选审批人')
      return
    }
    const names = users.map(u => u.nickName || u.userName || '未知')
    uni.showActionSheet({
      itemList: names,
      success: (r) => {
        const user = users[r.tapIndex]
        formData.value[field.key] = user.nickName || user.userName
        formData.value[field.key + 'Id'] = user.userId
      }
    })
  } catch {
    showError('获取审批人列表失败')
  }
}

async function handleSubmit() {
  if (isSubmitting.value) return

  const fields = currentFields.value
  for (const f of fields) {
    if (f.type === 'picker' || f.type === 'date' || f.type === 'input') {
      if (!formData.value[f.key]) {
        showError(`请填写${f.label}`)
        return
      }
    }
    if (f.type === 'textarea') {
      if (!formData.value[f.key]) {
        showError(`请填写${f.label}`)
        return
      }
    }
    if (f.type === 'daterow') {
      if (!formData.value[f.start.key] || !formData.value[f.end.key]) {
        showError('请选择时间范围')
        return
      }
    }
  }

  isSubmitting.value = true
  uni.showLoading({ title: '提交中...' })

  try {
    const typeLabel = approvalTypes.find((t) => t.key === selectedType.value)?.label || ''
    const payload = {
      type: selectedType.value,
      title: typeLabel + '申请',
      formData: { ...formData.value },
    }
    const res = await approvalApi.create(payload)
    uni.hideLoading()
    if (res.data && res.data.id) {
      showSuccess('提交成功')
      setTimeout(() => uni.navigateBack(), 1500)
    } else {
      showSuccess('提交成功')
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch (err) {
    uni.hideLoading()
    console.error('提交失败', err)
    showError('提交失败，请重试')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.create-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #F7F7F7;
}

/* Type select bar */
.type-bar {
  display: flex;
  padding: 24rpx;
  gap: 24rpx;
  background: #F7F7F7;
  flex-shrink: 0;
}

/* Pill: hug width, 36px(72rpx) height, 18px(36rpx) radius */
.type-pill {
  flex: 1;
  height: 72rpx;
  border-radius: 36rpx;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-pill-active {
  background: #2B6DE8;
}

.type-pill-text {
  font-size: 28rpx;
  color: #666666;
  font-weight: 400;
}

.type-pill-text-active {
  color: #FFFFFF;
  font-weight: 500;
}

/* Form scroll area */
.form-scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
}

/* Form card: white, cornerRadius 12px(24rpx), padding 14px(28rpx) */
.form-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* Form item */
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.form-label {
  font-size: 24rpx;
  color: #666666;
  font-weight: 400;
}

/* Picker / Date selector */
.picker-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 72rpx;
  padding: 0 20rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
}

.picker-val {
  font-size: 26rpx;
  color: #333333;
  font-weight: 500;
}

.picker-placeholder {
  color: #C0C4CC;
  font-weight: 400;
}

.picker-arrow {
  font-size: 24rpx;
  color: #999999;
}

/* Input */
.form-input {
  height: 72rpx;
  padding: 0 20rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #333333;
}

/* Textarea */
.textarea-wrap {
  position: relative;
}

.form-textarea {
  min-height: 144rpx;
  padding: 16rpx 20rpx 48rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  font-size: 26rpx;
  color: #333333;
  line-height: 40rpx;
}

.textarea-count {
  position: absolute;
  right: 16rpx;
  bottom: 10rpx;
  font-size: 22rpx;
  color: #C0C4CC;
}

/* Double row: side by side */
.double-row {
  display: flex;
  gap: 20rpx;
}

.half-picker {
  flex: 1;
}

/* Bottom submit bar */
.bottom-bar {
  flex-shrink: 0;
  background: #FFFFFF;
  padding: 12rpx 24rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* A类 Submit button: 351×48px (702×96rpx), 24px(48rpx) radius, blue gradient */
.submit-btn {
  width: 702rpx;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(180deg, #2B6DE8 0%, #5284EE 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn-press {
  opacity: 0.85;
}

.submit-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
