- Global command palette for keyboard shortcut `⌘/Ctrl + K`, case-insensitive search across workspaces, courses, assignments, calendar events, resources and saved writing, arrow-key selection, Enter-to-open and Escape-to-close.
- Academic notification center derived from the shared snapshot: missing/overdue work, due-today assignments, upcoming seven-day events, due flashcards and pending grades. The bell count and displayed list use the same selector.
# NORTHSTAR Web Application

The NORTHSTAR 5.0 client lives in `apps/web/`, isolated from the legacy root application and Canvas Worker.

## Implemented foundation

- React 19 + TypeScript + Vite with strict TypeScript settings.
- React Router workspace navigation and Framer Motion route transitions.
- Midnight default and persistent Midnight/Light theme preference, responsive iPad-first shell, and reduced-motion handling.
- Installable PWA manifest, app icon, production service-worker registration, and conservative offline app-shell/static-asset caching; this is not yet full offline synchronization.
- Canonical local academic snapshot with runtime validation, revision tracking, and browser persistence.
- Connected Overview, Assignments, Courses with per-course detail hubs, Calendar, Study Lab flashcard authoring, spaced-repetition review, and course-grounded practice sets, Gradebook progress views, course-linked Resources library, and a local Writing Review workspace.
- Courses workspace supports local course creation and metadata editing with active-term assignment, unique course-code validation and preservation of linked academic records. Seeded courses carry demo-origin metadata; newly created or edited courses are marked NORTHSTAR-origin with update timestamps.
- Resource create/edit/delete, course filtering, personal notes, references, and HTTPS-only external links. Resource records share the same versioned academic snapshot and revision counter as assignments.
- Calendar events for classes, study blocks, reminders and personal time, distinct from assignment deadlines, with course/assignment links and local event management.
- Explicit grade records with graded/pending/missing/excused states, optional assignment links, feedback, points-based summaries, and no inferred numeric scores from assignment status.
- Study Lab four-mode Answer/Learn/Practice/Review workspace, 12 course-grounded practice questions (three per course), 5/10/15-minute countdown sessions, course/question navigation, immediate local answer and flag autosave, reload resume, time-expiry submission, score calculation, and per-question explanations.
- Learn mode builds a course-scoped study guide from saved practice concepts, flashcards, resources and open assignments, with plain-text export; the guide is deterministic local assembly, not AI-generated content.
- Study Lab flashcard create/delete, course association, prompt/answer reveal, Again/Hard/Good/Easy recall ratings, and next-review scheduling using an ease/interval model.
- Review Center saved-draft create/resume/update/delete, optional assignment association, local word/sentence/repetition/citation-marker checks, and draft preservation when a linked assignment is removed.
- Assignment create, edit, delete, search, course/status filters, due-date/priority/recent-update sorting, priority, notes, due dates, estimates, linked writing drafts, and a confirmation-gated local turn-in simulation with explicit no-Canvas messaging.
- Dedicated assignment detail route with course, due date, priority, personal notes, linked drafts/events/grades, local status control, direct edit and writing-workspace actions; global search opens the selected assignment directly.
- Assignment Detail supports local file attachments stored in IndexedDB (25 MB per file), download and removal. Binary attachments are not included in JSON backups and are not uploaded to Canvas.
- Storage-unavailable fallback that keeps the current session usable and surfaces a warning.
- Validated academic backup export/import for the complete local snapshot, including calendar events, grade records, resources, study cards and writing drafts; restore requires confirmation and rejects malformed or unknown-version backups.
- Provider-free AI Workspace simulation with co-pilot on/off, standing-by state, simulated request preparation, notification feed and local context preview; no provider call is made.
- Typed AcademicAssistantService simulation boundary for future provider integration; current service only prepares labeled placeholders from local aggregate context and explicitly reports no provider connection.
- Typed CanvasAdapter contract with an unconfigured implementation and Settings-linked readiness workspace; all reads/writes are blocked, no institution data is requested, and no Canvas connection is claimed.
- Illustrative demo records only; no Canvas, institution, or AI provider is connected.

## Requirements

- Node.js 20.19 or newer
- npm 11.6.2 or newer (qualification workflow pins npm 11.6.2)

## Local development

From this directory:

```bash
npm ci
npm run dev
```

Check types and create a production build:

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

The academic repository unit tests cover snapshot validation, assignment create/update/status/delete behavior, resource lifecycle/HTTPS validation, spaced-repetition scheduling, timed practice start/resume/autosave/flag/score/time-limit behavior and seeded question-bank integrity, saved writing-draft lifecycle, calendar-event/grade-record integrity, and full backup round-trip. The development-branch GitHub Actions workflow runs typecheck, production dependency audit, a full development-dependency advisory report, domain tests, and production build on pushes and pull requests; it does not deploy the application. The current dependency tree reports zero advisories in the latest successful run. The committed `package-lock.json` pins the dependency tree; the development-branch qualification workflow installs with `npm ci` and does not mutate the repository. Broader component/integration/end-to-end coverage remains qualification work.

## Data and integration boundaries

- The academic repository validates parsed browser data before use and rejects invalid records rather than trusting localStorage blindly.
- All assignment mutations increment the snapshot revision and update the shared local snapshot used by workspace projections.
- Local assignment status is a personal workflow overlay, not proof of an official submission or grade.
- Writing drafts and other local records are stored in browser localStorage. They are not encrypted, synchronized, backed up to a server, or sent to an AI provider; users should avoid storing credentials or highly sensitive content.
- Do not import legacy runtime scripts directly.
- Never place Canvas credentials or AI provider secrets in client code.
- Keep provider calls behind typed service interfaces and a future secure server-side boundary.
- Do not treat illustrative dashboard values as real academic records.
- Practice results are local learning feedback only. They do not create Gradebook scores or alter official course results.
- Do not change root production publishing or the Canvas Worker as part of this app foundation.


### Global workspace shell — 2026-11-25

- Top-bar search is an actionable command palette. It supports the keyboard shortcut, cross-workspace lookup, keyboard result navigation and semantic combobox/listbox roles.
- The notification center and badge share tested domain selectors. Items navigate to the corresponding workspace; reminders are derived from local academic records and are not push notifications.
- Tests verify case-insensitive search, result limits, assignments/courses/resources/drafts and alert routing/priority/terminal-state suppression.
