# NORTHSTAR 0.4 — Engineering Log

Last updated: 2026-11-17
Repository: `s0ndvyr/NORTHSTAR-2.0`
Production branch: `main`
Release identifier: `NORTHSTAR / .4.3`
Package version: `0.4.3`
Phase 3 merge: PR #4 · `334514ba92668a12b4982c27f3b6647f4a6ec2a7`

## Product direction

NORTHSTAR is a single-user, iPad-first academic command center. It must accurately reflect Canvas courses, assignments, submission states, grades, marking periods, and workload. It must never fabricate a live connection, grade, submission, or saved state. Reliability, data preservation, privacy, and honest integration status come before visual polish.

## Roadmap

1. **Phase 1 — Foundation:** secure device storage, credential handling, recoverable settings, offline snapshots and marking-period backup groundwork.
2. **Phase 2 — Canvas synchronization:** course/assignment retrieval, submission recognition, grade data, sync reliability and offline snapshots. User testing confirmed Canvas connects and identifies submitted work; Phase 3 corrected academic-context issues found during this testing.
3. **Phase 3 — StudentVUE and academic intelligence:** .4.3 implementation is merged to `main`. Encrypted StudentVUE CSV/JSON import is available. Live district API access and real-record verification remain external acceptance gates.
4. **Phase 4 — Assignment Workspace:** native completion flows for supported assignment types, quizzes, writing, links, files, and confirmed submissions.
5. **Phase 5 — Settings and Data Management:** complete settings/security/persistence review, backup and restore, and course-management controls.
6. **Phase 6 — Visual Revolution:** complete dashboard identity, themes, Starlight/Nebula atmosphere, animation, interaction and iPad polish.
7. **Phase 7 — Full Regression and Release:** end-to-end QA, performance, accessibility, integration validation and deployment review.

Do not advance a phase until its exit criteria are tested and remaining limitations are recorded. Defer the full Visual Revolution until functional phases are complete.

## Product decisions

- Canvas remains the source of truth for assignments, due dates, submission attempts, submission timestamps, and official Canvas grade totals.
- StudentVUE grades remain a separate source. Do not merge them with or overwrite Canvas values.
- NORTHSTAR assignment-derived grades remain estimates, clearly labeled as such.
- A local draft is never a Canvas submission.
- `Submitted`, `Awaiting Grading`, `Completed`, `Missing`, `Overdue`, and `Excused` are distinct states.
- Submitted work shows its submitted/graded date or elapsed time, never an overdue countdown.
- User-defined marking periods define the academic focus when configured. The default dashboard and Ledger scope is the current marking period; historical periods are available through an explicit Ledger filter.
- Unpublished or Canvas-locked assignments are not active work items.
- Ignored courses remain visible in course management as muted/ignored but are removed from priorities, workload, grade projections and AI academic context.
- Unknown grades display as `N/A`, never as zero, an inferred F, or an unexplained dash.
- Credentials never belong in URLs, logs, debug exports, source code, or Git history.
- Browser-side encryption is protection at rest, not protection against malicious same-origin JavaScript.

## Phase 1 and Phase 2 foundation

- IndexedDB/Web Crypto device vault for saved secrets when the user opts in.
- Canvas/Gemini credentials use encrypted device storage and masked Show/Hide controls.
- Last successful Canvas coursework snapshot is encrypted and can be restored offline.
- Marking periods support validated JSON export/import.
- Canvas requests include official enrollment grade totals and grading-period details where available.
- Assignment retrieval is paginated. Submission state distinguishes submitted, pending review, graded, stale grade after a newer attempt, missing and excused.
- Course grade source and NORTHSTAR estimate remain separate.
- Failed required course/assignment reads preserve the last known-good snapshot.
- Canvas sync is guarded against overlapping requests and uses event-driven refresh rather than continuous polling.
- External Google/Canvas resources open through authenticated destinations when embedding is blocked.

## Phase 3 implementation in .4.3

- App and package release identifier set to `NORTHSTAR / .4.3` and package version `0.4.3`.
- `scripts/studentvue.js` supports user-selected CSV/JSON grade records. It validates course, marking period and grade values; preserves school year, source and import timestamp; merges repeat imports; and supports per-course history.
- Settings provides the official NNPS StudentVUE portal link, import control, CSV template download, import status and clear-import action. It never collects a StudentVUE password.
- Imported StudentVUE records are encrypted in the existing device vault; earlier localStorage imports are migrated into the vault and removed from plaintext storage.
- Imported current/historical grade records appear on course detail and are labeled `StudentVUE import`, not a live connection.
- Dashboard and Ledger default to the current user-defined marking period. Ledger supports Current Marking Period, All Marking Periods, and each configured period. Add/delete/import refreshes the filter choices.
- Today's Focus, Priority Queue, calendar, and course momentum are scoped to current-period published work. Today's Focus prefers due-today work before upcoming items.
- Academic Signals, Upcoming Workload, the 7-Day Forecast, Task Completion, and Submission Activity derive from current Canvas records. Static example focus hours and illustrative insight text are no longer represented as live student data.
- Unpublished and Canvas-locked assignments are excluded from active workload.
- Submitted/completed assignment metadata reports time since submission/grading rather than overdue days.
- Unknown grades display `N/A`. Official Canvas, StudentVUE-imported, and NORTHSTAR-estimated grades are source-labeled.
- Course-ignore preferences persist locally. Ignored courses remain muted in course management and are excluded from active workload, priority queue, grade projections, momentum and AI context.
- Dashboard completion/progress is based on current-period published assignments.

## StudentVUE integration security gate

NNPS public materials confirm that StudentVUE provides students with access to grades and assignments. The reviewed district/Edupoint public pages do not publish a supported third-party student API, OAuth client registration, scopes, rate limits, or a third-party integration agreement.

A community-maintained reverse-engineered protocol is not district authorization or a stable supported integration contract. NORTHSTAR will not scrape authenticated browser pages, extract session cookies, collect StudentVUE passwords, or use undocumented endpoints without explicit district authorization.

**Implemented:** encrypted CSV/JSON grade import and historical grade display.

**Not implemented:** unattended live StudentVUE API synchronization. Obtain written NNPS approval and official endpoint/authentication documentation or a district-approved export before implementing direct integration.

Official NNPS support contact: Technology Service Center, `tsc@nn.k12.va.us`, (757) 881-5461 ext. 12411. Students may also contact their school Technology Support Specialist.

## Canvas bridge configuration still to verify

- `ALLOWED_ORIGIN` must match the deployed NORTHSTAR Pages origin exactly.
- `CANVAS_ORIGIN` must match the actual school Canvas HTTPS origin.
- The bridge allows scoped course/assignment/grade reads and validated text-entry/URL submission writes only. File upload, quiz-engine, discussion and external-tool submissions remain unsupported in the bridge.
- Never deploy guessed origin changes. Confirm both exact URLs first.

## Verification status

- Earlier Canvas/AI/bridge/grade/submission/diagnostic suites passed.
- StudentVUE unit tests cover quoted CSV parsing, JSON parsing, current-period selection, historical rows, validation and storage.
- Browser boot test covers module loading, version label, period filter refresh, current-period exclusion of prior-period work, submitted-age labels, ignored-course behavior, encrypted StudentVUE import, source labels and historical grade display.
- Latest GitHub Actions run passed: run 44150503126 on the development branch before merge. JavaScript syntax checks, seven unit suites, and jsdom browser boot tests all passed.
- Phase 3 changes merged from `northstar-0.4.3-phase-3-studentvue` to `main` in PR #4. Merge commit: `334514ba92668a12b4982c27f3b6647f4a6ec2a7`.
- The .4.3 code is in `main`; GitHub Pages deployment and the live page version still require verification in the repository's Deployments / Pages view.
- Real StudentVUE records have not yet been imported or compared against the student's portal. No authorized direct StudentVUE API is documented in the public material reviewed.

## Phase 3 acceptance checklist

- [x] Research NNPS/Edupoint public StudentVUE information and login portal.
- [x] Document the direct-API authorization limitation and safe integration gate.
- [x] Add validated CSV/JSON grade import with source/timestamp provenance.
- [x] Encrypt imported grade records in the device vault and migrate any legacy local import.
- [x] Add current and historical StudentVUE grade display to course detail.
- [x] Add current-marking-period scope and explicit Ledger period selector.
- [x] Refresh period filter options after period add/delete/import.
- [x] Correct submitted-date display to avoid overdue messaging.
- [x] Exclude unpublished and Canvas-locked assignments from active work.
- [x] Add persistent ignored-course exclusions and muted course display.
- [x] Change unknown grade display to N/A and distinguish grade sources.
- [x] Replace illustrative dashboard analytics with current-period workload and Canvas submission activity.
- [x] Set visible release identity and package version to .4.3.
- [x] Pass CI: syntax checks, seven unit suites and jsdom browser boot test.
- [x] Merge .4.3 release to `main` via PR #4.
- [ ] User imports a real StudentVUE-sourced grade report on iPad and verifies current/historical course and marking-period mapping.
- [ ] NNPS confirms whether an approved API, Ed-Fi source, or data export is available.
- [ ] If approved documentation is provided, implement and test direct read-only sync; otherwise record the district limitation and close Phase 3 with the encrypted import fallback.

## Next actions

1. Verify GitHub Pages has published NORTHSTAR / .4.3.
2. User tests the new .4.3 dashboard on iPad and imports a small, non-sensitive StudentVUE grade export if the portal offers one.
3. Ask NNPS whether a supported student-authorized API, Ed-Fi source, or approved grade export exists.
4. Compare imported current and historical grades with StudentVUE before treating the imported source as validated.
5. Keep the direct-integration item open until district authorization is answered or the import fallback is explicitly accepted.
