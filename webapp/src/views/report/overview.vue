<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getStats, type AllStatsResponse } from '@/api/report'
import ReportStatsPanel from '@/components/ReportStatsPanel.vue'

const statsLoading = ref(true)
const summary = ref<AllStatsResponse | null>(null)

async function loadSummary() {
  statsLoading.value = true
  try {
    summary.value = await getStats('all')
  } catch {
    // ignore
  } finally {
    statsLoading.value = false
  }
}

onMounted(loadSummary)
</script>

<template>
  <ReportStatsPanel :stats="summary" :loading="statsLoading" />
</template>
