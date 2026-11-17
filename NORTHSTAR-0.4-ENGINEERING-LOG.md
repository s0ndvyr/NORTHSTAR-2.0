# NORTHSTAR 0.4 — Engineering Log

Last updated: 2026-11-17
Repository: `s0ndvyr/NORTHSTAR-2.0`
Production branch: `main`
Working branch: `northstar-0.4.3-phase-3-studentvue`
Release identifier: `NORTHSTAR / .4.3`
Package version: `0.4.3`

## Product direction

NORTHSTAR is a single-user, iPad-first academic command center. It must accurately reflect Canvas courses, assignments, submission states, grades, marking periods, and workload. It must never fabricate a live connection, grade, submission, or saved state. Reliability, data preservation, privacy, and honest integration status come before visual polish.

## Roadmap

1. **Phase 1 — Foundation:** secure device storage, credential handling, recoverable settings, offline snapshots and marking-period backup groundwork. Foundation implementation is in the repository.
2. **Phase 2 — Canvas synchronization:** course/assignment retrieval, submission recognition, grade data, sync reliability and offline snapshots. User live testing confirmed that Canvas connects and reports assignments/submissions. Several academic-context defects found during that testing are addressed in Phase 3. Full Phase 2 release acceptance remains tied to final end-to-end regression.
3. **Phase 3 — StudentVUE and academic intelligence:** official grade source investigation, marking-period context, assignment relevance, ignored courses, correct submitted-date presentation, and no fabricated grades. Current work.
4. **Phase 4 — Assignment Workspace:** native completion flows for supported assignment types, quizzes, writing, links, files, and confirmed submissions.
5. **Phase 5 — Settings and Data Management:** complete settings/security/persistence review, backup and restore, and course-management controls.
6. **Phase 6 — Visual Revolution:** complete dashboard identity, themes, Starlight/Nebula atmosphere, animation, interaction and iPad polish.
7. **Phase 7 — Full Regression and Release:** end-to-end QA, performance, accessibility, integration validation and deployment review.

Do not advance a phase until its exit criteria are tested and remaining limitations are recorded. Defer the full Visual Revolution until functional phases are complete.

## Product decisions

- Canvas remains the source of truth for assignments, due dates, submission attempts, submission timestamps, and official Canvas grade totals.
- StudentVUE grades are a separate source. Do not merge them with or overwrite Canvas values.
- NORTHSTAR assignment-derived grades remain estimates, clearly labeled as such.
- A local draft is never a Canvas submission.
- `Submitted`, `Awaiting Grading`, `Completed`, `Missing`, `Overdue`, and `Excused` are distinct states.
- Submitted work must show its submitted/graded date or elapsed time, never an overdue countdown.
- User-defined marking periods define the academic focus when configured. The default dashboard and Ledger scope is the current marking period; historical periods are available through an explicit Ledger filter.
- Unpublished or Canvas-locked assignments are not active work items.
- Ignored courses remain visible in course management as muted/ignored but are removed from priorities, workload, grade projections and AI academic context.
- Unknown grades display as `N/A`, never as zero, an inferred F, or an unexplained dash.
- Never put credentials in URLs, logs, debug exports, source code, or Git history.
- Browser-side encryption is protection at rest, not protection against malicious same-origin JavaScript.

## Phase 1 and Phase 2 foundation carried forward

- IndexedDB/Web Crypto device vault for saved secrets (when user opts in).
- Canvas/Gemini credentials use encrypted device storage and masked Show/Hide controls.
- Last successful Canvas coursework snapshot is encrypted and can be restored offline.
- Marking periods support validated JSON export/import.
- Canvas requests include official enrollment grade totals and grading-period details where available.
- Assignment retrieval is paginated. Submission state distinguishes submitted, pending review, graded, stale grade after a newer attempt, missing and excused.
- Course grade source and NORTHSTAR estimate remain separate.
- Failed required course/assignment reads preserve the last known-good snapshot.
- Canvas sync is guarded against overlapping requests and uses event-driven refresh rather than continuous polling.
- External Google/Canvas resources open through authenticated destinations when embedding is blocked.

## Phase 3 implementation in the working branch

- App and package release identifier updated to `NORTHSTAR / .4.3` and package version `0.4.3`.
- New `scripts/studentvue.js` adapter supports user-selected CSV/JSON grade files. It validates course, marking period and grade values; preserves school year, source and import timestamp; merges repeated imports without losing other period records; and supports per-course history.
- Settings now provides the official NNPS StudentVUE portal link, an import control, CSV template download, import status and clear-import action. It does not collect the StudentVUE password.
- StudentVUE grade imports are displayed as `StudentVUE import`, not as a live connection. Per-course current and historical records are displayed on course detail. Imported grade records are encrypted through the existing device vault; earlier localStorage imports are migrated into the vault and removed from plaintext storage.
- The academic dashboard and Ledger default to the current user-defined marking period. Ledger offers Current Marking Period, All Marking Periods, and each configured period. Adding, deleting, or importing a period refreshes the Ledger filter options immediately.
- Dashboard Today's Focus, Priority Queue, calendar, and course momentum are scoped to current-period published work. Today's Focus prefers due-today work before later upcoming items. Academic Signals, Upcoming Workload, the 7-Day Forecast, Task Completion, and Submission Activity are derived from current Canvas records; illustrative focus hours and static example insights are no longer presented as live student data.
- Today's Focus now prefers work due today, then current upcoming/in-progress work. The priority queue retains overdue/missing priority, but only within the current marking period.
- Unpublished and Canvas-locked assignments are excluded from the active work list.
- Submitted/completed assignment date metadata now reports time since submission/grading rather than overdue days.
- Unknown grade values display `N/A`. Official Canvas, StudentVUE-imported, and NORTHSTAR-estimated grades are source-labeled.
- Course ignore preferences persist in local storage. Ignored courses are muted in course management and excluded from active workload, queue, grades/estimates shown in momentum, what-if calculations and AI context.
- Dashboard completion/progress is based on current-period published assignments. Demo/example focus-time data remains explicitly labeled as not tracked.
- Added StudentVUE grade-import unit tests and updated browser boot tests to load the new module and verify the release label.
- Added a branch-scoped GitHub Actions test workflow for JavaScript syntax, unit tests, and the browser boot test.

## StudentVUE integration security gate

NNPS public materials confirm that StudentVUE provides students with access to grades and assignments. The reviewed district/Edupoint public pages do not publish a supported third-party student API, OAuth client registration, scopes, rate limits, or a third-party integration agreement.

A community-maintained reverse-engineered protocol exists; it is not district authorization or a stable supported integration contract. NORTHSTAR will not scrape authenticated browser pages, extract session cookies, collect StudentVUE passwords, or use undocumented endpoints without explicit district authorization.

**Current deliverable:** safe, device-local CSV/JSON grade import and historical grade display.

**Still blocked:** unattended live StudentVUE API synchronization. Obtain written NNPS approval and official endpoint/authentication documentation or a district-approved data export before implementing direct integration.

Official support contact listed by NNPS: Technology Service Center, `tsc@nn.k12.va.us`, (757) 881-5461 ext. 12411. Students may also contact their school Technology Support Specialist.

## Canvas bridge configuration still to verify

- `ALLOWED_ORIGIN` must match the deployed NORTHSTAR Pages origin exactly.
- `CANVAS_ORIGIN` must match the actual school Canvas HTTPS origin.
- Bridge allows scoped course/assignment/grade reads and validated text-entry/URL submission writes only. File upload, quiz-engine, discussion and external-tool submissions remain unsupported in the bridge.
- Never deploy guessed origin changes. Confirm both exact URLs first.

## Verification status

- Earlier Phase 2 unit suite results were reported as passing for AI, bridge security, Canvas normalization, grade calculations, submission validation, and diagnostics.
- Phase 3 added `tests/studentvue.test.mjs` covering quoted CSV parsing, JSON parsing, period selection, historical rows, validation, and persistence.
- Browser boot test now loads `scripts/studentvue.js` and asserts the .4.3 release label.
- A GitHub Actions workflow runs JavaScript syntax checks, all unit suites, and the jsdom browser boot test. The latest Phase 3 workflow run for the current implementation completed successfully (run 44150307627, commit `901fa2ddcbd53f2c0ca6666b3cb4800439e3e0df`). The boot test covers current-period filtering, submitted-age labels, ignored-course behavior, encrypted StudentVUE imports, and historical grade display.
- No authenticated direct StudentVUE API test has been run; no district-supported API is documented in the public information reviewed.
- Live StudentVUE grade values have not been imported or compared against the student's portal.
- No new changes have been pushed to production `main`. All Phase 3 work is on the development branch.

## Phase 3 acceptance checklist

- [x] Research NNPS/Edupoint public StudentVUE information and login portal.
- [x] Document the direct-API authorization limitation and safe integration gate.
- [x] Add CSV/JSON import adapter and source/timestamp provenance.
- [x] Add historical StudentVUE grade display to course detail.
- [x] Store imported StudentVUE grades encrypted in the device vault, migrate any legacy local import, and test import/source display.
- [x] Add current marking-period scope and explicit Ledger period selector.
- [x] Refresh period filter options whenever the user adds, deletes, or imports periods.
- [x] Replace illustrative focus/health/radar cards with current-period workload counts, live academic signals, and actual Canvas submission activity.
- [x] Correct submitted-date display to avoid overdue messaging.
- [x] Exclude unpublished and Canvas-locked assignments from active work.
- [x] Add persistent ignored-course exclusions and muted course display.
- [x] Change unknown grade display to N/A and distinguish grade sources.
- [x] Set visible release identity and package version to .4.3.
- [x] Complete the branch CI test run and fix failures (syntax checks, seven unit suites, jsdom boot test all pass).
- [ ] User imports real StudentVUE-sourced records and confirms course/period mappings.
- [ ] NNPS confirms whether an approved API, Ed-Fi source, or data export is available.
- [ ] If approved documentation is provided, implement and test direct read-only sync; otherwise close Phase 3 with import workflow and documented district limitation.

## Next actions

1. Run branch CI and repair failures.
2. Have the user verify the .4.3 preview and import a small non-sensitive StudentVUE grade export/template on the iPad.
3. Ask NNPS for written confirmation of supported third-party API/data export options.
4. Verify imported current and historical grades against StudentVUE.
5. Keep Phase 3 open until the live integration gate is resolved or explicitly accepted as unavailable.
