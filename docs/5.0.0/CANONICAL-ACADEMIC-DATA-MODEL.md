# NORTHSTAR 5.0 — Canonical Academic Data Model and Relationship Catalogue

**Integrated master:** [Cross-Application Data Architecture](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md)  
**Workstream:** Cross-Application Intelligence  
**Status:** Detailed planning specification — integrated; review pending  
**Decision sources:** CAI-DEC-01, CAI-DEC-03, CAI-DEC-04; NS-DATA-001/002; NS-CAI-001/004/005  
**Authorization:** Planning only. This is a logical model, not a database schema or migration instruction.

## 1. Design invariants
1. Each shared academic fact has one canonical identity and one owning domain.
2. Workspaces consume projections; they do not own competing copies of shared facts.
3. Official institution facts and personal NORTHSTAR overlays remain distinguishable.
4. Every externally sourced or derived field carries provenance, authority, freshness, and revision context.
5. External identifiers are namespaced by provider and institution/account scope; they are not internal primary keys.
6. Deletion, archival, merge, and identity changes are explicit lifecycle transitions with audit references.
7. Derived values are reproducible from canonical inputs and rule versions.
8. A projection may be rebuilt; it must not become the only durable copy of user-authored work.

## 2. Conceptual entity catalogue

| Entity | Owning domain | Key relationships | Authority boundary |
|---|---|---|---|
| AcademicTerm | Academic structure | has Courses; scopes AcademicEvents | Institution dates may be provider-owned; personal labels local |
| Course | Course domain | belongs to AcademicTerm; has Assignments, GradeItems, Resources, Notes | Official identity/name/section/instructor/status from institution; personal color, goals and notes local |
| Assignment | Coursework domain | belongs to Course; has Submissions, GradeItems, AcademicEvents, Resources | Official title/instructions/due date/points/availability from source; priority, plan, checklist and progress overlay local |
| Submission | Coursework domain | belongs to Assignment; references FileAssets and provider receipt | Provider receipt/status/attempt/time authoritative; local draft and queued intent separate |
| GradeItem | Gradebook domain | belongs to Course; may reference Assignment | Official score/rubric/feedback provider-owned; personal target/forecast separate |
| AcademicEvent | Calendar domain | optionally relates to Course, Assignment, Submission or StudySession | Source events retain source authority; personal blocks/reminders NORTHSTAR-owned |
| Resource | Resource domain | belongs to Course or Assignment; references FileAsset or external URL | Source metadata provenance retained; personal bookmark/tags local |
| PersonalNote | Notes domain | links to Course, Assignment, Resource or StudySession | User-authoritative; never overwritten by provider refresh |
| FileAsset | Materials domain | attaches to Submission, Resource, PersonalNote or StudyArtifact | Bytes, ownership, origin, checksum, access and retention explicit |
| StudyArtifact | Study domain | belongs to Course; may cite Resources/Assignments | User-authoritative; AI-generated draft provenance retained |
| StudySession | Study domain | references Course, StudyArtifact and AcademicEvent | User-authoritative activity |
| ExternalReference | Integration boundary | links provider object to canonical entity | Provider-scoped, unique within declared scope, revocable |
| ProvenanceRecord | Data governance | applies to entity field or derived value | Immutable history reference; minimum necessary evidence |
| SyncOperation | Integration domain | targets entity/command; may depend on other operations | Tracks intent/outcome; does not confer provider authority |
| ConflictRecord | Data governance | references base/source/local versions and resolution | Preserves competing values and decision history |
| AuditEvent | Governance | records consequential transitions | Append-oriented, minimized, access-controlled |

## 3. Field-level contract

Every field definition must document: key; type/format; nullability; cardinality; owning domain; authority class; source precedence; local editability; provider writability; sensitivity; derivation rule; freshness requirement; lifecycle behavior; validation; and verification evidence.

A sourced field-value envelope conceptually contains value and normalized representation; source kind and scoped source ID; authority class (provider-authoritative, user-authoritative, system-derived, imported-unverified, unresolved-conflict); observed-at and source-updated-at timestamps; provider revision/ETag/cursor where available; local entity revision and schema version; freshness classification; transformation/rule version; and provenance/conflict references.

Do not collapse provider value and personal overlay into one field. For example, official due date and personal planning due date are separate concepts; the latter cannot silently alter the former.

## 4. Core field catalogue

### Course
- Identity: internal ID, provider references, institution scope, term ID.
- Official: course code, title, section, status, instructor references, start/end dates, source URL.
- Personal: display color, pinned state, personal label, goal, archived-in-personal-view state.
- Derived: assignment counts, completion summaries, workload estimates and progress indicators, each with rule version and calculation time.

### Assignment
- Identity/relationships: internal ID, course ID, provider references, parent/module reference where applicable.
- Official: title, instructions, due date, availability window, points possible, submission types, published/locked state, group/category, allowed attempts, external tool reference.
- Personal: priority, personal target date, checklist, notes, estimated effort, planned work blocks, personal workflow status.
- Derived: overdue flag, urgency rank and completion estimate, computed from explicit source fields and rule version.
- Guardrail: personal status never rewrites official submission status.

### Submission
- Identity/relationships: assignment ID, attempt ID, linked file IDs, provider reference.
- Local workflow: draft revision, queued intent, approval reference, local timestamps.
- Provider facts: attempt number, receipt, submitted-at, official state, late flag, server response/version.
- Guardrail: draft saved, queued, sent, accepted and officially confirmed are distinct states.

### GradeItem
- Official: score, points possible, grading status, rubric, feedback, graded-at, excused/missing flags, provider version.
- Personal: target score, private reflection, forecast assumptions.
- Derived: weighted contribution and projected course grade with explicit syllabus assumptions and formula version.
- Guardrail: forecasts are never displayed as official grades.

### AcademicEvent
- Official: title, start/end, timezone, location/join URL, recurrence/source reference, cancellation state.
- Personal: event category, reminders, color, private notes, visibility.
- Guardrail: assignment deadlines are projected from Assignment, not duplicated as independent authoritative events.

### Resource and FileAsset
- Resource: title, description, source URL, course/assignment relation, provider metadata, personal tags/bookmark.
- FileAsset: stable ID, filename, media type, byte size, checksum, origin, storage reference, ownership, encryption classification, scan/availability state, retention class.
- File bytes and metadata have separate lifecycle and access controls.

### PersonalNote and StudyArtifact
- Note: title/body, linked entities, tags, revisions, autosave state and export reference.
- Study artifact: type, content revision, source citations, generation method, review state, course scope and retention state.
- AI-assisted content retains provenance and is not presented as provider-authored material.

## 5. Relationship and integrity rules
- Provider deletion is first represented as source-unavailable/tombstoned; local notes, drafts and files remain recoverable.
- Assignment identity is stable across title/due-date edits; matching never relies on title alone.
- Submission attempts remain distinguishable; retries never overwrite prior receipts.
- GradeItem may map to Assignment, but unlinked gradebook rows remain valid.
- AcademicEvent may reference Assignment but is not a second source of truth for its deadline.
- FileAsset relationships use explicit attachment records with role and lifecycle.
- Notes/study artifacts may link to archived courses without deletion.
- ExternalReference uniqueness includes provider, institution/account scope, object type and external ID.
- Ambiguous duplicate matching creates a review task, never an automatic merge.

## 6. Workspace projections
Dashboard, Courses, Assignments, Calendar, Gradebook, Resources, Study Lab, Review Center and AI Workspace are projections over canonical domain data. Each declares required fields, freshness behavior, derived calculations, empty/error/offline states and refresh triggers. Projection caches are disposable only when canonical sources are durable.

## 7. Open decisions before implementation
Confirm exact enum vocabularies, timezone policy, term/course identity across institutions, assignment group semantics, grade weighting/rounding, file security classification, audit retention and provider snapshot retention. These require source audit and provider evidence; do not guess.

## 8. Acceptance evidence
- Entity/field ownership matrix reviewed and approved.
- Referential integrity and external identity collision tests specified.
- Provider values cannot be overwritten by personal overlays.
- Archive/tombstone preserves user-authored dependents.
- Projections rebuild without loss or duplicate records.
- Derived grade/progress values reproduce from versioned inputs.
- Every sourced/derived field has provenance and freshness semantics.

**Disposition:** Logical model proposed for review; no physical schema, code or migration authorized.



## 9. Scope reconciliation for provider-owned submission state — NS-SCOPE-001

The earlier `Submission` entity catalogue is retained as historical modeling work, but its target 5.0 role is restricted:

- NORTHSTAR does not create, edit, upload, submit, re-submit, score or complete a provider submission.
- If a provider-owned submission/status fact is required for assignment tracking, represent only the minimum read-only status metadata needed: provider namespace/account, course/assignment external identity, current-user context, status, provider-updated/observed timestamps and provenance/freshness.
- Do not model local answer bodies, attempt timers, upload staging, draft payloads, idempotency keys for submission writes or simulated receipts as active 5.0 entities.
- Provider status fields are optional/permission-dependent. Missing data is `unknown/unavailable`, not an inferred `not submitted` state.
- The new app must not expose a command or adapter method that can initiate a provider submission. Submitted/Graded demo records are display-only; personal workflow statuses remain separate.

The old detailed Submission fields and relationships remain in this document to preserve the approved historical design record, but are **not implementation requirements** unless a later owner decision explicitly reopens that scope. See NS-SCOPE-001 and NS-CAI-009 restriction in the traceability register.




## 10. Detailed logical schema and ownership contract — 2026-11-25

This is the canonical logical contract for future implementation and verification. It does not claim that every entity is present in the current app or that a database migration has been executed. Provider records remain unavailable until NS-CAN-011 is resolved.

### 10.1 Common identity and provenance envelope

| Field | Type / nullability | Authority | Rules |
|---|---|---|---|
| `id` | non-empty string, required | NORTHSTAR | Stable opaque canonical ID; never coerce a 64-bit provider ID to a JavaScript number |
| `externalRefs[]` | array, zero or more | Provider mapping | Each reference includes provider, tenant/account scope, object type and external ID string |
| `sourceKind` | enum, required | NORTHSTAR | `provider`, `user`, `imported`, `derived`, `demo` |
| `createdAt`, `updatedAt` | ISO 8601 instant, required | NORTHSTAR | UTC canonical storage; retain original provider timestamp/offset in provenance when needed |
| `revision` | non-negative integer, required for local mutable records | NORTHSTAR | Monotonic per canonical record; provider version/ETag is separate |
| `provenance[]` | array, zero or more | NORTHSTAR | Field-level source, authority, observed time, source-updated time and transform version |
| `deletedAt` | ISO 8601 instant or null | NORTHSTAR | Optional tombstone; do not hard-delete user-owned dependents when a provider source disappears |

### 10.2 Core academic entities

| Entity | Required fields | Optional fields | Ownership and invariants |
|---|---|---|---|
| **AcademicTerm** | `id`, `name`, `sourceKind` | `startsAt`, `endsAt`, `status`, `externalRefs[]` | Provider term dates/status are provider-owned; personal grouping/label is user-owned; dates may be unknown |
| **AcademicCourse** | `id`, `name`, `sourceKind` | `termId`, `code`, `section`, `instructorNames[]`, `startsAt`, `endsAt`, `workflowState`, `personalLabel`, `externalRefs[]` | Provider identity/code/term/state are read-only; personal label, goals and organization are NORTHSTAR-owned; course editor must never mutate Canvas |
| **AcademicAssignment** | `id`, `courseId`, `title`, `sourceKind` | `description`, `dueAt`, `unlockAt`, `lockAt`, `pointsPossible`, `assignmentGroupRef`, `published`, `availability`, `submissionTypes[]`, `externalUrl`, `personalPriority`, `personalTargetAt`, `personalStatus`, `estimateMinutes`, `notes`, `externalRefs[]` | Course relationship is required; provider instructions/due/points/availability are read-only; personal target/priority/notes/status are separate; `submissionTypes` is descriptive metadata only and cannot enable a submission action |
| **ProviderAssignmentState** | `id`, `assignmentId`, `provider`, `tenantScope`, `observedAt` | `providerStatus`, `providerUpdatedAt`, `late`, `gradeVisibility`, `externalRef` | Optional read-only provider snapshot, only if authorized and necessary; no answer body, upload, attempt, receipt, timer or write command; absent/hidden values remain unknown |
| **GradeItem** | `id`, `courseId`, `title`, `sourceKind` | `assignmentId`, `score`, `pointsPossible`, `percentage`, `letterGrade`, `status`, `feedback`, `gradedAt`, `isHidden`, `externalRefs[]` | Provider scores/feedback are read-only and permission-dependent; estimates are separate derived records; null is not zero |
| **AcademicEvent** | `id`, `title`, `startAt`, `endAt`, `kind`, `sourceKind` | `courseId`, `assignmentId`, `timezone`, `allDay`, `location`, `url`, `recurrence`, `reminders[]`, `notes`, `externalRefs[]` | Provider events read-only; personal blocks/reminders NORTHSTAR-owned; end must be after start unless all-day semantics explicitly apply |
| **AcademicResource** | `id`, `courseId`, `title`, `kind`, `sourceKind` | `assignmentId`, `description`, `contentHtml`, `url`, `fileAssetIds[]`, `tags[]`, `visibility`, `externalRefs[]` | Provider resources are read-only; HTML is untrusted and must be sanitized before rendering; links are external handoff, not editor entry points |
| **FileAsset** | `id`, `ownerType`, `ownerId`, `fileName`, `mimeType`, `sizeBytes`, `storageRef`, `sourceKind`, `createdAt` | `checksumSha256`, `providerUrl`, `visibility`, `locked`, `encryptionState`, `retentionClass`, `deletedAt` | Binary bytes live outside the canonical JSON snapshot; access and visibility are explicit; never assume a provider URL is public or durable |
| **PersonalNote** | `id`, `body`, `sourceKind=user` | `courseId`, `assignmentId`, `resourceId`, `tags[]`, `createdAt`, `updatedAt`, `revision` | User-owned; never overwritten by provider refresh |
| **StudyArtifact** | `id`, `courseId`, `kind`, `sourceKind=user` | `prompt`, `answer`, `content`, `sourceRefs[]`, `nextReviewAt`, `intervalDays`, `easeFactor`, `repetitions` | Flashcards, guides and non-assessment learning aids only; no quiz question/attempt/score entity |
| **WritingDraft** | `id`, `title`, `content`, `updatedAt`, `sourceKind=user` | `courseId`, `assignmentId`, `feedback`, `riskLabel`, `revision` | Local writing feedback/draft aid only; not a document editor or submission artifact |

### 10.3 Cross-application and synchronization entities

| Entity | Required fields | Optional fields | Rules |
|---|---|---|---|
| **ExternalReference** | `provider`, `tenantScope`, `objectType`, `externalId`, `canonicalEntityType`, `canonicalEntityId` | `sourceUrl`, `providerUpdatedAt`, `lastSeenAt`, `lastVerifiedAt`, `status` | Provider IDs are strings; uniqueness key is provider + tenant/account + object type + external ID; one canonical entity may have multiple provider references |
| **FieldProvenance** | `entityType`, `entityId`, `fieldPath`, `authority`, `observedAt` | `provider`, `tenantScope`, `externalId`, `sourceUpdatedAt`, `transformVersion`, `freshness` | Authority enum: provider/user/imported/derived/demo; record per field where values may conflict |
| **SyncCheckpoint** | `provider`, `tenantScope`, `objectType`, `scopeKey`, `status` | `nextLink`, `pageCount`, `lastAttemptAt`, `lastSuccessAt`, `retryAt`, `errorClass`, `partial` | Checkpoints apply to read pagination only in current 5.0; follow opaque provider next links; do not invent cursors |
| **SyncRun** | `id`, `provider`, `tenantScope`, `startedAt`, `trigger`, `status` | `finishedAt`, `pagesRead`, `recordsRead`, `requestCost`, `rateLimitRemaining`, `correlationId`, `errorCode` | No access token, private payload or raw authorization header in logs |
| **ConflictRecord** | `id`, `entityType`, `entityId`, `detectedAt`, `localRevision`, `persistedRevision` | `fieldPath`, `baseValue`, `localValue`, `providerValue`, `resolutionStatus`, `resolvedAt`, `resolutionActor` | Never silently choose between user-owned and provider-owned values; preserve both sides until explicit resolution |
| **AuditEvent** | `id`, `actor`, `action`, `entityType`, `entityId`, `occurredAt` | `reason`, `correlationId`, `source`, `result` | Metadata only; do not copy grades, note bodies, file bytes, tokens or full private payloads into logs |

There is no target 5.0 `ProviderWriteOperation`, `SubmissionAttempt`, `QuizAttempt` or `DocumentEditorSession` entity. If later authorized scope changes, those require a new decision and model revision.

### 10.4 Relationship cardinality

- AcademicTerm 1 → 0..N AcademicCourse.
- AcademicCourse 1 → 0..N AcademicAssignment, AcademicEvent, AcademicResource, GradeItem, StudyArtifact and PersonalNote.
- AcademicAssignment 1 → 1 AcademicCourse; 0..N GradeItem; 0..N AcademicEvent; 0..N FileAsset; 0..N PersonalNote/WritingDraft; 0..1 current ProviderAssignmentState.
- AcademicResource 1 → 1 AcademicCourse; 0..N FileAsset.
- FileAsset belongs to one canonical owner record; its Blob is stored separately from JSON metadata.
- ExternalReference N → 1 canonical entity; each provider object maps to at most one canonical entity within the same tenant/type namespace unless a documented merge decision exists.
- FieldProvenance N → 1 entity/field path; SyncCheckpoint is unique per provider/tenant/object/scope key.
- ConflictRecord references one entity and one or more competing revisions; SyncRun references its checkpoints but never owns academic content.

### 10.5 Authority, nullability and validation rules

1. **Provider-owned:** course/assignment identity, official instructions, due/lock/unlock times, published/availability state, official grade/feedback and provider event/resource content. Read-only; preserve source and freshness.
2. **User-owned:** personal course labels, goals, notes, priorities, target dates, personal calendar blocks, flashcards, study guides and writing drafts. Provider refresh must not overwrite.
3. **Derived:** completion percentages, workload forecasts, priority rankings and grade projections. Store formula/version and source inputs; label as estimates.
4. **Imported/unverified:** user-supplied CSV/JSON or third-party exports. Keep separate until validation and provenance are established.
5. Use explicit nullable/unknown values. Missing grade, due date, provider status or permission is not zero/false/not-submitted.
6. IDs and external IDs are strings. Canvas 64-bit IDs must use string-ID response mode where supported.
7. Timestamps are timezone-aware ISO 8601. Preserve the original timezone/offset and normalize canonical instants to UTC.
8. Scores and points are non-negative; percentages are derived only when denominator and provider grading semantics are known. Do not clamp or invent hidden/unposted values.
9. `courseId` is required for assignment/resource/grade/study entities; referenced IDs must exist or be marked orphaned/unavailable.
10. External URLs require safe-scheme validation and source attribution. Provider HTML is sanitized before rendering.
11. File size, MIME type and checksum are validated before storage; actual storage quota and retention limits remain platform-dependent and require measurement.
12. Local personal status and provider-owned status are separate. Submitted/Graded provider states are read-only; a local planning action cannot create them.

### 10.6 Lifecycle and retention

- Provider disappearance, enrollment removal or permission revocation marks source data stale/unavailable or tombstoned; it does not automatically delete user-owned notes, plans, drafts or attachments.
- Local records persist until explicit user deletion/reset or browser/device data loss; no cloud retention or automatic expiration is currently implemented.
- Attachment bytes require a separate manifest/archive lifecycle; current JSON backup does not include them (NS-DATA-007).
- Conflict snapshots must retain both competing local states until a verified export/explicit acknowledgement; automatic clearing after initiating a download is not acceptable.
- Numeric retention periods, automatic purge rules, attachment total quota and cross-device recovery are unresolved and must not be invented.

### 10.7 Current implementation mapping and gaps

The current `apps/web/src/domain/academic.ts` implements `AcademicTerm`, `AcademicCourse`, `AcademicAssignment`, `AcademicEvent`, `GradeItem`, `AcademicResource`, `StudyCard`, `WritingDraft`, `AssignmentArtifact` and `AcademicSnapshot`. The repository persists the snapshot in localStorage and file bytes in IndexedDB. The Canvas adapter is unconfigured and exposes only read methods.

Not yet implemented in the app: ExternalReference/tenant namespace, field-level provenance, provider-specific assignment state as a separate entity, durable sync checkpoints/runs, field-level conflict resolution, audit-event ledger, attachment archive/restore, and a cross-provider merge engine. The current `AssignmentStatus` display field still contains demo Submitted/Graded states; the personal updater is now typed to allow only personal statuses. Full physical separation/migration of provider status and personal status remains an implementation task and must be completed before live provider integration.

### 10.8 Unresolved decisions and external dependencies

- NS-CAN-011: written authorization/partnership applicability under the current Instructure API Policy.
- Provider tenant/account namespace and allowed Canvas read scopes.
- Exact grade visibility and student role behavior in the target tenant.
- Whether provider submission status is needed at all for 5.0, and the minimum permitted read-only fields if so.
- Numeric retention, attachment archive, local at-rest encryption and recovery policy.
- Migration/compatibility strategy from the 4.4.x local stores and any imported StudentVUE data.
- Cross-provider identity collision and duplicate-course resolution.
