# NORTHSTAR 0.4 — Engineering Log

Last updated: 2026-11-17
Repository: `s0ndvyr/NORTHSTAR-2.0`
Production branch: `main`
Working branch: `northstar-0.4-phase-2-canvas-sync`

## Product direction

NORTHSTAR is a single-user, iPad-first academic command center. It must accurately reflect the student's Canvas courses, assignments, submission states, grades, marking periods, and workload. It must never fabricate a live connection, grade, submission, or saved state. Reliability, data preservation, privacy, and honest integration status come before visual polish.

## Phase roadmap

1. **Foundation** — persistence architecture, credential handling, recoverable settings, initial backup groundwork.
2. **Canvas synchronization** — courses, assignments, submission states, official grades, sync reliability, offline snapshots. **Current phase.**
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

- `main` currently points to commit `79c8b342310db881e4b24a5ee21966b70ce690ed`.
- `northstar-0.4-phase-2-canvas-sync` exists and currently points to the same commit as `main`.
- The earlier Phase 2 ZIP contains uncommitted changes. The current working archive adds further corrections described above.
- Do not claim these changes are in GitHub until a commit is visible on the working branch.

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

## Phase 2 exit checklist

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

## Next actions

1. Reconcile the current working archive with the GitHub working branch.
2. Complete the Phase 2 code review and tests.
3. Verify bridge configuration without exposing the user's Canvas token.
4. Ask the user to test the real Canvas connection in the NORTHSTAR UI and share only non-secret diagnostic output if it fails.
5. Close Phase 2 only after the exit checklist is satisfied.
6. Then begin StudentVUE research (Phase 3).
