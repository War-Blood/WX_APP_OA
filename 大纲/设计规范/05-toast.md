# 05 — Toast/消息提示规范

## 统一持续时间：1.5s

所有消息弹窗持续时间统一为 **1500ms**。

## 小程序端

### API

```js
import { showSuccess, showError, showToast } from '@/utils/toast'

showSuccess('提交成功')
showError('加载失败')
showToast('自定义', 'none')  // 第二个参数可选: 'none'|'success'|'loading'
```

### 修改全局持续时间

只需改 `miniapp/src/utils/toast.js` 中的 `DURATION` 常量。

## Web 端

### API

```ts
import { toast } from '@/utils/toast'

toast.success('保存成功')
toast.error('操作失败')
toast.warning('请完善参数')
toast.info('未检测到变更')
```

### 修改全局持续时间

只需改 `webapp/src/utils/toast.ts` 中的 `DURATION` 常量。

## 使用规范

| 场景 | 方法 | 示例 |
|------|------|------|
| 操作成功 | `success` | `toast.success('已保存')` |
| 操作失败 | `error` | `toast.error('保存失败')` |
| 表单校验 | `warning` | `toast.warning('请输入名称')` |
| 一般提示 | `info` | `toast.info('未检测到变更')` |

## 禁止

- ❌ 直接使用 `uni.showToast` 或 `ElMessage.xxx`（必须走统一封装）
- ❌ `catch {}` 空块无提示
- ❌ 成功/失败提示缺失（每次操作必须有反馈）
