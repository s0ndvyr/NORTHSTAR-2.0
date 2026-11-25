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


| NS-DATA-004 | Field-level canonical entity catalogue with explicit relationships, ownership, lifecycle and field provenance | P0 | NS-DATA-001, NS-DATA-002, NS-CAI-001, NS-CAI-004 | Reviewed logical model, field ownership catalogue, relationship/integrity and lifecycle test specifications | Planned |
| NS-CAN-003 | Canvas capability matrix for each required object and operation, including permissions, limitations, versioning and evidence class | P0 | NS-CAN-001, NS-CAI-003, NS-CAI-004, NS-SEC-001 | Dated official-documentation matrix, endpoint/scope inventory, target-tenant verification record only when separately authorized | Audit required |
| NS-DATA-005 | Data-class cache, freshness, quota, retention, backup, restore, disconnect and eviction policy | P0 | NS-DATA-003, NS-CAI-006, NS-CAI-007, NS-SEC-001 | Approved lifecycle policy, quota/eviction tests, integrity and restore rehearsal, disconnect/revocation tests | Planned |
| NS-MIG-001 | Capability-led legacy workflow and data mapping with preservation, replacement, parity and rollback criteria | P0 | ADR-5-002, ADR-5-007, NS-DATA-003, NS-CAI-010 | Storage/call-site inventory, source-to-target mapping, reconciliation fixtures, parity and rollback evidence | Audit required |
| NS-QUAL-003 | Requirement-linked data architecture verification blueprint including failure, recovery, security and iPad evidence | P0 | NS-QUAL-001, NS-QUAL-002, NS-CAI-001 through NS-CAI-010, NS-DATA-003 | Traceable test matrix, repeatable reports, recovery evidence and environment/device metadata | Planned |

## Traceability rule

Every new implementation requirement must include a unique ID, decision/source, priority, dependencies, implementation criteria, verification method, and acceptance status. Status changes require evidence. A plan, mock, or simulated integration is not proof of live behavior.

## Cross-Application Intelligence decision source

NS-CAI-001 through NS-CAI-010 derive from the user's five approved decisions dated 2026-11-25 (CAI-DEC-01 through CAI-DEC-05) and the supporting specification in CROSS-APPLICATION-INTELLIGENCE-PLANNING.md. These requirements remain planned; none is represented as implemented or verified.


## Data Architecture Planning checkpoint source

NS-DATA-004, NS-CAN-003, NS-DATA-005, NS-MIG-001 and NS-QUAL-003 derive from the user's approved A/A/A/A/A Data Architecture Planning checkpoint dated 2026-11-25 (DAP-DEC-01 through DAP-DEC-05). These requirements are planning/audit items. Their addition does not represent implementation or verification.


| NS-ARCH-003 | Integrated architecture specification governs client, domain, provider, persistence and workspace boundaries | P0 | NS-ARCH-001, NS-ARCH-002, NS-DATA-001, NS-CAI-001 | Reviewed master specification and domain-boundary ADRs | Planned |
| NS-ARCH-004 | Conventional, maintainable toolchain and library choices are documented with rationale and deviation control | P1 | NS-ARCH-001, NS-QUAL-001 | Approved toolchain matrix, lockfile and ADR review after separate implementation authorization | Planned |
| NS-MIG-002 | Complete source-level legacy inventory covers routes, workflows, storage, files, call sites, integrations, dependencies and preservation requirements | P0 | NS-MIG-001, NS-CAI-010 | Reconciled source inventory, source-to-target map, parity fixtures and rollback plan | Audit required |
| NS-GOV-001 | Cross-Application Intelligence planning sign-off requires complete specifications, traceability, risk/open-decision review and acceptance criteria | P0 | NS-CAI-001 through NS-CAI-010, NS-DATA-004/005, NS-CAN-003, NS-MIG-001/002, NS-QUAL-003 | Completed design-gate checklist and user sign-off record | Planned |
| NS-GOV-002 | Cross-system planning and integration readiness continue without implementation until separately authorized | P0 | NS-GOV-001, all approved 5.0 workstream decisions | Updated phase tracker and explicit authorization record before any implementation | Planned |

## Integrated architecture planning decision source

NS-ARCH-003, NS-ARCH-004, NS-MIG-002, NS-GOV-001 and NS-GOV-002 derive from the user's C/B/A/A/A integrated architecture planning checkpoint dated 2026-11-25 (EFP-DEC-01 through EFP-DEC-05). Recommended library/tool choices remain planning defaults; no dependency is installed and no requirement is marked implemented or verified.


| NS-MIG-003 | Legacy source inventory reconciles all routes, storage keys/stores, read/write call sites, Worker routes, dependencies, files and deployment configuration | P0 | NS-MIG-001, NS-MIG-002 | Reconciled path inventory, storage/call-site matrix, provider route catalogue and dependency inventory | In progress |
| NS-CAN-004 | Canvas capability claims are supported by dated official endpoint documentation and explicit evidence classes; tenant verification is separately gated | P0 | NS-CAN-003, NS-CAI-002 | Endpoint/method/scope/pagination/limitation evidence matrix and separate tenant acceptance record | Planned |
| NS-OFF-002 | Offline cache, freshness, retention and recovery limits are derived from measured platform constraints and data sensitivity | P1 | NS-DATA-005, NS-CAI-005 | Measurement record, data-class policy, quota/eviction and recovery acceptance evidence | Planned |
| NS-SEC-002 | Privileged provider operations require a narrowly scoped server-side BFF or equivalent boundary | P0 | NS-CAI-002, NS-CAI-003, NS-ARCH-003 | Threat-reviewed BFF contract, route/method allowlist, auth/scope and secret-isolation tests | Planned |
| NS-INT-001 | Workspace integration contracts cover Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace | P0 | NS-ARCH-003, NS-CAI-001, NS-CAI-002 | Per-workspace entity/command/event/offline/permission/acceptance matrix | Planned |

These requirements derive from EFP-DEC-06 through EFP-DEC-10 (user checkpoint A/A/A/A/A dated 2026-11-25). Initial source evidence is documented in LEGACY-SOURCE-INVENTORY-INITIAL-REVIEW.md. No item is considered implemented or verified.


| NS-MIG-004 | Every browser persistence mechanism is inventoried by key/store/schema, data class, owner, reader, writer, migration, fallback, retention and deletion lifecycle | P0 | NS-MIG-001, NS-MIG-002, NS-DATA-005 | Reconciled localStorage/sessionStorage/IndexedDB matrix with all read/write/delete call sites and recovery evidence | Audit required |
| NS-SEC-003 | Every Canvas Worker route is documented with method, path, query/body validation, permission, upstream mapping, error behavior and security boundary | P0 | NS-SEC-002, NS-CAN-003, NS-MIG-003 | Complete source-to-test route matrix and threat-reviewed route contract | Audit required |
| NS-INT-002 | Each NORTHSTAR workspace has an explicit integration contract for entities, commands, events, permissions, offline behavior, conflict handling, freshness and acceptance | P0 | NS-INT-001, NS-CAI-001, NS-CAI-002, NS-SEC-002 | Reviewed contract set covering Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace | Planned |
| NS-GOV-003 | Inventory findings are reconciled to requirements, migration strategy, risk register and preservation/rollback gates before planning sign-off | P0 | NS-MIG-002, NS-MIG-003, NS-MIG-004, NS-SEC-003, NS-INT-002 | Traceability reconciliation and completed preservation/retirement gate review | Planned |

These requirements derive from EFP-DEC-11 through EFP-DEC-15 (user checkpoint A/A/A/A/A dated 2026-11-25). The initial evidence checkpoint is documented in SOURCE-TREE-AND-PERSISTENCE-INVENTORY.md. No requirement is represented as implemented or verified.
