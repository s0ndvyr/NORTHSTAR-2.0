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
