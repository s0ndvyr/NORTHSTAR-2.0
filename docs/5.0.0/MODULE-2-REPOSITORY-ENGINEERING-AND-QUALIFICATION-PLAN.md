# NORTHSTAR 5.0 — Module 2: Repository, Engineering Standards and Qualification Plan

**Decision date:** 2026-11-25  
**Decision set:** EFP-DEC-21 through EFP-DEC-25  
**User selections:** A / A / A / A / A  
**Status:** Planning scope approved; detailed engineering policy and evidence alignment in progress  
**Authorization:** Planning and documentation only. No application implementation is authorized.

## 1. Purpose

This module defines the engineering operating model for NORTHSTAR 5.0 before implementation begins. It establishes repository isolation, application organization, technical defaults, quality and qualification expectations, CI/preview/release governance, and the evidence needed to move safely from planning into a separately authorized implementation stage.

It is deliberately comprehensive. The five approved choices are governing decisions, not five isolated answers. This specification expands them into connected policies and identifies where decisions are already settled, where evidence is required, and where a future implementation plan must remain conditional.

## 2. Approved decisions

| ID | Approved decision | Consequence |
|---|---|---|
| EFP-DEC-21 | A — Dedicated 5.0 development branch | Preserve repository continuity and legacy history while isolating 5.0 work from production and existing stabilization work. |
| EFP-DEC-22 | A — Isolated application directory | Keep the 5.0 application in a clearly defined directory, with planning documentation and legacy material separated. |
| EFP-DEC-23 | A — Conventional pinned toolchain | Use React, TypeScript, Vite, npm, a committed lockfile, strict type checking, documented Node.js LTS, and controlled dependency updates. |
| EFP-DEC-24 | A — Full qualification framework | Plan unit, component, integration, end-to-end, regression, accessibility, security, performance, offline/recovery, and physical iPad acceptance. |
| EFP-DEC-25 | A — Controlled release pipeline | Plan protected branches, automated quality gates, isolated previews, explicit production approval, release evidence, rollback, and version tracking. |

These decisions are planning approvals. They do not install dependencies, change repository structure, configure branch protection, create CI workflows, or authorize application code.

## 3. Repository and branch governance

### 3.1 Repository continuity

The existing NORTHSTAR repository remains the historical source of truth for the planning branch. The dedicated 5.0 branch is the controlled planning and future development boundary. Production and the existing stabilization branch must remain untouched by 5.0 planning updates.

The implementation plan must identify:
- the authoritative 5.0 branch and its base commit;
- protected production/stabilization refs and permitted merge paths;
- the owner and approval requirements for merges;
- the relationship between planning documentation, future application source, legacy source and archived artifacts;
- how tags, releases and rollback references will be maintained;
- how a mistaken or unauthorized change is detected and reversed.

### 3.2 Branch model to plan

Use a small, understandable branch model rather than unnecessary branch proliferation:
- protected production/release branch;
- dedicated 5.0 integration/development branch;
- short-lived feature/fix branches created only when implementation is authorized;
- release candidates or immutable tags for qualification checkpoints.

Exact branch names, protection settings, required reviewers, status checks and merge strategy must be verified against repository capabilities and user workflow before configuration. Do not assume a setting is active merely because it is specified here.

### 3.3 Change hygiene

Every change should have a clear scope, reviewable diff, descriptive commit message and traceable requirement/decision reference where material. Documentation-only changes must remain distinguishable from source changes. Secrets, credentials, private student data, real Canvas identifiers and production configuration must never be committed.

## 4. Application organization

### 4.1 Isolated application directory

The future 5.0 application should live in a clearly named application directory rather than being mixed indiscriminately with legacy scripts and historical documents. Planning documents remain under the established documentation structure. Legacy code remains preserved until Module 1 inventory, parity, migration, backup and rollback gates are satisfied.

The final directory name and detailed tree are not fixed by this decision alone. They must be chosen after reconciling:
- current repository root and hosting/build constraints;
- Vite base-path and asset-path behavior;
- Cloudflare Pages or other preview/deployment expectations;
- PWA manifest, service worker and install/update scope;
- native iOS wrapper/static asset assumptions;
- test and tooling paths;
- documentation and archived legacy locations.

### 4.2 Proposed logical boundaries

The architecture should preserve clear boundaries between:
- application bootstrap and routing;
- shared design system and reusable UI;
- domain-owned academic models and application services;
- workspace experiences;
- provider adapters and integration contracts;
- local persistence, offline queue and synchronization;
- server-side BFF/security-sensitive provider operations;
- test fixtures, automated tests and qualification evidence.

These are logical boundaries, not authorization to create packages or directories now. Avoid premature micro-packages and avoid circular dependencies. A package boundary should exist only when it enforces a real ownership, security, testing or deployment boundary.

### 4.3 Dependency direction

Workspace UI should consume domain/application contracts rather than directly owning provider transport or canonical academic data. Provider adapters should implement explicit contracts. Privileged credentials and provider secrets must remain on the server-side boundary. Shared components must not import workspace-specific business rules. The canonical data model remains governed by the approved cross-application architecture.

## 5. Toolchain and engineering standards

### 5.1 Approved baseline

- React for the UI layer.
- TypeScript for application code, with strict type checking.
- Vite for development and production bundling.
- npm with a committed lockfile for reproducible dependency resolution.
- A documented, supported Node.js LTS version, pinned consistently in project guidance and CI.
- Controlled dependency updates, with security and compatibility review.

### 5.2 Supporting tool choices

The previously approved architecture recommendations remain the planning defaults unless evidence justifies an ADR:
- React Router for route organization;
- TanStack Query for server-backed query/cache lifecycles where applicable;
- React state/context first, with Zustand only if a demonstrated shared-state need warrants it;
- Zod or an equivalent runtime schema validator at untrusted data boundaries;
- Vitest and Testing Library for unit/component coverage;
- Playwright for browser end-to-end coverage;
- Vite PWA/Workbox capabilities where justified by the offline and update requirements.

These are recommendations, not installed or finalized dependencies. Confirm versions, compatibility, maintenance status, licensing, bundle impact, accessibility and iPad Safari support before adoption. Avoid redundant libraries that solve the same problem.

### 5.3 Code and type standards

Plan for:
- strict TypeScript, no silent widening of untrusted provider data;
- explicit runtime validation for external payloads and persisted data;
- consistent formatting, linting and import conventions;
- clear error types and user-visible recovery states;
- accessible component semantics and keyboard/assistive technology support;
- documented naming, file organization and module ownership;
- no secrets or sensitive user data in logs, telemetry, fixtures or commits;
- no suppression of compiler/linter errors without documented rationale.

The eventual standards should distinguish enforceable automated rules from human review guidance.

### 5.4 Dependency governance

Each dependency should have a documented purpose, owner/boundary, version policy and replacement risk. Lockfile changes must be reviewable. Security advisories, abandoned dependencies, transitive dependency exposure, licensing and supply-chain provenance should be considered. Avoid unpinned remote scripts/CDN imports for critical runtime dependencies unless integrity, versioning, availability and fallback behavior are explicitly addressed.

## 6. Quality engineering and qualification framework

The approved framework is comprehensive and risk-based in execution. Every test layer must have a purpose and trace to requirements; coverage percentages alone are not acceptance.

### 6.1 Test layers

1. **Static checks:** TypeScript, lint, formatting, dependency and secret checks.
2. **Unit tests:** domain rules, parsing, validation, calculations, state transitions and pure utilities.
3. **Component tests:** accessible rendering, input behavior, loading/empty/error states, keyboard interactions and responsive behavior.
4. **Integration tests:** workspace-to-domain contracts, persistence, synchronization, adapters and event propagation.
5. **End-to-end tests:** real user workflows across navigation, assignments, courses, calendar, gradebook, resources, Study Lab and AI Workspace.
6. **Regression tests:** preservation of legacy capabilities and previously fixed defects.
7. **Accessibility qualification:** semantic structure, keyboard navigation, focus, contrast, dynamic announcements, reduced motion and screen-reader behavior.
8. **Security qualification:** authorization boundaries, input validation, secret handling, XSS/CSRF considerations, dependency risk, data isolation and safe error handling.
9. **Performance qualification:** startup, route transitions, large lists, document rendering, memory, battery-sensitive behavior and bundle size.
10. **Offline/recovery qualification:** cached reads, eligible queued operations, reconnect reconciliation, conflicts, interrupted operations, quota errors and data recovery.
11. **Physical iPad acceptance:** supported iPadOS/Safari versions, touch targets, orientation, split view/resizing, keyboard, file picker, PDF workflows, PWA installation/update and reduced-motion behavior.

### 6.2 Test evidence discipline

A test file existing is not evidence that it passed. Every qualification record must state:
- exact commit and environment;
- tool and version;
- command or manual procedure;
- result, failures and skipped coverage;
- device/browser/OS where relevant;
- requirement and workflow covered;
- evidence artifact or reproducible record;
- unresolved limitations.

Do not claim Canvas tenant, physical iPad, accessibility or production qualification from mocks or static inspection.

### 6.3 Academic workflow acceptance

Qualification must exercise complete user journeys, not just isolated screens. Examples include:
- assignment discovery through draft, review, submission confirmation and grade propagation;
- course selection through resource access and linked study material;
- calendar deadline changes and synchronization with assignment state;
- grade freshness and distinction between official results and personal estimates;
- document open, annotate, save, export and recovery;
- offline use, reconnect, conflict review and safe retry after ambiguous outcomes;
- AI context selection, provenance, user approval and artifact ownership.

### 6.4 Quality gates

A release candidate should not pass with unresolved critical security defects, data-loss risks, broken core academic workflows, unhandled migration corruption, or inaccessible critical interactions. Define severity, waiver authority, expiry, compensating controls and evidence for any exception before implementation begins.

## 7. CI, preview and release governance

### 7.1 CI expectations

Plan automated checks for pull requests and protected-branch updates:
- reproducible install from the lockfile;
- typecheck, lint and formatting validation;
- unit/component/integration suites appropriate to the change;
- production build;
- dependency/security and secret scanning;
- end-to-end smoke and regression suites;
- artifact and commit traceability.

The exact matrix, concurrency, caching and required status checks should be evidence-driven. CI must not access production secrets or real student data for ordinary pull-request validation.

### 7.2 Preview environments

Previews must be isolated from production:
- separate preview origin and environment configuration;
- synthetic or explicitly sanitized data;
- no accidental production credentials;
- clear build/commit/version identification;
- PWA/service-worker cache isolation to avoid stale builds crossing environments;
- documented cleanup and expiration;
- review of authentication and provider restrictions before any integration testing.

A preview deployment is not production qualification and does not prove live Canvas integration.

### 7.3 Production promotion

Production promotion requires:
- approved release candidate and immutable commit/tag;
- successful required quality gates;
- reviewed release notes and known limitations;
- migration/data compatibility and backup/restore readiness where applicable;
- explicit production approval;
- rollback plan and decision authority;
- post-deployment smoke/health evidence and incident response path.

No automatic production deployment should be inferred from the presence of CI or preview automation.

### 7.4 Version and release records

Maintain distinct, consistent application version, package version, release identifier and commit identity. Document how they map to the installed PWA and preview build. Every release record should include scope, requirements, tests, known issues, deployment target, approval, rollback reference and post-release observations.

## 8. Security, privacy and operational engineering

The engineering baseline must preserve the previously approved secure BFF boundary for privileged provider operations. Client code must not contain provider secrets. Define:
- secret storage, rotation, access and audit policy;
- least-privilege provider scopes;
- session/token lifecycle and revocation;
- secure transport and origin policy;
- data minimization and retention;
- redaction and safe operational logging;
- dependency and build artifact integrity;
- incident handling and recovery;
- separation of synthetic, test, preview and real academic data.

Operational observability should avoid collecting sensitive academic content. Error reporting must provide enough diagnostic context without leaking credentials, private assignment text, student identifiers or document contents.

## 9. PWA and iPad qualification considerations

The target is an iPad-first PWA, not a desktop website merely scaled down. Engineering qualification must consider:
- Safari/iPadOS support matrix and feature detection;
- viewport, safe areas, orientation and multitasking;
- touch and pointer interactions;
- on-screen and hardware keyboard behavior;
- file import/export and document handling;
- IndexedDB quotas, eviction and storage persistence limitations;
- service-worker lifecycle, update prompts and stale asset recovery;
- offline behavior and reconnect;
- memory pressure, large PDFs and long-running sessions;
- accessibility and reduced motion.

Physical device tests remain a future qualification requirement. No iPad verification is claimed by this planning document.

## 10. Architecture decision records and change control

Use an ADR when a decision changes an approved architecture default or creates a meaningful long-term trade-off. Each ADR should record context, options, decision, consequences, security/data implications, migration impact, alternatives rejected, status and supersession links.

Do not reopen an approved decision merely to repeat a preference question. Revisit it only when new evidence, a changed constraint, a security issue or a material product requirement justifies reconsideration. Record the evidence and downstream impact.

## 11. Planning process governance — user requirement

The user explicitly requires planning to avoid repetitive five-question cycles. Future NORTHSTAR planning modules must:
- group multiple related topics and meaningful decisions into substantial modules;
- vary topic coverage according to the actual planning domain rather than reuse the same five categories;
- provide useful recommendations, alternatives and trade-offs;
- include free-text input for additional requirements;
- carry approved decisions forward and avoid asking the user to repeat them;
- use research and source analysis to resolve factual questions instead of unnecessarily asking the user;
- present a consolidated review only when a coherent body of planning work is ready;
- keep unresolved decisions visible without fragmenting the process into many tiny modules;
- distinguish decision approval, planning sign-off and implementation authorization.

The five decisions in this module do not constrain the number or variety of topics in future modules. This process rule applies across all remaining NORTHSTAR planning.

## 12. Deliverables and evidence still required

The following planning artifacts should be maintained as grouped deliverables:
1. Repository/branch governance and proposed directory layout.
2. Toolchain and dependency decision register with compatibility evidence.
3. Code, type, lint, formatting and secure-development standards.
4. Test strategy and requirement-to-test traceability model.
5. Accessibility, security, performance, offline and iPad qualification plans.
6. CI and preview environment design, including secrets and PWA cache isolation.
7. Production release, versioning, approval and rollback procedure.
8. ADR/change-control policy and engineering planning process standard.

Before implementation authorization, reconcile these policies with Module 1's exact-source inventory and the integrated architecture. Validate the proposed structure against actual hosting, repository, PWA and native iOS constraints.

## 13. Acceptance criteria

Module 2 planning can be proposed for sign-off when:
- repository and branch isolation rules are consistent with the actual repository and production protection needs;
- proposed application directory and boundaries are compatible with hosting, PWA and native iOS constraints;
- toolchain versions and supporting library choices have current compatibility evidence;
- code/type/dependency/security standards are specific enough to enforce;
- all quality layers have purpose, scope, acceptance criteria and evidence requirements;
- core academic workflows have end-to-end qualification scenarios;
- iPad, accessibility, offline, privacy and security qualification are represented;
- CI, preview and production promotion are separated and governed;
- versioning, release evidence, rollback and incident procedures are defined;
- unresolved risks and assumptions are explicit;
- planning-process governance prevents repetitive, fragmented decision cycles.

## 14. Authorization boundary

This module authorizes planning and documentation only. It does not authorize:
- creating or moving application directories;
- modifying application source, runtime configuration or manifests;
- installing dependencies or changing package/lock files;
- configuring branch protection, CI, preview or production deployment;
- creating databases, migrations or provider integrations;
- accessing live Canvas/StudentVUE accounts or production secrets;
- running builds/tests or claiming runtime/device qualification;
- deleting, disabling, rewriting or migrating legacy functionality.

A later implementation phase requires a separate, explicit user authorization after planning sign-off. No planning decision in this document grants that authorization.



## 15. Superseding authorization and current execution status — 2026-11-25

Section 14 records the planning-only boundary at the time Module 2 was approved. It remains in force for production deployment, live provider access, data migration, legacy deletion/disablement, privileged credentials and physical/device acceptance claims.

The later explicit owner transition authorization in [IMPLEMENTATION-READINESS-AND-TRANSITION-PLAN.md](IMPLEMENTATION-READINESS-AND-TRANSITION-PLAN.md) authorizes the isolated `apps/web/` development branch and bounded local/demo application implementation and development-branch CI/build/test. Subsequent owner scope clarification authorizes keeping academic workspaces/course editor in scope while excluding native quizzes, assignment submissions and document editors.

This later authorization does not reopen Phase 0 or grant blanket permission for all future integrations/releases. The controlling boundaries and remaining approval gates are in [EXECUTION-PLAN-AND-EVIDENCE-REGISTER.md](EXECUTION-PLAN-AND-EVIDENCE-REGISTER.md). No production workflow or legacy Worker has been changed.
