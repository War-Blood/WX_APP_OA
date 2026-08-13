import { onMounted, onUnmounted, nextTick, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts'

/**
 * ECharts 实例生命周期管理：懒初始化 + 窗口 resize + 卸载销毁。
 * 消除 calendar.vue / personnel-distribution.vue 中重复的 init/resize/dispose 样板。
 */
export function useECharts(
  elRef: Ref<HTMLElement | undefined>,
  opts?: { notMerge?: boolean },
) {
  // shallowRef：避免 ref 的 UnwrapRef 深展开 echarts 实例类型（会丢失类私有成员导致类型不匹配）
  const instance = shallowRef<echarts.ECharts | null>(null)

  async function ensureInstance(): Promise<echarts.ECharts | null> {
    if (instance.value) return instance.value
    if (elRef.value) {
      instance.value = echarts.init(elRef.value)
      return instance.value
    }
    // 容器尚未渲染（如 v-loading/v-if 场景），等下一帧再初始化
    await nextTick()
    if (elRef.value) {
      instance.value = echarts.init(elRef.value)
      return instance.value
    }
    return null
  }

  async function setOption(option: echarts.EChartsOption) {
    const chart = await ensureInstance()
    if (!chart) return
    chart.setOption(option, opts?.notMerge ?? true)
  }

  function resize() {
    instance.value?.resize()
  }

  function dispose() {
    instance.value?.dispose()
    instance.value = null
  }

  onMounted(() => {
    window.addEventListener('resize', resize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', resize)
    dispose()
  })

  return { setOption, resize, dispose, instance }
}
