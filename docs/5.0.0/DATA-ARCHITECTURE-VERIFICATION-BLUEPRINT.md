# NORTHSTAR 5.0 — Data Architecture Verification Blueprint

**Integrated master:** [Cross-Application Data Architecture](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md)  
**Workstream:** Cross-Application Intelligence  
**Status:** Detailed planning specification — integrated; review pending; no tests executed  
**Decision sources:** CAI-DEC-01 through CAI-DEC-05; NS-DATA-001/002/003; NS-STATE-001; NS-CAN-001/002; NS-CAI-001 through NS-CAI-010  
**Authorization:** Planning only. No implementation, live provider testing or production qualification authorized.

## 1. Verification principles
- Every acceptance claim maps to a unique requirement and repeatable evidence.
- Unit/contract tests do not replace end-to-end, accessibility, security, performance or physical iPad testing.
- Simulated Canvas fixtures prove adapter logic only, not live Canvas support.
- Provider acceptance records endpoint, scope, tenant, role and tested behavior.
- Local save, queued intent, provider request and provider-confirmed completion are distinct states.
- Failure and recovery paths are first-class acceptance criteria.

## 2. Verification layers

| Layer | Evidence | Primary risks |
|---|---|---|
| Static architecture | Domain map, dependency graph, secret scan, schema review | Coupling, secret exposure, unclear ownership |
| Unit | Validation, authority, derivation, state transitions | Incorrect field rules/calculations |
| Contract | Events, provider adapters, persistence and queue contracts | Drift, malformed payloads, incompatible versions |
| Integration | Canonical write to workspace projections | Stale/duplicated cross-workspace state |
| End-to-end | Workflows across Dashboard/Courses/Assignments/Calendar/Gradebook | Broken lifecycle and inconsistencies |
| Failure/recovery | Network, quota, auth, timeout, termination, restore | Lost drafts, duplicate side effects |
| Security/privacy | Authorization, least privilege, safe logs, cache isolation | Unauthorized actions/data leakage |
| Accessibility/iPad | Touch, keyboard/Pencil where supported, VoiceOver, orientation, Split View, reduced motion | Unusable workflows |
| Operational | Monitoring, audit, backup/restore, rollback rehearsal | Undetected partial failure |

## 3. Acceptance matrix

| Requirement | Acceptance criterion | Required evidence |
|---|---|---|
| NS-CAI-001 | One canonical identity per shared object; projections reference it | Entity map, uniqueness/integrity and cross-workspace tests |
| NS-CAI-002 | Duplicate/out-of-order events do not duplicate effects or regress revisions | Event contract, replay/order reports |
| NS-CAI-003 | External refresh matches documented capability and exposes freshness | Dated capability matrix, pagination/rate-limit/cursor tests |
| NS-CAI-004 | Field authority/provenance enforced for mapped fields | Field matrix, source-precedence and overlay isolation tests |
| NS-CAI-005 | Conflicts preserve base/source/local values and record resolution | Concurrent edit, stale revision, deletion and audit tests |
| NS-CAI-006 | Cache bounded and cached data visibly labeled | Offline/staleness/quota/eviction report |
| NS-CAI-007 | User-owned offline changes persist locally; authorized provider reads resume safely from a checkpoint; no provider write queue exists | Local durability, read-checkpoint resume, revocation and reconnect tests |
| NS-CAI-008 | User distinguishes saved, queued, running, failed, conflict and confirmed | State-machine and usability acceptance |
| NS-CAI-009 | Any authorized provider read adapter enforces permission, tenant, secret and revocation boundaries; no provider write API is exposed | Threat model, authorization tests, secret scan and negative write-capability tests |
| NS-CAI-010 | Supported workflows consistent across workspaces and recovery | E2E matrix, regression report, restore evidence |
| NS-DATA-003 | Migration/backup/restore versioned, recoverable and non-destructive | Fixture migration, checksum reconciliation, restore rehearsal |

## 4. Required scenario catalogue

### Identity and authority
- Same course/assignment appears in multiple workspaces with one canonical ID.
- Similar titles in different courses do not collide.
- Provider due-date change updates official field while personal planning date remains.
- Official grade refresh cannot overwrite personal forecast/reflection.
- Provider deletion/tombstone preserves notes and local drafts.

### Events and synchronization
- Duplicate event delivered repeatedly.
- Older event arrives after newer revision.
- Subscriber fails after canonical commit and recovers without duplicate effects.
- Provider pagination fails mid-stream and resumes from safe checkpoint.
- Rate limit, transient outage, permission denial and malformed payload are distinguished.
- Provider read timeout preserves the last complete snapshot, classifies the error and resumes only from a valid checkpoint; no submission receipt or provider write retry exists.

### Offline and recovery
- Draft saved offline, app terminated, reopened and recovered.
- A local-only change survives offline restart; a provider read loses permission before the next page and stops without replacing the last good snapshot.
- Local storage quota reached while unsynced draft exists.
- Device reconnects after official deadline/grade changed.
- Restore archive contains duplicate/stale identities or corrupted attachment.
- Conflict resolution interrupted and resumed without losing either version.

### Legacy migration
- Migration run twice is idempotent.
- Invalid/unknown legacy values are reported, not silently dropped.
- Attachments retain checksums and references.
- Before/after counts and relationships reconcile.
- Rollback restores prior usable state.

## 5. Evidence artifact standard
Each item records requirement ID; test/scenario ID; build/commit; environment/device/browser; fixture or tenant; exact permissions/scopes; steps; expected/actual result; safe logs/screenshots; pass/fail/blocked; defects; reviewer/date; and whether static, simulated, automated, manual or target-tenant verified. Redact tokens, private coursework and unnecessary personal data.

## 6. Release gates
1. **Design gate:** entity/field catalogue, authority matrix, provider capability evidence, retention policy, migration map and threat model reviewed.
2. **Implementation readiness gate:** dependencies, storage choice, migration/rollback, fixtures, observability and acceptance criteria approved.
3. **Internal qualification gate:** build/type/lint/unit/contract/integration/E2E/failure/security/accessibility/performance evidence.
4. **iPad acceptance gate:** physical iPad Safari/PWA tests across orientations, offline transitions, touch, persistence and recovery.
5. **Provider gate:** separately authorized least-privilege target-tenant tests, with no real coursework mutation used as a test.
6. **Release gate:** backup/restore rehearsal, change review, monitoring, rollback and explicit release authorization.

No gate is passed by documentation alone.

## 7. Planning gaps and risks
Open: exact Canvas endpoint matrix; provider revision semantics; storage technology; cache quotas/freshness thresholds; retention and backup destination; legacy key/call-site inventory; grade calculation semantics; fixture privacy; performance budgets; physical iPad test matrix. Each gap needs an owner, decision date and affected requirement before implementation readiness.

**Disposition:** Verification plan drafted; no tests, builds, live Canvas checks or iPad qualification performed.



## 8. Current scope-specific acceptance and evidence additions — 2026-11-25

Under NS-SCOPE-001, target 5.0 acceptance must include negative-scope checks:
- no native quiz/test engine, timed assessment, question-bank attempt or scoring route/component;
- no local “turn in” action, Canvas submission method, upload/re-submit or receipt simulation;
- no general-purpose document editor; Review Center remains limited to local writing feedback/drafts;
- no 5.0 call site into legacy Worker write/quiz/document routes;
- Submitted/Graded provider/demo statuses are display-only and carry source/provenance; personal planning status cannot mutate provider facts.

Local learning acceptance covers flashcard prompt/reveal/self-rating, spaced-repetition schedule, course study-guide generation and resource navigation. It must not create a graded assessment result.

Additional data recovery scenarios:
- two tabs initialize an empty store on the same day and must converge on identical seed content;
- a malformed/incompatible stored snapshot is preserved and not overwritten by demo seed data;
- localStorage quota failure, IndexedDB blocked/quota/abort, failed attach metadata save, failed delete, interrupted import/reset and orphan Blob detection;
- backup/restore round trip explicitly reports that binary attachments are excluded until NS-DATA-007 is closed;
- conflict bundle download is not treated as saved until the user acknowledges it; conflict data remains recoverable until then.

The scope correction and cross-tab initialization fix passed the full qualification workflow on code checkpoint 58f0c139 (run 45743400167). A subsequent recovery correction now requires explicit acknowledgement before clearing a conflict export and includes an attachment metadata manifest; that newer code is being qualified in run 45744014664. Physical iPad and manual/device acceptance are not claimed.



## 9. Verification status clarification — 2026-11-25

The “no tests executed” statement in the original header described the planning checkpoint when this blueprint was authored. Development-branch local/demo domain tests, typecheck, production build and browser qualification have since been run through GitHub Actions for specific commits. Those results are recorded per run in the execution/evidence register and do not constitute full data-architecture acceptance.

Still not claimed: live Canvas/StudentVUE/AI integration tests, provider tenant verification, production qualification, physical iPad Safari testing, full accessibility/security/performance acceptance or complete migration/recovery acceptance.


## 10. Security, privacy and release-readiness threat model — 2026-11-26

This is a static threat model and release checklist, not a passed security audit. It distinguishes the new local/demo application from the legacy root application and Worker.

### 10.1 Assets and trust boundaries

| Asset / boundary | Current location or behavior | Security consequence |
|---|---|---|
| Academic snapshot, course/assignment/grade metadata, notes and priorities | Browser localStorage in the new app | Plaintext at rest; accessible to same-origin JavaScript and browser-profile users |
| Conflict snapshots | Browser localStorage under a separate conflict key | Contains both local and persisted academic snapshots; recovery export must not clear before user acknowledgement |
| Assignment attachment bytes | Browser IndexedDB | Plaintext local Blob storage; not included in JSON backup; browser quota/device loss can destroy bytes |
| Static app assets | Vite build and service-worker shell cache | Must not cache academic records, tokens or provider responses |
| Canvas credentials/provider data | No credentials or live provider requests in 5.0 | No current provider-token exposure; future integration requires backend-only token custody |
| AI provider inputs/outputs | Local deterministic simulation only | No real provider data transfer in current app |
| Legacy Canvas Worker and root UI | Existing legacy files and release manifest | Separate legacy risk: source still contains write/quiz/upload/discussion/LTI capabilities; no 5.0 call site is permitted |
| Deployment and secrets | 5.0 has no production deployment workflow | Release credentials and production origin are not part of current 5.0 app |

### 10.2 Threat register and required controls

| Threat | Current exposure / severity | Required control and acceptance evidence |
|---|---|---|
| XSS through course/resource content or imported text | High if untrusted HTML is rendered; provider content is not connected today | Treat all imported/provider content as untrusted; sanitize HTML, avoid unsafe HTML sinks, validate URL schemes, add CSP and test script/event-handler payloads |
| Local-device/profile access or malicious same-origin script reads academic data | High: localStorage/IndexedDB are plaintext | Decide local at-rest protection and threat model; minimize stored sensitive fields; provide explicit export/reset; document browser-profile/device boundary; evaluate encryption only with a viable key-management model |
| OAuth/API token theft in a future integration | No current 5.0 token; critical if introduced | Backend-for-frontend only; OAuth authorization code + PKCE; token vault/secret manager; short-lived secure HttpOnly SameSite cookies; never put tokens in localStorage, URLs, bundles or logs |
| CSRF/CORS/open redirect/tenant confusion at a future BFF | No current BFF; critical before live provider access | Strict origin and tenant allowlists, CSRF defense, fixed Canvas base URL, endpoint/method allowlist, server-side scope checks, safe redirect validation and negative tests |
| Provider data overreach or revoked permission | No live integration; high if introduced | Least privilege, explicit approved scopes, permission check before each read, 401/403 stop behavior, freshness/stale markers, disconnect and revocation tests |
| Academic content/credentials leak through logs or telemetry | No provider telemetry in 5.0; future risk | Metadata-only logs, redaction tests, no tokens/grade comments/note bodies/file bytes in telemetry, documented retention and access controls |
| Dependency/build supply-chain compromise | Moderate; package lock and production audit are in CI | Keep lockfile reproducible, production dependency audit, review advisories, minimize dependencies, protect GitHub Actions permissions, pin action versions and produce SBOM before release |
| Service-worker cache staleness or poisoning | Static shell cache exists | Versioned cache names, same-origin scope, cache only static assets, no academic/private response caching, upgrade/rollback tests and stale-shell recovery |
| Browser storage quota/corruption or interrupted multi-store operation | Current localStorage + IndexedDB split; attachment backup incomplete | Quota/corruption/abort tests, safe backup/restore, attachment manifest/archive, orphan detection, two-sided conflict retention and explicit acknowledgement |
| Legacy Worker invoked with excluded write operations | Legacy source and release manifest retain older routes; live state not rechecked | No 5.0 call sites; keep legacy branch/source preserved; owner decision and separate authorization before deactivation, credential rotation or deployment change |
| AI disclosure/training/retention ambiguity | No real AI provider in current app | If AI is separately authorized later: disclose provider, data sent, training/storage, limitations and label generated content; comply with current Instructure API Policy where Canvas data is involved |

### 10.3 Current controls actually evidenced

- Current 5.0 Canvas adapter is unconfigured and exposes no submission method; no provider credentials or network calls are present in the target app.
- Current 5.0 AI workspace uses deterministic local simulation; no external AI provider request is made.
- Production dependency audit, typecheck, build, domain tests and Playwright browser qualification passed on code checkpoint 58f0c139 (run 45743400167).
- The service worker caches the static app shell; academic data is stored separately in browser localStorage/IndexedDB.
- The conflict export flow has been changed in source to retain conflict records until explicit user acknowledgement; the follow-up qualification run 45744014664 is in progress.
- The legacy Worker and root UI still contain excluded capabilities. Source-level inventory is not proof of live deployment status or safe retirement.

### 10.4 Release blockers

1. Complete the latest recovery qualification run 45744014664 and any required reruns.
2. Complete full accessibility and keyboard/VoiceOver review across all workspaces.
3. Perform physical iPad Safari/PWA acceptance (owner-side device required).
4. Complete storage quota/corruption/interrupted-write and attachment recovery tests.
5. Decide local data at-rest, retention, deletion and backup policies.
6. Complete route-level legacy Worker threat review and obtain owner disposition/retirement authorization.
7. Resolve NS-CAN-011 written Instructure/Customer authorization before any live Canvas request.
8. Complete security review, secret scan, CSP/sanitization tests, SBOM/dependency review and rollback rehearsal.
9. Obtain explicit 5.0 production deployment/release authorization; no 5.0 deployment is currently claimed.

**Disposition:** Threat model and release blockers documented. No full security audit, live provider test, physical iPad acceptance or production release has passed.




### 10.5 Static source review performed — 2026-11-26

Inspected 19 files across `apps/web/src/`, `apps/web/index.html`, `apps/web/public/sw.js`, `apps/web/vite.config.ts` and `apps/web/package.json`.

- No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `eval`, `new Function`, `document.write`, `window.open`, `XMLHttpRequest` or `WebSocket` usage was found in the inspected new-app source.
- Resource `content` is rendered as React text, not injected HTML.
- The only application `fetch` found is in the service worker. It handles same-origin GET navigation/static-asset requests; it does not cache cross-origin responses, academic records or API payloads.
- The Study Lab external reference link uses `target="_blank"` with `rel="noreferrer"`; the Resources workspace link uses `rel="noreferrer noopener"`. Both currently bind a stored URL directly to `href`; explicit HTTPS scheme validation is still required and is tracked under NSX-025.
- `apps/web/index.html` has no Content-Security-Policy meta tag, and the Vite config does not establish production response security headers. A production CSP/header policy must be designed and tested at the actual hosting layer before release.
- The new app stores academic snapshot/conflict data in localStorage and attachment Blobs in IndexedDB without application-level encryption. This is a documented release/privacy risk, not an assertion that the browser profile is a secure vault.

This is a bounded static source review, not a dynamic penetration test, dependency SBOM, CSP validation, browser-extension threat test or complete security sign-off.
