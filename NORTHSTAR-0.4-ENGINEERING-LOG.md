# NORTHSTAR 0.4 — Engineering Log

Last updated: 2026-11-18
Repository: `s0ndvyr/NORTHSTAR-2.0`
Production branch: `main`
Release identifier: `NORTHSTAR / .4.4.3` (development branch; not yet production)
Package version: `0.4.4.3`
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


---

# Phase 4 — Assignment Workspace (.4.4)

**Status: merged to `main`; awaiting live iPad/Canvas acceptance.** PR #5 merged as `4a8d10d15c4f23321e93ee56c3b0daf816d5b096`. The production GitHub Pages build/deploy and Cloudflare Workers build checks completed successfully. The personal Canvas bridge Worker still requires the user to publish the updated `canvas-bridge/worker.js` in their Cloudflare dashboard, as documented in the README.

## Product objective

NORTHSTAR becomes an academic work environment as well as an organizer. Canvas remains the source of truth for availability, attempt limits, submission records, grading and final quiz completion. NORTHSTAR must never claim a submission succeeded until Canvas confirms it.

## Implemented in the .4.4 development branch

- Visible version identity updated to `NORTHSTAR / .4.4`; package version is `0.4.4`.
- New `scripts/workspace.js` provides bridge-only Canvas write transport, official quiz attempt start, question retrieval, answer saving, quiz completion, and signed file-upload flow.
- Quiz assignments are matched to Canvas quiz IDs using the course quizzes endpoint. Quiz attempts start only after an explicit confirmation; Canvas validation token and attempt number are retained for answer updates and completion.
- Native quiz workspace currently renders multiple-choice, true/false, multiple-answer, essay, short-answer, text-only and numerical/calculated questions. It reads the official Canvas quiz time-left endpoint and resynchronizes the visible countdown every 30 seconds; Canvas remains authoritative for timeout. Unsupported question types or hidden answer choices are not submitted by NORTHSTAR; the student is directed to continue the same attempt in Canvas.
- Quiz completion requires a second explicit confirmation. If the quiz attempt starts but questions cannot be retrieved, NORTHSTAR preserves the returned attempt metadata and tells the student to continue in Canvas rather than starting another attempt.
- Text-entry and URL assignment submissions remain supported. Resubmissions use Canvas' official submission endpoint and preserve earlier attempts.
- Online file submissions first read `/api/v1/users/self` to obtain the authenticated student's Canvas user ID, then use Canvas' documented `/courses/:course/assignments/:assignment/submissions/:user_id/files` signed upload initialization endpoint. The file is sent to the returned HTTPS destination without forwarding the Canvas bearer token, then its returned Canvas file ID is submitted. The bridge validates file metadata and limits the upload to 25 MB.
- Graded discussion assignments are mapped to discussion topic IDs. The workspace supports reading visible discussion entries, posting an initial response, and replying to an entry through Canvas' discussion API.
- Assignments can be hidden/restored locally. Hidden items are excluded from active dashboard, Ledger and course views; the Ledger adds Active / Hidden / All visibility filters. This is a local NORTHSTAR preference and does not alter or delete the Canvas assignment.
- Assignment workspace adds a best-effort in-dashboard resource preview for HTTPS Canvas/resource links with an explicit external-open fallback. Canvas and LTI providers may block iframe embedding or third-party cookies; NORTHSTAR does not bypass those controls.
- Canvas bridge now has narrowly allowlisted read/write routes for quiz attempts, quiz answers, quiz completion, file upload initialization, file submissions, and discussion posts/replies. It rejects arbitrary methods, hosts, write routes, write query parameters, malformed payloads and unapproved submission types.
- A Phase 4 GitHub Actions workflow checks syntax, runs unit suites and browser boot tests on the development branch and pull requests.

## Supported Canvas paths and known boundaries

| Canvas assignment path | NORTHSTAR behavior |
|---|---|
| Online text entry | Native draft and confirmed submit/resubmit |
| Online URL | Native URL entry and confirmed submit/resubmit |
| Online file upload | Signed upload and confirmed Canvas file-ID submission; 25 MB cap |
| Classic Canvas quizzes | Native attempt and question workspace for supported question types |
| Graded discussions | Native initial post and reply |
| External LTI / third-party tools | Open the authenticated Canvas assignment/tool; tool-specific work remains in that provider |
| New Quizzes or quiz types not exposed to the legacy Quiz API | Canvas fallback; no fake quiz editor or simulated completion |
| Google Docs, media recording, student annotation, paper/offline work | Canvas/provider fallback unless an official supported API workflow is established |

Canvas' public API supports quiz attempt creation, answer updates, and completion, but access depends on the school's Canvas configuration and the specific quiz type. The question API only returns possible answers when permissions allow. The bridge and UI therefore handle denied/unsupported responses explicitly.

## Phase 4 security and reliability rules

- Never send the Canvas token to a signed file-upload destination or any third-party LTI site.
- Never auto-retry a write after a network error or ambiguous response. The user must check Canvas before retrying.
- Require explicit confirmation before starting a quiz, publishing a discussion response, uploading a file, or submitting an assignment/quiz.
- Do not use undocumented Canvas or LTI endpoints, scrape embedded third-party pages, or claim that an external tool was completed in NORTHSTAR.
- Preserve the current Canvas attempt if question retrieval fails after attempt creation.
- Canvas controls availability, due dates, late policies, attempt limits, IP restrictions and final grades.

## Phase 4 verification status

Automated CI is green on the merged .4.4 release: JavaScript syntax checks, eight unit suites (including Canvas bridge allowlists, quiz lifecycle, signed-upload transport and assignment hide/restore), and jsdom browser boot all passed. GitHub Pages production build/deploy and the Cloudflare Workers build checks also completed successfully. Automated tests use mocks and do not verify the student's live Canvas account. Real Canvas quiz, file, discussion and resubmission tests remain user acceptance gates.

- [x] Confirm GitHub Actions syntax, eight unit suites, and jsdom browser boot checks pass on the .4.4 development branch (run #44236628866).
- [ ] Verify browser boot and responsive workspace behavior on iPad Safari.
- [ ] Live-test a low-risk text-entry assignment and confirm Canvas submission state/attempt number.
- [ ] Live-test a permitted file upload and confirm the uploaded file is attached to the Canvas submission.
- [ ] Live-test a graded discussion post/reply and confirm Canvas records it.
- [ ] Live-test a practice/ungraded classic Canvas quiz first; verify start, answer save, resume and completion.
- [ ] Verify a locked/New Quizzes/unsupported quiz gracefully falls back without creating duplicate attempts.
- [ ] Verify hide/restore persists after refresh and does not mutate Canvas data.
- [ ] Redeploy the updated `canvas-bridge/worker.js` to Cloudflare and verify the configured Canvas origin and NORTHSTAR origin before enabling writes. This deployment is separate from GitHub Pages and is not automatic.
- [ ] Review all write paths and file upload behavior for ambiguous network outcomes.
- [x] Create release PR #5 and merge .4.4 to `main`.
- [x] Verify GitHub Pages production build/deploy and Cloudflare Workers build checks completed successfully.
- [ ] Publish the updated personal Canvas bridge Worker from `canvas-bridge/worker.js` in the Cloudflare dashboard; this is a separate Worker deployment and must be verified before live Canvas writes.

## Next engineering work

1. Resolve any CI failures and add regression tests for the new upload/discussion/quiz paths.
2. Finish workspace UI polish, progress/navigation, time limits, and safe handling for all Canvas question formats exposed to students.
3. Validate the best-effort local resource viewer against Canvas and external LTI pages; keep explicit external fallback for providers that disallow embedding.
4. Complete the iPad live acceptance checklist before merging .4.4.


## Phase 4 hardening follow-up

- Quiz question support is now classified in the dedicated workspace module so the renderer and completion gate share the same capability rules.
- Text-only quiz items are treated as informational and are not sent as student answers.
- Fill-in-multiple-blanks and other unimplemented formats are explicitly rejected by the NORTHSTAR completion gate; the student is directed to continue the same attempt in Canvas.
- Multiple-choice, true/false, and multiple-answer questions require Canvas to expose answer choices before NORTHSTAR treats them as supported.
- Added regression coverage for supported and unsupported question formats.
- Updated the README to distinguish native completion from official Canvas/provider fallbacks and to document the required Cloudflare Worker redeployment and live-test safety gates.


---

# Phase 4.4.1 — Native Assignment Experience

**Status: merged to main; live Canvas/iPad acceptance pending.** PR #6 merged as `f7db388daede10ea735257aea3d5458620b47756` from `northstar-0.4.4.1-native-assignment-experience`. The GitHub Pages production build/deploy and repository Cloudflare Workers build checks passed. The personal Canvas bridge still requires a separate manual redeploy from `canvas-bridge/worker.js`.

## Product change

Opening an assignment now navigates to a full-screen NORTHSTAR route (hash route #assignment/assignment-id), rather than relying on a modal or opening the Canvas page. The page has an animated loading state, themed header, in-app assignment instructions, resource list, course/due/status details, personal work area, and submission panel. Browser back and the in-app back control return to the prior NORTHSTAR view.

Canvas assignment descriptions are sanitized before display. Script/embedded executable elements, forms, inline event handlers, and unsafe URLs are not copied into the page.

Classic quizzes and graded discussions now use full-page NORTHSTAR assessment/workspace shells as well. Supported classic quiz questions are still read and submitted using Canvas' official quiz attempt endpoints; discussion posts and replies use Canvas' official discussion endpoints.

## PDF Document Studio

- Attached PDFs are downloaded through the personal HTTPS Canvas bridge and rendered in the in-app document studio using PDF.js.
- The annotation canvas accepts freehand drawing, highlighting, erasing, lines, arrows, rectangles and ellipses only when the Pointer Events input reports pointerType = pen. Finger touch and mouse input are rejected for ink/shape tools.
- Typed text notes can be placed on the PDF. Page navigation, zoom, color and size, per-page undo/redo, and local annotation persistence are available.
- Export produces a flattened annotated PDF with the source document preserved. When an assignment permits online_upload, the exported PDF can be attached through Canvas' signed upload flow.
- PDF.js and pdf-lib are version-pinned runtime ES modules from jsDelivr. PDF viewing/export therefore requires network access to those libraries.
- Annotation source data stays in local browser storage until exported. It is not a Canvas DocViewer annotation session and is not uploaded automatically.
- Canvas's public Submissions API does list student_annotation and annotatable_attachment_id. However, its documented request does not specify how a custom editor transmits the actual DocViewer ink/text annotation payload. NORTHSTAR does not submit the attachment ID alone or claim that a flattened PDF export updates Canvas' native DocViewer annotation state. The official Canvas DocViewer workflow remains required for those special assignments unless a supported annotation-payload API is established and verified.

## Canvas file retrieval and bridge

canvas-bridge/worker.js now supports authenticated reads for an individual assignment and its course file metadata, plus a custom file-download path. The Worker retrieves the file metadata from the configured Canvas host, validates the HTTPS download URL, follows a bounded number of redirects, and forwards the Canvas bearer token only while the request remains on the exact configured Canvas origin. The token is not forwarded to cross-origin signed storage hosts. CORS exposes only the content headers needed to identify the downloaded document.

The Worker must be redeployed separately in the user's Cloudflare dashboard before in-app PDF viewing can be live-tested. Verify the existing CANVAS_ORIGIN and ALLOWED_ORIGIN values before deployment. GitHub Pages deployment alone does not update the manually managed personal Canvas bridge.

## Scope boundaries

Implemented inside NORTHSTAR:
- Standard assignment instructions and attachments in a full-screen route.
- PDF viewer and first annotation toolkit.
- Private writing workspace and supported text/URL/file submission operations.
- Supported classic quiz attempt and graded discussion pages.
- Explicit provider boundary messages for unsupported paths.

Not represented as complete:
- New Quizzes and quiz question formats not supported by the classic Quiz API.
- External LTI tools and third-party Google Docs/media workflows.
- Native Canvas DocViewer annotation-state submission for student_annotation.
- Full parity with every Canvas toolbar/tool, rich text editor feature, rubric interaction, media recorder, or course-level Canvas UI.

These features require separate official provider integrations and live acceptance work. NORTHSTAR must not claim that the provider saved or submitted data unless it receives a confirmed response from that provider.

## Verification

- GitHub Actions runs syntax checks, eight unit suites, and the jsdom browser boot test. Tests cover the assignment route, safe description rendering, Pencil pointer detection, Canvas file metadata/binary retrieval transport, redirect token handling, quiz/assignment workflows and bridge allowlists.
- Automated tests use fixtures/mocks; they do not verify the student's live Canvas account, PDF attachments, iPad Pencil hardware, or an active quiz.
- Live acceptance checklist: deploy the personal Worker; connect Canvas; open a standard assignment; view a PDF; test Pencil-only annotations and export; attach an exported PDF to an assignment that accepts online_upload; verify text/URL/file attempts in Canvas; use an ungraded classic quiz for quiz start/save/complete; verify a discussion post only when it is intended to publish.

## Release checklist

- [x] Set app release identity and package version to NORTHSTAR / .4.4.1 / 0.4.4.1.
- [x] Add full-screen in-app assignment navigation and loading screen.
- [x] Add sanitized Canvas assignment description and attachment discovery.
- [x] Add PDF.js rendering, Apple Pencil-only ink/shapes, text notes, eraser, page navigation/zoom, undo/redo, and flattened PDF export.
- [x] Add secure bridge file download without forwarding the bearer token to cross-origin signed storage.
- [x] Connect exported annotated PDFs to supported Canvas online_upload submission flow.
- [x] Run syntax, unit and jsdom browser boot checks on the feature branch.
- [ ] Redeploy the personal Canvas Worker from `canvas-bridge/worker.js` in the Cloudflare dashboard; this is separate from the repository's Cloudflare Workers build check.
- [x] Create and merge PR #6 to `main`.
- [x] Verify GitHub Pages production build/deploy.
- [x] Verify the repository Cloudflare Workers build check.
- [ ] Complete live iPad Safari / Apple Pencil / real Canvas acceptance.


## Phase 4.4.2 — Quiz Continuity & Safe Recovery

**Status: implementation on branch `northstar-0.4.4.2-quiz-continuity`; CI and review pending.** Release identity: `NORTHSTAR / .4.4.2`; package version: `0.4.4.2`.

- Before offering a new classic quiz attempt, NORTHSTAR checks Canvas' current-user quiz submission endpoint.
- An unfinished attempt is resumed only when the current tab still holds the matching attempt ID, attempt number, and validation token. Existing questions and Canvas time-left data are reloaded.
- If attempt metadata is missing or cannot be verified, NORTHSTAR refuses to start another attempt and directs the student to the existing Canvas attempt.
- Supported answers autosave to Canvas after a 1.2-second debounce. Writes are serialized; ambiguous failures are surfaced and never silently retried. Manual save remains available.
- Quiz completion explicitly warns about unanswered supported questions and still refuses to complete when any unsupported question type remains.
- Attempt validation data is stored in tab-scoped sessionStorage, not persistent localStorage or the long-lived credential vault. Losing the tab session may require continuing that attempt in Canvas.
- The current repository Worker already permits the current-user quiz submission read route. The separately uploaded read-only Worker is older and must not replace the repository's validated read/write Worker.

### Phase 4.4.2 acceptance checklist

- [x] CI passes syntax checks, all unit tests and browser boot tests (Phase 3 and Phase 4 GitHub Actions runs passed on the release commit).
- [ ] Verify a practice/ungraded classic quiz can start, autosave, navigate away and resume in the same tab.
- [ ] Verify an unfinished attempt with no recoverable tab session does not offer a second Start action.
- [ ] Verify an unsupported question type blocks NORTHSTAR completion and preserves the existing attempt.
- [ ] Verify unanswered-question warning and explicit final confirmation.
- [ ] Verify a completed attempt clears temporary recovery data and permits a later Canvas-authorized attempt.
- [ ] Test on iPad Safari with the current private Worker deployed.


## NORTHSTAR / .4.4.3 — Writing, Resource Center & Quiz Navigation

**Status: implementation added to the `.4.4` development PR; automated acceptance pending.**

- Replaced the plain-text draft area with a contenteditable writing surface and a restrained formatting toolbar (bold, italic, underline, bullets, numbering and block quote). Draft markup is sanitized against a strict tag/attribute allowlist before device-local persistence and before Canvas submission. Rich text is subject to the current 16 KB bridge text-entry limit. Paste is normalized to plain text to avoid importing unsafe office markup.
- Added safe in-app preview for supported image, audio, video and text attachments downloaded through the private Canvas bridge. PDF continues to use Document Studio. Unsupported office/provider formats receive an explicit explanation and source fallback rather than a fake preview. Downloads above the configured 30 MB preview cap are not loaded into memory.
- Assignment description links now attempt internal routing for matching Canvas assignments/quizzes and file resources. Other secure links use the existing in-dashboard preview panel with a visible external fallback when the provider blocks embedding.
- Quiz workspace now provides question navigation, answered-state progress, question flags, and rejects empty multiple-answer selections as unanswered.
- Object URLs and quiz timers are released when leaving the assignment room.
- These are client-side behaviors. GitHub Actions can validate fixtures and DOM behavior; only the owner's live iPad/Canvas session can prove school-specific files, quizzes, discussion permissions and actual submission outcomes.

### Phase 4 exit criteria — still required

- [ ] Run Phase 3/4 GitHub Actions after this commit.
- [x] Owner confirmed Cloudflare Worker deployed on 2026-11-18 (repository source must still match the published Worker).
- [ ] Live-test rich-text submission with a low-risk assignment and confirm the Canvas attempt/HTML.
- [ ] Live-test file upload and at least one image/text/PDF resource preview.
- [ ] Live-test quiz attempt detection, autosave, question navigation, flagging, resume and completion with an ungraded practice quiz.
- [ ] Live-test discussion read/post/reply with a non-graded thread or permitted test space.
- [ ] Test Canvas link routing from Dashboard, Ledger, Courses, Calendar, search and assignment instructions.
- [ ] Test PDF annotation export, iPad Apple Pencil interaction, touch scrolling, and flattened file upload where allowed.
- [ ] Review unsupported New Quizzes, LTI, DocViewer annotations and restricted external resources; verify each limitation has a clear fallback.
- [ ] Complete iPad Safari regression, reduced-motion, theme, keyboard/VoiceOver, offline/draft and large-file checks before merging or labeling Phase 4 complete.
