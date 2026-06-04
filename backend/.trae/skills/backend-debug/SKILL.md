---
name: "backend-debug"
description: "Provides backend debugging workflow and best practices. Invoke when user needs to debug backend issues, fix bugs, or troubleshoot API/service problems."
---

# Backend DEBUG Skill

This skill provides a comprehensive debugging workflow and best practices for backend development.

## When to Invoke

- User reports a bug or issue in backend code
- API endpoints return unexpected errors
- Service crashes or behaves abnormally
- Performance issues or unexpected behavior
- Need to troubleshoot database, cache, or external service integration

## DEBUG Workflow

### Phase 1: Information Gathering

#### 1.1 Read BUG Report (if available)
```
→ Get BUG details from bug tracking system
→ Understand: Title, Description, Reproduction Steps, Expected vs Actual behavior
→ Check BUG status and history (may be reopened with additional info)
→ Note environment: OS, version, configuration
```

#### 1.2 Check Service Status
```bash
# Check if service is running
ps aux | grep <service-name>
lsof -i :<port>

# Check logs
tail -n 100 /var/log/<service>.log
docker logs <container-name>
```

#### 1.3 Reproduce the Issue
```bash
# Test the problematic endpoint
curl -v http://localhost:<port>/<endpoint>

# Check database state
psql -h <host> -U <user> -d <db> -c "<query>"

# Check cache
redis-cli -h <host> ping
redis-cli -h <host> get <key>
```

### Phase 2: Root Cause Analysis

#### 2.1 Code Review
```
→ Trace the execution flow from entry point to error location
→ Check recent changes (git log, git diff)
→ Review configuration files (.env, config files)
→ Verify dependencies and versions
```

#### 2.2 Common Issue Patterns

**Configuration Issues:**
- Environment variables not loaded correctly
- Wrong config file being used (check file precedence)
- Missing or incorrect values in .env files

**Database Issues:**
- Connection pool exhausted
- Query performance issues
- Schema mismatch
- Transaction not committed/rolled back properly

**API Issues:**
- Route not registered
- Middleware blocking requests
- Authentication/Authorization failures
- Request/Response format mismatch

**Service Issues:**
- Port conflicts
- Memory leaks
- Unhandled promise rejections
- External service dependencies failing

#### 2.3 Debugging Techniques

**Add Logging:**
```typescript
// Strategic logging points
console.log('DEBUG: Entering function X', { param1, param2 });
console.log('DEBUG: Database query result', result);
console.log('DEBUG: Before return', { value });
```

**Use Debugger:**
```bash
# Node.js
node --inspect-brk dist/main.js
# Then connect with Chrome DevTools or VS Code debugger
```

**Isolate the Problem:**
```bash
# Test components individually
# Mock external dependencies
# Use unit tests to verify specific functions
```

### Phase 3: Fix Implementation

#### 3.1 Fix Guidelines
```
→ Make minimal changes to fix the issue
→ Don't introduce new dependencies unless necessary
→ Follow existing code style and patterns
→ Add comments explaining the fix if non-obvious
```

#### 3.2 Configuration Fixes
```typescript
// Example: Fix JWT expiration configuration
// BEFORE (wrong):
JWT_EXPIRES_IN=7200  // Interpreted as 7.2 seconds by some libraries

// AFTER (correct):
JWT_EXPIRES_IN=7200s  // Explicitly 7200 seconds
```

#### 3.3 Code Fixes
```typescript
// Example: Fix route prefix
// BEFORE:
@Controller()  // Missing prefix

// AFTER:
@Controller('auth')  // Correct prefix
```

### Phase 4: Verification

#### 4.1 Restart Service (CRITICAL)
```bash
# Always restart after code changes
# Stop existing service
kill -9 $(lsof -t -i:<port>) 2>/dev/null

# Rebuild if necessary
pnpm run build

# Start service
node dist/main.js
# OR
pnpm start:dev
```

#### 4.2 Test the Fix
```bash
# Test the specific endpoint
curl -X <method> http://localhost:<port>/<endpoint> \
  -H "Content-Type: application/json" \
  -d '<payload>'

# Verify response
echo "<token>" | cut -d. -f2 | base64 -d  # Decode JWT

# Check logs for errors
tail -f /var/log/<service>.log
```

#### 4.3 Regression Testing
```bash
# Test related endpoints to ensure no side effects
# Test edge cases
# Test with invalid inputs
```

### Phase 5: Documentation

#### 5.1 Update BUG Status
```bash
# If using bug tracking system
curl -X PATCH "<bug-server>/api/bugs/<bug-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "fixed",
    "description": "<detailed fix description>"
  }'
```

#### 5.2 Fix Description Template
```markdown
## 修复说明

**问题根因**: 
<详细描述问题产生的原因>

**修复方案**: 
<描述具体的修复措施>

**验证结果**: 
- <测试项1> ✅
- <测试项2> ✅

**相关文件**: 
- `<file-path-1>`
- `<file-path-2>`
```

## Common DEBUG Commands

### Service Management
```bash
# Check service status
systemctl status <service>

# View logs
journalctl -u <service> -f
tail -f /var/log/<service>.log

# Restart service
systemctl restart <service>
# OR
kill -9 $(lsof -t -i:<port>); sleep 2; node dist/main.js
```

### Database DEBUG
```bash
# Connect to database
psql -h <host> -U <user> -d <database>

# Check connections
SELECT * FROM pg_stat_activity;

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Network DEBUG
```bash
# Check port usage
lsof -i :<port>
netstat -tlnp | grep <port>

# Test connectivity
curl -v http://localhost:<port>/health
telnet <host> <port>

# Check DNS
nslookup <hostname>
dig <hostname>
```

### Process DEBUG
```bash
# Find process by port
lsof -t -i:<port>
fuser <port>/tcp

# Check resource usage
top -p <pid>
ps aux | grep <process-name>
```

## Best Practices

### 1. Always Restart After Fixes
**NEVER assume changes are active without restart.** Always:
- Stop the service
- Rebuild if code changed
- Start the service
- Verify the fix

### 2. Test in Isolation
- Reproduce the issue before fixing
- Apply the fix
- Verify the fix resolves the issue
- Test related functionality for regressions

### 3. Document Everything
- Root cause analysis
- Fix implementation details
- Verification steps and results
- Any configuration changes

### 4. Follow Status Workflow (BugPack)

**状态流转规则：**
```
pending → fixed → closed
   ↑         ↓
   └──── reopened (if verification fails)
```

**状态说明：**

| 状态 | 说明 | 使用场景 |
|------|------|----------|
| `pending` | 待处理 | 新提交的 BUG |
| `annotating` | 标注中 | 正在添加详细信息 |
| `generated` | 已生成修复方案 | AI 已生成修复建议 |
| `fixed` | 已修复 | 代码已修复，待验证 |
| `closed` | 已关闭 | 验证通过，问题已解决 |

**状态更新规范：**

- **只能更新为 `fixed`**: 当代码确实已修复时，更新状态为 `fixed`
- **未解决则不变**: 如果问题未解决，保持原状态不变
- **禁止关闭 BUG**: 只有 QA/测试人员可以在验证通过后关闭 BUG，开发者不得自行关闭
- **禁止创建新 BUG**: 不得创建新的 BUG 条目

**修复说明要求：**

更新 BUG 时必须包含：
- **问题根因**: 详细说明问题产生的原因
- **修复方案**: 描述具体的修复措施
- **验证结果**: 列出测试验证的具体结果
- **相关文件**: 列出修改的文件路径

### 5. Communication
- Keep bug reports updated with progress
- Ask for clarification if requirements are unclear
- Report blockers immediately
- Summarize findings before implementing fixes

## DEBUG Checklist

Before considering a bug fixed:

- [ ] Root cause identified
- [ ] Fix implemented with minimal changes
- [ ] Service restarted and running
- [ ] Original issue resolved
- [ ] No regressions introduced
- [ ] Bug status updated
- [ ] Fix documented

## Example DEBUG Session

```
1. READ: BUG #123 - "API returns 500 error on login"

2. CHECK: Service is running on port 3001

3. TEST: curl -X POST http://localhost:3001/login
   → Returns 500

4. CHECK LOGS: tail -f app.log
   → Error: "Cannot read property 'expiresIn' of undefined"

5. ANALYZE: Check auth.service.ts
   → Found: config.get('JWT_EXPIRES_IN') returns undefined
   → Root cause: .env file missing JWT_EXPIRES_IN

6. FIX: Add JWT_EXPIRES_IN=7200s to .env

7. RESTART: 
   kill -9 $(lsof -t -i:3001)
   node dist/main.js

8. VERIFY:
   curl -X POST http://localhost:3001/login
   → Returns 200 with token

9. UPDATE: Mark BUG #123 as fixed

10. DOCUMENT: Add fix details to bug report
```

## Anti-Patterns to Avoid

❌ **Don't**: Fix without understanding root cause  
❌ **Don't**: Skip verification after fix  
❌ **Don't**: Make large refactoring while fixing bugs  
❌ **Don't**: Ignore error logs  
❌ **Don't**: Close bugs (only QA/tester can close bugs after verification)  
❌ **Don't**: Forget to restart service after code changes  

✅ **Do**: Reproduce before fixing  
✅ **Do**: Test after every fix  
✅ **Do**: Make minimal, focused changes  
✅ **Do**: Read error messages carefully  
✅ **Do**: Update bug status promptly  
✅ **Do**: Always restart service to apply changes
