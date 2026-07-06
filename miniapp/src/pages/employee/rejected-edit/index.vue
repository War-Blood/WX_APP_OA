<template>
  <view class="page">
    <nav-bar title="编辑日报" :showBack="true">
      <template #right>
        <text class="nav-draft-text" @tap="saveDraft">保存草稿</text>
      </template>
    </nav-bar>

    <view class="reject-banner">
      <text class="banner-icon">!</text>
      <text class="reject-banner-text">驳回原因：{{ rejectReason }}</text>
    </view>

    <view v-if="hasLastSubmission" class="load-last-bar" @tap="loadLastSubmission">
      <text class="load-icon">↻</text>
      <text class="load-last-text">加载上次填写内容</text>
      <text class="load-arrow">→</text>
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
          <input class="form-input" placeholder="填写作业人员姓名，多人用逗号分隔" v-model="formData.workers" />
        </view>
        <view class="form-row">
          <view class="form-group form-half">
            <text class="form-label">机型</text>
            <input class="form-input" placeholder="如 MySE200" v-model="formData.machineModel" />
          </view>
          <view class="form-group form-half">
            <text class="form-label">人数</text>
            <input class="form-input" placeholder="人数" type="number" v-model="formData.workerCount" />
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
      <view class="btn-submit" @tap="handleSubmit">重新提交</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onUnload, onHide } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import { reportApi } from '@/services/modules/report'
import { showSuccess, showError, showToast } from '@/utils/toast'

const reportId = ref('')
const loading = ref(true)
const rejectReason = ref('')
const todayWorkLength = ref(0)
const workTypeOptions = ['工作', '待工', '在途']
const hasLastSubmission = ref(false)

const formData = ref({
  date: '',
  entryDate: '',
  initialBizTripDate: '',
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

const progressPercent = computed(() => {
  if (formData.value.requiredQty <= 0) return 0
  const pct = Math.round((formData.value.completedQty / formData.value.requiredQty) * 100)
  return Math.min(pct, 100)
})

onMounted(async () => {
  const last = uni.getStorageSync('report_last_submission')
  if (last) {
    hasLastSubmission.value = true
  }
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  if (currentPage.options && currentPage.options.id) {
    reportId.value = currentPage.options.id
    await loadReport()
  }
  loading.value = false
})

// 自动保存草稿
function autoSaveDraft() {
  try {
    uni.setStorageSync('report_reject_draft', JSON.stringify(formData.value))
  } catch { /* ignore */ }
}
onUnload(() => autoSaveDraft())
onHide(() => autoSaveDraft())

async function loadReport() {
  try {
    const res = await reportApi.getDetail(reportId.value)
    if (res.data) {
      const report = res.data
      formData.value = {
        project: report.project || '',
        area: report.area || '',
        todayWorkType: report.todayWorkType || '',
        todayWork: report.todayWork || '',
        tomorrowWorkType: report.tomorrowWorkType || '',
        tomorrowPlan: report.tomorrowPlan || '',
        workContent: report.workContent || '',
        workers: report.workers || '',
        machineModel: report.machineModel || '',
        workerCount: report.workerCount || '',
        requiredQty: report.requiredQty || 0,
        completedQty: report.completedQty || 0,
        issues: report.issues || '',
        remark: report.remark || '',
        entryDate: report.entryDate || '',
        initialBizTripDate: report.initialBizTripDate || '',
        relatedParty: report.relatedParty || '',
        personalBizTripDays: report.personalBizTripDays || 0,
        content: report.content || ''
      }
      rejectReason.value = report.reviewOpinion || ''
    }
  } catch (err) {
    console.error('加载驳回日报失败', err)
  }
}

function loadLastSubmission() {
  const last = uni.getStorageSync('report_last_submission')
  if (last) {
    const data = JSON.parse(last)
    Object.assign(formData.value, data)
    todayWorkLength.value = data.todayWork ? data.todayWork.length : 0
    hasLastSubmission.value = false
    showSuccess('已加载上次内容')
  }
}

function workTypeIndex(val) {
  const idx = workTypeOptions.indexOf(val)
  return idx >= 0 ? idx : 0
}

function onTodayWorkInput(e) {
  todayWorkLength.value = e.detail.value.length
}

function saveDraft() {
  uni.setStorageSync('report_draft', JSON.stringify(formData.value))
  showSuccess('草稿已保存')
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

async function handleSubmit() {
  if (!formData.value.date) {
    showError('请选择日报时间')
    return
  }
  if (!formData.value.project) {
    showError('请输入项目名称')
    return
  }
  if (!formData.value.workers) {
    showError('请填写作业人员')
    return
  }
  if (!formData.value.todayWork) {
    showError('请填写当日工作小结')
    return
  }
  uni.showLoading({ title: '提交中...' })
  try {
    const payload = {
      reportDate: formData.value.date || '',
      formData: { ...formData.value }
    }
    const res = await reportApi.submit(payload)
    if (res.data?.id) {
      uni.hideLoading()
      showSuccess('重新提交成功')
      setTimeout(() => uni.navigateBack(), 1500)
    }
  } catch (err) {
    uni.hideLoading()
    showError('提交失败')
    console.error('重新提交失败', err)
  }
}

</script>

<style lang="scss" scoped>
$color-primary: #2B6DE8;
$color-primary-light: #5B8DF0;
$bg-page: #F7F7F7;
$bg-card: #FFFFFF;
$text-primary: #333333;
$text-secondary: #666666;
$text-tertiary: #999999;
$border-color: #ECECEC;
$color-danger: #EF4444;

.page {
  width: 100%;
  height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
}

.nav-draft-text {
  font-size: 26rpx;
  color: #2B6DE8;
  font-weight: 500;
}

/* Icon replacements */
.banner-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28rpx; height: 28rpx; border-radius: 50%;
  background: #EF4444; color: #FFFFFF;
  font-size: 18rpx; font-weight: 700; line-height: 1; text-align: center;
}
.load-icon { color: #2B6DE8; font-size: 28rpx; }
.load-arrow { color: #2B6DE8; font-size: 24rpx; }
.picker-icon { color: #999999; font-size: 28rpx; line-height: 1; }
.img-close {
  position: absolute; top: 4rpx; right: 4rpx;
  width: 36rpx; height: 36rpx; border-radius: 50%;
  background: rgba(0,0,0,0.5); color: #FFFFFF;
  font-size: 24rpx; display: flex; align-items: center; justify-content: center; line-height: 1;
}
.upload-add-icon { font-size: 40rpx; color: #CCCCCC; line-height: 1; }

.reject-banner {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: #FFF0F0;
}

.reject-banner-text {
  font-size: 26rpx;
  color: $color-danger;
  flex: 1;
  line-height: 36rpx;
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
  color: $text-secondary;
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
  color: $text-tertiary;
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
  color: $text-tertiary;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 0;
}

.progress-label {
  font-size: 26rpx;
  color: $text-secondary;
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
  background: linear-gradient(90deg, $color-primary, $color-primary-light);
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.progress-value {
  font-size: 26rpx;
  color: $color-primary;
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
  background: linear-gradient(135deg, $color-primary, $color-primary-light);
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 2rpx;
}

.btn-submit:active {
  opacity: 0.9;
}
</style>
