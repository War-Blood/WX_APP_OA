<template>
  <view class="uploader-grid">
    <view
      v-for="(item, index) in imageList"
      :key="index"
      class="uploader-item"
      @tap="previewImage(index)"
      @longpress="removeImage(index)"
    >
      <image class="uploader-image" :src="item" mode="aspectFill" />
      <view class="uploader-remove" @tap.stop="removeImage(index)">
        <uni-icons type="close" size="20" color="#FFFFFF"></uni-icons>
      </view>
    </view>
    <view
      v-if="imageList.length < maxCount"
      class="uploader-item uploader-add"
      @tap="addImage"
    >
      <uni-icons type="plus" size="40" color="#C0C4CC"></uni-icons>
      <text class="uploader-count">{{ imageList.length }}/{{ maxCount }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  list: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 9 }
})

const emit = defineEmits(['add', 'remove', 'preview'])

const imageList = ref([...props.list])

watch(() => props.list, (val) => {
  imageList.value = [...val]
}, { deep: true })

function addImage() {
  uni.chooseImage({
    count: props.maxCount - imageList.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFiles = res.tempFilePaths
      imageList.value = [...imageList.value, ...tempFiles]
      emit('add', tempFiles)
    }
  })
}

function removeImage(index) {
  uni.showModal({
    title: '提示',
    content: '确定删除该图片？',
    success: (res) => {
      if (res.confirm) {
        const removed = imageList.value[index]
        imageList.value.splice(index, 1)
        emit('remove', index)
      }
    }
  })
}

function previewImage(index) {
  uni.previewImage({
    current: imageList.value[index],
    urls: imageList.value
  })
  emit('preview', imageList.value[index])
}
</script>

<style lang="scss" scoped>
.uploader-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.uploader-item {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  position: relative;
  overflow: hidden;
}

.uploader-image {
  width: 100%;
  height: 100%;
}

.uploader-remove {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 32rpx;
  height: 32rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploader-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border: 2rpx dashed #D0D5DD;
  box-sizing: border-box;
}

.uploader-count {
  font-size: 20rpx;
  color: #C0C4CC;
  margin-top: 8rpx;
}
</style>
