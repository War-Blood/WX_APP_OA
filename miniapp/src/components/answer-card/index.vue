<template>
  <view class="a-card">
    <view
      v-for="(q, i) in questions"
      :key="q.id"
      class="a-cell"
      :class="cellClass(i)"
      @tap="emit('jump', i)"
    >
      <text>{{ i + 1 }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 题目列表(含 id) */
  questions: { type: Array, required: true },
  /** 已作答映射 { questionId: answer } */
  answers: { type: Object, default: () => ({}) },
  /** 当前题索引 */
  current: { type: Number, default: 0 },
  /** 是否展示结果配色(对错) */
  showResult: { type: Boolean, default: false },
  /** 结果判定映射 { questionId: boolean } */
  resultMap: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['jump'])

function cellClass(i) {
  const q = props.questions[i]
  const classes = []
  if (i === props.current) classes.push('current')
  const answered = props.answers[q.id] !== undefined && props.answers[q.id] !== ''
  if (props.showResult) {
    if (props.resultMap[q.id] === true) classes.push('right')
    else if (props.resultMap[q.id] === false) classes.push('wrong')
    else classes.push('hollow')
  } else if (answered) {
    classes.push('filled')
  }
  return classes
}
</script>

<style lang="scss" scoped>
.a-card { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 20rpx; }
.a-cell { width: 64rpx; height: 64rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #909399; background: #F5F7FA; border: 2rpx solid transparent; }
.a-cell.current { border-color: #2B6DE8; color: #2B6DE8; font-weight: 600; }
.a-cell.filled { background: #2B6DE8; color: #FFF; }
.a-cell.right { background: #16A34A; color: #FFF; }
.a-cell.wrong { background: #DC2626; color: #FFF; }
.a-cell.hollow { background: #F5F7FA; color: #909399; }
</style>
