import { ref, computed } from 'vue'

export function usePagination(fetchFn, initialParams = {}) {
  const list = ref([])
  const loading = ref(false)
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const hasMore = computed(() => list.value.length < total.value)

  let debounceTimer = null

  async function loadMore() {
    if (loading.value || !hasMore.value) return
    loading.value = true
    try {
      const res = await fetchFn({ page: page.value, pageSize: pageSize.value, ...initialParams })
      const data = res.data || {}
      if (page.value === 1) {
        list.value = data.list || []
      } else {
        list.value = list.value.concat(data.list || [])
      }
      total.value = data.total || 0
      page.value++
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    page.value = 1
    await loadMore()
  }

  function reset() {
    list.value = []
    page.value = 1
    total.value = 0
    loading.value = false
  }

  function debouncedLoadMore(delay = 300) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      loadMore()
    }, delay)
  }

  return {
    list,
    loading,
    hasMore,
    page,
    pageSize,
    total,
    loadMore,
    refresh,
    reset,
    debouncedLoadMore
  }
}
