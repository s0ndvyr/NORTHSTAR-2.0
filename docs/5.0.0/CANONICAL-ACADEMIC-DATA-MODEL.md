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
