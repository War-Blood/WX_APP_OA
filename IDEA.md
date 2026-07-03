# Hermes Design Brief — Smart Office OA System

## Role Split

- **Hermes**: Design brain — architecture, module design, UI/UX specs, data modeling, workflow definitions
- **Claude Code**: Development executor — implements Hermes' designs as production code

---

## Current System Overview

A WeChat Mini-Program OA (Office Automation) system for a mid-sized enterprise with field workers.

### Tech Stack

| Layer        | Stack                                            |
| ------------ | ------------------------------------------------ |
| Backend      | Node.js 18 + Express 4 + MySQL 8.0 + Redis 6.x   |
| Mini-Program | uni-app (Vue 3 + Vite) + Pinia                   |
| Web Admin    | Vue 3 + TypeScript + Vite + Element Plus + Pinia |
| Deployment   | Ubuntu 24.04 / PM2 fork / Nginx reverse proxy    |

### Architecture Pattern

```
routes/       → URL dispatch + middleware binding (no business logic)
controllers/  → Joi validation + call service + response wrapper
services/     → All business logic + transaction orchestration
common/       → DB/Redis/Middleware/Cron infrastructure
```

Unified response: `{ code: 0, message: "success", data: {...} }`

### Current Modules

| Module           | Description                                                                            |
| ---------------- | -------------------------------------------------------------------------------------- |
| Auth             | WeChat login + JWT + TOTP 2FA                                                          |
| Report           | Daily field-work reports (biz_trip) + supplement reports, multi-worker fill            |
| Approval         | Multi-level approval workflows                                                         |
| Review           | Report review + compliance review                                                      |
| Stats            | Multi-dimensional statistics (area distribution, work-type breakdown, personnel stats) |
| Project          | Project tracking with progress (required/completed qty)                                |
| Compliance       | Compliance record management                                                           |
| Message          | In-app notification system                                                             |
| Admin            | User/role/roster management                                                            |
| Attendance (new) | Schedule calendar + leave requests + biz-trip start/end tracking                       |
| WPS              | WPS Office integration                                                                 |

### Multi-Agent Development System

12 specialized agents handle different code areas:

**Backend (6)**: auth-agent, core-agent, project-agent, data-agent, wps-agent, common-agent
**Mini-Program (3)**: miniapp-core-agent, miniapp-admin-agent, miniapp-common-agent
**Web Admin (3)**: webapp-core-agent, webapp-admin-agent, webapp-common-agent

Each agent owns specific directories and has a SKILL.md defining its capabilities. An orchestrator agent distributes tasks.

---

## Vision: Evolve Into a Pluggable Business Rule Engine

### Target State

A pluggable business rule engine and workflow orchestrator for automating HR, finance, and administrative processes in a mid-sized enterprise.

### Desired Capabilities

1. **Centralize and version-control business rules** using a DSL and visual editor

   - Approval chains, field validation rules, report type definitions, compliance checks
   - Currently hardcoded in service files — need abstraction layer
2. **Integrate with existing ERP/HR systems** via REST APIs and event-driven triggers

   - Current: single-tenant monolith → Target: multi-system integration hub
3. **Dashboard for monitoring rule execution, SLA breaches, and audit trails**

   - Current: basic stats pages → Target: real-time execution monitoring + SLA tracking
4. **Enable non-technical staff to modify approval workflows** without code deployment

   - Current: any workflow change = code change + PM2 restart → Target: visual workflow editor + hot-reload
5. **Support multi-tenant deployment** for departmental isolation

   - Current: single-tenant → Target: tenant_id partitioning across all tables

### Core Gaps to Bridge

| Dimension          | Current                | Target                              |
| ------------------ | ---------------------- | ----------------------------------- |
| Business rules     | Hardcoded in services  | DSL-defined, version-controlled     |
| Workflow changes   | Code → deploy         | Visual editor → hot-reload         |
| System integration | None (standalone)      | REST + event-driven triggers        |
| Tenancy            | Single                 | Multi-tenant                        |
| Monitoring         | Static stats pages     | Real-time execution + SLA dashboard |
| Event system       | Synchronous calls only | Event bus / message queue           |

### Constraints

- Must remain compatible with WeChat Mini-Program ecosystem
- Backend must stay Node.js/Express (team expertise)
- MySQL remains primary database (no migration to NoSQL)
- Gradual evolution preferred over big-bang rewrite
- Each module must remain independently maintainable by its dedicated agent
