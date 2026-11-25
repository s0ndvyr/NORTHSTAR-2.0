# NORTHSTAR 5.0 — Initial Requirements Traceability

Status values: **Planned**, **Audit required**, **Not implemented**, **Not verified**. No requirement is marked accepted merely because it appears in a plan.

| ID | Requirement | Priority | Dependencies | Implementation / verification evidence | Status |
|---|---|---|---|---|---|
| NS-ARCH-001 | React + TypeScript + Vite iPad-first PWA | P0 | Engineering foundation | Reproducible build, typecheck, iPad smoke test | Not implemented |
| NS-ARCH-002 | Clear workspace/domain boundaries | P0 | NS-ARCH-001 | Architecture map and dependency-boundary tests | Planned |
| NS-DATA-001 | Canonical shared academic data model | P0 | Domain boundaries | Schema, relationship, integrity tests | Planned |
| NS-DATA-002 | Field ownership, provenance, and source authority | P0 | NS-DATA-001 | Conflict/source-authority tests | Planned |
| NS-DATA-003 | Versioned migration, backup, restore, and recovery | P0 | NS-DATA-001 | Migration and restore test evidence | Planned |
| NS-STATE-001 | Centralized state, persistence, autosave, and drafts | P0 | NS-DATA-001 | Persistence, recovery, and cross-workspace tests | Planned |
| NS-UX-001 | Unified authoritative design system | P0 | NS-ARCH-001 | Component inventory and visual/accessibility tests | Planned |
| NS-UX-002 | iPad-first touch, orientation, and adaptive layouts | P0 | NS-UX-001 | Physical iPad acceptance evidence | Not verified |
| NS-UX-003 | Reduced motion and accessible interaction | P1 | NS-UX-001 | Automated and manual accessibility review | Planned |
| NS-ACAD-001 | Dashboard command center and intelligent priorities | P1 | NS-DATA-001 | Priority-rule and end-to-end tests | Not implemented |
| NS-ACAD-002 | Assignment lifecycle and cross-workspace synchronization | P0 | NS-DATA-001, NS-STATE-001 | Assignment lifecycle and regression tests | Audit required |
| NS-ACAD-003 | Courses, Calendar, Gradebook, Resources, Study Lab, Review Center | P0 | NS-DATA-001 | Workspace acceptance tests | Audit required |
| NS-CAN-001 | Canvas adapter and authoritative source mapping | P0 | NS-DATA-002 | Contract tests and authorized live verification | Not verified |
| NS-CAN-002 | Sync retry, idempotency, conflict preservation, and status | P0 | NS-CAN-001, NS-STATE-001 | Failure/replay/conflict tests | Audit required |
| NS-AI-001 | Provider-neutral AI service boundary | P1 | NS-ARCH-002 | Adapter contract tests | Planned |
| NS-AI-002 | Relevant, course-bounded context with source transparency | P1 | NS-DATA-002, NS-AI-001 | Grounding, relevance, and boundary tests | Planned |
| NS-AI-003 | Approval before consequential AI actions | P0 | NS-AI-001, NS-STATE-001 | Permission and approval-flow tests | Planned |
| NS-SEC-001 | Secret isolation, least privilege, and secure integration boundaries | P0 | NS-ARCH-002 | Secret scan, threat review, security tests | Audit required |
| NS-QUAL-001 | Automated build, type, lint, unit, integration, and regression gates | P0 | NS-ARCH-001 | CI run evidence | Audit required |
| NS-QUAL-002 | Performance, accessibility, and physical iPad qualification | P0 | NS-UX-001 | Recorded test evidence | Not verified |
| NS-REL-001 | Controlled preview/production release, rollback, and monitoring | P0 | NS-QUAL-001 | Deployment and rollback evidence | Audit required |
| NS-CAI-001 | One canonical academic data layer with domain ownership and workspace projections | P0 | NS-ARCH-002, NS-DATA-001 | Entity/schema review, duplicate-identity and cross-workspace consistency tests | Planned |
| NS-CAI-002 | Typed, versioned, idempotent internal event propagation | P0 | NS-CAI-001, NS-STATE-001 | Event contract, ordering, duplicate delivery, retry and subscriber recovery tests | Planned |
| NS-CAI-003 | Provider-aware external updates using supported webhooks/polling and manual refresh fallback | P0 | NS-CAN-001, NS-CAI-002 | Provider capability matrix, rate-limit, cursor, freshness and refresh tests | Audit required |
| NS-CAI-004 | Field-level source authority and durable provenance | P0 | NS-DATA-002, NS-CAI-001 | Field authority matrix and source-precedence/conflict tests | Planned |
| NS-CAI-005 | Conflict preservation, review and auditable resolution; no universal last-write-wins | P0 | NS-CAI-004, NS-CAI-002 | Concurrent edit, stale revision, deletion, ambiguous response and resolution tests | Planned |
| NS-CAI-006 | Offline cached reads with freshness indicators and bounded cache policy | P1 | NS-DATA-003, NS-STATE-001 | Offline cache, stale labeling, quota and eviction tests | Planned |
| NS-CAI-007 | Durable offline local writes and safe, idempotent reconnect reconciliation | P0 | NS-CAI-005, NS-CAI-006, NS-CAN-001 | Queue durability, permission revalidation, replay ordering, deduplication and recovery tests | Planned |
| NS-CAI-008 | Visible synchronization lifecycle, error, retry and recovery status | P1 | NS-CAI-002, NS-CAI-003 | Sync state-machine and user-visible status acceptance tests | Planned |
| NS-CAI-009 | Permission-aware adapter and domain-service boundaries for provider writes | P0 | NS-SEC-001, NS-CAN-001 | Authorization, secret isolation, revocation and approval-flow tests | Planned |
| NS-CAI-010 | Cross-workspace consistency and recovery verification | P0 | NS-CAI-001 through NS-CAI-009 | End-to-end workflow, offline/reconnect, conflict and regression evidence | Planned |

## Traceability rule

Every new implementation requirement must include a unique ID, decision/source, priority, dependencies, implementation criteria, verification method, and acceptance status. Status changes require evidence. A plan, mock, or simulated integration is not proof of live behavior.

## Cross-Application Intelligence decision source

NS-CAI-001 through NS-CAI-010 derive from the user's five approved decisions dated 2026-11-25 (CAI-DEC-01 through CAI-DEC-05) and the supporting specification in CROSS-APPLICATION-INTELLIGENCE-PLANNING.md. These requirements remain planned; none is represented as implemented or verified.
