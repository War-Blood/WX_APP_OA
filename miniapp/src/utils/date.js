export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export function formatTime(date) {
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function isToday(date) {
  const d = new Date(date)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

export function getDateRange(type) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  if (type === 'week') {
    const currentDay = now.getDay() || 7
    const start = new Date(year, month, day - currentDay + 1)
    const end = new Date(year, month, day + (7 - currentDay))
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    }
  }

  if (type === 'month') {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    }
  }

  return {
    startDate: formatDate(now),
    endDate: formatDate(now)
  }
}
