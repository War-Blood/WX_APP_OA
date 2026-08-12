<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { listStatsViews, type StatsView } from '@/api/statsView'

const props = defineProps<{ statKey: string }>()
const emit = defineEmits<{ change: [number | null] }>()

const views = ref<StatsView[]>([])
const selectedId = ref<number | ''>('')

async function load() {
  try {
    views.value = await listStatsViews(props.statKey)
  } catch { views.value = [] }
}
function onChange(v: number | '') {
  selectedId.value = v
  emit('change', v === '' ? null : Number(v))
}

onMounted(load)
watch(() => props.statKey, () => { selectedId.value = ''; load() })
</script>

<template>
  <span class="view-selector">
    <el-select
      :model-value="selectedId"
      placeholder="视图"
      size="small"
      style="width: 160px"
      @update:model-value="onChange"
    >
      <el-option label="默认（全部）" :value="''" />
      <el-option v-for="v in views" :key="v.id" :label="v.isLocked ? v.name + ' 🔒' : v.name" :value="v.id" />
    </el-select>
  </span>
</template>

<style scoped>
.view-selector { margin-left: 12px; }
</style>
