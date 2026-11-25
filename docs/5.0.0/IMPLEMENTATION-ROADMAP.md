# NORTHSTAR 5.0 — Implementation Roadmap

This roadmap sequences implementation to reduce rework and protect existing behavior. It is a planning artifact, not evidence that the work has been completed.

## Stage 1 — Engineering foundation

- Create the React + TypeScript + Vite application shell on a dedicated 5.0 development line.
- Establish strict TypeScript, linting, formatting, test runner, CI build, environment validation, and dependency policy.
- Define domain boundaries, routing, state conventions, error handling, logging, and feature flags.
- Establish design tokens, typography, spacing, layout primitives, accessible controls, and responsive breakpoints.
- Add an architecture decision record and change-control workflow.

**Exit gate:** clean reproducible install/build/type/lint/test pipeline; no secrets in client bundles; baseline accessibility and iPad layout checks.

## Stage 2 — Shared academic data and persistence

- Define canonical models for user profile, terms, courses, assignments, grade items, submissions, events, resources, notes, study artifacts, and notifications.
- Define source authority and provenance per field.
- Add versioned migrations, local persistence, IndexedDB where appropriate, cache invalidation, autosave, drafts, recovery, and backup/restore.
- Add synchronization queue, idempotency, retry/backoff, conflict preservation, and status reporting.

**Exit gate:** schema validation, migration tests, persistence/recovery tests, conflict tests, and data-integrity checks.

## Stage 3 — Application shell and design system

- Build iPad-first navigation, workspace shell, command palette/quick actions where justified, global search, notifications, and settings.
- Implement Midnight theme, shared tokens, consistent components, keyboard/touch support, focus states, and reduced-motion behavior.
- Add the NORTHSTAR planetary visual signature as a performant, progressive enhancement.

**Exit gate:** all primary navigation works; responsive iPad portrait/landscape checks; accessibility review; motion/performance fallback.

## Stage 4 — Core academic workspaces

1. Dashboard and intelligent priority engine.
2. Courses and course detail hubs.
3. Assignments and complete coursework lifecycle.
4. Calendar and academic event management.
5. Gradebook and clearly distinguished actual/projected grades.
6. Resources and document library.
7. Study Lab, practice, flashcards, study guides, and spaced repetition.
8. Review Center and writing feedback workflows.

**Exit gate:** cross-workspace data consistency, full demo dataset, functional controls, and automated end-to-end coverage.

## Stage 5 — Integration adapters

- Rebuild Canvas integration behind a dedicated adapter and server-side Worker boundary.
- Verify course, assignment, grade, feedback, submission, and content coverage against documented Canvas capabilities.
- Preserve external-provider handoffs and return-context validation.
- Add integration status, sync history, recovery, and user-visible conflict review.

**Exit gate:** mocked contract tests plus authorized live Canvas acceptance. Never label a simulation as connected.

## Stage 6 — AI Workspace

- Provider-neutral service interface; no mandatory direct provider key in the browser.
- Context assembly from relevant academic records with course boundaries and freshness metadata.
- Inline citations/source panel, transparent uncertainty, and explicit approval for consequential actions.
- Planning, explanation, study, workload, briefing, writing, and search capabilities.

**Exit gate:** context relevance tests, course-boundary tests, source-grounding tests, permission tests, and approval-flow tests.

## Stage 7 — Qualification and release

- Unit, component, integration, end-to-end, regression, accessibility, security, and performance testing.
- iPad Safari, portrait/landscape, Split View/Stage Manager where supported, touch, and Apple Pencil acceptance.
- Migration rehearsal, backup/restore, offline/reconnect, and failure-recovery qualification.
- Preview deployment, user acceptance, production release, monitoring, and rollback.

**Exit gate:** all release-blocking requirements pass with recorded evidence and explicit user acceptance.

## Preservation and retirement rule

A legacy feature is not removed merely because it is old, large, or visually redundant. First identify dependencies and data ownership; then provide a replacement or approved retirement path; run regression tests; and remove it in a separately reviewable change.


---

## Implementation checkpoint — 2026-11-25

Implementation is active on `northstar-5.0.0-development`. This checkpoint records shipped source changes, not release acceptance.

### Delivered in the web client

- Isolated React/TypeScript/Vite client under `apps/web/`.
- Shared local academic snapshot with runtime validation of schema version, term, course relationships, assignment fields, dates, enums, and duplicate IDs.
- Revision-incrementing assignment commands: create, update, status change, and delete.
- Browser persistence with graceful in-memory fallback and a visible storage warning.
- Connected Overview, Assignments, Courses, Calendar, Study Lab review-card prototype, and Gradebook progress projection.
- Assignment editor supports course, title, description, due date/time, points, priority, estimated duration, and personal notes.
- Search includes assignment titles, descriptions, and notes; course and status filters remain available.
- Dashboard and Calendar consume the same snapshot; assignment mutations propagate through both projections.
- Development-only GitHub Actions typecheck/build workflow; it does not deploy.

### Remaining gates

- CI run evidence is pending; source commits and a configured workflow are not a passing build.
- Add and commit a deterministic dependency lockfile.
- Add domain, component, integration, and end-to-end tests for validation, CRUD, persistence failure, cross-workspace projections, and responsive behavior.
- Expand canonical data beyond the initial term/course/assignment subset; implement field-level provenance and source authority.
- Complete assignment artifacts, drafts, rubrics, submission simulation, and richer detail workflow.
- Build full Resources, Review Center, study authoring/spaced repetition, and gradebook semantics.
- Add PWA/offline behavior, accessible interaction review, iPad Safari portrait/landscape qualification, security review, and performance evidence.
- Canvas and AI remain disconnected; no live integration claim is made.

Do not mark a requirement accepted until its defined verification evidence exists.


### Follow-on implementation checkpoint — 2026-11-25

- Added a course-linked resource record to the same academic snapshot used by assignments and other workspaces. Existing version-1 browser snapshots without a `resources` collection remain readable and are normalized in memory.
- Added local resource create/update/delete commands with revision increments, course relationship checks, runtime validation, and HTTPS-only external URL policy.
- Implemented Resources library UI for notes, references, and external links, including search, course filtering, editor, and delete flow.
- Added resource lifecycle and URL-scheme tests.
- Added the install manifest, NORTHSTAR SVG icon, production service-worker registration, and conservative app-shell/static-asset caching. This is a PWA foundation, not a claim of full offline synchronization or iPad qualification.

The complete latest workflow run is the qualification source for these changes; any earlier failed run is retained as history and must not be described as the current result.


### Writing review increment — 2026-11-25

- Added Review Center to the primary navigation.
- Implemented a local draft preflight with word and sentence counts, average sentence length, long-sentence flags, repeated-term signals, and a check for common citation markers.
- Draft text is processed in the browser component only; no provider or external upload is invoked.
- The interface explicitly states that this is not AI feedback, plagiarism detection, source verification, or a grade prediction. Provider-backed review remains a separate future integration.

This is a useful first-pass tool, not completion of the planned AI-assisted Review Center or co-pilot workflows.


### Study Lab implementation increment — 2026-11-25

- Added a course-linked StudyCard model to the canonical academic snapshot. Existing version-1 snapshots without study cards remain readable and are normalized to an empty collection.
- Added local card create/update/delete and Again/Hard/Good/Easy review commands. Each review updates ease, repetition count, interval, next-review timestamp, and snapshot revision.
- Replaced the assignment-derived flashcard mock with a real local flashcard deck: create cards, reveal answers, rate recall, view due count and schedule, and remove cards.
- Added unit coverage for card creation, validation, rating schedules and deletion.

This is the first spaced-repetition engine increment. Full study guides, practice generation, learning analytics, and content-grounded answer explanations remain ahead.


### Course hub increment — 2026-11-25

- Courses now opens a dedicated course hub for each course.
- Each hub projects its assignments, resource library items and study cards from the canonical academic snapshot, with links to the corresponding full workspaces.
- The course hub makes the cross-workspace relationships visible without duplicating or separately storing course data.


### Coursework-to-writing workflow and qualification update — 2026-11-25

- Added local writing-draft records to the canonical academic snapshot with revisioned save/update and delete behavior.
- Review Center can create, resume, update, and delete drafts; drafts may link to assignments and are preserved as independent drafts if a linked assignment is deleted.
- Assignment rows now provide a direct route into Review Center with the relevant assignment preselected.
- Upgraded Vitest to 4.1.11 to clear critical development-tool advisories. The qualification workflow now uses npm 11.6.2, installs without the implicit audit phase, then runs explicit production audit and full dependency advisory reporting.
- Latest successful dependency qualification before the assignment-to-draft route addition reported zero advisories, with typecheck, domain tests, and production build all passing.

The assignment-to-draft route is awaiting its own latest workflow result. Browser/iPad acceptance and a committed package lockfile remain outstanding.


### Academic backup and recovery increment — 2026-11-25

- Added a versioned NORTHSTAR backup envelope containing the complete local academic snapshot.
- Added strict parse/validation and safe normalization for older version-1 snapshots; malformed or unknown-version backups are rejected.
- Settings now exports a JSON backup and restores one only after explicit confirmation. The backup includes courses, assignments, resources, study cards and writing drafts.
- Added repository tests for complete snapshot round-trip and invalid backup rejection.

This is local backup/restore only. It is not cloud backup, encryption, multi-device synchronization, or a substitute for the future offline conflict/reconciliation queue.


### Calendar and Gradebook implementation increment — 2026-11-25

- Added explicit calendar event records for class sessions, study blocks, reminders and personal events, separate from assignment due dates.
- Calendar now combines assignment deadlines and event records into one agenda and supports creating/removing personal events with optional course and assignment links.
- Added explicit grade item records with graded, pending, missing and excused states; score values are independent from assignment statuses.
- Gradebook now supports personal grade record create/edit/delete, course-level points summaries, feedback, and excludes pending/missing records from earned-point calculations.
- Assignment deletion detaches linked drafts, events and grade records rather than silently deleting independent work.
- Backup/restore tests now include calendar events and grade items.


### AI Workspace simulation increment — 2026-11-25

- Replaced the AI Workspace placeholder with a provider-free co-pilot simulation.
- Added explicit on/off state, standing-by/off status, simulated request preparation, notification feed, and a local academic-context summary.
- Every screen state clearly says that no model call, provider, credential, or external data transfer is connected. This does not claim AI-generated content or live assistance.
- Future provider integration remains behind the approved secure server-side boundary and requires separate integration authorization.


### Assignment turn-in simulation — 2026-11-25

- Added a confirmation-gated “Turn in locally” action for open assignments.
- The action updates the shared assignment status to submitted, so Dashboard, Calendar, Gradebook projections and course views stay consistent.
- Added animated local confirmation feedback that explicitly states no Canvas or institution submission occurred.
- This is a local workflow simulation, not a submission transport or proof of delivery.


### Theme and installability increment — 2026-11-25

- Settings now exposes persistent Midnight and Light theme selection, with Midnight as the default.
- Theme state is stored under `northstar-theme` and applied at the application root so shared surfaces follow the selected theme.
- The PWA foundation is documented as installable app metadata plus conservative app-shell/static-asset caching. Full offline academic write queues and conflict reconciliation remain future qualification work.


### Deterministic dependency lock completed — 2026-11-25

- Generated and verified the npm lockfile in CI, then committed `apps/web/package-lock.json` to the development branch.
- The lockfile uses npm lockfile version 3 and was validated with a clean `npm ci`.
- Simplified qualification to use only `npm ci`; removed CI write permission and all automatic repository mutation. The workflow now uses read-only contents permission.
- Local setup documentation now uses `npm ci` for reproducible installation.


### Study Lab practice engine increment — 2026-11-25

- Added course-grounded multiple-choice practice questions with validated option sets and explanations.
- Added revisioned practice attempts to the canonical snapshot. Attempts resume after reload and autosave answers, flags and elapsed time.
- Study Lab has four modes: Answer, Learn, Practice and Review. The initial course bank contains 12 validated multiple-choice prompts (three for each of the four demo courses).
- Timed practice offers 5-, 10- and 15-minute countdown sessions, course selection, previous/next and direct question navigation, flag-for-review, immediate answer/flag autosave, reload resume, automatic time-expiry submission, manual finish, score calculation and per-question feedback.
- Practice attempts remain independent of Gradebook score records and never send institution submissions.
- Tests cover attempt create/resume, duration persistence/range validation, answer autosave, flags, completion scoring, cross-course answer rejection and the seeded question bank.

The question set is illustrative demo content. Instructor-authored assessment imports, richer test formats, accessibility and browser/iPad end-to-end qualification remain open.


### Global navigation and notification intelligence — 2026-11-25

- Replaced the static top-bar shortcut/bell affordances with a command palette and academic notification center.
- Search spans navigation, courses, assignments, calendar events, resources and saved writing. Keyboard shortcut, arrow selection, Enter, Escape and accessible combobox/listbox state are implemented.
- Notification selectors cover overdue/missing work, due-today assignments, seven-day calendar events, due flashcards and pending grades. Badge and panel share the same data selection and routes.
- Domain tests cover search and notification selectors. These are local in-app reminders, not push notifications.



### Assignment detail and mutation-integrity increment — 2026-11-25

- Added a dedicated assignment detail route reachable from assignment rows and global search. The detail surface shows the assignment brief, due date/time, points, effort estimate, priority, personal notes, workflow status, linked course, writing draft, calendar items and grade record when present.
- Detail actions update the same canonical local assignment status, open the associated writing workspace, navigate to the course hub, and open the assignment editor from the detail page.
- Assignment search now deep-links to the matching assignment rather than only opening the general list.
- Added responsive detail layout rules for tablet and narrow screens.
- Hardened assignment create/update validation: course association, title, due date, finite/nonnegative points and effort, priority, and status are checked before snapshot mutation. Invalid input returns the original snapshot without incrementing its revision.
- Added repository tests for invalid numeric, priority and status mutations.
- This is still a local personal workflow. It does not read or update official Canvas assignment records.


### Canonical snapshot relationship hardening — 2026-11-25

- Snapshot validation now requires each course to reference the active term.
- Calendar events linked to assignments must use the same course as the linked assignment; orphaned or cross-course event links are rejected.
- Practice attempts must reference an existing course and contain at least one valid question from that course.
- Term date ranges are checked for valid ordering.
- Added malformed-snapshot tests for wrong-term courses, cross-course event links and empty practice attempts.
- These checks apply to browser persistence and imported backups before the data is accepted. No external provider records are involved.


### Calendar event editing increment — 2026-11-25

- Calendar now supports editing user-created class, study, reminder and personal events in addition to creating and deleting them.
- The editor restores the event's existing values, preserves its identity, validates its time range and course/assignment relationship, and increments the shared snapshot revision on save.
- Assignment deadlines and seeded demo events remain protected from personal edit/delete controls.
- Added repository coverage for event update, identity preservation and invalid time-range rejection.
- Calendar changes remain local and do not modify an external institution calendar.


### Planetary hero visual refinement — 2026-11-25

- Expanded the Dashboard's existing CSS-rendered planet into layered atmospheric lighting, surface/cloud bands, orbital halos, additional star points and subtle long-duration movement.
- Kept the effect in CSS rather than adding canvas/WebGL or another runtime dependency.
- Added a reduced-motion override and smaller-device sizing rules.
- This is a visual implementation increment; physical iPad rendering, frame-time and battery qualification remain open.


### Calendar editing and relationship safeguards — 2026-11-25

- Wired the existing validated event-update command into the Calendar workspace. User-created events can now be reopened, edited and saved without changing their record identity; seeded demo events and assignment deadlines remain read-only.
- Changing an event's course clears a selected assignment if that assignment belongs to a different course, preventing a silent failed save.
- Added tests for event update, revision increments, invalid time ranges and cross-course assignment rejection.
- The calendar editor and event-update command remain local browser workflows.
