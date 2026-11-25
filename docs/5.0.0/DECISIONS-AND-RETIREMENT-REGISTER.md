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
