# Quality Gate — 质量门检查清单

> 本文档是 `arch-foundation-implement` 阶段 4 的质量门完整参考。
> SKILL.md 只列概要，详细检查方法、修复方法、代码示例均在此文档。
> 代码生成完毕后强制执行全部 9 项检查，不通过则修正后重新检查。

## 检查概览

| 优先级 | 检查项 | 不通过后果 |
|--------|--------|-----------|
| 🔴 高 | 1. 导航 fail 回调 | 禁止提交 |
| 🔴 高 | 2. 无静默 catch | 禁止提交 |
| 🔴 高 | 3. defineProps 规范 | 禁止提交 |
| 🔴 高 | 4. 无 Mock 数据 | 禁止提交 |
| 🔴 高 | 5. 无 console 残留 | 禁止提交 |
| 🟡 中 | 6. z-index 分层 | 警告，建议修复 |
| 🟡 中 | 7. 登录跳转统一 | 警告，建议修复 |
| 🟡 中 | 8. URLSearchParams | 警告，建议修复 |
| 🟡 中 | 9. async/await 规范 | 警告，建议修复 |

---

## 高优先级（不通过禁止提交）

### 1. 导航 fail 回调

**检查方法**：grep 新增代码中所有 `uni.navigateTo` / `uni.switchTab` / `uni.reLaunch` / `uni.redirectTo` 调用，确认每个调用都链有 `.fail()` 回调。

```bash
# 查找未带 fail 回调的导航调用（粗筛，需人工复核）
grep -rnE "uni\.(navigateTo|switchTab|reLaunch|redirectTo)\s*\(" miniapp/src/
grep -rnE "uni\.(navigateTo|switchTab|reLaunch|redirectTo)[\s\S]*" miniapp/src/ | grep -v "fail"
```

**修复方法**：为每个导航调用补充 `fail` 回调，提示用户跳转失败原因。

**代码示例**：

```vue
<script setup>
// ❌ 错误：无 fail 回调
const goDetail = (id) => {
  uni.navigateTo({ url: `/pages/detail/index?id=${id}` })
}

// ❌ 错误：仅 success 无 fail
const goDetail = (id) => {
  uni.navigateTo({
    url: `/pages/detail/index?id=${id}`,
    success: () => { console.log('跳转成功') }
  })
}

// ✅ 正确：含 fail 回调
const goDetail = (id) => {
  uni.navigateTo({
    url: `/pages/detail/index?id=${id}`,
    fail: (err) => {
      console.error('跳转失败', err)
      uni.showToast({ title: '页面跳转失败', icon: 'none' })
    }
  })
}

// ✅ 正确：switchTab 同样需要 fail
const switchHome = () => {
  uni.switchTab({
    url: '/pages/home/index',
    fail: () => {
      uni.showToast({ title: '切换失败', icon: 'none' })
    }
  })
}
</script>
```

---

### 2. 无静默 catch

**检查方法**：grep 所有 `catch` 块，确认非空且含错误处理逻辑。

```bash
# 查找空 catch 块
grep -rnE "catch\s*\([^)]*\)\s*\{\s*\}" miniapp/src/ backend/src/ webapp/src/
# 查找 catch 后无任何处理（仅注释也算静默）
grep -rnE "catch\s*\{\s*\}" miniapp/src/ backend/src/ webapp/src/
```

**修复方法**：在 catch 块中至少输出错误日志或向用户提示。

**代码示例**：

```javascript
// ❌ 错误：空 catch 块
try {
  await api.submit(data)
} catch (e) {}

// ❌ 错误：仅注释无处理
try {
  await api.submit(data)
} catch (e) {
  // 忽略错误
}

// ❌ 错误：catch 参数省略且空块
try {
  await api.submit(data)
} catch {
  // nothing
}

// ✅ 正确：记录错误 + 用户提示
try {
  await api.submit(data)
  uni.showToast({ title: '提交成功', icon: 'success' })
} catch (e) {
  console.error('提交失败', e)
  uni.showToast({ title: e.message || '提交失败', icon: 'none' })
}

// ✅ 正确：业务降级处理
try {
  const res = await api.fetchList()
  list.value = res.data
} catch (e) {
  console.error('获取列表失败', e)
  list.value = []
  uni.showToast({ title: '加载失败，请稍后重试', icon: 'none' })
}
```

---

### 3. defineProps 规范

**检查方法**：检查所有 `<script setup>` 中的 `defineProps` 调用，确认返回值已赋值给变量。

```bash
# 查找未赋值的 defineProps
grep -rnE "^\s*defineProps\(" miniapp/src/ webapp/src/
grep -rnE "defineProps\(" miniapp/src/ webapp/src/ | grep -v "const props"
```

**修复方法**：将 `defineProps(...)` 返回值赋给 `const props`。

**代码示例**：

```vue
<script setup>
// ❌ 错误：未赋值，模板外无法访问 props
defineProps({
  title: String,
  count: { type: Number, default: 0 }
})

// ❌ 错误：赋值但未使用 const
let props = defineProps({ title: String })

// ✅ 正确：const 赋值
const props = defineProps({
  title: String,
  count: { type: Number, default: 0 }
})

// 后续可访问 props.title、props.count
console.log(props.title)
</script>
```

---

### 4. 无 Mock 数据

**检查方法**：搜索硬编码的中文姓名、部门列表、假数据数组等 Mock 数据。

```bash
# 查找常见 Mock 数据特征
grep -rnE "(张三|李四|王五|赵六|测试用户|demoData|mockData|fakeData)" miniapp/src/ backend/src/ webapp/src/
# 查找硬编码部门/人员列表
grep -rnE "(技术部|财务部|行政部|人事部)" miniapp/src/ | grep -v "wiki\|md:"
```

**修复方法**：移除所有硬编码 Mock 数据，改从 API 获取或使用空初始值。

**代码示例**：

```javascript
// ❌ 错误：硬编码人员列表
const personList = ref([
  { id: 1, name: '张三', dept: '技术部' },
  { id: 2, name: '李四', dept: '财务部' },
  { id: 3, name: '王五', dept: '行政部' }
])

// ❌ 错误：硬编码审批数据
const approvals = ref([
  { id: 'AP001', title: '请假申请', applicant: '赵六' }
])

// ✅ 正确：从 API 获取
const personList = ref([])
const loading = ref(false)

const fetchPersons = async () => {
  loading.value = true
  try {
    const res = await api.getPersons()
    personList.value = res.data
  } catch (e) {
    console.error('获取人员列表失败', e)
    personList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchPersons)
```

---

### 5. 无 console 残留

**检查方法**：grep 全部新增文件中的 `console.log` / `console.debug` / `debugger`。

```bash
# 查找调试残留
grep -rnE "console\.(log|debug)" miniapp/src/ backend/src/ webapp/src/
grep -rn "debugger" miniapp/src/ backend/src/ webapp/src/
```

**修复方法**：删除所有 `console.log` / `console.debug` / `debugger`；如需保留错误日志，改用 `console.error`。

**代码示例**：

```javascript
// ❌ 错误：调试 log 残留
const fetchList = async () => {
  console.log('开始获取列表')
  const res = await api.getList()
  console.log('返回数据', res)
  list.value = res.data
}

// ❌ 错误：debugger 残留
const handleSubmit = () => {
  debugger
  api.submit(form)
}

// ✅ 正确：移除 log，保留 error
const fetchList = async () => {
  try {
    const res = await api.getList()
    list.value = res.data
  } catch (e) {
    console.error('获取列表失败', e)
  }
}
```

---

## 中优先级（警告，建议修复）

### 6. z-index 分层

**检查方法**：grep 所有 `z-index` 声明，确认遵循分层规范。

```bash
grep -rn "z-index" miniapp/src/ webapp/src/
```

**修复方法**：按以下分层规范统一 z-index 取值。

| 层级 | z-index | 用途 |
|------|---------|------|
| L1 内容 | auto/0 | 普通流内容 |
| L2 浮层 | 1000 | dropdown、popover |
| L3 遮罩 | 1100 | mask、overlay |
| L4 弹窗 | 1200 | dialog、modal |
| L5 顶层 | 1300 | toast、tooltip、引导层 |

**代码示例**：

```scss
// ❌ 错误：随意取值
.mask { z-index: 999; }
.dialog { z-index: 1001; }
.toast { z-index: 9999; }

// ✅ 正确：按分层规范
.mask { z-index: 1100; }
.dialog { z-index: 1200; }
.toast { z-index: 1300; }
.dropdown { z-index: 1000; }
```

---

### 7. 登录跳转统一

**检查方法**：grep 所有 `reLaunch` 跳转 login 的代码，确认统一入口。

```bash
grep -rnE "reLaunch.*login" miniapp/src/
grep -rnE "navigateTo.*login" miniapp/src/
```

**修复方法**：登录跳转统一走 `utils/login.js` 或 `store/user.js` 中的 `goLogin()` 方法，禁止各页面直接 `reLaunch` 到登录页。

**代码示例**：

```javascript
// ❌ 错误：各页面直接跳转
// pages/home/index.vue
const handleAuthFail = () => {
  uni.reLaunch({ url: '/pages/login/index' })
}

// pages/profile/index.vue
const handleAuthFail = () => {
  uni.reLaunch({ url: '/pages/login/index', fail: () => {} })
}

// ✅ 正确：统一入口
// utils/login.js
export const goLogin = () => {
  uni.reLaunch({
    url: '/pages/login/index',
    fail: (err) => {
      console.error('跳转登录失败', err)
      uni.showToast({ title: '请重新进入应用', icon: 'none' })
    }
  })
}

// 各页面调用
import { goLogin } from '@/utils/login'
const handleAuthFail = () => goLogin()
```

---

### 8. URLSearchParams

**检查方法**：grep 字符串拼接 URL 参数的代码，改用 `URLSearchParams`。

```bash
# 查找字符串拼接 URL 参数
grep -rnE "\\\$\{.*\}.*[?&]" webapp/src/
grep -rnE "['\"\`].*[?&].*\+.*" webapp/src/
```

**修复方法**：URL 参数构造统一使用 `URLSearchParams` 或 uni-app 的参数拼接工具。

**代码示例**：

```javascript
// ❌ 错误：字符串拼接
const fetchUser = (id, name) => {
  return fetch(`/api/user?id=${id}&name=${name}`)
}

// ❌ 错误：手动拼接未编码
const url = '/api/user?id=' + id + '&name=' + name

// ✅ 正确：URLSearchParams（Web）
const fetchUser = (id, name) => {
  const params = new URLSearchParams({ id, name })
  return fetch(`/api/user?${params.toString()}`)
}

// ✅ 正确：小程序无 URLSearchParams，使用 encodeURIComponent
const buildUrl = (path, params) => {
  const query = Object.keys(params)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
  return `${path}?${query}`
}
const url = buildUrl('/pages/detail/index', { id, name })
```

---

### 9. async/await 规范

**检查方法**：grep `.then(` 链式调用，小程序端应改用 async/await。

```bash
grep -rn "\.then(" miniapp/src/
```

**修复方法**：将 `.then().catch()` 链式调用改写为 `try { await ... } catch (e) {}`。

**代码示例**：

```javascript
// ❌ 错误：链式调用
const fetchList = () => {
  api.getList()
    .then(res => {
      list.value = res.data
    })
    .catch(err => {
      console.error(err)
    })
}

// ✅ 正确：async/await
const fetchList = async () => {
  try {
    const res = await api.getList()
    list.value = res.data
  } catch (err) {
    console.error('获取列表失败', err)
    list.value = []
  }
}

// ✅ 正确：并行请求
const fetchAll = async () => {
  try {
    const [users, depts] = await Promise.all([
      api.getUsers(),
      api.getDepts()
    ])
    users.value = users.data
    depts.value = depts.data
  } catch (err) {
    console.error('并行获取失败', err)
  }
}
```

---

## 质量报告模板

代码生成 + 检查完毕后输出（逐项检查即时输出，不等到最后批量报告）：

```
🔍 质量门检查 (X/9 通过)

🔴 高优先级：
  ✅ 1. 导航 fail 回调
  ✅ 2. 无静默 catch
  ✅ 3. defineProps 规范
  ✅ 4. 无 Mock 数据
  ✅ 5. 无 console 残留

🟡 中优先级：
  ✅ 6. z-index 分层
  ✅ 7. 登录跳转统一
  ✅ 8. URLSearchParams
  ✅ 9. async/await 规范

✅ 9/9 通过，允许提交
```

如发现需修复项，实时输出修复进度：

```
🔍 质量门检查（进行中）
  🔴 高优先级：
    ✅ 1. 导航 fail 回调 — 通过
    ✅ 2. 无静默 catch — 通过
    ⚠️ 3. defineProps 规范 — 已修复（pages/detail/index.vue 第45行）
    ✅ 4. 无 Mock 数据 — 通过
    ✅ 5. 无 console 残留 — 通过
  🟡 中优先级：
    ✅ 6. z-index 分层 — 通过
    ⚠️ 7. 登录跳转统一 — 已修复（utils/login.js 第12行）
    ✅ 8. URLSearchParams — 通过
    ✅ 9. async/await 规范 — 通过
✅ 9/9 通过，允许提交
```

## 提交规则

- 🔴 高优先级 5 项必须全部通过，否则禁止 `git commit`
- 🟡 中优先级 4 项建议修复，若有未修复项需在 commit message 中注明
- 修复后需重新执行全部 9 项检查（避免修复引入新问题）
