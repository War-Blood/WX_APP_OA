import { storage } from '@/utils/storage'
import type { TableColumnCtx, TableInstance } from 'element-plus'

export interface UseTableColumnResizeOptions {
  /** 最小列宽（px），默认 40 */
  minWidth?: number
  /** 最大列宽（px），默认 1000 */
  maxWidth?: number
}

const STORAGE_PREFIX = 'report-table-widths:'

/** 列标识：优先 prop，其次 label（无 prop 的动态列/模板列兜底） */
function columnKey(col: TableColumnCtx<any>): string {
  return String(col.property ?? col.label ?? col.id)
}

/**
 * 表格列宽：拖拽调宽 + min/max 限制 + localStorage 跨会话持久化。
 * 复用 Element Plus 内置拖拽（border 表激活），通过 header-dragend 事件保存。
 * 用法：
 *   const { bindRef, onHeaderDragEnd } = useTableColumnResize('query')
 *   <el-table :ref="bindRef" border allow-drag-last-column @header-dragend="onHeaderDragEnd">
 * bindRef 支持单表（ref="bindRef"）与 v-for 多实例（:ref="bindRef"），挂载时自动回放已保存宽度。
 */
export function useTableColumnResize(tableKey: string, options: UseTableColumnResizeOptions = {}) {
  const minWidth = options.minWidth ?? 40
  const maxWidth = options.maxWidth ?? 1000
  const storageKey = STORAGE_PREFIX + tableKey

  const clamp = (w: number) => Math.min(Math.max(Math.round(w), minWidth), maxWidth)
  const getSaved = (): Record<string, number> => storage.local.get<Record<string, number>>(storageKey) || {}

  /** 把持久化宽度应用到表格实例（幂等，未保存过的列不动） */
  function applyTo(table: TableInstance) {
    const saved = getSaved()
    let changed = false
    table.columns.forEach((col) => {
      const key = columnKey(col)
      const w = saved[key]
      if (w && col.width !== w) {
        col.width = clamp(w)
        changed = true
      }
    })
    if (changed) table.doLayout()
  }

  /** 表格 ref 收集器：挂载即回放宽度，卸载时移除实例引用 */
  const instances: TableInstance[] = []
  function bindRef(el: unknown) {
    if (!el) {
      const i = instances.indexOf(el as TableInstance)
      if (i > -1) instances.splice(i, 1)
      return
    }
    if (!instances.includes(el as TableInstance)) {
      instances.push(el as TableInstance)
      applyTo(el as TableInstance)
    }
  }

  /** 绑定到 el-table 的 @header-dragend：clamp 后回写列宽并持久化 */
  function onHeaderDragEnd(newWidth: number, _oldWidth: number, column: TableColumnCtx<any>) {
    const width = clamp(newWidth)
    if (column.width !== width) {
      column.width = column.realWidth = width
      instances.forEach((t) => t.doLayout())
    }
    const saved = getSaved()
    saved[columnKey(column)] = width
    storage.local.set(storageKey, saved)
  }

  return { bindRef, onHeaderDragEnd }
}
