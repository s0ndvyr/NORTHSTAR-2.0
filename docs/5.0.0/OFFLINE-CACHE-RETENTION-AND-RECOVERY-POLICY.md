# NORTHSTAR 5.0 — Offline Cache, Retention, Backup and Recovery Policy

**Workstream:** Cross-Application Intelligence  
**Status:** Policy proposal for review; quantitative limits and storage technology undecided  
**Decision sources:** CAI-DEC-05; NS-DATA-003; NS-CAI-006/007/008/010  
**Authorization:** Planning only. No storage code, backup job, export, migration or deletion authorized.

## 1. Policy objectives
Protect user-authored academic work; make cached official data visibly stale; avoid presenting offline state as provider-confirmed; bound storage; preserve recovery across quota pressure, sign-out, disconnect and device loss; and ensure deletion is deliberate and auditable.

## 2. Data classes and proposed treatment

| Class | Examples | Offline/cache treatment | Retention and eviction |
|---|---|---|---|
| A — Unsynced user-authored work | Notes, drafts, study artifacts, local checklist changes | Durable local persistence before “saved” confirmation | Protected from automatic eviction; export/backup path required |
| B — Pending operation metadata | Idempotency key, target revision, approval, dependencies, status | Durable queue; sensitive payload minimized | Never silently evict; retain until resolved/cancelled/expired with work preserved |
| C — Official academic snapshot | Courses, assignments, grades, feedback, events | Cache only needed fields; show last sync and stale label | Bounded by age, size and sensitivity; evict before A/B |
| D — Downloaded resources/files | PDFs, course files, attachments | Explicit download/bookmark state and storage accounting | User-visible controls; warn before removing pinned/referenced files |
| E — Derived projections | Dashboard counts, workload estimates, grade forecasts | Rebuildable; optional cache | Lowest eviction priority |
| F — Credentials/secrets | OAuth tokens, refresh tokens, signing material | Never expose to UI/logs; separate secure credential design | Revoke/clear on disconnect and account reset |

## 3. Freshness semantics
Every cached provider record exposes last successful fetch time; source version/cursor where available; freshness class (current, aging, stale, unavailable or unknown); reason for staleness; and pending-operation state. Thresholds are object-specific. Grades, deadlines, submission receipts and availability are high impact. Local storage access never makes a cached record freshly verified.

## 4. Quota and eviction policy
Before implementation, define per-class and total budgets based on iPad Safari/PWA constraints and measured usage. The policy must:
1. Protect unsynced user-authored data and pending operation metadata.
2. Preserve pinned/downloaded assets unless the user approves removal.
3. Evict rebuildable projections first.
4. Then evict stale provider snapshots by age and importance.
5. Warn before removing user-visible downloads.
6. Stop accepting large downloads before risking unsynced work.
7. Surface quota errors with actionable recovery steps.
8. Never silently delete the only copy of an unsynced draft.

## 5. Backup and export
Define a user-controlled export identifying included/excluded classes, schema/export version, timestamps, checksums and file relationships. Include notes, drafts, study artifacts, local preferences and unresolved operation/conflict metadata where safe. Exclude provider credentials and non-exportable provider data. Downloads may be included by explicit choice because of size/copyright constraints.

A backup is not verified until integrity and restore tests pass. Backup creation does not mark provider sync complete.

## 6. Restore and device-loss recovery
- Validate archive format, version, checksum and integrity before import.
- Restore into a staging namespace; do not overwrite canonical records blindly.
- Reconcile identities/revisions and detect duplicates/conflicts.
- Restore user-authored content and attachments with relationships intact.
- Revalidate provider authentication separately; never restore credentials from ordinary export.
- Restore pending external operations as paused/needs-review unless idempotency, authorization, expiry and target revision can be safely revalidated.
- Provide a restore summary and user approval before applying changes.
- Preserve the source archive when recoverable failures occur.

## 7. Disconnect, revocation and account reset
On provider disconnect/revocation, stop affected reads/writes; clear or quarantine credentials under secure lifecycle; preserve local notes/drafts/files/personal planning; mark provider snapshots stale/unavailable; pause provider writes; require reauthorization and revalidation before replay; and allow export of local work. Distinguish provider-data deletion requirements from locally owned data retention.

Account reset must preview what is retained/exported/deleted. Destructive reset requires explicit confirmation and a recoverable backup when feasible.

## 8. Term rollover and archival
At term completion, archive rather than automatically delete. Preserve grades/feedback under applicable policy; keep personal notes/study artifacts linked to archived courses; allow selective download cleanup; define a later explicit purge with retention/export checks.

## 9. Open decisions before implementation
Exact freshness thresholds; per-class/total cache quotas; retention periods and user exceptions; encryption requirements; backup destination/cadence/format; provider disconnect semantics; institutional retention and copyright handling.

## 10. Acceptance and failure tests
Test quota exhaustion during draft save; app termination during queue write; device loss and restore; corrupted/incomplete archive; disconnect with queued operations; permission revocation; stale grades/deadlines; selective file eviction; restore duplicates; and term archive. Evidence must show unsynced user work is never silently lost.

**Disposition:** Proposed lifecycle policy; quantitative and platform-specific decisions remain open.
