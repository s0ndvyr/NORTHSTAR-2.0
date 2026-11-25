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
| NS-CAI-007 | Permitted offline writes persist and replay after revalidation | Queue durability, dedupe, revocation and reconnect tests |
| NS-CAI-008 | User distinguishes saved, queued, running, failed, conflict and confirmed | State-machine and usability acceptance |
| NS-CAI-009 | Adapter writes enforce permission, approval, secret and revocation boundaries | Threat model, authorization tests, secret scan |
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
- Ambiguous submission timeout reconciles receipt before retry.

### Offline and recovery
- Draft saved offline, app terminated, reopened and recovered.
- Queue item loses permission before reconnect and is paused.
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
