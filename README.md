# NORTHSTAR | Academic Command Center

A redesigned, iPad-friendly academic dashboard for GitHub Pages. The interface starts with **example data**, clearly labeled; connecting Canvas replaces that data with your live courses and assignments.

## Run and publish

Upload the contents of this folder to the root of your GitHub repository (replace the files with matching paths). GitHub Pages must be enabled on the `main` branch, root folder. Visit `https://s0ndvyr.github.io/NORTHSTAR/`. Or run a local server such as `python3 -m http.server 8000` and open `http://localhost:8000`.

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
- Notes/drafts stay device-local. Restricted Canvas and Google resources open at their authenticated HTTPS destination in a new tab instead of being embedded in an iframe that may return HTTP 403.
- Phase 2 (text/URL): open an assignment workspace, choose an allowed type, and review/confirm before sending. Text entry sends the workspace draft as escaped plain text; URL entry sends the URL. These operations require a private bridge connection. Resubmitting creates another attempt where Canvas permits it; there is no student unsubmit/erase operation.
- Redeploy `canvas-bridge/worker.js` with your existing origins before using submission controls. Only the exact assignment-submissions POST path is allowed, with validated JSON and a 200 KB request limit. File uploads, comments, impersonation fields, arbitrary writes, and other submission types are rejected.
- Submission state normalization distinguishes missing, submitted, awaiting grading, graded, and excused work. If Canvas reports that the grade does not match the latest submission attempt, NORTHSTAR does not display the stale score as the current attempt. Every UI submission asks for confirmation naming the course/assignment and previewing the content. There are no automatic retries. On a network or unreadable-response failure, check Canvas before attempting again. Canvas enforces deadlines, availability, and attempt limits. Drafts are retained locally after submission.
- File uploads and quiz-engine integration remain unfinished. Use Canvas for files, quizzes, discussions, and external tools. Quiz support still needs school-specific capability checks; no quiz answers are submitted here.
- Demo charts and flashcards remain examples, not school analytics. No StudentVUE connection is provided.

## NORTHSTAR 0.4 foundation updates

- Device vault: Canvas and Gemini credentials are AES-GCM encrypted in IndexedDB when the remember option is enabled. The key is non-extractable and stored by the browser. This is encryption at rest, not protection from same-origin XSS or malicious scripts.
- Session recovery: the last successful Canvas courses, assignments, official enrollment grade totals, group weights, sync quality warnings, and sync timestamp are stored as an encrypted version-2 snapshot. Version-1 snapshots remain readable. If the network is unavailable, NORTHSTAR can restore the last snapshot and label it as cached/offline rather than falsely calling it live.
- Marking-period recovery: Settings supports validated JSON export/import. Imports merge and de-duplicate matching periods instead of silently replacing existing data.
- Credentials: Canvas token and Gemini key fields retain the saved value in masked form, with explicit Show/Hide controls. Disconnect removes the stored Canvas credential and cached Canvas snapshot.
- External assignment content: restricted Google/Canvas links are opened directly in a new tab; NORTHSTAR does not attempt to bypass iframe restrictions.
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


## NORTHSTAR / .4.4.2 — Quiz Continuity & Safe Recovery

Phase 4.4.2 hardens the in-dashboard classic Canvas quiz workflow so leaving and reopening an assignment does not casually create a second attempt.

- Before showing a Start button, NORTHSTAR asks Canvas for the current student's quiz submission. If Canvas reports an unfinished attempt, NORTHSTAR first tries to resume it using temporary attempt validation details retained in the current browser tab session.
- If the same-tab session details are unavailable, NORTHSTAR blocks a new start and presents a clear route to continue the existing attempt in Canvas. It never starts a replacement attempt merely because NORTHSTAR cannot recover the validation token.
- Supported question edits are saved to Canvas automatically after a short debounce. The explicit Save action remains available and reports whether Canvas confirmed the write. Failed or ambiguous writes are not automatically retried.
- Quiz completion warns when supported questions remain unanswered. Unsupported question formats still block NORTHSTAR completion and must be handled in the same Canvas attempt.
- Quiz attempt validation details are held in sessionStorage for the current tab session only. They are not written to localStorage or the long-lived credential vault. If the tab session is lost, the safe fallback is the existing Canvas attempt—not a duplicate attempt.
- The repository Worker already allowlists Canvas' current-user quiz submission read route; the older read-only Worker supplied separately is not equivalent to the repository Worker. Deploy the repository's current `canvas-bridge/worker.js` when enabling Phase 4.4 write workflows.

Canvas API references: [Quiz Submissions](https://canvas.instructure.com/doc/api/quiz_submissions.html) and [Quiz Submission Questions](https://www.sso.canvaslms.com/doc/api/quiz_submission_questions.html).
## NORTHSTAR / .4.4.1 — Native Assignment Experience

Phase 4.4.1 changes the interaction model: supported assignments open as full-screen NORTHSTAR pages with an in-app work environment. Canvas remains the authoritative backend for course instructions, files, attempt state, submissions, due dates and grades. Ordinary assignment work no longer needs to open a Canvas page in another tab.

### Assignment page

- Opening a standard assignment creates a deep-link route inside NORTHSTAR (#assignment/assignment-id), with a full-screen loading transition, a themed assignment header, instructions, resource list, private working area, assignment details, and submission controls.
- Canvas assignment descriptions are rendered through a restrictive HTML allowlist. Script tags, embedded forms, executable content, inline event handlers and unsafe links are removed.
- PDF attachments are fetched through the private Canvas bridge and displayed in NORTHSTAR's Document Studio. The browser remains on the NORTHSTAR assignment route.
- Quiz attempts and graded discussions use the same full-screen assignment shell. Supported quiz questions, saving, and completion use the existing Canvas quiz APIs; discussion posts and replies use the Canvas discussion API.
- Back navigation and browser history return to the previous NORTHSTAR view. The assignment page is not an iframe of Canvas.

### PDF Document Studio

The first PDF toolset includes:

- PDF page rendering, page navigation and zoom.
- Apple Pencil-only freehand ink, highlighting, straight lines, arrows, rectangles and ellipses. The browser's Pointer Events pointerType is checked so touch and mouse are not accepted as Pencil ink.
- Typed text notes placed at a chosen point on the page.
- Pencil eraser, undo and redo.
- Per-assignment / per-document local annotation persistence.
- Export a flattened annotated PDF. If the Canvas assignment accepts an online_upload, the exported PDF can be selected as the file to submit through Canvas' supported signed-upload flow.

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
