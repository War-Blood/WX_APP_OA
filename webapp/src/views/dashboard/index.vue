<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getStatsHome } from '@/api/stats'
import { getUserList } from '@/api/user'

const router = useRouter()
const loading = ref(true)

interface MetricCard {
  title: string
  value: number
  icon: string
  color: string
  bg: string
}

const metrics = ref<MetricCard[]>([
  { title: '用户总数', value: 0, icon: 'User', color: '#2B6DE8', bg: '#E6F1FB' },
  { title: '待审核', value: 0, icon: 'DocumentChecked', color: '#F59E0B', bg: '#FEF3E2' },
  { title: '日报总数', value: 0, icon: 'Document', color: '#22C55E', bg: '#E6F9EE' },
  { title: '活跃项目', value: 0, icon: 'FolderOpened', color: '#EF4444', bg: '#FEE2E2' },
])

const shortcuts = [
  { title: '用户管理', path: '/user', icon: 'User', desc: '管理用户与权限' },
  { title: '审批管理', path: '/approval', icon: 'DocumentChecked', desc: '处理审批流程' },
  { title: '日报管理', path: '/report', icon: 'Document', desc: '查看日报统计' },
  { title: '组织架构', path: '/org', icon: 'Share', desc: '管理部门层级' },
  { title: '考勤日历', path: '/attendance', icon: 'Calendar', desc: '排班与出勤' },
  { title: '合规管理', path: '/compliance', icon: 'Verified', desc: '合规数据看板' },
]

onMounted(async () => {
  loading.value = true
  try {
    const [statsRes, userRes] = await Promise.allSettled([
      getStatsHome(),
      getUserList({ pageSize: 1 }),
    ])

    if (statsRes.status === 'fulfilled' && statsRes.value) {
      const s = statsRes.value as any
      if (s.pendingCount !== undefined) metrics.value[1].value = s.pendingCount
      if (s.reportCount !== undefined) metrics.value[2].value = s.reportCount
      if (s.projectCount !== undefined) metrics.value[3].value = s.projectCount
    }
    if (userRes.status === 'fulfilled' && userRes.value) {
      metrics.value[0].value = userRes.value.total ?? 0
    }
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <!-- 度量卡片 -->
    <div class="metrics-grid">
      <div v-for="m in metrics" :key="m.title" class="metric-card" v-loading="loading">
        <div class="metric-icon" :style="{ background: m.bg, color: m.color }">
          <el-icon :size="24"><component :is="m.icon" /></el-icon>
        </div>
        <div class="metric-body">
          <div class="metric-value">{{ m.value.toLocaleString() }}</div>
          <div class="metric-title">{{ m.title }}</div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="section">
      <div class="section-title">快捷入口</div>
      <div class="shortcuts-grid">
        <div v-for="s in shortcuts" :key="s.path" class="shortcut-card" @click="router.push(s.path)">
          <div class="shortcut-icon">
            <el-icon :size="22"><component :is="s.icon" /></el-icon>
          </div>
          <div class="shortcut-body">
            <div class="shortcut-title">{{ s.title }}</div>
            <div class="shortcut-desc">{{ s.desc }}</div>
          </div>
          <el-icon class="shortcut-arrow" :size="14"><component :is="'ArrowRight'" /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .metric-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid #E4E7ED;
    transition: box-shadow 0.2s;
    &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.06); }

    .metric-icon {
      width: 48px; height: 48px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    .metric-body {
      .metric-value { font-size: 28px; font-weight: 600; color: #303133; line-height: 1.1; }
      .metric-title { font-size: 13px; color: #909399; margin-top: 4px; }
    }
  }

  .section {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #E4E7ED;
    padding: 20px;

    .section-title {
      font-size: 15px; font-weight: 600; color: #303133;
      margin-bottom: 16px;
    }
  }

  .shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    .shortcut-card {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px;
      border-radius: 8px;
      background: #F5F7FA;
      cursor: pointer;
      transition: all 0.15s;

      &:hover {
        background: #E6F1FB;
        .shortcut-arrow { opacity: 1; transform: translateX(2px); }
      }

      .shortcut-icon {
        width: 40px; height: 40px; border-radius: 8px;
        background: #fff; color: #2B6DE8;
        display: flex; align-items: center; justify-content: center;
      }

      .shortcut-body {
        flex: 1;
        .shortcut-title { font-size: 14px; font-weight: 500; color: #303133; }
        .shortcut-desc { font-size: 12px; color: #909399; margin-top: 2px; }
      }

      .shortcut-arrow {
        color: #C0C4CC; opacity: 0;
        transition: all 0.15s;
      }
    }
  }
}
</style>
