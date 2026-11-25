# NORTHSTAR 5.0 — Integrated Cross-Application Data Architecture Master Specification

**Parent stage:** NORTHSTAR 5.0.0 — Engineering Foundation Planning  
**Workstream:** Cross-Application Intelligence  
**Status:** Integrated planning specification — review pending  
**Decision sources:** CAI-DEC-01 through CAI-DEC-05; DAP-DEC-01 through DAP-DEC-05; EFP-DEC-01 through EFP-DEC-05  
**Authorization:** Planning only. No application code, physical schema, migration, dependency installation, live provider access, deployment, or runtime qualification is authorized.

## 1. Purpose and authority

This master specification integrates the five detailed data-architecture specifications into one coherent planning baseline. It defines the intended system boundaries, conventional technology recommendations, data ownership, synchronization, offline behavior, migration controls, verification gates, and unresolved evidence requirements.

The five supporting specifications remain the detailed source documents:
1. [Canonical Academic Data Model](CANONICAL-ACADEMIC-DATA-MODEL.md)
2. [Canvas Capability and Authority Matrix](CANVAS-CAPABILITY-AND-AUTHORITY-MATRIX.md)
3. [Offline Cache, Retention, Backup and Recovery Policy](OFFLINE-CACHE-RETENTION-AND-RECOVERY-POLICY.md)
4. [Legacy Capability and Data Migration Map](LEGACY-CAPABILITY-AND-DATA-MIGRATION-MAP.md)
5. [Data Architecture Verification Blueprint](DATA-ARCHITECTURE-VERIFICATION-BLUEPRINT.md)

Where a detailed document defines a narrower rule, that document supplements this master specification. Conflicts must be resolved in the decision register; no implementation should infer a decision from an outdated document.

## 2. Approved architecture principles

- One canonical identity and domain owner for each shared academic entity.
- Workspace-specific screens consume projections and do not create competing authoritative copies.
- Provider facts, personal overlays, and system-derived values remain distinguishable.
- Every sourced or derived field has explicit authority and provenance.
- Provider capabilities are evidence-based; unsupported or unverified behavior is not simulated as confirmed.
- Internal propagation is event-driven and idempotent; external synchronization adapts to documented provider capabilities.
- Conflicting versions are preserved; no silent last-write-wins behavior.
- Offline user work is durable and protected; queued provider actions are revalidated before replay.
- Consequential external actions require explicit confirmation and provider-confirmed receipts.
- Migration is capability-led, reversible, and evidence-gated.
- Planning approval is not implementation authorization.

## 3. System context and boundaries

### 3.1 Client application
The client is an iPad-first React + TypeScript + Vite PWA. It presents the Dashboard, Courses, Assignments, Calendar, Gradebook, Resources, Study Lab, Review Center, and AI Workspace. Workspaces read canonical domain data through typed domain interfaces and render rebuildable projections.

The browser client may store user-owned local work and approved offline snapshots. It must not contain privileged Canvas credentials, server secrets, or unrestricted provider access tokens.

### 3.2 Domain layer
Domain modules own entity validation, field authority, lifecycle transitions, derived calculations, and domain events. Initial logical domains are:
- Academic structure: terms, courses, enrollments.
- Coursework: assignments, submissions, attempts, draft state.
- Gradebook: grade items, rubrics, feedback, projections.
- Calendar: source events, personal events, reminders.
- Resources/materials: resources, files, attachments.
- Personal workflow: notes, priorities, checklists, planning.
- Study: study artifacts, sessions, review history.
- Governance: provenance, conflicts, audit events.
- Synchronization: external references, operations, cursors, retry/reconciliation.

A workspace is not a domain owner merely because it displays an entity.

### 3.3 Integration boundary
Canvas and future providers are accessed through provider adapters behind a server-side integration boundary. The server-side boundary owns secret handling, provider authentication, scope enforcement, rate limiting, request validation, audit-safe logging, and provider-specific normalization. Browser-to-provider direct privileged calls are prohibited.

The exact deployment topology and hosting provider remain subject to the broader Engineering Foundation plan. A backend-for-frontend (BFF) or equivalent narrowly scoped server API is the recommended conventional boundary for privileged provider operations.

### 3.4 Persistence boundary
Use a local-first persistence design for the single-user PWA:
- IndexedDB is the recommended browser persistence foundation for structured offline records and queued operations.
- A small, established IndexedDB wrapper may be selected during implementation planning to improve transaction handling and schema evolution; do not hand-roll a storage engine.
- Browser storage is not treated as an infallible backup. Export/restore and device-loss recovery are separate requirements.
- If cross-device synchronization, secure provider proxying, or durable server-side recovery requires a server database, use a conventional relational database with explicit migrations and backups. PostgreSQL is the recommended default if that backend is selected.
- Do not introduce a server database solely to mirror every local record before the multi-device and backend requirements are finalized.

## 4. Conventional engineering baseline recommendations

The user selected the conventional-approach path for unresolved technical decisions. The following are the recommended planning defaults because they are widely used, interoperable, and maintainable in a React/TypeScript PWA. These are architecture recommendations, not installed dependencies or implementation claims.

| Concern | Recommended default | Reason / constraint |
|---|---|---|
| Language and app build | TypeScript + React + Vite | Matches approved target architecture |
| Package manager | npm with committed lockfile | Conventional Node workflow; reproducible dependency resolution |
| Routing | React Router | Established React routing convention; route-level workspace boundaries |
| Remote/server state | TanStack Query where server-backed data exists | Standard query caching, invalidation, retry and request lifecycle |
| Local UI state | React state/context first; Zustand only for genuinely shared client interaction state | Avoid global-store sprawl and duplicate server state |
| Runtime validation | Zod at external and persistence boundaries | Runtime validation complements TypeScript's compile-time checks |
| Browser persistence | IndexedDB; use a maintained wrapper such as Dexie if transaction/schema ergonomics justify it | Native browser durable structured storage; avoid localStorage for academic records |
| API boundary | Typed REST-style server API / BFF with provider adapters | Keeps secrets and provider-specific behavior out of browser code |
| Server persistence, if required | PostgreSQL with versioned migrations | Conventional relational integrity and backup ecosystem |
| Unit/component tests | Vitest + Testing Library | Vite-aligned test workflow and user-facing component tests |
| Browser end-to-end tests | Playwright | Repeatable cross-browser workflow and failure-path testing |
| PWA service worker | Workbox-based integration through a Vite-compatible PWA plugin | Established caching/update lifecycle; cache only intentionally classified assets |
| Logging/observability | Structured, privacy-minimized logs with correlation IDs | Supports sync diagnosis without exposing coursework or credentials |

### 4.1 Rules for applying these defaults
- Prefer native React and browser APIs until a library solves a demonstrated requirement.
- Do not keep the same server-backed entity independently authoritative in TanStack Query, Zustand, and IndexedDB.
- IndexedDB is the durable client data layer; query cache is a transient server-request cache; UI state is ephemeral.
- Do not cache authenticated HTML/API responses indiscriminately in the service worker.
- Do not put secrets in Vite environment variables that are bundled into the browser.
- Pin toolchain versions and commit the lockfile only after implementation is separately authorized.
- Any departure from these recommendations requires a short ADR describing the problem, alternatives, trade-offs, migration impact, and verification plan.

## 5. Canonical data and field authority

The canonical entity catalogue and field contract are defined in the supporting data model. Every entity must have:
- stable NORTHSTAR identity;
- namespaced provider references;
- owning domain;
- explicit relationships and lifecycle;
- field-level authority and editability;
- source/provenance metadata;
- schema and local revision context;
- sensitivity and retention classification;
- validation and verification criteria.

Official Canvas/institution fields and NORTHSTAR personal overlays must be separate concepts. For example, an official assignment due date and a user's personal target date are not the same field. A local planning status must never imply that Canvas has accepted a submission.

## 6. Synchronization and consistency model

### 6.1 Internal changes
A domain validates and commits a transition, then emits a typed, versioned event. Consumers process events idempotently and update projections. Where storage supports it, a transactional outbox prevents a committed domain change from losing its corresponding event.

### 6.2 External refresh
Provider adapters use documented incremental cursors, pagination, webhooks, or polling only when their availability and semantics are evidenced. Manual refresh remains available. Freshness and failure states are visible. A partial page or interrupted sync cannot be marked complete.

### 6.3 Provider writes
Provider writes are commands, not ordinary record mutations. They require permission checks, explicit user approval where consequential, stable operation identity, retry classification, receipt capture, and reconciliation after ambiguous outcomes. Submission, quiz, discussion, and file-upload workflows need operation-specific contracts.

### 6.4 Conflicts
Preserve base, local, and provider versions with provenance. Resolve automatically only when field semantics prove a deterministic safe merge. Otherwise pause and request user review. A timestamp alone is not a conflict-resolution policy.

## 7. Offline, retention, and recovery

Apply the six data classes in the Offline Cache, Retention, Backup and Recovery Policy. Protect unsynced user-authored work and pending operation metadata from automatic eviction. Cached provider facts always expose freshness. Derived projections are lowest priority for storage retention.

Backup/export is distinct from provider sync. Restore uses staging, validation, identity reconciliation, duplicate detection, and explicit approval. Provider credentials are never restored from ordinary user exports. Provider disconnect pauses provider writes but does not erase local user-owned work.

Exact cache budgets, freshness thresholds, retention periods, encryption classification, and backup destination remain open pending platform constraints, privacy review, and measured use. Do not invent numeric values.

## 8. Legacy migration and preservation

Migration is capability-led, not file-led. The required inventory includes:
- routes, screens, forms, and user-visible workflows;
- browser storage keys, serialized records, files, and attachments;
- read/write call sites and event listeners;
- Canvas/API calls, auth scopes, workers, return-context and external handoffs;
- document/PDF/annotation/export and recovery behavior;
- grade/course/assignment records and derived calculations;
- notifications, diagnostics, release controls, and test fixtures;
- dependencies, shared utilities, implicit coupling, and build/deployment assumptions.

For each item, record source location, behavior, data classification, owner, canonical destination, transformation, preservation requirement, parity test, rollback and retirement condition. Unknowns must be explicitly marked **not yet inventoried**, never silently treated as absent.

Known preservation priorities include Canvas Worker/security boundaries, assignment routing and submission, external handoff/return-context validation, document persistence and PDF/annotation/export, grade/course data, file references, autosave/drafts, user-created study materials, and regression tests.

No legacy item is deleted or disabled under this planning authorization.

## 9. Verification and acceptance gates

The verification blueprint defines static architecture, unit, contract, integration, end-to-end, failure/recovery, security/privacy, accessibility/iPad, and operational evidence.

The Cross-Application Intelligence design gate requires:
1. Field-level entity and relationship catalogue reviewed.
2. Field authority/provenance matrix reviewed.
3. Canvas capability evidence classified and dated.
4. Offline/cache/retention/backup/recovery policy reviewed.
5. Legacy inventory and source-to-target map reconciled.
6. Threat and privacy risks reviewed.
7. Requirements traceability complete.
8. Open decisions have owners, rationale, and disposition.
9. Acceptance scenarios and evidence templates are complete.
10. User completes the phase sign-off checkpoint.

Passing this planning gate does not mean implementation, tests, live Canvas verification, physical iPad acceptance, or release gates have passed.

## 10. Risks and mitigations

| Risk | Mitigation / gate |
|---|---|
| Canvas API or tenant behavior differs from assumptions | Dated official docs, capability evidence classes, separately authorized tenant verification |
| Browser storage eviction or device loss | Protected write policy, export/restore, recovery rehearsal |
| Conflicting official and personal fields | Separate fields, field-level authority, conflict preservation |
| Duplicate submissions after timeout/retry | Operation IDs, provider receipt reconciliation, no blind retry |
| Legacy data loss or hidden workflow regression | Full source/call-site inventory, parity fixtures, backup and rollback |
| Over-engineered client state | Separate canonical persistence, remote query cache, and ephemeral UI state |
| Service-worker cache exposes private/stale content | Explicit cache allowlist, auth-aware rules, purge and update tests |
| Unbounded file/cache growth | Data-class quotas, user controls, protected unsynced records |
| Secret exposure in client bundle/logs | Server-side adapter boundary, secret scanning, redacted structured logs |
| Documentation mistaken for proof | Evidence classes and explicit not-verified statuses |

## 11. Open evidence and decisions

The following remain outstanding and block final workstream sign-off:
- source-level inventory of every legacy route, storage key, file workflow, call site, dependency and integration;
- dated endpoint-by-endpoint Canvas capability research against current official documentation;
- target-tenant verification, only after separate explicit authorization;
- final entity enum, timezone, grade-calculation and file-classification decisions;
- measured iPad/PWA cache budgets, freshness thresholds, retention periods and backup destination;
- hosting/BFF topology and whether server-side relational persistence is necessary;
- finalized threat model, privacy review and data export/deletion rules;
- requirement-by-requirement evidence and acceptance review.

Each open item must be tied to requirement IDs and resolved before the relevant gate. This document intentionally does not claim these items are complete.

## 12. Change control and authorization

This specification is a planning baseline. It does not authorize application code, package installation, physical database schema or migrations, data migration, live Canvas or AI access, legacy deletion, production changes, deployment, or runtime qualification. Those require separate explicit authorization.

**Disposition:** Integrated architecture planning baseline drafted; detailed supporting specifications linked; final design review and evidence closure pending.
