<template>
  <view class="page">
    <NavBar title="写日报" :showBack="true">
      <template #right>
        <view class="nav-draft-btn" @tap="saveDraft">
          <text class="nav-draft-text">保存草稿</text>
        </view>
      </template>
    </NavBar>

    <!-- 代填提示 -->
    <view v-if="showSubstituteMsg" class="substitute-bar">
      <view class="substitute-icon">📋</view>
      <view class="substitute-info">
        <text class="substitute-title">当日公出日志已提交</text>
        <text class="substitute-desc">由 {{ substituteInfo?.submittedBy || '同事' }} 代填</text>
      </view>
      <view class="substitute-action" @tap="goToDetail">
        <text class="substitute-action-text">查看日志</text>
      </view>
    </view>

    <scroll-view v-if="!showSubstituteMsg" class="content-scroll" scroll-y>
      <!-- 日志类型 Tab -->
      <view class="type-tab-bar">
        <view
          v-for="tab in typeTabs"
          :key="tab.key"
          class="type-tab-item"
          :class="{ 'type-tab-active': currentTab === tab.key }"
          @tap="switchTab(tab.key)"
        >
          <text class="type-tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- 日期选择 -->
      <view class="section-card">
        <view class="form-group">
          <text class="form-label">
            {{ currentTab === 'biz_trip_supplement' ? '补录日期' : '选择日期' }}
          </text>
          <picker
            mode="date"
            :value="reportDate"
            :end="todayStr"
            @change="onDateChange"
          >
            <view class="form-picker">
              <text class="picker-value">{{ reportDate }}</text>
              <text class="picker-icon">▾</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 工作类型选择 -->
      <view class="section-card">
        <text class="section-title">工作类型 <text class="required">*</text></text>
        <picker
          mode="selector"
          :range="workTypes"
          @change="e => selectedWorkType = workTypes[e.detail.value]"
        >
          <view class="form-picker">
            <text class="picker-value" :class="{ 'picker-placeholder': !selectedWorkType }">
              {{ selectedWorkType || '请选择工作类型' }}
            </text>
            <text class="picker-icon">▾</text>
          </view>
        </picker>
      </view>

      <!-- ========== 公出日志 / 补公出日志 表单 ========== -->
      <template v-if="currentTab !== 'office'">
        <!-- 内容区（请假/调休时隐藏） -->
        <view v-if="showContentFields" class="biz-trip-fields">
          <!-- 项目信息 -->
          <view class="section-card">
            <text class="section-title">项目信息</text>
            <view class="form-group">
              <text class="form-label">项目名称 <text class="required">*</text></text>
              <view class="worker-trigger" @tap="showProjectPicker = true">
                <text v-if="!formData.project" class="worker-placeholder">选择项目（可搜索）</text>
                <text v-else style="font-size:28rpx;color:#333;">{{ formData.project }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </view>
            <view class="form-group">
              <text class="form-label">项目区域 <text class="required">*</text></text>
              <picker mode="region" :value="areaRegion" @change="onAreaChange" class="form-picker">
                <view class="picker-trigger" :class="{ 'picker-placeholder': !formData.area }">
                  <text>{{ formData.area || '请选择省/市/区' }}</text>
                  <text class="picker-arrow">›</text>
                </view>
              </picker>
            </view>
            <view class="form-group">
              <text class="form-label">关联方</text>
              <picker
                v-if="relatedPartyHistory.length > 0"
                mode="selector"
                :range="relatedPartyHistory"
                @change="e => formData.relatedParty = relatedPartyHistory[e.detail.value]"
              >
                <view class="form-picker">
                  <text class="picker-value" :class="{ 'picker-placeholder': !formData.relatedParty }">
                    {{ formData.relatedParty || '从历史记录选择' }}
                  </text>
                  <text class="picker-icon">▾</text>
                </view>
              </picker>
              <input v-else class="form-input" placeholder="请输入关联方" v-model="formData.relatedParty" />
            </view>
          </view>

          <!-- 作业信息 -->
          <view class="section-card">
            <text class="section-title">作业信息</text>
            <view class="form-group">
              <text class="form-label">作业人员 <text class="required">*</text></text>
              <view class="worker-trigger" @tap="showWorkerPicker = true">
                <text v-if="selectedWorkerIds.length === 0" class="worker-placeholder">选择作业人员（可多选）</text>
                <text v-else class="worker-placeholder" style="color:#333;">
                  已选 {{ selectedWorkerIds.length }} 人
                </text>
                <text class="picker-arrow">›</text>
              </view>
              <!-- 已选人员标签 -->
              <view v-if="selectedWorkerIds.length > 0" class="worker-tags">
                <view
                  v-for="wid in selectedWorkerIds"
                  :key="wid"
                  class="worker-tag"
                  @tap="removeWorker(wid)"
                >
                  <text class="worker-tag-text">{{ getWorkerName(wid) }}</text>
                  <text class="worker-tag-close">×</text>
                </view>
              </view>
            </view>
            <view class="form-group">
              <text class="form-label">机型</text>
              <view class="worker-trigger" @tap="showMachinePicker = true">
                <text v-if="!formData.machineModel" class="worker-placeholder">选择机型（可搜索）</text>
                <text v-else style="font-size:28rpx;color:#333;">{{ formData.machineModel }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </view>
            <view class="form-group">
              <text class="form-label">工作内容</text>
              <textarea
                class="form-textarea"
                placeholder="如 IPC故障处理、叶片振动传感器安装"
                v-model="formData.workContent"
                maxlength="200"
              />
            </view>
          </view>

          <!-- 工作量 -->
          <view class="section-card">
            <text class="section-title">工作量统计</text>
            <view class="form-row">
              <view class="form-group form-half">
                <text class="form-label">需求数量</text>
                <input class="form-input" placeholder="0" type="number" v-model.number="formData.requiredQty" />
              </view>
              <view class="form-group form-half">
                <text class="form-label">完成数量</text>
                <input class="form-input" placeholder="0" type="number" v-model.number="formData.completedQty" />
              </view>
            </view>
          </view>
        </view>

        <!-- 今日工作（始终显示） -->
        <view class="section-card">
          <text class="section-title">今日工作</text>
          <view class="form-group">
            <text class="form-label">今日工作小结 <text class="required">*</text></text>
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
          <view class="form-group">
            <text class="form-label">明日工作类型</text>
            <picker
              mode="selector"
              :range="workTypes"
              @change="e => formData.tomorrowWorkType = workTypes[e.detail.value]"
            >
              <view class="form-picker">
                <text class="picker-value" :class="{ 'picker-placeholder': !formData.tomorrowWorkType }">
                  {{ formData.tomorrowWorkType || '请选择明日工作类型' }}
                </text>
                <text class="picker-icon">▾</text>
              </view>
            </picker>
          </view>
          <view class="form-group">
            <text class="form-label">明日工作内容</text>
            <textarea
              class="form-textarea form-textarea-sm"
              placeholder="请输入明日工作内容..."
              v-model="formData.tomorrowWork"
              maxlength="1000"
            />
          </view>
          <view class="form-group">
            <text class="form-label">备注</text>
            <textarea
              class="form-textarea form-textarea-sm"
              placeholder="选填"
              v-model="formData.remark"
              maxlength="500"
            />
          </view>
        </view>

        <!-- 补公出额外字段 -->
        <view v-if="currentTab === 'biz_trip_supplement'" class="section-card">
          <text class="section-title">补录信息</text>
          <view class="form-group">
            <text class="form-label">补录日期 <text class="required">*</text></text>
            <picker
              mode="date"
              :value="formData.supplementDate || reportDate"
              :end="todayStr"
              @change="e => formData.supplementDate = e.detail.value"
            >
              <view class="form-picker">
                <text class="picker-value" :class="{ 'picker-placeholder': !formData.supplementDate }">
                  {{ formData.supplementDate || '请选择补录日期' }}
                </text>
                <text class="picker-icon">▾</text>
              </view>
            </picker>
          </view>
          <view class="form-group">
            <text class="form-label">补录原因 <text class="required">*</text></text>
            <textarea
              class="form-textarea form-textarea-sm"
              placeholder="请说明为什么漏填..."
              v-model="formData.supplementReason"
              maxlength="500"
            />
          </view>
          <view class="supplement-notice">
            <text class="notice-text">提交后将进入审核流程，审核通过后计入有效日志</text>
          </view>
        </view>
      </template>

      <!-- ========== 公司日报 表单 ========== -->
      <template v-if="currentTab === 'office'">
        <view class="section-card">
          <text class="section-title">今日工作</text>
          <view class="form-group">
            <text class="form-label">今日工作内容 <text class="required">*</text></text>
            <textarea
              class="form-textarea"
              placeholder="请详细描述今日工作内容..."
              v-model="formData.todayWork"
              maxlength="2000"
              @input="onTodayWorkInput"
            />
            <text class="word-count" style="position:static;text-align:right;display:block;">{{ todayWorkLength }}/2000</text>
          </view>
        </view>
        <view class="section-card">
          <text class="section-title">计划与问题</text>
          <view class="form-group">
            <text class="form-label">明日工作计划</text>
            <textarea
              class="form-textarea form-textarea-sm"
              placeholder="请输入明日工作计划..."
              v-model="formData.tomorrowPlan"
              maxlength="1000"
            />
          </view>
          <view class="form-group">
            <text class="form-label">遇到的问题</text>
            <textarea
              class="form-textarea form-textarea-sm"
              placeholder="选填"
              v-model="formData.issues"
              maxlength="500"
            />
          </view>
          <view class="form-group">
            <text class="form-label">需协调事项</text>
            <textarea
              class="form-textarea form-textarea-sm"
              placeholder="选填"
              v-model="formData.coordination"
              maxlength="500"
            />
          </view>
        </view>
      </template>

      <view class="bottom-placeholder"></view>
    </scroll-view>

    <!-- 提交按钮 -->
    <view v-if="!showSubstituteMsg" class="bottom-bar">
      <view class="btn-submit" @tap="handleSubmit">提交{{ submitLabel }}</view>
    </view>

    <!-- 花名册选人组件 -->
    <worker-picker
      :visible="showWorkerPicker"
      v-model="selectedWorkerIds"
      @confirm="onWorkerConfirm"
      @cancel="showWorkerPicker = false"
    />

    <!-- 项目选择弹窗 -->
    <view v-if="showProjectPicker" class="popup-mask" @tap="showProjectPicker = false">
      <view class="popup-panel" @tap.stop>
        <view class="popup-header">
          <text class="popup-title">选择项目</text>
          <text class="popup-close" @tap="showProjectPicker = false">取消</text>
        </view>
        <view class="popup-search">
          <input
            class="popup-search-input"
            placeholder="搜索项目名称..."
            v-model="projectSearchKeyword"
            @input="onProjectSearch"
          />
        </view>
        <scroll-view class="popup-list" scroll-y>
          <view
            v-for="p in filteredProjects"
            :key="p"
            class="popup-item"
            :class="{ 'popup-item-active': formData.project === p }"
            @tap="selectProject(p)"
          >
            <text class="popup-item-text">{{ p }}</text>
          </view>
          <view v-if="projectSearchKeyword && !filteredProjects.includes(projectSearchKeyword)" class="popup-item" @tap="selectProject(projectSearchKeyword)">
            <text class="popup-item-text" style="color:#2B6DE8;">+ 新增 "{{ projectSearchKeyword }}"</text>
          </view>
          <view v-if="filteredProjects.length === 0 && !projectSearchKeyword" class="popup-empty">
            <text class="popup-empty-text">暂无项目数据，可输入新项目名称</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 机型选择弹窗 -->
    <view v-if="showMachinePicker" class="popup-mask" @tap="showMachinePicker = false">
      <view class="popup-panel" @tap.stop>
        <view class="popup-header">
          <text class="popup-title">选择机型</text>
          <text class="popup-close" @tap="showMachinePicker = false">取消</text>
        </view>
        <view class="popup-search">
          <input
            class="popup-search-input"
            placeholder="搜索或输入新机型..."
            v-model="machineSearchKeyword"
            @input="onMachineSearch"
          />
        </view>
        <scroll-view class="popup-list" scroll-y>
          <view
            v-for="m in filteredMachineOptions"
            :key="m"
            class="popup-item"
            :class="{ 'popup-item-active': formData.machineModel === m }"
            @tap="selectMachine(m)"
          >
            <text class="popup-item-text">{{ m }}</text>
          </view>
          <view v-if="machineSearchKeyword && !filteredMachineOptions.includes(machineSearchKeyword)" class="popup-item" @tap="selectMachine(machineSearchKeyword)">
            <text class="popup-item-text" style="color:#2B6DE8;">+ 新增 "{{ machineSearchKeyword }}"</text>
          </view>
          <view v-if="filteredMachineOptions.length === 0 && !machineSearchKeyword" class="popup-empty">
            <text class="popup-empty-text">暂无机型数据，请手动输入</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { onUnload, onHide } from '@dcloudio/uni-app'
import NavBar from '@/components/nav-bar/nav-bar.vue'
import workerPicker from '@/components/worker-picker/index.vue'
import { reportApi } from '@/services/modules/report'
import { adminApi } from '@/services/modules/admin'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// ===== 常量 =====
const typeTabs = [
  { key: 'biz_trip', label: '公出日志' },
  { key: 'biz_trip_supplement', label: '补公出日志' },
  { key: 'office', label: '公司日报' }
]

const workTypes = ['工作（陆）', '工作（海）', '待工', '在途', '请假', '调休']

// 机型数据：从本地存储加载历史+内置列表
function loadMachineHistory() {
  try {
    const raw = uni.getStorageSync('machine_history')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
const builtinMachines = ['MySE233', 'MySE200', 'MySE160', 'MySE121', 'EN121', 'EN141', 'GW121', 'GW140', 'V120', 'H120']
const allMachineOptions = ref([...loadMachineHistory(), ...builtinMachines])

// ===== 响应式状态 =====
const currentTab = ref('biz_trip')
const reportDate = ref(formatToday())
const selectedWorkType = ref('')
const selectedWorkerIds = ref([])
const showWorkerPicker = ref(false)
const showMachineDropdown = ref(false)
const showMachinePicker = ref(false)
const showProjectPicker = ref(false)
const showSubstituteMsg = ref(false)
const substituteInfo = ref(null)
const todayWorkLength = ref(0)
const workerListCache = ref([])
const relatedPartyHistory = ref([])
const projectSearchKeyword = ref('')
const projectList = ref([])
const machineSearchKeyword = ref('')

const formData = ref({
  project: '',
  area: '',
  relatedParty: '',
  machineModel: '',
  workContent: '',
  requiredQty: 0,
  completedQty: 0,
  remark: '',
  todayWork: '',
  tomorrowWork: '',
  tomorrowWorkType: '',
  supplementDate: '',
  supplementReason: '',
  tomorrowPlan: '',
  issues: '',
  coordination: ''
})

// 省市区选择器初始值
const areaRegion = ref([])

function onAreaChange(e) {
  areaRegion.value = e.detail.value
  formData.value.area = e.detail.value.join('-')
}

// ===== 计算属性 =====
const todayStr = computed(() => formatToday())

const submitLabel = computed(() => {
  if (currentTab.value === 'biz_trip_supplement') return '公出日志'
  if (currentTab.value === 'office') return '公司日报'
  return '公出日志'
})

const isLeaveOrRest = computed(() => {
  return selectedWorkType.value === '请假' || selectedWorkType.value === '调休'
})

const showContentFields = computed(() => {
  if (currentTab.value === 'office') return false
  return !isLeaveOrRest.value
})

const filteredMachineOptions = computed(() => {
  const kw = (machineSearchKeyword.value || '').toLowerCase()
  if (!kw) return allMachineOptions.value.slice(0, 20)
  return allMachineOptions.value.filter(m => m.toLowerCase().includes(kw)).slice(0, 20)
})

const filteredProjects = computed(() => {
  const kw = (projectSearchKeyword.value || '').toLowerCase()
  if (!kw) return projectList.value.slice(0, 30)
  return projectList.value.filter(p => p.toLowerCase().includes(kw)).slice(0, 30)
})

// ===== 工具函数 =====
function formatToday() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function loadRelatedPartyHistory() {
  try {
    const raw = uni.getStorageSync('related_party_history')
    if (raw) {
      relatedPartyHistory.value = JSON.parse(raw)
    }
  } catch { /* ignore */ }
}

function saveRelatedPartyHistory(name) {
  if (!name) return
  const list = relatedPartyHistory.value.filter(n => n !== name)
  list.unshift(name)
  if (list.length > 20) list.pop()
  relatedPartyHistory.value = list
  uni.setStorageSync('related_party_history', JSON.stringify(list))
}

function getWorkerName(userId) {
  const w = workerListCache.value.find(item => item.userId === userId)
  return w ? w.userName : 'UID' + userId
}

// ===== 生命周期 =====
onMounted(async () => {
  // 加载关联方历史
  loadRelatedPartyHistory()

  // 加载草稿
  const autoDraft = uni.getStorageSync('report_auto_draft')
  if (autoDraft) {
    try {
      const saved = JSON.parse(autoDraft)
      if (saved.currentTab) currentTab.value = saved.currentTab
      if (saved.reportDate) reportDate.value = saved.reportDate
      if (saved.selectedWorkType) selectedWorkType.value = saved.selectedWorkType
      if (saved.selectedWorkerIds) selectedWorkerIds.value = saved.selectedWorkerIds
      Object.keys(formData.value).forEach(k => {
        if (saved[k] !== undefined) formData.value[k] = saved[k]
      })
      if (saved.todayWork) todayWorkLength.value = saved.todayWork.length
    } catch { /* ignore */ }
  }

  // 加载花名册缓存
  try {
    const res = await adminApi.getWorkerList({ pageSize: 100, fieldWorkerOnly: true })
    if (res.code === 0) {
      workerListCache.value = res.data.list || []
    }
  } catch { /* ignore */ }

  // 加载项目列表
  loadProjects()

  // 代填检测
  await checkDuplicate()
})

// 自动保存草稿（2s 防抖）
let saveTimer = null
watch(
  () => [currentTab.value, reportDate.value, selectedWorkType.value, selectedWorkerIds.value, formData.value],
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const draft = {
        currentTab: currentTab.value,
        reportDate: reportDate.value,
        selectedWorkType: selectedWorkType.value,
        selectedWorkerIds: selectedWorkerIds.value,
        ...formData.value,
        savedAt: new Date().toISOString()
      }
      uni.setStorageSync('report_auto_draft', JSON.stringify(draft))
    }, 2000)
  },
  { deep: true }
)

function autoSaveDraft() {
  if (!formData.value.project && !formData.value.todayWork && !formData.value.workContent) return
  const draft = {
    currentTab: currentTab.value,
    reportDate: reportDate.value,
    selectedWorkType: selectedWorkType.value,
    selectedWorkerIds: selectedWorkerIds.value,
    ...formData.value,
    savedAt: new Date().toISOString()
  }
  uni.setStorageSync('report_auto_draft', JSON.stringify(draft))
}

onUnload(() => autoSaveDraft())
onHide(() => autoSaveDraft())

// ===== 方法 =====
function switchTab(key) {
  currentTab.value = key
  if (key === 'office') {
    selectedWorkType.value = ''
    selectedWorkerIds.value = []
  } else if (!selectedWorkType.value) {
    // 公出/补公出默认选第一个工作类型
    selectedWorkType.value = workTypes[0]
  }
}

function onDateChange(e) {
  reportDate.value = e.detail.value
  // 日期变更后重新检测代填
  checkDuplicate()
}

function onTodayWorkInput(e) {
  todayWorkLength.value = e.detail.value.length
}

async function checkDuplicate() {
  showSubstituteMsg.value = false
  substituteInfo.value = null
  if (currentTab.value === 'office') return
  try {
    const res = await reportApi.checkDuplicate({
      userId: userStore.userInfo?.id,
      reportDate: reportDate.value
    })
    if (res.code === 2001) {
      showSubstituteMsg.value = true
      substituteInfo.value = res.data || {}
    }
  } catch { /* ignore */ }
}

function onWorkerConfirm(ids) {
  selectedWorkerIds.value = ids
  showWorkerPicker.value = false
}

function removeWorker(userId) {
  const idx = selectedWorkerIds.value.indexOf(userId)
  if (idx > -1) selectedWorkerIds.value.splice(idx, 1)
}

function goToDetail() {
  if (substituteInfo.value?.reportId) {
    uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + substituteInfo.value.reportId })
  }
}

// ===== 机型搜索 =====
function onMachineSearch() { /* 由 computed 自动过滤 */ }
function selectMachine(name) {
  formData.value.machineModel = name
  showMachinePicker.value = false
  machineSearchKeyword.value = ''
}
function saveMachineToHistory(name) {
  if (!name) return
  const list = allMachineOptions.value.filter(m => m !== name)
  list.unshift(name)
  if (list.length > 50) list.pop()
  allMachineOptions.value = list
  uni.setStorageSync('machine_history', JSON.stringify(list.filter(m => !builtinMachines.includes(m)).slice(0, 20)))
}

// ===== 项目选择 =====
async function loadProjects() {
  try {
    // 从历史日报中提取项目列表
    const res = await reportApi.getList({ pageSize: 200 })
    if (res.code === 0 && res.data?.list) {
      const projects = [...new Set(res.data.list.map(r => r.project).filter(Boolean))]
      projectList.value = projects.sort()
    }
  } catch { /* ignore */ }
}
function onProjectSearch() { /* 由 computed 自动处理 */ }
function selectProject(name) {
  formData.value.project = name
  showProjectPicker.value = false
  projectSearchKeyword.value = ''
}

// ===== 保存草稿 =====
async function saveDraft() {
  uni.showLoading({ title: '保存草稿...' })
  try {
    const payload = {
      userId: userStore.userInfo?.id,
      reportType: currentTab.value,
      reportDate: reportDate.value,
      formData: { ...formData.value }
    }
    await reportApi.saveDraft(payload)
    uni.hideLoading()
    uni.showToast({ title: '草稿已保存', icon: 'success' })
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '保存失败，已存本地', icon: 'none' })
  }
}

// ===== 提交 =====
async function handleSubmit() {
  // 基础校验
  if (!reportDate.value) {
    uni.showToast({ title: '请选择日期', icon: 'none' })
    return
  }
  if (!selectedWorkType.value && currentTab.value !== 'office') {
    uni.showToast({ title: '请选择工作类型', icon: 'none' })
    return
  }

  // 公出日志/补公出：内容区可见时校验
  if (currentTab.value !== 'office' && showContentFields.value) {
    if (!formData.value.project) {
      uni.showToast({ title: '请输入项目名称', icon: 'none' })
      return
    }
    if (!formData.value.area) {
      uni.showToast({ title: '请输入项目区域', icon: 'none' })
      return
    }
    if (selectedWorkerIds.value.length === 0) {
      uni.showToast({ title: '请选择作业人员', icon: 'none' })
      return
    }
  }

  // 今日工作小结校验（公出/补公出时始终校验，公司日报时校验）
  if (currentTab.value === 'office') {
    if (!formData.value.todayWork) {
      uni.showToast({ title: '请输入今日工作内容', icon: 'none' })
      return
    }
  }

  // 补公出额外校验
  if (currentTab.value === 'biz_trip_supplement') {
    if (!formData.value.supplementDate) {
      uni.showToast({ title: '请选择补录日期', icon: 'none' })
      return
    }
    if (!formData.value.supplementReason) {
      uni.showToast({ title: '请填写补录原因', icon: 'none' })
      return
    }
    if (!formData.value.todayWork) {
      uni.showToast({ title: '请填写今日工作小结', icon: 'none' })
      return
    }
  }

  uni.showLoading({ title: '提交中...' })
  try {
    const payload = {
      reportType: currentTab.value,
      reportDate: reportDate.value,
      todayWorkType: selectedWorkType.value,
      tomorrowWorkType: formData.value.tomorrowWorkType || selectedWorkType.value,
      entryDate: userStore.entryDate,
      initialBizTripDate: userStore.entryDate,
      workerIds: isLeaveOrRest.value ? [] : selectedWorkerIds.value,
      project: formData.value.project,
      area: formData.value.area,
      relatedParty: formData.value.relatedParty,
      machineModel: formData.value.machineModel,
      workContent: formData.value.workContent,
      requiredQty: formData.value.requiredQty,
      completedQty: formData.value.completedQty,
      remark: formData.value.remark,
      todayWork: formData.value.todayWork,
      tomorrowPlan: formData.value.tomorrowWork || formData.value.tomorrowPlan,
      supplementDate: formData.value.supplementDate,
      supplementReason: formData.value.supplementReason,
      issues: formData.value.issues,
      coordination: formData.value.coordination
    }

    const res = await reportApi.submit(payload)
    uni.hideLoading()

    if (res.code === 2001) {
      // 提交时被代填拦截
      showSubstituteMsg.value = true
      substituteInfo.value = res.data || {}
      uni.showToast({ title: res.message || '已由他人代填', icon: 'none' })
      return
    }

    // 清除草稿
    uni.removeStorageSync('report_auto_draft')

    // 保存关联方历史
    if (formData.value.relatedParty) {
      saveRelatedPartyHistory(formData.value.relatedParty)
    }
    // 保存机型历史
    if (formData.value.machineModel) {
      saveMachineToHistory(formData.value.machineModel)
    }

    // 保存上次提交用于回填
    uni.setStorageSync('report_last_submission', JSON.stringify({
      project: formData.value.project,
      area: formData.value.area,
      relatedParty: formData.value.relatedParty,
      machineModel: formData.value.machineModel,
      workContent: formData.value.workContent,
      todayWorkType: selectedWorkType.value
    }))

    const msg = currentTab.value === 'biz_trip_supplement' ? '已提交，等待管理员审核' : '提交成功'
    uni.showToast({ title: msg, icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch {
    uni.hideLoading()
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
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

.nav-draft-btn {
  padding: 8rpx 20rpx;
}
.nav-draft-text {
  font-size: 26rpx;
  color: #2B6DE8;
}

/* 代填提示 */
.substitute-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  margin: 24rpx;
  background: #FFF8E1;
  border-radius: 16rpx;
  border: 1rpx solid #FFE082;
}
.substitute-icon {
  font-size: 44rpx;
  flex-shrink: 0;
}
.substitute-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.substitute-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #F57F17;
}
.substitute-desc {
  font-size: 24rpx;
  color: #F9A825;
}
.substitute-action {
  padding: 12rpx 24rpx;
  background: #F57F17;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.substitute-action-text {
  font-size: 24rpx;
  color: #FFFFFF;
}

/* 类型 Tab */
.type-tab-bar {
  display: flex;
  margin: 16rpx 24rpx;
  background: #FFFFFF;
  border-radius: 12rpx;
  padding: 6rpx;
}
.type-tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  border-radius: 10rpx;
  transition: background 0.2s;
}
.type-tab-active {
  background: #2B6DE8;
}
.type-tab-text {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
}
.type-tab-active .type-tab-text {
  color: #FFFFFF;
}

/* 内容滚动 */
.content-scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
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

.required {
  color: #EF4444;
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
.picker-icon {
  font-size: 28rpx;
  color: #999999;
  line-height: 1;
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
.form-textarea-sm {
  min-height: 100rpx;
}

.word-count {
  position: absolute;
  bottom: 12rpx;
  right: 16rpx;
  font-size: 22rpx;
  color: $text-secondary;
}

/* 搜索下拉 */
.search-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: #FFFFFF;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.1);
  max-height: 320rpx;
  overflow-y: auto;
  z-index: 100;
}
.search-dropdown-item {
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #333;
  border-bottom: 1rpx solid #F0F0F0;
}
.search-dropdown-item:active {
  background: #F7F8FA;
}

/* 作业人员 */
.worker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  min-height: 72rpx;
}
.worker-placeholder {
  font-size: 28rpx;
  color: #C0C4CC;
}
.picker-arrow {
  font-size: 36rpx;
  color: #B0B0B0;
  transform: rotate(90deg);
}

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
.worker-tag-text {
  font-size: 24rpx;
  color: #2B6DE8;
}
.worker-tag-close {
  font-size: 28rpx;
  color: #2B6DE8;
  padding: 0 4rpx;
}

/* 补公出提示 */
.supplement-notice {
  margin-top: 16rpx;
  padding: 16rpx;
  background: #FFF8E1;
  border-radius: 8rpx;
}
.notice-text {
  font-size: 24rpx;
  color: #F59E0B;
}

/* 弹窗（项目选择） */
.popup-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}
.popup-panel {
  width: 100%;
  max-height: 70vh;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
}
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
}
.popup-title { font-size: 32rpx; font-weight: 600; color: #333; }
.popup-close { font-size: 28rpx; color: #999; }
.popup-search { padding: 0 32rpx 16rpx; }
.popup-search-input {
  height: 72rpx;
  padding: 0 20rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  font-size: 28rpx;
  width: 100%;
  box-sizing: border-box;
}
.popup-list { max-height: 500rpx; padding: 0 32rpx; }
.popup-item {
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid #F0F0F0;
}
.popup-item-text { font-size: 28rpx; color: #333; }
.popup-item-active { background: #EDF2FF; border-radius: 8rpx; }
.popup-item-active .popup-item-text { color: #2B6DE8; font-weight: 500; }
.popup-empty { padding: 40rpx; text-align: center; }
.popup-empty-text { font-size: 26rpx; color: #999; }

.bottom-placeholder {
  height: 60rpx;
}

/* 底部提交栏 */
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
</style>
