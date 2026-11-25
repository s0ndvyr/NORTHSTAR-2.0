# NORTHSTAR 5.0 — Legacy Source Inventory: Initial Evidence Review

**Review date:** 2026-11-25  
**Review type:** Static source/document inspection via GitHub repository files and indexed code search  
**Status:** Initial evidence review; comprehensive source-level inventory remains in progress  
**Authorization:** Planning and source analysis only. No application code was modified.

## 1. Scope and evidence boundary

This review follows the user's A/A/A/A/A checkpoint:
1. Complete legacy source-level inventory and data mapping first.
2. Research Canvas capabilities using current official documentation and record endpoint evidence; keep tenant verification separate.
3. Derive offline policy values from platform constraints, sensitivity, and measured usage.
4. Define the secure BFF requirement first; defer hosting/database choices until evidence supports them.
5. Plan integration readiness across all workspaces.

The inspected source snapshot was repository commit `82017f489dfd855e1bae564a560b246cc34d5757` (the repository's indexed default-branch snapshot at review time), not the NORTHSTAR 5.0 planning branch's original audited baseline. This distinction matters: findings below are evidence of the inspected snapshot and must be reconciled against the exact migration source branch before migration decisions.

Inspected files:
- `README.md`
- `scripts/assignment-room.js`
- `scripts/submissions.js`
- `canvas-bridge/worker.js`
- `docs/PHASE4-CAPABILITY-AND-ACCEPTANCE.md`
- `tests/boot.test.mjs`
- `native/ios/README.md`

Searches also surfaced `scripts/premium.js`, `scripts/release.js`, `scripts/workspace.js`, `scripts/canvas-sync.js`, `scripts/document-export.js`, `index.html`, `release.json`, `NORTHSTAR-0.4-ENGINEERING-LOG.md`, and additional documentation. These are candidate inventory targets, not all fully inspected in this pass.

No local checkout, complete tree walk, dependency graph, runtime execution, tests, build, iPad inspection, provider request, or live Canvas verification was performed. This is not a complete source audit.

## 2. Initial capability and source map

| Capability / workflow | Evidence found | Data / ownership implications | Inventory status |
|---|---|---|---|
| Academic dashboard and Canvas sync | README describes example data replaced by live Canvas courses and assignments; encrypted versioned snapshot for last successful course/assignment/grade data | Separate demo fixtures, provider facts, encrypted cached snapshot, freshness state | Partial |
| Credential vault | README describes AES-GCM encrypted IndexedDB credentials and non-extractable device key; memory-only fallback when secure storage unavailable | Sensitive credentials need isolated vault boundary, consent, key lifecycle, disconnect and XSS threat controls | Partial |
| Assignment navigation | `scripts/assignment-room.js` manages `#assignment/<id>`, browser history, overlay and previous-view restoration | Route state and transient workspace state must not be mistaken for persisted assignment records | File inspected; deeper call-site mapping open |
| Assignment submission | `scripts/submissions.js` constructs Canvas text, URL and file payloads; requires private bridge; POST transport does not retry; ambiguous outcomes instruct user to check Canvas | Submission command requires idempotency/receipt reconciliation design; do not blindly replay ambiguous writes | File inspected |
| Canvas bridge | `canvas-bridge/worker.js` has fixed allowed origins/build marker, CORS/no-store headers, path validation and route allowlists | Privileged provider boundary exists; secrets/configuration and allowed routes require environment and endpoint inventory | Partial; full route matrix open |
| Quiz and assessment | README describes session-scoped attempt validation, Canvas-backed supported quiz flows, unsupported question blocking, and official New Quizzes handoff | Attempt identity, timer, answer state and provider-owned submission must remain distinct from local study/practice artifacts | Partial |
| PDF / Document Studio | Assignment room comments describe PDF.js rendering and flattened PDF export; README says annotations are local until export and not Canvas DocViewer state | Local annotation data, source attachment and exported derivative must be separate linked records; native Canvas annotation is provider-owned | Partial |
| Other document formats | Phase 4 capability matrix describes Word, Excel, PowerPoint, text/CSV/Markdown handling and explicit fidelity limits | Import/export artifacts, source file, transformed content and limitations need separate provenance | Documentation inspected |
| Native iOS secure content | `native/ios/README.md` describes WKWebView host for Canvas/LTI secure top-level sessions; provider owns assessment and final submission | Native bridge is a separate platform capability; session URLs are short-lived secrets and must not be persisted/logged | Documentation inspected |
| Boot tests | `tests/boot.test.mjs` loads legacy scripts into jsdom and stubs fetch and a vault; verifies boot and exposed modules | Existing tests provide regression assets but do not establish live provider, physical device, or full browser behavior | Test source inspected; not executed |

## 3. Confirmed preservation candidates

The following behaviors must be represented in the migration inventory and protected by parity criteria before any retirement:
- Canvas credential encryption and explicit disconnect behavior.
- Last-known-good academic snapshot restore with an explicit cached/offline label.
- Assignment deep links and browser-history return behavior.
- Submission payload validation, bridge-only writes, no blind retry, and ambiguous-outcome warning.
- Canvas-owned quiz attempts, session-scoped attempt continuity, unsupported question safeguards, and official New Quizzes handoff.
- File upload constraints and partial-upload awareness documented in the Phase 4 capability matrix.
- PDF annotation/export separation from Canvas DocViewer annotation state.
- Word/Excel/PowerPoint import/export limitations and original-file preservation.
- Native secure-content handoff boundaries for Canvas/LTI.
- Existing boot/regression tests and provider bridge allowlist/security behavior.

These are preservation candidates, not a declaration that every behavior is currently passing production acceptance.

## 4. Initial data inventory and migration implications

| Data class | Candidate records / artifacts | Required migration treatment |
|---|---|---|
| Provider academic facts | Canvas courses, assignments, enrollments, grades, feedback, submission states, quiz attempts | Preserve provider IDs and source timestamps; re-fetch/reconcile rather than treating snapshots as authoritative |
| User-owned academic work | Drafts, notes, priorities, personal due-date overlays, study artifacts | Preserve locally authored content and ownership; map to canonical NORTHSTAR entities |
| Submission artifacts | Uploaded files, file IDs, text/URL payloads, receipts, status | Preserve operation/receipt linkage; never fabricate provider acceptance |
| Documents | Original files, local annotation objects, flattened PDF exports, converted DOCX/XLSX/PPTX outputs | Preserve original and derived artifacts separately with lineage and limitations |
| Credentials and session data | Encrypted credential vault, device key, session-scoped quiz validation, short-lived session URLs | Do not migrate secrets as ordinary academic data; re-authenticate as needed; never migrate transient session URLs |
| Cached snapshots | Encrypted last-successful course/assignment/grade snapshot and schema versions | Migrate only as explicitly stale cache; retain schema/version and source freshness; rebuild from provider when possible |
| Configuration | Canvas origin, private bridge URL, user preferences, release/theme settings | Classify by sensitivity; separate secrets from non-secret preferences; validate allowed origins |
| Operational evidence | Sync warnings, timestamps, diagnostics, request IDs, test fixtures | Preserve useful non-sensitive audit context; redact tokens and private coursework from logs |

The complete list of storage keys, IndexedDB object stores, vault namespaces, serialized formats, data writers/readers, and migration transforms is **not yet inventoried**. This table is a logical initial map only.

## 5. Architecture implications for NORTHSTAR 5.0

1. **BFF is a security requirement for privileged provider operations.** The browser must not own provider secrets or unrestricted Canvas proxying. The exact BFF host/runtime and persistence topology remain open.
2. **Local-first data must distinguish durable user work from replaceable provider cache.** IndexedDB remains the recommended browser persistence foundation; actual object-store layout and wrapper selection require implementation planning.
3. **Submission is an external command workflow.** A timeout is not proof of failure. Operation identity, provider receipt capture, and read-after-ambiguous-write reconciliation are required before retries.
4. **Files need lineage.** Original source, downloaded copy, local annotation, converted document and submitted attachment are distinct artifacts linked through provenance.
5. **Provider-owned assessment state must remain provider-owned.** NORTHSTAR may provide surrounding context or supported API workflows, but cannot claim authority over unsupported question types, timers, LTI identity checks or provider submission.
6. **Native iOS host is optional platform-specific capability.** PWA fallback limitations and native-host availability must be explicit in the workspace UX and acceptance matrix.

## 6. Unresolved inventory tasks

- Inspect every source file on the exact migration source branch and generate a path-level inventory.
- Search all browser storage calls and enumerate every localStorage/sessionStorage key and IndexedDB database/store/index.
- Trace every read/write call site for each academic entity and every persistence serializer/version.
- Enumerate all Worker routes, HTTP methods, request/response schemas, origin checks, token flows, redirects and provider endpoint mappings.
- Map all Canvas API endpoints to current official documentation with retrieval date, method, scope, pagination, rate limits, availability and confidence.
- Inventory every external dependency, CDN import, version pin, license, update path and offline requirement.
- Trace all file formats, attachment transformations, temporary URLs, export/import paths and cleanup behavior.
- Reconcile test coverage with every preserved workflow and add explicit failure/recovery parity cases to the plan.
- Identify all release, deployment, native iOS, service-worker and environment configuration dependencies.
- Complete source-to-canonical-entity mapping and rollback design.

## 7. Status and authorization

**Status:** Initial source evidence captured; comprehensive inventory is not complete. Unknowns are explicitly retained as open work.

No application source, configuration, dependency, database, migration, deployment or production artifact was changed. No tests or builds were executed. This document is a planning artifact only.
