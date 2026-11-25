# NORTHSTAR 5.0 — Canvas Capability and Authority Matrix

**Integrated master:** [Cross-Application Data Architecture](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md)  
**Workstream:** Cross-Application Intelligence / Academic Data & Canvas Intelligence  
**Status:** Detailed planning specification — integrated; dated endpoint research and tenant verification outstanding  
**Decision sources:** CAI-DEC-02/03/04; NS-CAN-001/002; NS-CAI-003/004/009  
**Authorization:** Documentation/research planning only. No live Canvas connection, credential use or institution-specific verification is authorized.

## 1. Evidence classification
Every capability must be marked:
- **Documented contract:** supported by current official Canvas developer documentation for the identified endpoint/version.
- **Tenant-dependent:** may depend on institution configuration, feature flags, course settings or account policy.
- **Permission-dependent:** requires a named OAuth scope, role or user permission.
- **Not established:** reliable evidence is absent; do not assume support.
- **Verified in target tenant:** only after separately authorized testing against the user's institution.

This document does not claim any capability is verified in the target tenant. Before implementation, refresh official documentation and record retrieval date, API version, endpoint, scope, pagination, rate-limit behavior, versioning and deprecation notes.

## 2. Capability domains to inventory

| Domain/object | Read coverage to investigate | Write/action coverage to investigate | Key constraints |
|---|---|---|---|
| Accounts/institutions | Account identity, terms, enrollment context | Administrative operations excluded by default | Tenant scope, role, institution identity |
| Courses | Identity, name, code, term, dates, workflow state | Personal preferences remain local; course mutations not assumed | Enrollment visibility, concluded courses, pagination |
| Sections/enrollments | Section and enrollment context | Enrollment changes excluded absent explicit need | Role visibility, privacy, enrollment state |
| Assignments | Instructions, dates, points, submission types, availability, publication | Create/update only if endpoint, permission and policy support | Overrides, groups, differentiated due dates, external tools |
| Assignment groups | Membership, weights and rules | Not assumed | Weighting/drop rules for grade calculations |
| Submissions | Attempt, state, timestamp, late/missing/excused indicators | Submission operations require separate high-risk contract | Upload flow, allowed types, attempts, receipt confirmation |
| Submission comments/feedback | Comments, rubric and feedback where permitted | Posting comments not assumed | Student visibility, hidden comments, grading workflow |
| Grades/gradebook | Student-visible score, points and grading state | Grade mutation excluded | Provisional vs posted grades, hidden grades, final calculation |
| Calendar/events | Course events and assignment due dates where exposed | Personal events remain local | Timezones, recurrence, duplicate deadline mapping |
| Modules/pages/files | Module structure, pages, files and linked resources | Upload/edit not assumed | Publication, access restrictions, link expiration |
| Quizzes | Quiz metadata and allowed student-facing data | Attempt/answer/submit are high risk | Classic/New Quizzes differences, availability, attempt policy |
| Discussions | Topics and user-visible participation | Posting/editing not assumed | Moderation, group scope, permissions |
| External tools/LTI | Launch metadata and links where available | Secure launch only; no credential leakage | LTI version, deep-link, return context, signed launch |
| User/profile | Minimum current-user identity for mapping | Profile changes excluded | Privacy minimization and scope limits |
| Files | Metadata/download access where authorized | Upload/delete requires separate policy | Access control, size, content type, signed URLs |

## 3. Field authority baseline

| Data class | Default authority | NORTHSTAR behavior |
|---|---|---|
| Official course identity/status | Canvas/institution | Read/display with source and freshness |
| Official assignment instructions/due date/points/availability | Canvas/institution | Preserve source value; show personal target date separately |
| Official submission receipt/state/attempt | Canvas/institution | Never infer or fabricate; reconcile ambiguous outcomes |
| Official score/rubric/feedback | Canvas/institution | Display source data; personal forecast/reflection separate |
| Personal priority, plan, checklist, notes, study progress | NORTHSTAR/user | Persist locally and sync only through approved NORTHSTAR mechanisms |
| Personal calendar blocks/reminders | NORTHSTAR/user | No Canvas write unless separately approved |
| Imported but unverified records | Unverified | Label and validate before authoritative use |
| Derived progress/forecast | NORTHSTAR/system | Store rule/version and inputs; label as estimate |

## 4. Per-capability evidence record
For each endpoint/workflow record:
1. Object and user goal.
2. Official documentation URL and retrieval date.
3. API version and endpoint/method.
4. Read/write semantics and side effects.
5. Required scopes, role and tenant settings.
6. Pagination, rate limits, concurrency and retry guidance.
7. Version/ETag/updated-at behavior and incremental sync options.
8. Error codes, permission denial and ambiguous timeout behavior.
9. Returned fields, nullable/conditional fields and known omissions.
10. Privacy classification and cache eligibility.
11. Target-tenant verification status and evidence, if separately authorized.
12. Requirement IDs and acceptance tests.

## 5. Synchronization implications
- Use provider-supported incremental retrieval and stable cursors where documented.
- Treat webhooks as available only when official support and secure verification are evidenced.
- If push delivery is not supported, use bounded polling/manual refresh and visible freshness.
- Paginate exhaustively and checkpoint safely; partial-page failure cannot mark a collection complete.
- Respect provider rate limits and retry guidance; use backoff/jitter for transient failures.
- Re-fetch authoritative state after ambiguous writes before potentially duplicative action.
- Store only necessary fields; never persist tokens or signed URLs beyond validity.

## 6. High-risk workflows
Submission, quiz attempt, discussion posting, file upload and other academically consequential actions require distinct operation contracts, preview, explicit confirmation, permission revalidation, idempotency strategy where supported, receipt capture and post-action reconciliation. A generic sync control cannot imply a consequential action completed.

## 7. Verification gate
Before live Canvas work:
- User explicitly authorizes the specific tenant test and action scope.
- Test account/role and least-privilege scopes are documented.
- Read-only capability discovery is separated from write testing.
- No production coursework mutation is used as a test.
- Test data, rollback/cleanup, evidence retention and privacy are defined.
- Target-tenant verification is claimed only for the exact tested capability and conditions.

**Disposition:** Matrix structure and authority baseline drafted. Endpoint support and target-tenant behavior remain to be researched/verified; no live Canvas access was performed.
