# NORTHSTAR 5.0 — Canvas Capability and Authority Matrix

**Integrated master:** [Cross-Application Data Architecture](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md)  
**Workstream:** Cross-Application Intelligence / Academic Data & Canvas Intelligence  
**Status:** Official public API baseline researched; route mapping and tenant verification outstanding; policy authorization gate unresolved  
**Decision sources:** CAI-DEC-02/03/04; NS-CAN-001/002; NS-CAI-003/004/006/009; NS-SCOPE-001; NS-CAN-011  
**Research date:** 2026-11-25  
**Authorization:** Public documentation research and local planning only. No live Canvas connection, credential use, tenant request or institution-specific verification has occurred.

## 1. Evidence classification

Every capability must be marked:
- **Documented contract:** supported by current official Canvas developer documentation for the identified endpoint/method.
- **Tenant-dependent:** may depend on institution configuration, feature flags, course settings or account policy.
- **Permission-dependent:** requires a named OAuth scope, role or user permission.
- **Not established:** reliable evidence is absent; do not assume support.
- **Verified in target tenant:** only after separately authorized testing against the user's institution.

Official public documentation does not establish that a capability is enabled for the user's institution. No capability in this matrix is target-tenant verified.

## 2. Product boundary and capability scope

NORTHSTAR is an academic organizer and intelligence layer, not a Canvas/LMS replacement. Canvas remains authoritative for its native assessment, submission and document workflows. The 5.0 app is limited to read-only provider information and external handoff.

| Domain/object | NORTHSTAR 5.0 scope | Provider data / behavior | Exclusions and constraints |
|---|---|---|---|
| Institution/account | Minimal source identity needed for safe account mapping | Canvas domain, account/context identity only if authorized | No admin management or institution mutation |
| Courses/terms | Read and organize course records; approved local course editor for personal NORTHSTAR metadata | Course ID, UUID, name/nickname, code, term, dates, workflow state | No Canvas course creation/editing |
| Sections/enrollments | Read current user's enrollment/section context where permitted | Enrollment type/state, section context, current-user role | Other-user enrollment access is not assumed; no enrollment mutations |
| Assignments | Read instructions, dates, points, availability and external links; organize/personalize locally | Assignment identity, title, description, due/lock/unlock dates, points, submission type metadata and URL | No Canvas assignment create/update/delete; no native submission action |
| Assignment groups | Read weights and grouping rules where needed for gradebook interpretation | Group membership, group weight and relevant grading rules | No mutation; grade calculations must preserve provider rules and disclose estimates |
| Submission/attempt records | **No submission workflow.** A minimal provider-owned status may be displayed read-only only if separately authorized and necessary | Existing provider state/receipt may be treated as external evidence, never inferred from local activity | No submit/upload/re-submit/attempt creation, file upload or receipt simulation in NORTHSTAR |
| Grades/gradebook | Read student-visible grade/score data where permitted; provide separate personal forecasts | Enrollment grade fields and assignment-level grade fields where available | No grade mutation; unposted/hidden values are not assumed visible to students |
| Calendar/events | Read provider calendar events and assignment dates; personal planning blocks remain NORTHSTAR-owned | Event title, start/end, context, workflow state, recurrence and assignment association | No Canvas event create/update/delete |
| Modules | Read module structure and resource graph | Module state, order, unlock/prerequisite information, module items and linked content | Quiz items remain external Canvas links; no quiz engine or attempt handling |
| Pages | Read published/visible course pages and resource metadata | Page title, URL, body HTML, publication/lock state, updated time | No page editor; sanitize untrusted HTML before rendering |
| Files | Read authorized file metadata and external links; content retrieval only after separate access/security review | File ID, name, content type, size, modified time, visibility/lock state | No upload, delete, edit or document editor; do not assume file URL is public or durable |
| Discussions | Not part of current 5.0 integration scope | None planned | No posting, replies, moderation or discussion mirror |
| Quizzes / New Quizzes | Not part of current 5.0 integration scope | At most display an external Canvas module/assignment link as provider-owned content | No quiz metadata workspace, question bank, timed test, answer attempt, scoring or submission engine |
| External tools / LTI | External handoff only where a provider URL is already exposed and safe | Display provider-owned launch/resource link | No LTI launch/signing or credential forwarding without separate design and authorization |
| User/profile | Minimum current-user identity for mapping | Provider user ID and minimum display identity | No profile editing or broad directory access |

**Read-only rule:** The target Canvas adapter allowlist must contain only explicitly approved `GET` operations. No `POST`, `PUT`, `PATCH` or `DELETE` Canvas operation is part of the current 5.0 scope. External service links are not represented as NORTHSTAR actions.

## 3. Official public API evidence captured

The following are documented public API contracts, not target-tenant verification. Scopes shown are the endpoint-specific developer-key scope names in the official docs; actual access also depends on account configuration, token grants and the current Instructure API Policy.

| Capability | Documented endpoint | Documented scope | Mapping notes |
|---|---|---|---|
| Active courses for current user | `GET /api/v1/courses` | `url:GET|/api/v1/courses` | Paginated active course list; map Canvas 64-bit ID as a string, course UUID, code, display name, term and date/workflow fields |
| Course assignments | `GET /api/v1/courses/:course_id/assignments` | `url:GET|/api/v1/courses/:course_id/assignments` | Paginated course assignments; read instructions/due dates/points/availability and provider URLs; no assignment mutations |
| Current-user/course enrollment context | `GET /api/v1/courses/:course_id/enrollments`; `GET /api/v1/users/:user_id/enrollments` | Endpoint-specific `url:GET|...` | Paginated; enrollment rows may repeat for multiple roles/sections; a user may list their own enrollments; do not assume access to other users |
| Student-visible grade fields | Returned on permitted enrollment objects; optional fields include current/final grade and score | Enrollment GET scope | Grade/score fields are permission-dependent; unposted grade fields are typically limited to teachers, TAs and admins; never infer hidden grade data |
| User calendar | `GET /api/v1/calendar_events` | `url:GET|/api/v1/calendar_events` | Paginated current-user events/assignments; supports type and date-range filtering; preserve context codes, workflow state, recurrence and timezone-aware timestamps |
| Course files | `GET /api/v1/courses/:course_id/files` | `url:GET|/api/v1/courses/:course_id/files` | File metadata includes file ID, name, content type, size, visibility and lock state; access to file content is separately permission-controlled |
| Course file quota | `GET /api/v1/courses/:course_id/files/quota` | `url:GET|/api/v1/courses/:course_id/files/quota` | Returns total and used quota; informational only |
| Course pages | `GET /api/v1/courses/:course_id/pages`; `GET /api/v1/courses/:course_id/front_page` | Endpoint-specific `url:GET|...` | Page body is HTML; identifiers may be URL or ID, with URL precedence in ambiguous cases; sanitize before display; no edit |
| Course modules | `GET /api/v1/courses/:course_id/modules` and module-items endpoints | Endpoint-specific `url:GET|...` | Optional `include[]=items` and `include[]=content_details`; items can be File, Page, Discussion, Assignment, Quiz, ExternalUrl or ExternalTool. Treat Quiz/ExternalTool items as provider links only |

### 3.1 Identity and timestamp handling

- Canvas documents integer IDs as 64-bit. The API supports `Accept: application/json+canvas-string-ids` to return IDs as strings; NORTHSTAR must preserve provider IDs as strings and namespace them by provider domain/account, object type and external ID. Do not round-trip large IDs through JavaScript numbers.
- Canvas API timestamps are ISO 8601. Preserve timezone/offset semantics in canonical records; never strip offsets or silently reinterpret provider timestamps as the user's local timezone.
- Course display names may reflect a user-set nickname. Preserve source course name/code separately from any NORTHSTAR personal display label.
- Optional and permission-dependent fields must remain nullable/absent; absence is not equivalent to zero, false or “not submitted”.

## 4. Pagination, throttling and request behavior

### Pagination

Official Canvas documentation states that list endpoints default to 10 records. A caller may set `per_page`, but the maximum is unspecified in the general pagination contract. Follow the response `Link` header; treat its absolute URLs as opaque and use the `rel="next"` link rather than reconstructing page URLs. Header names are case-insensitive. A missing `rel="last"` is possible when computing the total would be expensive.

**Required NORTHSTAR behavior:** checkpoint page progress; do not mark a collection complete after partial pagination; resume from the opaque next link; protect against duplicate/out-of-order page results; do not assume `per_page=100` is universal.

### Throttling

Canvas uses dynamic request-cost throttling. The official docs describe a `429 Forbidden (Rate Limit Exceeded)` response, `X-Request-Cost` and, when applicable, `X-Rate-Limit-Remaining`. Parallel requests incur a pre-flight penalty; the documentation notes that a client with no more than one simultaneous request is unlikely to be throttled.

**Required NORTHSTAR behavior:** default to sequential provider reads; use bounded concurrency only when evidence justifies it; record cost/remaining headers without sensitive data; handle 429 with delayed retry/backoff and visible freshness state; do not use fixed quota assumptions or aggressive polling. Repeated high-impact traffic may cause access tokens to be revoked under the API Policy.

## 5. Authentication, permissions and policy gate

### OAuth and developer-key contract

- Canvas uses OAuth 2.0 for API authentication and authorization.
- Developer keys are client ID/secret pairs; root-account administrators or Instructure control endpoint scopes. A scoped token requests a subset of scopes configured on the key, in the form `url:<HTTP Verb>|<Canvas API Endpoint Path>`.
- The OAuth documentation states access tokens have a one-hour lifespan and uses refresh tokens to obtain replacement access tokens.
- Use the HTTP `Authorization: Bearer` header; query-string tokens are discouraged because they may be logged or leaked.
- Canvas describes stored tokens as equivalent in sensitivity to passwords. Never embed them in browser pages, URLs or client bundles. A future integration requires a separately approved BFF/secret store, session/CSRF controls, revocation and redaction.

### Instructure API Policy — effective 2026-11-25

The current official [Instructure API Policy](https://www.instructure.com/policies/canvas-api-policy) states that API use must be authorized by Instructure, distinguishes a Customer from an end-user User authorized by the Customer, and says third-party subcontractors are not Users and require their own active Integration Tier Partnership subscription. Its restrictions prohibit API access without an active Integration Tier Partnership subscription or express Instructure permission.

The same policy requires applications not to impersonate or mirror Canvas, to make clear that the application is an independent resource, to be transparent about data use and privacy, to use least privilege and reasonable efficiency, and to comply with rate limits. It also sets transparency requirements for generative AI use, storage/training disclosures and labeling AI-generated reports.

**Unresolved authorization gate:** Repository records do not establish whether this single-user NORTHSTAR application is authorized under the end-user User pathway, whether it is treated as a third-party subcontractor, or whether an Integration Tier Partnership/express permission is required. Do not infer authorization from having a Canvas login, institution URL or OAuth token. Before any live API request, obtain written clarification from the institution/Customer and, where needed, Instructure, and record the applicable permission/partnership status. This is tracked as NS-CAN-011 / NSX-027. Public documentation research may continue; no live Canvas access is performed.

## 6. Field authority baseline

| Data class | Default authority | NORTHSTAR behavior |
|---|---|---|
| Official course identity/status | Canvas/institution | Read/display with source, external ID and freshness |
| Official assignment instructions/due date/points/availability | Canvas/institution | Preserve source value; show personal target date separately |
| Provider-owned assignment state | Canvas/institution | Display read-only only when explicitly authorized and provenance is present |
| Submission/attempt/receipt | Canvas/institution | No NORTHSTAR submission workflow; never infer or fabricate a provider receipt |
| Official score/rubric/feedback | Canvas/institution | Display permitted source data; personal forecast/reflection separate and labeled |
| Personal priority, plan, checklist, notes, study progress | NORTHSTAR/user | Persist locally; no provider write implied |
| Personal calendar blocks/reminders | NORTHSTAR/user | Local only |
| Course editor fields | NORTHSTAR/user for personal organization | Must not overwrite Canvas course content or identity |
| Imported but unverified records | Unverified | Label and validate before authoritative use |
| Derived progress/forecast | NORTHSTAR/system | Store rule/version and inputs; label as estimate |

## 7. Synchronization implications

- Use provider-supported incremental retrieval and stable cursors only where documented.
- Do not assume webhook availability; require official support and secure verification evidence.
- If push delivery is not documented, use bounded polling/manual refresh and visible freshness.
- Paginate exhaustively and checkpoint safely; partial-page failure cannot mark a collection complete.
- Respect dynamic request-cost throttling and retry guidance; sequential reads are the conservative default.
- Because current scope is read-only, ambiguous write recovery is not part of the 5.0 Canvas operation model. Local NORTHSTAR writes still require their own transactional/recovery rules.
- Store only necessary fields; never persist OAuth tokens or signed URLs in the browser or beyond their validity.
- Provider deletions/withdrawals become source-state changes; preserve user-owned notes, plans and derived artifacts with an explicit orphaned-source relationship.

## 8. Excluded provider operations and external handoff

The following are explicitly outside the NORTHSTAR 5.0 Canvas integration scope:
- Create/update/delete assignments or calendar events.
- Upload or submit assignment files, create attempts, re-submit or generate submission receipts.
- Read quiz questions for an in-app quiz engine, record answers, time/score attempts or submit assessments.
- Edit Canvas pages/documents or provide a general-purpose document editor.
- Post discussions, change enrollments/grades or perform administrative operations.
- Launch LTI tools with credentials or signed assertions.

If a course module contains a Quiz or ExternalTool item, NORTHSTAR may display its provider-owned title/link and open it in the external service, subject to authorization and safe-link handling. NORTHSTAR must not recreate that workflow.

## 9. Verification gate

Before live Canvas work:
1. Owner explicitly authorizes the specific tenant, user role, read-only endpoints and test scope.
2. Institution/Customer authorization and applicability of the current Instructure API Policy are documented (NS-CAN-011).
3. Test account/role and least-privilege developer-key scopes are documented.
4. Read-only capability discovery is separated from any excluded provider write operation.
5. No production coursework mutation is used as a test.
6. Data classification, retention, export, deletion, consent and evidence privacy are defined.
7. Token storage, OAuth refresh/revocation, BFF controls, CSRF/CORS and redacted logging are reviewed.
8. Target-tenant verification is claimed only for the exact tested capability and conditions.

## 10. Official sources and retrieval record

All sources below were reviewed on **2026-11-25**. These links are official Instructure/Canvas documentation.

- [Canvas LMS API overview](https://developerdocs.instructure.com/services/canvas) — REST API, HTTPS, JSON, 64-bit IDs and API policy entry point.
- [Instructure Canvas API Policy](https://www.instructure.com/policies/canvas-api-policy) — effective 2026-11-25; authorization, partnership restrictions, privacy, non-impersonation, least privilege, AI transparency and rate limits.
- [OAuth2 Overview](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth) — OAuth, token storage, bearer header and one-hour access-token lifespan.
- [Developer Keys](https://developerdocs.instructure.com/services/canvas/oauth2/file.developer_keys) — scoped developer keys and administrator-controlled endpoint scopes.
- [Courses](https://developerdocs.instructure.com/services/canvas/resources/courses) — `GET /api/v1/courses`, course and term objects.
- [Assignments](https://developerdocs.instructure.com/services/canvas/resources/assignments) — `GET /api/v1/courses/:course_id/assignments` and assignment object.
- [Enrollments](https://developerdocs.instructure.com/services/canvas/resources/enrollments) — enrollment listing and permission-dependent grade fields.
- [Calendar Events](https://developerdocs.instructure.com/services/canvas/resources/calendar_events) — paginated current-user events/assignments and date filtering.
- [Files](https://developerdocs.instructure.com/services/canvas/resources/files) — file metadata, visibility/lock fields, course file listing and quota.
- [Pages](https://developerdocs.instructure.com/services/canvas/resources/pages) — read-only page content metadata and HTML body.
- [Modules](https://developerdocs.instructure.com/services/canvas/resources/modules) — module items and resource relationships, including external Quiz/ExternalTool references.
- [Pagination](https://developerdocs.instructure.com/services/canvas/basics/file.pagination) — default page size, opaque Link headers and pagination behavior.
- [Throttling](https://developerdocs.instructure.com/services/canvas/basics/file.throttling) — dynamic request-cost limits and response headers.

**Disposition:** Public documentation research has begun and a read-only endpoint baseline is recorded. Exact mapping of every existing Worker route to the official contracts remains open. Target-tenant authorization is unresolved. No live Canvas request, credential, submission, quiz or document-editing workflow is implemented or verified.


## 11. Legacy Worker source and deployment separation

The audited legacy Worker is still present byte-for-byte on both `northstar-4.4.8.3.1-stabilization` and `northstar-5.0.0-development` at the inspected checkpoint:

- `canvas-bridge/worker.js` SHA: `dccb78bfc377f90ce5aba5d51ba52c129dc2aeee`
- `tests/bridge.test.mjs` SHA: `0163a1d7ef483c4a336867ade9a76b813aff6f75`
- Worker build marker in source: `0.4.22 (4.4.8.2)`
- The source fixes `ALLOWED_ORIGIN` to the GitHub Pages origin and `CANVAS_ORIGIN` to the institution Canvas origin. These are legacy deployment-bound constants; no live request was made.
- A deployment workflow exists at `.github/workflows/deploy-canvas-bridge.yml`. The currently deployed Worker version and deployment state have **not** been verified.

### 11.1 Legacy route families found by static inspection

**Read/launch routes in legacy source:**
- `/login/session_token` with a bounded `return_to` allowlist for assignment, quiz, file and external-tool pages.
- Current-user identity and course/course-assignment/assignment-group/file metadata reads.
- Assignment submission history/feedback/rubric reads.
- Classic Quiz details/questions/submission/time and quiz-submission question reads.
- New Quizzes details and items under `/api/quiz/v1/`.
- Discussion topics, entries, replies and entry lists.
- Assignment-specific external-tool sessionless launch.

**Write/action routes in legacy source:**
- Assignment submission creation for text, URL and uploaded-file types.
- Assignment and quiz file-upload initialization and signed-storage upload/finalization.
- Classic Quiz start, answer updates, flag/unflag and completion.
- Discussion entry/reply creation and discussion entry editing.

The Worker validates origin, bearer header, method, path, query and JSON payload; it caps upload size at 25 MB and validates signed upload destinations. These controls are evidence of the legacy implementation's design, not proof of current deployment or policy authorization.

### 11.2 Test evidence and scope conflict

`tests/bridge.test.mjs` explicitly tests successful assignment submission, quiz attempt start/answers/flagging/completion, assignment/quiz file uploads and discussion writes, as well as read and external-tool launch routes. `scripts/submissions.js` contains a Canvas POST submission client and receipt verification. `scripts/canvas-sync.js` normalizes provider-owned submission/grade states. `scripts/document-editor.js` and `scripts/document-storage.js` implement a legacy PDF/document editing and storage path.

These are **legacy capabilities**, not the approved NORTHSTAR 5.0 application scope. The new `apps/web/` app now has a read-only, unconfigured Canvas adapter and no submit operation; it does not call these legacy routes. The legacy files and tests remain preserved. This is a scope separation, not a claim that the legacy source has been deleted or that the deployed Worker has been disabled.

### 11.3 Required disposition

NSX-028 / NS-CAN-012 track the outstanding decision:
- Confirm whether the legacy site/Worker remains an intentionally separate frozen legacy product or whether its write/quiz/document capabilities should be disabled/decommissioned.
- Verify deployment state only through an authorized deployment/account check.
- Do not edit, disable, delete or redeploy the Worker, legacy UI, tests or document-editor files until the owner separately authorizes that action and the parity/rollback/security review is complete.

**Risk:** The current NORTHSTAR 5.0 product boundary excludes native quizzes, submissions and document editors, while legacy source still contains those capabilities. The new app and legacy runtime must not be conflated.
