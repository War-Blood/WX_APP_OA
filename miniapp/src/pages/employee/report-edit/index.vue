<template>
  <view class="page">
    <NavBar title="写日报" :showBack="true">
      <template #right>
        <view class="nav-draft-btn" @tap="saveDraft">
          <text class="nav-draft-text">保存草稿</text>
        </view>
      </template>
    </NavBar>


    <!-- 今日状态提示 -->
    <view v-if="todayStatusBar.visible && !showSubstituteMsg" class="today-status-bar" :class="'status-' + todayStatusBar.type">
      <view class="status-icon">{{ todayStatusBar.icon }}</view>
      <view class="status-content">
        <text class="status-title">{{ todayStatusBar.title }}</text>
        <text v-if="todayStatusBar.desc" class="status-desc">{{ todayStatusBar.desc }}</text>
      </view>
      <view v-if="todayStatusBar.actionLabel" class="status-action" @tap="todayStatusBar.action">
        <text class="status-action-text">{{ todayStatusBar.actionLabel }}</text>
      </view>
    </view>

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

    <scroll-view v-if="showForm" class="content-scroll" scroll-y>
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
          <text class="form-label">填写日期</text>
          <picker
            mode="date"
            :value="reportDate"
            :start="currentTab === 'office' ? '' : (isLeave ? '' : yesterdayStr)"
            :end="currentTab === 'office' ? todayStr : (isLeave ? '' : todayStr)"
            @change="onDateChange"
          >
            <view class="form-picker">
              <text class="picker-value">{{ reportDate }}</text>
              <text class="picker-icon">▾</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 工作类型选择（工作日报 office 不填工作类型） -->
      <view v-if="currentTab !== 'office'" class="section-card">
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
        <!-- 请假/调休：仅显示作业人员 -->
        <view v-if="isLeave" class="section-card">
          <text class="section-title">作业信息</text>
          <view class="form-group">
            <text class="form-label">作业人员 <text class="required">*</text></text>
            <view class="worker-trigger" @tap="showWorkerPicker = true">
              <text v-if="selectedWorkerIds.length === 0" class="worker-placeholder">选择作业人员（可多选）</text>
              <text v-else class="worker-placeholder worker-placeholder--selected">
                已选 {{ selectedWorkerIds.length }} 人
              </text>
              <text class="picker-arrow">›</text>
            </view>
            <view v-if="selectedWorkerIds.length > 0" class="worker-tags">
              <view v-for="wid in selectedWorkerIds" :key="wid" class="worker-tag" @tap="removeWorker(wid)">
                <text class="worker-tag-text">{{ getWorkerName(wid) }}</text>
                <text class="worker-tag-close">×</text>
              </view>
            </view>
          </view>
          <view class="form-group">
            <text class="form-label">备注原因</text>
            <textarea class="form-textarea" placeholder="请假/调休原因..." v-model="formData.remark" maxlength="500" />
          </view>
        </view>

        <!-- 内容区（请假/调休时隐藏） -->
        <view v-if="showContentFields" class="biz-trip-fields">
          <!-- 项目信息 -->
          <view class="section-card">
            <text class="section-title">项目信息</text>
            <view class="form-group">
              <text class="form-label">项目名称 <text class="required">*</text></text>
              <view class="worker-trigger" @tap="showProjectPicker = true">
                <text v-if="!formData.project" class="worker-placeholder">选择项目（可搜索）</text>
                <text v-else class="picker-value">{{ formData.project }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </view>
            <view class="form-group">
              <text class="form-label">入场时间</text>
              <picker mode="date" :value="formData.entryDate" @change="e => formData.entryDate = e.detail.value">
                <view class="form-picker">
                  <text class="picker-value" :class="{ 'picker-placeholder': !formData.entryDate }">{{ formData.entryDate || '请选择入场时间' }}</text>
                  <text class="picker-icon">▾</text>
                </view>
              </picker>
            </view>
            <view class="form-group">
              <text class="form-label">初始出差时间 <text class="required">*</text></text>
              <picker mode="date" :value="formData.initialBizTripDate" @change="e => formData.initialBizTripDate = e.detail.value">
                <view class="form-picker">
                  <text class="picker-value" :class="{ 'picker-placeholder': !formData.initialBizTripDate }">{{ formData.initialBizTripDate || '请选择初始出差时间' }}</text>
                  <text class="picker-icon">▾</text>
                </view>
              </picker>
            </view>
            <view class="form-group">
              <text class="form-label">项目区域 <text class="required">*</text></text>
              <view class="picker-row">
                <picker mode="region" :value="areaRegion" @change="onAreaChange" class="picker-flex">
                  <view class="form-picker">
                    <text class="picker-value" :class="{ 'picker-placeholder': !formData.area }">
                      {{ formData.area || '请选择省/市/区' }}
                    </text>
                    <text class="picker-icon">▾</text>
                  </view>
                </picker>
                <view class="locate-btn" @tap="locateArea" hover-class="locate-btn-hover">
                  <text class="locate-icon">📍</text>
                </view>
              </view>
            </view>
            <view class="form-group">
              <text class="form-label">关联方</text>
              <input class="form-input" placeholder="请输入关联方" v-model="formData.relatedParty" />
              <!-- 历史记录快捷建议(点击填入) -->
              <view v-if="relatedPartyHistory.length > 0 && !formData.relatedParty" class="rp-history">
                <text
                  v-for="rp in relatedPartyHistory"
                  :key="rp"
                  class="rp-history-tag"
                  @tap="formData.relatedParty = rp"
                >{{ rp }}</text>
              </view>
            </view>
          </view>

          <!-- 作业信息 -->
          <view class="section-card">
            <text class="section-title">作业信息</text>
            <view class="form-group">
              <text class="form-label">作业人员 <text class="required">*</text></text>
              <view class="worker-trigger" @tap="showWorkerPicker = true">
                <text v-if="selectedWorkerIds.length === 0" class="worker-placeholder">选择作业人员（可多选）</text>
                <text v-else class="worker-placeholder worker-placeholder--selected">
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
              <view class="worker-trigger" @tap="showMachineInput = true">
                <text v-if="machineModels.length === 0" class="worker-placeholder">点击添加机型（可多选）</text>
                <text v-else class="worker-placeholder worker-placeholder--selected">已选 {{ machineModels.length }} 个机型</text>
                <text class="picker-arrow">+</text>
              </view>
              <!-- 已选机型标签 -->
              <view v-if="machineModels.length > 0" class="worker-tags">
                <view
                  v-for="(m, idx) in machineModels"
                  :key="idx"
                  class="worker-tag"
                  @tap.stop="removeMachineTag(idx)"
                >
                  <text class="worker-tag-text">{{ m }}</text>
                  <text class="worker-tag-close">×</text>
                </view>
              </view>
            </view>
            <view class="form-group">
              <text class="form-label">工作内容 <text class="required">*</text></text>
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
                <text class="form-label">需求数量 <text class="required">*</text></text>
                <input class="form-input" placeholder="0" type="number" v-model.number="formData.requiredQty" />
              </view>
              <view class="form-group form-half">
                <text class="form-label">完成数量 <text class="required">*</text></text>
                <input class="form-input" placeholder="0" type="number" v-model.number="formData.completedQty" />
              </view>
            </view>
          </view>
        </view>

        <!-- 今日工作（请假/调休时隐藏） -->
        <view v-if="!isLeave" class="section-card">
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
            <text class="word-count word-count-static">{{ todayWorkLength }}/2000</text>
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
    <view v-if="showForm" class="bottom-bar">
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
            <text class="popup-item-text popup-item-text--primary">+ 新增 "{{ projectSearchKeyword }}"</text>
          </view>
          <view v-if="filteredProjects.length === 0 && !projectSearchKeyword" class="popup-empty">
            <text class="popup-empty-text">暂无项目数据，可输入新项目名称</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 机型输入弹窗（多选 tags） -->
    <view v-if="showMachineInput" class="popup-mask" @tap="showMachineInput = false">
      <view class="popup-panel popup-panel--short" @tap.stop>
        <view class="popup-header">
          <text class="popup-title">添加机型</text>
          <text class="popup-close" @tap="showMachineInput = false">完成</text>
        </view>
        <view class="popup-search">
          <input
            class="popup-search-input"
            placeholder="输入机型名称"
            v-model="machineInputText"
            @confirm="addMachineTag"
          />
          <view class="popup-add-btn" @tap="addMachineTag">
            <text class="popup-add-btn-text">添加</text>
          </view>
        </view>
        <!-- 历史建议 -->
        <scroll-view v-if="filteredMachineSuggestions.length > 0" class="popup-list popup-list--short" scroll-y>
          <view
            v-for="m in filteredMachineSuggestions"
            :key="m"
            class="popup-item"
            @tap="addMachineTagFromSuggestion(m)"
          >
            <text class="popup-item-text">{{ m }}</text>
          </view>
        </scroll-view>
        <view v-else class="popup-empty popup-empty--compact">
          <text class="popup-empty-text">输入新机型名称后点"添加"或按回车</text>
        </view>
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
import { showSuccess, showError, showToast } from '@/utils/toast'

const userStore = useUserStore()

// ===== 常量 =====
const typeTabs = [
  { key: 'biz_trip', label: '公出日志' },
  { key: 'biz_trip_supplement', label: '补公出日志' },
  { key: 'office', label: '工作日报' }
]

const workTypes = ['工作（陆）', '工作（海）', '待工', '在途']

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
const leaveStartDate = ref('')
const leaveEndDate = ref('')
const selectedWorkType = ref('')
const selectedWorkerIds = ref([])
const showWorkerPicker = ref(false)
const showProjectPicker = ref(false)
const showMachineInput = ref(false)
const showSubstituteMsg = ref(false)
const substituteInfo = ref(null)

// 仅被代填时隐藏表单（已提交时保留表单可见，方便切换日期重试）
const showForm = computed(() => !showSubstituteMsg.value)
const todayWorkLength = ref(0)
const workerListCache = ref([])
const relatedPartyHistory = ref([])
const projectSearchKeyword = ref('')
const projectList = ref([])
const machineInputText = ref('')
const machineModels = ref([])
// 提交成功后置位，防止 onUnload/onHide 的 autoSaveDraft 把已提交表单重新写回草稿
const justSubmitted = ref(false)

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
  coordination: '',
  entryDate: '',
  initialBizTripDate: ''
})

// 省市区选择器初始值
const areaRegion = ref([])

function onAreaChange(e) {
  areaRegion.value = e.detail.value
  formData.value.area = e.detail.value.join('-')
}

async function locateArea() {
  try {
    uni.showLoading({ title: '定位中...' })
    const loc = await new Promise((resolve, reject) => {
      uni.getLocation({ type: 'gcj02', success: resolve, fail: reject })
    })
    const res = await uni.chooseLocation({
      latitude: loc.latitude,
      longitude: loc.longitude
    })
    if (res.address) {
      // 尝试解析省市区
      const parts = res.address.replace(/省|市|区/g, (m) => `${m}|`).split('|').filter(Boolean)
      const province = parts.find(p => p.includes('省')) || res.address.slice(0, 3)
      const city = parts.find(p => p.includes('市')) || ''
      const district = parts.find(p => p.includes('区') || p.includes('县')) || ''
      areaRegion.value = [province, city, district].filter(Boolean)
      formData.value.area = areaRegion.value.join('-') || res.address
    }
    uni.hideLoading()
    showSuccess('定位成功')
  } catch (err) {
    uni.hideLoading()
    if (err?.errMsg?.includes('auth deny')) {
      uni.showModal({
        title: '需要位置权限',
        content: '请在小程序设置中开启位置权限后重试',
        showCancel: false
      })
    } else {
      showError('定位失败，请手动选择')
    }
  }
}

// ===== 计算属性 =====
const todayStr = computed(() => formatToday())
const yesterdayStr = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
})

const submitLabel = computed(() => {
  if (currentTab.value === 'biz_trip_supplement') return '公出日志'
  if (currentTab.value === 'office') return '工作日报'
  return '公出日志'
})

const isLeave = computed(() => {
  return selectedWorkType.value === '请假' || selectedWorkType.value === '调休'
})

// 切换工作类型时自动刷新日期为今天
watch(selectedWorkType, () => {
  reportDate.value = formatToday()
})

const showContentFields = computed(() => {
  if (currentTab.value === 'office') return false
  return !isLeave.value
})

const filteredMachineSuggestions = computed(() => {
  const kw = (machineInputText.value || '').toLowerCase()
  const selected = new Set(machineModels.value.map(m => m.toLowerCase()))
  let list = allMachineOptions.value.filter(m => !selected.has(m.toLowerCase()))
  if (kw) list = list.filter(m => m.toLowerCase().includes(kw))
  // 如果输入了关键词且不在已选和候选中，不显示额外条目（用户通过回车添加）
  return list.slice(0, 15)
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

// ===== 今日状态栏 =====
const todayStatusBar = ref({
  visible: false,
  type: 'info',     // info | warning | success
  icon: '📋',
  title: '',
  desc: '',
  actionLabel: '',
  action: null
})

function setTodayStatusBar(type, title, desc, actionLabel, action) {
  const config = {
    none:      { icon: '📝', typeClass: 'info' },
    draft:     { icon: '📄', typeClass: 'warning' },
    submitted: { icon: '✅', typeClass: 'success' },
  }
  const cfg = config[type] || config.none
  todayStatusBar.value = {
    visible: true,
    type: cfg.typeClass,
    icon: cfg.icon,
    title,
    desc: desc || '',
    actionLabel: actionLabel || '',
    action: action || null
  }
}

async function checkTodayStatus() {
  // 重置
  todayStatusBar.value.visible = false
  showSubstituteMsg.value = false
  substituteInfo.value = null

  // 补公出日志：补录日期为空时不检测（避免用今天日期误导用户）
  if (currentTab.value === 'biz_trip_supplement' && !formData.value.supplementDate) return

  // 补公出日志：使用补录日期作为检测日期
  const effectiveDate = (currentTab.value === 'biz_trip_supplement')
    ? formData.value.supplementDate
    : reportDate.value

  try {
    const res = await reportApi.getTodayStatus({
      reportDate: effectiveDate
    })
    const data = res.data || {}
    const isOffice = currentTab.value === 'office'

    // 工作日报（office）无作业人员概念、不可被代填；substituted 视为需要填写
    if (!isOffice && (res.code === 2001 || data.status === 'substituted')) {
      // 被代填 → 显示代填黄色条
      showSubstituteMsg.value = true
      substituteInfo.value = data
      return
    }

    if (data.status === 'submitted') {
      const title = isOffice ? `${effectiveDate} 工作日报已提交` : '今日公出日志已提交'
      const desc = isOffice ? '已完成该日期的工作日报填写' : '您已完成今日的公出日志填写'
      setTodayStatusBar('submitted', title, desc, '查看日志', () => {
        if (data.reportId) {
          uni.navigateTo({ url: '/pages/employee/report-detail/index?id=' + data.reportId })
        }
      })
    } else if (data.status === 'draft') {
      setTodayStatusBar('draft',
        '您有未完成的草稿',
        '上次填写的草稿已自动恢复，请继续完成',
        '',
        null
      )
    } else {
      // none — 需要填写
      setTodayStatusBar('none',
        isOffice ? '请填写该日期工作日报' : '今日需提交公出日志',
        '请在下方填写今日工作内容后提交',
        '',
        null
      )
    }
  } catch {
    // API 异常时不显示状态栏，用户可正常填写
    todayStatusBar.value.visible = false
  }
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
      if (saved.leaveStartDate) leaveStartDate.value = saved.leaveStartDate
      if (saved.leaveEndDate) leaveEndDate.value = saved.leaveEndDate
      Object.keys(formData.value).forEach(k => {
        if (saved[k] !== undefined) formData.value[k] = saved[k]
      })
      if (saved.todayWork) todayWorkLength.value = saved.todayWork.length
      // 恢复机型多选数组
      if (saved.machineModel) {
        machineModels.value = saved.machineModel.split(/[,，、]+/).filter(Boolean)
      }
    } catch { /* ignore */ }
  }

  // 工作日报：打开页面时编写日期跳转到当天（覆盖草稿恢复的历史日期）
  if (currentTab.value === 'office') {
    reportDate.value = formatToday()
  }

  // 无草稿时从上次提交预填
  if (!autoDraft) {
    try {
      const lastSub = uni.getStorageSync('report_last_submission')
      if (lastSub) {
        const saved = JSON.parse(lastSub)
        if (saved.project) formData.value.project = saved.project
        if (saved.area) {
          formData.value.area = saved.area
          areaRegion.value = saved.area.split('-')
        }
        if (saved.relatedParty) formData.value.relatedParty = saved.relatedParty
        if (saved.workContent) formData.value.workContent = saved.workContent
        if (saved.todayWorkType) selectedWorkType.value = saved.todayWorkType
        if (saved.machineModel) {
          machineModels.value = saved.machineModel.split(/[,，、]+/).filter(Boolean)
        }
      }
    } catch { /* ignore */ }
  }

  // 加载花名册缓存
  try {
    const res = await adminApi.getWorkerList({ pageSize: 200 })
    if (res.code === 0) {
      workerListCache.value = res.data.list || []
    }
  } catch { /* ignore */ }

  // 加载项目列表
  loadProjects()

  // 今日状态检测（替代旧 checkDuplicate，覆盖自己已提交/草稿/被代填）
  await checkTodayStatus()
})

// 补录日期变化时重新检测状态（避免加载时补录日期为空导致日期不一致）
watch(() => formData.value.supplementDate, () => {
  if (currentTab.value === 'biz_trip_supplement') {
    checkTodayStatus()
  }
})

// 自动保存草稿（2s 防抖）
let saveTimer = null
watch(
  () => [currentTab.value, reportDate.value, selectedWorkType.value, selectedWorkerIds.value, formData.value],
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (justSubmitted.value) return
      const draft = {
        currentTab: currentTab.value,
        reportDate: reportDate.value,
        selectedWorkType: selectedWorkType.value,
        selectedWorkerIds: selectedWorkerIds.value,
        ...formData.value,
        machineModel: machineModels.value.join(','),
        leaveStartDate: leaveStartDate.value,
        leaveEndDate: leaveEndDate.value,
        savedAt: new Date().toISOString()
      }
      uni.setStorageSync('report_auto_draft', JSON.stringify(draft))
    }, 2000)
  },
  { deep: true }
)

function autoSaveDraft() {
  if (justSubmitted.value) return
  if (!formData.value.project && !formData.value.todayWork && !formData.value.workContent
      && !formData.value.tomorrowPlan && !formData.value.issues && !formData.value.coordination) return
  const draft = {
    currentTab: currentTab.value,
    reportDate: reportDate.value,
    selectedWorkType: selectedWorkType.value,
    selectedWorkerIds: selectedWorkerIds.value,
    ...formData.value,
    machineModel: machineModels.value.join(','),
    leaveStartDate: leaveStartDate.value,
    leaveEndDate: leaveEndDate.value,
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
    // 工作日报：打开时编写日期跳转到当天
    reportDate.value = formatToday()
    // 注意：不再清空公出/补公出表单字段与已选作业人员——工作日报提交已由 A 策略（payload 按类型
    // 裁剪）+ 后端 normalizeOfficeReport 兜底清理；物理清空会导致切回公出时已填内容丢失、破坏回填。
    // 工作日报同样显示「已提交」状态提示条，防止重复提交
    showSubstituteMsg.value = false
    checkTodayStatus()
  } else {
    // 公出/补公出默认选第一个工作类型
    if (!selectedWorkType.value) selectedWorkType.value = workTypes[0]
    checkTodayStatus()
  }
}

function onDateChange(e) {
  reportDate.value = e.detail.value
  // 日期变更后重新检测状态
  checkTodayStatus()
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

// ===== 机型多选 tags =====
function addMachineTag() {
  const name = (machineInputText.value || '').trim()
  if (!name) return
  if (machineModels.value.includes(name)) {
    showError('该机型已添加')
    machineInputText.value = ''
    return
  }
  machineModels.value.push(name)
  machineInputText.value = ''
  // 保存到历史
  saveMachineToHistory(name)
}
function addMachineTagFromSuggestion(name) {
  if (machineModels.value.includes(name)) {
    showError('该机型已添加')
    return
  }
  machineModels.value.push(name)
  machineInputText.value = ''
  saveMachineToHistory(name)
}
function removeMachineTag(idx) {
  machineModels.value.splice(idx, 1)
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
  // A 策略：工作日报草稿不携带公出/补公出专属字段（防残留默认值）
  const isOfficeDraft = currentTab.value === 'office'
  const payload = {
    ...formData.value,
    userId: userStore.userInfo?.id,
    reportType: currentTab.value,
    reportDate: reportDate.value,
    todayWorkType: isOfficeDraft ? '' : selectedWorkType.value,
    tomorrowWorkType: isOfficeDraft ? '' : (formData.value.tomorrowWorkType || selectedWorkType.value),
    entryDate: isOfficeDraft ? '' : (formData.value.entryDate || userStore.entryDate),
    initialBizTripDate: isOfficeDraft ? '' : (formData.value.initialBizTripDate || userStore.entryDate),
    workerIds: isOfficeDraft ? [] : selectedWorkerIds.value,
    leaveStartDate: undefined,
    leaveEndDate: undefined
  }
  try {
    await reportApi.saveDraft(payload)
    uni.hideLoading()
    showSuccess('草稿已保存')
  } catch {
    uni.hideLoading()
    showError('保存失败，已存本地')
    uni.setStorageSync('report_auto_draft', payload)
  }
}

// ===== 提交 =====
async function handleSubmit() {
  // 基础校验
  if (!reportDate.value) {
    showError('请选择日期')
    return
  }
  if (!selectedWorkType.value && currentTab.value !== 'office') {
    showError('请选择工作类型')
    return
  }

  // 请假/调休：校验作业人员
  if (isLeave.value) {
    if (selectedWorkerIds.value.length === 0) {
      showError('请选择作业人员')
      return
    }
  }

  // 公出日志/补公出：内容区可见时校验
  if (currentTab.value !== 'office' && showContentFields.value) {
    if (!formData.value.project) {
      showError('请输入项目名称')
      return
    }
    if (!formData.value.area) {
      showError('请输入项目区域')
      return
    }
    if (!formData.value.initialBizTripDate) {
      showError('请选择初始出差时间')
      return
    }
    if (!formData.value.workContent) {
      showError('请输入工作内容')
      return
    }
    if (formData.value.requiredQty == null || formData.value.requiredQty === '') {
      showError('请输入需求数量')
      return
    }
    if (formData.value.completedQty == null || formData.value.completedQty === '') {
      showError('请输入完成数量')
      return
    }
    if (selectedWorkerIds.value.length === 0) {
      showError('请选择作业人员')
      return
    }
  }

  // 今日工作小结必填校验：与 UI 显示条件严格对齐
  // office 始终显示；公出/补公出在「非请假/调休」时显示；显示才校验
  const todayWorkVisible =
    currentTab.value === 'office' || !isLeave.value
  if (todayWorkVisible && !formData.value.todayWork) {
    const label = currentTab.value === 'office' ? '今日工作内容' : '今日工作小结'
    showError(`请输入${label}`)
    return
  }

  // 补公出额外校验
  if (currentTab.value === 'biz_trip_supplement') {
    if (!formData.value.supplementDate) {
      showError('请选择补录日期')
      return
    }
    if (!formData.value.supplementReason) {
      showError('请填写补录原因')
      return
    }
    if (!formData.value.todayWork) {
      showError('请填写今日工作小结')
      return
    }
  }

  uni.showLoading({ title: '提交中...' })
  try {
    // 补公出日志：reportDate 使用补录日期（后端据此做重复检测）
    const effectiveDate = (currentTab.value === 'biz_trip_supplement' && formData.value.supplementDate)
      ? formData.value.supplementDate
      : reportDate.value

    // A 策略：按日志类型裁剪 payload——工作日报（office）不携带公出/补公出专属字段，
    // 避免残留默认值（workContent/entryDate/initialBizTripDate/数量/明日类型等）随工作日报上传
    const isOfficeSubmit = currentTab.value === 'office'
    const payload = isOfficeSubmit
      ? {
          reportType: 'office',
          reportDate: effectiveDate,
          remark: formData.value.remark,
          todayWork: formData.value.todayWork,
          tomorrowPlan: formData.value.tomorrowWork || formData.value.tomorrowPlan,
          issues: formData.value.issues,
          coordination: formData.value.coordination
        }
      : {
          reportType: currentTab.value,
          reportDate: effectiveDate,
          todayWorkType: selectedWorkType.value,
          tomorrowWorkType: formData.value.tomorrowWorkType || selectedWorkType.value,
          entryDate: formData.value.entryDate || userStore.entryDate,
          initialBizTripDate: formData.value.initialBizTripDate || userStore.entryDate,
          workerIds: selectedWorkerIds.value,
          project: isLeave.value ? selectedWorkType.value : formData.value.project,
          area: formData.value.area,
          relatedParty: formData.value.relatedParty,
          machineModel: machineModels.value.join(','),
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
      // code 2001 可能来自：
      // A) 被代填 → 显示代填条 + 隐藏表单
      // B) 重复提交/其他业务错误 → 仅 toast 提示
      const msg = res.message || ''
      if (msg.includes('代填')) {
        showSubstituteMsg.value = true
        substituteInfo.value = res.data || {}
      }
      showError(msg || '操作失败')
      return
    }

    // 清除草稿；置位防 navigateBack 的 onUnload/onHide 再次保存
    uni.removeStorageSync('report_auto_draft')
    justSubmitted.value = true

    // 保存关联方历史
    if (formData.value.relatedParty) {
      saveRelatedPartyHistory(formData.value.relatedParty)
    }
    // 保存机型历史（多个）
    if (machineModels.value.length > 0) {
      machineModels.value.forEach(m => saveMachineToHistory(m))
    }

    // 保存上次提交用于回填（仅公出/补公出：工作日报提交会清空公出字段，避免空值覆盖缓存导致下次预填"内容丢失"）
    if (currentTab.value !== 'office') {
      uni.setStorageSync('report_last_submission', JSON.stringify({
        project: formData.value.project,
        area: formData.value.area,
        relatedParty: formData.value.relatedParty,
        machineModel: machineModels.value.join(','),
        workContent: formData.value.workContent,
        todayWorkType: selectedWorkType.value
      }))
    }

    const msg = currentTab.value === 'biz_trip_supplement' ? '已提交，等待管理员审核' : '提交成功'
    showSuccess(msg)
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (err) {
    // 先关 loading 再给反馈：若先 showError 后 hideLoading，微信会立刻关掉刚显示的 toast
    uni.hideLoading()
    showError((err && err.message) || '提交失败')
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
  color: $primary-color;
}

/* 代填提示 */
/* 今日状态提示条 */
.today-status-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  margin: 24rpx;
  border-radius: 16rpx;
}
.today-status-bar.status-info {
  background: #E8F0FE;
  border: 1rpx solid #B3D4FC;
}
.today-status-bar.status-warning {
  background: #FFF3E0;
  border: 1rpx solid #FFCC80;
}
.today-status-bar.status-success {
  background: #E8F5E9;
  border: 1rpx solid #A5D6A7;
}
.status-icon {
  font-size: 44rpx;
  flex-shrink: 0;
}
.status-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.status-title {
  font-size: $font-base;
  font-weight: 600;
}
.status-info .status-title { color: #1565C0; }
.status-warning .status-title { color: #E65100; }
.status-success .status-title { color: #2E7D32; }
.status-desc {
  font-size: 24rpx;
}
.status-info .status-desc { color: #1976D2; }
.status-warning .status-desc { color: #EF6C00; }
.status-success .status-desc { color: #388E3C; }
.status-action {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.status-info .status-action { background: #1565C0; }
.status-warning .status-action { background: #E65100; }
.status-success .status-action { background: #2E7D32; }
.status-action-text {
  font-size: 24rpx;
  color: $bg-white;
}

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
  font-size: $font-base;
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
  color: $bg-white;
}

/* 类型 Tab */
.type-tab-bar {
  display: flex;
  margin: 16rpx 24rpx;
  background: $bg-card;
  border-radius: $radius-base;
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
  background: $primary-color;
}
.type-tab-text {
  font-size: 26rpx;
  color: $text-regular;
  font-weight: 500;
}
.type-tab-active .type-tab-text {
  color: $bg-white;
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
  color: $danger-color;
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
  background: $bg-form;
  border-radius: $radius-base;
  font-size: $font-base;
  color: $text-primary;
  box-sizing: border-box;
  width: 100%;
}

.rp-history {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 12rpx;
}

.rp-history-tag {
  padding: 6rpx 20rpx;
  background: $primary-bg;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: $primary-color;
}

.form-picker {
  height: 72rpx;
  padding: 0 20rpx;
  background: $bg-form;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-value {
  font-size: $font-base;
  color: $text-primary;
}
.picker-placeholder {
  color: $text-secondary;
}
.picker-icon {
  font-size: $font-base;
  color: $text-secondary;
  line-height: 1;
}

.textarea-wrap {
  position: relative;
}

.form-textarea {
  min-height: 144rpx;
  padding: 16rpx 20rpx;
  background: $bg-form;
  border-radius: $radius-base;
  font-size: $font-base;
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
  font-size: $font-xs;
  color: $text-secondary;
}
.word-count-static {
  position: static;
  text-align: right;
  display: block;
}

/* 搜索下拉 */
.search-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  background: $bg-card;
  border-radius: $radius-base;
  box-shadow: 0 4rpx 24rpx rgba(0,0,0,0.1);
  max-height: 320rpx;
  overflow-y: auto;
  z-index: 100;
}
.search-dropdown-item {
  padding: 20rpx 24rpx;
  font-size: $font-base;
  color: $text-primary;
  border-bottom: 1rpx solid $border-light;
}
.search-dropdown-item:active {
  background: $bg-form;
}

/* 作业人员 */
.worker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: $bg-form;
  border-radius: $radius-base;
  min-height: 72rpx;
}
.worker-placeholder {
  font-size: $font-base;
  color: $text-placeholder;
}
.worker-placeholder--selected {
  color: $text-primary;
}
.picker-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.picker-flex {
  flex: 1;
}

.picker-flex .form-picker {
  width: 100%;
}

.locate-btn {
  width: 64rpx;
  height: 72rpx;
  background: $bg-form;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.locate-btn-hover {
  background: #E8ECF2;
  transform: scale(0.95);
}

.locate-icon {
  font-size: 32rpx;
  line-height: 1;
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
  background: $primary-bg;
  border-radius: 8rpx;
}
.worker-tag-text {
  font-size: 24rpx;
  color: $primary-color;
}
.worker-tag-close {
  font-size: $font-base;
  color: $primary-color;
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
  color: $warning-color;
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
  background: $bg-card;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
}
.popup-panel--short {
  max-height: 50vh;
}
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
}
.popup-title { font-size: 32rpx; font-weight: 600; color: $text-primary; }
.popup-close { font-size: $font-base; color: $text-secondary; }
.popup-search {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 0 32rpx 16rpx;
}
.popup-search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: $bg-form;
  border-radius: $radius-base;
  font-size: $font-base;
  box-sizing: border-box;
}
.popup-add-btn {
  flex-shrink: 0;
  height: 72rpx;
  padding: 0 28rpx;
  background: $primary-color;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  justify-content: center;
}
.popup-add-btn-text {
  font-size: 26rpx;
  color: $bg-white;
  font-weight: 500;
}
.popup-list { max-height: 500rpx; padding: 0 32rpx; }
.popup-list--short { max-height: 360rpx; }
.popup-item {
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid $border-light;
}
.popup-item-text { font-size: $font-base; color: $text-primary; }
.popup-item-text--primary { color: $primary-color; }
.popup-item-active { background: $primary-bg; border-radius: $radius-sm; }
.popup-item-active .popup-item-text { color: $primary-color; font-weight: 500; }
.popup-empty { padding: 40rpx; text-align: center; }
.popup-empty--compact { padding: 32rpx; }
.popup-empty-text { font-size: 26rpx; color: $text-secondary; }

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
  color: $bg-white;
  letter-spacing: 2rpx;
}
.btn-submit:active {
  opacity: 0.9;
}
</style>
