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


## Module 1 — Comprehensive Legacy and Integration Evidence requirements

The following requirements derive from the user's A/A/A/A/A decisions EFP-DEC-16 through EFP-DEC-20 dated 2026-11-25. They are planning/audit requirements; none is implemented or verified.

| ID | Requirement | Priority | Dependencies | Implementation / verification evidence | Status |
|---|---|---|---|---|---|
| NS-MIG-005 | Every tracked legacy source, configuration, test, deployment and native artifact is accounted for with purpose, imports/dependencies, consumers, execution role, workflow relationships and preservation disposition | P0 | NS-MIG-002, NS-MIG-003 | Exact-source path inventory, dependency/consumer graph and source-to-workflow map | Audit required |
| NS-DATA-006 | Every persistence mechanism, key, store, schema and file lifecycle is traced to all read/write/delete/migration/fallback/cleanup/backup/recovery call sites | P0 | NS-MIG-004, NS-DATA-005 | Reconciled persistence matrix and lifecycle/recovery evidence | Audit required |
| NS-CAN-005 | Every Canvas Worker route and external provider operation is mapped to source, method, validation, permission, upstream endpoint, error behavior, security boundary and official evidence | P0 | NS-SEC-003, NS-CAN-004, NS-SEC-002 | Complete route/source/test/provider evidence catalogue and separate tenant verification gate | Audit required |
| NS-INT-003 | Seven workspace contracts define entities, ownership, projections, commands, events, permissions, offline/conflict/freshness behavior, migration and acceptance | P0 | NS-INT-002, NS-ARCH-003, NS-CAI-001 | Reviewed contracts for Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace | Planned |
| NS-GOV-004 | Module sign-off requires exact-source reconciliation and evidence-backed preservation, parity, backup/restore, rollback and risk gates | P0 | NS-GOV-003, NS-MIG-005, NS-DATA-006, NS-CAN-005, NS-INT-003 | Completed reconciliation report, open-risk disposition and explicit user sign-off | Planned |

Supporting specification: MODULE-1-LEGACY-AND-INTEGRATION-EVIDENCE-PLAN.md. Approval of these requirements authorizes planning and static source analysis only. It does not authorize application implementation, migration, dependency installation, live provider/tenant access, Worker deployment, legacy deletion, production changes, build/test execution or runtime qualification.


## Module 2 — Repository, Engineering Standards and Qualification requirements

These requirements derive from EFP-DEC-21 through EFP-DEC-25 and the user's additional planning-process instruction dated 2026-11-25. They describe planned controls, not implemented or verified controls.

| ID | Requirement | Priority | Dependencies | Acceptance / verification evidence | Status |
|---|---|---|---|---|---|
| NS-GOV-005 | NORTHSTAR 5.0 work is isolated on a dedicated development branch with production and stabilization history protected | P0 | NS-GOV-001, NS-GOV-003 | Verified branch/base/merge model and repository protection plan | Planned |
| NS-ARCH-004 | Future 5.0 application source is isolated in a defined application directory with documented boundaries from legacy source and planning artifacts | P0 | NS-ARCH-001, NS-MIG-005 | Reconciled directory proposal compatible with hosting, PWA and native iOS constraints | Planned |
| NS-ENG-001 | Engineering toolchain uses React, TypeScript, Vite, npm, committed lockfile, strict type checking, documented Node.js LTS and controlled dependency governance | P0 | NS-ARCH-001, NS-ARCH-004 | Versioned toolchain decision record and compatibility/security review | Planned |
| NS-QUAL-001 | Quality strategy covers static checks, unit, component, integration, end-to-end, regression, accessibility, security, performance, offline/recovery and physical iPad acceptance | P0 | NS-ENG-001, NS-INT-003, NS-SEC-002 | Test strategy, workflow traceability and qualification evidence templates | Planned |
| NS-REL-001 | CI, preview and production promotion are isolated and governed with automated gates, explicit approval, release evidence, version traceability and rollback | P0 | NS-GOV-005, NS-QUAL-001, NS-SEC-002 | CI/preview/release design and release/rollback acceptance checklist | Planned |
| NS-GOV-006 | NORTHSTAR planning modules group varied related topics, provide recommendations/trade-offs and free-text input, carry decisions forward and avoid repetitive five-question cycles | P0 | NS-GOV-003 | Planning artifacts demonstrate coherent grouped coverage, traceability and non-repetitive decision handling | Approved planning rule |

Supporting specification: MODULE-2-REPOSITORY-ENGINEERING-AND-QUALIFICATION-PLAN.md. The planning approvals themselves did not authorize implementation. A subsequent explicit user instruction authorizes continued local/demo application implementation and development-branch CI/build/test work. It does not authorize live provider access, credentials, destructive migration, legacy retirement, production deployment or release promotion.


## Implementation evidence checkpoint — 2026-11-25

The following is a progress annotation, not an acceptance update. Existing requirement statuses remain unchanged until verification evidence is attached.

| Requirement | Current implementation evidence | Remaining acceptance evidence |
|---|---|---|
| NS-ARCH-001 | React/TypeScript/Vite client exists under `apps/web/`; strict TypeScript configuration and workspace routing are present. | Lockfile, successful clean build, PWA qualification, iPad acceptance. |
| NS-DATA-001 | Version-1 academic snapshot now includes terms, courses, assignments, resources and course-linked spaced-repetition cards; runtime validation checks record shape, relationships, enums and duplicate identities. Revisioned writing drafts have been added to the same persisted snapshot. | Full canonical entity catalogue, migration/restore coverage, field-level provenance and domain integrity tests. |
| NS-STATE-001 | Local snapshot persistence and revisioned assignment, resource, study-card and writing-draft commands exist; storage failure falls back to session memory and is surfaced in the UI. | Durable multi-device recovery, backup/restore, conflict resolution and offline write queue. |
| NS-ACAD-001 | Dashboard calculates completion, overdue/upcoming counts, course pulse and a priority queue from the shared snapshot. | Priority-rule tests, richer semester calculations and end-to-end verification. |
| NS-ACAD-002 | Assignment create/edit/delete/status, search, course/status filters, notes, priority, due date and estimates are implemented. Review Center can save/resume assignment-linked writing drafts. Calendar and dashboard read the same assignment collection. | File/artifact lifecycle, honest submission-state semantics, conflict/recovery tests and cross-workspace E2E. |
| NS-ACAD-003 | Courses include detail hubs; Calendar projects assignment deadlines; Study Lab has authored flashcards and spaced-repetition commands; Gradebook currently shows assignment-based progress only; Resources has local create/edit/delete; Review Center has local writing checks and persistent drafts. | Calendar event authoring, genuine score/feedback records, richer learning/review paths, course tools and end-to-end workspace synchronization. |
| NS-QUAL-001 | A development-branch GitHub Actions workflow is configured to install, typecheck and build. | Successful recorded workflow run, deterministic lockfile, automated tests/lint/security checks. |

These entries are implementation progress only. No live Canvas/AI integration, physical iPad qualification, or release acceptance is implied.


### Resource and PWA implementation extension — 2026-11-25

- NS-DATA-001: extended the shared snapshot with course-linked resource records while preserving compatibility with existing version-1 snapshots that do not yet contain a resource collection.
- NS-STATE-001: resource create/update/delete commands use the same academic snapshot revision and browser persistence mechanism as assignments.
- NS-ACAD-003: Resources now supports local notes, references and HTTPS-only external links, with search, course filtering and edit/delete actions.
- NS-ARCH-001 / NS-UX-001: added web app manifest, SVG app icon, production service-worker registration, and conservative app-shell/static-asset caching.
- NS-QUAL-001: added initial resource lifecycle and HTTPS URL validation tests; added production-dependency audit to the development qualification workflow.

Acceptance remains pending for the latest code commit until the corresponding workflow completes. PWA/offline and physical iPad behavior remain unverified on target devices.


### Writing Review persistence extension — 2026-11-25

- NS-STATE-001: added revisioned local writing drafts in the shared academic snapshot, with save/update/delete and optional assignment association.
- NS-ACAD-002 / NS-ACAD-003: Review Center now saves named drafts, resumes them, lists saved work, allows association to an assignment, and preserves the writing as an independent draft if that assignment is removed.
- NS-SEC-001: the interface and application README explicitly disclose that browser-local drafts are not encrypted, synchronized or sent to a provider; users are warned not to store credentials or highly sensitive content.
- NS-QUAL-001: repository tests cover draft creation, revision, preservation after assignment deletion, and deletion. The corresponding GitHub Actions qualification run is pending.

This remains a local/demo capability; no cloud document service, AI review, plagiarism service or official assignment submission is connected.


### Writing, study, course, and qualification evidence extension — 2026-11-25

- NS-ACAD-002: assignments link directly to a saved writing-draft workspace; draft association is optional and draft content survives deletion of its linked assignment as an independent local draft.
- NS-ACAD-003: course detail hubs project assignments, resources and study cards from the shared snapshot; Study Lab supports authoring and spaced-repetition ratings; Resources supports local notes/references/HTTPS links.
- NS-STATE-001: writing drafts use the same revisioned local academic snapshot and are explicitly saved/resumed from Review Center.
- NS-QUAL-001: Vitest 4.1.11 is in use; npm 11.6.2 CI install, production audit, full dependency advisory report, repository tests, typecheck and build gates are configured. A successful run on the writing-draft model/test commits reported all gates passing and zero dependency advisories. The latest assignment-to-draft navigation addition remains pending its own run.


### Backup and recovery progress — 2026-11-25

- NS-DATA-003 / NS-DATA-005: a versioned local backup envelope now exports the full academic snapshot and validates it on restore; malformed and unsupported versions are rejected.
- NS-STATE-001: Settings supports explicit backup export and confirmation-gated restore, preserving resources, study cards and writing drafts in the same canonical snapshot.
- Verification: unit tests cover complete snapshot round-trip and invalid backup rejection. Full recovery qualification, interrupted writes, browser quota failure, encryption, cloud backup and offline conflict recovery remain open.


### Calendar, Gradebook and AI Workspace progress — 2026-11-25

- NS-ACAD-003: Calendar now combines assignment due dates with separate class/study/reminder/personal events; Gradebook uses explicit grade-item records and points-based summaries, excluding pending/missing records.
- NS-DATA-001: event and grade records are validated against course/assignment relationships; deleting an assignment detaches related independent drafts, events and grade items instead of destroying them.
- NS-ACAD-005 / NS-AI-001: AI Workspace is now a provider-free co-pilot simulation with on/off, standing-by status, simulated request state, notifications and a local academic context preview. No AI call or external transfer is made.
- NS-QUAL-001: current successful workflow evidence includes strict TypeScript, dependency audit, repository tests and production build; the Calendar/Gradebook/AI UI additions are awaiting their latest run.


### Assignment submission simulation and co-pilot surface — 2026-11-25

- NS-ACAD-002: added a confirmation-gated local turn-in action, status propagation and animated confirmation. UI explicitly states no Canvas/institution transport occurred.
- NS-AI-001: AI Workspace is a provider-free simulation only; on/off, standing-by, sample action preparation and notification state are UI behavior, not AI execution.
- Both are implementation progress; they do not satisfy live submission integration or AI-provider acceptance criteria.


### Deterministic dependency installation evidence — 2026-11-25

- NS-QUAL-001: `apps/web/package-lock.json` is now committed (npm lockfile v3), and CI performs clean `npm ci` with read-only repository permissions.
- A clean lockfile install completed successfully in the workflow before the lockfile commit; subsequent CI runs use the committed lock as the reproducible dependency source.
