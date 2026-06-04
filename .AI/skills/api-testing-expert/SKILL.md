---
name: "api-testing-expert"
description: "Expert in REST API testing, regression testing, and bug lifecycle management. Invoke when user needs to perform API testing, regression verification, bug status management, or create test reports."
---

# API Testing Expert

A comprehensive skill for API testing based on industry best practices and real-world project experience.

## 1. Core Testing Principles

### 1.1 Document-First Principle
- **API documentation is the ONLY source of truth** for testing
- Backend implementation inconsistencies with docs = backend bugs
- Never modify tests/SDKs to match incorrect backend behavior
- Always reference OpenAPI/Swagger specs when available

### 1.2 Service State Assumption
- Backend service is always running with latest fixes during testing
- Testers do NOT need to check if service is up-to-date
- Testers do NOT restart, rebuild, or modify backend services
- On blocking errors (500, service down), report Critical bug and wait for fix

### 1.3 Tester Responsibility Boundary
- **Responsible for**: executing tests, verifying bug fixes, reporting bugs
- **NOT responsible for**: backend code analysis, service ops, build/deploy

## 2. Test Directory Structure

```
project/
├── phase{N}_test/           # Phase test directory
│   ├── testcase/            # Static test case documents
│   ├── tests/               # SHARED test scripts (all rounds reuse)
│   │   └── api-regression.py
│   ├── round_YYYYMMDD_NN/   # Per-round directory (reports only)
│   │   └── test-results/
│   │       └── test-report.md
│   └── ...
```

**Key Rule**: Test scripts are placed in `phase{N}_test/tests/` and shared across all rounds. Do NOT create new scripts per round when APIs are unchanged.

## 3. Test Execution Flow

```
1. Confirm test scope based on testcase/ documents
2. Execute tests using shared scripts from phase{N}_test/tests/
3. Record results to round_{YYYYMMDD}_{NN}/test-results/
4. Report and manage bugs
```

## 4. Bug Lifecycle Management

### 4.1 Bug Status Rules

| Fix Status | Action | Status |
|-----------|--------|--------|
| Fully fixed | Close bug | `closed` |
| Not fixed at all | Reopen original bug | `pending` |
| Partially fixed | Choose Option A or B below | — |
| Invalid bug | Close with reason | `closed` |

### 4.2 Partial Fix Options

**Option A — Reopen Original Bug (Recommended)**
- Use when: core issue still exists, fix is incomplete
- Action: `status = pending`, append new findings to description

**Option B — Close Original + Create New Bug**
- Use when: core issue resolved but new derivative problems appear
- Action: close original (note fixed parts), create new bug for remaining issues

### 4.3 Title Misleading Fix

When bug title describes a broader scope than actual fix:

1. **Close original bug**: note what was fixed and what remains
2. **Create new bug**: with accurate, specific title for remaining issues
3. **Reason**: prevent developers from assuming all issues are resolved by reading title only

**Example**:
- Original: "Backend missing /auth path prefix" (fixed for AuthController only)
- Actual: UsersController still broken
- Action: Close original, create "UsersController missing /auth path prefix"

## 5. Bug Report Template

```markdown
## Basic Info
- **Phase**: Phase N
- **Round**: round_YYYYMMDD_NN
- **API Endpoint**: {endpoint path}
- **Severity**: 🔴 Critical / 🟡 Medium / 🔵 Low

## Problem Description
{Clear bug description}

## Expected Result (per API docs)
{Reference to API documentation}

## Actual Result
{What actually happened}

## Reproduction Steps
1. {Step 1}
2. {Step 2}

## Environment
- API URL: http://localhost:3001
- SDK Version: @project/api-sdk v0.2.0
- Test Round: round_YYYYMMDD_NN
```

## 6. Regression Testing Checklist

### Before Testing
- [ ] Read current bug list to understand fix scope
- [ ] Verify test scripts are up-to-date (modify only if APIs changed)
- [ ] Create round directory: `round_YYYYMMDD_NN/test-results/`

### During Testing
- [ ] Execute full regression test suite
- [ ] Verify all previously reported bugs
- [ ] Check both success and error response formats
- [ ] Validate HTTP status codes match expectations
- [ ] Test edge cases (empty input, invalid UUID, etc.)

### After Testing
- [ ] Update bug statuses immediately (close fixed, reopen unfixed)
- [ ] Handle title-misleading bugs (close + create new if needed)
- [ ] Generate test report with pass/fail statistics
- [ ] Document remaining issues with clear next steps

## 7. Test Report Requirements

- Test date, scope, methodology
- Statistics: passed / failed / total, pass rate
- Detailed bug list with severity and impact
- Environment information
- Recommended fix priorities

## 8. Naming Conventions

| Element | Pattern | Example |
|---------|---------|---------|
| Phase dir | `phase{N}_test` | `phase1_test` |
| Round dir | `round_{YYYYMMDD}_{NN}` | `round_20260508_01` |
| Test script | `{module}-regression.py` | `auth-regression.py` |
| Report | `phase{N}-{type}-report.md` | `phase1-regression-report.md` |
| Bug title | `[Phase{N}-Round{NN}] {brief description}` | `[Phase1-Round01] JWT expires in 7s` |

## 9. Common Pitfalls

1. **Creating duplicate test scripts per round** — Reuse shared scripts
2. **Leaving fixed bugs in `fixed` status** — Close them immediately after verification
3. **Keeping misleading bug titles** — Split into accurate new bugs
4. **Modifying tests to match broken backend** — Report backend bug instead
5. **Not documenting test environment** — Always include in reports
