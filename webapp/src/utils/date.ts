const BEIJING_OFFSET_MINUTES = 8 * 60

function toBeijingTime(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000 + BEIJING_OFFSET_MINUTES * 60000)
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

export function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return formatDateInBeijing(date)
}

export function shiftMonth(monthStr: string, delta: number): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return formatMonthInBeijing(date)
}
