# NORTHSTAR Phase 4 — Native Assignment Capability & Acceptance Matrix

**Development version:** 0.4.23 / NORTHSTAR 4.4.7.9  
**Development branch:** `northstar-4.4.7.9-canvas-signed-preview-fix`  
**Status:** NORTHSTAR 4.4.7.9 / package 0.4.23 is a candidate; Phase 4 validation, private Worker deployment and Pages preview deployment are pending. The last verified preview remains NORTHSTAR 4.4.7.8 / package 0.4.22. Production remains NORTHSTAR 4.4.7.5 / package 0.4.19. Live NNPS Canvas attachment, Canvas account, and physical iPad/Apple Pencil acceptance remain open.  
**Production:** NORTHSTAR 4.4.7.5 / package 0.4.19. Last verified preview: NORTHSTAR 4.4.7.8 / package 0.4.22.

This document distinguishes four different states:

- **Native:** NORTHSTAR renders and manages the work in its own workspace.
- **Canvas-backed:** NORTHSTAR uses Canvas APIs for authoritative availability, saving, upload, submission and status.
- **Provider handoff:** NORTHSTAR launches the official Canvas or third-party player; that provider owns the interaction and final submission.
- **Not supported:** NORTHSTAR must not claim completion or mark work submitted.

## 1. Native, Canvas-backed assignment workflows

| Workflow | Phase 4 capability | Important boundary |
|---|---|---|
| Text/written response | Rich-text writing workspace, local draft, Word export, submission confirmation | Canvas accepts the submission; NORTHSTAR does not grade it |
| Website/URL submission | Validate HTTP/HTTPS URL, confirm and send to Canvas | Canvas validates and stores the URL |
| File submission | Multiple attachments, upload progress, partial-upload awareness, staged upload reuse, confirmation | Current implementation limits a batch to 10 files, 25 MB per file, 100 MB total; the instructor's allowed-extension list is enforced |
| PDF work | In-dashboard PDF reader, annotation, drawing/highlighting, undo/redo and flattened export | Exported PDF is a new attachment; it is not Canvas DocViewer annotation state |
| Word documents | Read-only preview, import document text into the writing editor, export a new .docx response | Complex Word layout, floating objects, embedded media and exact pagination may not be reproduced |
| Excel workbooks | In-dashboard worksheet preview and editing, export a new .xlsx | Editor displays at most 250 rows × 30 columns per selected sheet; formulas changed by the user become values; macros, recalculation and advanced workbook features are not reproduced |
| PowerPoint | In-dashboard text-first slide preview, edit slide text, export a new .pptx | Theme/layout editing, animations, SmartArt, embedded media and pixel-perfect slide rendering are not provided |
| Text/CSV/Markdown resources | In-dashboard reader | Large or unusual encodings may need download |
| Canvas assignment availability | Fetches Canvas `can_submit`, lock/publish status, lock explanation and allowed extensions before showing a submit action | NORTHSTAR blocks submission unless Canvas explicitly says `can_submit: true`; group assignments remain blocked pending correct group identity support |
| Assignment resource downloads | Authenticates Canvas's `/api/v1/files/:id/public_url` request, then fetches every validated returned preview URL as a short-lived signed capability without adding the Canvas bearer token or browser User-Agent, regardless of whether the allowlisted storage host is AWS or Instructure; retains a separate authenticated legacy download fallback | Course context is preserved for metadata lookup; strict HTTPS and host allowlists remain mandatory and the fallback's credentials remain limited to explicit Canvas/Instructure hosts |
| Attachment failure diagnostics | A failed PDF download reports metadata/content stage, bridge and upstream HTTP status, safe hostnames, redirect count, Cloudflare request references, and the `public_url` endpoint/fetch outcome; the workspace offers a copyable diagnostic report | Reports deliberately exclude Canvas tokens, cookies, signed URL queries, response bodies and document contents; only allowlisted host/status/ray metadata is recorded |
| Submission state | Canvas submission response updates the assignment state, attempt, timestamps, grade/feedback snapshot and history | Canvas remains the system of record |
| Discussions | Read thread, create initial posts and replies from NORTHSTAR | The publish action is sent to Canvas after explicit confirmation; drafts are local |
| Classic Canvas quizzes | In-dashboard attempt workspace with resume/recovery, question navigation, flags, autosave, time-limit resync and final submit | Only supported question formats are edited in NORTHSTAR; unsupported formats are visibly routed to the same Canvas attempt |

## 2. Classic Quiz question coverage

The current Classic Quiz workspace implements answer controls and Canvas question-save payloads for:

- Multiple choice
- True/false
- Multiple answers
- Essay
- Short answer
- Numerical
- Calculated
- Matching
- Fill in multiple blanks
- Multiple dropdowns
- Text-only/read-only information
- File-upload questions (see Worker deployment caveat below)

If a question type or Canvas answer schema is not recognized, NORTHSTAR does not invent an answer format. It identifies the unsupported question and offers a route to continue the same attempt in Canvas. It must not start a second attempt merely because a question is unsupported.

## 3. Provider-owned workflows — not falsely described as native

These workflows can be opened from the NORTHSTAR assignment workspace, but Canvas or the provider retains the interaction and/or submission:

| Assignment type | NORTHSTAR behavior | Why it is not fully native |
|---|---|---|
| New Quizzes | Read-only item/brief preview and authenticated Canvas player launch | Phase 4 does not create or submit a New Quizzes attempt or store its answers |
| External LTI / publisher assessment | Authenticated Canvas launch; embedded where provider permits, visible external fallback otherwise | Publisher controls content, authentication, attempt state and final submission |
| Canvas Student Annotation / DocViewer | Authenticated official annotation handoff | NORTHSTAR's flattened PDF export is not a substitute for Canvas's native annotation state |
| Media recording | Open official Canvas recorder workflow | The official recording/submission player is provider-owned |
| Google Docs / Google Drive workflows | Open the official resource/provider fallback | Canvas's assignment submission API does not provide a native Google Docs submission workflow |
| On-paper / no-online-submission assignments | Show the actual requirement and official assignment link | There is no online Canvas submission type to emulate |
| Group assignments | Submission action is blocked pending group identity/authorization support | Student-level submission cannot safely substitute for group submission |

NORTHSTAR should never show a false “Submitted” status for a provider handoff. Where a provider does not permit embedding, the fallback must say that the student is leaving NORTHSTAR for the official provider experience.

## 4. Canvas Worker deployment dependency

The frontend now contains a Classic Quiz file-upload path using Canvas's Quiz Submission Files endpoint:

`POST /api/v1/courses/:course_id/quizzes/:quiz_id/submissions/self/files`

The development Worker source contains an allowlist for this route. The production Worker source on `main` was last verified before that route was added and does not yet contain the quiz-upload route. Therefore:

- Classic Quiz file-upload questions are implemented in the 0.4.4.5 development source and covered by mocked CI tests.
- They are **not yet live-accepted against the currently deployed production Worker**.
- A Worker deployment containing the development allowlist is required before calling that one workflow live-ready.
- Assignment file uploads use the existing numeric-student upload route supported by the currently deployed Worker, to avoid forcing a Worker change for ordinary assignment attachments.

## 5. Automated verification completed

The Phase 4 GitHub Actions suite includes:

- JavaScript syntax checks for application and Worker scripts.
- Unit tests for Canvas workspace request/response handling.
- Multi-file assignment upload and submission-payload tests.
- Signed-upload security check ensuring the Canvas bearer token is not forwarded to the signed storage host.
- Supported/unsupported Classic Quiz question-format checks.
- Browser boot tests using a mocked Canvas environment.
- Worker route and write-payload validation tests.

Passing mocked CI is not the same as live acceptance in a real Canvas course.

## 6. Automated Canvas bridge deployment

The development branch includes a GitHub Actions workflow for deploying the Worker without copying source through the Cloudflare dashboard. It targets the existing Worker name `northstar-bridge` from `wrangler.jsonc`.

One-time repository setup:
1. In Cloudflare, create an account-owned API token for CI/CD. Grant **Workers Editor** scoped only to the existing `northstar-bridge` Worker. Cloudflare documents this as the minimum permission for deploying an existing Worker with Wrangler; do not grant account-wide Admin or unrelated product permissions.
2. In GitHub repository Settings → Secrets and variables → Actions, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Run **NORTHSTAR Canvas Bridge — Deploy** from the Actions tab once. Later changes to `canvas-bridge/` or `wrangler.jsonc` on this development branch deploy automatically.

If either secret is absent, the deploy job is intentionally skipped. Never store a Cloudflare Global API Key or Canvas access token in the repository.

## 7. Required live acceptance before Phase 4 sign-off

Run these tests in the 0.4.4.5 preview using a test assignment or instructor-approved sandbox course:

1. Connect Canvas from the preview; confirm the course and assignment list loads.
2. Open a writing assignment; create a rich-text draft; refresh/reopen; confirm the draft is retained.
3. Submit a harmless test text response; verify Canvas's response, attempt number and submission history in the Canvas student view.
4. Submit a URL assignment; verify the exact URL in Canvas.
5. Submit two allowed files to an upload assignment; verify both files in Canvas and the returned attempt.
6. Attempt submission on a locked/unpublished assignment; confirm NORTHSTAR blocks it and preserves the draft.
7. Open a PDF resource; annotate and export; submit the exported PDF where the assignment permits it.
8. Open .docx, .xlsx and .pptx resources; verify preview, import/edit and export behavior; verify the resulting file opens in its native Office application.
9. Complete a Classic Quiz containing supported question types; verify autosave, flags, timer, resume and final attempt in Canvas.
10. Complete a Classic Quiz with an unsupported question type; confirm NORTHSTAR routes to the same Canvas attempt and does not create another attempt.
11. Test a Classic Quiz file-upload question only after the updated Worker route is deployed.
12. Create a discussion post and reply; verify both in Canvas.
13. Open a New Quiz, LTI assessment, Student Annotation and media-recording assignment; verify handoff, same student identity and provider-side completion.
14. Verify grade, comments, rubric, attempt and status changes synchronize back into NORTHSTAR.
15. Refresh and reopen on iPad Safari; verify drafts, attachment state, scroll/navigation, reduced-motion and responsive layout.

**Release rule:** Phase 4 can be called implemented when the CI and artifact checks pass. It can be called live-accepted only after the student-side tests above pass in the actual Canvas tenant, and the Quiz file-upload Worker route is deployed or explicitly excluded from the live release scope.


## 8. Phase 4.4.7.4 — Edited PDF submission pipeline

The current implementation candidate sends the selected/annotated file to the private bridge as multipart data. The Worker then performs the Canvas three-step upload:
1. Initialize a submission file using `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions/self/files`.
2. Transfer the exact signed parameters and file to the Canvas-provided HTTPS storage URL, without the Canvas bearer token.
3. Follow the storage response's Canvas `Location` by making an authenticated GET to the validated `/api/v1/files/:id/create_success` endpoint. The Worker returns the file object only after a valid Canvas file ID is confirmed.

NORTHSTAR then sends `submission_type: online_upload` with the finalized file ID(s) to `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions`. The response must report a submitted/graded/pending-review state before NORTHSTAR marks the work submitted.

Automated coverage now exercises both 3xx and 201 Location responses, signed-host token isolation, unsafe/missing finalization locations, and the app-side upload → file ID → assignment submission chain. These are mocked tests; they do not replace live acceptance in the connected Canvas tenant.

**Live acceptance still required:** use a low-risk instructor-approved test assignment that allows PDF uploads. Annotate a PDF in Document Studio, choose **Use annotated PDF from Document Studio**, confirm submission, then verify the exact PDF attachment, attempt number, submitted timestamp and submission preview in Canvas. Refresh NORTHSTAR and verify the official Canvas submission state is reconciled. Do not use a real graded assignment for initial testing.


## 8. Phase 4.4.7.4 — Edited PDF submission pipeline

The current implementation candidate sends the selected/annotated file to the private bridge as multipart data. The Worker performs the Canvas three-step upload:
1. Initialize a submission file using `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions/self/files`.
2. Transfer the exact signed parameters and file to the Canvas-provided HTTPS storage URL, without the Canvas bearer token.
3. Follow the storage response's Canvas `Location` by making an authenticated GET to the validated `/api/v1/files/:id/create_success` endpoint. The Worker returns the file object only after a valid Canvas file ID is confirmed.

NORTHSTAR then sends `submission_type: online_upload` with the finalized file ID(s) to `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions`. The response must report a submitted/graded/pending-review state before NORTHSTAR marks the work submitted.

Automated coverage exercises both 3xx and 201 Location responses, signed-host token isolation, unsafe/missing finalization locations, and the app-side upload → file ID → assignment submission chain. These are mocked tests; they do not replace live acceptance in the connected Canvas tenant.

**Live acceptance still required:** use a low-risk instructor-approved test assignment that allows PDF uploads. Annotate a PDF in Document Studio, choose **Use annotated PDF from Document Studio**, confirm submission, then verify the exact PDF attachment, attempt number, submitted timestamp and submission preview in Canvas. Refresh NORTHSTAR and verify the official Canvas submission state is reconciled. Do not use a real graded assignment for initial testing.


The Document Studio annotated-PDF handoff now has a browser boot integration test. When the exported PDF is selected, it replaces other file-picker selections for that submission, matching the interface label. The test verifies that the exported file reaches the upload helper and its finalized Canvas file ID is passed to the assignment submission API. This remains mocked acceptance, not a real student-account submission.


Phase 4.4.7.4 also corrects a stale release-history test that confused the previous deployed preview with the current pending candidate. The Document Studio submission UI test and annotated-PDF-only behavior are carried forward unchanged.


Release 4.4.7.4 was the previous preview release. NORTHSTAR 4.4.7.5 / package 0.4.19 is deployed to production and preview by Pages run 45092722735, from tested main source f347cc304356be67e7de8f22b80d0d6e11efebe9 and preview source df606c6f3bf085ac0ab6f2a96c29ee0b800fc9bc. The Canvas Worker remains deployed separately by run 45085853219. The real student-account upload/submission and physical iPad acceptance checks remain open.


## NORTHSTAR 4.4.7.5 — Authenticated Canvas PDF downloads

Canvas's authenticated file-download flow requires the student's bearer token on the HTTPS file URL. NORTHSTAR therefore sends Authorization only to the configured Canvas host or explicitly allowlisted Instructure file-host suffixes. It rejects non-HTTPS, credential-bearing, non-default-port, access_token-query and untrusted targets. Browser cookies remain omitted. The browser validates the final response URL before accepting PDF bytes; if cross-origin Authorization preflight or retrieval is blocked, the private Worker fallback remains available.

This download rule is separate from the signed upload destination: Canvas bearer credentials are never sent to signed upload storage. The current private Worker (0.4.16 / 4.4.7.2) already has bounded redirects and the trusted Instructure file-host allowlist, and remains separately deployed.

Automated tests verify trusted direct authentication, bridge fallback and untrusted-host rejection. They do not prove that the live NNPS Canvas tenant permits this browser Authorization preflight or that a specific attachment downloads successfully. Live acceptance remains: open a real non-sensitive PDF attachment, verify the content is rendered in Document Studio, export the annotated copy, submit it using the instructor-approved online_upload test assignment, and verify the exact attempt and attachment in Canvas. Then perform the Pencil, touch, zoom, pan, undo/redo and export checks on the physical iPad.


## NORTHSTAR 4.4.7.6 — Canvas PDF redirect authentication recovery

The live NNPS diagnostic for file 61162022 reached the Canvas metadata endpoint, followed redirects through `nnps.instructure.com` and `*.canvas-user-content.com`, then received HTTP 406 from `inst-fs-iad-prod.inscloudgate.net`. The browser-direct attempt was blocked by cross-origin authorization/CORS before it could deliver the bytes. This establishes that the PDF viewer is not the failing layer: the failure occurs during file-byte retrieval at the final storage edge.

The previous Worker forwarded the Canvas bearer token to every allowlisted Instructure storage host and replayed the requesting browser's User-Agent on server-to-server storage requests. The 4.4.7.6 candidate changes that protocol:

1. The bearer token is sent to the configured school Canvas origin for the authenticated file-download request only.
2. On every cross-origin redirect, the Canvas bearer token is removed. Instructure's returned short-lived storage URL is treated as the storage authorization.
3. Redirects carry only the previous origin as Referer (never a path, query, signed URL or credential).
4. The Worker does not impersonate the student's iPad/Safari User-Agent on external storage requests.
5. Initial download URLs and every redirect target must remain HTTPS and on the explicit Canvas/Instructure file-host allowlist. Untrusted hosts are rejected before fetching.

The regression fixture now reproduces the observed two-hop route: Canvas → `a16702-61162022.cluster277.canvas-user-content.com` → `inst-fs-iad-prod.inscloudgate.net`. It asserts that the Canvas token appears only on the first Canvas-origin download request, that storage hops receive no bearer token or spoofed browser User-Agent, that the origin-only Referer advances one hop at a time, and that a successful final PDF response is returned. A separate 406 fixture verifies safe diagnostics when the storage edge continues to reject the request.

**Deployment status:** Worker 0.4.17 is deployed to the preview bridge by run 45099837678. NORTHSTAR 4.4.7.6 / package 0.4.20 is deployed to the preview Pages path by run 45099890111 from preview commit 1e1d9fe9979b204b6f92d500c209ff622687a880. Production intentionally remains on 4.4.7.5 pending live acceptance.\n\n**Important acceptance boundary:** this is a protocol correction supported by the live diagnostic and regression tests; it is not yet proof that the NNPS storage edge accepts the request. Reopen the same real assignment attachment in the deployed preview. If the final storage host still returns 406, the next diagnostic must determine whether the edge requires a different referrer, signed URL shape, or school-side access policy; do not weaken the host allowlist or forward the Canvas token to arbitrary hosts.



## NORTHSTAR 4.4.7.7 — Canvas-origin request compatibility candidate

The 4.4.7.6 live test reached the configured school Canvas host but received HTTP 403 before any redirect. Comparing the previous deployed Worker source with 0.4.17 identified one material header difference: the previous Worker sent the requesting browser User-Agent on the file-content request, while 0.4.17 omitted it. The 4.4.7.7 candidate restores that User-Agent only when the destination origin exactly matches the configured school Canvas origin. The Canvas bearer token remains scoped to that same origin. Both headers remain absent on cross-origin storage requests; the allowlist, HTTPS checks, origin-only Referer handling, and signed-URL secrecy remain in place.

This is a targeted hypothesis, not a confirmed root cause. Automated tests assert that the school Canvas origin receives the browser User-Agent and bearer token, while both cross-origin storage hosts receive neither. The candidate is not live-accepted until the same NNPS PDF opens in the deployed preview.


**Deployment status:** Worker 0.4.18 is deployed to the preview bridge by run 45103459358 (Cloudflare version ID `2e7ced36-da0b-4091-9bd2-7dedfcf4adc2`). NORTHSTAR 4.4.7.7 / package 0.4.21 is deployed to the preview Pages path by run 45103520416 from preview commit `d4740f8f280b358bbe9d64770d6b2ae94714b842`. Production remains on 4.4.7.5. The same live NNPS attachment must still be tested; deployment and mocked tests do not prove Canvas retrieval.


## NORTHSTAR 4.4.7.8 — Canvas public-preview PDF retrieval candidate

The 4.4.7.7 live diagnostic reached the first `canvas-user-content.com` redirect but received HTTP 403. The worker now prefers Canvas's authenticated `GET /api/v1/files/:id/public_url` endpoint, which generates a user-authorized inline-preview URL. When Canvas returns a signed AWS object URL, the Worker fetches that exact HTTPS URL without adding the Canvas bearer token. If Canvas does not return a usable preview URL, the existing authenticated file-download flow remains as a fallback; the bearer token is limited to the configured Canvas origin and the explicit trusted Instructure file-host allowlist. No token, signed query, response body, or PDF bytes are placed in diagnostics.

The new test fixture covers a signed S3-style preview URL, ensures the Canvas token is absent from that external host, and exercises the authenticated Instructure fallback. Automated coverage remains mocked; live NNPS acceptance requires the same attachment to open in Document Studio.


**NORTHSTAR 4.4.7.8 preview deployment:** Phase 4 passed on preview commit `fa2d9103811ae54def96ea456fcc5656c16f3917` (run `45104758130`). Worker 0.4.19 deployed by run `45104758113`; Cloudflare Worker version ID `69a055e5-4edc-426b-9f0b-c3a964b92d66`. Pages preview deployed by run `45104813239`. Production remains 4.4.7.5. Live NNPS PDF retrieval is still unaccepted and must be tested by reopening the same attachment in preview.


## NORTHSTAR 4.4.7.9 — Signed public-preview capabilities and safe diagnostics

The 4.4.7.8 live diagnostic remained HTTP 406 at `inst-fs-iad-prod.inscloudgate.net`. Source inspection found that the preferred `public_url` path only withheld credentials from AWS URLs; it still attached the Canvas bearer token and browser User-Agent to signed preview URLs hosted on Instructure storage domains. The route also silently abandoned its failure details before the legacy fallback.

Worker 0.4.20 corrects that boundary:

1. The configured Canvas origin receives the bearer token and browser User-Agent when requesting the authenticated `public_url` API.
2. Every URL returned by that API is treated as a short-lived signed capability. Its fetch and bounded, allowlisted redirects receive neither the Canvas bearer token nor the browser User-Agent, regardless of the storage hostname.
3. HTTPS, URL credential, port, `access_token`, and explicit trusted-host checks remain enforced. Redirects carry only an origin-level Referer.
4. The existing metadata download URL remains a separate fallback and retains its own bounded, authenticated Canvas/Instructure policy.
5. Failure diagnostics now expose only the public-preview endpoint result/status/content type, returned hostname, fetch status/hostname/content type/server/Cloudflare ray, and redirect host list. No URL query, signature, token, body or file content is recorded.

Regression coverage includes successful signed-preview retrieval from an Instructure host, confirmation that signed-preview fetches receive no bearer token or browser User-Agent, endpoint failure fallback, and a signed-preview 406 plus legacy fallback 406 with safe diagnostics.

**Release:** NORTHSTAR 4.4.7.9 / package 0.4.23; Worker 0.4.20.  
**Status:** Candidate branch validation and preview deployment pending. Live NNPS PDF retrieval is still unaccepted. Production remains 4.4.7.5 / package 0.4.19 until the real PDF edit/export/upload/submission lifecycle is verified.
