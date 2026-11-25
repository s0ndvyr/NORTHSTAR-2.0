# NORTHSTAR 5.0 — Cross-Application Intelligence Planning

**Parent stage:** NORTHSTAR 5.0.0 — Architecture & Product Foundation  
**Workstream:** Cross-Application Intelligence  
**Status:** **Five decisions recorded; supporting specifications drafted; planning review pending**  
**Authorization:** Planning only; no application implementation authorized  
**Opened:** 2026-11-25  
**Decision record date:** 2026-11-25

## 1. Purpose and scope

Define how NORTHSTAR coordinates academic information and user workflows across Dashboard, Courses, Assignments, Calendar, Gradebook, Resources, Study Lab, Review Center, AI Workspace, and approved external integrations. This document is a planning artifact. It does not build services, modify runtime code, connect live providers, migrate data, or authorize implementation.

## 2. User decisions recorded

The user submitted **A / A / A / A / A** on 2026-11-25.

| ID | Decision | Approved selection | Consequence |
|---|---|---|---|
| CAI-DEC-01 | Shared data architecture | **A — One canonical academic data layer**, with domain-owned models and workspace-specific read projections. | Workspaces must not create competing authoritative copies of shared academic facts. |
| CAI-DEC-02 | Update propagation | **A — Event-driven internal updates**, provider webhooks/polling where available, manual refresh, and visible stale/error states. | Internal state changes propagate promptly; external refresh adapts to provider capabilities. |
| CAI-DEC-03 | Field-level authority | **A — Explicit per-field source authority and provenance.** Canvas owns official institution records; NORTHSTAR owns personal workflow fields. | Authority is defined per field, not inferred from timestamps or workspace preference. |
| CAI-DEC-04 | Conflict resolution | **A — Never silently overwrite.** Preserve both versions, explain conflicts, and request user review when safe automatic resolution is unavailable. | Conflict detection and recovery are first-class capabilities. |
| CAI-DEC-05 | Offline behavior | **A — Offline-capable cached reads and queued permitted local edits**, with idempotent reconciliation and visible conflict/recovery status. | Offline work is durable, permission-aware, and safely reconciled after reconnect. |

These are approved planning decisions, not implementation or runtime verification.

## 3. Approved constraints carried forward

- Canvas is authoritative for institution-managed records, including official course/assignment records, grades, instructor feedback, and submission status.
- NORTHSTAR owns personal workflow information such as planning, notes, preferences, study artifacts, and user-created organization.
- A shared academic data layer prevents workspaces from maintaining contradictory copies of the same academic fact.
- Field-level provenance and source authority remain visible and testable.
- Synchronization is observable, permission-aware, recoverable, and transparent about delay or failure.
- Conflicting edits are never silently discarded or overwritten.
- Offline behavior preserves user work and reconciles safely when connectivity returns.
- Consequential actions require explicit user approval.
- No live Canvas or AI connection may be claimed unless implemented and verified under separate authorization.

## 4. Canonical data architecture

### 4.1 Principles

1. **One canonical record per logical entity.** A course or assignment is represented once in the shared domain layer; workspaces consume projections.
2. **Domain ownership, shared identity.** Domain modules own validation and state transitions. Shared identifiers and versioned contracts allow other domains to subscribe without taking ownership.
3. **Source record versus user overlay.** Provider-originated facts remain distinct from NORTHSTAR-authored metadata.
4. **Field-level provenance.** Externally sourced and user-overridden fields record origin, authority, and observation/change time.
5. **Derived views are rebuildable.** Dashboard cards, calendar projections, summaries, and AI context are derived views, not new sources of truth.
6. **No silent destructive merge.** Unknown and conflicting states remain reviewable.

### 4.2 Proposed logical entities

| Entity | Domain owner | Relationships / notes |
|---|---|---|
| AcademicTerm | Academic structure | Courses and term dates |
| Course | Course domain | Term, assignments, grade items, resources |
| EnrollmentContext | Course domain | Course and user participation context |
| Assignment | Coursework domain | Course, submissions, grade items, events |
| Submission | Coursework domain | Assignment, files, receipts, feedback; distinguish draft, queued, provider-confirmed |
| GradeItem | Grade domain | Course, assignment, feedback; official and projected values remain distinct |
| Feedback | Grade/coursework domain | Grade item, submission, instructor/source |
| AcademicEvent | Calendar domain | Course, assignment, term; provider-sourced or user-created |
| Resource | Resource domain | Course, files, bookmarks |
| FileAsset | Materials domain | Resource, submission, note, study artifact |
| PersonalNote | Personal workflow domain | Course, assignment, resource |
| StudyArtifact | Study domain | Course, resource, assignment |
| Notification | Notification domain | Triggering entity/event and user preferences |
| SyncOperation | Sync domain | Entity, adapter, attempt, idempotency key |
| ConflictRecord | Sync/domain boundary | Entity, field, competing versions and resolution |
| ProvenanceRecord | Shared metadata | Entity, field, source, authority and observation |

These are logical planning entities, not a final database schema. Exact fields, cardinalities, deletion semantics, and storage formats remain to be designed.

### 4.3 Identity and versioning

- Each canonical entity receives a stable NORTHSTAR ID independent of provider identifiers.
- External IDs are namespaced by provider, connection/account, and entity type.
- Mutable records carry a monotonic local revision or equivalent version token.
- Provider versions, ETags, timestamps, and cursors are retained when available but are not assumed to be globally comparable clocks.
- Deletion/archive uses explicit lifecycle or tombstone states where synchronization requires them; absence from a partial provider response is not proof of deletion.
- Relationships reference canonical IDs; projections do not duplicate entities to simplify a screen.

## 5. Field authority and provenance

### 5.1 Initial authority matrix

| Record / field group | Default authority | NORTHSTAR behavior |
|---|---|---|
| Official course name, code, section, term association | Institution / Canvas | Read and display; local aliases stored separately |
| Official assignment title, instructions, points, due date, availability | Canvas / institution | Read and project; personal reminders remain separate |
| Official submission state, timestamp, receipt | Canvas / institution | Display provider-confirmed state; queued/pending remains distinct |
| Official grade, grading status, instructor feedback | Canvas / institution | Read and annotate; never overwrite |
| Provider course/resource content | Provider source | Cache with source and freshness metadata |
| Personal priority, planning status, reminders | NORTHSTAR | User-controlled |
| Personal notes, bookmarks, study artifacts, review history | NORTHSTAR | User-controlled |
| Local draft and unsent work | NORTHSTAR until provider acceptance | Persist and label pending/unsent |
| Workload/progress summaries and projected grades | NORTHSTAR calculation | Mark calculated/estimated and expose inputs |
| Display preferences and workspace arrangement | NORTHSTAR | User-controlled |

Authority is assigned per field and provider capability. Unsupported provider capabilities must be labeled unavailable or unverified, not simulated as authoritative data.

### 5.2 Provenance envelope

Fields requiring provenance should carry:
- value and normalized representation;
- source kind (provider, NORTHSTAR user, system-derived, imported);
- source identifier and external record reference where applicable;
- authority classification;
- observed-at and source-updated-at timestamps when available;
- local revision and provider version/ETag when available;
- freshness state (current, stale, unknown, unavailable);
- transformation/calculation metadata for derived values.

Provenance must survive caching, projection, export, conflict handling, and recovery. User-facing surfaces expose meaningful source and freshness information without excessive visual noise.

## 6. Cross-workspace ownership and projections

| Workspace | Reads canonical data | Owns writes to | Must not independently own |
|---|---|---|---|
| Dashboard | Courses, assignments, events, grades, notifications, progress | Layout/preferences and allowed dismissals | Copies of official course/assignment/grade records |
| Courses | Terms, courses, assignments, resources, grades | Personal notes and organization | Separate official course/assignment facts |
| Assignments | Assignments, submissions, files, feedback, course context | Personal status, priority, notes, drafts; provider actions through authorized adapter | Provider-confirmed submission or grade state |
| Calendar | Terms, assignments, events, schedules | User-created events and personal reminders | Detached duplicate due-date facts |
| Gradebook | Grade items, assignments, feedback, grading metadata | Scenario settings and annotations | Official grades or instructor feedback |
| Resources | Provider resources, files, bookmarks, notes | Bookmarks, tags, personal collections | Independent copies of provider resource truth |
| Study Lab | Courses, resources, learning objectives, study artifacts | Flashcards, practice history, guides, review scheduling | Course/assignment source records |
| Review Center | Drafts, assignment context, feedback, review history | Review comments and user-approved revisions | Official submission/grade changes |
| AI Workspace | Permission-filtered canonical context | User-approved actions through domain services | Direct writes bypassing domain authorization |
| Notifications | Domain events and preferences | Notification preferences and read/dismiss state | New copies of triggering academic facts |

Workspace projections may cache and shape data for performance, but remain rebuildable from canonical records and user preferences.

## 7. Event and update propagation

### 7.1 Internal event contract

Domain changes publish typed, versioned events through a shared contract. Example families include CourseUpdated, AssignmentChanged, SubmissionDraftSaved, SubmissionQueued, SubmissionConfirmed, SubmissionFailed, GradeUpdated, FeedbackReceived, AcademicEventChanged, ResourceUpdated, PersonalNoteChanged, StudyArtifactChanged, SyncProgressed, SyncFailed, ConflictDetected, and ConflictResolved.

Events carry event ID, entity ID, entity revision, event type, occurred-at time, source, and correlation/causation identifiers where useful. Consumers must be idempotent. Sensitive content should not be copied into broad event payloads when a scoped entity reference is sufficient.

### 7.2 Propagation flow

1. A domain validates and commits a transition through its owning service.
2. The canonical record and event/outbox record are persisted consistently where supported by the chosen storage design.
3. Subscribers update relevant projections, derived views, and notification candidates.
4. UI surfaces update from shared state rather than mutating separate copies.
5. External adapter changes enter through the same validation and provenance pipeline.
6. Failed subscribers retry safely; duplicate events do not duplicate effects.

### 7.3 External update strategy

- Use provider webhooks/events only where officially supported and securely verifiable.
- Where push events are unavailable, use bounded polling, provider-aware rate limits, incremental cursors, and backoff.
- Provide manual refresh as a fallback.
- Show last successful sync, active operation, stale state, partial failure, and recovery action.
- Do not promise real-time updates when the provider only supports periodic polling.
- Treat provider events as signals to retrieve and validate source data, not automatically as complete trusted record updates.

## 8. Synchronization lifecycle and reliability

Proposed operation states: queued, eligible, running, succeeded, waiting-for-network, waiting-for-auth, retry-scheduled, needs-user-action, conflict, failed, cancelled, and expired.

Required behaviors:
- stable idempotency key per logical operation;
- bounded exponential backoff with jitter for transient failures;
- no automatic retry for permission denial or invalid input without correction;
- checkpoints for multi-step operations;
- provider rate-limit handling and duplicate-event suppression;
- distinction between local save, queued write, request accepted, and provider-confirmed completion;
- operation history with diagnostics that do not expose credentials or sensitive content;
- retry/resume/discard controls only where semantically safe and authorized.

## 9. Conflict detection and resolution

### 9.1 Triggers

- The same authoritative field changes remotely and locally before synchronization.
- Provider version changes after fetch but before write.
- Offline edit targets a record deleted, moved, or made unavailable remotely.
- Queued operations depend on incompatible revisions.
- External response is incomplete or ambiguous.

### 9.2 Resolution policy

1. Detect using provider version/ETag, local revision, timestamps, and field-specific semantics where available.
2. Preserve base, current provider, and local proposed versions.
3. Classify the field as source-owned, NORTHSTAR-owned, safely mergeable, or review-required.
4. Apply only deterministic, lossless merges explicitly allowed by field policy.
5. Pause unresolved operations and present a clear review surface.
6. Record user resolution and resulting revision/provenance.
7. Never use last-write-wins as a universal fallback.
8. Never convert queued/pending submission into provider-confirmed submission without provider evidence.

## 10. Offline and recovery behavior

### 10.1 Cached reads

- Cache only records needed for supported offline workflows and within privacy/storage limits.
- Show last-updated time and stale/unavailable state.
- Distinguish cached official records from current provider state.
- Do not present cached grades, deadlines, or submission states as freshly verified.

### 10.2 Offline writes

- Permit explicitly supported NORTHSTAR-owned local edits offline.
- Durably persist drafts and personal workflow changes before confirming local save.
- Queue external writes only when safe to defer and explicitly authorized.
- Do not queue actions requiring immediate provider validation or whose delayed execution may become unsafe without renewed confirmation.
- Store operation intent, target revision, idempotency key, permission requirements, and dependency order.
- Expose pending operations; cancellation is available only when safe.

### 10.3 Reconnect reconciliation

1. Re-establish connectivity and validate authentication/permissions.
2. Refresh relevant provider records and versions before replay.
3. Re-evaluate operations against current authority and dependencies.
4. Replay only idempotent, still-authorized operations.
5. Create conflict records when assumptions no longer hold.
6. Update projections and operation status from confirmed outcomes.
7. Preserve local drafts and unresolved changes; never discard them after failed replay.

Define cache quotas, eviction priorities, sensitive-data exclusions, disconnect behavior, and retention before implementation. Eviction must never silently delete the only copy of unsynced work.

## 11. Security and permission boundaries

- Provider access uses explicit adapters and the approved server-side security boundary where credentials or privileged operations are involved.
- Browser code contains no provider secrets or privileged long-lived tokens.
- Domain services enforce authorization for writes; UI visibility is not authorization.
- AI context follows approved context policy, course boundaries, least privilege, and source transparency.
- Consequential actions (submissions, provider edits, destructive operations, external sends) require preview and explicit user approval.
- Logs/events minimize sensitive content; credentials, tokens, and private document contents are excluded from routine diagnostics.
- Cache data is scoped to the single-user profile and protected by the eventual storage/security design.
- Disconnect, credential expiry, and permission revocation halt affected writes while preserving pending user work for review.

## 12. Acceptance and verification plan

These are future verification requirements, not claims that tests have run.

| Area | Required evidence |
|---|---|
| Canonical identity | Same course/assignment referenced consistently across workspaces; duplicate prevention tests |
| Ownership/provenance | Tests prove Canvas-owned fields cannot be overwritten by personal overlays |
| Event propagation | Event ordering, duplicate delivery, retries, and subscriber recovery contract tests |
| Projection consistency | Cross-workspace integration tests after supported domain transitions |
| Sync reliability | Retry/backoff, rate-limit, idempotency, interrupted operation, partial failure tests |
| Conflict handling | Concurrent edit, stale version, deletion, ambiguous response, and user resolution tests |
| Offline reads | Cached freshness indicators and stale-data tests |
| Offline writes | Durable draft/queue, permission, safe cancellation, and quota tests |
| Reconnect | Replay order, deduplication, revalidation, and conflict preservation tests |
| Security | Secret scanning, authorization, permission revocation, safe logging, cache isolation review |
| iPad experience | Safari offline/online transition, touch, orientation, and recovery usability acceptance |

No requirement becomes accepted merely because this plan exists. Acceptance requires recorded evidence from implementation and verification.

## 13. New traceability requirements

- **NS-CAI-001:** One canonical academic data layer with domain ownership and workspace projections.
- **NS-CAI-002:** Typed, versioned, idempotent internal event propagation.
- **NS-CAI-003:** Provider-aware external update strategy with supported webhooks/polling and manual refresh fallback.
- **NS-CAI-004:** Field-level source authority and durable provenance.
- **NS-CAI-005:** Conflict preservation, review, and auditable resolution; no universal last-write-wins.
- **NS-CAI-006:** Offline cached reads with freshness indicators and bounded cache policy.
- **NS-CAI-007:** Durable offline local writes and safe, idempotent reconnect reconciliation.
- **NS-CAI-008:** Visible synchronization lifecycle, error, retry, and recovery status.
- **NS-CAI-009:** Permission-aware adapter and domain-service boundaries for provider writes.
- **NS-CAI-010:** Cross-workspace consistency and recovery verification.

All are planning requirements; implementation status remains Not implemented or Not verified until evidence exists.

## 14. Risks and mitigations

| Risk | Impact | Planning mitigation |
|---|---|---|
| Canonical model becomes a monolith | Tight coupling | Domain ownership, explicit contracts, dependency boundaries |
| Provider APIs lack push support | Delayed freshness | Capability-aware polling, manual refresh, visible freshness |
| Conflicting clocks/timestamps | Incorrect merges | Provider versions and field-specific rules; no universal timestamp winner |
| Offline queue replays stale actions | Incorrect provider mutation | Revalidate permissions, revisions, and operation safety |
| Cached official data appears current | Poor academic decisions | Persistent freshness labels and last-sync details |
| Duplicate events create duplicate actions | Repeated alerts/submissions | Idempotency keys, event deduplication, operation receipts |
| Cache eviction removes unsynced work | User data loss | Protected unsynced-data retention and recovery tests |
| Workspace projections drift | Inconsistent academic state | Rebuildable projections and cross-workspace contract tests |

## 15. Next planning work

1. Expand logical entities into a field-level schema and relationship catalogue.
2. Map actual Canvas capabilities and limitations against the authority matrix (research/specification only unless live access is separately authorized).
3. Define exact sync-operation and conflict-review state machines.
4. Specify storage/cache retention and backup/recovery policy.
5. Map existing legacy data and behaviors to canonical entities without modifying source.
6. Complete requirement dependencies and acceptance matrices.
7. Update Engineering Foundation planning brief and risk register.

## 16. Detailed Data Architecture Planning checkpoint — 2026-11-25

The user approved A/A/A/A/A for the next planning scope: comprehensive field-level model; comprehensive Canvas capability matrix; explicit data-class lifecycle policy; full legacy capability/data mapping; and complete verification blueprint.

Supporting specifications:
- CANONICAL-ACADEMIC-DATA-MODEL.md — logical entities, field contracts, authority boundaries, relationships and projection rules.
- CANVAS-CAPABILITY-AND-AUTHORITY-MATRIX.md — capability domains, evidence classification, field authority and provider verification gate.
- OFFLINE-CACHE-RETENTION-AND-RECOVERY-POLICY.md — cache classes, freshness, quota/eviction, backup, restore, disconnect and term archive.
- LEGACY-CAPABILITY-AND-DATA-MIGRATION-MAP.md — capability-led preservation and migration stages.
- DATA-ARCHITECTURE-VERIFICATION-BLUEPRINT.md — requirement acceptance matrix, failure scenarios, evidence standard and release gates.

New traceability requirements: NS-DATA-004, NS-CAN-003, NS-DATA-005, NS-MIG-001 and NS-QUAL-003.

Remaining planning work:
1. Populate endpoint-by-endpoint Canvas evidence from current official documentation; target-tenant verification remains unperformed and separately gated.
2. Decide exact freshness thresholds, quotas, retention periods, encryption and backup destination.
3. Complete static source-level inventory of legacy storage keys, call sites, file relationships and hidden dependencies.
4. Resolve exact field enums, timezone semantics, course/assignment identity and grade calculation assumptions.
5. Complete the detailed event/sync/conflict state-machine diagrams and risk review.
6. Conduct a cross-document consistency review and present the final workstream sign-off checkpoint.

The new specifications are proposals for review, not accepted physical schemas or executed migration plans.

## 17. Status and authorization

**Decision status:** Five of five decisions approved.  
**Specification status:** Architecture, ownership, event, sync, conflict, offline, security, and verification specifications drafted.  
**Planning status:** Continue detailed planning; final phase sign-off has not occurred.  
**Authorization:** Planning only. No application code, schema migrations, dependency installation, runtime integration, legacy deletion, production change, or deployment is authorized by this decision record.
