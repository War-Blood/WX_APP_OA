<template>
  <view class="icon-park-wrapper" :style="wrapperStyle">
    <image
      :class="['icon-park', className]"
      :src="svgUrl"
      mode="aspectFit"
    />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: 32
  }
})

const localIconMap = {
  'approval': '/static/images/home/generated/Vector_13_2290.png',
  'report': '/static/images/home/generated/Vector_13_2298.png',
  'announcement': '/static/images/home/generated/Vector_13_2307.png',
  'contacts': '/static/images/home/generated/Vector_13_2315.png',
  'bell': '/static/images/home/generated/svg1.png'
}

const svgUrl = computed(() => {
  return localIconMap[props.name] || '/static/images/home/generated/svg0.png'
})

const className = computed(() => {
  return `icon-park-${props.name}`
})

const wrapperStyle = computed(() => {
  const sizeValue = typeof props.size === 'number' ? props.size + 'rpx' : props.size
  return {
    width: sizeValue,
    height: sizeValue
  }
})
</script>

<style scoped>
.icon-park-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.icon-park {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
