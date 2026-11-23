# NORTHSTAR 0.4 — Engineering Log

Last updated: 2026-11-22
Repository: `s0ndvyr/NORTHSTAR-2.0`
Production branch: `main`
Release identifier: `NORTHSTAR / 4.4.6.6`
Package version: `0.4.11`
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


### `.4.4.3` New Quizzes and assessment boundary

- Added read-only preview of New Quiz instructions and item prompts using the official `/api/quiz/v1/courses/:course/quizzes/:assignment` and `/items` GET routes. Question rendering intentionally reads only `item_body`/stimulus content and does not render `interaction_data`, `scoring_data`, or answer feedback.
- The quiz attempt itself is handed to the authenticated Canvas player. NORTHSTAR does not invent a New Quiz attempt start/answer/submit route.
- The Worker and workspace transport now allow those two exact GET routes only; no New Quiz write path has been opened.
- Confirm the NNPS token has access to the New Quizzes read endpoints and the new Worker source has been deployed before iPad live testing.


## NORTHSTAR / `.4.4.4` — Authenticated Canvas Sessions & LTI Launch

**Implementation status: Worker/client foundation and host integration source added; live Canvas/provider acceptance still pending.**

- Added `GET /login/session_token` to the private Worker with a strict allowlist: at most one `return_to` parameter, restricted to known Canvas assignment, quiz, file or external-tool routes. Arbitrary hosts, additional parameters, and non-Canvas return targets are rejected.
- Added the Canvas-generated assignment LTI assessment launch read route. Only `launch_type=assessment` plus one numeric `assignment_id` is accepted; callers cannot choose an arbitrary external URL or inject launch parameters.
- Added `getCanvasSessionUrl` and `getExternalToolLaunch` client helpers. Session URL origin must equal the connected Canvas origin; provider URLs must be HTTPS and must not contain embedded credentials.
- New Quizzes, student annotation, and media recording pages now expose a Canvas-generated authenticated session launch. External tool assignments use Canvas's `sessionless_launch` response. Unsupported Canvas-hosted document types can open through Canvas's own viewer.
- Added native iOS host bridge source: top-level persistent WKWebView, secure main-frame message validation, HTTPS-only destinations, back/forward/reload/close controls, and same-view popup handling. PWA iframe remains a best-effort fallback when no native host handler exists.
- Added bridge and workspace tests for safe session return routes, rejection of unsafe destinations/extra query parameters, assignment-specific LTI launch constraints, session URL origin checks and HTTPS-only provider URLs.

### Authentication architecture

- Current single-student testing still uses a personal Canvas API token for REST calls and session URL creation.
- To avoid requiring students to paste personal tokens, implement Canvas OAuth 2.0 Authorization Code flow in the Worker (client secret held only as a Worker secret, token refresh persisted in a private KV/Durable Object binding, short-lived app session cookie), or use an institution-installed LTI 1.3 tool launch plus approved Canvas service scopes.
- Both OAuth Developer Key registration and LTI 1.3 installation require the institution's Canvas administrator. No password scraping or private endpoint impersonation is permitted.

### Release acceptance still required

- [ ] Run all unit, bridge, workspace and browser boot tests on this exact branch head.
- [ ] Confirm the NNPS Canvas account is permitted to call `/login/session_token` and that the return URL opens the assignment page.
- [ ] Test an ungraded New Quiz inside the native WKWebView: launch, timer, attempt state, save, resume and completion.
- [ ] Test an assignment-specific sessionless LTI launch from the course and verify the provider can authenticate and submit.
- [ ] Test a Canvas `student_annotation` assignment in native DocViewer and verify the official Canvas submission record.
- [ ] Test a provider-specific Office/document assignment with its official authenticated viewer.
- [ ] Install and test the native WKWebView host on iPadOS; the web PWA iframe is not a guaranteed substitute.


## NORTHSTAR / .4.4.5 - Phase 4 In-App Routing & Native Host Hardening

**Status: implementation and mocked regression coverage added to the Phase 4 development branch. This is not a production release.**

- Ordinary HTTPS assignment/resource links now attempt the in-dashboard viewer first rather than immediately opening a new browser tab. The viewer has a visible external fallback because Canvas and external providers may block iframe embedding.
- Authenticated Canvas/LTI session views set a no-referrer policy and expose an explicit fallback when the PWA must use an iframe. Short-lived session URLs are cleared from the iframe on close and are not placed in local storage or debug output.
- Student Annotation copy now explains the actual handoff: the official assignment page opens first; the student then chooses Start Assignment, then Student Annotation. Canvas owns the saved annotation state and submission confirmation. An exported Document Studio PDF is not represented as native DocViewer annotation data.
- The native Swift host validates the trusted dashboard origin and HTTPS port, limits message URL size, refuses plaintext HTTP navigation and refuses credential-bearing popup destinations. The host still must be integrated into and compiled as a real iOS app target before the JavaScript bridge exists on a device.
- The browser boot suite now exercises both branches: the PWA iframe fallback and the native window.webkit.messageHandlers.northstarSecureContent handoff. It also verifies ordinary HTTPS resource links stay in the NORTHSTAR viewer first and that the escape link is explicit.
- Version strings are synchronized to NORTHSTAR / .4.4.5 and package 0.4.4.5.

### Verified automated status at the preceding exact commit

The .4.4.5 implementation commit df91fc51dd5031a12495cb37b9aa36d43bad2d4c passed the Phase 3 workflow (44456314835) and Phase 4 workflow (44456314798). The Phase 4 workflow also passed on the duplicate push run (44456305560). These tests use mock responses; they do not establish live NNPS Canvas, provider, Safari or Pencil behavior.

### Phase 4 exit gates - not to be marked complete until verified

- [x] Phase 3 and Phase 4 GitHub Actions pass on implementation commit `df91fc51dd5031a12495cb37b9aa36d43bad2d4c` (Phase 3 run `44456314835`; Phase 4 run `44456314798`).
- [ ] Deploy the matching repository Worker source to the personal Cloudflare Worker and verify Canvas session-token/LTI routes against the actual account.
- [ ] Test standard rich-text, URL and file submissions against a permitted low-risk assignment; confirm Canvas attempt history.
- [ ] Test supported Classic Quiz lifecycle and recovery with a practice quiz; confirm the real Canvas attempt.
- [ ] Test an intended non-graded discussion response and confirm Canvas records it.
- [ ] Test PDF rendering/annotation/export/upload with Apple Pencil on iPad.
- [ ] Test New Quizzes, Student Annotation, media recording, external LTI and provider-specific files on the real account. Record which ones can stay in the app and which ones need their provider's supported fallback.
- [ ] Test iPad Safari themes, keyboard/VoiceOver, reduced motion, offline draft retention, large files, browser back and return navigation.
- [ ] Integrate and compile the Swift presenter in a real iOS host app, then test the native WKWebView path on iPadOS. This repository alone is still a PWA.


## Phase 4.4.6.1 — Document Studio editable text-object foundation

**Release:** NORTHSTAR / 4.4.6.1  
**Package semver:** 0.4.6  
**Date:** 2026-11-22  
**Scope:** PDF Document Studio text editing, Apple Pencil feedback, release manifest, and in-app change history.

### Implementation

- Added scripts/document-editor.js, a dedicated DOM-based text-object layer above the PDF.js page. It owns structured text annotation normalization, stable identifiers, editing state, object selection, move and resize operations, contextual formatting controls, safe rich-text markup, and live pointer feedback.
- Text creation no longer requires typing into a separate toolbar textarea. Select Text, tap for a default box or drag to size one, and type directly into the placed object.
- Selecting an existing text object exposes Edit, Done, Duplicate and Delete controls. The object can be moved with its drag grip and resized with corner handles.
- Added font-family, size, preset, alignment, line-height, text/background color, and bold/italic/underline/strikethrough controls. Inline formatting is stored in sanitized rich-text markup.
- Added an Apple Pencil hover cursor when the browser reports actual pen hover events, a mouse hover fallback for desktop testing, and a text placement preview. No unsupported hardware hover is fabricated.
- Export now reads rich-text runs and maps supported font families and styles to PDF standard-font variants. Unsupported glyphs are replaced safely rather than causing an invalid PDF export. The original PDF content remains unchanged.
- Migrates legacy pdf_markup_v1 annotations into the pdf_markup_v2 storage key. The legacy key is retained.
- Added release.json as the authoritative app release/changelog manifest and scripts/release.js for the closable, accessible in-app changelog dialog.
- package.json now uses standard npm semver 0.4.6 and the dedicated northstarRelease metadata field 4.4.6.1.
- GitHub Pages now validates release metadata rather than matching hardcoded version strings. Publishing is gated on successful Phase 4 tests for both main and the development branch.
- The Canvas Worker source was not modified in this release. No Cloudflare deployment is implied.

### Verification requirements

- npm test covers the existing Canvas, assignment, bridge, browser boot, and academic workflows plus new document-editor model and release-manifest tests.
- JavaScript syntax checks run across all scripts/*.js and canvas-bridge/*.js.
- Wrangler dry-run validates the existing Worker bundle without deploying it.
- Browser-driven jsdom tests do not prove physical Apple Pencil hover, iPad Safari pointer capture, or live Canvas attachment behavior. Those remain device/account acceptance checks.
- Preview and production deployment state must be read from the actual GitHub Actions Pages deployment after the corresponding test run; a source commit alone is not a deployment.

### Changelog / release governance

- Every independent implementation, UI, bridge, infrastructure, or deployment-configuration change increments the final NORTHSTAR version component and receives its own release.json entry.
- package.json.version remains valid three-component SemVer; package.json.northstarRelease must exactly equal release.json.northstarVersion.
- Historical entries are marked as reconstructed when the repository supports a summary but not a fully verified release artifact.
- The bridge version and deployment status are reported as unchanged when no Worker/configuration update occurred.

### Phase 4.4.6.1 acceptance status at commit time

- [x] New editable text-object module and annotation schema normalization.
- [x] Direct text-object creation, selection, edit, move, resize, duplicate and delete controls.
- [x] Contextual typography controls and rich-text HTML sanitization.
- [x] Pencil/mouse hover cursor logic and text placement preview.
- [x] Rich-text export path using supported PDF font variants.
- [x] Legacy annotation key migration path.
- [x] Release manifest and in-app changelog dialog.
- [x] Release metadata and Pages workflow validation changes.
- [ ] Full automated suite must pass on the release commit.
- [ ] Latest preview deployment must be verified from GitHub Actions.
- [ ] Physical iPad Safari and Apple Pencil acceptance.
- [ ] Authenticated Canvas PDF attachment and permitted file-submission acceptance.


## Phase 4.4.6.3 — Manifest-driven release identity

**Release:** NORTHSTAR / 4.4.6.3  
**Package semver:** 0.4.8  
**Date:** 2026-11-22

### Changes

- Removed the legacy `NORTHSTAR / .4.4.5` constant from `scripts/premium.js`.
- Dashboard refresh no longer rewrites the version pill, which is owned by `scripts/release.js` and its authoritative `release.json` manifest.
- The Settings version display reads the active release from `window.NorthstarRelease.manifest`.
- Added release regression assertions that reject the old hardcoded version writer and require the dynamic manifest read.
- Updated the boot test to assert the visible 4.4.6.3 label after application initialization.

### Why .4.6.3 exists

The .4.6.2 feature and interaction changes were present in the preview artifact, but the exact .2 Phase 4 run failed its browser boot assertion because the dashboard's legacy version constant rewrote the version pill after the release module initialized. The .4.6.3 release corrects the competing writer and reruns the entire suite before promotion. The .4.6.2 changes remain included in this codebase.

### Verification boundaries

- [x] Phase 4 push suite passed on main commit 34e5bc02d0233d32df974dbfecdc919e8e7f04d2 in workflow run 45068031155.
- [x] Phase 3 and Phase 4 PR suites passed on release commit 816e34ca734ea4f88ecdaa576c413e418f11589f in runs 45067904876 and 45067904958.
- [x] Preview Pages deployment passed in workflow run 45067949929; release metadata verified 4.4.6.3 / 0.4.8.
- [x] Production + preview Pages deployment passed in workflow run 45068083612 on main commit 34e5bc02d0233d32df974dbfecdc919e8e7f04d2.
- No Canvas Worker source or Cloudflare private bridge deployment is part of this release.
- Physical iPad Safari / Apple Pencil and authenticated live Canvas checks remain manual acceptance items.


## Phase 4.4.6.4 — Test-pinned GitHub Pages deployment

**Release:** NORTHSTAR / 4.4.6.4  
**Package semver:** 0.4.9  
**Date:** 2026-11-22

### Change

- Added a Pages freshness gate which reads the current heads of both `main` and `northstar-0.4.4.2-quiz-continuity`.
- For each branch, the gate queries the Phase 4 workflow's completed push runs and requires a successful run whose `head_sha` exactly equals the branch's current SHA.
- The Pages build checks out the exact SHA returned by the gate, not the moving branch name.
- The deploy job requires both the successful freshness gate and the successful Pages build.
- A delayed older successful test event can no longer cause Pages to publish newer, untested branch contents. If either branch's current head has no successful Phase 4 run, publishing is held until its own test completes successfully.
- Added release regression assertions for the workflow-history query, matching SHA/conclusion, freshness dependencies, and pinned checkout.

### Verification

- [ ] Phase 4 test suite passes on the .4 release commit.
- [ ] Phase 4 tests pass on the synchronized preview branch.
- [ ] Pages freshness gate reports both source SHAs as successfully tested.
- [ ] Production and preview Pages deployment completes successfully.
- [ ] Final release metadata records the exact test and deployment run IDs.

No Canvas Worker source or private Cloudflare deployment is included.


## Phase 4.4.6.5 — Release regression assertion correction

- The first .4 Phase 4 run reached the unit suite and failed at `tests/release.test.mjs`: the test expected the current .4 release to contain a Pages run ID belonging to the earlier .3 release.
- Corrected the release test to require an unreleased candidate to remain pending deployment and to record .4's failed validation accurately.
- The test-pinned Pages gate remains in place; no deployment or promotion is claimed until fresh Phase 4 checks pass for both branch heads.
- Automated re-run and Pages deployment are pending.


## Phase 4.4.6.6 — Browser boot and Pages workflow correction

- The .5 Phase 4 unit suite passed, including the release-manifest assertions, but the browser boot test still expected the older .3 version pill. Updated it to assert the active .6 release identity.
- Corrected the Pages workflow deploy job: removed a duplicate `needs` key so it depends on both freshness verification and artifact build. The earlier duplicate key made the workflow invalid before any job could run.
- Fresh Phase 4 and Pages workflow validation are pending; deployment remains gated on passing tests for both current branch heads.


## Phase 4.4.6.6 — Deployment closeout

- Preview Phase 4 push run `45080603228` passed for `e8797f6148bd74cb9c6bf289e694b53bf549271c`.
- Main Phase 4 push run `45080715004` passed for `e849c91e68d006ff1187efa1d748a82b9f386fe7`.
- Test-pinned Pages freshness gate passed for both exact branch heads. It checked out those SHAs, verified both releases as `4.4.6.6 / 0.4.11`, built production and preview artifacts, and deployed successfully in run `45080756988`.
- The earlier run `45080736473` correctly held publication while main lacked a passing Phase 4 run, demonstrating that the freshness gate blocks stale/unverified branch heads.
- Automated Phase 4 CI and GitHub Pages deployment are complete. Physical iPad/Apple Pencil acceptance and live Canvas account acceptance remain external device/account checks.


## Phase 4.4.6.7 — Pages workflow event handling

- After both current branch heads passed Phase 4 tests, the freshness job correctly approved publication, but a redundant `workflow_run.event == 'push'` condition skipped the build when a different successful workflow completion triggered the Pages workflow.
- Removed the redundant event-type condition. The freshness job remains authoritative: it requires successful Phase 4 push runs for the exact current `main` and preview SHAs. Build and deploy still require that gate and a successful artifact build.
- Fresh release-specific Phase 4 tests and Pages deployment are pending.


## Phase 4.4.6.8 — Release-history test correction

- The .7 release-history assertion accidentally looked for the .6 Pages deployment ID on the new pending .7 candidate after a broad version update.
- Corrected the regression test to assert .8 remains pending and separately validate .6's deployed status and main commit provenance.
- Release-specific Phase 4 tests and Pages deployment remain pending.


## Phase 4.4.6.9 — Manifest-driven boot test

- The .8 Phase 4 run passed the release-manifest unit test but the browser boot test still hardcoded the .6 version pill.
- Replaced the literal with a value read from `release.json`, so future micro-version increments do not require manually editing the boot assertion.
- Fresh release-specific Phase 4 tests and Pages deployment are pending.


## Phase 4.4.6.9 — Deployment closeout

- Phase 4 push run `45081323554` passed on main and `45081332111` passed on preview; both tested the exact shared source SHA `fe5b69948d98969768fb5dc155f6f41ab1d861a8`.
- The Pages freshness gate passed for both exact branch heads. Production and preview were built from the tested SHA and deployed successfully in Pages run `45081377927`.
- Production Pages URL: `https://s0ndvyr.github.io/NORTHSTAR-2.0/`; preview URL: `https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/`.
- The .9 release removes the hardcoded browser boot version and the Pages build no longer has a redundant workflow-event filter.
- Automated tests and GitHub Pages deployment are complete. Physical iPad/Apple Pencil acceptance and live Canvas account acceptance remain external checks.


## Phase 4.4.7.1 — Canvas file upload finalization (implementation candidate)

**Objective:** Make the edited-PDF-to-Canvas path use the complete documented Canvas file upload protocol before submitting the resulting file ID.

**Implementation:**
- Assignment and Classic Quiz file uploads now travel from the browser to the authenticated private Worker as multipart data.
- The Worker initializes the correct Canvas submission upload endpoint using the documented `self/files` route.
- The Worker posts the signed `upload_params` and file to Canvas's opaque HTTPS storage URL without forwarding the Canvas bearer token.
- The Worker inspects the storage response's 3xx or 201 `Location`, validates that finalization returns to the configured Canvas origin and expected `/api/v1/files/:id/create_success` route, then performs the required authenticated GET.
- The Worker returns a file ID only after Canvas's finalization response contains a valid ID.
- Browser upload helpers no longer parse signed-storage responses or follow storage redirects themselves.
- Added mocked Worker coverage for 302 and 201 finalization, token isolation, unsafe/missing Location rejection, and app-side multi-file upload → file-ID payload → assignment submission.

**Release:** `4.4.7.1 / 0.4.15`  
**Status:** Awaiting CI and preview deployment. Live Canvas tenant acceptance remains mandatory; CI mocks do not prove the school's Canvas storage configuration.

**Known boundaries:**
- This path submits a flattened annotated PDF as an ordinary `online_upload` attachment when Canvas allows file uploads.
- It does not claim to write NORTHSTAR's custom ink/text layer into Canvas DocViewer's native `student_annotation` payload.
- Cloudflare Worker deployment is separate from GitHub Pages. The bridge deployment workflow must report success before live Canvas testing.


## Phase 4.4.7.2 — Canvas upload finalization and diagnostic test alignment

**Objective:** Make the edited-PDF-to-Canvas path complete Canvas's documented upload protocol before assignment submission.

**Implementation:**
- Assignment and Classic Quiz file uploads travel from the browser to the authenticated private Worker as multipart data.
- The Worker initializes the correct Canvas submission upload endpoint using the documented `self/files` route.
- The Worker transfers the signed `upload_params` and file to Canvas's opaque HTTPS storage URL without forwarding the Canvas bearer token.
- The Worker inspects the storage response's 3xx or 201 `Location`, validates that finalization returns to the configured Canvas origin and expected `/api/v1/files/:id/create_success` route, then performs the required authenticated GET.
- The Worker returns a file ID only after Canvas's finalization response contains a valid ID.
- Browser upload helpers no longer parse signed-storage responses or follow storage redirects themselves.
- Added mocked Worker coverage for 302 and 201 finalization, token isolation, unsafe/missing Location rejection, and app-side multi-file upload → file-ID payload → assignment submission.
- The first .7.1 test run exposed stale Worker-version assertions. .7.2 updates those fixtures and makes attachment diagnostics read the app version from the release manifest.

**Release:** `4.4.7.2 / 0.4.16`  
**Status:** Awaiting CI and deployment. Live Canvas tenant acceptance remains mandatory; CI mocks do not prove the school's Canvas storage configuration.

**Known boundaries:**
- This path submits a flattened annotated PDF as an ordinary `online_upload` attachment when Canvas allows file uploads.
- It does not claim to write NORTHSTAR's custom ink/text layer into Canvas DocViewer's native `student_annotation` payload.
- Cloudflare Worker deployment is separate from GitHub Pages. The bridge deployment workflow must report success before live Canvas testing.


### 4.4.7.2 deployment closeout

- Phase 4 CI passed on the exact preview head `0344bbb5e5b031bbe56f97c6c9a7c85dfa5f933d` in run `45085954397`.
- GitHub Pages freshness verification passed for both exact branch heads. The preview build was verified as NORTHSTAR `4.4.7.2 / 0.4.16`; Pages deployment run `45085996901` completed successfully.
- The Cloudflare Worker validation and regression suite passed, and the Worker deployment workflow `45085853219` deployed `northstar-bridge` successfully from commit `3bbc5475c6c0b4fb32cdbc341087a7beb0cf3c14`.
- Preview frontend: `https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/`.
- Production frontend remains on `4.4.6.9`; this Canvas work has not been promoted to main.
- Automated tests and deployment are complete. A real PDF upload and submission in the connected Canvas tenant are still required before claiming end-to-end success.


## Phase 4.4.7.3 — Document Studio submission UI handoff

- Corrected an important selection bug: when an annotated PDF is staged through **Use annotated PDF from Document Studio**, it now replaces other selected/prepared files for that submission. This matches the visible UI promise and prevents accidental extra attachments.
- Added a browser boot integration test that opens an `online_upload` assignment, uses a Document Studio-exported PDF, uploads that exact file, sends the finalized Canvas file ID in the `online_upload` submission, and checks that Canvas's confirmed submission state is persisted.
- The first test attempt reached the expected `[777]` file-ID payload but the Node/jsdom assertion compared arrays from different JavaScript realms. The test now normalizes the array before comparison.
- Release: `4.4.7.3 / 0.4.17`. Phase 4 CI and preview deployment pending.
- Live Canvas tenant acceptance is still required; browser tests use a mocked Canvas response.


## Phase 4.4.7.4 — Release test history correction

- The .7.3 candidate's Phase 4 run exposed a stale release test that expected the previous .7.2 preview deployment ID on the current pending candidate.
- Updated the test to validate .7.4's pending status and separately retain .7.2's successful preview deployment record.
- Carries forward the Document Studio annotated-PDF-only selection behavior and browser boot integration test.
- Release: `4.4.7.4 / 0.4.18`. CI and preview deployment pending.


### 4.4.7.4 deployment closeout

- Phase 4 tests passed on exact preview commit `fd7b6e453bf085ac0ab6f2a96c29ee0b800fc9bc` in run `45086802452`.
- The Pages freshness gate verified both exact branch heads; production was built from 4.4.6.9 and preview from 4.4.7.4 / package 0.4.18.
- GitHub Pages deployment run `45086841863` completed successfully.
- The Canvas bridge Worker deployment from run `45085853219` remains active; it was built and deployed from commit `3bbc5475c6c0b4fb32cdbc341087a7beb0cf3c14`.
- Preview: `https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/`. Production frontend remains on 4.4.6.9.
- Automated checks and preview deployment are complete. A real upload and assignment submission in the connected Canvas tenant remain the final acceptance gate.
