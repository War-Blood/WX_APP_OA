---
name: "bugpack-operations"
description: "Operate BugPack API to submit bugs, view bugs, and update bug status. Invoke when user needs to manage bugs via BugPack REST API."
---

# BugPack Operations Skill

This skill provides complete BugPack API operations for bug management. It uses REST API calls to interact with BugPack server.

## Configuration

BugPack server URL 由用户在调用时提供。在首次使用前，**必须先询问用户 BugPack 服务的访问地址和端口**，然后使用该地址执行所有 API 操作。

**交互示例**:
```
Agent: 请问 BugPack 服务的访问地址和端口是什么？（如 http://192.168.1.121:3456）
User: http://192.168.1.121:3456
Agent: 好的，已记录 BugPack 服务地址为 http://192.168.1.121:3456
```

获取地址后，将其保存为变量 `{BUGPACK_SERVER}`，在所有 API 调用中替换使用。

## Available Operations

### 1. Submit a New BUG

**When to use**: When you need to report a new bug to BugPack system.

**API Endpoint**: `POST /api/bugs`

**Required Parameters**:
- `project_id`: The ID of the project (e.g., "e88e1937-bc66-49dc-92e4-189673798721" for zhixiaoji_backend)
- `title`: Bug title (string)
- `description`: Bug description (string)

**Optional Parameters**:
- `status`: Bug status (default: "pending")
  - Valid values: "pending", "annotating", "generated", "fixed", "closed"
- `priority`: Bug priority (default: "medium")
  - Valid values: "low", "medium", "high"
- `page_path`: Page path where bug occurred (string)
- `device`: Device information (string)
- `browser`: Browser information (string)

**Example Request**:
```bash
curl -X POST {BUGPACK_SERVER}/api/bugs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "e88e1937-bc66-49dc-92e4-189673798721",
    "title": "API returns 500 error",
    "description": "The /api/users endpoint returns 500 error when passing invalid user_id",
    "status": "pending",
    "priority": "high",
    "page_path": "/api/users",
    "device": "Desktop",
    "browser": "Chrome 120"
  }'
```

**Example Response**:
```json
{
  "id": "57fb5859-dfe8-4fca-8eab-ef98f0e614af",
  "number": 1,
  "title": "API returns 500 error",
  "description": "The /api/users endpoint returns 500 error when passing invalid user_id",
  "status": "pending",
  "priority": "high",
  "page_path": "/api/users",
  "device": "Desktop",
  "browser": "Chrome 120",
  "related_files": "[]",
  "project_id": "e88e1937-bc66-49dc-92e4-189673798721",
  "created_at": "2026-05-08 10:32:01",
  "updated_at": "2026-05-08 10:32:01",
  "relatedFiles": [],
  "screenshots": []
}
```

### 2. View BUGs

#### 2.1 List All BUGs in a Project

**When to use**: When you need to see all bugs in a specific project.

**API Endpoint**: `GET /api/bugs?project_id={project_id}`

**Optional Query Parameters**:
- `project_id`: Filter by project ID
- `status`: Filter by status (e.g., "pending", "fixed")

**Example Request**:
```bash
curl -s "{BUGPACK_SERVER}/api/bugs?project_id=e88e1937-bc66-49dc-92e4-189673798721&status=pending"
```

**Example Response**:
```json
[
  {
    "id": "57fb5859-dfe8-4fca-8eab-ef98f0e614af",
    "number": 1,
    "title": "API returns 500 error",
    "description": "The /api/users endpoint returns 500 error",
    "status": "pending",
    "priority": "high",
    "project_id": "e88e1937-bc66-49dc-92e4-189673798721",
    "created_at": "2026-05-08 10:32:01",
    "screenshot_count": 0,
    "relatedFiles": [],
    "screenshots": []
  }
]
```

#### 2.2 Get Specific BUG Details

**When to use**: When you need detailed information about a specific bug.

**API Endpoint**: `GET /api/bugs/{bug_id}`

**Example Request**:
```bash
curl -s "{BUGPACK_SERVER}/api/bugs/57fb5859-dfe8-4fca-8eab-ef98f0e614af"
```

### 3. Update BUG Status

**When to use**: When you need to change a bug's status (e.g., mark as fixed, closed).

**API Endpoint**: `PATCH /api/bugs/{bug_id}`

**Parameters**:
- `bug_id`: The bug ID (from the bug object)
- `status`: New status value
  - Valid values: "pending", "annotating", "generated", "fixed", "closed"

**Example Request**:
```bash
curl -s -X PATCH "{BUGPACK_SERVER}/api/bugs/57fb5859-dfe8-4fca-8eab-ef98f0e614af" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
```

**Example Response**:
```json
{
  "id": "57fb5859-dfe8-4fca-8eab-ef98f0e614af",
  "number": 1,
  "title": "API returns 500 error",
  "status": "closed",
  "updated_at": "2026-05-08 12:06:44"
}
```

> **注意**: BugPack MCP 工具存在 `better-sqlite3` 原生模块兼容性问题无法使用。
> 更新 BUG 状态请直接使用 REST API: `PATCH /api/bugs/{bug_id}`。

### 4. Add Fix Note to BUG

**When to use**: After fixing a bug, add notes describing the fix.

**API Endpoint**: `POST /api/bugs/{bug_id}/notes`

**Parameters**:
- `bug_id`: The bug ID
- `note`: Fix description (string)

**Notes**:
- 当前 BugPack 服务版本不支持此接口，返回 `Cannot POST /api/bugs/{id}/notes` (405)
- 如需添加说明，请在 Bug 的 `description` 字段中追加内容后通过 `PATCH /api/bugs/{id}` 整体更新
- 或者在提交新 Bug 时一次性写入完整的 `description`

### 5. Get Project List

**When to use**: When you need to see all available projects.

**API Endpoint**: `GET /api/projects`

**Example Request**:
```bash
curl -s "{BUGPACK_SERVER}/api/projects"
```

**Example Response**:
```json
[
  {
    "id": "e88e1937-bc66-49dc-92e4-189673798721",
    "name": "zhixiaoji_backend",
    "created_at": "2026-05-08 05:32:34"
  },
  {
    "id": "93cc63a2-a614-4960-90b8-c76b773e79f0",
    "name": "zhixiaoji",
    "created_at": "2026-04-28 04:23:43"
  }
]
```

## Common Workflows

### Workflow 1: Submit a New BUG
1. 先询问用户 BugPack 服务地址，获取 `{BUGPACK_SERVER}`
2. Get project list to find the correct `project_id`
3. Submit bug with title, description, and optional metadata
4. Receive bug object with `id` and `number`

### Workflow 2: View and Triage BUGs
1. List all bugs in a project: `GET {BUGPACK_SERVER}/api/bugs?project_id={id}`
2. Filter by status if needed: `GET {BUGPACK_SERVER}/api/bugs?project_id={id}&status=pending`
3. Get details of specific bug if needed

### Workflow 3: Fix and Close BUG
1. Get bug details to understand the issue
2. Fix the bug in the codebase
3. Update status to "fixed": `PATCH {BUGPACK_SERVER}/api/bugs/{bug_id}` with body `{"status": "fixed"}`
4. Add description update if needed: `PATCH {BUGPACK_SERVER}/api/bugs/{bug_id}` with body `{"description": "原有描述\\n\\n---\\n**修复说明**: ..."}`
5. After verification, update status to "closed": `PATCH {BUGPACK_SERVER}/api/bugs/{bug_id}` with body `{"status": "closed"}`

## Status Values Reference

| Status | Description | When to Use |
|--------|-------------|-------------|
| `pending` | Bug reported, not yet analyzed | Default status for new bugs |
| `annotating` | Being annotated with details | When adding screenshots/annotations |
| `generated` | AI fix instructions generated | After generating fix instructions |
| `fixed` | Bug has been fixed | After applying the fix |
| `closed` | Bug verified and closed | After verification of the fix |

## Priority Values Reference

| Priority | Description |
|----------|-------------|
| `low` | Minor issue, can wait |
| `medium` | Normal priority (default) |
| `high` | Critical issue, needs immediate attention |

## Error Handling

Common HTTP status codes:
- `200`: Success
- `201`: Created (for new bugs)
- `400`: Bad request (invalid parameters)
- `404`: Not found (bug or project doesn't exist)
- `500`: Server error

## Usage Examples

### Example 1: Submit High Priority BUG
```bash
curl -X POST {BUGPACK_SERVER}/api/bugs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "e88e1937-bc66-49dc-92e4-189673798721",
    "title": "Database connection timeout",
    "description": "Application fails to connect to database after 30 seconds",
    "priority": "high",
    "status": "pending"
  }'
```

### Example 2: List All Pending BUGs
```bash
curl -s "{BUGPACK_SERVER}/api/bugs?project_id=e88e1937-bc66-49dc-92e4-189673798721&status=pending"
```

### Example 3: Close a BUG
```bash
curl -s -X PATCH "{BUGPACK_SERVER}/api/bugs/57fb5859-dfe8-4fca-8eab-ef98f0e614af" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed"}'
```

### Example 4: Update BUG (status + description together)
```bash
curl -s -X PATCH "{BUGPACK_SERVER}/api/bugs/57fb5859-dfe8-4fca-8eab-ef98f0e614af" \
  -H "Content-Type: application/json" \
  -d '{"status": "closed", "description": "原有描述内容\\n\\n---\\n**补充说明**: 此BUG已重新确认"}'
```

## Notes

- All API calls use JSON format for request and response
- Timestamps are in format: `YYYY-MM-DD HH:MM:SS`
- Bug numbers are sequential within each project
- Bug IDs are UUIDs (globally unique)
- The server is running at `{BUGPACK_SERVER}` (由用户在调用时提供)
- All data is stored locally on the server

## MCP 工具兼容性说明

BugPack MCP 工具（`mcp_bugpack_mark_bug_status`、`mcp_bugpack_add_fix_note` 等）依赖 `better-sqlite3` 原生模块，在当前 Node.js v24 环境存在编译兼容性问题，无法使用。

**替代方案**: 所有操作通过 REST API 直接调用:

| 操作 | API |
|------|-----|
| 提交 Bug | `POST {BUGPACK_SERVER}/api/bugs` |
| 查看列表 | `GET {BUGPACK_SERVER}/api/bugs?project_id={id}` |
| 更新状态 | `PATCH {BUGPACK_SERVER}/api/bugs/{id}` |
| 查看详情 | `GET {BUGPACK_SERVER}/api/bugs/{id}` |
| 项目列表 | `GET {BUGPACK_SERVER}/api/projects` |

> MCP 工具的 `mcp_bugpack_list_bugs` 和 `mcp_bugpack_get_bug_context` 等只读操作可正常使用。
> 写入操作（标记状态、添加记录）请一律使用 REST API 的 `PATCH {BUGPACK_SERVER}/api/bugs/{id}`。

## Skill 使用流程

1. **首次调用时**，先询问用户 BugPack 服务的访问地址和端口
2. 将用户提供的地址保存为 `{BUGPACK_SERVER}`，在本次会话中所有 API 调用使用该变量
3. 所有示例中的 `{BUGPACK_SERVER}` 替换为用户提供的实际地址
4. 如切换项目或重新开启会话，需重新询问 BugPack 服务地址
