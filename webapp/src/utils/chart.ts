// 图表配色常量（镜像 styles/variables.scss 的 token，供 TS/ECharts 使用）
export const CHART_COLORS = {
  primary: '#2B6DE8',
  primaryLight: '#4C8DF1',
  success: '#67C23A',
  warning: '#E6A23C',
  danger: '#F56C6C',
  info: '#909399',
} as const

// 日历热力图三档色（对齐小程序：全员提交/部分提交/无提交）
export const HEAT_TINTS = {
  full: '#EFFDF5',
  partial: '#EDF2FF',
  none: '#F0F0F0',
} as const

// 分类系列调色板（按序循环取色）
export const CHART_SERIES = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.primaryLight,
] as const
