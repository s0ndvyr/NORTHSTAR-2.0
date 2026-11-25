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
