<script setup lang="ts">
defineProps<{
  visible: boolean
  data: Record<string, any> // any: 后端日报详情字段动态
  loading: boolean
}>()

defineEmits<{ 'update:visible': [value: boolean] }>()

function getReportTypeTag(reportType: string): { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' } {
  const map: Record<string, { text: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
    biz_trip: { text: '公出日志', type: 'success' },
    biz_trip_supplement: { text: '补公出', type: 'warning' },
    office: { text: '工作日报', type: 'info' }
  }
  return map[reportType] || { text: reportType, type: '' }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="日报详情"
    width="750px"
    destroy-on-close
    @update:model-value="$emit('update:visible', $event)"
  >
    <div v-loading="loading">
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="日期">{{ data.reportDate || data.date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag v-if="data.status === 'submitted'" type="info" size="small">已提交</el-tag>
          <el-tag v-else-if="data.status === 'pending'" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="data.status === 'approved'" type="success" size="small">已通过</el-tag>
          <el-tag v-else-if="data.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="日志类型">
          <el-tag :type="getReportTypeTag(data.reportType as string).type || 'info'" size="small">
            {{ getReportTypeTag(data.reportType as string).text }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="及时性">{{ data.timeliness === 'delayed' ? '延迟' : data.timeliness === 'on_time' ? '正常' : '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目">{{ data.project || '-' }}</el-descriptions-item>
        <el-descriptions-item label="区域">{{ data.area || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作业人员">{{ data.workers || '-' }}</el-descriptions-item>
        <el-descriptions-item label="机型">{{ data.machineModel || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工作类型">{{ data.todayWorkType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ data.workerCount || '-' }}</el-descriptions-item>
        <el-descriptions-item label="入场日期">{{ data.entryDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="初始出差日期">{{ data.initialBizTripDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="需求数量">{{ data.requiredQty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="完成数量">{{ data.completedQty ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="个人出差天数">{{ data.personalBizTripDays ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目出差天数">{{ data.bizTripDays ?? '-' }}</el-descriptions-item>
        <el-descriptions-item label="补录日期">{{ data.supplementDate || '-' }}</el-descriptions-item>
        <el-descriptions-item label="补录原因">{{ data.supplementReason || '-' }}</el-descriptions-item>
        <el-descriptions-item label="今日工作" :span="2">{{ data.todayWork || '-' }}</el-descriptions-item>
        <el-descriptions-item label="明日计划" :span="2">{{ data.tomorrowPlan || '-' }}</el-descriptions-item>
        <el-descriptions-item label="工作内容" :span="2">{{ data.workContent || '-' }}</el-descriptions-item>
        <el-descriptions-item label="相关方" :span="2">{{ data.relatedParty || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ data.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="问题反馈" :span="2">{{ data.issues || '-' }}</el-descriptions-item>
        <el-descriptions-item label="协调事项" :span="2">{{ data.content || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ data.createTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ data.updateTime || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </el-dialog>
</template>
