import { toast } from '@/utils/toast'
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getStatsHome } from '@/api/stats'
import { getUserList } from '@/api/user'
import { getReviewList } from '@/api/report'

// 全部从 API 加载
const loading = ref(true)

// 统计卡片（从 stats/home 获取）
const statistics = ref([
  { title: '用户总数', value: 0, icon: 'User', color: '#409EFF' },
  { title: '待审核', value: 0, icon: 'DocumentChecked', color: '#E6A23C' },
  { title: '日报总数', value: 0, icon: 'Document', color: '#67C23A' },
  { title: '活跃项目', value: 0, icon: 'FolderOpened', color: '#F56C6C' }
])

// 最近动态（从 stats/activities 获取）
const activities = ref<Array<{ text: string; time: string; date: string; type: string }>>([])

// 快捷入口
const shortcuts = ref([
  { title: '用户管理', path: '/user', icon: 'User' },
  { title: '审批管理', path: '/approval', icon: 'DocumentChecked' },
  { title: '日报管理', path: '/report', icon: 'Document' },
  { title: '项目管理', path: '/project', icon: 'FolderOpened' }
])

onMounted(async () => {
  loading.value = true
  try {
    const [statsRes, userRes, reviewRes] = await Promise.allSettled([
      getStatsHome(),
      getUserList({ pageSize: 1 }),
      getReviewList({ pageSize: 1, status: 'pending' })
    ])

    if (statsRes.status === 'fulfilled' && statsRes.value) {
      const s = statsRes.value as any
      statistics.value[1].value = s.pendingCount ?? s.reviewCount ?? 0
    }
    if (userRes.status === 'fulfilled' && userRes.value) {
      statistics.value[0].value = userRes.value.total ?? 0
    }
    if (reviewRes.status === 'fulfilled' && reviewRes.value) {
      statistics.value[2].value = reviewRes.value.total ?? 0
    }
  } catch {
    toast.warning('部分统计数据加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="statistics">
      <el-col :span="6" v-for="item in statistics" :key="item.title">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content" v-loading="loading">
            <div class="stat-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
              <el-icon :size="32">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-title">{{ item.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 + 动态 -->
    <el-row :gutter="16" class="main-content">
      <el-col :span="16">
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="card-header"><span>快捷入口</span></div>
          </template>
          <div class="shortcuts">
            <div v-for="item in shortcuts" :key="item.title" class="shortcut-item" @click="$router.push(item.path)">
              <el-icon :size="24"><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="section-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>最近动态</span>
            </div>
          </template>
          <div class="todo-list">
            <div v-for="item in activities" :key="item.text" class="todo-item">
              <div class="todo-dot" :class="item.type"></div>
              <div class="todo-content">
                <div class="todo-title">{{ item.text }}</div>
                <div class="todo-time">{{ item.date }} {{ item.time }}</div>
              </div>
            </div>
            <el-empty v-if="!loading && activities.length === 0" description="暂无动态" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  .statistics { margin-bottom: 16px; }
  .stat-card .stat-content { display: flex; align-items: center; }
  .stat-icon {
    width: 64px; height: 64px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; margin-right: 16px;
  }
  .stat-value { font-size: 28px; font-weight: 600; color: $text-primary; line-height: 1.2; }
  .stat-title { font-size: 14px; color: $text-secondary; margin-top: 4px; }
  .main-content .section-card { height: 100%; .card-header { display: flex; align-items: center; justify-content: space-between; font-weight: 500; } }
  .shortcuts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    .shortcut-item {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; border-radius: 8px; cursor: pointer; transition: all .3s; background-color: $bg-color;
      &:hover { background-color: $primary-color; color: #fff; transform: translateY(-2px); }
      span { margin-top: 8px; font-size: 14px; }
    }
  }
  .todo-list .todo-item {
    display: flex; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid $border-lighter;
    &:last-child { border-bottom: none; }
    .todo-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 12px; margin-top: 6px; flex-shrink: 0;
      &.approval { background-color: $warning-color; } &.report { background-color: $success-color; } &.system { background-color: $primary-color; }
    }
    .todo-content .todo-title { font-size: 14px; color: $text-primary; }
    .todo-content .todo-time { font-size: 12px; color: $text-secondary; margin-top: 4px; }
  }
}
</style>
