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
