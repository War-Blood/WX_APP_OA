---
name: "bugpack-manager"
description: "Manages bugpack workflow including initialization, bug creation with mandatory project specification, multi-bug detection from single screenshot, validation, storage, and status management. Invoke when user needs to create, query, split, or manage bugs using bugpack system."
---

# Bugpack Manager

This skill provides a complete workflow for managing bugs using the bugpack system, with mandatory project association for every bug record and support for detecting multiple bugs from a single screenshot.

## Core Features

1. **Initialization Configuration** - Set up bugpack with project defaults
2. **Interactive Bug Creation** - Guided workflow with mandatory project field
3. **Multi-Bug Detection** - Analyze single screenshot to identify multiple independent bugs
4. **Bug Splitting** - Split complex bug reports into separate, trackable issues
5. **Bug Validation & Storage** - Ensure data integrity before saving
6. **Status Query & Management** - Track and update bug lifecycle

## Workflow

### Step 1: Initialize Bugpack Configuration

Before creating bugs, ensure bugpack is properly configured:

```bash
# Check available projects
mcp_bugpack_list_bugs

# Verify project exists or needs creation
```

**Configuration Options:**
- Default project for new bugs
- Status workflow (pending → annotating → generated → fixed → closed)
- Required fields validation rules

### Step 2: Create Bug (Interactive Flow)

**CRITICAL: Project field is MANDATORY and must be specified first.**

The bug creation process follows this sequence:

1. **Specify Project** (Required - No default)
   - Ask user: "Which project does this bug belong to?"
   - Validate project exists in bugpack system
   - Display available projects if user unsure

2. **Collect Bug Details**
   - Bug title/summary
   - Description with reproduction steps
   - Severity level (critical/high/medium/low)
   - Environment information
   - Screenshots or attachments

3. **Validate Information**
   - Ensure project field is not empty
   - Validate title length (min 5 characters)
   - Check description completeness
   - Verify severity is valid option

4. **Store Bug Record**
   - Save with project as primary metadata
   - Generate unique bug ID
   - Set initial status: "pending"
   - Confirm successful creation

**Example Interaction:**

```
User: "Create a new bug"

Assistant: "I'll help you create a new bug. First, which project does this bug belong to?"
         "Available projects: WX-APP-OA, Backend-API, Frontend-Web"

User: "WX-APP-OA"

Assistant: "Great! Now please provide the bug details:
         - Title: [required]
         - Description: [required] 
         - Severity: [critical/high/medium/low]
         - Environment: [optional]"

[After collection and validation]

Assistant: "✅ Bug created successfully!
         - ID: #42
         - Project: WX-APP-OA
         - Status: pending
         - Title: [bug title]"
```

### Step 3: Multi-Bug Detection from Single Screenshot

**CRITICAL: When analyzing a screenshot, ALWAYS check for multiple independent bugs.**

When user provides a screenshot (via file path or image data), follow this enhanced workflow:

#### 3.1 Image Analysis Process

1. **Read and Analyze Image**
   ```
   Read(image_path) → Analyze visual content
   ```

2. **Identify Bug Regions**
   - Scan entire image for error indicators
   - Look for: error messages, UI anomalies, broken layouts, console errors
   - Identify distinct, independent issues

3. **Multi-Bug Detection Criteria**
   Each identified issue should be a separate bug if:
   - **Different components** affected (e.g., header vs. sidebar)
   - **Different error types** (e.g., 404 error vs. styling issue)
   - **Different root causes** (e.g., API failure vs. rendering bug)
   - **Independent fix required** (fixing one doesn't fix the other)

#### 3.2 Bug Classification Template

For each identified bug, extract:

```
Bug #{N}:
├── Location: [UI component/screen area]
├── Issue Type: [error/warning/styling/functional]
├── Severity: [critical/high/medium/low]
├── Title: [concise description]
├── Description: [detailed explanation]
└── Evidence: [screenshot region reference]
```

#### 3.3 User Confirmation Flow

```
Assistant: "📸 Screenshot Analysis Complete"
         
         "I found {N} independent bugs in this image:"
         
         "Bug #1: [Title] - [Severity]"
         "  └─ Location: [Where]"
         "  └─ Issue: [What]"
         
         "Bug #2: [Title] - [Severity]"
         "  └─ Location: [Where]"
         "  └─ Issue: [What]"
         
         "[... more bugs ...]"
         
         "Would you like me to create all {N} bugs, or would you like to:"
         "A. Create all bugs as identified"
         "B. Merge some bugs"
         "C. Skip certain bugs"
         "D. Review and edit before creating"
```

#### 3.4 Multi-Bug Creation Process

If user confirms creating multiple bugs:

1. **Batch Creation**
   ```
   For each identified bug:
     - Assign sequential bug numbers
     - Create individual bug record
     - Link to same screenshot (if applicable)
     - Set status to "pending"
   ```

2. **Summary Report**
   ```
   ✅ Created {N} bugs for project {Project}:
   
   ├── Bug #{ID1} - [Title] - [Status]
   ├── Bug #{ID2} - [Title] - [Status]
   ├── Bug #{ID3} - [Title] - [Status]
   └── ...
   
   All bugs are now trackable independently.
   ```

**Example Multi-Bug Detection:**

```
User: [Provides screenshot of dashboard with multiple issues]

Assistant analyzes and finds:
- Bug 1: Header navigation menu not responsive (UI/Functional)
- Bug 2: Chart data showing "undefined" values (Data/Functional)
- Bug 3: Footer copyright text overlapping (Styling)
- Bug 4: Console showing 404 error for API endpoint (API/Error)

Result: 4 separate bugs created with independent tracking
```

### Step 4: Bug Splitting (Existing Bug → Multiple Bugs)

When user requests to split an existing bug:

1. **Retrieve Original Bug Context**
   ```bash
   mcp_bugpack_get_bug_context --bug_number {N} --project {PROJECT}
   mcp_bugpack_get_bug_screenshot --bug_number {N} --project {PROJECT}
   ```

2. **Analyze for Split Points**
   - Review bug description for multiple issues
   - Check screenshot for distinct problems
   - Identify logical separation points

3. **Create Child Bugs**
   - Create new bugs for each identified sub-issue
   - Reference original bug in description
   - Mark original bug as related/split

4. **Update Original Bug**
   - Add note: "Split into bugs #{ID1}, #{ID2}, #{ID3}"
   - Optionally close original if fully covered by children

**Example Splitting Flow:**

```
User: "Split bug #42 into multiple bugs"

Assistant: "Analyzing bug #42..."
         "Found 3 distinct issues in the report:"
         
         "1. Login form validation error"
         "2. Password reset email not sending"
         "3. Session timeout too short"
         
         "Creating 3 separate bugs..."
         
         "✅ Split complete:"
         "- Original Bug #42 → Split into"
         "- Bug #45: Login form validation"
         "- Bug #46: Password reset email"
         "- Bug #47: Session timeout"
```

### Step 5: Query Bug Status

**List Bugs by Project:**
```bash
mcp_bugpack_list_bugs --project "WX-APP-OA"
```

**Get Specific Bug Details:**
```bash
mcp_bugpack_get_bug_context --bug_id "BUG-123" --project "WX-APP-OA"
```

**Filter by Status:**
```bash
mcp_bugpack_list_bugs --project "WX-APP-OA" --status "pending"
```

### Step 6: Manage Bug Lifecycle

**Update Bug Status:**
```bash
mcp_bugpack_mark_bug_status --bug_number 42 --project "WX-APP-OA" --status "fixed"
```

**Add Fix Notes:**
```bash
mcp_bugpack_add_fix_note --bug_number 42 --project "WX-APP-OA" --note "Fixed in commit abc123"
```

**Get Bug Screenshots:**
```bash
mcp_bugpack_get_bug_screenshot --bug_number 42 --project "WX-APP-OA"
```

## Validation Rules

### Bug Creation Validation
- **Project**: Must be non-empty string, must exist in system
- **Title**: Minimum 5 characters, maximum 200 characters
- **Description**: Minimum 10 characters
- **Severity**: Must be one of [critical, high, medium, low]
- **Status**: Defaults to "pending", must be valid status value

### Multi-Bug Detection Validation
- **Independence Check**: Each bug must be fixable independently
- **Distinct Symptoms**: Different visual or behavioral manifestations
- **Clear Boundaries**: Issues don't overlap in scope
- **Valid Count**: Minimum 2 bugs to qualify as "multi-bug"

### Project Association
- Every bug MUST have a project field
- Project name is displayed in ALL bug listings
- Project filter is available in ALL query operations
- Cannot create bug without specifying project

## Error Handling

### Common Errors
1. **Missing Project**: "Project is required. Please specify which project this bug belongs to."
2. **Invalid Project**: "Project 'X' not found. Available projects: [list]"
3. **Validation Failed**: "Bug creation failed: [field] is invalid - [reason]"
4. **Storage Error**: "Failed to save bug. Please try again or check system status."
5. **No Bugs Detected**: "Could not identify any bugs in the provided image. Please check the image or describe the issue."
6. **Ambiguous Split**: "Cannot clearly split this bug. Please provide more details on how to separate the issues."

### Recovery Actions
- If project missing: Prompt user to select from available projects
- If validation fails: Show specific error and allow correction
- If storage fails: Retry once, then report system error
- If no bugs detected: Ask user to describe what they see
- If split ambiguous: Request clarification on separation points

## Display Format

### Bug Summary Display
```
┌─────────────────────────────────────┐
│ Bug #42 - [Status Badge]            │
│ Project: WX-APP-OA                  │
│ Title: [Bug Title]                  │
│ Severity: [Level]                   │
│ Created: [Timestamp]                │
└─────────────────────────────────────┘
```

### Multi-Bug Detection Summary
```
📸 Screenshot Analysis Results
═══════════════════════════════════════

Found {N} independent bugs:

┌─ Bug #1 ───────────────────────────┐
│ [🔴 Critical] Header Menu Broken   │
│ Location: Top navigation bar       │
│ Issue: Click events not firing     │
└────────────────────────────────────┘

┌─ Bug #2 ───────────────────────────┐
│ [🟡 Medium] Chart Data Invalid     │
│ Location: Dashboard main chart     │
│ Issue: Shows "undefined" values    │
└────────────────────────────────────┘

┌─ Bug #3 ───────────────────────────┐
│ [🟢 Low] Footer Text Overlap       │
│ Location: Page footer              │
│ Issue: Copyright text overlapping  │
└────────────────────────────────────┘

[Create All] [Review/Edit] [Cancel]
```

### Project-Grouped Listing
```
Project: WX-APP-OA
├── Bug #42 - [pending] Login error
├── Bug #43 - [fixed] Button styling
└── Bug #44 - [annotating] API timeout

Project: Backend-API
├── Bug #45 - [pending] Database connection
```

## Usage Examples

### Example 1: Create Bug with Full Details
```
User: "Report a bug for WX-APP-OA where login fails with 500 error"

Action: Extract project=WX-APP-OA, create bug with provided details
Result: "✅ Bug #45 created for project WX-APP-OA"
```

### Example 2: Multi-Bug Detection from Screenshot
```
User: "Check this screenshot for bugs"

Action: 
1. Read and analyze image
2. Identify 3 independent issues:
   - Navigation broken
   - Data not loading
   - Styling issues
3. Present findings to user
4. Create 3 separate bugs on confirmation

Result: "✅ Created 3 bugs (#45, #46, #47) from screenshot analysis"
```

### Example 3: Split Existing Bug
```
User: "Split bug #42 into separate issues"

Action:
1. Retrieve bug #42 context
2. Analyze for split points
3. Identify 2 distinct issues
4. Create bugs #48 and #49
5. Update bug #42 with split reference

Result: "✅ Bug #42 split into #48 and #49"
```

### Example 4: Query Project Bugs
```
User: "Show me all pending bugs in WX-APP-OA"

Action: List bugs with project=WX-APP-OA, status=pending
Result: Display filtered bug list with project column
```

### Example 5: Update Bug Status
```
User: "Mark bug #42 in WX-APP-OA as fixed"

Action: Update status with project verification
Result: "✅ Bug #42 status updated to 'fixed' in project WX-APP-OA"
```

## Integration Points

- **mcp_bugpack_list_bugs**: List all bugs or filter by project/status
- **mcp_bugpack_get_bug_context**: Retrieve full bug details including project
- **mcp_bugpack_get_bug_screenshot**: Get visual evidence for bug
- **mcp_bugpack_mark_bug_status**: Update bug lifecycle state
- **mcp_bugpack_add_fix_note**: Append resolution information

## Best Practices

1. **Always verify project first** before any bug operation
2. **Display project prominently** in all bug-related outputs
3. **Validate early** - check project exists before collecting other details
4. **Group by project** when displaying multiple bugs
5. **Maintain audit trail** - log all status changes with timestamps
6. **Analyze thoroughly** - when given screenshot, check entire image for issues
7. **Split wisely** - only split when issues are truly independent
8. **Confirm before batch creation** - always get user approval for multi-bug creation
9. **Preserve relationships** - when splitting, link child bugs to parent
10. **Clear visual separation** - use formatting to distinguish multiple bugs in output