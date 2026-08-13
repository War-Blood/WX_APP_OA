<template>
  <view class="page">
    <nav-bar title="练习设置" :showBack="true" />
    <view class="content">
      <view class="card">
        <text class="card-title">抽题方式</text>
        <view class="mode-row">
          <view v-for="m in modes" :key="m.key" class="mode-item" :class="{ checked: mode === m.key }" @tap="mode = m.key">
            <text>{{ m.label }}</text>
          </view>
        </view>
      </view>
      <view class="card">
        <text class="card-title">选择题型</text>
        <view class="mode-row">
          <view v-for="t in types" :key="t.key" class="mode-item" :class="{ checked: selectedTypes.includes(t.key) }" @tap="toggleType(t.key)">
            <text>{{ t.label }}</text>
          </view>
        </view>
      </view>
      <view class="card">
        <text class="card-title">题目数量</text>
        <view class="stepper">
          <view class="step-btn" @tap="count = Math.max(5, count - 5)"><text>-</text></view>
          <text class="step-val">{{ count }}</text>
          <view class="step-btn" @tap="count = Math.min(200, count + 5)"><text>+</text></view>
        </view>
      </view>
      <view class="card">
        <text class="card-title">背题模式</text>
        <view class="back-row">
          <text class="back-hint">直接显示答案供记忆</text>
          <switch :checked="backMemorize" color="#2B6DE8" @change="backMemorize = $event.detail.value" />
        </view>
      </view>
    </view>
    <view class="bottom-bar">
      <view class="btn-primary" @tap="start"><text>开始练习</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { showError } from '@/utils/toast'

const categoryId = ref(0)
const modes = [
  { key: 'order', label: '顺序' },
  { key: 'random', label: '随机' },
  { key: 'special', label: '专项' },
  { key: 'type', label: '题型' },
]
const mode = ref('random')
const types = [{ key: 'single', label: '单选' }, { key: 'multiple', label: '多选' }, { key: 'judge', label: '判断' }]
const selectedTypes = ref(['single', 'multiple', 'judge'])
const count = ref(20)
const backMemorize = ref(false)

onLoad((options) => {
  categoryId.value = Number(options.categoryId) || 0
})

function toggleType(k) {
  const idx = selectedTypes.value.indexOf(k)
  if (idx > -1) selectedTypes.value.splice(idx, 1)
  else selectedTypes.value.push(k)
}

function start() {
  if (!selectedTypes.value.length) return showError('请选择题型')
  uni.navigateTo({
    url: `/pages/exam/dati/index?mode=learn&categoryId=${categoryId.value}&types=${selectedTypes.value.join(',')}&count=${count.value}&back=${backMemorize.value ? 1 : 0}&drawMode=${mode.value}`,
  })
}
</script>

<style lang="scss" scoped>
.page { width: 100%; height: 100vh; background: #F0F2F8; display: flex; flex-direction: column; }
.content { flex: 1; padding: 24rpx; }
.card { background: #FFF; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-bottom: 16rpx; }
.mode-row { display: flex; flex-wrap: wrap; gap: 16rpx; }
.mode-item { padding: 14rpx 30rpx; border-radius: 24rpx; border: 2rpx solid #E4E7ED; font-size: 26rpx; color: #666; }
.mode-item.checked { background: #EDF2FF; border-color: #2B6DE8; color: #2B6DE8; }
.stepper { display: flex; align-items: center; gap: 24rpx; }
.step-btn { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; background: #EDF2FF; border-radius: 12rpx; font-size: 28rpx; color: #2B6DE8; }
.step-val { font-size: 36rpx; font-weight: 600; color: #333; }
.back-row { display: flex; justify-content: space-between; align-items: center; }
.back-hint { font-size: 26rpx; color: #909399; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 20rpx 24rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); background: #FFF; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.04); }
.btn-primary { height: 96rpx; display: flex; align-items: center; justify-content: center; border-radius: 48rpx; background: linear-gradient(135deg, #2B6DE8, #4A8AF4); }
.btn-primary text { font-size: 32rpx; font-weight: 600; color: #FFF; }
</style>
