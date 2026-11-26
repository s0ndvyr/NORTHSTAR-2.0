# NORTHSTAR 5.0 — Source-Tree and Persistence Inventory Checkpoint

**Review date:** 2026-11-25  
**Review mode:** Static repository inspection only  
**Repository:** `s0ndvyr/NORTHSTAR-2.0`  
**Review ref:** `northstar-5.0.0-phase-0-setup`  
**Underlying source baseline:** The setup branch is based on the previously audited development source. This checkpoint inspects the branch's visible tree; it does not yet prove every file is identical to the earlier audited branch or that every runtime path is reachable.

## 1. Scope and evidence classification

This is an expanded inventory checkpoint, not a completed source audit. Directory listings are direct repository evidence. File-purpose notes are based on names and selected source inspection. A file is not considered unused merely because no consumer has yet been found. No code was executed, tests were not run, and no live browser, Canvas tenant, Cloudflare deployment, or iPad was accessed.

Evidence labels:
- **Observed:** directly present in the reviewed tree or source.
- **Inspected:** selected file contents were read statically.
- **Inferred:** likely responsibility from filename or surrounding references; requires call-site confirmation.
- **Open:** exact behavior, dependencies, storage keys, or runtime reachability still needs exhaustive tracing.

## 2. Repository tree inventory

### Root entries observed
`.github/`, `.gitignore`, `NORTHSTAR-0.4-ENGINEERING-LOG.md`, `README.md`, `STUDENTVUE-INTEGRATION-RESEARCH.md`, `VERSION`, `canvas-bridge/`, `docs/`, `index.html`, `manifest.json`, `native/`, `package.json`, `release.json`, `scripts/`, `styles/`, `tests/`, and `wrangler.jsonc`.

### Runtime scripts observed
| Path | Initial responsibility / evidence | Inventory status |
|---|---|---|
| `scripts/ai.js` | AI/Copilot client workflow | Listed; call sites and data flow open |
| `scripts/app.js` | Main application boot, views and shared UI behavior | Listed; full dependency map open |
| `scripts/assignment-execution.js` | Assignment and resource classification; submission/provider workflow metadata | Inspected; consumers and all branches open |
| `scripts/assignment-room.js` | Assignment deep-link/overlay navigation and PDF/document workspace | Inspected; storage and event call sites open |
| `scripts/canvas-debug.js` | Canvas/bridge diagnostics | Listed; logging/privacy review open |
| `scripts/canvas-sync.js` | Canvas synchronization and academic data refresh | Listed; all endpoints/cursors/call sites open |
| `scripts/document-editor.js` | Document editor and annotation behavior | Listed; full persistence lineage open |
| `scripts/document-export.js` | Document/PDF export | Listed; artifact lineage open |
| `scripts/document-storage.js` | IndexedDB document and draft persistence | Inspected; store schema described below |
| `scripts/external-navigation.js` | Validated top-level provider navigation and return-context guard | Inspected |
| `scripts/grades.js` | Grade calculations and display | Listed; source authority/calculation lineage open |
| `scripts/premium.js` | Premium UI behavior | Listed; consumers and duplicate responsibilities open |
| `scripts/release.js` | Release/version UI behavior | Listed; build/release coupling open |
| `scripts/studentvue.js` | StudentVUE import workflow | Listed; encrypted migration and data lifecycle open |
| `scripts/submissions.js` | Canvas submission payload/transport and receipt verification | Inspected |
| `scripts/vault.js` | Encrypted credential/device vault | Inspected |
| `scripts/workspace.js` | Workspace-level orchestration | Listed; consumers and ownership open |

### Styles observed
- `styles/assignment-room.css`
- `styles/main.css`
- `styles/northstar-premium.css`
- `styles/release-notes.css`

All four are loaded by `index.html`; selector overlap, cascade ownership, token duplication and route-specific dependencies remain to be mapped.

### Tests observed
- `tests/ai.test.mjs`
- `tests/assignment-execution.test.mjs`
- `tests/assignment-room-fallback.test.mjs`
- `tests/boot.test.mjs`
- `tests/bridge.test.mjs`
- `tests/canvas-sync.test.mjs`
- `tests/debug.test.mjs`
- `tests/document-editor.test.mjs`
- `tests/document-export.test.mjs`
- `tests/document-storage.test.mjs`
- `tests/external-navigation.test.mjs`
- `tests/grades.test.mjs`
- `tests/phase3-integration.test.mjs`
- `tests/phase4-completion.test.mjs`
- `tests/release.test.mjs`
- `tests/studentvue.test.mjs`
- `tests/submissions.test.mjs`
- `tests/workspace.test.mjs`

These filenames identify existing regression assets only. They were not executed during this review.

### Other observed paths
- `.github/workflows/` — workflow directory observed; workflow files and triggers still to enumerate.
- `canvas-bridge/worker.js` — single Worker source file observed.
- `docs/PHASE3-ASSIGNMENT-ARCHITECTURE.md`, `docs/PHASE4-CAPABILITY-AND-ACCEPTANCE.md`, and `docs/5.0.0/` — planning/acceptance documentation.
- `native/ios/NorthstarSecureContentPresenter.swift` and `native/ios/README.md` — native iOS secure-content presentation path.
- `index.html` — monolithic HTML shell, navigation/views and ordered script/style loading.
- `manifest.json` — PWA install metadata.
- `package.json` — npm scripts and development dependencies.
- `release.json` and `VERSION` — release metadata.
- `wrangler.jsonc` — Cloudflare Wrangler configuration pointing to `canvas-bridge/worker.js`.
- `STUDENTVUE-INTEGRATION-RESEARCH.md` and `NORTHSTAR-0.4-ENGINEERING-LOG.md` — historical integration and engineering evidence; unique decisions and links must be reconciled before archival.

## 3. Persistence systems directly observed

### IndexedDB database: `northstar-secure-vault`
Inspected in `scripts/vault.js`.
- Database version: `1`.
- Object store: `secrets`.
- The store is created on upgrade if absent.
- A non-extractable AES-GCM-256 device key is stored under the key `__device_key__`.
- Named values are JSON-serialized, encrypted with AES-GCM and a fresh 12-byte IV, then stored as `{ iv, cipher }`.
- API exposed as `NorthstarVault.get/set/remove`.
- README evidence describes optional remembered Canvas/Gemini credentials. Exact logical key names, callers, deletion behavior, migration paths and secret scope still need full call-site enumeration.
- Security limitation explicitly noted in source: encryption at rest is not protection against same-origin XSS or malicious same-origin scripts.

### IndexedDB database: `northstar-document-studio`
Inspected in `scripts/document-storage.js`.
- Database version: `1`.
- Object stores: `documents` and `drafts`, both keyed by `key`.
- `documents` stores PDF source bytes, identity, filename, content type, size and update time.
- `drafts` stores annotation data, page, scale, identity and update time.
- Source PDF validation requires a PDF header and enforces a 100 MB per-document limit in this module.
- API includes document/draft read, save and delete operations; database close and error-state reporting.
- Assignment-room uses versioned key families including `northstar_pdf_markup_v2_<assignment>_<file>`, a v1 compatibility key, and a corresponding `_pdf_identity_v1_` key. Exact read/write/migration/cleanup paths require full call-site tracing.

### Browser storage: sessionStorage and localStorage
The README states quiz-attempt validation details are held in `sessionStorage` for the current tab session and are not stored in localStorage or the long-lived credential vault. On session loss, the existing Canvas attempt is the safe fallback; NORTHSTAR must not create a duplicate attempt.
The assignment-room source writes PDF identity metadata to `localStorage` and includes legacy PDF markup compatibility keys. README also describes earlier StudentVUE localStorage imports being migrated into the encrypted vault and removed from plaintext storage. Exact key inventory, current reachability, migration idempotency, and cleanup confirmation remain open.

### Storage inventory still required
A repository-wide literal and dynamic-key audit must enumerate every:
- `localStorage` get/set/remove/clear and property access;
- `sessionStorage` get/set/remove/clear and property access;
- IndexedDB open, upgrade, object-store creation, transaction, cursor, index, delete and version-change call;
- key prefix, schema version, migration, fallback, export, import, purge and recovery path;
- reader/writer pair, owning module, data class, sensitivity, retention and deletion trigger.

Dynamic keys must be derived from call sites, not guessed from string search alone. The inventory must include test fixtures and historical compatibility readers.

## 4. Initial architecture and preservation observations

- `index.html` loads four stylesheets and a sequence of classic scripts; script order is a runtime dependency and must be captured before modularization.
- The Canvas bridge is configured with a specific allowed frontend origin and Canvas origin, exposes no-store/CORS headers, and states an invariant that it fetches Canvas API JSON rather than file-storage bytes.
- `scripts/submissions.js` documents no automatic retries, no submission persistence/logging in its transport path, and an ambiguous-outcome warning that directs the user to verify Canvas before retrying.
- `scripts/external-navigation.js` requires HTTPS, rejects embedded URL credentials, and requires saved return context before provider navigation.
- `scripts/assignment-room.js` owns assignment hash routing, browser-history restoration, overlay lifecycle, and PDF identity/draft recovery paths.
- Native iOS source and documentation must be included in the preservation map; a web-only inventory would omit secure top-level Canvas/LTI handoff behavior.
- Package metadata observed in the reviewed branch: `0.4.32`; release metadata is separate and must be reconciled before any future build/release plan.

## 5. Unresolved inventory work and next evidence passes

1. Reconcile this setup-branch tree with the exact audited migration-source commit and all intervening development commits. Record added, modified, renamed and removed paths.
2. Enumerate all `.github/workflows` files, workflow triggers, permissions, artifacts, deployment targets and branch conditions.
3. Read every script and map imports, globals, exported namespaces, DOM IDs, events, callbacks, fetch calls and cross-module consumers.
4. Enumerate all browser storage keys and both IndexedDB schemas with read/write/delete call sites and data-class classification.
5. Extract the complete Worker route matrix: method, path pattern, query/body constraints, authorization handling, upstream method/path, response handling, error status and test coverage.
6. Inventory Canvas endpoints and OAuth/token/bridge flows separately from current official Canvas documentation research and separately from target-tenant verification.
7. Inventory CDN/external script and stylesheet imports, package dependencies, font/icon sources and PDF.js loading/version behavior.
8. Map document/file workflows from Canvas metadata through fetch, local storage, annotation, export, upload and provider submission.
9. Map StudentVUE import/clear/migration paths, grade provenance and duplicate detection.
10. Map PWA cache/service-worker behavior, install/update flow, offline navigation, cache purge and deployment invalidation. No service-worker registration was confirmed in the inspected files; this remains an explicit search task, not a claim of absence.
11. Build source-to-canonical-target mapping, capability parity scenarios, backup/restore plan, rollback conditions and retirement gates.
12. Reconcile every finding to requirements and risks; mark unknowns as open rather than absent.

## 6. Planning disposition

This checkpoint expands the observed source-tree and persistence inventory and identifies two IndexedDB databases with three object stores in total, plus browser-storage key families requiring exhaustive tracing. It does not claim the full source inventory, storage inventory, Worker route catalogue, Canvas endpoint research or migration map is complete.

**No application source files were modified. No dependencies were installed. No tests or builds were run. No Canvas tenant, Cloudflare Worker, browser runtime or iPad was accessed. Application implementation remains unauthorized.**


## 7. Current-state addendum — 2026-11-25

The statement in Section 6 that no application files had been modified, no tests/builds had been run and application implementation remained unauthorized was accurate for the Phase 0 inventory checkpoint. It is historical and must not be read as the current development-branch state.

A later separate owner authorization permits bounded local/demo implementation and development-branch CI/build/test work; see the [Implementation Readiness and Transition Plan](IMPLEMENTATION-READINESS-AND-TRANSITION-PLAN.md), [Requirements Traceability](REQUIREMENTS-TRACEABILITY.md) and [Authorized Execution Plan and Evidence Register](EXECUTION-PLAN-AND-EVIDENCE-REGISTER.md).

The inventory itself remains an initial checkpoint, not a complete dependency/persistence map. The audited legacy Worker remains present in the development branch and is byte-identical to the stabilization branch at the inspected SHA. Its write routes and the old document-editor/submission source remain preserved pending NSX-028 owner disposition. No Worker deployment state is asserted.


## 8. Persistence and lifecycle evidence pass — 2026-11-25

This section records mechanisms identified by source inspection. It is not yet a complete call-site/consumer graph or a tested retention policy.

### 8.1 NORTHSTAR 5.0 `apps/web/` persistence

| Mechanism | Database/key | Data | Read/write behavior | Current limitations / follow-up |
|---|---|---|---|---|
| Browser localStorage | `northstar-5-academic-demo-v1` | Canonical local snapshot: term, courses, assignments, resources, flashcards, writing drafts, events, grade items and artifact metadata | `loadAcademicSnapshot` reads/validates and synchronously seeds the first snapshot when no record exists; `saveAcademicSnapshot` writes on app state changes; JSON schema version 1 | Plaintext, device/browser scoped, no cloud sync; deterministic local-day demo seed prevents cross-tab initialization conflicts; invalid/incompatible raw snapshots are preserved rather than overwritten; quota/serialization failure keeps current session state but cannot guarantee reload recovery |
| Browser localStorage | `northstar-5-academic-conflicts-v1` | Competing local/persisted snapshots, detection timestamp and conflict ID | `saveAcademicSnapshot` preserves both sides when persisted revision is same/newer; max 10 conflict records; explicit export/clear | Conflict bundle excludes IndexedDB file bytes; it now includes separate local/saved attachment metadata manifests and does not clear automatically. User must acknowledge saving the bundle and any needed files; browser download completion is not proof of durable user storage |
| Browser localStorage | `northstar-theme` | `midnight` / `light` theme | App reads at startup and writes on theme change | Non-critical preference; no cross-device sync |
| IndexedDB | `northstar-5-assignment-artifacts`, v1, store `files` | Blob, file name, MIME type, byte size and added timestamp | Save/read/delete through `assignment-artifact-storage.ts`; max 25 MB per file; metadata reference is stored in local snapshot | Blob data is not encrypted; no total-quota policy; JSON backups/conflict bundles exclude bytes; failed metadata/blob ordering can leave orphaned blobs or stale references |
| Cache Storage / service worker | `northstar-shell-v5.0.0` | `./`, `index.html`, manifest, app icon and same-origin static script/style/image/font assets | Install precaches shell; navigation is network-first with cached index fallback; static assets cache-first; only same-origin GET is handled; older `northstar-shell-*` caches removed on activation | This is shell/static-asset offline support, not provider data sync or an offline mutation queue; no external/API responses are cached |

**Observed code paths:**
- `academic-repository.ts`: `ACADEMIC_STORAGE_KEY`, `ACADEMIC_CONFLICTS_KEY`, schema validation, revision comparison, two-sided conflict snapshots, backup parse/export.
- `assignment-artifact-storage.ts`: IndexedDB v1 object store `files`, 25 MB per-file cap, transaction completion/error/abort handling.
- `App.tsx`: theme persistence; snapshot autosave; cross-tab `storage` listener; attach/download/delete/reset/import; conflict export, attachment metadata manifest, explicit save acknowledgement and reload.
- `main.tsx` registers the service worker in production; `public/sw.js` only caches the app shell/static assets.

**Important backup semantics:** `createAcademicBackup` explicitly sets `artifacts: []`; binary attachment bytes live separately in IndexedDB and are not exported. `parseAcademicBackup` restores with no artifact references. The Settings UI warns that attachments must be downloaded separately. Conflict bundles use the JSON backup helper for both snapshots and add a separate local/saved attachment metadata manifest; binary bytes remain excluded. No separate portable attachment archive exists yet.

**Observed recovery risks requiring NSX-005/012/016/022 work:**
1. Import/reset/delete flows remove IndexedDB blobs and change snapshot metadata through separate stores; there is no cross-store transaction. Failure ordering can produce orphaned blobs or metadata pointing to missing bytes.
2. Attach flow stores the Blob before snapshot metadata is saved; a failed snapshot save can orphan a Blob.
3. Delete/reset/import use `Promise.allSettled`; failures are surfaced in some UI messages, but there is no orphan scanner/reconciliation report.
4. Conflict export now leaves conflict records intact after initiating a download and requires a separate explicit user acknowledgement before clearing; the acknowledgement is user-attested, not proof the browser saved the file. The bundle includes attachment metadata but not binary bytes; files must be downloaded separately.
5. Binary files are not encrypted at rest. The academic snapshot and writing drafts are plaintext localStorage. Threat model and user-facing disclosure remain open.
6. Per-file limit is 25 MB, but total storage quota, persistence permission, eviction behavior and Safari-specific failure modes are not measured.
7. Static shell offline behavior is tested in Chromium; physical iPad Safari storage and PWA lifecycle remain unverified.

### 8.2 Legacy 4.4.x persistence mechanisms

| Mechanism | Key/database | Data and lifecycle | Evidence / limitation |
|---|---|---|---|
| localStorage JSON helper | `northstar_notes_v2` | Personal notes; read/write via `store.get/set` | `scripts/premium.js` |
| localStorage JSON helper | `northstar_periods_v1` | Academic period definitions | `scripts/premium.js` |
| localStorage JSON helper | `northstar_hidden_assignments_v1` | Hidden assignment IDs | `scripts/premium.js` |
| localStorage JSON helper | `northstar_gemini_model_v1` | Selected Gemini model | `scripts/premium.js` |
| localStorage JSON helper | `northstar_ignored_courses_v1` | Ignored course IDs | `scripts/premium.js` |
| localStorage JSON helper | `northstar_ledger_period_v1` | Selected grade-ledger period | `scripts/premium.js` |
| localStorage JSON | `northstar_studentvue_grades_v1` | User-imported StudentVUE CSV/JSON grade records | `scripts/studentvue.js`; no StudentVUE API is used |
| localStorage | `northstar-last-seen-release` | Last-seen release marker | `scripts/release.js` |
| sessionStorage | `northstar_canvas_session`, `northstar_gemini_session`, `northstar_gemini_model` | Tab/session-only credential/model migration values; removed after vault hydration | `scripts/premium.js`; old plaintext `canvas_token` and `canvas_base` are removed at boot |
| localStorage, scoped | `northstar_[preview_]draft_{localAssignmentId}` | Assignment response draft | `scripts/premium.js`; preview prefix separates preview data |
| localStorage, scoped | `northstar_[preview_]discussion_draft_v1_{courseId}_{topicId}_{slot}` | Initial/reply/edit discussion drafts | `scripts/premium.js`; slots include initial, reply ID and edit ID |
| localStorage, scoped | `northstar_[preview_]discussion_uncertain_v1_{courseId}_{topicId}` | Ambiguous discussion write marker pending provider read-back | `scripts/premium.js`; no blind retry while marker exists |
| localStorage, scoped | `northstar_[preview_]canvas_staged_uploads_v1_{courseId}_{assignmentId}_{localAssignmentId}` | Staged Canvas file IDs and metadata; expiry timestamp is validated and defaults to seven days when persisted | `scripts/premium.js`; not the binary file store |
| localStorage, scoped | `northstar_[preview_]canvas_submission_uncertain_v1_{canvasAssignmentId}_{localAssignmentId}` | Ambiguous assignment submission marker | `scripts/premium.js`; blocks repeat submission until reconciled |
| localStorage, scoped | `northstar_[preview_]external_return_v2` | Course/assignment IDs, provider label, launch time, return hash and last submission/sync state | `scripts/premium.js`; does not store launch URL or credentials |
| localStorage, scoped | `northstar_[preview_]pdf_markup_v2_{assignmentId}_{fileId}`, matching `_pdf_identity_v1`; legacy `_pdf_markup_v1` | PDF annotations and attachment identity fallback/migration | `scripts/assignment-room.js`; IndexedDB is primary for source PDF bytes and drafts |
| IndexedDB | `northstar-secure-vault`, v1, store `secrets` | Non-extractable AES-GCM device key at `__device_key__`; encrypted `canvas-credentials`, `gemini-api-key`, and cached `canvas-snapshot` | `scripts/vault.js`, `scripts/premium.js`, `scripts/app.js`; protects against casual at-rest inspection, not XSS/same-origin malicious script |
| IndexedDB | `northstar-document-studio`, v1, stores `documents`, `drafts` | Immutable source PDF bytes (max 100 MB, PDF header checked) separate from mutable annotation drafts/page/scale/identity | `scripts/document-storage.js`; no retention/eviction policy or cross-device backup is defined |

The legacy upload/discussion/quiz/session keys are associated with excluded legacy workflows. They are preserved in source and local data until a separate legacy disposition is approved; they are not target 5.0 data contracts.

### 8.3 Release and deployment evidence separation

The current development-branch `release.json` is still a 4.4.8.3.1 release manifest (package 0.4.32, dated 2026-11-24). It records:
- Pages preview deployed as NORTHSTAR 4.4.8.3.1 / package 0.4.32 by run 45410896624;
- production remains recorded as NORTHSTAR 4.4.7.5 / package 0.4.19;
- Canvas Worker 0.4.22 recorded as deployed from source SHA `97e3c9ea80698753a9aa365015aa12d20469a3c3`, with a recorded HTTP version-header smoke check and Cloudflare Version ID `f06f5377-632b-44c9-b647-dcfca3166f54`.

These are repository release-manifest claims, not a live deployment recheck in this work session. The development branch workflow inventory contains the legacy Pages/Worker deployment workflows and a separate `northstar-web-qualification.yml`; no 5.0-specific Pages/production deployment workflow or 5.0 release entry was found. The new `apps/web/` app is therefore treated as development/qualification-only, not deployed.



### 8.4 Cross-tab initialization correction — 2026-11-26

The first automated concurrent-edit run exposed a real initialization race: the demo dataset used millisecond-varying `new Date()` timestamps, so two tabs opened with no saved snapshot could create different revision-1 seeds. The second seed was incorrectly treated as a competing edit, which then prevented subsequent writes while the conflict remained.

The development branch now:
- normalizes demo seed timestamps to local noon so tabs opened on the same local day generate identical seed content;
- synchronously persists the initial snapshot inside `loadAcademicSnapshot` before React mounts, so later tabs normally read the same stored snapshot;
- returns a valid persisted snapshot without injecting default empty arrays, preserving its serialized shape and avoiding false conflicts on reload;
- refuses to overwrite an existing malformed or incompatible snapshot during normal saves; explicit backup restore remains a separate forced operation;
- adds a unit test for deterministic initial seed content and an E2E persistence wait in the two-tab scenario.

Source commits: `ffcb6d83a95a5a5eda9af48c5e04c60afc4a6e78`, `a3ab1f75bf92a64eb9c4691be2139f45fea0f9e6`, `3a87cca28c06760a622c22a85dfe3b24a920adc8`, `67c6403e8c83b7b3a58a2d71bfa09a01873bb2d0`. The cross-tab initialization fix passed run 45743400167 (13 Playwright journeys). The subsequent conflict-export acknowledgement and attachment-manifest fix passed run 45744014664 (17 workflow steps, 50 domain tests, 13 Playwright journeys). Binary attachment archive/restore and broader quota/corruption/interrupted-write recovery remain open.
