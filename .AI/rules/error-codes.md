# 错误码编码规范 (Error Code Dictionary)

> 权威词典文件: `backend/src/common/utils/constants.js` → `ErrorCode` 枚举

---

## 核心原则

1. **每个业务错误独立编码** — 一个 code 对应一种错误场景，禁止复用
2. **新增前先查字典** — `grep` `constants.js` 确认编码未被占用
3. **按分区追加** — 在对应模块分区末尾添加，不跨区
4. **编码 = 常量名** — 键名和值必须一一对应，值仅在本文件定义

---

## 编码分区速查

| 区间 | 模块 | 用途 |
|------|------|------|
| `0` | 通用 | SUCCESS |
| `1000-1099` | 系统级 | 参数校验、资源、内部错误 |
| `1100-1199` | 认证 | 登录、JWT、TOTP、企业微信 |
| `1200-1299` | 用户 | 账号状态、个人信息 |
| `2000-2099` | 日报 | 提交、代填、草稿、审核、删除 |
| `2100-2199` | 审批 | 审批操作、状态流转 |
| `2200-2299` | 审核 | 项目审核、合规审核 |
| `2300-2399` | 管理 | 人员、部门、角色、花名册、密码 |
| `2400-2499` | 邀请码 | CDK 生成、核销 |
| `2500-2599` | 统计 | 统计查询、参数 |
| `2600-2699` | WPS | 外部对接（预留） |
| `2700-2799` | 消息 | 通知、推送（预留） |
| `9001` | 兜底 | BUSINESS_ERROR（逐步废弃） |

---

## 使用方式

### 服务层 — 抛错时传 code

```js
// 旧写法（全部用 BUSINESS_ERROR 兜底码 9001）—— 禁止
throw new BusinessError('该日期已提交日报，请勿重复提交');

// 新写法（传入具体错误码）—— 必须
const { ErrorCode } = require('../../common/utils/constants');
throw new BusinessError('该日期已提交日报，请勿重复提交', null, ErrorCode.REPORT_ALREADY_SUBMITTED);
```

### 控制器 — 直接返回时用 ErrorCode

```js
// 正确
res.json({ code: ErrorCode.REPORT_SUBSTITUTED, message: '...', data: {...} });

// 错误 — 禁止硬编码数字
res.json({ code: 2001, message: '...' });
```

### 前端 — 按具体 code 判断

```js
// miniapp/src/services/request.js: 仅 0 和 REPORT_SUBSTITUTED(2001) 视为成功 resolve
// 其他 code 一律 reject，由业务层 catch 处理
if (responseData.code === 0 || responseData.code === 2001) {
    resolve(responseData)
} else {
    showToast(responseData.message || '请求失败')
    reject(new Error(responseData.message || '请求失败'))
}
```

---

## 新增错误码流程（强制）

```
1. 打开 backend/src/common/utils/constants.js
2. 搜索目标区间，确认编号未被占用
3. 在对应分区末尾追加，格式:
     CONST_NAME: XXXX,   // 中文说明
4. 代码中使用 ErrorCode.CONST_NAME，禁止硬编码数字
5. 更新本规则文件（如新增分区或重要变更）
```

---

## 完整字典

> 以下与 `backend/src/common/utils/constants.js` 保持同步。冲突时以源文件为准。

```
SUCCESS:                        0      通用成功

VALIDATION_ERROR:            1001      参数校验失败
NOT_FOUND:                   1002      资源不存在

AUTH_WECHAT_FAILED:          1101      微信登录失败
AUTH_ACCOUNT_DELETED:        1102      账号已被删除
AUTH_ACCOUNT_NOT_REGISTERED: 1103      账号未注册
AUTH_ACCOUNT_DISABLED:       1104      账号已被禁用
AUTH_ACCOUNT_PENDING:        1105      账号审核中
AUTH_LOGIN_LOCKED:           1106      登录尝试次数过多
AUTH_INVALID_CREDENTIALS:    1107      账户或密码错误
AUTH_NO_ADMIN_ACCESS:        1108      无管理后台权限
AUTH_NO_PASSWORD:            1109      未设置密码
AUTH_TOTP_REQUIRED:          1110      需要二次验证码
AUTH_TOTP_INVALID:           1111      动态验证码错误
AUTH_QYWX_NOT_CONFIGURED:    1112      企业微信未配置
AUTH_QYWX_FAILED:            1113      企业微信认证失败
AUTH_QYWX_NOT_REGISTERED:    1114      企业微信账号未注册
AUTH_QYWX_ALREADY_BOUND:     1115      企业微信已被绑定

USER_NOT_FOUND:              1201      用户不存在
USER_CANNOT_MODIFY_SUPERADMIN:1202     不能修改超级管理员
USER_CANNOT_DISABLE_SUPERADMIN:1203    不能禁用超级管理员
USER_OPENID_REQUIRED:        1204      OpenID 必填
USER_ALREADY_REGISTERED:     1205      账号已注册
USER_NOT_PENDING:            1206      用户无需审核
USER_ALREADY_ACTIVE:         1207      用户已是活跃状态

REPORT_SUBSTITUTED:          2001      已被他人代填（前端据此切换UI）
REPORT_ALREADY_SUBMITTED:    2002      当日已提交，禁止重复
REPORT_ALREADY_REVIEWED:     2003      日报已审核
REPORT_NOT_SUPPLEMENT:       2004      非补公出日志类型
REPORT_DELETE_FORBIDDEN:     2005      无权删除他人日报

APPROVAL_INVALID_ACTION:     2101      审批操作无效
APPROVAL_ALREADY_PROCESSED:  2102      审批已处理

REVIEW_INVALID_ACTION:       2201      审核操作无效
REVIEW_REJECT_NEEDS_COMMENT: 2202      驳回须填写意见
REVIEW_ALREADY_DONE:         2203      已审核，禁止重复

WORKER_CODE_EXISTS:          2301      工号已存在
WORKER_NOT_FOUND:            2302      人员不存在
WORKER_NO_FIELDS:            2303      无有效更新字段
IMPORT_EMPTY:                2304      导入数据为空
IMPORT_TOO_LARGE:            2305      导入数据超限
DEPT_NOT_FOUND:              2306      部门不存在
DEPT_PARENT_NOT_FOUND:       2307      上级部门不存在
DEPT_SELF_PARENT:            2308      上级部门不能是自己
DEPT_HAS_CHILDREN:           2309      存在子部门
DEPT_HAS_USERS:              2310      部门下存在用户
ROLE_NOT_FOUND:              2311      角色不存在
ROLE_CODE_EXISTS:            2312      角色标识已存在
ROLE_IS_SYSTEM:              2313      系统角色不可删除
ROLE_HAS_USERS:              2314      角色下存在用户
APPROVAL_TYPE_NOT_FOUND:     2315      审批类型不存在
PASSWORD_TOO_SHORT:          2316      密码长度不足
PASSWORD_NO_ALPHANUMERIC:    2317      密码须含字母和数字

INVITE_CODE_INVALID:         2401      邀请码无效
INVITE_CODE_USED:            2402      邀请码已被使用

STATS_INVALID_SCOPE:         2501      统计范围无效
STATS_USER_ID_REQUIRED:      2502      userId 必填
STATS_USER_NOT_FOUND:        2503      统计用户不存在
STATS_MONTH_REQUIRED:        2504      month 必填

BUSINESS_ERROR:              9001      【已废弃】通用兜底，仅旧代码过渡使用
```
