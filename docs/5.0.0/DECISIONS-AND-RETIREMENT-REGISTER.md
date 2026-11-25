# NORTHSTAR 5.0 — Decisions and Retirement Register

## Baseline decisions

| ID | Decision | Rationale | Status |
|---|---|---|---|
| ADR-5-001 | Target React + TypeScript + Vite, iPad-first PWA | Approved NORTHSTAR 5.0 architecture | Approved planning baseline |
| ADR-5-002 | Preserve verified capability, not legacy file structure | Protects working behavior while enabling clean architecture | Adopt |
| ADR-5-003 | Shared academic data layer with field provenance/source authority | Prevents conflicting copies of academic truth | Adopt |
| ADR-5-004 | Integrations remain behind adapters and server-side boundaries | Protects credentials and reduces coupling | Adopt |
| ADR-5-005 | One authoritative design system | Eliminates visual and behavioral drift | Adopt |
| ADR-5-006 | Consequential AI changes require user approval | Maintains user control | Adopt |
| ADR-5-007 | No destructive legacy cleanup before dependency and regression review | Avoids accidental feature/data loss | Adopt |

## Phase 0 user sign-off decisions — 2026-11-25

The user submitted **A / A / A / A / A** through the five-question Phase 0 sign-off module. The following decisions are recorded as approved:

| Sign-off item | Recorded decision | Effect |
|---|---|---|
| SO-0-01 — Source baseline | A: Approve the dedicated 5.0.0 setup branch from the latest audited development source; production remains untouched. | Baseline accepted. |
| SO-0-02 — Setup deliverables | A: Accept the version marker, audit, architecture roadmap, requirements register, retirement register, and sign-off documentation. | Phase 0 deliverables accepted. |
| SO-0-03 — Legacy bloat handling | A: Preserve existing behavior until dependencies are mapped and replacements pass regression; then perform controlled retirement/consolidation. | No immediate legacy deletion authorized. |
| SO-0-04 — Target architecture | A: Approve React + TypeScript + Vite, iPad-first PWA, shared academic data, domain-separated workspaces, adapters, and one authoritative design system. | Architecture accepted as planning baseline. |
| SO-0-05 — Phase closure | A: Accept Phase 0 closure and prepare Engineering Foundation planning; application implementation requires separate explicit authorization. | Phase 0 closed; planning may proceed. |

**Phase 0 disposition:** Closed and user-approved. This approval covers the setup package and the planning direction only. It does not certify runtime behavior or authorize application coding, legacy deletion, production changes, deployment, or qualification.

## Cross-Application Intelligence decisions — 2026-11-25

The user submitted **A / A / A / A / A** through the five-question Cross-Application Intelligence planning module.

| Decision ID | Approved decision | Effect |
|---|---|---|
| CAI-DEC-01 | A — One canonical academic data layer with domain-owned models and workspace-specific read projections. | Prevents competing workspace copies of shared academic facts. |
| CAI-DEC-02 | A — Event-driven internal updates; provider webhooks/polling where supported; manual refresh and visible stale/error states. | Enables prompt internal propagation while respecting provider capabilities. |
| CAI-DEC-03 | A — Explicit field-level source authority and provenance; Canvas owns official institution records and NORTHSTAR owns personal workflow fields. | Authority cannot be inferred from timestamps or selected independently by each workspace. |
| CAI-DEC-04 | A — Never silently overwrite; preserve competing versions and request user review when safe automatic resolution is unavailable. | Conflict preservation and auditable resolution are mandatory. |
| CAI-DEC-05 | A — Offline cached reads and queued permitted local edits with idempotent reconciliation and visible conflict/recovery status. | Offline support must preserve work and safely reconcile after reconnect. |

**Disposition:** Five decisions approved. Supporting specifications are drafted in CROSS-APPLICATION-INTELLIGENCE-PLANNING.md. This is planning approval for these architecture choices, not phase closure or implementation authorization.

## Candidate retirement / consolidation

| ID | Candidate | Proposed action | Required evidence before removal |
|---|---|---|---|
| RET-001 | Direct Gemini API/key workflow | Remove from core UI; retain provider-neutral adapter contract | Call-site, secret, and dependency inventory; replacement tests |
| RET-002 | StudentVUE import workflow | Isolate as optional utility | User-approved scope and data dependency review |
| RET-003 | Duplicate Copilot/autopilot controls | Consolidate into AI Workspace | Route/action parity and navigation regression tests |
| RET-004 | Duplicate alert surfaces | Consolidate into notification center | Event coverage and notification regression tests |
| RET-005 | Runtime release-history UI | Move engineering history to docs | Confirm no user workflow depends on it |
| RET-006 | Developer diagnostics in student navigation | Move behind developer/support access | Support workflow retained and access checked |
| RET-007 | Overlapping CSS files | Consolidate into design tokens and components | Visual regression and computed-style review |
| RET-008 | Large monolithic JavaScript files | Split by domain and responsibility | Import/dependency map and test parity |
| RET-009 | Legacy logs and duplicated documentation | Archive after migration of unique decisions/evidence | Link, decision, and evidence reconciliation |

## Non-negotiable preservation set pending verification

Canvas Worker/security boundaries; assignment routing and submission; Document Studio/PDF/annotation/export; document persistence and recovery; grade/course data; external handoffs and return-context validation; existing regression tests.

## Removal policy

This register authorizes analysis and planning only. It does not authorize deleting existing files or disabling features. Each retirement must be implemented as a reviewable change after replacement or approved deprecation, with tests and a rollback path.


## Data Architecture Planning checkpoint decisions — 2026-11-25

The user submitted **A / A / A / A / A** through the five-question Data Architecture Planning checkpoint. Record these as approved planning-scope decisions:

| Decision ID | Approved selection | Planning consequence |
|---|---|---|
| DAP-DEC-01 | A — Comprehensive field-level canonical academic model | Catalogue important entities, fields, relationships, ownership, provenance and lifecycle; keep logical planning distinct from a physical schema. |
| DAP-DEC-02 | A — Comprehensive Canvas capability matrix | Document records, operations, fields, limitations, permissions, versioning and verification evidence; do not assume endpoint or tenant support. |
| DAP-DEC-03 | A — Explicit data-class lifecycle policy | Define cache eligibility, freshness, quotas, retention, protected eviction, backup, restore, disconnect and recovery by data class. |
| DAP-DEC-04 | A — Full legacy capability and data mapping | Map workflows, records, persistence, integrations, dependencies, preservation and replacement criteria before migration or retirement. |
| DAP-DEC-05 | A — Complete verification blueprint | Define dependency gates, acceptance criteria, positive/negative tests, failure/recovery scenarios and required evidence before implementation approval. |

**Disposition:** All five planning choices are approved. Supporting documents are linked from README.md. This checkpoint does not close the Cross-Application Intelligence workstream, authorize a physical database schema, authorize migration, authorize live Canvas access, or authorize application implementation.

## Planning-only implementation boundary reaffirmed

No application code, schema migration, dependency installation, live provider access, legacy deletion, production change, deployment, or runtime qualification is authorized. Legacy capabilities remain protected until mapping, replacement parity, regression evidence, backup/restore and rollback are established and separately approved.


## Integrated architecture planning decisions — 2026-11-25

The user submitted **C / B / A / A / A** through the integrated architecture planning checkpoint. Record the following as approved planning decisions:

| Decision ID | Approved selection | Planning consequence |
|---|---|---|
| EFP-DEC-01 | C — One integrated master architecture specification plus five detailed supporting specifications. | The master document governs the integrated design; supporting documents retain domain-specific detail. |
| EFP-DEC-02 | B — Select the most conventional and maintainable technical approach for unresolved decisions. | The integrated specification records recommended defaults and rationale; deviations require an ADR. |
| EFP-DEC-03 | A — Full legacy capability/data/dependency/workflow mapping. | Inventory all discovered source behavior and data before migration or retirement; unknowns remain explicitly open. |
| EFP-DEC-04 | A — Complete evidence-based planning sign-off. | Require specifications, traceability, risk review, open-decision disposition and acceptance criteria before workstream closure. |
| EFP-DEC-05 | A — Continue cross-system planning and integration readiness after this workstream; no coding yet. | Implementation remains outside current authorization and requires a separate explicit approval. |

**Disposition:** Five planning decisions approved. The integrated master architecture and five detailed supporting specifications are drafted. The Cross-Application Intelligence workstream remains open pending source-level legacy inventory, dated Canvas capability research, quantitative offline policy, security/risk review and final acceptance review.

## Authorization boundary reaffirmed

These decisions do not authorize application code, dependency installation, a physical database schema or migration, live Canvas access, legacy deletion, production changes, deployment or runtime qualification.


## Legacy source analysis and integration planning checkpoint — 2026-11-25

The user approved **A / A / A / A / A**:
- **EFP-DEC-06 — A:** Complete the legacy source-level inventory and data mapping first.
- **EFP-DEC-07 — A:** Research Canvas capabilities from current official documentation, recording endpoint evidence; keep target-tenant verification separate.
- **EFP-DEC-08 — A:** Derive offline cache, freshness, retention and recovery values from platform constraints, sensitivity and measured usage; do not guess numeric limits.
- **EFP-DEC-09 — A:** Define the secure backend-for-frontend (BFF) requirement first; defer hosting and database choices until evidence supports them.
- **EFP-DEC-10 — A:** Plan integration readiness across Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace.

An initial static source evidence review is recorded in [LEGACY-SOURCE-INVENTORY-INITIAL-REVIEW.md](LEGACY-SOURCE-INVENTORY-INITIAL-REVIEW.md). It inspects selected repository source and documentation files and records preservation candidates, data classes, and follow-up inventory work. It is explicitly not a complete source-tree audit.

**Disposition:** Planning decisions approved; initial source review captured; comprehensive source inventory, endpoint-by-endpoint official Canvas research, quantitative offline policy and cross-workspace integration-readiness plan remain in progress.


## Comprehensive source inventory checkpoint decisions — 2026-11-25

The user submitted **A / A / A / A / A** through the five-question source inventory checkpoint. Record the following approved planning decisions:

| Decision ID | Approved selection | Planning consequence |
|---|---|---|
| EFP-DEC-11 | A — Inventory every legacy source file, purpose, dependencies, imports, consumers, and preservation/retirement status. | Maintain a path-level inventory with evidence and explicit unknowns; do not infer unused status from missing references. |
| EFP-DEC-12 | A — Map every browser-persistence key, database, object store, schema version, writer, reader, and lifecycle. | Produce a complete storage/key/call-site matrix including migrations, fallbacks, cleanup, backup and recovery. |
| EFP-DEC-13 | A — Catalogue every Canvas Worker route, method, permission, validation rule, upstream endpoint, error and security boundary. | Build a route-level contract and reconcile each route with source, tests and official Canvas endpoint evidence. |
| EFP-DEC-14 | A — Define a complete integration contract for every workspace. | Each workspace contract covers canonical entities, commands, events, permissions, offline behavior, conflicts, freshness and acceptance criteria. |
| EFP-DEC-15 | A — Reconcile inventory findings against requirements, migration plans, risks and preservation gates before sign-off. | No planning sign-off or migration recommendation until traceability and preservation evidence are reconciled. |

The user authorized continued comprehensive source analysis and documentation, GitHub documentation updates and phase-tracker maintenance only. Application code, migrations, dependency changes, provider access, legacy deletion, deployment and runtime qualification remain unauthorized.

The expanded [Source-Tree and Persistence Inventory Checkpoint](SOURCE-TREE-AND-PERSISTENCE-INVENTORY.md) records the observed repository tree, script/style/test paths, two IndexedDB databases and three object stores, known local/session storage families, initial preservation findings and remaining evidence passes. It is explicitly a checkpoint, not a complete inventory or verification report.


## Comprehensive Legacy and Integration Evidence Module 1 — 2026-11-25

The user approved **A / A / A / A / A**. Record these as approved planning decisions:

| Decision ID | Approved selection | Planning consequence |
|---|---|---|
| EFP-DEC-16 | A — Complete legacy source inventory | Account for every tracked source, configuration, test, deployment and native artifact, including purpose, dependencies/imports, consumers, execution role, workflow relationships and preservation disposition. |
| EFP-DEC-17 | A — Full persistence trace | Enumerate every browser persistence mechanism, key, database/store/schema, reader, writer, migration, fallback, cleanup, retention, export, backup and recovery path. |
| EFP-DEC-18 | A — Route-level Canvas and external integration evidence | Catalogue every Worker route, method, validation, permission, upstream endpoint, error behavior, security boundary, source/test relationship and dated official Canvas documentation evidence. |
| EFP-DEC-19 | A — Complete workspace integration contracts | Define contracts for Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace, including entities, ownership, commands, events, permissions, offline behavior, conflicts, freshness, migration and acceptance. |
| EFP-DEC-20 | A — Evidence before sign-off | Reconcile source findings with requirements, architecture, migration, risk, preservation, parity, backup/restore and rollback gates before sign-off. |

The comprehensive grouped specification is [Module 1 — Legacy and Integration Evidence Plan](MODULE-1-LEGACY-AND-INTEGRATION-EVIDENCE-PLAN.md).

**Disposition:** Planning scope approved; evidence collection remains in progress. Existing source-tree and persistence findings are provisional until reconciled against the exact migration-source branch and commit. No implementation, migration, dependency installation, live provider/tenant access, Worker deployment, legacy deletion, production change, build/test execution or runtime qualification is authorized.
