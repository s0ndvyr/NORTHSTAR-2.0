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
| Development branch head | `cbde2e3967e98867a0ac956c3c77be9ab6708a8d` | Branch API, verified 2026-11-26 02:48 UTC |
| Prior successful CI/code checkpoint | `4fc4e4788710c771c6490c9514a70f1c2ca51674` | Ancestor of current development branch; successful run 45695594885, not current branch head |
| Phase 0 to setup branch | 62 commits ahead, 0 behind | Compare API |
| Last application-code checkpoint | `4aaa2984cc45e55456097a901b8734b713bfc61d` | Latest recovery code/test commit; qualified by run 45744014664 |
| Phase 0 branch tree | 78 tracked files at inspected head | Recursive Git tree |
| Development branch tree | 112 tracked files at inspected head | Recursive Git tree; includes external-links helper and tests |
| 4.4.8.3.2 qualification branch | `northstar-4.4.8.3.2-assignment-workspace-qualification` at `df8f6c5f6ad8d0d5f6b61dd0034eead562c3483b` | Branch API |
| Prior successful CI checkpoint to current development head | 99 commits ahead, 0 behind | Compare API |
| Last app-code commit to current development head | 6 commits ahead, 0 behind; changed paths are documentation only | Compare API |
| Phase 0 to development branch | 476 commits ahead, 0 behind | Compare API, 2026-11-26 02:48 UTC |

The audited stabilization branch remains at `df0427304e0f03aa822a1c8fe99547355e9c0bfc`; a later 4.4.8.3.2 qualification branch exists at `df8f6c5f6ad8d0d5f6b61dd0034eead562c3483b`. The Phase 0 setup branch is 62 commits ahead of the stabilization source and contains the closed Phase 0 planning artifacts. The development branch is 443 commits ahead of the Phase 0 branch and contains the separate `apps/web/` implementation. The default `main` branch remains divergent from the audited stabilization line (4 commits ahead and 321 behind at the comparison checkpoint), so it is not a substitute for the migration source.

The current development head is `46b6be3f9bfd8d331f72cfdcdeb84163546db7c5`. The latest app/test code commit is `470641fda0c6104005c730a737359209f0ee276b`; the 19 commits between that code checkpoint and the current branch head change documentation only. The earlier `4fc4e4788710c771c6490c9514a70f1c2ca51674` checkpoint is 66 commits behind the current development head and has a successful CI run, but it is not the current application-code checkpoint.

## 3. Ordered task register

| Task ID | Work package | Requirement / decision source | Dependencies | Status |
|---|---|---|---|---|
| NSX-001 | Verify repository, branches, exact heads and commit ancestry | Phase 0 baseline; NS-GOV-005 | None | **Complete — repository evidence** |
| NSX-002 | Verify Phase 0 closure and separate implementation authorization | Phase 0 sign-off; transition approval; NS-GOV-002 | NSX-001 | **Complete — repository evidence** |
| NSX-003 | Record current product-scope guardrail and reconcile earlier conflicting requirements | Latest owner clarification; NS-CAI-009; NS-ACAD-004; NS-MIG-001 | NSX-002 | **Complete — decision, scope, README and traceability records reconciled; runtime parity remains in NSX-020/028** |
| NSX-004 | Complete exact-source tracked-file inventory and source/dependency/consumer graph | EFP-DEC-16; NS-MIG-002/003/005; NS-ARCH-005 | NSX-001 | **Partial** |
| NSX-005 | Complete browser persistence, file, key, schema and lifecycle call-site map | EFP-DEC-17; NS-MIG-004; NS-DATA-006 | NSX-004 | **Partial — 5.0 and legacy stores enumerated; lifecycle, backup and orphan cleanup remain open** |
| NSX-006 | Enumerate every Canvas Worker route and external operation | EFP-DEC-18; NS-SEC-003; NS-CAN-005 | NSX-004 | **Partial — legacy read/write route families mapped; per-route test/security matrix remains** |
| NSX-007 | Research official Canvas API capabilities, endpoint semantics, scopes, pagination, rate limits and evidence dates | NS-CAN-003/004/005; NS-CAI-003 | NSX-006 | **Partial — official endpoint, OAuth, pagination, throttling and policy sources documented; exact legacy route mapping remains open** |
| NSX-027 | Resolve Instructure API Policy applicability and document written authorization/partnership/express-permission gate before any live Canvas access | NS-CAN-011; current Instructure API Policy effective 2026-11-25 | NSX-007 | **Blocked — classification and written permission are not established** |
| NSX-008 | Reconcile canonical entities, field schemas, identities and relationships | DAP-DEC-01; NS-DATA-001/004; NS-CAI-001 | NSX-004, NSX-005 | **Partial — detailed logical schema, ownership, relationships and validation documented; app mapping and persisted status split open** |
| NSX-009 | Complete field-level source authority, provenance and local-overlay matrix | CAI-DEC-03; NS-DATA-002; NS-CAI-004 | NSX-007, NSX-008 | **Partial — ownership and provenance rules specified; field-level implementation remains** |
| NSX-010 | Complete typed event, ordering, idempotency and projection contracts | CAI-DEC-02; NS-CAI-002/008 | NSX-008, NSX-009 | **Partial — envelope/state notes drafted** |
| NSX-011 | Complete synchronization, conflict, retry, ambiguous-outcome and recovery state machines | CAI-DEC-04; NS-CAI-005/007/008 | NSX-007, NSX-009, NSX-010 | **Partial — read-only provider sync and local conflict contracts specified; provider checkpoint service not implemented** |
| NSX-012 | Complete offline cache, freshness, quota, retention, backup, restore and disconnect policy | DAP-DEC-03; NS-DATA-005; NS-OFF-002; NS-CAI-006/007 | NSX-005, NSX-008, NSX-011 | **Partial — shell/cache and local data behavior mapped; artifact backup and platform quota evidence open** |
| NSX-013 | Complete BFF threat model, permissions, secret lifecycle and provider boundary | Secure BFF decision; NS-SEC-001/002/003; NS-CAI-009 | NSX-006, NSX-007, NSX-009 | **Partial — boundary specified; threat review open** |
| NSX-014 | Define seven workspace integration contracts | EFP-DEC-19; NS-INT-001/002/003 | NSX-008 through NSX-013 | **Not started as a complete contract set** |
| NSX-015 | Reconcile legacy capabilities/data to approved target scope, parity and rollback | DAP-DEC-04; NS-MIG-001/002/003/005 | NSX-003 through NSX-006, NSX-008 | **Partial — framework and selected-file review exist** |
| NSX-016 | Map every requirement to acceptance scenarios, failure cases and evidence artifacts | DAP-DEC-05; NS-QUAL-003; NS-CAI-010 | NSX-007 through NSX-015 | **Partial — verification blueprint drafted** |
| NSX-017 | Reconcile all requirement statuses and historical decision supersession | NS-GOV-001/003/004; traceability policy | NSX-003 through NSX-016, NSX-031 | **In progress — canonical table normalized to 61 unique requirement IDs; cross-document reference reconciliation remains** |
| NSX-018 | Conduct cross-document, security, privacy, migration and operational risk review | NS-GOV-003/004; NS-SEC-001/002; NS-REL-001 | NSX-004 through NSX-017 | **Not started** |
| NSX-019 | Prepare Cross-Application Intelligence design acceptance package | NS-GOV-001/004; CAI planning sign-off criteria | NSX-007 through NSX-018 | **Blocked pending evidence closure and owner review** |
| NSX-020 | Align the new app implementation with the no-LMS-replacement scope | NS-SCOPE-001; current owner clarification | NSX-003 | **Complete — new-app scope correction passed full CI/browser qualification; legacy runtime remains separate under NSX-028** |
| NSX-021 | Complete workspace accessibility qualification | NS-UX-003; NS-QUAL-001/002/004 | Current app implementation | **Partial; manual qualification open** |
| NSX-022 | Complete offline/recovery and concurrent-edit edge-case qualification | NS-DATA-003/005; NS-STATE-001; NS-CAI-005/006/007/010; NS-QUAL-004 | NSX-005, NSX-012, NSX-016 | **In progress — deterministic seed and explicit conflict-export acknowledgement passed all 13 browser journeys; broader storage failure/recovery matrix remains** |
| NSX-023 | Complete physical iPad Safari/PWA acceptance | NS-UX-002; NS-QUAL-002 | NSX-021, NSX-022 | **Blocked — physical device/session required** |
| NSX-024 | Complete capability parity and legacy preservation reconciliation | NS-MIG-001/002/003/005; Phase 0 preservation rule | NSX-004, NSX-005, NSX-015 | **Partial; no legacy deletion authorized** |
| NSX-025 | Complete security, privacy and release-readiness review | NS-SEC-001/002/003; NS-REL-001; NS-QUAL-004 | NSX-006, NSX-012, NSX-013, NSX-016, NSX-018 | **Partial — threat model and static source review documented; HTTPS URL validation passed CI/browser qualification; CSP, dynamic security testing and release controls remain** |
| NSX-026 | Final repository/document reconciliation and close authorized work packages | NS-GOV-001/004; completion criteria | NSX-019 through NSX-025, NSX-031 | **Not started** |
| NSX-028 | Decide and evidence disposition of legacy Worker/UI write, quiz and document-editor capabilities without silently changing the legacy product | NS-CAN-012; NS-SCOPE-001; NS-MIG-005; legacy preservation rule | NSX-004, NSX-006, NSX-015, NSX-018 | **Blocked — owner decision and separate deployment/retirement authorization required** |
| NSX-029 | Make local attachment lifecycle, backup/restore, conflict export and cleanup safe across localStorage and IndexedDB | NS-DATA-007; NS-DATA-005; NS-CAI-007; NS-QUAL-003 | NSX-005, NSX-012, NSX-016 | **Partial — conflict export acknowledgement and attachment metadata manifest implemented and browser-qualified; binary archive/restore, cross-store transaction and orphan cleanup remain** |
| NSX-030 | Enforce separation of personal assignment planning status from provider-owned Submitted/Graded status in schema, domain APIs and UI | NS-DATA-008; NS-SCOPE-001 | NSX-008, NSX-020 | **Partial — type/runtime guard and immutable provider-state check passed CI; full persisted field split and migration remain** |
| NSX-031 | Reconcile canonical requirement identifiers, aliases and cross-document references | NS-GOV-001/003/004; approved unique-ID traceability rule | NSX-017 | **Complete — 61 canonical requirement rows, 61 unique IDs, zero duplicates; 29 Markdown files scanned with no dangling old/new ID references** |

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

#### NSX-029 — Cross-store attachment lifecycle and recovery
- **Work:** Define and implement a safe lifecycle for attachment Blobs in IndexedDB and metadata in localStorage. Cover attach, detach, assignment delete, reset, backup, restore, conflict export, quota failure, transaction abort and orphan cleanup.
- **Systems/files:** `apps/web/src/domain/assignment-artifact-storage.ts`, `academic-repository.ts`, `App.tsx`, Settings/backup UI and domain/E2E tests.
- **Current evidence:** JSON backups and conflict bundles exclude artifact bytes. The conflict bundle now includes a local/saved attachment metadata manifest; the UI requires the user to acknowledge saving the bundle and any needed files before clearing conflicts. Attach writes Blob before snapshot metadata; import/reset/delete span two stores and use best-effort deletion. No cross-store transaction, portable binary archive or orphan scanner exists.
- **Deliverables:** Attachment manifest/archive format; transactional/compensating lifecycle; orphan detection and recovery UI; explicit retention/size/quota policy; failure-injection tests.
- **Acceptance:** No user attachment is silently lost during a failed save/import/reset/delete; backups state exactly what is included; either file bytes are exported/restored or user has a verifiable separate export path; conflict records are not cleared until the recovery bundle is explicitly acknowledged.
- **Verification:** IndexedDB quota/blocked/abort tests; localStorage quota/corruption tests; interrupted attach/import/delete; missing Blob; orphan scan; backup round trip; conflict export interrupted or dismissed.
- **Status:** Partial — safe conflict export acknowledgement and metadata manifest implemented and passed run 45744014664; attachment Blob archive/restore, cross-store atomicity, orphan scan and quota policy remain open.

#### NSX-030 — Personal versus provider assignment status
- **Work:** Complete the semantic separation between a user's local planning status and any provider-owned assignment/submission state. Keep display of provider/demo Submitted/Graded records read-only; no local command may create those states.
- **Current implementation:** `PersonalAssignmentStatus` is a separate TypeScript type limited to `not_started`, `in_progress` and `missing`. `updateAssignmentStatus` accepts only that type and enforces the runtime allowlist. Assignment UI controls use the personal type; Submitted/Graded are rendered as read-only records. The stored `AcademicAssignment.status` field still contains the broader display union, so full canonical field separation/migration remains open.
- **Deliverable:** Canonical `personalStatus` field and optional provider-owned status snapshot; migration of demo/backup snapshots; explicit display/provenance rules; no submit method or action.
- **Acceptance:** Personal status updates cannot set Submitted/Graded at type or runtime; provider status cannot be changed by local actions; legacy/demo snapshots remain readable; old data migration is deterministic and reversible.
- **Verification:** Typecheck, unit tests for rejected status transitions, E2E UI tests for read-only Submitted/Graded states, snapshot migration/backup round trip.
- **Dependencies:** NSX-008, NSX-020, NS-DATA-008.
- **Status:** Partial — type/runtime guard, immutable provider-state check and domain tests passed run 45743400167/45744014664; full persisted field split and migration remain.

#### NSX-031 — Requirement identifier uniqueness and reference reconciliation
- **Work:** Audit canonical requirement tables across the approved NORTHSTAR 5.0.0 modules; preserve decision history while ensuring each requirement has one unique canonical identifier. Distinguish requirement definitions from implementation-evidence references. Reconcile all renamed/merged IDs across the execution plan, specifications, decision register and traceability table.
- **Systems/files:** REQUIREMENTS-TRACEABILITY.md; Module 1 and Module 2 planning specifications; decision register; EXECUTION-PLAN-AND-EVIDENCE-REGISTER.md; other docs/5.0.0 references.
- **Deliverables:** Canonical ID catalogue, explicit ID reconciliation ledger, updated cross-references and repeatable duplicate/dangling-reference check.
- **Acceptance:** Every canonical requirement row has exactly one ID; no duplicate canonical IDs; all references to NS-ARCH-005 and NS-QUAL-004 resolve; NS-REL-001 contains the merged release-governance requirement; implementation-evidence rows are clearly identified as references, not new requirements.
- **Verification:** Count IDs only in canonical requirement tables (before the implementation-evidence checkpoint); scan all project docs for old/new IDs; compare every execution-plan requirement reference to the canonical catalogue.
- **Evidence:** The current traceability file has 61 canonical requirement rows, 61 unique IDs and zero duplicates. Module 2 source-isolation and quality-strategy rows were assigned NS-ARCH-005 and NS-QUAL-004; the duplicate release-governance row was merged into NS-REL-001. Cross-document reference audit remains.
- **Status:** Complete — canonical table normalized and all 29 repository Markdown files scanned; no dangling cross-document references found.

#### NSX-027 — Instructure API authorization gate
- **Work:** Obtain written determination whether NORTHSTAR is a Customer-authorized User application or a third-party integration provider/subcontractor under the Instructure API Policy effective 2026-11-25. Establish whether express permission or an active Integration Tier Partnership is required; identify approved customer/tenant, developer key, scopes, registration disclosure and permitted data/actions.
- **Evidence:** Current official policy says API usage must be authorized; third-party subcontractors require their own active Integration Tier Partnership; access without a partnership or express permission is prohibited. Official docs require institution-enabled developer keys/scopes, OAuth2, Link-header pagination and rate-limit handling.
- **Deliverable:** Written institution/Customer or Instructure authorization, approved tenant/domain and developer-key scope matrix, documented OAuth flow and data/action disclosure.
- **Acceptance:** No live API request occurs until the authorization document is recorded and the approved scope matrix is reviewed. A user token or a developer key alone is not treated as policy authorization.
- **Verification:** Written evidence review; after approval only, a minimal read-only test against the authorized tenant with request/response redaction.
- **Status:** Blocked — no written authorization or tenant scope confirmation is present.

#### NSX-028 — Legacy Worker and excluded-workflow disposition
- **Work:** Reconcile the legacy Worker, bridge tests, submission client, quiz routes, discussion writes, file uploads, LTI launch and PDF/document editor against NS-SCOPE-001. Determine whether the legacy runtime remains a separately preserved/frozen product or must be disabled/decommissioned.
- **Evidence:** On the audited stabilization and current development branches, `canvas-bridge/worker.js` is byte-identical (SHA `dccb78bfc377f90ce5aba5d51ba52c129dc2aeee`) and `tests/bridge.test.mjs` is byte-identical (SHA `0163a1d7ef483c4a336867ade9a76b813aff6f75`). Tests explicitly exercise assignment submissions, quiz attempts, assignment/quiz uploads and discussion writes. `scripts/submissions.js` contains the Canvas POST client; `scripts/document-editor.js` and `scripts/document-storage.js` contain legacy document editing/storage.
- **Deliverable:** Legacy route-to-test-to-UI call graph; deployed-version evidence if separately authorized; explicit owner disposition; preservation/rollback/decommission plan.
- **Acceptance:** No 5.0 app call site reaches excluded legacy routes. Legacy runtime disposition is explicit. No Worker or legacy source change occurs without separate approval and deployment/rollback evidence.
- **Verification:** Static route/call-site/test mapping. Deployment state requires authorized Cloudflare/GitHub deployment access; static source cannot prove what is live.
- **Status:** Blocked pending owner decision. No legacy route has been disabled, deleted or redeployed.

#### NSX-007 — Official Canvas API evidence
- **Work:** For each in-scope read capability, collect current official Instructure documentation: endpoint/method/version, fields, pagination, scopes/roles, rate limits, incremental updates, version semantics, errors, conditional fields and limitations. Distinguish official docs from tenant verification.
- **Systems:** Canvas Courses, Assignments, read-only provider assignment status if necessary, Grades, Calendar, Files/Modules/Pages/Resources. No submission, quiz, discussion or document write workflows in the 5.0 target.
- **Deliverables:** Dated capability matrix with source URL, retrieval date, supported operations, scopes, constraints, evidence class and linked requirement/test IDs.
- **Acceptance:** No provider capability is asserted without official documentation; no tenant behavior is called verified without a separately authorized tenant test.
- **Verification:** Official provider documentation review and cross-check against Worker source. No writes, real credentials or tenant access.
- **Dependencies:** NSX-006.
- **Approval boundary:** Read-only public documentation research is authorized; live tenant access and any write test are not.
- **Status:** Partial — official policy/API references and initial endpoint matrix recorded; exact route mapping remains open.

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
- **Status:** Partial — deterministic initial seeding, cross-tab conflict preservation and explicit conflict-export acknowledgement passed all 13 Playwright journeys in run 45744014664; storage quota/corruption/interrupted-write and full attachment recovery matrix remain.

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
- **Status:** Partial — threat model and static source audit documented; HTTPS URL validation and unit tests passed run 45744506192; no full dynamic security audit, CSP validation, penetration test or release sign-off.

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
8. NSX-027 resolves Instructure API Policy authorization before any live provider access.
9. NSX-028 resolves legacy Worker/UI disposition before any legacy route is disabled or reused.
10. NSX-014/015 define workspace integration and migration/parity.
10. NSX-016/017 connect every requirement to acceptance and evidence.
11. NSX-018/019 complete risk review and CAI planning acceptance.
11. NSX-020 through NSX-025 continue authorized local/demo implementation and qualification in parallel where dependencies permit.
12. NSX-029 closes cross-store attachment recovery before final offline/recovery acceptance.
13. NSX-030 completes provider/personal assignment-state separation before live provider integration.
14. NSX-026 reconciles the final state.

No live provider work, migration, legacy deletion or production deployment is inserted into this sequence without a separate authorization record.

## 5. Current implementation and qualification snapshot

The development status board records the following as implemented locally: React 19/TypeScript/Vite foundation; versioned local academic snapshot; dashboard; assignment CRUD/tracking; course create/edit and hubs; calendar events; gradebook records; resources; Study Lab flashcards/spaced repetition; Review Center local drafts/heuristic feedback; simulated AI; unconfigured Canvas adapter; Midnight/Light themes; reduced motion; PWA shell; local backup/recovery. These are implementation claims from the board and source, not blanket acceptance.

The new app scope conflicts identified in NSX-020 have been corrected in source: the timed multiple-choice Study Lab attempt engine was replaced with self-guided flashcard review; the local “Turn in locally” action was removed; Submitted/Graded states are display-only; and the Canvas adapter no longer exposes `submitAssignment`. The first two browser qualification attempts exposed stale E2E expectations and a real cross-tab initial-seed race. The E2E was updated and the seed race corrected; the latest run is pending, so no browser pass is claimed. Separately, the legacy Worker and root scripts still contain real submission/quiz/document-editor code. Those files are byte-identical to the audited stabilization branch and remain untouched pending NSX-028 owner disposition.

The Review Center is a limited local writing draft/feedback surface, not a general-purpose document editor. Keep it constrained to that approved purpose.

## 6. Verification evidence log

| Evidence ID | Task | Repository ref / procedure | Result | Evidence class and limitation |
|---|---|---|---|---|
| EV-001 | NSX-001 | Repository metadata for `s0ndvyr/NORTHSTAR-2.0` | Public repo; default branch `main`; write permission available | Repository metadata |
| EV-002 | NSX-001 | Branch API for Phase 0, stabilization and development branches | Exact heads recorded in Section 2 | Live Git ref lookup at checkpoint |
| EV-003 | NSX-001 | Compare `df042730...` to Phase 0 head | 62 ahead, 0 behind | Git ancestry evidence |
| EV-004 | NSX-001 | Compare Phase 0 head to development head | 447 ahead, 0 behind | Git ancestry evidence at current branch head |
| EV-005 | NSX-002 | `IMPLEMENTATION-READINESS-AND-TRANSITION-PLAN.md` §10; README implementation transition; traceability authorization notes | Separate bounded local/demo implementation authorization exists; Phase 0 itself did not authorize implementation | Repository decision record; not a transcript citation |
| EV-006 | NSX-004 | Recursive Git tree at Phase 0 head | 78 tracked files; 20 files under `docs/5.0.0/` | Tree inventory only; no complete call-site map |
| EV-007 | NSX-004 | Recursive Git tree at development head | 110 tracked files; `apps/web/` contains app, domain, PWA, tests and build config | Tree inventory only |
| EV-008 | NSX-020 | Commits `2f29f7e5...`, `8bc90367...`, `a8d780d3...`, `8b38a3f0...` | Removed timed quiz/attempt UI, local turn-in affordance and Canvas `submitAssignment` contract; Study Lab concepts now derive from flashcards | Source diff evidence; current CI qualification still pending |
| EV-009 | NSX-021/022 | GitHub Actions run `45695594885`; job `139492079926` logs | Run completed `success`; 17 workflow steps succeeded; domain tests: 3 files / 51 tests passed; Playwright: 13 tests passed in 19.1s | Automated CI evidence for commit `4fc4e478...` only; does not qualify later code changes, physical iPad Safari, live provider or production. |
| EV-010 | NSX-001/020 | Commit `4fc4e478...` diff | Only `apps/web/vite.config.ts` changed; chunk warning limit set to 650 | Commit diff |
| EV-011 | NSX-001 | Current development head cbde2e39...; branch API and compare against Phase 0 | Current dev head; 476 commits ahead of Phase 0, 0 behind; latest app code checkpoint d6622c8d... with documentation-only commits after it | Git ref and ancestry evidence |

| EV-012 | NSX-003/020 | Decision register, README, traceability and architecture addenda; commits 46807747..., 4f38ce73..., cc85e5f4..., 956390fe... | Current product boundary recorded: academic workspaces/course editor retained; native quizzes, submissions and document editor excluded; legacy source preserved | Repository decision/document evidence; no legacy retirement |
| EV-013 | NSX-006/028 | canvas-bridge/worker.js, tests/bridge.test.mjs, scripts/submissions.js, scripts/document-editor.js, scripts/document-storage.js | Legacy Worker and UI retain old write/quiz/upload/document capabilities; Worker and test files match audited stabilization blobs | Static source evidence; no live Worker recheck |
| EV-014 | NSX-005/012/029 | SOURCE-TREE-AND-PERSISTENCE-INVENTORY.md; academic-repository.ts, assignment-artifact-storage.ts, App.tsx, public/sw.js, legacy vault.js/document-storage.js/premium.js/studentvue.js | Mapped new and legacy localStorage/IndexedDB/cache keys, backup exclusions and cross-store recovery risks | Static source inventory; physical Safari/quota testing not done |
| EV-015 | NSX-007/027 | Instructure API Policy effective 2026-11-25 and official Canvas Developer Docs; CANVAS-CAPABILITY-AND-AUTHORITY-MATRIX.md | Policy authorization/partnership gate, OAuth/developer key, pagination and rate-limit mechanics documented | Public official documentation; no live tenant request |
| EV-016 | NSX-008/009 | CANONICAL-ACADEMIC-DATA-MODEL.md Sections 9–11 | Detailed logical schema, field authority, relationships, nullability, provenance, validation and lifecycle rules documented | Planning deliverable; not a physical schema or migration |
| EV-017 | NSX-011 | CROSS-APPLICATION-DATA-CONTRACTS-AND-STATE-MACHINES.md Sections 13–15 | Read-only provider sync states, pagination/checkpoint, rate-limit/error handling and field-level conflict rules specified | Planning deliverable; no provider sync service implemented |
| EV-018 | NSX-022 | Commits ffcb6d83..., a3ab1f75..., 3a87cca2..., 67c6403e...; run 45743400167 | Deterministic local-day demo seed, synchronous initial snapshot persistence, invalid snapshot preservation and serialized-shape preservation implemented; 13 browser journeys passed | Source diff and automated browser evidence |
| EV-019 | NSX-030 | Commits 7613f405..., e67b448a..., e1e20296..., bebb2245..., 470641fd..., 75c4c99c..., 57c4e5d8...; run 45743400167 | Added PersonalAssignmentStatus type, personal-only updater, UI typing and runtime guard preventing updates to Submitted/Graded records | Source diff and passing typecheck/domain-test evidence; full persisted field split remains |
| EV-020 | NSX-028 | release.json; Pages workflow run 45410896624; Worker source blob SHA dccb78b... | Manifest records Pages preview 4.4.8.3.1, production 4.4.7.5 and Worker 0.4.22; workflow success; current Worker file matches recorded deployment source blob | Repository release record and workflow metadata; live HTTP/Cloudflare state not rechecked |
| EV-021 | NSX-022 | GitHub Actions run 45741495661 on commit 54d122c... | 12/13 browser tests passed; cross-tab test failed because the two tabs could seed different time-varying revision-1 demo snapshots, creating a false conflict and blocking later persistence | Failure captured from workflow logs; root cause corrected in source commits EV-018 |
| EV-022 | NSX-030/020 | GitHub Actions run 45742347520 on commit 470641f... | Typecheck and production dependency audit passed; domain tests 48 passed / 2 failed because assertions still expected local Submitted transitions; build/browser steps skipped | Failure captured; fixture/expectations and runtime provider-state guard corrected in 75c4c99... / 57c4e5d... |
| EV-023 | NSX-030 | GitHub Actions run 45743250191 on commit 57c4e5d... | Typecheck failed because test fixtures referenced AcademicSnapshot without importing its type; subsequent correction committed as 58f0c139... | Failure captured; correction committed; rerun in progress |
| EV-024 | NSX-020/022/030 | GitHub Actions run 45743400167 on commit 58f0c139...; job 139653581983 | 17 steps succeeded; TypeScript typecheck, production dependency audit, 3 domain test files / 50 tests, Vite production build and 13 Playwright journeys passed (17.4s) | Automated qualification passed for this code commit; documentation-only commits follow |
| EV-025 | NSX-022/029/025 | Commits eb83e57..., a0618d0..., 1dde510..., 9dfd287..., 4aaa2984...; GitHub Actions run 45744014664, job 139655583227 | Conflict bundle now includes local/saved attachment metadata manifest; conflict records remain until user explicitly confirms bundle/file preservation; added clear-all operation, unit test and two-tab browser assertion. Run passed: 17 steps, 50 domain tests across 3 files, production build and 13 Playwright journeys (16.6s) | Automated qualification passed for code commit 4aaa2984; binary attachment bytes remain excluded |
| EV-026 | NSX-025 | Commits creating apps/web/src/domain/external-links.ts and external-links.test.ts plus App.tsx update `d6622c8d...`; run 45744506192, job 139657201264 | Both external resource link renderers accept HTTPS URLs only, reject credentials and unsafe schemes, and set rel=noopener noreferrer; tests cover valid HTTPS and rejected HTTP/JavaScript/data/file/relative/credential-bearing URLs | 17 workflow steps succeeded; 4 domain test files / 61 tests passed; production build and 13 Playwright journeys passed (19.6s) |
| EV-027 | NSX-017/031 | REQUIREMENTS-TRACEABILITY.md canonical rows before Implementation evidence checkpoint; 29 Markdown files scanned across repository | 61 canonical requirement rows, 61 unique IDs, 0 duplicates. Module 2 source isolation rekeyed to NS-ARCH-005; quality strategy rekeyed to NS-QUAL-004; duplicate release-governance row merged into NS-REL-001. No dangling old/new ID references found; implementation evidence rows are intentional references. | Static traceability verification complete; broader decision/status reconciliation remains in NSX-017 |

### 6.1 Latest successful baseline CI evidence

Workflow: https://github.com/s0ndvyr/NORTHSTAR-2.0/actions/runs/45695594885  
Head: 4fc4e4788710c771c6490c9514a70f1c2ca51674  
Conclusion: success  
Verified log output: 17 workflow steps succeeded; Vitest reported 3 files / 51 tests passed; Playwright reported 13 tests passed in 19.1s. This qualifies only the 4fc checkpoint, not the later scope/recovery changes.

### 6.2 Current qualification sequence

- Run 45741495661: 12/13 browser tests passed; the cross-tab persistence journey exposed the time-varying initial-seed race. Corrected by deterministic local-day demo timestamps and synchronous first-snapshot persistence.
- Run 45742347520: typecheck and dependency audit passed; domain tests 48 passed / 2 failed because assertions still expected local Submitted status transitions. Corrected by keeping provider-owned Submitted/Graded records immutable and updating fixtures/expectations.
- Run 45743250191: typecheck failed because the new test fixture omitted the AcademicSnapshot type import. Corrected in commit 58f0c139.
- Run 45743400167: completed successfully on code checkpoint 58f0c139; 17 workflow steps, 50 domain tests and 13 Playwright journeys passed.
- Run 45744014664: completed successfully on recovery code checkpoint 4aaa2984; 17 workflow steps, 50 domain tests and 13 Playwright journeys passed. This verifies the explicit conflict-export acknowledgement flow and attachment metadata manifest; binary file backup remains excluded. The current branch head is two documentation-only commits ahead.
- Run 45744506192: HTTPS external-link validation change (commit d6622c8d) passed all 17 workflow steps: typecheck, production dependency audit, 4 domain test files / 61 tests, production build and 13 Playwright journeys (19.6s).


## 7. Explicit blockers and approval gates

| Work | Blocker / approval needed | Work that can continue now |
|---|---|---|
| Physical iPad Safari | Actual iPad/Safari test session and device/OS evidence | Automated browser checks and manual test protocol |
| Live Canvas tenant verification | Explicit owner authorization for named tenant, account role, scopes and exact read-only test; written confirmation of current Instructure API Policy applicability/permission (NSX-027) | Official public API documentation research and mock contract tests |
| Canvas/provider writes | Not in current product scope for submissions; any other consequential provider write requires new explicit approval | Read-only capability planning and local/demo UI |
| AI provider connection | Separate explicit authorization, provider/account and secret-handling review | Provider-neutral simulation and service contract planning |
| User-data migration/import | Separate explicit authorization plus verified backup/archive, mapping and rollback | Static source mapping, fixtures and migration design |
| Legacy source deletion/retirement or disabling legacy Worker write routes | Separate explicit authorization plus parity, backup and rollback evidence; explicit decision whether legacy remains frozen or is decommissioned | Inventory, route/test mapping and scope separation |
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

1. Preserve the qualified HTTPS URL validation checkpoint d6622c8d / run 45744506192; continue CSP/response-header design, dynamic security tests and broader recovery qualification under NSX-022/025/029.
2. Complete NSX-022's offline/recovery matrix: storage quota/corruption, interrupted writes, cross-tab competing edits, reload recovery and safe conflict export acknowledgement.
3. Complete NSX-029 planning for attachment Blob/metadata lifecycle, portable backup/restore, conflict attachment manifest, orphan cleanup and quota behavior. Do not implement a new archive/restore workflow until its scope and data-loss behavior are approved.
4. Complete NSX-030 canonical personal/provider status separation in the persisted model and migration contract; current type/runtime guard is only an intermediate control.
5. Continue NSX-004/005/006/015/016/017: exhaustive source/dependency/consumer graph, persistence call-site lifecycle, route-to-test-to-UI map, legacy capability parity, decision supersession reconciliation and requirement-linked acceptance matrix. NSX-031 ID normalization is complete.
6. Complete NSX-014 workspace integration contracts and NSX-017 requirement/decision reconciliation; prepare the final Cross-Application Intelligence planning review (NSX-019).
7. Complete accessibility, security/privacy, operational and release-readiness reviews (NSX-021/025), then document physical iPad Safari requirements (NSX-023) for owner-side device execution.
8. Keep NSX-027 blocked until written Customer/Instructure authorization and approved tenant/scopes exist. Keep NSX-028 blocked until the owner decides legacy runtime disposition and separately authorizes any deployment/retirement.
9. Finish NSX-026 repository/document reconciliation only after all authorized work and evidence are complete.

**Current honest status:** NORTHSTAR 5.0.0 has an implemented local/demo academic application foundation and a substantial approved planning/specification baseline. The current owner scope is recorded and the new app's timed quiz, turn-in and Canvas submit affordances have been removed. Cross-tab initialization, personal/provider status protections and explicit conflict-export acknowledgement passed full CI/browser qualification on code commit 4aaa2984 (run 45744014664). A subsequent HTTPS external-link validation change passed full CI/browser qualification on code commit d6622c8d (run 45744506192). The current branch head is six documentation-only commits ahead. CSP, dynamic security testing, binary attachment backup, broader recovery, accessibility, iPad and release gates remain. Binary attachment backup, broader recovery, accessibility, iPad, security and release gates remain. Phase 0 is closed. The 5.0.1 planning specification is approved; Cross-Application Intelligence final planning review remains pending. Live provider integration, data migration, legacy retirement, physical iPad acceptance and production release are not claimed.
