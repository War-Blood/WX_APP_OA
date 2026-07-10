# 组织架构管理 — API 设计文档

> 维度：API 契约
> 读者：前后端开发者
> 上游依赖：01-requirements
> 下游影响：04-business-logic

## 文档目标

记录组织架构管理的 API 端点，标注权限变更点。

## 1. 通用约定

- 协议：HTTPS + POST/GET/PUT/DELETE
- 格式：JSON（Content-Type: application/json）
- 统一响应：`{ code: number, message: string, data: any }`
- 分页：`{ page, pageSize }` → `{ total, list }`
- 认证：Bearer Token（JWT）

## 2. 端点清单

### 2.1 部门树查询

```
GET /api/admin/departments
权限：admin, superadmin（不变）
说明：返回完整部门树（含 children 嵌套）
```

**响应示例**：
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "总公司",
      "parentId": null,
      "children": [
        {
          "id": 2,
          "name": "技术部",
          "parentId": 1,
          "children": []
        }
      ]
    }
  ]
}
```

### 2.2 新增部门

```
POST /api/admin/departments
权限：superadmin ← 改为 superAuth
说明：创建新部门
```

**请求示例**：
```json
{
  "name": "前端组",
  "parentId": 2,
  "sortOrder": 1,
  "description": "负责小程序和Web前端开发"
}
```

### 2.3 编辑部门

```
PUT /api/admin/departments/:id
权限：superadmin ← 改为 superAuth
说明：修改部门名称/上级/排序/描述
```

### 2.4 删除部门（核心变更）

```
DELETE /api/admin/departments/:id
权限：superadmin ← 改为 superAuth
说明：【变更】级联清空：递归软删子部门 + 清空员工department_id + department字段←NULL
```

**变更前行为**：有子部门或员工时抛出 BusinessError 阻止删除
**变更后行为**：
```
1. 递归收集所有子部门 ID
2. 软删除父部门及所有子部门（SET deleted_at = NOW()）
3. 将所有受影响部门下的员工 department_id 和 department 字段置 NULL
4. 返回删除的部门数量
```

### 2.5 权限变更汇总

| 端点 | 方法 | 变更前 | 变更后 |
|------|------|--------|--------|
| /admin/departments | GET | adminAuth | adminAuth（不变） |
| /admin/departments | POST | adminAuth | **superAuth** |
| /admin/departments/:id | PUT | adminAuth | **superAuth** |
| /admin/departments/:id | DELETE | adminAuth | **superAuth** |

## 变更记录

| 日期 | 变更内容 |
|------|---------|
| 2026-07-10 | 初始创建 |
