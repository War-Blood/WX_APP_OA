<template>
  <view class="page">
    <NavBar title="写日报" :showBack="true">
      <template #right>
        <view class="nav-draft-btn" @tap="saveDraft">
          <text class="nav-draft-text">保存草稿</text>
        </view>
      </template>
    </NavBar>

    <view v-if="hasLastSubmission" class="load-last-bar" @tap="loadLastSubmission">
      <text class="icon-text" style="color:#2B6DE8;font-size:28rpx;">↻</text>
      <text class="load-last-text">加载上次填写内容</text>
      <text class="icon-text" style="color:#2B6DE8;font-size:24rpx;">→</text>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <view class="section-card">
        <text class="section-title">基本信息</text>
        <view class="form-group">
          <text class="form-label">日报时间</text>
          <picker mode="date" :value="formData.date" @change="e => formData.date = e.detail.value">
            <view class="form-picker">
              <text class="picker-value">{{ formData.date }}</text>
              <text class="picker-icon">▾</text>
            </view>
          </picker>
        </view>
        <view class="form-row">
          <view class="form-group form-half">
            <text class="form-label">入场时间</text>
            <picker mode="date" :value="formData.entryDate" @change="e => formData.entryDate = e.detail.value">
              <view class="form-picker">
                <text class="picker-value">{{ formData.entryDate }}</text>
              </view>
            </picker>
          </view>
          <view class="form-group form-half">
            <text class="form-label">初始出差时间</text>
            <picker mode="date" :value="formData.initialBizTripDate" @change="e => formData.initialBizTripDate = e.detail.value">
              <view class="form-picker">
                <text class="picker-value">{{ formData.initialBizTripDate }}</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">项目名称</text>
          <input class="form-input" placeholder="请输入项目名称" v-model="formData.project" />
        </view>
        <view class="form-group">
          <text class="form-label">项目所在区域</text>
          <input class="form-input" placeholder="请输入项目所在区域" v-model="formData.area" />
        </view>
        <view class="form-group">
          <text class="form-label">相关方单位</text>
          <input class="form-input" placeholder="请输入相关方单位" v-model="formData.relatedParty" />
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">作业信息</text>
        <view class="form-group">
          <text class="form-label">作业人员</text>
          <view class="worker-picker" @tap="showWorkerPicker = true">
            <text v-if="formData.workers" class="worker-text">{{ formData.workers }}</text>
            <text v-else class="worker-placeholder">选择作业人员（可多选）</text>
            <text class="picker-arrow">›</text>
          </view>
          <!-- 多选标签展示 -->
          <view v-if="selectedWorkers.length > 0" class="worker-tags">
            <view v-for="(w, i) in selectedWorkers" :key="i" class="worker-tag" @tap="removeWorker(i)">
              <text class="worker-tag-text">{{ w }}</text>
              <text class="worker-tag-close">×</text>
            </view>
          </view>
        </view>
        <view class="form-row">
          <view class="form-group form-half">
            <text class="form-label">机型</text>
            <input class="form-input" placeholder="如 MySE200" v-model="formData.machineModel" />
          </view>
          <view class="form-group form-half">
            <text class="form-label">人数</text>
            <view class="form-display">{{ selectedWorkers.length || 0 }}</view>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">从事工作内容</text>
          <textarea
            class="form-textarea"
            placeholder="如 Ipc故障处理、叶片振动传感器安装"
            v-model="formData.workContent"
            maxlength="200"
          />
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">当日工作</text>
        <view class="form-group">
          <text class="form-label">今日工作类型</text>
          <picker mode="selector" :range="workTypeOptions" :value="workTypeIndex(formData.todayWorkType)" @change="e => formData.todayWorkType = workTypeOptions[e.detail.value]">
            <view class="form-picker">
              <text class="picker-value" :class="{ 'picker-placeholder': !formData.todayWorkType }">{{ formData.todayWorkType || '请选择工作类型' }}</text>
              <text class="picker-icon">▾</text>
            </view>
          </picker>
        </view>
        <view class="form-group">
          <text class="form-label">当日工作小结</text>
          <view class="textarea-wrap">
            <textarea
              class="form-textarea"
              placeholder="请详细描述当日工作内容..."
              v-model="formData.todayWork"
              maxlength="2000"
              @input="onTodayWorkInput"
            />
            <text class="word-count">{{ todayWorkLength }}/2000</text>
          </view>
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">工作量统计</text>
        <view class="form-row">
          <view class="form-group form-half">
            <text class="form-label">需要完成数量</text>
            <input class="form-input" placeholder="0" type="number" v-model.number="formData.requiredQty" />
          </view>
          <view class="form-group form-half">
            <text class="form-label">累计完成数量</text>
            <input class="form-input" placeholder="0" type="number" v-model.number="formData.completedQty" />
          </view>
        </view>
        <view class="progress-row">
          <text class="progress-label">当前进度</text>
          <view class="progress-bar-wrap">
            <view class="progress-bar" :style="{ width: progressPercent + '%' }"></view>
          </view>
          <text class="progress-value">{{ progressPercent }}%</text>
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">明天工作</text>
        <view class="form-group">
          <text class="form-label">明日工作类型</text>
          <picker mode="selector" :range="workTypeOptions" :value="workTypeIndex(formData.tomorrowWorkType)" @change="e => formData.tomorrowWorkType = workTypeOptions[e.detail.value]">
            <view class="form-picker">
              <text class="picker-value" :class="{ 'picker-placeholder': !formData.tomorrowWorkType }">{{ formData.tomorrowWorkType || '请选择工作类型' }}</text>
              <text class="picker-icon">▾</text>
            </view>
          </picker>
        </view>
        <view class="form-group">
          <text class="form-label">明天工作内容</text>
          <textarea
            class="form-textarea"
            placeholder="请输入明日工作计划..."
            v-model="formData.tomorrowPlan"
            maxlength="1000"
          />
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">其他</text>
        <view class="form-group">
          <text class="form-label">遇到问题/风险</text>
          <textarea
            class="form-textarea"
            placeholder="选填"
            v-model="formData.issues"
            maxlength="500"
          />
        </view>
        <view class="form-group">
          <text class="form-label">备注</text>
          <textarea
            class="form-textarea"
            placeholder="选填"
            v-model="formData.remark"
            maxlength="500"
          />
        </view>
        <view class="form-group">
          <text class="form-label">个人累计出差天数</text>
          <input class="form-input" placeholder="0" type="number" v-model.number="formData.personalBizTripDays" />
        </view>
      </view>

      <view class="section-card">
        <text class="section-title">附件</text>
        <view class="upload-grid">
          <view
            v-for="(img, index) in uploadList"
            :key="index"
            class="upload-item"
            @tap="previewImage(index)"
          >
            <image class="upload-img" :src="img" mode="aspectFill" />
            <view class="upload-remove" @tap.stop="removeImage(index)">
              <text class="img-close">×</text>
            </view>
          </view>
          <view v-if="uploadList.length < 9" class="upload-add" @tap="addImage">
            <text class="upload-add-icon">+</text>
            <text class="upload-add-text">{{ uploadList.length }}/9</text>
          </view>
        </view>
      </view>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <view class="bottom-bar">
      <view class="btn-submit" @tap="handleSubmit">提交日报</view>
    </view>

    <!-- Worker picker popup -->
    <view v-if="showWorkerPicker" class="worker-popup-mask" @tap="showWorkerPicker = false">
      <view class="worker-popup" @tap.stop>
        <view class="worker-popup-header">
          <text class="popup-title">选择作业人员</text>
          <text class="popup-close" @tap="showWorkerPicker = false">×</text>
        </view>
        <!-- 搜索 + 手动添加 -->
        <view class="worker-search-bar">
          <input class="worker-search-input" v-model="workerSearchText" placeholder="搜索或输入新人姓名" @confirm="addCustomWorker" />
          <text class="worker-search-btn" @tap="addCustomWorker">+</text>
        </view>
        <scroll-view class="worker-popup-list" scroll-y>
          <view
            v-for="name in filteredWorkerOptions"
            :key="name"
            class="worker-option"
            :class="{ selected: selectedWorkers.includes(name) }"
            @tap="toggleWorker(name)"
          >
            <view class="option-checkbox" :class="{ checked: selectedWorkers.includes(name) }">
              <text v-if="selectedWorkers.includes(name)">✓</text>
            </view>
            <text class="option-name">{{ name }}</text>
          </view>
          <view v-if="filteredWorkerOptions.length === 0" class="worker-empty">无匹配人员，在上方输入后点 + 添加</view>
        </scroll-view>
        <view class="worker-popup-footer">
          <text class="popup-count">已选 {{ selectedWorkers.length }} 人</text>
          <view class="btn-confirm" @tap="confirmWorkerPicker">确定</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onUnload, onHide } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reportApi } from '@/services/modules/report'

const todayWorkLength = ref(0)
const workTypeOptions = ['工作', '待工', '在途']
const hasLastSubmission = ref(false)

const formData = ref({
  date: formatToday(),
  entryDate: formatToday(),
  initialBizTripDate: formatToday(),
  project: '',
  area: '',
  relatedParty: '',
  workers: '',
  machineModel: '',
  workerCount: '',
  workContent: '',
  todayWorkType: '',
  todayWork: '',
  requiredQty: 0,
  completedQty: 0,
  tomorrowWorkType: '',
  tomorrowPlan: '',
  issues: '',
  remark: '',
  personalBizTripDays: 0
})

const uploadList = ref([])
const workerOptions = ref([])
const selectedWorkers = ref([])
const showWorkerPicker = ref(false)
const workerSearchText = ref('')

const filteredWorkerOptions = computed(() => {
  if (!workerSearchText.value) return workerOptions.value
  const kw = workerSearchText.value.trim()
  return workerOptions.value.filter(name => name.includes(kw))
})

const progressPercent = computed(() => {
  if (formData.value.requiredQty <= 0) return 0
  const pct = Math.round((formData.value.completedQty / formData.value.requiredQty) * 100)
  return Math.min(pct, 100)
})

const bizTripDays = computed(() => {
  if (!formData.value.entryDate || !formData.value.date) return 0
  const start = new Date(formData.value.entryDate.replace(/\//g, '-'))
  const end = new Date(formData.value.date.replace(/\//g, '-'))
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
  return diff > 0 ? diff : 1
})

onMounted(async () => {
  const autoDraft = uni.getStorageSync('report_auto_draft')
  const lastSub = uni.getStorageSync('report_last_submission')

  if (autoDraft) {
    // 有未完成的草稿 → 完整恢复
    try {
      const saved = JSON.parse(autoDraft)
      Object.keys(formData.value).forEach((k) => {
        if (saved[k] !== undefined) formData.value[k] = saved[k]
      })
      if (saved.todayWork) todayWorkLength.value = saved.todayWork.length
      if (saved.workers) selectedWorkers.value = saved.workers.split(/[,，、\s]+/).filter(Boolean)
    } catch { /* ignore */ }
  } else if (lastSub) {
    // 无草稿时自动回填上次提交的高频重复字段
    try {
      const last = JSON.parse(lastSub)
      const sticky = ['project', 'area', 'relatedParty', 'machineModel']
      sticky.forEach((k) => {
        if (last[k]) formData.value[k] = last[k]
      })
      if (last.workers) {
        selectedWorkers.value = last.workers.split(/[,，、\s]+/).filter(Boolean)
        formData.value.workers = last.workers
      }
    } catch { /* ignore */ }
  }

  if (lastSub) hasLastSubmission.value = true

  // 从后端加载草稿
  try {
    const res = await reportApi.getDraft(formData.value.date || '')
    if (res.data) {
      const draft = res.data
      formData.value = {
        ...formData.value,
        project: draft.project || '',
        area: draft.area || '',
        todayWorkType: draft.todayWorkType || '',
        todayWork: draft.todayWork || '',
        tomorrowWorkType: draft.tomorrowWorkType || '',
        tomorrowPlan: draft.tomorrowPlan || '',
        workContent: draft.workContent || '',
        workers: draft.workers || '',
        machineModel: draft.machineModel || '',
        workerCount: draft.workerCount || '',
        requiredQty: draft.requiredQty || 0,
        completedQty: draft.completedQty || 0,
        issues: draft.issues || '',
        remark: draft.remark || '',
        entryDate: draft.entryDate || '',
        initialBizTripDate: draft.initialBizTripDate || '',
        relatedParty: draft.relatedParty || '',
        personalBizTripDays: draft.personalBizTripDays || 0
      }
      if (draft.todayWork) {
        todayWorkLength.value = draft.todayWork.length
      }
    }
  } catch (err) {
    // 没有草稿是正常情况，不做处理
  }

  // 加载作业人员名单
  await loadWorkerList()
})

// 编辑中自动保存草稿（防抖2s）
let saveTimer = null
watch(formData, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    uni.setStorageSync('report_auto_draft', JSON.stringify(formData.value))
  }, 2000)
}, { deep: true })

// 自动保存草稿：退出页面/切后台时保存
function autoSaveDraft() {
  const fd = formData.value
  // 至少填了项目名或今日工作才算有内容
  if (!fd.project && !fd.todayWork && !fd.workContent) return
  try {
    const draft = {
      ...fd,
      savedAt: new Date().toISOString()
    }
    uni.setStorageSync('report_auto_draft', JSON.stringify(draft))
  } catch { /* ignore quota exceeded */ }
}

onUnload(() => autoSaveDraft())
onHide(() => autoSaveDraft())

function loadLastSubmission() {
  const last = uni.getStorageSync('report_last_submission')
  if (last) {
    const data = JSON.parse(last)
    Object.assign(formData.value, data)
    todayWorkLength.value = data.todayWork ? data.todayWork.length : 0
    hasLastSubmission.value = false
    uni.showToast({ title: '已加载上次内容', icon: 'success' })
  }
}

function formatToday() {
  const d = new Date()
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function workTypeIndex(val) {
  const idx = workTypeOptions.indexOf(val)
  return idx >= 0 ? idx : 0
}

function onTodayWorkInput(e) {
  todayWorkLength.value = e.detail.value.length
}

async function saveDraft() {
  uni.showLoading({ title: '保存草稿...' })
  try {
    const payload = {
      reportDate: formData.value.date || '',
      formData: { ...formData.value }
    }
    await reportApi.saveDraft(payload)
    uni.hideLoading()
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: '保存失败', icon: 'none' })
    console.error('保存草稿失败', err)
  }
}

function addImage() {
  uni.chooseImage({
    count: 9 - uploadList.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      uploadList.value.push(...res.tempFilePaths)
    }
  })
}

function removeImage(index) {
  uploadList.value.splice(index, 1)
}

function previewImage(index) {
  uni.previewImage({ current: uploadList.value[index], urls: uploadList.value })
}

// --- Worker picker logic ---
async function loadWorkerList() {
  try {
    const res = await reportApi.getWorkerList()
    workerOptions.value = res.data || []
  } catch { /* fail silently */ }
}

function toggleWorker(name) {
  const idx = selectedWorkers.value.indexOf(name)
  if (idx > -1) {
    selectedWorkers.value.splice(idx, 1)
  } else {
    selectedWorkers.value.push(name)
  }
  formData.value.workers = selectedWorkers.value.join('、')
}

function removeWorker(index) {
  selectedWorkers.value.splice(index, 1)
  formData.value.workers = selectedWorkers.value.join('、')
}

function confirmWorkerPicker() {
  formData.value.workers = selectedWorkers.value.join('、')
  showWorkerPicker.value = false
}

function addCustomWorker() {
  const name = workerSearchText.value.trim()
  if (!name) return
  // 加入列表（去重）
  if (!workerOptions.value.includes(name)) {
    workerOptions.value.unshift(name)
  }
  if (!selectedWorkers.value.includes(name)) {
    selectedWorkers.value.push(name)
    formData.value.workers = selectedWorkers.value.join('、')
  }
  workerSearchText.value = ''
}

async function handleSubmit() {
  if (!formData.value.date) {
    uni.showToast({ title: '请选择日报时间', icon: 'none' })
    return
  }
  if (!formData.value.project) {
    uni.showToast({ title: '请输入项目名称', icon: 'none' })
    return
  }
  if (!formData.value.workers) {
    uni.showToast({ title: '请填写作业人员', icon: 'none' })
    return
  }
  if (!formData.value.todayWork) {
    uni.showToast({ title: '请填写当日工作小结', icon: 'none' })
    return
  }

  uni.showLoading({ title: '提交中...' })
  try {
    const form = formData.value
    const payload = {
      reportDate: form.date || '',
      formData: {
        project: form.project || '',
        area: form.area || '',
        todayWorkType: form.todayWorkType || '',
        todayWork: form.todayWork || '',
        tomorrowWorkType: form.tomorrowWorkType || '',
        tomorrowPlan: form.tomorrowPlan || '',
        workContent: form.workContent || '',
        workers: form.workers || '',
        machineModel: form.machineModel || '',
        workerCount: selectedWorkers.value.length,
        requiredQty: form.requiredQty || 0,
        completedQty: form.completedQty || 0,
        issues: form.issues || '',
        remark: form.remark || '',
        entryDate: form.entryDate || '',
        initialBizTripDate: form.initialBizTripDate || '',
        relatedParty: form.relatedParty || '',
        personalBizTripDays: form.personalBizTripDays || 0,
        content: form.content || ''
      }
    }

    const res = await reportApi.submit(payload)
    if (res.data?.id) {
      uni.hideLoading()
      uni.showToast({ title: '提交成功', icon: 'success' })
      uni.removeStorageSync('report_auto_draft')
      // 保存本次提交用于下次自动回填
      uni.setStorageSync('report_last_submission', JSON.stringify(formData.value))
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
    console.error('提交日报失败', err)
  }
}
</script>

<style lang="scss" scoped>
@import '@/uni.scss';

.page {
  width: 100%;
  height: 100vh;
  background: $bg-color;
  display: flex;
  flex-direction: column;
}

.load-last-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  margin: 0 24rpx 16rpx;
  background: #EDF2FF;
  border-radius: 16rpx;
  border: 1rpx solid #D6E4FF;
}

.load-last-bar:active {
  background: #D6E4FF;
}

.load-last-text {
  flex: 1;
  font-size: 26rpx;
  color: #2B6DE8;
  font-weight: 500;
}

.content-scroll {
  flex: 1;
  height: 0;
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.section-card {
  background: $bg-card;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 20rpx;
  display: block;
}

.form-group {
  margin-bottom: 20rpx;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  gap: 16rpx;
}

.form-half {
  flex: 1;
}

.form-label {
  font-size: 26rpx;
  color: $text-regular;
  font-weight: 500;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  height: 72rpx;
  padding: 0 20rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $text-primary;
  box-sizing: border-box;
  width: 100%;
}

.form-display {
  height: 72rpx;
  padding: 0 20rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333333;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
}

.form-picker {
  height: 72rpx;
  padding: 0 20rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-value {
  font-size: 28rpx;
  color: $text-primary;
}

.picker-placeholder {
  color: $text-secondary;
}

.textarea-wrap {
  position: relative;
}

.form-textarea {
  min-height: 144rpx;
  padding: 16rpx 20rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: $text-primary;
  line-height: 40rpx;
  box-sizing: border-box;
  width: 100%;
}

.word-count {
  position: absolute;
  bottom: 12rpx;
  right: 16rpx;
  font-size: 22rpx;
  color: $text-secondary;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
}

.progress-label {
  font-size: 26rpx;
  color: $text-regular;
  white-space: nowrap;
}

.progress-bar-wrap {
  flex: 1;
  height: 12rpx;
  background: #F0F2F5;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, $primary-color, $primary-light);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.progress-value {
  font-size: 26rpx;
  color: $primary-color;
  font-weight: 600;
  min-width: 44rpx;
  text-align: right;
}

.upload-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.upload-item {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  overflow: hidden;
  position: relative;
}

.upload-img {
  width: 100%;
  height: 100%;
}

.upload-remove {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #E0E0E0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #FAFBFC;
}

.upload-add:active {
  background: #F0F0F0;
}

.upload-add-text {
  font-size: 22rpx;
  color: #CCCCCC;
}
.upload-add-icon {
  font-size: 40rpx;
  color: #CCCCCC;
  line-height: 1;
}

/* Icon replacements for uni-icons */
.picker-icon {
  font-size: 28rpx;
  color: #999999;
  line-height: 1;
}
.img-close {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #FFFFFF;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.bottom-placeholder {
  height: 120rpx;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: $bg-card;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.btn-submit {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 48rpx;
  background: linear-gradient(135deg, $primary-color, $primary-light);
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.btn-submit:active {
  opacity: 0.9;
}

/* Worker picker trigger */
.worker-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  min-height: 72rpx;
}
.worker-text { font-size: 28rpx; color: #333333; }
.worker-placeholder { font-size: 28rpx; color: #C0C4CC; }
.picker-arrow { font-size: 36rpx; color: #B0B0B0; transform: rotate(90deg); }

/* Worker tags */
.worker-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}
.worker-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  background: #EDF2FF;
  border-radius: 8rpx;
}
.worker-tag-text { font-size: 24rpx; color: #2B6DE8; }
.worker-tag-close { font-size: 28rpx; color: #2B6DE8; padding: 0 4rpx; }

/* Worker popup */
.worker-popup-mask {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); z-index: 999;
  display: flex; align-items: flex-end; justify-content: center;
}
.worker-popup {
  width: 100%; max-height: 60vh;
  background: #FFFFFF; border-radius: 40rpx 40rpx 0 0;
  display: flex; flex-direction: column;
}
.worker-popup-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 32rpx; border-bottom: 1rpx solid #F0F0F0;
}
.popup-title { font-size: 32rpx; font-weight: 600; color: #333333; }
.popup-close { font-size: 44rpx; color: #999999; padding: 0 8rpx; }

.worker-search-bar { display: flex; align-items: center; padding: 16rpx 32rpx; border-bottom: 1rpx solid #F0F0F0; }
.worker-search-input { flex: 1; height: 64rpx; background: #F5F5F5; border-radius: 12rpx; padding: 0 20rpx; font-size: 26rpx; }
.worker-search-btn { width: 64rpx; height: 64rpx; background: #2B6DE8; color: #fff; font-size: 36rpx; line-height: 64rpx; text-align: center; border-radius: 12rpx; margin-left: 16rpx; }

.worker-popup-list {
  flex: 1; max-height: 50vh; padding: 16rpx 0;
}
.worker-option {
  display: flex; align-items: center; gap: 24rpx;
  padding: 24rpx 32rpx;
}
.worker-option.selected { background: #F0F4FF; }
.option-checkbox {
  width: 40rpx; height: 40rpx; border-radius: 8rpx;
  border: 2rpx solid #D0D0D0;
  display: flex; align-items: center; justify-content: center;
}
.option-checkbox.checked {
  background: #2B6DE8; border-color: #2B6DE8;
  color: #FFFFFF; font-size: 24rpx;
}
.option-name { font-size: 28rpx; color: #333333; }
.worker-empty { text-align: center; padding: 64rpx; color: #C0C4CC; font-size: 26rpx; }

.worker-popup-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid #F0F0F0;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.popup-count { font-size: 26rpx; color: #666666; }
.btn-confirm {
  padding: 16rpx 48rpx; border-radius: 40rpx;
  background: #2B6DE8; color: #FFFFFF;
  font-size: 28rpx; font-weight: 600;
}
</style>
