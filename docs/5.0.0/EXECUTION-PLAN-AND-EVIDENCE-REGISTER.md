# NORTHSTAR 5.0.0 — Authorized Execution Plan and Evidence Register

**Control document:** Execution plan for the existing NORTHSTAR 5.0.0 project  
**Status:** Active; baseline verified, scope reconciliation and evidence work in progress  
**Plan revision:** 1.0 — 2026-11-25  
**Execution branch:** `northstar-5.0.0-development`  
**Planning baseline branch:** `northstar-5.0.0-phase-0-setup`  
**Phase 0:** Formally closed; this document does not reopen it  
**Authorization:** Continue repository verification, planning/documentation, and bounded local/demo application implementation already separately authorized on the development branch. No expansion into live provider operations, data migration, legacy retirement, production deployment, or release promotion.

This is the controlling ordered task register. Update task status only when its stated evidence exists. A planning document is not implementation evidence; a source file is not proof that its behavior works; a successful CI run is not physical iPad or live-provider acceptance.

## 1. Operating rules and status vocabulary

### 1.1 Authorization ledger

1. **Phase 0 closure (2026-11-25):** approved setup artifacts, source baseline, repository audit, architecture/roadmap and governance records. Phase 0 remains closed. Its sign-off explicitly did not authorize application implementation.
2. **Separate transition authorization (2026-11-25):** the owner confirmed `apps/web/` as the NORTHSTAR 5.0 application location and authorized the first isolated React/TypeScript/Vite foundation slice on `northstar-5.0.0-development`.
3. **Subsequent bounded implementation authorization:** the repository traceability record documents a later explicit owner instruction authorizing continued local/demo implementation and development-branch CI/build/test work. This is separate from Phase 0 approval.
4. **Excluded without further approval:** real Canvas or AI provider connections; real credentials; live target-tenant tests; user-data migration/import; destructive schema/data changes; legacy source deletion/retirement; Worker/provider deployment; production workflow/branch changes; production deployment or release promotion.
5. **Latest product-scope clarification (2026-11-25):** NORTHSTAR is an academic organizer/intelligence layer, not an LMS/Canvas replacement. Academic workspaces and course-editor development remain approved. Do not build a native quiz/test engine, native assignment-submission workflow, or general-purpose document editor. Canvas/external services retain those native workflows. Review Center may remain a limited local writing-feedback/draft workspace, not a document-editing suite. Study Lab may support flashcards, spaced repetition, study guides and non-assessment learning aids, not timed graded quizzes/tests. Assignment tracking may display provider/demo submission states, but must not initiate or simulate an actual submission workflow. Legacy files that contain excluded workflows remain untouched until a separately authorized retirement decision.

### 1.2 Status values

- **Complete — repository evidence:** exact branch/file/commit or recorded decision has been inspected.
- **Specified:** a planning artifact defines the intended behavior; no implementation claim.
- **Partial:** a specification or implementation exists but listed acceptance evidence is missing.
- **In progress:** work is actively being executed.
- **Blocked — external/approval:** cannot proceed until the named account, device, decision or authorization exists.
- **Not started:** no evidence of execution.
- **Implemented:** source code exists and is connected to the app.
- **Automated verified:** the exact commit passed a named automated workflow/test.
- **Manual verified:** a recorded human procedure passed in a stated environment.
- **Provider verified:** the exact capability was tested against a named authorized provider tenant.
- **Physical-device verified:** tested on the actual iPad/Safari device and OS recorded.
- **Accepted:** owner acceptance recorded after required evidence.

### 1.3 Evidence record minimum

Each task record must include task ID; start branch and SHA; inspected/changed paths; work actually performed; exact command/procedure; result and relevant output; failure and resolution; resulting commit; remaining limitations; evidence link/path; requirement IDs; and approval status. Never convert missing evidence into a pass.

## 2. Verified repository baseline

| Item | Verified value | Evidence |
|---|---|---|
| Repository | `s0ndvyr/NORTHSTAR-2.0` | GitHub repository metadata |
| Default branch | `main` | Repository metadata |
| Phase 0 setup branch | `northstar-5.0.0-phase-0-setup` | Branch API |
| Phase 0 branch head | `65144d5b1230a86137d9874fbf12247f8ace0ac1` | Branch API |
| Initial setup commit | `ff2f6f63605f95b6e78234c04b14935bcb1919a4` | Commit history |
| Earlier Phase 0 checkpoint | `2914e2a3b2a0322e547c578f6eecf92f08f1da8d` | Commit history |
| Cross-Application index commit | `3dcfb23124b8908d8cc6001e6c37c2b2b87df181` | Commit history |
| Audited stabilization branch | `northstar-4.4.8.3.1-stabilization` | Branch API |
| Audited migration-source head | `df0427304e0f03aa822a1c8fe99547355e9c0bfc` | Branch API |
| Development branch | `northstar-5.0.0-development` | Branch API |
| Development branch head | `e7aabe53c4f30f600900964ef42adf764da2fe47` | Branch API |
| Last application-code checkpoint | `4fc4e4788710c771c6490c9514a70f1c2ca51674` | Commit diff |
| Phase 0 to setup branch | 62 commits ahead, 0 behind | Compare API |
| Phase 0 to development branch | 378 commits ahead, 0 behind | Compare API |
| Phase 0 branch tree | 78 tracked files at inspected head | Recursive Git tree |
| Development branch tree | 109 tracked files at inspected head | Recursive Git tree |

The stabilization branch still points to the audited source commit. The setup branch is 62 commits ahead of that source and contains the Phase 0 planning artifacts. The development branch is 378 commits ahead of the Phase 0 branch and contains the separate `apps/web/` implementation. The default `main` branch is not a substitute for the migration source: it is divergent from the audited stabilization line (4 commits ahead and 321 behind at the comparison checkpoint).

The current development head `e7aabe5` is a documentation/status update whose parent is `4fc4e47`. The `4fc4e47` application-code commit changes only `apps/web/vite.config.ts`, setting `chunkSizeWarningLimit: 650`; it is not itself a feature implementation commit.

## 3. Ordered task register

| Task ID | Work package | Requirement / decision source | Dependencies | Status |
|---|---|---|---|---|
| NSX-001 | Verify repository, branches, exact heads and commit ancestry | Phase 0 baseline; NS-GOV-005 | None | **Complete — repository evidence** |
| NSX-002 | Verify Phase 0 closure and separate implementation authorization | Phase 0 sign-off; transition approval; NS-GOV-002 | NSX-001 | **Complete — repository evidence** |
| NSX-003 | Record current product-scope guardrail and reconcile earlier conflicting requirements | Latest owner clarification; NS-CAI-009; NS-ACAD-004; NS-MIG-001 | NSX-002 | **In progress** |
| NSX-004 | Complete exact-source tracked-file inventory and source/dependency/consumer graph | EFP-DEC-16; NS-MIG-002/003/005 | NSX-001 | **Partial** |
| NSX-005 | Complete browser persistence, file, key, schema and lifecycle call-site map | EFP-DEC-17; NS-MIG-004; NS-DATA-006 | NSX-004 | **Partial** |
| NSX-006 | Enumerate every Canvas Worker route and external operation | EFP-DEC-18; NS-SEC-003; NS-CAN-005 | NSX-004 | **Partial** |
| NSX-007 | Research official Canvas API capabilities, endpoint semantics, scopes, pagination, rate limits and evidence dates | NS-CAN-003/004/005; NS-CAI-003 | NSX-006 | **Not started** |
| NSX-008 | Reconcile canonical entities, field schemas, identities and relationships | DAP-DEC-01; NS-DATA-001/004; NS-CAI-001 | NSX-004, NSX-005 | **Partial — logical model drafted** |
| NSX-009 | Complete field-level source authority, provenance and local-overlay matrix | CAI-DEC-03; NS-DATA-002; NS-CAI-004 | NSX-007, NSX-008 | **Partial** |
| NSX-010 | Complete typed event, ordering, idempotency and projection contracts | CAI-DEC-02; NS-CAI-002/008 | NSX-008, NSX-009 | **Partial — envelope/state notes drafted** |
| NSX-011 | Complete synchronization, conflict, retry, ambiguous-outcome and recovery state machines | CAI-DEC-04; NS-CAI-005/007/008 | NSX-007, NSX-009, NSX-010 | **Partial** |
| NSX-012 | Complete offline cache, freshness, quota, retention, backup, restore and disconnect policy | DAP-DEC-03; NS-DATA-005; NS-OFF-002; NS-CAI-006/007 | NSX-005, NSX-008, NSX-011 | **Partial — policy drafted; numeric/platform evidence open** |
| NSX-013 | Complete BFF threat model, permissions, secret lifecycle and provider boundary | Secure BFF decision; NS-SEC-001/002/003; NS-CAI-009 | NSX-006, NSX-007, NSX-009 | **Partial — boundary specified; threat review open** |
| NSX-014 | Define seven workspace integration contracts | EFP-DEC-19; NS-INT-001/002/003 | NSX-008 through NSX-013 | **Not started as a complete contract set** |
| NSX-015 | Reconcile legacy capabilities/data to approved target scope, parity and rollback | DAP-DEC-04; NS-MIG-001/002/003/005 | NSX-003 through NSX-006, NSX-008 | **Partial — framework and selected-file review exist** |
| NSX-016 | Map every requirement to acceptance scenarios, failure cases and evidence artifacts | DAP-DEC-05; NS-QUAL-003; NS-CAI-010 | NSX-007 through NSX-015 | **Partial — verification blueprint drafted** |
| NSX-017 | Reconcile all requirement statuses and historical decision supersession | NS-GOV-001/003/004; traceability policy | NSX-003 through NSX-016 | **In progress** |
| NSX-018 | Conduct cross-document, security, privacy, migration and operational risk review | NS-GOV-003/004; NS-SEC-001/002; NS-REL-001 | NSX-004 through NSX-017 | **Not started** |
| NSX-019 | Prepare Cross-Application Intelligence design acceptance package | NS-GOV-001/004; CAI planning sign-off criteria | NSX-007 through NSX-018 | **Blocked pending evidence closure and owner review** |
| NSX-020 | Align the new app implementation with the no-LMS-replacement scope | NS-SCOPE-001; current owner clarification | NSX-003 | **In progress; local/demo changes authorized** |
| NSX-021 | Complete workspace accessibility qualification | NS-UX-003; NS-QUAL-001/002 | Current app implementation | **Partial; manual qualification open** |
| NSX-022 | Complete offline/recovery and concurrent-edit edge-case qualification | NS-DATA-003/005; NS-STATE-001; NS-CAI-005/006/007/010 | NSX-005, NSX-012, NSX-016 | **Partial; some automated journeys passed, broader failure matrix open** |
| NSX-023 | Complete physical iPad Safari/PWA acceptance | NS-UX-002; NS-QUAL-002 | NSX-021, NSX-022 | **Blocked — physical device/session required** |
| NSX-024 | Complete capability parity and legacy preservation reconciliation | NS-MIG-001/002/003/005; Phase 0 preservation rule | NSX-004, NSX-005, NSX-015 | **Partial; no legacy deletion authorized** |
| NSX-025 | Complete security, privacy and release-readiness review | NS-SEC-001/002/003; NS-REL-001 | NSX-006, NSX-012, NSX-013, NSX-016, NSX-018 | **Not started** |
| NSX-026 | Final repository/document reconciliation and close authorized work packages | NS-GOV-001/004; completion criteria | NSX-019 through NSX-025 | **Not started** |

### 3.1 Task execution details and completion criteria

#### NSX-001 — Repository baseline and branch identity
- **Work:** Read repository metadata, enumerate relevant branches, resolve exact heads, compare branch ancestry, inspect referenced commits and recursive trees.
- **Systems/files:** Git refs, commit graph, `docs/5.0.0/`, `apps/web/`, root legacy source.
- **Deliverable:** This baseline table and evidence log.
- **Acceptance:** Every named branch/commit resolves; comparisons are recorded; migration source is not confused with `main`.
- **Verification:** GitHub branch, commit and compare APIs.
- **Evidence:** EV-001 through EV-004 below.
- **Status:** Complete for the checkpoint recorded here; refresh before any write or merge.

#### NSX-002 — Phase 0 and implementation authorization ledger
- **Work:** Read Phase 0 sign-off, setup README, transition plan and traceability authorization annotations.
- **Deliverable:** A clear separation between Phase 0 closure and subsequent bounded implementation approval.
- **Acceptance:** Phase 0 remains closed; local/demo app implementation is recognized only because a separate transition authorization and subsequent bounded implementation instruction are recorded; excluded operations remain gated.
- **Verification:** Exact approval paragraphs in `PHASE-SIGNOFF-CHECKLIST.md`, `IMPLEMENTATION-READINESS-AND-TRANSITION-PLAN.md`, `README.md` and `REQUIREMENTS-TRACEABILITY.md`.
- **Evidence:** EV-005.
- **Status:** Complete from repository records. No inference from Phase 0 sign-off is used.

#### NSX-003 — Product-scope reconciliation
- **Work:** Record the current boundary as a formal scope guardrail. Reconcile legacy plans and later implementation annotations that describe quiz/test attempts, turn-in simulation, provider submission methods or document-editing capability.
- **Deliverables:** NS-SCOPE-001; traceability supersession note; updated scope section in README and implementation status; list of app code changes needed.
- **Acceptance:** No new app route/component/service/API exposes a native quiz/test engine, assignment submission action, or general-purpose document editor. Study Lab remains non-assessment (flashcards, spaced repetition, study guides and learning aids). Review Center remains limited to local writing feedback/drafts. Assignment records may show imported/demo states but NORTHSTAR does not submit.
- **Verification:** Search routes, components, types, adapter methods, actions, UI copy and tests; run relevant domain/UI tests after changes.
- **Approval:** The owner has supplied the scope clarification in this conversation. This is a scope restriction, not permission for live Canvas operations or legacy deletion.
- **Status:** In progress.

#### NSX-004 — Complete source and dependency inventory
- **Work:** Enumerate all tracked files on the exact migration source and current development branch. For each, record type, purpose, execution context, imports, script order, exports/globals, consumers, routes, DOM/event dependencies, data reads/writes, external calls, tests, security/privacy implications and disposition.
- **Systems/files:** Root `index.html`, `scripts/**`, `styles/**`, `canvas-bridge/**`, `native/ios/**`, `.github/workflows/**`, `package.json`, `wrangler.jsonc`, `release.json`, `VERSION`, `apps/web/**`, tests and docs.
- **Deliverables:** Versioned path inventory; dependency/consumer graph; workflow-to-source map; preservation/disposition matrix; exact source-ref reconciliation.
- **Acceptance:** Every tracked file is accounted for; unknown consumers remain explicit; no “unused” or “safe to delete” conclusion is based only on search absence.
- **Verification:** Recursive tree listing plus per-file inspection, static import/reference search, script-order analysis and test-reference mapping. Record search scope and negative evidence.
- **Dependencies:** NSX-001.
- **Status:** Partial. Existing `SOURCE-TREE-AND-PERSISTENCE-INVENTORY.md` and `LEGACY-SOURCE-INVENTORY-INITIAL-REVIEW.md` are initial checkpoints, not complete inventories.

#### NSX-005 — Persistence and lifecycle map
- **Work:** Trace every localStorage/sessionStorage key, IndexedDB database/store/version, Cache Storage/service-worker cache, file/blob path, URL/return context and server-side persistence discovered. Map every reader/writer/deleter/migration/fallback/cleanup call site.
- **Systems/files:** `scripts/vault.js`, `scripts/document-storage.js`, `scripts/studentvue.js`, `scripts/submissions.js`, `canvas-bridge/worker.js`, `apps/web/src/domain/academic-repository.ts`, `assignment-artifact-storage.ts`, service workers and all call sites.
- **Deliverables:** Key/store/schema/call-site table; data owner/sensitivity/source matrix; retention/eviction map; backup/restore and disconnect lifecycle; migration mapping.
- **Acceptance:** Every persistence mechanism has named owner, readers, writers, schema/version, lifecycle, security limitations and recovery behavior.
- **Verification:** Source search plus call-site tracing; schema and fixture inspection; do not execute migrations or manipulate user data.
- **Dependencies:** NSX-004.
- **Status:** Partial. The initial inventory observed `northstar-secure-vault` (v1, `secrets`) and `northstar-document-studio` (v1, `documents`, `drafts`); exhaustive call-site tracing remains.

#### NSX-006 — Canvas Worker route inventory
- **Work:** Enumerate each route and method, route allowlist, path/query/body validation, origin/CORS rules, auth handling, upstream URL, response filtering, error mapping, rate/size constraints, logs and tests.
- **Systems/files:** `canvas-bridge/worker.js`, `wrangler.jsonc`, `.github/workflows/deploy-canvas-bridge.yml`, `tests/bridge.test.mjs`, Canvas call sites and deployment configuration.
- **Deliverables:** Route-by-route matrix; data-flow diagram; threat/control mapping; official endpoint reference placeholder for each route.
- **Acceptance:** Every reachable route and provider operation is documented and tied to source lines/tests; unsupported operations are explicitly excluded.
- **Verification:** Static route regex/dispatch analysis, tests inspection and workflow/config review. No Worker deployment or live request.
- **Dependencies:** NSX-004.
- **Status:** Partial. Worker source is inspected; full route catalogue is outstanding.

#### NSX-007 — Official Canvas API evidence
- **Work:** For each in-scope read capability, collect current official Instructure documentation: endpoint/method/version, fields, pagination, scopes/roles, rate limits, incremental updates, version semantics, errors, conditional fields and limitations. Distinguish official docs from tenant verification.
- **Systems:** Canvas Courses, Assignments, Submissions/grade status read data where needed, Enrollments/Grades, Calendar, Files/Modules/Pages/Resources, and authentication/launch only where justified by approved workspaces.
- **Deliverables:** Dated capability matrix with source URL, retrieval date, supported operations, scopes, constraints, evidence class and linked requirement/test IDs.
- **Acceptance:** No provider capability is asserted without official documentation; no tenant behavior is called verified without a separately authorized tenant test.
- **Verification:** Official provider documentation review and cross-check against Worker source. No writes, real credentials or tenant access.
- **Dependencies:** NSX-006.
- **Approval boundary:** Read-only public documentation research is authorized; live tenant access and any write test are not.
- **Status:** Not started.

#### NSX-008 — Canonical model completion
- **Work:** Reconcile entities, fields, identity, versioning, lifecycle, relationships and nullable/optional semantics against source and workspace requirements.
- **Systems/files:** `CANONICAL-ACADEMIC-DATA-MODEL.md`, `INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md`, `apps/web/src/domain/academic.ts`, `academic-repository.ts`.
- **Deliverables:** Field catalogue for Term, Course, Assignment, provider-owned Submission state/receipt (read-only only), GradeItem, AcademicEvent, Resource, FileAsset, PersonalNote, StudyArtifact, Notification and integration metadata as applicable.
- **Acceptance:** Stable namespaced identity; explicit owner and authority per field; time-zone and enum rules; no local overlay overwrites provider facts; provider deletion preserves user-owned dependents.
- **Verification:** Schema review, relationship constraints, duplicate-identity scenarios and traceability.
- **Dependencies:** NSX-004/005.
- **Status:** Partial; logical catalogue exists, exact enums and provider mappings remain open.

#### NSX-009 — Field authority and provenance
- **Work:** Define field-by-field authority across Canvas, NORTHSTAR personal overlays and derived projections. Separate official due date/grade/status from personal target date/progress/estimate.
- **Deliverables:** Authority matrix; provenance envelope; editability and source-freshness rules; source-precedence scenarios.
- **Acceptance:** Every externally sourced/derived field exposes source and freshness; personal fields cannot overwrite official fields; no simulated local status is presented as provider-confirmed.
- **Verification:** Source-precedence, overlay-isolation and stale-source tests specified.
- **Dependencies:** NSX-007/008.
- **Status:** Partial; high-level authority is approved, field-level matrix needs completion.

#### NSX-010 — Events and projection propagation
- **Work:** Define typed/versioned internal events, aggregate revision, ordering, idempotency, transaction/outbox strategy, subscriber failure handling, replay and projection rebuild.
- **Deliverables:** Event catalogue, envelope schema, sequence diagrams and retry invariants.
- **Acceptance:** Duplicate/out-of-order events cannot duplicate effects or regress state; failed subscribers recover without losing committed changes.
- **Verification:** Duplicate delivery, out-of-order event, subscriber crash and replay scenarios.
- **Dependencies:** NSX-008/009.
- **Status:** Partial; event principles and envelope draft exist.

#### NSX-011 — Sync and conflict lifecycle
- **Work:** Specify refresh, partial pagination, cursor checkpoints, retries/backoff, permission revocation, ambiguous outcomes, local/provider concurrent edits, deletion/tombstones and user resolution.
- **Deliverables:** Sync and conflict state machines; operation classes; conflict record; reconciliation algorithm; user-visible states.
- **Acceptance:** Preserve base/local/provider versions; no universal last-write-wins; no blind retry of consequential actions; permission and approval revalidated before replay.
- **Verification:** Stale revision, concurrent edit, interrupted sync, ambiguous timeout, revoked permission and interrupted resolution scenarios.
- **Dependencies:** NSX-007/009/010.
- **Status:** Partial; draft state machines exist, complete sequences and provider semantics remain.

#### NSX-012 — Offline, retention and recovery policy
- **Work:** Complete data classes, freshness thresholds, quotas, eviction order, storage persistence limits, export/backup format, checksums, restore staging, disconnect/revocation and term archive/purge.
- **Deliverables:** Numeric policy only where supported by platform constraints and measurement; otherwise documented conservative default with rationale and revisit trigger.
- **Acceptance:** Unsynced user-authored work and pending permitted metadata are never silently evicted; cached provider data always exposes freshness; restore does not blindly overwrite canonical data.
- **Verification:** Quota, interrupted save, corruption, device-loss restore, stale data, disconnect and term rollover scenarios. Separate simulated tests from physical Safari evidence.
- **Dependencies:** NSX-005/008/011.
- **Status:** Partial; policy framework drafted; quantitative limits and device-specific behavior remain unverified.

#### NSX-013 — BFF/security boundary
- **Work:** Define threat model and controls for origins, auth/session, least privilege, allowlisted operations, validation, redirects, request limits, rate limits, CSRF/CORS, secret rotation, logs/redaction, revocation and audit identity.
- **Deliverables:** Threat model, data-flow diagram, permission matrix, secure operation contract and risk register.
- **Acceptance:** No provider secret in browser bundle; no unrestricted proxy; provider operations default-deny and scope-limited; logs exclude tokens and private coursework.
- **Verification:** Static configuration review and test cases; live security testing only under separate authorization.
- **Dependencies:** NSX-006/007/009.
- **Status:** Partial; secure BFF principle exists, full threat review is outstanding.

#### NSX-014 — Seven workspace contracts
- **Work:** Define Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace contracts. For each specify canonical entities, projections, commands, events, local/provider field boundaries, permissions, freshness, offline/conflict behavior, empty/error states and acceptance journeys.
- **Scope constraint:** No quiz/test engine, assignment submission workflow or general-purpose document editor. Study Lab is learning support, not a timed graded assessment engine. Review Center is limited writing feedback/draft support.
- **Deliverables:** Workspace contract matrix and per-workspace sequence/acceptance scenarios.
- **Acceptance:** All seven workspaces use canonical identity and clear ownership; no workspace becomes a second source of truth.
- **Verification:** Cross-workspace consistency and permission-boundary scenarios.
- **Dependencies:** NSX-008 through NSX-013.
- **Status:** Not started as a complete set.

#### NSX-015 — Legacy capability and migration mapping
- **Work:** Map each legacy workflow and persisted data class to preserve/refactor/replace/isolate/retire-candidate/unknown. Record parity and rollback conditions.
- **Deliverables:** Source-to-target map, fixture inventory, data reconciliation plan, preservation gates and rollback runbook.
- **Acceptance:** No unique user data or required security behavior is lost; no legacy code removed until explicit approval and parity/backup/rollback evidence.
- **Verification:** Before/after counts, relationships, attachment checksums, regression fixtures and migration dry-run plan (execution remains separately gated).
- **Dependencies:** NSX-003 through NSX-008.
- **Status:** Partial; mapping framework and selected source review exist.

#### NSX-016 — Verification blueprint
- **Work:** Connect every requirement to unit, contract, integration, E2E, failure/recovery, accessibility, security, performance, iPad and provider acceptance scenarios.
- **Deliverables:** Requirement-to-test matrix; scenario IDs; evidence schema; gate checklist.
- **Acceptance:** Every P0/P1 requirement has measurable expected outcomes and exact evidence class; test existence is not test success.
- **Verification:** Review matrix for missing IDs, dependencies and uncovered failure modes.
- **Dependencies:** NSX-007 through NSX-015.
- **Status:** Partial; blueprint drafted; implementation-specific test mapping and gap analysis remain.

#### NSX-017 — Traceability reconciliation
- **Work:** Preserve historical IDs and decisions; mark superseded/restricted requirements explicitly; connect decisions to requirements, tasks, deliverables, verification and evidence.
- **Deliverables:** Updated `REQUIREMENTS-TRACEABILITY.md`, decision register and execution plan links.
- **Acceptance:** No approved requirement disappears; every status change points to evidence; new scope restriction is explicit and does not rewrite historical approval.
- **Verification:** Cross-check every NS-CAI, NS-DATA, NS-CAN, NS-MIG, NS-INT, NS-SEC, NS-QUAL and NS-GOV requirement against this task register.
- **Dependencies:** NSX-003 through NSX-016.
- **Status:** In progress.

#### NSX-018 — Risk and cross-document review
- **Work:** Reconcile README, Phase 0 audit, transition plan, integrated architecture, model, Canvas matrix, offline policy, migration map, Modules 1/2, implementation status and traceability.
- **Deliverables:** Open-risk register with severity, impact, owner/action, evidence and decision requirement; consistency report.
- **Acceptance:** Contradictory or stale statements are either corrected or explicitly superseded; unresolved decisions have impact and gate.
- **Verification:** Requirement/document link audit and reviewer checklist.
- **Dependencies:** NSX-004 through NSX-017.
- **Status:** Not started.

#### NSX-019 — CAI design acceptance package
- **Work:** Assemble the integrated spec, five supporting specs, exact-source inventory, Canvas evidence, workspace contracts, traceability, risks and verification matrix.
- **Deliverable:** Final design-gate package and owner review request.
- **Acceptance:** All requirements fully specified or explicitly blocked; no unresolved P0 design gap hidden; acceptance criteria and evidence are complete.
- **Approval:** Owner sign-off is required to close Cross-Application Intelligence planning. That sign-off does not itself authorize new provider, migration, deployment or destructive work.
- **Dependencies:** NSX-007 through NSX-018.
- **Status:** Blocked pending evidence closure and owner review.

#### NSX-020 — App scope guard and local/demo implementation
- **Work:** Audit current app routes, components, domain types and adapter interfaces against NS-SCOPE-001. Remove or reshape any local feature that behaves like a native quiz/test engine or submission workflow; retain approved course editing, assignment tracking, calendar, gradebook insights, resources, flashcards, study guides, Review Center draft feedback and clearly simulated AI.
- **Systems/files:** `apps/web/src/App.tsx`, `domain/academic.ts`, `domain/academic-repository.ts`, `domain/canvas-adapter.ts`, related tests, `apps/web/README.md`, status/traceability docs.
- **Acceptance:** No timed scored quiz engine; no “turn in”/submission action; no Canvas submit method; no document editor suite; personal status is clearly local and cannot be mistaken for provider confirmation.
- **Verification:** Static route/API/component search; focused unit/UI tests; development CI workflow.
- **Authorization:** Bounded local/demo changes are within the separate development-branch authorization. No legacy root source deletion or provider write.
- **Status:** In progress.

#### NSX-021 — Accessibility qualification
- **Work:** Audit semantic landmarks, labels, heading order, keyboard operation, focus, dialogs, dynamic announcements, contrast, forced colors, zoom/reflow and reduced motion across all routes.
- **Deliverables:** Workspace checklist, defect list, automated/manual evidence.
- **Acceptance:** All critical workflows operable without pointer; no keyboard traps; meaningful labels/status announcements; reduced motion respected; contrast/reflow issues resolved or accepted with rationale.
- **Verification:** Automated accessibility checks where available plus manual keyboard and assistive-technology review.
- **Dependencies:** Stable route/UI baseline.
- **Status:** Partial; keyboard foundations exist; full workspace qualification remains open.

#### NSX-022 — Offline and recovery qualification
- **Work:** Extend existing two-tab conflict/export and cached-shell journeys to quota failure, interrupted writes, reload during save, corrupt backup, restore conflict, service-worker update and stale data semantics.
- **Deliverables:** Repeatable scenarios and exact CI artifacts/logs.
- **Acceptance:** No silent loss of local user-authored data; recovery is visible and deterministic; static shell cache is not described as offline data sync.
- **Verification:** Automated browser tests and documented manual tests.
- **Dependencies:** NSX-005, NSX-012, NSX-016.
- **Status:** Partial; one offline cached-shell reload and two-tab conflict recovery journey passed in the latest recorded Playwright run; broader failure matrix open.

#### NSX-023 — Physical iPad Safari qualification
- **Work:** Test supported iPadOS/Safari on actual hardware: portrait/landscape, split view/resizing, touch target sizing, hardware/on-screen keyboard, file import/export, install/update, storage pressure, offline and recovery.
- **Deliverables:** Device/OS/browser record, scenario results, screenshots/logs and defects.
- **Acceptance:** Each required journey passes on physical device; Chromium viewport testing is not substituted.
- **Dependency/Blocker:** Physical iPad session and user-side device access.
- **Status:** Blocked for physical verification. The 1024×1366 Playwright viewport was Chromium-based only.

#### NSX-024 — Legacy parity and preservation
- **Work:** Compare each in-scope legacy capability with the new app or approved external handoff. Identify features excluded by NS-SCOPE-001 and preserve them in legacy source until separately approved retirement.
- **Deliverables:** Capability parity matrix, regression cases, explicit retained/excluded/retire-candidate status.
- **Acceptance:** Every legacy capability is accounted for; no source deletion or data loss; excluded Canvas-native workflows are not recreated in 5.0.
- **Verification:** Source mapping and regression evidence; runtime comparisons only within authorized local/demo scope.
- **Status:** Partial; full source mapping and parity evidence open.

#### NSX-025 — Security and release readiness
- **Work:** Review dependency and secret posture, data classification, local storage threat model, BFF boundary, PWA/service-worker cache, preview isolation, version metadata, rollback and release controls.
- **Deliverables:** Security review, release checklist, known limitations and gated action list.
- **Acceptance:** No unresolved critical security/data-loss issue; preview and production are separate; production release remains blocked until explicit approval.
- **Verification:** Static review, automated scans/CI and documented manual checks. Do not claim production readiness from a passing app build.
- **Status:** Not started as a complete review.

#### NSX-026 — Final reconciliation and closeout
- **Work:** Recheck branch head, commits, docs, traceability, task statuses and evidence locations after all authorized work.
- **Deliverables:** Updated progress board and evidence report.
- **Acceptance:** Every authorized task is complete, blocked with exact reason, or explicitly not started with dependency; no unsupported completion claim.
- **Verification:** Repository tree, file diff, CI run, requirement-to-task cross-check and owner review.
- **Status:** Not started.

## 4. Critical dependency order

1. NSX-001/002 establish source and authorization boundaries.
2. NSX-003 defines the current target scope before further feature work.
3. NSX-004/005/006 complete the source, persistence and Worker evidence base.
4. NSX-007 supplies official provider capability evidence.
5. NSX-008/009 complete canonical data and authority.
6. NSX-010/011 define propagation, synchronization and conflict behavior.
7. NSX-012/013 complete offline lifecycle and security boundary.
8. NSX-014/015 define workspace integration and migration/parity.
9. NSX-016/017 connect every requirement to acceptance and evidence.
10. NSX-018/019 complete risk review and CAI planning acceptance.
11. NSX-020 through NSX-025 continue authorized local/demo implementation and qualification in parallel where dependencies permit.
12. NSX-026 reconciles the final state.

No live provider work, migration, legacy deletion or production deployment is inserted into this sequence without a separate authorization record.

## 5. Current implementation and qualification snapshot

The development status board records the following as implemented locally: React 19/TypeScript/Vite foundation; versioned local academic snapshot; dashboard; assignment CRUD/tracking; course create/edit and hubs; calendar events; gradebook records; resources; Study Lab flashcards/spaced repetition; Review Center local drafts/heuristic feedback; simulated AI; unconfigured Canvas adapter; Midnight/Light themes; reduced motion; PWA shell; local backup/recovery. These are implementation claims from the board and source, not blanket acceptance.

The current implementation also contains two scope conflicts requiring NSX-020 resolution:
- a timed multiple-choice practice/attempt engine in Study Lab (timer, answers, flags, scoring and attempt submission);
- a local “Turn in locally” action and a Canvas adapter interface method named `submitAssignment`.
These do not contact Canvas, but they resemble the native quiz/submission workflows now excluded by NS-SCOPE-001. They must be removed or reshaped in the new app. Legacy source remains untouched.

The Review Center is a limited local writing draft/feedback surface, not a general-purpose document editor. Keep it constrained to that approved purpose.

## 6. Verification evidence log

| Evidence ID | Task | Repository ref / procedure | Result | Evidence class and limitation |
|---|---|---|---|---|
| EV-001 | NSX-001 | Repository metadata for `s0ndvyr/NORTHSTAR-2.0` | Public repo; default branch `main`; write permission available | Repository metadata |
| EV-002 | NSX-001 | Branch API for Phase 0, stabilization and development branches | Exact heads recorded in Section 2 | Live Git ref lookup at checkpoint |
| EV-003 | NSX-001 | Compare `df042730...` to Phase 0 head | 62 ahead, 0 behind | Git ancestry evidence |
| EV-004 | NSX-001 | Compare Phase 0 head to development head | 378 ahead, 0 behind | Git ancestry evidence |
| EV-005 | NSX-002 | `IMPLEMENTATION-READINESS-AND-TRANSITION-PLAN.md` §10; README implementation transition; traceability authorization notes | Separate bounded local/demo implementation authorization exists; Phase 0 itself did not authorize implementation | Repository decision record; not a transcript citation |
| EV-006 | NSX-004 | Recursive Git tree at Phase 0 head | 78 tracked files; 20 files under `docs/5.0.0/` | Tree inventory only; no complete call-site map |
| EV-007 | NSX-004 | Recursive Git tree at development head | 109 tracked files; `apps/web/` contains app, domain, PWA, tests and build config | Tree inventory only |
| EV-008 | NSX-020 | Static inspection of `App.tsx`, academic model, Canvas adapter and adapter tests | Found timed practice attempt engine, local turn-in action and `submitAssignment` adapter method; all are unconfigured/local but conflict with latest scope guardrail | Static source evidence; no code changed in this checkpoint |
| EV-009 | NSX-021/022 | GitHub Actions run `45695594885` | Run completed `success`; head SHA `4fc4e4788710c771c6490c9514a70f1c2ca51674`; job steps completed | Automated CI evidence. Job listing showed 14 step entries completed; status board records 51 domain tests and 13 Playwright journeys. Connector job metadata did not expose test stdout, so the exact counts are status-board claims, not independently re-counted here. |
| EV-010 | NSX-001/020 | Commit `4fc4e478...` diff | Only `apps/web/vite.config.ts` changed; chunk warning limit set to 650 | Commit diff |
| EV-011 | NSX-001 | Current development head `e7aabe53...` commit diff | Status-board-only change; parent is `4fc4e478...` | Commit diff |

### 6.1 Latest recorded CI evidence

Workflow: [NORTHSTAR Web Qualification #45695594885](https://github.com/s0ndvyr/NORTHSTAR-2.0/actions/runs/45695594885)  
Head: `4fc4e4788710c771c6490c9514a70f1c2ca51674`  
Branch: `northstar-5.0.0-development`  
Conclusion: `success`  
Recorded checks: clean `npm ci`, TypeScript typecheck, production dependency audit, domain tests, Vite production build, Playwright browser workflow qualification. The implementation status board reports 51 domain tests and 13 browser journeys, including a 1024×1366 Chromium viewport, offline cached-shell reload and two-tab conflict export/recovery. This does not prove physical iPad Safari, VoiceOver, live Canvas, live AI, cloud sync or production release.

## 7. Explicit blockers and approval gates

| Work | Blocker / approval needed | Work that can continue now |
|---|---|---|
| Physical iPad Safari | Actual iPad/Safari test session and device/OS evidence | Automated browser checks and manual test protocol |
| Live Canvas tenant verification | Explicit owner authorization for named tenant, account role, scopes and exact read-only test | Official public API documentation research and mock contract tests |
| Canvas/provider writes | Not in current product scope for submissions; any other consequential provider write requires new explicit approval | Read-only capability planning and local/demo UI |
| AI provider connection | Separate explicit authorization, provider/account and secret-handling review | Provider-neutral simulation and service contract planning |
| User-data migration/import | Separate explicit authorization plus verified backup/archive, mapping and rollback | Static source mapping, fixtures and migration design |
| Legacy source deletion/retirement | Separate explicit authorization plus parity, backup and rollback evidence | Inventory and preservation classification |
| Production workflow/deployment/release | Separate explicit production approval and release gate | Isolated development CI and preview planning |
| Quantitative offline limits | Measured usage and physical Safari/storage evidence | Conservative policy framework and official platform research |
| CAI planning closure | Complete evidence, risk and workspace contract package; owner sign-off | Continue all static research/documentation tasks |

## 8. Change-control rules

- This plan is the controlling sequence. Do not skip tasks because they are difficult.
- Any scope/sequence change requires a note with the new evidence, reason, impact, affected IDs, dependencies and revised order.
- Historical approved decisions remain recorded. A later owner decision may supersede a requirement, but the old requirement is marked superseded/restricted, not deleted.
- No legacy source, user data, production branch or deployment is changed by this planning plan.
- The development branch may receive bounded local/demo implementation and CI changes already authorized; all new changes must respect NS-SCOPE-001.
- Before each write, re-read the target branch head and target file SHA. Do not overwrite concurrent changes.
- A task is not complete merely because the plan exists.

## 9. Next execution actions

1. Finish NSX-003 by recording NS-SCOPE-001 in the decision and traceability documents and updating the implementation status.
2. Resolve the two app-scope conflicts found in NSX-020: remove the timed graded practice engine and native-looking turn-in/submit adapter affordances while preserving Study Lab learning tools and assignment tracking.
3. Continue NSX-004/005/006 with source-by-source inventory, persistence call-site trace and Worker route matrix.
4. Begin NSX-007 official Canvas documentation research and attach dated endpoint evidence.
5. Complete workspace contracts and data model/authority refinements before requesting Cross-Application Intelligence planning sign-off.

**Current honest status:** NORTHSTAR 5.0.0 has an implemented local/demo application foundation with successful automated qualification recorded for commit `4fc4e478...`; the active development branch is `e7aabe5...`. Phase 0 is closed. The Cross-Application Intelligence workstream is not signed off. Live provider integration, data migration, legacy retirement, physical iPad acceptance and production release are not claimed.
