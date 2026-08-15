<template>
  <view v-if="visible" class="popup-overlay" @tap="onClose" @touchmove.stop.prevent>
    <view class="popup-sheet" @tap.stop>
      <view class="sheet-handle" />
      <view class="sheet-header">
        <text class="sheet-title">{{ title }}</text>
        <text class="sheet-close" @tap="onClose">✕</text>
      </view>

      <scroll-view class="sheet-body" scroll-y>
        <view v-if="serverError" class="server-error">{{ serverError }}</view>

        <view v-for="field in fields" :key="field.key" class="form-field">
          <text class="form-label">
            {{ field.label }}<text v-if="field.required" class="required"> *</text>
          </text>
          <input
            class="form-input"
            :class="{ 'form-input--error': errors[field.key] }"
            :type="field.type === 'number' ? 'number' : 'text'"
            :value="form[field.key]"
            :placeholder="field.placeholder"
            :placeholder-class="'input-placeholder'"
            :maxlength="field.maxlength"
            :focus="field.key === focusKey"
            cursor-spacing="20"
            @input="onInput(field.key, $event)"
            @blur="onBlurField(field.key)"
          />
          <text v-if="field.hint" class="field-hint">{{ field.hint }}</text>
          <text v-if="errors[field.key]" class="field-error">{{ errors[field.key] }}</text>
        </view>
      </scroll-view>

      <view class="sheet-footer">
        <view class="btn btn-cancel" hover-class="btn-cancel-hover" @tap="onClose">
          <text class="btn-text">取消</text>
        </view>
        <view
          class="btn btn-save"
          :class="{ 'btn-save--loading': loading }"
          hover-class="btn-save-hover"
          @tap="onSubmit"
        >
          <text class="btn-text">{{ loading ? '保存中...' : '保存' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { isRequired, isMobile } from '@/utils/validator'

const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '修改个人信息' },
  // [{ key, label, type: 'text'|'number', value, placeholder, maxlength, required, hint }]
  fields: { type: Array, default: () => [] },
  focusKey: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['update:visible', 'submit'])

const form = ref({})
const original = ref({})
const errors = ref({})
const serverError = ref('')
const focusKey = ref(null)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      // 打开时快照当前值，仅提交有变化的字段
      const snapshot = {}
      props.fields.forEach((f) => { snapshot[f.key] = f.value ?? '' })
      form.value = { ...snapshot }
      original.value = { ...snapshot }
      errors.value = {}
      serverError.value = ''
      focusKey.value = props.focusKey || (props.fields[0] && props.fields[0].key) || null
    } else {
      focusKey.value = null
    }
  }
)

watch(
  () => props.error,
  (err) => { if (err) serverError.value = err }
)

function validateField(field) {
  const value = String(form.value[field.key] ?? '').trim()
  if (field.required) {
    const err = isRequired(value, field.label)
    if (err) return err
  }
  if (field.type === 'number' && value) {
    const err = isMobile(value)
    if (err) return err
  }
  return ''
}

function onInput(key, event) {
  form.value[key] = event.detail.value
  if (errors.value[key]) errors.value[key] = ''
  if (serverError.value) serverError.value = ''
}

function onBlurField(key) {
  focusKey.value = null
  const field = props.fields.find((f) => f.key === key)
  if (!field) return
  errors.value[key] = validateField(field)
}

function onSubmit() {
  // 全量校验
  let hasError = false
  props.fields.forEach((f) => {
    const err = validateField(f)
    errors.value[f.key] = err
    if (err) hasError = true
  })
  if (hasError) return

  // 仅提交有变化的字段
  const changed = {}
  props.fields.forEach((f) => {
    const cur = String(form.value[f.key] ?? '').trim()
    const orig = String(original.value[f.key] ?? '').trim()
    if (cur !== orig) changed[f.key] = cur
  })
  emit('submit', changed)
}

function onClose() {
  if (props.loading) return
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  animation: popup-fade 0.2s ease-out;
}

.popup-sheet {
  width: 100%;
  background: $bg-white;
  border-radius: $radius-xl $radius-xl 0 0;
  padding: 16rpx $spacing-lg $spacing-base;
  padding-bottom: calc(#{$spacing-base} + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  max-height: 82vh;
  animation: popup-slide-up 0.25s ease-out;
  box-sizing: border-box;
}

.sheet-handle {
  width: 64rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: $border-color;
  margin: 0 auto 20rpx;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20rpx;
}

.sheet-title {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
}

.sheet-close {
  font-size: 36rpx;
  color: $text-secondary;
  padding: 8rpx 12rpx;
  line-height: 1;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  max-height: 58vh;
}

.server-error {
  background: #FFF0F0;
  color: $danger-color;
  font-size: $font-sm;
  line-height: 1.5;
  border-radius: $radius-base;
  padding: 16rpx 20rpx;
  margin-bottom: $spacing-base;
}

.form-field {
  margin-bottom: 28rpx;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: $text-regular;
  font-weight: 500;
  margin-bottom: 12rpx;
}

.required {
  color: $danger-color;
}

.form-input {
  height: 80rpx;
  padding: 0 24rpx;
  background: $bg-form;
  border-radius: $radius-base;
  font-size: $font-base;
  color: $text-primary;
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid transparent;
}

.form-input--error {
  border-color: $danger-color;
}

.field-hint {
  display: block;
  font-size: $font-xs;
  color: $text-secondary;
  margin-top: 8rpx;
}

.field-error {
  display: block;
  font-size: $font-xs;
  color: $danger-color;
  margin-top: 8rpx;
}

.sheet-footer {
  display: flex;
  gap: 20rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $border-light;
}

.btn {
  flex: 1;
  height: 88rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cancel {
  background: #F5F5F5;
}

.btn-cancel-hover {
  background: #EBEBEB;
}

.btn-save {
  background: $primary-color;
}

.btn-save--loading {
  opacity: 0.6;
}

.btn-save-hover {
  background: $primary-dark;
}

.btn-text {
  font-size: $font-base;
  font-weight: 500;
  color: $text-primary;
}

.btn-save .btn-text {
  color: #FFFFFF;
}

@keyframes popup-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes popup-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
