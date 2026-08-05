<template>
  <div class="stats-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">成绩统计</span>
          <el-select v-model="selectedPaper" placeholder="选择试卷" style="width:240px" @change="loadStats">
            <el-option v-for="p in paperOptions" :key="p.id" :label="p.title" :value="p.id" />
          </el-select>
        </div>
      </template>
      <template v-if="stats">
        <el-row :gutter="16" style="margin-bottom:20px">
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val">{{ stats.avgScore }}</div><div class="stat-lbl">平均分</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val" style="color:#22C55E">{{ stats.passRate }}%</div><div class="stat-lbl">通过率</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val">{{ stats.total }}</div><div class="stat-lbl">参考人数</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val" style="color:#EF4444">{{ stats.cheatCount }}</div><div class="stat-lbl">作弊人数</div></el-card></el-col>
        </el-row>
        <el-row :gutter="16" v-if="stats.distribution?.length">
          <el-col :span="24">
            <el-card><div style="text-align:center;font-weight:600;margin-bottom:12px">分数分布</div>
              <div v-for="d in stats.distribution" :key="d.range" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <span style="width:60px;font-size:13px;color:#606266">{{ d.range }}</span>
                <div style="flex:1;height:24px;background:#EDF2FF;border-radius:4px;overflow:hidden">
                  <div :style="{ width: (d.count / stats.total * 100) + '%', height: '100%', background: '#2B6DE8' }" />
                </div>
                <span style="width:40px;font-size:13px;color:#909399">{{ d.count }}人</span>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </template>
      <div v-else-if="selectedPaper" v-loading="loading" style="text-align:center;padding:40px;color:#909399">暂无数据</div>
      <div v-else style="text-align:center;padding:60px;color:#909399">请选择一份已发布试卷查看统计</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ExamStats, PaperRow } from '@/api/exam'
import { getExamStats, getPaperList } from '@/api/exam'

const selectedPaper = ref<number | null>(null)
const stats = ref<ExamStats | null>(null)
const loading = ref(false)
const paperOptions = ref<PaperRow[]>([])

async function loadStats() {
  if (!selectedPaper.value) return
  loading.value = true
  try { stats.value = await getExamStats(selectedPaper.value) }
  finally { loading.value = false }
}

onMounted(async () => {
  try {
    const res = await getPaperList({ pageSize: 99 })
    paperOptions.value = (res.list || []).filter(p => p.status === 'published')
  } catch { /* */ }
})
</script>

<style lang="scss" scoped>
.stats-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.stat-val { font-size: 32px; font-weight: 700; color: #333; text-align: center; }
.stat-lbl { font-size: 13px; color: #909399; text-align: center; margin-top: 4px; }
</style>
