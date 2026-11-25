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
