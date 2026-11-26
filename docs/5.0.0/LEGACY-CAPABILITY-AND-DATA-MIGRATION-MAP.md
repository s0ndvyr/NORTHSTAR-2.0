# NORTHSTAR 5.0 — Legacy Capability and Data Migration Map

**Integrated master:** [Cross-Application Data Architecture](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md)  
**Workstream:** Engineering Foundation / Cross-Application Intelligence  
**Status:** Detailed planning specification — integrated; complete source-level inventory and mapping outstanding  
**Decision sources:** ADR-5-002/007; CAI-DEC-01/03/04; NS-DATA-003; NS-CAI-001/005/010  
**Authorization:** Planning only. No source modification, deletion, migration, import/export or runtime behavior change authorized.

## 1. Purpose
Preserve valuable existing NORTHSTAR workflows while replacing accidental coupling and duplicated state with explicit domain services. Migration is capability-led, not file-led. Existing files and behaviors remain until dependencies, data ownership, replacement parity and rollback are evidenced.

## 2. Inventory domains and preservation requirements

| Legacy capability area | Canonical destination | Preservation concern | Required mapping evidence |
|---|---|---|---|
| Dashboard summaries/priorities | Dashboard projections over Course/Assignment/GradeItem/Event | Rules, expectations, hidden filters | Inputs, formulas, sorting, empty/error states |
| Courses and terms | AcademicTerm/Course | Provider identity, local preferences | Source fields, IDs, relationships, archive behavior |
| Assignment workflows | Assignment/Submission/PersonalNote/FileAsset | Drafts, external handoffs, status distinctions | Lifecycle, save/submit semantics, external links |
| Calendar and due dates | AcademicEvent plus Assignment due-date projection | Duplicate deadlines, timezone, recurrence | Event source, timezone, update/delete propagation |
| Gradebook and feedback | GradeItem and provenance | Official vs projected grade confusion | Weighting assumptions, hidden/provisional grades |
| Materials and downloads | Resource/FileAsset | File bytes, bookmarks, metadata, references | Storage, checksum, ownership, retention |
| Document Studio/PDF/annotation/export | FileAsset and document workspace services | Annotations, autosave, export, recovery | Formats, annotation persistence, export parity |
| Study Lab/flashcards/practice | StudyArtifact/StudySession | User content and learning history | Content model, progress, scheduling rules |
| AI Workspace/Copilot | Provider-neutral AI boundary and approval service | Consent, context, draft history | Context sources, permissions, consequential actions |
| Canvas integration/worker | Canvas adapter and secure server boundary | Credentials, return-context hardening, official state | Call sites, scopes, handoffs, validation, secrets |
| Notifications/alerts | Notification domain over typed events | Coverage, deduplication, preferences | Trigger matrix, delivery and read states |
| Diagnostics/release history | Support surfaces and docs | Supportability and audit evidence | Access controls, operational dependencies |

## 3. Data migration mapping template
For every persisted object/browser-storage key record: legacy key/table/file and format; owning workflow and code read/write call sites; entity/field transformation; stable identity and duplicate detection; source authority/provenance; null/default/invalid handling; attachment relationships/checksums; user-authored vs provider-owned classification; version/checkpoint; conflict/rollback behavior; retention/deletion; and verification fixture/criteria.

No legacy value is discarded as “duplicate” until semantic equivalence is demonstrated.

## 4. Migration stages
1. Inventory: static search of storage keys, API calls, routes, forms, file handlers and event listeners.
2. Classify: map each behavior/data field to owner, source authority, sensitivity and lifecycle.
3. Reconcile: identify duplicate identities, conflicts and orphaned files; reports only.
4. Design: versioned transformations, checkpoints, idempotency and rollback.
5. Dry-run plan: use copies/fixtures in a non-production environment only after separate implementation/test authorization.
6. Parity qualification: compare counts, relationships, checksums, workflow outcomes and visible behavior.
7. Controlled cutover: explicit approval, backup/restore evidence, monitoring and rollback.
8. Retirement: remove legacy paths only after replacement acceptance and dependency proof.

## 5. Non-negotiable preservation set
Until separately verified and accepted: Canvas worker/security boundary; assignment routing/submission; external handoffs and return-context validation; document persistence, annotation, PDF export and recovery; grade/course data; file downloads/references; autosave/drafts; user-created study materials; regression tests.

## 6. Retirement criteria
A candidate can be retired only when all callers/data dependencies are mapped; unique behavior/data is migrated or explicitly deprecated by user choice; replacement meets approved criteria; automated/manual regression evidence exists; backup/restore and rollback are proven; no external handoff/security boundary/file reference is orphaned; and the change is isolated, reviewable and explicitly authorized.

## 7. Known retirement candidates (planning only)
Direct provider-key workflows; optional StudentVUE import; duplicate Copilot/autopilot controls; duplicate alert surfaces; runtime release-history UI; developer diagnostics in student navigation; overlapping CSS; monolithic JavaScript; duplicate/legacy documentation. These are candidates for analysis, not approved deletions.

## 8. Evidence required before migration approval
Complete inventory, source-to-target mapping, data classification, transformation catalogue, representative fixtures, reconciliation report, error handling, backup/restore rehearsal, parity test plan, cutover/rollback runbook and user acceptance criteria. The current source audit is static and does not establish runtime behavior or data completeness.

**Disposition:** Mapping framework drafted; actual legacy inventory and migration execution remain outstanding.



## 9. Current product-scope disposition — 2026-11-25

The following legacy capabilities must be mapped and preserved as legacy source, but are excluded from the target NORTHSTAR 5.0 application by NS-SCOPE-001:
- Canvas assignment submission, upload, re-submit and receipt flows;
- Classic/New Quizzes question/attempt/answer/flag/score flows;
- discussion posting/reply/edit workflows;
- PDF/document editor and document-draft editing suite;
- any provider write operation that would make NORTHSTAR a second source of truth.

Target 5.0 equivalents are organizer/intelligence capabilities only: assignment tracking and personal planning, external Canvas handoff, read-only provider status when authorized, course workspaces/editor for personal NORTHSTAR metadata, calendar, gradebook insights, resources, flashcards/spaced repetition/study guides, limited writing feedback and simulated AI.

Legacy root files, Worker routes, tests and release records are not deleted or disabled by this map. NSX-028 requires an explicit owner decision whether the 4.4.x legacy runtime remains a separately frozen product or is deactivated/decommissioned. Any migration/retirement must first complete the source-to-target mapping, preserve user data, pass parity tests, produce a backup and rollback plan, and receive separate authorization.



## 10. Authorization status clarification

This map is an inventory and migration-planning artifact. The bounded local/demo implementation authorization does not authorize legacy data migration, source deletion, Worker route disablement, production deployment or destructive cleanup. NSX-028 and the migration/release gates remain mandatory.




## 11. Current source-to-target and legacy Worker route evidence — 2026-11-26

This is a static repository mapping. It does not establish current live Worker deployment, target-tenant behavior or migration readiness.

### 11.1 Legacy source call-site map

| Capability | Main legacy source/call sites | Persistence / provider boundary | 5.0 target disposition |
|---|---|---|---|
| Canvas course/assignment/grade sync | scripts/premium.js API helper (around line 177); course/assignment/group/quiz sync around lines 1860–1879; assignment detail/submission reads around lines 1528–1557 | Canvas adapter via configured bridge and browser-supplied bearer token; local snapshot/cache in encrypted vault key canvas-snapshot | Read-only course/assignment/grade insights only after separate provider authorization; no provider writes |
| Assignment submission | scripts/submissions.js send() builds POST to /api/v1/courses/{course}/assignments/{assignment}/submissions; scripts/premium.js submission UI/receipt reconciliation | Browser-to-Worker POST with bearer token; uncertain-outcome markers and staged file metadata in legacy localStorage | Excluded; Canvas owns submission and receipt workflow |
| Assignment file upload | Worker uploadCanvasFile(): Canvas upload-init POST, signed-storage POST without bearer token, authenticated create_success finalization GET | Worker validates signed storage host/finalization URL; 25 MB request cap; bytes are transferred through browser/Worker upload path | Excluded; external Canvas workflow only |
| Classic/New Quizzes | scripts/premium.js quiz metadata/attempt paths; Worker GET quiz details/questions/items and POST start/answers/complete, PUT flag/unflag | Worker allowlist and payload validation; current-tab sessionStorage attempt context | Excluded; at most external Canvas link |
| Discussions | scripts/premium.js around lines 910–1071 reads topics/entries/replies, posts entries/replies and edits entries | Worker GET/POST/PUT routes; local draft and uncertain-outcome markers | Excluded; no discussion mirror or posting workflow |
| External tools/LTI | scripts/assignment-execution.js classifies provider launch; scripts/external-navigation.js validates HTTPS and performs top-level navigation; Worker sessionless_launch and login/session_token paths | Browser top-level navigation and temporary Canvas session URL; native iOS WKWebView supports approved host/protocol/port messages | External handoff only where the provider URL is already exposed and safe; no new LTI signing/launch proxy in 5.0 without separate approval |
| File/PDF annotation | scripts/assignment-room.js, scripts/document-storage.js | northstar-document-studio IndexedDB documents/drafts plus localStorage PDF markup fallback; Canvas metadata/public_url read through Worker | Native document editor excluded; personal resources/links may be organized without replacing Canvas document tools |
| StudentVUE | scripts/studentvue.js and premium.js vault migration | Legacy localStorage import northstar_studentvue_grades_v1; vault key studentvue-grades | Optional future read/import only after data classification and explicit source authorization; not a live 5.0 connector |
| Gemini/AI | scripts/ai.js, premium.js and app.js | Encrypted legacy vault key gemini-api-key; localStorage model preference | 5.0 uses local simulation; no real provider credential or request |
| Release diagnostics | scripts/release.js and developer diagnostics | northstar-last-seen-release localStorage marker and legacy UI | Operational evidence may be retained in docs; student-facing legacy diagnostics are not automatically carried forward |

### 11.2 Legacy Worker route/method inventory

The current source file is canvas-bridge/worker.js, build marker 0.4.22 (4.4.8.2), configured for origin https://s0ndvyr.github.io and Canvas origin https://nnps.instructure.com. These are source constants; live deployment was not checked.

| Method / route family | Observed purpose | Target 5.0 status |
|---|---|---|
| GET /api/v1/users/self, /courses, /courses/{id}, assignments, assignment_groups, submissions/{id}, quizzes, quiz questions/submissions/time, New Quiz details/items | Current-user, course, assignment, grade/status and quiz reads | Read-only subset may be planned; quiz data/attempt surfaces excluded |
| GET /courses/{id}/files/{id}, /files/{id}/public_url | File metadata and authenticated public preview URL | Resource metadata/links only after separate file-access review |
| GET /courses/{id}/discussion_topics, entries, entry_list, replies | Discussion content reads | Excluded |
| GET /login/session_token and /external_tools/sessionless_launch | Temporary Canvas session and assignment-assessment LTI handoff | External handoff only; no 5.0 proxy/signing implementation |
| POST /courses/{id}/assignments/{id}/submissions and upload-init routes | Assignment submission and file upload | Excluded |
| POST /courses/{id}/quizzes/{id}/submissions, quiz file upload, /quiz_submissions/{id}/questions, /complete | Quiz start, answer, upload and completion | Excluded |
| PUT /quiz_submissions/{id}/questions/{id}/flag or unflag | Quiz review flags | Excluded |
| POST /courses/{id}/discussion_topics/{id}/entries and /replies; PUT /entries/{id} | Discussion post/reply/edit | Excluded |
| POST action=upload-file | Multi-step Canvas signed upload and finalization for assignment/quiz files | Excluded |

The Worker has no DELETE method. It enforces an Origin allowlist, bearer-token format, Canvas-origin path allowlist, query restrictions on writes, JSON/body limits, route-specific payload validation, no-store response headers, nosniff and manual redirect handling. It forwards the caller's bearer token to Canvas API requests; it does not persist the token. For signed storage upload, the Worker verifies the storage host and does not send the Canvas bearer token to the storage host.

**Security interpretation:** CORS/Origin restrictions are not authentication. The bearer token is supplied by the legacy browser client and forwarded by the Worker; the Worker is not a 5.0 backend-for-frontend, tenant authorization service or secret vault. The Worker still exposes excluded write routes. Do not reuse or call it from the 5.0 application.

### 11.3 Worker test evidence and limits

- tests/bridge.test.mjs loads the Worker source, substitutes a test Canvas origin and mocks global fetch. It checks allowlisted read paths, rejected origins/hosts/arbitrary writes, payload validation, session-token return paths, LTI launch parameters, discussion and quiz writes, upload-host/finalization checks, bearer-token non-disclosure to signed storage and file-download restrictions.
- Root package.json includes tests/bridge.test.mjs in npm run test:unit and npm test. The 5.0 web qualification workflow evidence is a separate apps/web pipeline; the run logs reviewed for 45744506192 do not show the legacy Worker test as part of that workflow.
- No real Canvas tenant request, deployed Worker request, OAuth scope verification or external LTI launch was performed in this workstream.

### 11.4 Migration disposition

- Legacy source and tests remain preserved; no data import, transformation, migration, deletion, Worker disablement or runtime cutover was performed.
- The source-to-target map is now materially expanded but is not a completed per-field/per-callsite migration matrix. Dynamic key writer/reader/expiry paths, all Worker callers, native iOS build behavior and user-data parity fixtures remain open under NSX-004/006/015/016/028.
- NSX-028 remains blocked pending the owner's decision on whether the legacy 4.4.x runtime is frozen separately or deactivated. A separate approval is required before any deactivation, deployment or data migration.
