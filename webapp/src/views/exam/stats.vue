<template>
  <div class="stats-page">
    <el-card>
      <template #header>
        <div class="toolbar">
          <span class="title">答题统计</span>
          <el-select v-model="filterCategory" placeholder="按分类" clearable style="width:200px" @change="loadData">
            <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </div>
      </template>
      <div v-loading="loading">
        <el-row :gutter="16" style="margin-bottom:20px">
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val">{{ stats.people }}</div><div class="stat-lbl">答题人数</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val">{{ stats.total }}</div><div class="stat-lbl">记录数</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val">{{ stats.avgScore }}</div><div class="stat-lbl">平均分</div></el-card></el-col>
          <el-col :span="6"><el-card shadow="hover"><div class="stat-val" style="color:#22C55E">{{ stats.passRate }}%</div><div class="stat-lbl">通过率</div></el-card></el-col>
        </el-row>
        <el-card v-if="stats.total" shadow="never" style="margin-bottom:20px">
          <div style="text-align:center;font-weight:600;margin-bottom:12px">通过情况（{{ stats.passCount }}/{{ stats.total }}，{{ stats.passRate }}%）</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <span style="width:120px;font-size:13px;color:#606266">通过</span>
            <div style="flex:1;height:24px;background:#EDF2FF;border-radius:4px;overflow:hidden">
              <div :style="{ width: stats.passRate + '%', height: '100%', background: '#22C55E' }" />
            </div>
            <span style="width:60px;font-size:13px;color:#909399">{{ stats.passCount }}条</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="width:120px;font-size:13px;color:#606266">未通过</span>
            <div style="flex:1;height:24px;background:#EDF2FF;border-radius:4px;overflow:hidden">
              <div :style="{ width: (100 - stats.passRate) + '%', height: '100%', background: '#EF4444' }" />
            </div>
            <span style="width:60px;font-size:13px;color:#909399">{{ stats.total - stats.passCount }}条</span>
          </div>
        </el-card>
        <el-card v-if="stats.scoreSegments?.length" shadow="never" style="margin-bottom:20px">
          <div style="text-align:center;font-weight:600;margin-bottom:12px">分数段分布</div>
          <div v-for="seg in stats.scoreSegments" :key="seg.seg" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <span style="width:120px;font-size:13px;color:#606266">{{ seg.seg }}</span>
            <div style="flex:1;height:24px;background:#EDF2FF;border-radius:4px;overflow:hidden">
              <div :style="{ width: segPercentOf(seg.cnt) + '%', height: '100%', background: '#2B6DE8' }" />
            </div>
            <span style="width:60px;font-size:13px;color:#909399">{{ seg.cnt }}条</span>
          </div>
        </el-card>
        <el-card v-if="stats.distribution?.length" shadow="never">
          <div style="text-align:center;font-weight:600;margin-bottom:12px">分类答题量分布</div>
          <div v-for="d in stats.distribution" :key="d.id" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <span style="width:120px;font-size:13px;color:#606266">{{ d.name }}</span>
            <div style="flex:1;height:24px;background:#EDF2FF;border-radius:4px;overflow:hidden">
              <div :style="{ width: percentOf(d.cnt) + '%', height: '100%', background: '#2B6DE8' }" />
            </div>
            <span style="width:60px;font-size:13px;color:#909399">{{ d.cnt }}条</span>
          </div>
        </el-card>
        <div v-if="!stats.total" style="text-align:center;padding:40px;color:#909399">暂无答题数据</div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import type { StatsOverview } from '@/api/exam'
import { getStatsOverview, getCategoryList } from '@/api/exam'

const loading = ref(false)
const filterCategory = ref<number | null>(null)
const categoryOptions = ref<{ id: number; name: string }[]>([])
const stats = ref<StatsOverview>({ people: 0, total: 0, avgScore: 0, passCount: 0, passRate: 0, distribution: [], scoreSegments: [] })

function percentOf(cnt: number): number {
  const total = stats.value.distribution.reduce((s, d) => s + d.cnt, 0)
  return total ? Math.round(cnt / total * 100) : 0
}
function segPercentOf(cnt: number): number {
  const total = (stats.value.scoreSegments || []).reduce((sum, d) => sum + d.cnt, 0)
  return total ? Math.round(cnt / total * 100) : 0
}

async function loadData() {
  loading.value = true
  try {
    stats.value = await getStatsOverview({ categoryId: filterCategory.value || undefined })
  } catch { toast.error('加载失败') }
  finally { loading.value = false }
}

onMounted(async () => {
  try {
    const cats = await getCategoryList()
    categoryOptions.value = cats.map(c => ({ id: c.id, name: c.name }))
  } catch { /* */ }
  loadData()
})
</script>

<style lang="scss" scoped>
.stats-page { padding: 20px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; }
.title { font-size: 18px; font-weight: 600; }
.stat-val { font-size: 32px; font-weight: 700; color: #333; text-align: center; }
.stat-lbl { font-size: 13px; color: #909399; text-align: center; margin-top: 4px; }
</style>