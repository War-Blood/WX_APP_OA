<template>
  <view v-if="visible" class="picker-overlay" @tap.self="onCancel">
    <view class="picker-panel">
      <view class="picker-header">
        <text class="picker-cancel" @tap="onCancel">取消</text>
        <text class="picker-title">选择人员</text>
        <text class="picker-confirm" @tap="onConfirm">确定</text>
      </view>

      <view class="search-bar">
        <uni-icons type="search" size="24" color="#999999"></uni-icons>
        <input
          class="search-input"
          v-model="searchText"
          placeholder="搜索姓名"
          placeholder-class="search-placeholder"
        />
      </view>

      <scroll-view class="person-scroll" scroll-y>
        <view v-for="dept in departments" :key="dept.name" class="dept-group">
          <view class="dept-header" @tap="toggleDept(dept.name)">
            <uni-icons
              :type="dept.expanded ? 'arrowdown' : 'arrowright'"
              size="24"
              color="#999999"
            ></uni-icons>
            <text class="dept-name">{{ dept.name }}</text>
            <text class="dept-count">{{ dept.members.length }}</text>
          </view>
          <view v-if="dept.expanded" class="dept-members">
            <view
              v-for="person in filteredMembers(dept.members)"
              :key="person.id"
              class="person-item"
              @tap="togglePerson(person)"
            >
              <view class="person-avatar" :style="{ background: person.avatarBg || '#EDF2FF' }">
                <text class="person-avatar-text">{{ person.name.charAt(0) }}</text>
              </view>
              <view class="person-info">
                <text class="person-name">{{ person.name }}</text>
                <text class="person-dept">{{ dept.name }}</text>
              </view>
              <view
                v-if="isSelected(person.id)"
                class="person-checked"
              >
                <uni-icons type="checkmark" size="24" color="#2B6DE8"></uni-icons>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] }
})

const emit = defineEmits(['confirm', 'cancel'])

const searchText = ref('')
const selectedIds = ref([...props.selected])
const departments = ref([
  {
    name: '技术部',
    expanded: true,
    members: [
      { id: 1, name: '张三' },
      { id: 2, name: '李四' },
      { id: 3, name: '王五' }
    ]
  },
  {
    name: '财务部',
    expanded: false,
    members: [
      { id: 4, name: '赵六' },
      { id: 5, name: '钱七' }
    ]
  },
  {
    name: '行政部',
    expanded: false,
    members: [
      { id: 6, name: '孙八' },
      { id: 7, name: '周九' }
    ]
  }
])

function toggleDept(name) {
  const dept = departments.value.find(d => d.name === name)
  if (dept) dept.expanded = !dept.expanded
}

function togglePerson(person) {
  if (props.multiple) {
    const idx = selectedIds.value.indexOf(person.id)
    if (idx > -1) {
      selectedIds.value.splice(idx, 1)
    } else {
      selectedIds.value.push(person.id)
    }
  } else {
    selectedIds.value = [person.id]
  }
}

function isSelected(id) {
  return selectedIds.value.includes(id)
}

function filteredMembers(members) {
  if (!searchText.value) return members
  return members.filter(m => m.name.includes(searchText.value))
}

function onConfirm() {
  emit('confirm', [...selectedIds.value])
}

function onCancel() {
  selectedIds.value = [...props.selected]
  emit('cancel')
}
</script>

<style lang="scss" scoped>
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.picker-panel {
  width: 100%;
  height: 80vh;
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
}

.picker-cancel {
  font-size: 28rpx;
  color: #999999;
}

.picker-confirm {
  font-size: 28rpx;
  color: #2B6DE8;
  font-weight: 500;
}

.picker-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333333;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 16rpx 32rpx;
  padding: 16rpx 20rpx;
  background: #F5F5F5;
  border-radius: 24rpx;
}

.search-input {
  flex: 1;
  font-size: 26rpx;
  color: #333333;
}

.search-placeholder {
  font-size: 26rpx;
  color: #C0C4CC;
}

.person-scroll {
  flex: 1;
  height: 0;
  padding: 0 32rpx;
}

.dept-group {
  margin-bottom: 8rpx;
}

.dept-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0;
}

.dept-name {
  flex: 1;
  font-size: 28rpx;
  font-weight: 500;
  color: #333333;
}

.dept-count {
  font-size: 24rpx;
  color: #999999;
}

.person-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-top: 1rpx solid #F5F5F5;
}

.person-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.person-avatar-text {
  font-size: 26rpx;
  font-weight: 500;
  color: #2B6DE8;
}

.person-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.person-name {
  font-size: 28rpx;
  color: #333333;
}

.person-dept {
  font-size: 22rpx;
  color: #999999;
}

.person-checked {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
