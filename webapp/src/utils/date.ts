const BEIJING_OFFSET_MINUTES = 8 * 60

/**
 * 把「时刻」转换为北京时间的墙上时间（UTC+8）。
 * 北京时间无夏令时，固定加 8 小时即可；不能再叠加浏览器时区偏移，
 * 否则在 UTC+8 的浏览器上两者相互抵消，结果回退 8 小时（跨月 / 跨天错位）。
 */
function toBeijingTime(date: Date): Date {
  return new Date(date.getTime() + BEIJING_OFFSET_MINUTES * 60000)
}

export function formatDateInBeijing(date: Date = new Date()): string {
  return toBeijingTime(date).toISOString().slice(0, 10)
}

export function formatMonthInBeijing(date: Date = new Date()): string {
  return formatDateInBeijing(date).slice(0, 7)
}

export function currentDateInBeijing(): string {
  return formatDateInBeijing(new Date())
}

export function currentMonthInBeijing(): string {
  return formatMonthInBeijing(new Date())
}

/** 纯日期字符串（YYYY-MM-DD）加减天数：按日历运算，与浏览器时区无关 */
export function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** 纯月份字符串（YYYY-MM）加减月份：按日历运算，与浏览器时区无关 */
export function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7)
}
