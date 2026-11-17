# NORTHSTAR 0.4 — Engineering Log

Last updated: 2026-11-17
Repository: `s0ndvyr/NORTHSTAR-2.0`
Production branch: `main`
Working branch: `northstar-0.4.3-phase-3-studentvue`
Current release identifier: `NORTHSTAR / .4.3`

## Product direction

NORTHSTAR is a single-user, iPad-first academic command center. It must accurately reflect the student's Canvas courses, assignments, submission states, grades, marking periods, and workload. It must never fabricate a live connection, grade, submission, or saved state. Reliability, data preservation, privacy, and honest integration status come before visual polish.

## Phase roadmap

1. **Foundation** — persistence architecture, credential handling, recoverable settings, initial backup groundwork.
2. **Canvas synchronization** — courses, assignments, submission states, official grades, sync reliability, offline snapshots. **Phase 2 implementation recorded; live user verification remains an explicit release gate.**
3. **StudentVUE** — investigate official district-supported access; implement only authorized methods.
4. **Assignment workspace** — assignment instructions, drafts, supported submission types, attachments where supported, confirmation and feedback.
5. **Settings and data management** — complete settings audit, backup/restore, credential controls, persistence verification.
6. **Visual revolution** — dashboard, navigation, theme engine, Starlight/Nebula environments, motion and iPad polish.
7. **Full regression and release verification** — end-to-end checks and deployment review.

Do not advance a phase until its exit criteria are tested and remaining limitations are recorded. Do not begin the full visual revolution before the functional phases are complete.

## Important product decisions

- Canvas is the source of truth for assignments, submission timestamps, submission attempts, and Canvas grades.
- Official Canvas enrollment totals and NORTHSTAR's assignment-derived grade estimates must remain separate and clearly labeled.
- A local draft is never a Canvas submission.
- `Submitted`, `Awaiting Grading`, `Completed`, `Missing`, `Overdue`, and `Excused` are distinct states.
- Marking periods are user-defined unless an official school source provides them. Do not infer or invent period dates.
- Disconnecting Canvas removes the saved credential but should preserve the last successful coursework snapshot for offline reference.
- External Google/Canvas content may refuse iframe embedding. Use authenticated external destinations rather than trying to bypass access restrictions.
- Never put tokens in URLs, logs, debug exports, or Git history.
- Browser-side encryption protects against casual storage inspection, not malicious same-origin JavaScript or a compromised device.

## Phase 1 foundation — carried in the current working archive

- IndexedDB/Web Crypto device vault for persistent secrets.
- Canvas and Gemini credentials can be remembered encrypted on this device, with explicit opt-in controls.
- Show/Hide controls for secret fields.
- Canvas offline snapshot storage.
- Marking-period JSON export/import groundwork.
- External assignment links open in their authenticated destination rather than relying on iframe embedding.
- Theme groundwork exists, but no further visual redesign is part of the current phase.

## Phase 2 work in the current working archive

- Canvas course requests include `total_scores`, `current_grading_period_scores`, and `grading_periods`.
- Course retrieval is scoped to active student enrollments.
- Official grade normalization reads the current grading-period title/id and computed totals from the student enrollment object.
- Submission-state normalization distinguishes `submitted`, `pending_review`, `graded`, stale grade after a new attempt, missing, and excused.
- Assignment type labels distinguish discussions, quizzes, external tools, file uploads, writing, URLs, media recordings, and no-submission assignments.
- Ledger filters distinguish `Missing` from `Overdue`, and `Completed` from `Submitted` and `Awaiting Grading`.
- A successful submission updates the in-memory assignment and the encrypted offline snapshot using the actual Canvas response.
- Disconnecting Canvas removes credentials but preserves the last successful coursework snapshot.
- Canvas syncs are guarded against overlapping requests.
- Event-driven refresh is triggered when the page returns to the foreground after stale data or when connectivity returns; it is rate-limited and does not run a background polling loop.
- Failed required course/assignment reads preserve the last known-good dataset.

## Current repository and branch status

- The Phase 3 branch was created from the then-current `main` HEAD (`74c28ef0e5e3e2d233ebcc7b7f036b0bd24880ac`).
- Phase 3 research documentation is being committed to `northstar-0.4.3-phase-3-studentvue`; production `main` is not modified.
- The older working-archive notes below describe Phase 2 implementation and verification status; they are not evidence that live Canvas testing has passed.

## Current Canvas bridge configuration to verify

- `ALLOWED_ORIGIN` in `canvas-bridge/worker.js` is currently `https://s0ndvyr.github.io`. Confirm this exactly matches the deployed app origin.
- `CANVAS_ORIGIN` is currently hard-coded as `https://nnps.instructure.com`. Confirm it exactly matches the Canvas school URL the user enters in NORTHSTAR before deploying the Worker. Never assume it is correct without checking the user's actual Canvas URL.
- The Worker allows GET requests for the course list, course detail, course assignments, and assignment groups. It allows POST only for text-entry and URL assignment submissions.
- File-upload, quiz, discussion, and external-tool submissions are not implemented in the bridge; those must be completed in Canvas until supported workflows are built and tested.

## Verification status for this working archive

- Passed: AI client tests.
- Passed: Canvas bridge security/read-path and restricted-write tests.
- Passed: Canvas grade/submission normalization tests.
- Passed: grade calculation and marking-period bucketing tests.
- Passed: submission validation, escaping, confirmation, and no-retry tests.
- Passed: Canvas debug redaction and error-classification tests.
- Passed: `node --check` for all JavaScript files and the Cloudflare Worker.
- Not yet run: full browser boot test. It requires `jsdom`; dependency installation timed out in this environment. Do not count this test as passed.
- Not yet run: authenticated live sync against the user's school Canvas account.
- Not yet run: deployed Cloudflare Worker integration test.

## Phase 2 exit checklist (user verification still required)

- [ ] Verify the exact Canvas school origin and Worker allowed origin.
- [ ] Connect with the user's own Canvas token entered directly in the NORTHSTAR UI (never in chat).
- [ ] Verify active course list and course names.
- [ ] Verify complete assignment counts across courses and pagination.
- [ ] Compare Canvas submission states and timestamps for existing submitted work.
- [ ] Verify `pending_review`, graded, missing, overdue, and excused states.
- [ ] Compare official course and current grading-period grades against Canvas UI.
- [ ] Verify repeated sync does not duplicate assignments.
- [ ] Verify failed sync retains the previous successful snapshot.
- [ ] Verify a confirmed submission updates the snapshot (use only a safe/test assignment if an actual write test is ever authorized).
- [ ] Verify disconnect preserves offline coursework while clearing credentials.
- [ ] Run full browser boot test after `jsdom` is available.
- [ ] Commit the verified Phase 2 work to the development branch, not `main`.

## Phase 3 — StudentVUE (active)

- Research document: `STUDENTVUE-INTEGRATION-RESEARCH.md`.
- NNPS public documentation confirms StudentVUE provides student access to grades and assignments, but the reviewed public district material does not publish an authorized API, OAuth flow, developer registration, or third-party integration agreement.
- A community reverse-engineered mobile protocol exists, but it is not district authorization. Do not implement private endpoint scraping or undocumented credential flows.
- Live integration is blocked pending confirmation of a district-approved API, Ed-Fi endpoint, or approved data export.
- Proposed data contract keeps StudentVUE grade records separate from Canvas and preserves source, retrieval timestamp, school year, course, and marking period. Missing grades remain null and display as N/A.
- No student credentials have been requested or stored. Never ask the user to paste a StudentVUE password into ChatGPT or NORTHSTAR.

### Phase 3 exit checklist

- [x] Review official NNPS StudentVUE information and login portal.
- [x] Review Edupoint's public overview of district-configurable StudentVUE capabilities.
- [x] Identify and document the boundary between official district support and community reverse-engineered protocol notes.
- [ ] Ask NNPS whether a student-authorized API, Ed-Fi endpoint, or approved export is available.
- [ ] Obtain written permission / terms and official authentication and API documentation before implementation.
- [ ] Implement only a district-approved read-only connector or import workflow.
- [ ] Add tests for grade provenance, null/N/A handling, historical period mapping, stale snapshots, and failed-sync preservation.
- [ ] Verify current and historical grades against StudentVUE on the user's iPad without exposing credentials.
- [ ] Close Phase 3 only after the authorized integration path is proven; otherwise record the no-API limitation and proceed with a safe manual import/external-link fallback.

## Next actions

1. Ask NNPS Student Information Systems or the school's Technology Support Specialist whether a supported student-authorized integration/export exists.
2. If approved documentation is supplied, design and implement the read-only connector and tests.
3. In parallel, continue isolated Phase 3 academic data-model work only where it does not imply a live StudentVUE connection.
4. Keep the next phase gated until this phase's exit criteria and limitations are recorded.
