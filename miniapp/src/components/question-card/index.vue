<template>
  <view class="q-card">
    <view class="q-head">
      <text class="q-type">{{ typeLabel }}</text>
      <text class="q-score">{{ question.score }}分</text>
    </view>
    <view class="q-title">{{ question.title }}</view>
    <image v-if="question.titleImage" class="q-img" :src="question.titleImage" mode="widthFix" @tap="previewTitleImage" />
    <view class="q-options">
      <view
        v-for="opt in question.options"
        :key="opt.key"
        class="q-option"
        :class="optionClass(opt.key)"
        @tap="interactive && onTap(opt.key)"
      >
        <view class="opt-circle" :class="{ checked: selectedKeys.includes(opt.key) }" />
        <text class="opt-key">{{ opt.key }}.</text>
        <view class="opt-body">
          <text class="opt-text">{{ opt.text }}</text>
          <image v-if="opt.image" class="opt-img" :src="opt.image" mode="widthFix" @tap.stop="previewOptionImage(opt.image)" />
        </view>
      </view>
    </view>
    <view v-if="showAnswer" class="q-analysis">
      <view class="qa-line" :class="{ right: userCorrect }">
        {{ userCorrect ? '✅ 回答正确' : '❌ 回答错误' }}
      </view>
      <view class="qa-line">正确答案：{{ question.answer }}</view>
      <view v-if="question.analysis" class="qa-line analysis">解析：{{ question.analysis }}</view>
      <image v-if="question.analysisImage" class="q-img" :src="question.analysisImage" mode="widthFix" @tap="previewAnalysisImage" />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  question: { type: Object, required: true },
  selected: { type: String, default: '' },
  /** 是否允许点击作答 */
  interactive: { type: Boolean, default: true },
  /** 是否揭示正确答案与解析 */
  showAnswer: { type: Boolean, default: false },
})
const emit = defineEmits(['update:selected'])

const typeLabel = computed(() =>
  ({ single: '单选', multiple: '多选', judge: '判断' }[props.question.type] || props.question.type)
)

const correctKeys = computed(() => {
  if (!props.showAnswer || !props.question.answer) return []
  return String(props.question.answer).split(',').map(s => s.trim()).filter(Boolean)
})
const selectedKeys = computed(() =>
  String(props.selected || '').split(',').map(s => s.trim()).filter(Boolean)
)
const userCorrect = computed(() => {
  if (!props.showAnswer) return true
  const c = correctKeys.value
  const s = selectedKeys.value
  if (props.question.type === 'multiple') {
    return c.length === s.length && c.every(k => s.includes(k))
  }
  return s.length > 0 && s[0] === props.question.answer
})

function optionClass(key) {
  const classes = []
  if (props.showAnswer) {
    if (correctKeys.value.includes(key)) classes.push('correct')
    else if (selectedKeys.value.includes(key)) classes.push('wrong')
  } else if (selectedKeys.value.includes(key)) {
    classes.push('checked')
  }
  return classes
}

function previewTitleImage() {
  if (props.question.titleImage) uni.previewImage({ urls: [props.question.titleImage] })
}
function previewOptionImage(url) {
  uni.previewImage({ urls: [url] })
}
function previewAnalysisImage() {
  if (props.question.analysisImage) uni.previewImage({ urls: [props.question.analysisImage] })
}

function onTap(key) {
  // 触觉反馈: 可交互时轻震, 让用户感知选中动作被接收
  if (props.interactive) uni.vibrateShort({ type: 'light' })
  if (props.question.type === 'multiple') {
    const set = selectedKeys.value.includes(key)
      ? selectedKeys.value.filter(k => k !== key)
      : [...selectedKeys.value, key]
    emit('update:selected', set.sort().join(','))
  } else {
    emit('update:selected', key)
  }
}
</script>

<style lang="scss" scoped>
.q-card { background: #FFF; border-radius: 16rpx; padding: 24rpx; }
.q-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.q-type { font-size: 22rpx; color: #2B6DE8; background: #EDF2FF; padding: 4rpx 16rpx; border-radius: 20rpx; }
.q-score { font-size: 22rpx; color: #909399; }
.q-title { font-size: 30rpx; font-weight: 600; color: #1E293B; line-height: 1.6; margin-bottom: 20rpx; }
.q-options { display: flex; flex-direction: column; gap: 16rpx; }
.q-img { width: 100%; max-height: 600rpx; border-radius: 12rpx; margin-top: 16rpx; object-fit: contain; background: #F8FAFC; }
.opt-body { flex: 1; display: flex; flex-direction: column; gap: 8rpx; }
.opt-img { max-width: 320rpx; border-radius: 8rpx; }
.q-option { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 24rpx; border: 2rpx solid #E4E7ED; border-radius: 16rpx; font-size: 28rpx; color: #333; transition: all .15s ease; }
.q-option:active { transform: scale(.98); }
.q-option.checked { border-color: #2B6DE8; background: #EDF2FF; }
.q-option.correct { border-color: #16A34A; background: #F0FDF4; }
.q-option.wrong { border-color: #DC2626; background: #FEF2F2; }
.opt-circle { width: 32rpx; height: 32rpx; border-radius: 50%; border: 2rpx solid #C0C4CC; flex-shrink: 0; }
.opt-circle.checked { border-color: #2B6DE8; background: #2B6DE8; }
.opt-key { color: #606266; width: 36rpx; }
.opt-text { flex: 1; }
.q-analysis { margin-top: 20rpx; padding: 20rpx; background: #F8FAFC; border-radius: 12rpx; font-size: 24rpx; color: #606266; display: flex; flex-direction: column; gap: 8rpx; }
.qa-line.right { color: #16A34A; font-weight: 600; }
.qa-line.analysis { color: #1E293B; }
</style>