<template>
  <text :class="['oa-icon', 'oa-icon-' + name]" :style="iconStyle"></text>
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
  },
  color: {
    type: String,
    default: ''
  }
})

const iconStyle = computed(() => {
  const style = {}
  if (props.size) {
    style.fontSize = typeof props.size === 'number' ? props.size + 'rpx' : props.size
  }
  if (props.color) {
    style.color = props.color
  }
  return style
})
</script>
