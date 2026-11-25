# NORTHSTAR 5.0 — Engineering Foundation Planning Brief

**Stage:** Engineering Foundation  
**Mode:** Planning only  
**Authorization:** Approved to plan; application implementation is not authorized  
**Opened:** 2026-11-25  
**Predecessor:** Phase 0 — Setup & Repository Readiness (closed)

## 1. Purpose

Translate the approved NORTHSTAR 5.0 product and architecture baseline into an implementation-ready engineering plan before application code is changed. The goal is to remove ambiguity around repository layout, build tooling, domain boundaries, quality gates, security, migration, and acceptance evidence.

This document is a planning artifact. It does not create the application shell, install dependencies, modify runtime files, remove legacy code, or deploy anything.

## 2. Approved technical direction

- React + TypeScript + Vite.
- iPad-first Progressive Web App; iPad Pro is the primary target.
- Single-user personal academic operating system; no public multi-tenant SaaS scope.
- One authoritative design system with controlled workspace-specific variation.
- Shared academic data model and predictable state ownership.
- Domain-separated workspaces and provider/integration adapters.
- Provider-neutral AI boundary; no mandatory real AI provider connection in the demo.
- Canvas integration remains behind a dedicated adapter and server-side security boundary.
- Preserve existing academic capabilities and data until dependencies, replacements, and regression evidence are established.

## 3. Planning workstreams

### EF-01 — Repository and branch strategy
- Define the clean 5.0 application root and separation from legacy application source.
- Decide whether the new application is introduced in a dedicated directory or a clean branch/repository.
- Define protected branches, review requirements, commit conventions, tags, and rollback strategy.
- Prevent setup documentation and application release metadata from being conflated.

### EF-02 — Toolchain and reproducibility
- Specify supported Node.js and package-manager versions.
- Select and pin package manager and lockfile policy.
- Define Vite, TypeScript strictness, linting, formatting, unit/component testing, and end-to-end testing.
- Define reproducible install/build commands and CI checks.
- Establish dependency review and update policy.

### EF-03 — Application architecture
- Define workspace routing and application-shell boundaries.
- Define domain modules, shared UI components, service interfaces, and adapter boundaries.
- Define data ownership, state transitions, async/error handling, and event conventions.
- Avoid a new monolith and avoid premature abstraction.

### EF-04 — Design-system engineering
- Translate the approved visual direction into tokens and documented components.
- Define typography, spacing, surfaces, elevation, focus, touch targets, responsive rules, and theme tokens.
- Define motion primitives, reduced-motion behavior, and performance fallbacks.
- Preserve the NORTHSTAR identity; avoid generic dashboard/AI styling.

### EF-05 — Security and environment handling
- Define environment-variable schema and validation.
- Keep secrets and privileged credentials out of browser bundles and source control.
- Define server-side integration boundaries, content-security considerations, and safe logging.
- Define data minimization and single-user privacy assumptions.

### EF-06 — Quality and acceptance
- Define unit, component, integration, end-to-end, regression, accessibility, security, and performance gates.
- Define iPad Safari test matrix: portrait, landscape, touch, keyboard, Split View/Stage Manager where supported, and Apple Pencil where relevant.
- Define offline, autosave, persistence, recovery, and migration evidence requirements.
- Define what qualifies as a passing preview and what is required before production.

### EF-07 — Migration and preservation
- Map each existing capability to preserve, replace, isolate, or retire.
- Map data formats, persistence locations, integration contracts, and hidden dependencies.
- Define migration sequencing, compatibility strategy, backup, restore, and rollback.
- No legacy deletion until replacement and regression gates are met and separately approved.

## 4. Proposed engineering deliverables

1. Repository and branch strategy decision record.
2. Toolchain/version matrix and reproducible command specification.
3. Target source-tree proposal with module ownership.
4. Architecture decision records for routing, state, persistence, and adapters.
5. Design-token/component implementation specification.
6. Environment, secrets, and security boundary specification.
7. CI quality-gate matrix and test strategy.
8. iPad acceptance matrix and release-evidence template.
9. Legacy capability/data migration map.
10. Engineering Foundation sign-off checklist and risk register.

## 5. Non-negotiable constraints

- Do not alter production or the current production branch.
- Do not replace or delete legacy application files during planning.
- Do not claim that Canvas, AI, or other integrations are live when they are simulated or unverified.
- Do not place private API keys or privileged credentials in client-side code.
- Do not silently discard existing academic data or user workflows.
- Do not begin application implementation until the user explicitly authorizes it.
- Keep every material architecture and scope decision traceable to an approved requirement or decision record.

## 6. Planning decisions still required

The following are open and should be resolved before an implementation-ready engineering plan is signed off:

- **Repository strategy:** dedicated 5.0 branch in the current repository versus separate clean repository.
- **Application location:** repository root versus a clearly isolated application directory.
- **Runtime baseline:** supported Node.js LTS line and package-manager choice.
- **Testing stack:** unit/component and browser end-to-end tooling.
- **Routing and state conventions:** selected libraries or native React conventions, with rationale.
- **Persistence baseline:** browser storage strategy and the point at which a server-side service is required.
- **CI and preview policy:** required checks, preview source, protected environments, and rollback procedure.
- **Design-system implementation:** token format, component documentation approach, and motion library policy.

No option is considered selected merely because it appears in this list.

## 7. Exit criteria for Engineering Foundation planning

- All open decisions have recorded options, rationale, dependencies, and an explicit selection.
- Source-tree and module ownership are documented.
- Quality gates are measurable and mapped to requirements.
- Security and integration boundaries are explicit.
- iPad acceptance and accessibility criteria are testable.
- Migration/preservation map covers all known existing capabilities and data.
- Risks, rollback, and evidence requirements are documented.
- User completes the recurring five-question sign-off module and explicitly approves the phase.

## 8. Current status

**Planning opened.** No application implementation has started. The next work should complete the planning decisions and specifications above, then present the phase sign-off module. A separate explicit implementation authorization is required after planning approval.


## 9. Cross-Application Intelligence — detailed planning additions

The user approved the comprehensive Data Architecture Planning checkpoint on 2026-11-25 (A/A/A/A/A). The following planning artifacts now supplement this brief:

- Canonical Academic Data Model and Relationship Catalogue.
- Canvas Capability and Authority Matrix.
- Offline Cache, Retention, Backup and Recovery Policy.
- Legacy Capability and Data Migration Map.
- Data Architecture Verification Blueprint.

Traceability additions: NS-DATA-004, NS-CAN-003, NS-DATA-005, NS-MIG-001 and NS-QUAL-003.

### Engineering dependencies and unresolved risks
- Do not choose a physical storage technology until entity lifecycle, offline durability, file handling, backup/restore and security requirements are reviewed together.
- Do not design provider sync against assumed Canvas endpoints; require current official documentation and explicit capability evidence.
- Do not set cache quotas or retention durations without iPad/PWA constraints, data sensitivity, expected file sizes and recovery objectives.
- Do not plan destructive legacy retirement until storage/call-site inventory, data mapping, parity fixtures and rollback evidence exist.
- Do not mark any verification gate passed from planning documents alone.

The Engineering Foundation planning stage remains open. The artifacts above do not authorize implementation, dependency installation, schema migration, live Canvas testing, legacy deletion, deployment or release.


## 10. Integrated architecture planning decisions — 2026-11-25

The user approved C/B/A/A/A for the next engineering-foundation planning checkpoint. The selected documentation structure is one integrated master architecture specification supported by five detailed specifications. The selected decision method is to recommend conventional, maintainable technical defaults and require an ADR for material deviations. Legacy capability/data/dependency/workflow mapping must be comprehensive. Workstream sign-off requires full specifications, traceability, risk and open-decision review, and acceptance criteria. Planning continues after this workstream; application coding remains unauthorized.

The integrated specification is [INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md). It recommends React/TypeScript/Vite, npm with lockfile, React Router, TanStack Query for server-backed data, React state/context first with Zustand only where justified, Zod at trust boundaries, IndexedDB for local durable records, a narrowly scoped server-side provider boundary, PostgreSQL only if server persistence is required, Vitest/Testing Library, Playwright, and explicit PWA caching rules.

These choices are planning recommendations and have not been installed, built, or tested. The five detailed specifications remain subject to evidence closure. Full legacy source inventory, dated Canvas endpoint research, quantitative cache/retention parameters, hosting topology, and security/privacy review remain open.


## 11. Source analysis and integration planning checkpoint — 2026-11-25

The user approved A/A/A/A/A:
- complete the legacy source inventory and data mapping before other architecture closure;
- research Canvas against current official documentation with endpoint evidence, keeping tenant verification separate;
- derive offline limits from measured platform constraints and sensitivity;
- define a secure BFF requirement before selecting hosting or database technology;
- plan integration readiness across Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace.

The initial selected-file evidence review is documented in LEGACY-SOURCE-INVENTORY-INITIAL-REVIEW.md. It identifies credential-vault and encrypted snapshot behavior, assignment deep-link routing, submission transport guardrails, Canvas Worker boundary, provider-owned quiz/assessment state, document/PDF artifact lineage, native iOS secure-content handoff, and existing boot-test assets.

This review is partial. Complete source tree, all browser storage keys and IndexedDB stores, all read/write call sites, Worker route inventory, dependency/CDN inventory, exact source branch reconciliation and full data migration mapping remain outstanding. The BFF is a required security boundary for privileged provider operations; hosting/runtime and database remain deferred until evidence supports a choice. Integration contracts across all major workspaces remain to be authored.

No source implementation was changed and no tests/builds were executed. Planning only.


## 12. Comprehensive source inventory checkpoint — 2026-11-25

The user approved A/A/A/A/A (EFP-DEC-11 through EFP-DEC-15). The required inventory scope is now explicit:
- every source path, purpose, dependency/import, consumer, route/workflow relationship, and preservation/retirement disposition;
- every localStorage/sessionStorage key and IndexedDB database/store/schema, with readers, writers, migrations, fallback, retention, cleanup and recovery;
- every Canvas Worker route, method, permission, validation constraint, upstream endpoint, error path and security boundary;
- complete workspace contracts for Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace;
- reconciliation of evidence to requirements, migration, risks, preservation, parity and rollback gates before planning sign-off.

The [Source-Tree and Persistence Inventory Checkpoint](SOURCE-TREE-AND-PERSISTENCE-INVENTORY.md) captures the currently observed repository paths and initial persistence findings. It identifies `northstar-secure-vault` (v1 / `secrets`) and `northstar-document-studio` (v1 / `documents`, `drafts`), along with known localStorage PDF identity/markup key families and sessionStorage quiz-attempt state. These observations are not yet a complete key/call-site inventory.

The source inventory remains in progress. Exact migration-source reconciliation, full script dependency and DOM/event consumer mapping, complete Worker route extraction, workflow/deployment enumeration, external CDN inventory, and all storage call sites remain open. No source code was modified and no tests/builds were executed.
