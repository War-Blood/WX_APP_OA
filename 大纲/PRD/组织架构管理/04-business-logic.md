# 组织架构管理 — 业务逻辑文档

> 维度：业务规则
> 读者：开发者
> 上游依赖：02-data-design / 03-api-design
> 下游影响：无

## 文档目标

记录核心业务规则，重点是 deleteDepartment 的级联清空逻辑变更。

## 1. 部门 5 级架构

```
总经理 (parent_id = null, 根节点)
  └── 经理
        └── 部长
              └── 组长
                    └── 员工
```

- 通过 `departments.parent_id` 实现树形层级
- 无硬编码层级限制，任意深度（实际使用 5 级）
- 编辑时可改变 parent_id 调整层级

## 2. 部门删除 — 级联清空（核心变更）

### 变更前逻辑（阻止删除）

```js
async function deleteDepartment(id) {
  // 检查子部门 → 有则抛错
  if (children count > 0) throw Error('请先删除子部门');
  // 检查员工 → 有则抛错
  if (users count > 0) throw Error('请先迁移用户');
  // 软删除该部门
  UPDATE departments SET deleted_at = NOW() WHERE id = ?
}
```

### 变更后逻辑（级联清空）

```js
async function deleteDepartment(id) {
  // Step 1: 递归收集所有子部门ID（含自身）
  const childIds = await getChildDepartmentIds(id);

  // Step 2: 软删除父部门及所有子部门
  await db.execute(
    'UPDATE departments SET deleted_at = NOW() WHERE id IN (?)',
    [[id, ...childIds]]
  );

  // Step 3: 清空受影响部门下所有员工的部门关联
  await db.execute(
    'UPDATE users SET department_id = NULL, department = NULL WHERE department_id IN (?)',
    [[id, ...childIds]]
  );

  return { deletedDeptCount: 1 + childIds.length };
}
```

### 递归收集子部门

```js
async function getChildDepartmentIds(parentId) {
  const ids = [];
  const children = await db.query(
    'SELECT id FROM departments WHERE parent_id = ? AND deleted_at IS NULL',
    [parentId]
  );
  for (const child of children) {
    ids.push(child.id);
    const grandChildren = await getChildDepartmentIds(child.id);
    ids.push(...grandChildren);
  }
  return ids;
}
```

## 3. 权限规则

| 操作 | 角色 | 说明 |
|------|------|------|
| 查看部门树 | admin, superadmin | GET /departments |
| 新增部门 | superadmin only | POST /departments |
| 编辑部门 | superadmin only | PUT /departments/:id |
| 删除部门 | superadmin only | DELETE /departments/:id |

## 4. 职位枚举

```js
const Position = {
  EMPLOYEE: '员工',
  LEADER: '组长',
  DIRECTOR: '部长',
  MANAGER: '经理',
  GENERAL_MANAGER: '总经理',
};
```

- 用户表中 `position` 字段存储枚举值
- 编辑用户时通过下拉选择（非自由文本）

## 变更记录

| 日期 | 变更内容 |
|------|---------|
| 2026-07-10 | 初始创建 — 重点记录 deleteDepartment 逻辑变更 |
