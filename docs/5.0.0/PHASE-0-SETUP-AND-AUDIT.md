# Phase 0 — Setup & Repository Audit

**Version:** NORTHSTAR 5.0.0  
**Status:** Prepared; awaiting user phase-sign-off quiz and acceptance  
**Audit type:** Static repository inspection and documentation setup  
**Source:** `df0427304e0f03aa822a1c8fe99547355e9c0bfc`

## Objectives

1. Establish a reproducible source baseline without overwriting production.
2. Record repository structure, runtime architecture, and current version discrepancies.
3. Inventory existing user-facing capabilities and integration boundaries.
4. Classify each major capability as preserve, refactor, replace, consolidate, isolate, or retire.
5. Define the target architecture and implementation order.
6. Establish quality, security, migration, and release gates.
7. Keep the legacy application intact until replacements are implemented and verified.

## Repository observations

The audited application is a plain HTML/CSS/JavaScript application, not the approved React + TypeScript + Vite target architecture. The inspected source contains a large HTML entry point, 17 loaded JavaScript files, four CSS files, automated test files, a Canvas Cloudflare Worker, GitHub Actions workflows, an iOS content-presenter component, and extensive historical documentation.

Notable source-size observations from the audited snapshot:
- `premium.js`: approximately 267 KB
- `assignment-room.js`: approximately 71 KB
- `app.js`: approximately 56 KB
- `workspace.js`: approximately 24 KB
- `release.js`: approximately 24 KB

These are maintainability signals, not proof of runtime performance problems.

## Preserve pending replacement and verification

- Canvas connection and isolated Worker boundary.
- Assignment routing, assignment execution, status and submission flows.
- Document Studio, PDF handling, annotation, export, and document persistence.
- Course and grade data handling.
- Submission receipts, token protection, credential storage, and recovery behavior.
- External learning-tool handoff and return-context handling.
- Existing automated tests and regression cases.

Preservation means preserving proven behavior and security properties, not necessarily retaining current source files or implementation structure.

## Refactor or replace

- Replace the monolithic page/runtime structure with React + TypeScript + Vite.
- Break large JavaScript responsibilities into domain-owned modules and components.
- Consolidate overlapping CSS into one documented token/component design system.
- Establish a shared domain data model and predictable state ownership.
- Separate UI, domain logic, persistence, AI services, Canvas adapters, and native-host integration.
- Replace ad hoc navigation and repeated controls with consistent workspace navigation and shared interaction patterns.

## Isolate or retire after dependency verification

- Direct Gemini API/key workflow: remove from the core student-facing experience for the initial demo/setup scope; retain a provider-neutral AI service boundary. Do not remove until callers, secrets, and dependencies are mapped.
- StudentVUE CSV/JSON import: isolate as optional import tooling; keep out of the primary workflow unless the user approves its ongoing role.
- Duplicate Copilot/autopilot entry points: consolidate under AI Workspace.
- Repeated alert surfaces: consolidate under the notification center.
- Runtime release-history UI: move detailed engineering/release history to repository documentation.
- Developer diagnostics: keep available to maintainers, not as ordinary student navigation.
- Legacy logs and duplicate documents: archive only after unique decisions and evidence are migrated into current records.

No legacy source files are deleted in this setup commit. Retirement must follow dependency analysis, replacement, regression tests, and an explicit source-change review.

## Target product architecture

- React + TypeScript + Vite; iPad-first PWA.
- One-user personal academic operating system.
- Workspace domains: Dashboard, Assignments, Courses, Calendar, Gradebook, Study Lab, Resources, Review Center, AI Workspace.
- Shared academic data layer with explicit entity relationships, field ownership, provenance, source authority, and history.
- Centralized state and durable persistence with offline cache, drafts, autosave, recovery, and versioned migrations.
- Integration adapters for Canvas, AI providers, external tools, and native iOS capabilities.
- One authoritative design system with controlled contextual variation.
- Approval required for consequential AI or data changes.

## Scope boundary

Phase 0 creates repository governance, audit records, migration plans, and acceptance definitions. It does not implement the application workspaces, migrate production data, claim live Canvas connectivity, or deploy a new application. Application implementation begins only after Phase 0 acceptance and explicit implementation authorization for the next phase.

## Verification limits

This audit was static. No dependency installation, build, automated test run, live browser session, iPad Safari test, Apple Pencil test, Canvas live-account test, production deployment, or backup/restore exercise is claimed by this document. Those checks are explicit later acceptance gates.
