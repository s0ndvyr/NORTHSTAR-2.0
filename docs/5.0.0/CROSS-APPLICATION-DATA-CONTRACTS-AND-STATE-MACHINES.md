# NORTHSTAR 5.0 — Cross-Application Data Contracts and State Machines

**Parent:** Cross-Application Intelligence planning  
**Status:** Draft planning specification  
**Authorization:** Planning only; examples are conceptual and are not implementation schemas  
**Date:** 2026-11-25

## 1. Purpose

Refine the approved canonical-data and event-driven decisions into reviewable contracts for later engineering design. This document defines conceptual envelopes, lifecycle states, and invariants. It does not prescribe a final database, programming language types, API endpoints, or executable implementation.

## 2. Canonical record envelope

Every canonical record should be traceable and versioned. A conceptual record envelope contains:

| Attribute | Purpose |
|---|---|
| northstarId | Stable internal identity |
| entityType | Domain entity classification |
| schemaVersion | Version of the record contract |
| localRevision | Monotonic local revision |
| lifecycleState | Active, archived, deleted/tombstoned, or other approved state |
| createdAt / updatedAt | NORTHSTAR timestamps |
| fields | Domain-owned values and field metadata |
| externalReferences | Namespaced provider identifiers |
| provenance | Field-level source and authority information |
| syncSummary | Non-authoritative summary of provider sync state |

Do not store an entire provider response as the canonical record. Preserve only required source data and permitted raw evidence under explicit retention and privacy rules.

## 3. Field-value contract

A field requiring provenance should conceptually include:

- value;
- sourceKind and sourceId;
- authorityClass;
- sourceUpdatedAt when supplied;
- observedAt;
- localRevision;
- providerVersion/ETag when supplied;
- freshness;
- transformation metadata where derived.

Authority classes proposed for review:
- provider-authoritative;
- user-authoritative;
- system-derived;
- imported-unverified;
- unresolved-conflict.

A field may have a provider-authoritative base value and a separate NORTHSTAR personal overlay. Do not merge these into a single ambiguous value.

## 4. Event envelope

A domain event should contain:

| Attribute | Purpose |
|---|---|
| eventId | Unique event identity for deduplication |
| eventType | Versioned event name |
| eventSchemaVersion | Event contract version |
| entityType / entityId | Target canonical entity |
| entityRevision | Revision after the domain transition |
| occurredAt | Event occurrence timestamp |
| source | Domain, provider adapter, or user action |
| correlationId | Groups a multi-step workflow |
| causationId | Identifies the event/action that caused this event |
| payload | Minimal change information or scoped reference |

Event consumers must tolerate duplicate delivery and must not assume global ordering across unrelated entities. For a single entity, consumers compare revisions and reject stale projection updates.

## 5. Sync operation state machine

### 5.1 States

- **queued:** durable local intent exists and awaits eligibility.
- **eligible:** dependencies, connectivity, and permission checks permit an attempt.
- **running:** adapter operation is in progress.
- **succeeded:** authoritative completion criteria are met.
- **waiting-for-network:** no network path is currently available.
- **waiting-for-auth:** credentials or authorization need user action.
- **retry-scheduled:** transient failure may be retried after backoff.
- **needs-user-action:** operation cannot safely continue automatically.
- **conflict:** source version or field authority changed and review is required.
- **failed:** terminal failure with a safe explanation and retained user work.
- **cancelled:** operation safely cancelled.
- **expired:** operation exceeded its valid execution window and requires review.

### 5.2 State transition invariants

- queued operations are persisted before the UI reports that they are safely queued.
- only eligible operations may enter running.
- retry is allowed only for classified transient failures.
- permission denial, invalid input, or revoked authorization is not a transient retry.
- conflict and needs-user-action pause automatic replay.
- succeeded means the relevant authority confirmed completion; a local optimistic update is not success.
- cancelled/expired operations retain a trace and do not erase the underlying draft.
- every attempt rechecks authorization and operation preconditions.

### 5.3 Submission-specific guardrail

A coursework submission must distinguish:
1. local draft saved;
2. submission intent queued;
3. request sent;
4. provider accepted/receipt returned;
5. official submission state confirmed.

The interface must not collapse these states into a generic Submitted label. If provider response is ambiguous, preserve the operation for status reconciliation rather than issuing a potentially duplicate submission.

## 6. Conflict review state machine

Proposed states:
- detected;
- classified;
- awaiting-user-review;
- resolution-selected;
- applying-resolution;
- resolved;
- unresolved/blocked.

Required transition behavior:
1. Capture the base revision, current authoritative value, and proposed local value.
2. Classify field authority and identify safe merge options.
3. If a lossless deterministic merge is explicitly allowed, record the merge rule and resulting provenance.
4. Otherwise pause the affected write and request a user decision.
5. Apply the selected resolution through the owning domain service.
6. Record who/what selected the resolution, source versions, resulting revision, and timestamp.
7. Keep an audit reference to the conflict outcome without retaining unnecessary sensitive content.

Conflict resolution must not permit the user to overwrite an institution-authoritative grade or submission receipt through a local overlay. The user may add a personal annotation or correction note without altering the official source field.

## 7. Offline queue contract

A queued offline operation conceptually records:
- operationId and idempotencyKey;
- target entity and field/command;
- originating local revision;
- expected provider revision where available;
- required permission and approval record;
- dependency operations;
- createdAt and optional expiry;
- retry classification and current state;
- user-visible description;
- cancellation safety classification.

Queue order follows dependencies and domain semantics, not simply creation time. A newer edit may supersede an older local-only edit when safe, but external side effects such as submissions must not be coalesced unless provider semantics explicitly permit it.

## 8. Reconnect reconciliation algorithm

1. Restore connectivity and verify provider authentication.
2. Fetch current versions for affected records.
3. Validate each queued operation's permission, approval, expiry, dependencies, and expected revision.
4. Classify operation as safe replay, safe local-only completion, conflict, needs-user-action, or invalid/expired.
5. Replay safe operations with stable idempotency keys.
6. Verify provider outcomes and persist receipts.
7. Update canonical records and workspace projections from confirmed results.
8. Preserve failed drafts and expose next actions.

No automatic queue replay should execute destructive or consequential actions whose approval is no longer valid or whose context materially changed.

## 9. Data lifecycle and retention questions still open

The following require a dedicated decision before implementation:
- retention period and deletion semantics for provider caches;
- handling of disconnect/reconnect and revoked institution access;
- backup/export coverage for local notes, drafts, files, study artifacts, and queue metadata;
- whether encrypted local storage is required for particular classes of data;
- cache quotas and eviction ordering by academic importance and unsynced status;
- account/profile reset and device-loss recovery behavior;
- archival behavior at term completion.

The invariant is that eviction or disconnect must not silently destroy the only copy of unsynced user-authored work.

## 10. Verification scenarios to preserve

- duplicate event delivery does not duplicate a submission or notification;
- older event cannot regress a newer entity revision;
- provider field changes while local overlay is edited;
- user-owned note edits remain available offline;
- provider-authoritative due date changes while device is offline;
- queued action loses permission before reconnect;
- submission response times out after provider may have accepted it;
- local storage quota is reached while unsynced draft exists;
- application closes during an in-progress queue operation;
- provider disconnects and later reconnects with a changed record;
- conflict resolution itself is interrupted and safely resumed.

## 11. Open planning tasks

1. Validate the conceptual envelopes against the approved canonical entity catalogue.
2. Create field-level schemas for Course, Assignment, Submission, GradeItem, AcademicEvent, Resource, PersonalNote, and FileAsset.
3. Map provider capabilities and version semantics to each field.
4. Define cache classes, retention, backup, restore, and deletion policies.
5. Produce sequence diagrams for assignment due-date change, local draft/offline save, provider submission, and conflict recovery.
6. Link each scenario to requirement IDs NS-CAI-001 through NS-CAI-010 and the broader data/security requirements.

## 12. Authorization boundary

This document is planning only. It does not authorize code, database schemas/migrations, dependency installation, live provider access, data export/import, source deletion, deployment, or runtime testing.



## 13. Current 5.0 scope restriction — provider operations and state machines

The earlier generic sync-operation and submission-specific state-machine sections describe a broader provider-write design. Under NS-SCOPE-001, that write path is not part of the NORTHSTAR 5.0 product contract.

For the current 5.0 application:
- Provider interaction is read-only and remains disabled until NS-CAN-011 authorization is resolved.
- There is no submission operation state machine, no offline queue for Canvas writes, no assignment upload/receipt state, no quiz attempt lifecycle and no discussion/document mutation lifecycle.
- Local NORTHSTAR changes (personal notes, course organization, assignment planning status, calendar blocks, flashcards and writing-feedback drafts) use local persistence/revision/conflict handling only.
- Provider refresh/pagination may be resumed from documented read cursors; partial fetch remains visibly partial/stale and never overwrites user-owned fields.
- A provider-owned status snapshot, if later authorized, is read-only and must not be advanced by a local button or local completion event.
- Any later provider-write requirement requires a new owner decision, an updated API-policy authorization record, a threat model, an ADR and new acceptance criteria before implementation.

The old submission-specific state machine is retained as historical planning text, not a target 5.0 implementation contract. NS-CAI-009 is restricted by NS-SCOPE-001; its least-privilege and revocation controls remain.




## 14. Read-only provider synchronization contract — 2026-11-25

This state machine replaces the broader provider-write operation model for the target NORTHSTAR 5.0 application. It applies only after NS-CAN-011 authorization and only to explicitly approved read endpoints.

### 14.1 Read synchronization states

| State | Meaning | Entry/exit rule |
|---|---|---|
| `unconfigured` | No authorized provider connection or adapter configuration | Current Canvas state; no network request is made |
| `idle` | Authorized adapter exists and no read is running | User/manual/scheduled refresh may enqueue a read |
| `queued` | Read refresh is waiting for connectivity or an execution slot | No provider side effect; can be cancelled |
| `running` | A read-only GET and its pagination sequence are active | One in-flight request by default; authorization checked before each request |
| `partial` | Some pages were validated but the complete collection was not retrieved | Preserve last good snapshot; persist opaque next link/checkpoint; show incomplete/freshness state |
| `succeeded` | All pages validated and the checkpoint/snapshot was committed | Only this state advances last-success timestamp |
| `waiting-for-network` | Network unavailable or request timed out | Keep last good data; retry only after connectivity/manual action and backoff |
| `waiting-for-auth` | 401 or expired/revoked credential | Stop requests; require reauthorization; never loop retry |
| `permission-denied` | 403 or scope/role restriction | Stop this resource; do not retry without permission change |
| `rate-limited` | 429/rate-limit response | Respect Retry-After if supplied; otherwise bounded backoff; keep request-cost evidence |
| `retry-scheduled` | Transient 5xx/network failure may be retried | Backoff with jitter and bounded attempts; preserve checkpoint |
| `failed` | Invalid request, schema violation or terminal provider error | Keep last good snapshot; record redacted error class and actionable message |
| `stale` | Last successful read is outside a future approved freshness policy or source is unreachable | Display source timestamp and stale marker; do not fabricate current data |
| `cancelled` | User or lifecycle cancelled the read | Preserve last complete snapshot and checkpoint |

### 14.2 Read-run record

A `SyncRun` records: run ID, provider, tenant/account scope, resource type, scope key, trigger, start/end time, state, pages attempted/completed, records accepted/rejected, next-link checkpoint, request-cost/rate-limit headers where available, correlation ID and redacted error class. It never stores tokens, authorization headers, private response bodies or full academic content.

A `SyncCheckpoint` is unique per provider + tenant/account + resource type + scope key. It stores the opaque provider next-link exactly as returned, page count, last attempt, last successful completion, partial flag, retry time and schema/transform version. Do not synthesize a Canvas page URL from page numbers. If a next link is rejected/expired, restart the bounded resource read and deduplicate by provider object identity.

### 14.3 Pagination and request scheduling

- Treat response Link headers as opaque; follow `rel="next"` exactly.
- Do not mark a resource complete until all pages validate and the resulting snapshot/checkpoint commits.
- Default to one concurrent Canvas request. Use bounded concurrency only after tenant-specific evidence and rate-limit monitoring.
- Honor 429 and Retry-After; record X-Request-Cost and X-Rate-Limit-Remaining when present.
- Manual refresh and bounded polling are permitted only after NS-CAN-011. Do not assume webhooks exist.
- Preserve the previous complete snapshot when a page fails; expose partial/stale state rather than replacing it with a truncated list.
- Deduplicate by provider + tenant + object type + external ID string. Never coerce 64-bit Canvas IDs to numbers.

### 14.4 Provider error classification

| Provider/network result | Required behavior |
|---|---|
| 400 / 422 | Treat as invalid request or contract mismatch; stop and surface a safe diagnostic; no automatic retry |
| 401 | Move to waiting-for-auth; stop provider calls until reauthorization |
| 403 | Move to permission-denied; do not retry without a scope/role/policy change |
| 404 | Mark source unavailable for this read; only tombstone after authoritative repeated evidence; preserve user-owned dependents |
| 429 | Move to rate-limited; respect Retry-After where present and apply bounded backoff |
| 5xx / timeout / connection loss | Keep last good snapshot; move to retry-scheduled or waiting-for-network; resume from a valid checkpoint |
| Malformed JSON / schema validation failure | Reject the affected page/record; do not partially overwrite authoritative data; retain redacted diagnostics |
| Pagination link invalid/expired | Mark partial; retain the last valid checkpoint; restart safely if the provider no longer accepts the link |
| Permission revoked/disconnect | Stop reads, mark provider data stale/unavailable, preserve user-owned notes and planning records |

### 14.5 Field-level merge and conflict rules

1. Provider-authoritative fields update only from an authorized, validated provider read. A local edit cannot overwrite them.
2. User-owned fields (personal priority, target date, notes, study cards, personal calendar blocks and writing drafts) are never overwritten by provider refresh.
3. Keep personal and provider assignment status separate. A provider Submitted/Graded value is read-only; a local status action cannot create it.
4. If a provider changes a due date while the user has a personal target date, retain both fields and show their distinct meanings; this is not a destructive conflict.
5. If two providers or two records claim the same canonical identity, keep both external references and mark identity unresolved; do not auto-merge based only on course title or code.
6. If a provider record disappears or becomes inaccessible, mark it stale/unavailable or tombstoned according to evidence; preserve user-owned notes, drafts and attachments as orphaned-source records.
7. Cross-tab localStorage conflicts preserve both local and persisted snapshots. Do not clear them until the user has exported/acknowledged the recovery bundle; file bytes in IndexedDB require separate handling under NS-DATA-007.
8. A failed read never rolls back a newer valid provider snapshot or erases local overlays.

### 14.6 Current implementation and verification gap

The current 5.0 Canvas adapter is unconfigured and has no network implementation. The local academic snapshot has revision/conflict handling, but there is no provider SyncRun/SyncCheckpoint store, provider provenance envelope or live read pipeline. This contract is specified for a future separately authorized integration; it is not a claim of implemented synchronization.

Verification must cover: interrupted pagination; duplicate/out-of-order pages; 401/403/404/429/5xx; malformed payload; permission revocation; duplicate external IDs; timezone preservation; provider field update with local overlay; stale-source deletion; and preservation of the last complete snapshot.



## 15. Authorization status clarification

The original planning-only header remains accurate for the provider contract/state machines specified here: they are not implemented as a live provider integration. A later separate owner authorization permits bounded local/demo app implementation and development-branch qualification. It does not authorize live Canvas access, provider writes, external data migration, production deployment or legacy Worker changes.
