# NORTHSTAR Phase 4 — Native Assignment Capability & Acceptance Matrix

**Development version:** 0.4.17 / NORTHSTAR 4.4.7.3  
**Development branch:** `northstar-0.4.4.2-quiz-continuity`  
**Status:** Preview deployed at 4.4.7.3; automated Phase 4 checks passed; live Canvas acceptance remains open.  
**Production:** `main` remains on the previous verified release until this candidate passes its own tests and is promoted.

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
| Assignment resource downloads | Fetches attachment metadata using the course-scoped Canvas file endpoint, then follows only validated HTTPS redirects; the Canvas bearer token is withheld from cross-origin storage hosts | Course context is preserved for files whose global Canvas metadata endpoint rejects student access |
| Attachment failure diagnostics | A failed PDF download reports metadata/content stage, bridge and upstream HTTP status, safe hostnames, redirect count, and Cloudflare request references; the workspace offers a copyable diagnostic report | Reports deliberately exclude Canvas tokens, cookies, signed URLs, response bodies and document contents; Worker logs record safe structured metadata only |
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


## 8. Phase 4.4.7.3 — Edited PDF submission pipeline

The current implementation candidate sends the selected/annotated file to the private bridge as multipart data. The Worker then performs the Canvas three-step upload:
1. Initialize a submission file using `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions/self/files`.
2. Transfer the exact signed parameters and file to the Canvas-provided HTTPS storage URL, without the Canvas bearer token.
3. Follow the storage response's Canvas `Location` by making an authenticated GET to the validated `/api/v1/files/:id/create_success` endpoint. The Worker returns the file object only after a valid Canvas file ID is confirmed.

NORTHSTAR then sends `submission_type: online_upload` with the finalized file ID(s) to `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions`. The response must report a submitted/graded/pending-review state before NORTHSTAR marks the work submitted.

Automated coverage now exercises both 3xx and 201 Location responses, signed-host token isolation, unsafe/missing finalization locations, and the app-side upload → file ID → assignment submission chain. These are mocked tests; they do not replace live acceptance in the connected Canvas tenant.

**Live acceptance still required:** use a low-risk instructor-approved test assignment that allows PDF uploads. Annotate a PDF in Document Studio, choose **Use annotated PDF from Document Studio**, confirm submission, then verify the exact PDF attachment, attempt number, submitted timestamp and submission preview in Canvas. Refresh NORTHSTAR and verify the official Canvas submission state is reconciled. Do not use a real graded assignment for initial testing.


## 8. Phase 4.4.7.3 — Edited PDF submission pipeline

The current implementation candidate sends the selected/annotated file to the private bridge as multipart data. The Worker performs the Canvas three-step upload:
1. Initialize a submission file using `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions/self/files`.
2. Transfer the exact signed parameters and file to the Canvas-provided HTTPS storage URL, without the Canvas bearer token.
3. Follow the storage response's Canvas `Location` by making an authenticated GET to the validated `/api/v1/files/:id/create_success` endpoint. The Worker returns the file object only after a valid Canvas file ID is confirmed.

NORTHSTAR then sends `submission_type: online_upload` with the finalized file ID(s) to `POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions`. The response must report a submitted/graded/pending-review state before NORTHSTAR marks the work submitted.

Automated coverage exercises both 3xx and 201 Location responses, signed-host token isolation, unsafe/missing finalization locations, and the app-side upload → file ID → assignment submission chain. These are mocked tests; they do not replace live acceptance in the connected Canvas tenant.

**Live acceptance still required:** use a low-risk instructor-approved test assignment that allows PDF uploads. Annotate a PDF in Document Studio, choose **Use annotated PDF from Document Studio**, confirm submission, then verify the exact PDF attachment, attempt number, submitted timestamp and submission preview in Canvas. Refresh NORTHSTAR and verify the official Canvas submission state is reconciled. Do not use a real graded assignment for initial testing.


The Document Studio annotated-PDF handoff now has a browser boot integration test. When the exported PDF is selected, it replaces other file-picker selections for that submission, matching the interface label. The test verifies that the exported file reaches the upload helper and its finalized Canvas file ID is passed to the assignment submission API. This remains mocked acceptance, not a real student-account submission.
