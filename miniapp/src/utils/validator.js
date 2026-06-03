export function isRequired(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return `${fieldName}不能为空`
  }
  return ''
}

export function isMobile(phone) {
  if (!phone) return ''
  const reg = /^1[3-9]\d{9}$/
  return reg.test(phone) ? '' : '请输入正确的手机号码'
}

export function isEmail(email) {
  if (!email) return ''
  const reg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
  return reg.test(email) ? '' : '请输入正确的邮箱地址'
}

export function maxLength(value, max) {
  if (!value) return ''
  return value.length <= max ? '' : `最多输入${max}个字符`
}
