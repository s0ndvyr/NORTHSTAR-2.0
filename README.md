# NORTHSTAR | Academic Command Center

A redesigned, iPad-friendly academic dashboard for GitHub Pages. The interface starts with **example data**, clearly labeled; connecting Canvas replaces that data with your live courses and assignments.

## Run and publish

The GitHub Actions Pages workflow publishes the production application from `main` at [https://s0ndvyr.github.io/NORTHSTAR-2.0/](https://s0ndvyr.github.io/NORTHSTAR-2.0/). The latest tested development build is published under [https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/](https://s0ndvyr.github.io/NORTHSTAR-2.0/preview/). Publishing is gated on the Phase 4 test workflow; the Pages workflow copies the release manifest and matching application assets for each channel.

For local testing, run `python3 -m http.server 8000` from the repository root and open `http://localhost:8000`.

## Connect Canvas

1. Open **Connect**. Enter your school's Canvas origin, e.g. `https://school.instructure.com` (no path), and an access token from Canvas **Account → Settings → New Access Token**. Do not send your token in chat, paste it into the code, or commit it.
2. Tap **Connect & sync**. If your Canvas instance permits direct browser requests, your courses and assignments will load. A correct token can still fail when a school blocks cross-origin requests (CORS).
3. If direct sync fails, deploy the optional bridge below, enter its HTTPS origin in the **private Canvas bridge URL** field, and reconnect.

NORTHSTAR 0.4 can remember Canvas credentials encrypted in IndexedDB using AES-GCM and a non-extractable device key. The token is sent in the Authorization header, never in a URL or through a public CORS proxy. Device encryption protects against casual storage inspection; it does not protect against malicious JavaScript or an XSS vulnerability running on this origin. Use a trusted device, keep the site updated, and tap Disconnect to erase the saved credential. If secure browser storage is unavailable, the connection remains in memory for the current page only.

**Important:** the previous version stored your token unencrypted and sent it to public proxy services in URL query strings if direct access failed. If you previously tried that version, revoke that token in Canvas and create a new one.

### Connection troubleshooting checklist

- [ ] **School URL:** Use the exact HTTPS Canvas origin, with no path, for the school where the token was created.
- [ ] **Token:** Check that it is current and belongs to the same school account. A 401 usually means Canvas rejected it. Create a fresh token if needed.
- [ ] **Permissions:** A 403 can mean a token, account, school policy, or bridge restriction. Ask the Canvas administrator if you cannot resolve it.
- [ ] **Browser access:** If a valid token still cannot connect, the school may block cross-origin browser requests. Set up the optional private bridge below.
- [ ] **Bridge:** Ensure `CANVAS_ORIGIN` matches the school's Canvas origin and `ALLOWED_ORIGIN` matches the exact Northstar site origin; redeploy the Worker after changing them.
- [ ] **No courses:** Confirm the account has active enrollments. The sync fetches active courses, not every historical or inaccessible course.
- [ ] **Token security:** Revoke any token used with the old app, which may have sent it to public proxies. Never share tokens in chat or commit them to a repository.

The checklist also appears in the Connect panel, and opens automatically on connection or sync failure. Checkmarks last only while the page is open. If you ask an administrator for help, share the status message without your token or other sensitive details.

### Debug console

The Connect panel also contains a **debug console** that traces every request an attempt makes. Each entry shows the timing, HTTP status, `Server`/`Content-Type` headers, a truncated response body (for example a Canvas `{"errors":[…]}` payload or a bridge `{"error":"Path not allowed"}`), a `X-Request-Id` you can give your administrator, and a plain-language diagnosis. When a request never completes, the console runs three probes — host reachability, an **unauthenticated** request to the same URL (to tell a CORS/preflight block from a dead host), and, in bridge mode, an origin check against `ALLOWED_ORIGIN` — and states which one failed. Typical verdicts: `Blocked (403 — org policy, scopes, or WAF)`, `Blocked by CORS/preflight (org policy or WAF)`, `Blocked by bridge config (403, path/origin)`, `User-Agent refused (403 via bridge)`, `Token rejected (401)`, `URL redirects away from Canvas`, `Canvas host unreachable`. Use **Copy report** to copy the full trace for support; the token is redacted from everything the console displays or copies.

### Set up your own optional bridge

GitHub Pages cannot run server-side code. The included `canvas-bridge/worker.js` is an optional narrowly scoped Cloudflare Worker for your personal use; you need a Cloudflare account.

1. In the Cloudflare dashboard, create a Worker. Replace its code with `canvas-bridge/worker.js`.
2. The supplied Worker is configured for the Canvas origin provided in the accompanying Worker configuration (`https://nnps.instructure.com`) and the NORTHSTAR Pages origin (`https://s0ndvyr.github.io`). Verify both values against your current school and deployment before publishing. For localhost testing, use your exact origin, for example `http://localhost:8000`.
3. Deploy. Paste the Worker’s origin (e.g. `https://northstar-bridge.example.workers.dev`) into Northstar's bridge field, then connect.
4. Keep the bridge under your control. It forwards narrowly allowlisted Canvas reads and validated writes for text/URL/file submissions, classic quiz attempts, and graded discussion posts/replies to your configured Canvas host. The Worker never stores or logs tokens in code. File-upload initialization is proxied, but the actual file bytes go directly to Canvas's signed HTTPS upload URL without the Canvas bearer token. The origin check helps browsers enforce access but is **not authentication**: someone can forge an Origin header outside a browser. Monitor the deployment and add platform-level access controls/rate limits as appropriate. Treat the bridge operator and hosting provider as trusted with the token and Canvas responses.

If your school's Canvas security policy blocks external access, ask the Canvas administrator. The bridge cannot fix an expired token, inadequate permissions, or a blocked account.

## NORTHSTAR 0.4 — Phase 2: Canvas synchronization

- Sync reads active courses, paginated assignments and the current user’s submission records, assignment groups, and course grading configuration. Course requests explicitly ask Canvas for `total_scores`, `current_grading_period_scores`, and `grading_periods` where the school exposes them. Official Canvas enrollment totals are shown separately from NORTHSTAR’s assignment-based estimate; neither is silently substituted for the other. The bridge also accepts validated text-entry and URL submission POSTs. Keep your existing school and allowed-site origins.
- Settings → Marking Periods: enter your school's dates once. Export a JSON backup to restore these periods after clearing browser data or changing devices; imports are validated and merge without duplicating matching periods. The ledger groups work by due date, including missing work in archived periods. Undated work gets its own bucket. These local organizational periods are not official Canvas grading periods.
- Grade calculations are deterministic: scored work and missing-as-zero count, excused and other ungraded work do not. Category weights come from Canvas. If metadata cannot be loaded, NORTHSTAR marks the estimate as incomplete and warns rather than presenting it as an official grade. These calculations remain estimates, not official grades: school-specific overrides, extra-credit weighting, never-drop rules, and Canvas's point-impact drop algorithm are not fully reproduced (drops currently use assignment percentage). Letter and GPA scales are estimates unless supplied by the course.
- Live what-if sliders project the selected average on currently pending work. GPA is an unweighted estimate; course credits are not known.
- Settings → AI: supply a Gemini key and model, choose whether to remember the key encrypted on this device, then test. Copilot and assignment study tools call Google directly; course/assignment context is sent to Google when requested. Free-tier availability and quotas depend on the account/model. Without a key the rule-based guide remains available.
- Canvas and Gemini credentials can be stored in the encrypted IndexedDB vault. The encryption key is non-extractable and device-local. This is encryption at rest, not a defense against malicious same-origin JavaScript; secrets must still be treated as accessible to the running application. Disconnect Canvas or clear the Gemini key to erase them.
- Notes/drafts stay device-local. HTTPS resources are previewed in the NORTHSTAR viewer first with a visible external fallback when a provider blocks embedding. Authenticated Canvas/LTI experiences prefer the native WKWebView host when it is installed; the GitHub Pages PWA uses a best-effort iframe.
- Phase 2 (text/URL): open an assignment workspace, choose an allowed type, and review/confirm before sending. Text entry sends the workspace draft as escaped plain text; URL entry sends the URL. These operations require a private bridge connection. Resubmitting creates another attempt where Canvas permits it; there is no student unsubmit/erase operation.
- The current private Worker permits narrowly validated text, URL, and file submissions; classic quiz attempt creation, answer saves and completion; and discussion posts/replies. Arbitrary Canvas write routes, impersonation fields, query-string writes, and unapproved submission payloads remain rejected.
- Submission state normalization distinguishes missing, submitted, awaiting grading, graded, and excused work. If Canvas reports that the grade does not match the latest submission attempt, NORTHSTAR does not display the stale score as the current attempt. Every UI submission asks for confirmation naming the course/assignment and previewing the content. There are no automatic retries. On a network or unreadable-response failure, check Canvas before attempting again. Canvas enforces deadlines, availability, and attempt limits. Drafts are retained locally after submission.
- Phase 4 adds native workspaces for supported text/URL/file submissions, supported classic quiz question types, graded discussions, and PDF annotations/export. Unsupported quiz formats, New Quizzes or LTI tools that require provider authentication, and Canvas DocViewer student-annotation submission remain explicit fallbacks.
- Demo charts and flashcards remain examples, not school analytics. No StudentVUE connection is provided.

## NORTHSTAR 0.4 foundation updates

- Device vault: Canvas and Gemini credentials are AES-GCM encrypted in IndexedDB when the remember option is enabled. The key is non-extractable and stored by the browser. This is encryption at rest, not protection from same-origin XSS or malicious scripts.
- Session recovery: the last successful Canvas courses, assignments, official enrollment grade totals, group weights, sync quality warnings, and sync timestamp are stored as an encrypted version-2 snapshot. Version-1 snapshots remain readable. If the network is unavailable, NORTHSTAR can restore the last snapshot and label it as cached/offline rather than falsely calling it live.
- Marking-period recovery: Settings supports validated JSON export/import. Imports merge and de-duplicate matching periods instead of silently replacing existing data.
- Credentials: Canvas token and Gemini key fields retain the saved value in masked form, with explicit Show/Hide controls. Disconnect removes the stored Canvas credential and cached Canvas snapshot.
- External assignment content: NORTHSTAR attempts an in-dashboard HTTPS preview first and offers a clearly labeled external fallback. The PWA cannot bypass provider iframe restrictions or Safari cookie policy.
- Themes: added Aurora, Nebula, Starlight, and Solar palettes, plus restrained atmospheric background effects and reduced-motion handling. Midnight is now the default.
- Gemini requests: API keys are sent in the `x-goog-api-key` header, not embedded in the request URL.

### Tests

Run `node tests/debug.test.mjs`, `node tests/bridge.test.mjs`, `node tests/canvas-sync.test.mjs`, `node tests/grades.test.mjs`, `node tests/ai.test.mjs`, and `node tests/submissions.test.mjs`.
For DOM boot + mocked live sync, run `npm install` once and then `node tests/boot.test.mjs`. The `npm test` script includes all tests. Do not commit `node_modules`.

### Phase 2 synchronization behavior and limits

- Canvas course requests ask for the official enrollment totals and current Canvas grading-period totals when the school makes them available. These fields may be hidden by school policy or unavailable to the token; NORTHSTAR then labels the assignment-based calculation as an estimate.
- A sync builds a candidate data snapshot first. If a required course or assignment request fails, the previous in-memory coursework and cached snapshot are retained rather than replaced with partial data. Optional course grading metadata and assignment-group failures are recorded as data-quality warnings.
- A submission with a current ungraded attempt is labeled **Awaiting Grading**. A grade from an earlier attempt is not presented as the score for the current attempt when Canvas reports `grade_matches_current_submission: false`. Excused work is excluded from pending-work priorities.
- Manually configured NORTHSTAR marking periods remain local organizational periods. Canvas grading-period totals are shown as a separate official source and are not assumed to be the same dates or labels.
- Live synchronization has not yet been verified against the owner's authenticated school account in this development environment. The included tests use deterministic Canvas-shaped fixtures; the final live check must be performed with the owner's own Canvas connection and the correct Worker deployment.


## NORTHSTAR / .4.3 — Phase 3 academic intelligence

- The dashboard and Academic Ledger default to the current user-defined marking period. The Ledger can switch to a specific marking period or all periods. Older periods do not drive Today's Focus.
- Unpublished and Canvas-locked assignments are excluded from the active workload. Submitted, awaiting-grading, graded, missing, overdue, and excused states remain distinct. Submitted work shows its submission/graded age, never an overdue countdown.
- Course exclusions are stored locally. Ignored courses remain visible in course management as muted/ignored but are excluded from the dashboard workload, priority queue, grade projections, and AI academic context.
- Unknown grade values display as N/A. Canvas official grades and NORTHSTAR estimates remain source-labeled and separate.
- StudentVUE: Settings provides an external link to the NNPS StudentVUE portal and a CSV/JSON grade import path for user-supplied report data. The import retains course, marking period, school year, source, and import timestamp, is encrypted in the device vault, and displays current/historical records on course detail pages. It is an import workflow, not a live StudentVUE API connection. The importer never requests StudentVUE credentials.
- NNPS public materials reviewed do not provide third-party API documentation, OAuth registration, or integration authorization. Do not collect StudentVUE passwords or use undocumented/reverse-engineered endpoints. Direct synchronization remains blocked pending district-approved documentation or written authorization.
- The displayed app release is NORTHSTAR / .4.3; package version is 0.4.3.


## NORTHSTAR / .4.4.1 — Native Assignment Experience

Phase 4.4.1 changes the interaction model: supported assignments open as full-screen NORTHSTAR pages with an in-app work environment. Canvas remains the authoritative backend for course instructions, files, attempt state, submissions, due dates and grades. Ordinary assignment work no longer needs to open a Canvas page in another tab.

### Assignment page

- Opening a standard assignment creates a deep-link route inside NORTHSTAR (#assignment/assignment-id), with a full-screen loading transition, a themed assignment header, instructions, resource list, private working area, assignment details, and submission controls.
- Canvas assignment descriptions are rendered through a restrictive HTML allowlist. Script tags, embedded forms, executable content, inline event handlers and unsafe links are removed.
- PDF attachments first use the short-lived download URL returned by Canvas file metadata and fetch it directly from the student's browser, without forwarding the Canvas bearer token or browser cookies to storage. If browser CORS or the signed URL prevents that path, NORTHSTAR falls back to the private Canvas bridge. The browser remains on the NORTHSTAR assignment route.
- Quiz attempts and graded discussions use the same full-screen assignment shell. Supported quiz questions, saving, and completion use the existing Canvas quiz APIs; discussion posts and replies use the Canvas discussion API.
- Back navigation and browser history return to the previous NORTHSTAR view. The assignment page is not an iframe of Canvas.

### PDF Document Studio

The in-dashboard PDF editor has a persistent **Hand / Pencil input switch**. This switch selects the device used for all annotation tools; selecting another tool never changes the input mode.

- **Hand / Finger mode:** use one finger on iPad (or a mouse on desktop) with every tool: Move, Pen, Highlight, Text box, Line, Arrow, Box, Oval and Eraser.
- **Apple Pencil mode:** use Apple Pencil with those same tools. Finger input is not treated as Pencil ink, helping avoid accidental marks.
- **Two-finger navigation:** pan and pinch-zoom the document in either mode. The selected input mode is preserved when switching tools and opening another PDF.
- Text boxes support multiline text. Type the note in the text field, then drag on the page to size and place the box. Use Move to reposition it.
- Pen strokes retain Pencil pressure where available. Highlighting is translucent; shapes, arrows, erasing, Move, per-page undo/redo, ink color and size, page navigation, zoom and flattened PDF export are supported.
- Annotations persist locally per assignment/document until exported.

Annotations are stored locally until exported. They are not a Canvas DocViewer annotation session and are not uploaded automatically. Canvas's public Submissions API does expose the student_annotation submission type and the annotatable_attachment_id field. However, the documented request does not describe how a third-party editor uploads its actual DocViewer ink/text annotation payload. NORTHSTAR therefore does not submit the attachment ID alone or claim a flattened PDF export has updated Canvas' native DocViewer annotation state. The official Canvas DocViewer workflow remains required for those special assignments unless a supported annotation-payload API is established.

The PDF renderer and PDF export library are loaded from version-pinned jsDelivr ES modules at runtime. An internet connection is required to load these libraries. PDF.js renders the source document; pdf-lib applies the exported annotations.

### Supported paths and provider boundaries

- Online text entry / online URL: work in the NORTHSTAR assignment page, review, submit or resubmit to Canvas.
- Online file upload: upload a file up to 25 MB through Canvas' signed upload flow. The Canvas bearer token is never sent to the signed file storage URL.
- Classic quizzes: start an official Canvas attempt, answer supported question types in NORTHSTAR, save answers and complete the attempt. Canvas controls time, availability and grading.
- Graded discussions: read visible threads and publish initial posts or replies in NORTHSTAR.
- PDF attachments: read, annotate with Apple Pencil tools, export a flattened copy, and submit it where online_upload is permitted.
- New Quizzes, unsupported question types, special DocViewer student_annotation submissions, external LTI tools, Google Docs workflows, media recordings, student annotation providers and other provider-specific workflows: NORTHSTAR does not fake completion or claim provider state was saved. A supported in-app API is required for true native completion.

All assignment and quiz writes remain explicit, confirmed and sent through the private HTTPS bridge. NORTHSTAR never auto-retries a write after an ambiguous network failure; check Canvas before retrying. The bridge must be redeployed separately when canvas-bridge/worker.js changes.

### Phase 4.4.1 deployment checklist

1. Version .4.4.1 is merged to main. The GitHub Pages production build and deployment completed successfully.
2. Redeploy the updated canvas-bridge/worker.js in Cloudflare, preserving the existing exact CANVAS_ORIGIN and ALLOWED_ORIGIN values. The updated Worker adds assignment-detail reads, secure file metadata/download handling and the existing quiz, file-submission and discussion routes.
3. Open NORTHSTAR and connect Canvas using the private bridge.
4. Open a low-risk assignment and verify its instructions and attached PDF appear inside the full-screen NORTHSTAR assignment page.
5. Use a non-sensitive practice PDF to test Pencil-only drawing, text placement, erasing, undo/redo and PDF export on iPad Safari.
6. Test a file upload only on an assignment that explicitly permits it. Verify the attempt and attachment in Canvas.
7. Use an ungraded practice classic quiz to verify start, save, resume and completion.
8. Verify unsupported assignment types show an honest provider limitation rather than a simulated submission.

Automated tests use Canvas-shaped fixtures and mocked binary-file downloads. They verify the app route, markup sanitization, bridge allowlists, and PDF transport wiring; they do not replace live testing with the student's own Canvas account and Apple Pencil.

## NORTHSTAR / .4.4.2 — Quiz Continuity & Safe Recovery

Phase 4.4.2 hardens the in-dashboard classic Canvas quiz workflow so leaving and reopening an assignment does not casually create a second attempt.

- Before showing a Start button, NORTHSTAR asks Canvas for the current student's quiz submission. If Canvas reports an unfinished attempt, NORTHSTAR first tries to resume it using temporary attempt validation details retained in the current browser tab session.
- If the same-tab session details are unavailable, NORTHSTAR blocks a new start and presents a clear route to continue the existing attempt in Canvas. It never starts a replacement attempt merely because NORTHSTAR cannot recover the validation token.
- Supported question edits are saved to Canvas automatically after a short debounce. The explicit Save action remains available and reports whether Canvas confirmed the write. Failed or ambiguous writes are not automatically retried.
- Quiz completion warns when supported questions remain unanswered. Unsupported question formats still block NORTHSTAR completion and must be handled in the same Canvas attempt.
- Quiz attempt validation details are held in sessionStorage for the current tab session only. They are not written to localStorage or the long-lived credential vault. If the tab session is lost, the safe fallback is the existing Canvas attempt—not a duplicate attempt.
- The repository Worker already allowlists Canvas' current-user quiz submission read route; the older read-only Worker supplied separately is not equivalent to the repository Worker. Deploy the repository's current `canvas-bridge/worker.js` when enabling Phase 4.4 write workflows.

Canvas API references: [Quiz Submissions](https://canvas.instructure.com/doc/api/quiz_submissions.html) and [Quiz Submission Questions](https://www.sso.canvaslms.com/doc/api/quiz_submission_questions.html).


## Phase 4.4 — Native Assignment Workspace

NORTHSTAR opens ordinary Canvas assignments, supported classic quizzes, and graded discussions in full-page in-app workspaces. The `.4.4.3` increment adds a formatted local writing editor with safe HTML sanitization, native preview for common image/audio/video/text attachments through the private bridge, in-app handling of assignment and file links where they can be mapped to Canvas records, and quiz question navigation/progress/flagging. Drafts remain device-local until the student explicitly submits.

The private Cloudflare Worker must be deployed from the current `canvas-bridge/worker.js`. Canvas remains authoritative: write actions require confirmation and a confirmed Canvas response; ambiguous writes are never automatically retried. The bridge uses the exact configured Canvas and GitHub Pages origins.

**Known boundaries:** PDF annotations are saved locally and can be flattened/exported as a file; this is not the same as submitting Canvas DocViewer student-annotation state. New Quizzes, LTI/external tools, provider-specific assessments, and file formats without a safe native renderer are not falsely represented as completed in NORTHSTAR. Those workflows may require the institution-approved provider experience.


### New Quizzes behavior

NORTHSTAR uses the official read-only New Quizzes endpoints to retrieve a quiz's instructions and available item prompts for an in-dashboard preview. The preview deliberately does not render answer/scoring payloads and does not create an attempt. Starting, timing, answering and submitting a New Quiz remains in the official authenticated Canvas quiz player because the documented New Quizzes REST resources expose quiz and item retrieval/authoring, not the student attempt workflow integrated here. The bridge only allows GET for the two New Quiz read routes; it does not permit New Quiz POST/PATCH/DELETE.


## Authenticated Canvas experiences — `.4.4.4`

NORTHSTAR now requests two official Canvas capabilities through the private bridge:

- `GET /login/session_token` obtains a short-lived `session_url` for a restricted Canvas return path. It is used to open the official Canvas assignment page for New Quizzes, student-annotation DocViewer, media recording and Canvas-hosted document previews. NORTHSTAR does not store the session URL or put the user's API token in a URL.
- `GET /api/v1/courses/:course_id/external_tools/sessionless_launch?launch_type=assessment&assignment_id=:assignment_id` asks Canvas to produce the assignment-specific LTI launch URL. NORTHSTAR does not fabricate an LTI JWT or provider launch URL.

The Worker permits only the documented assessment launch shape and only same-school, known Canvas return paths for session creation. The client verifies that session URLs belong to the connected Canvas origin and that launch URLs use HTTPS.

### Tokenless-looking sign-in vs authorization

The current personal build still uses the student's existing Canvas API token for REST calls and for requesting the temporary session URL. The API token is sent only as a Bearer authorization header to the private Worker. The browser then uses the short-lived Canvas session URL; it does not need the API token to operate the Canvas page itself.

To remove manual token entry for a real multi-user release, the next authentication milestone is Canvas OAuth 2.0 authorization code flow in the private Worker, or an institution-installed LTI 1.3 launch with the required service scopes. Canvas developer-key registration, allowed scopes and school administrator approval are required for those institutional app registrations. NORTHSTAR will never collect a Canvas password or scrape the school login form.

### iPad Safari and native in-app content

The GitHub Pages PWA uses the existing in-dashboard iframe as a best-effort fallback. Some Canvas/provider destinations can reject iframe embedding or Safari third-party cookies. `native/ios/NorthstarSecureContentPresenter.swift` supplies the message-handler bridge and a top-level persistent WKWebView with NORTHSTAR-owned navigation controls. The source must be added to an iOS host app target before that guaranteed native experience is available; this repository is still deployed as a web PWA, and the native host has not yet been built or installed.


## NORTHSTAR / Phase 4.4.5 - Assignment Workspace acceptance

Phase 4 is the native assignment-workflow phase. The .4.4 branch provides full-page NORTHSTAR assignment workspaces for supported work, local rich-text writing drafts, text/URL/file submissions, supported Classic Quiz attempts, graded discussions, PDF Document Studio with Pencil-only ink and flattened export, submission history/comments/rubric display, and safe resource previews.

### Provider workflows and what inside NORTHSTAR means

- Standard writing, URL and file work: the work area and submission controls are NORTHSTAR-native. Canvas remains the source of truth for the resulting submission attempt and grade.
- Classic quizzes: supported question types are rendered in NORTHSTAR and saved/completed through official Canvas Classic Quiz endpoints. Unsupported formats block NORTHSTAR completion rather than losing or guessing at answers.
- New Quizzes: NORTHSTAR may show a read-only content preview, then requests a short-lived Canvas browser session for the official timed player. Answer state and final submission remain Canvas-owned; NORTHSTAR does not claim a custom New Quiz engine.
- External LTI assessments: NORTHSTAR asks Canvas for the assignment-specific sessionless launch URL. The provider owns its editor, identity, attempt, timer, grade and final submission. A provider may require SSO or prohibit embedding.
- Student Annotation / DocViewer and media recording: NORTHSTAR opens the original Canvas assignment in its secure content view. Select Start Assignment, then the appropriate Canvas tab/tool; Canvas remains responsible for native annotation/recording persistence and submission.
- PDF Document Studio: drawing/highlighting/text/shape annotations are saved locally and can be flattened into a PDF for a permitted file upload. This is not a Canvas DocViewer annotation session.
- General external links: NORTHSTAR tries the in-dashboard preview first and shows an explicit Open externally escape route if the destination refuses framing. The PWA cannot override X-Frame-Options, CSP frame-ancestors, SSO, or Safari cookie restrictions.

### Native iPad host boundary

The repository includes native/ios/NorthstarSecureContentPresenter.swift, which is the JavaScript bridge and persistent top-level WKWebView presenter for a real iOS app host. The JavaScript calls this bridge when the host installs it. The repository is currently a GitHub Pages PWA and does not contain a compiled/installed iOS app target, so the Swift source alone does not make this native top-level path active in Safari. Without that host, the PWA shows the full-screen in-dashboard iframe plus the external fallback.

### Deploy and verify

1. Run the GitHub Actions Phase 3 and Phase 4 suites for the exact branch head.
2. Publish the current canvas-bridge/worker.js to the private Cloudflare Worker. GitHub Pages deployment does not deploy this Worker. Retain CANVAS_ORIGIN=https://nnps.instructure.com and ALLOWED_ORIGIN=https://s0ndvyr.github.io unless the account/site has intentionally changed.
3. Connect the student's Canvas account through the private Worker. Never place the token in source, a URL, a production test fixture, or chat.
4. Use a low-risk practice assignment to verify rich-text save/submit and check the actual attempt in Canvas.
5. Use a permitted file assignment to verify each file is uploaded and appears in the submitted attempt.
6. Use a practice Classic Quiz to verify start, autosave, recovery, unanswered warning, flag/unflag, and completion; verify the attempt in Canvas.
7. Use a non-graded discussion only when posting is intended; verify the post/reply in Canvas.
8. Test a PDF on iPad with Apple Pencil for pen-only input, touch scrolling, eraser, undo/redo, export and permitted file upload.
9. Use school-provided New Quizzes, LTI, Student Annotation and media-recording examples to verify their official Canvas/provider players open and confirm submission.
10. Complete theme, Safari, offline draft, reduced-motion, VoiceOver/keyboard, large-file and back-navigation regression before Phase 4 is declared accepted.

Automated tests use controlled Canvas-shaped fixtures and a DOM harness. They cannot prove NNPS policy, Canvas permissions, provider SSO, iPad Pencil behavior, or that a real teacher receives a submitted attempt. Those are live acceptance checks, not claims of CI coverage.


## NORTHSTAR 4.4.6 — Document Studio rebuild

The 4.4.6 Document Studio adds a separate editable text-object layer above the PDF.js page. Text annotations are stored as structured objects with stable IDs, dimensions, font family/size, paragraph alignment, line spacing, colors, and sanitized rich-text markup. Users can create text directly on a page, select an object, enter editing mode, move it with its drag grip, resize it with corner handles, and use contextual typography controls.

The editor preserves the source PDF. Export creates an annotated copy; it does not rewrite the PDF's original text layer or upload NORTHSTAR's local annotation model as a native Canvas DocViewer annotation session. PDF export maps the supported font families to PDF standard-font variants (Helvetica, Times Roman, and Courier) and uses safe character fallback for unsupported glyphs.

The new release.json manifest is the release-history source for the app version pill and closable changelog dialog. package.json uses standard three-part npm semver and carries the exact NORTHSTAR micro-version in its northstarRelease metadata field. Every future independently reviewable app, bridge, infrastructure, or deployment-configuration change must increment the NORTHSTAR micro-version and add a manifest changelog entry. GitHub Pages deployment is gated on a successful Phase 4 test workflow.

The legacy pdf_markup_v1 local annotation key remains readable. On the next open, legacy text annotations are normalized with stable IDs and saved under pdf_markup_v2; the old copy is not deleted by migration.

**Acceptance status:** automated regression, actual iPad Safari / Apple Pencil hardware behavior, authenticated live Canvas attachment acceptance, and production promotion must be recorded separately. Do not treat a successful build as proof of physical hardware acceptance.


### NORTHSTAR 4.4.6.3 — Manifest-driven release identity

The dashboard no longer carries a separate hardcoded release constant. Its dashboard refresh cannot overwrite the clickable version/changelog control; Settings reads the active NORTHSTAR release directly from the same release manifest. This prevents the UI from reverting to an older release label after the manifest loads.


### NORTHSTAR 4.4.6.4 — Test-pinned deployment protection

GitHub Pages publication now checks the current heads of both `main` and the preview branch against completed successful Phase 4 push runs. The Pages workflow only proceeds when both exact heads have passed, and it checks out those commit SHAs rather than following moving branch names. A delayed older successful test event therefore cannot publish a newer untested branch tip. If either branch has no passing run for its current head, publication is held until that branch's own test completes successfully.


### Canvas assignment file upload finalization — Phase 4.4.7.1

NORTHSTAR routes assignment and Classic Quiz file uploads through its private Canvas bridge. The Worker performs Canvas upload initialization, sends the signed multipart upload without a Canvas bearer token, then completes Canvas's authenticated `create_success` GET before returning the final file ID. Only after that confirmation does NORTHSTAR submit the file ID to the assignment. This is the standard Canvas `online_upload` workflow; it is not native DocViewer annotation synchronization.


### Canvas assignment file upload finalization — Phase 4.4.7.2

NORTHSTAR routes assignment and Classic Quiz file uploads through its private Canvas bridge. The Worker initializes the Canvas upload, sends the signed multipart request without a Canvas bearer token, then completes the authenticated Canvas `create_success` GET before returning a file ID. Only after that confirmation does NORTHSTAR submit the file ID to the assignment. This is the standard Canvas `online_upload` workflow, not native DocViewer annotation synchronization. Attachment diagnostic reports now read the app version from the release manifest.


### Document Studio → Canvas submission handoff — Phase 4.4.7.3

The **Use annotated PDF from Document Studio** action stages the exported flattened PDF as the sole upload for that submission, matching the button's promise that it replaces other selected files. The browser boot integration test opens an `online_upload` assignment fixture, invokes the Document Studio export handoff, verifies the exported file reaches the Canvas upload helper, and verifies the finalized Canvas file ID is submitted.
