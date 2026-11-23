import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const premium=readFileSync(new URL('../scripts/premium.js',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../scripts/workspace.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../canvas-bridge/worker.js',import.meta.url),'utf8');

function between(source,start,end,label){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,label+' function/block exists');
 return source.slice(a,b);
}

// Standard Canvas assignments: a finalized file upload is not itself a
// submission, and the successful UI state requires a separate official read.
const upload=between(premium,'async function phase441UploadSelectedFiles','async function phase441ReconcileSubmission','staged assignment upload');
assert.ok(upload.includes('phase441LoadStagedUploads(a,c)'),'staged Canvas file IDs survive a page reload');
assert.ok(upload.includes('phase441PersistStagedUploads(a,c,staged)'),'finalized IDs are persisted by course and assignment');
assert.ok(premium.includes("subtle.digest('SHA-256'"),'staged upload reuse is bound to file content, not only filename/size metadata');
assert.ok(upload.includes('expiresAt'),'the staged file index has an expiry');
assert.ok(!upload.includes('localStorage.setItem')||!upload.includes('file.bytes'),'the staging index does not persist raw file bytes');
const submission=between(premium,'window.submitAssignment=async function(){','\nrenderNotes =','standard assignment submit');
assert.ok(submission.includes('phase441UploadSelectedFiles'),'online uploads use the official staged Canvas upload path');
assert.ok(submission.includes('window.NorthstarSubmissions.send'),'the final assignment submission uses the official submission API');
assert.ok(submission.includes('getAssignmentSubmission'),'the UI reads back Canvas after the POST');
assert.ok(submission.includes('submissionPostResponseReceived'),'a successful POST followed by failed reconciliation remains uncertain');
assert.ok(submission.includes("['submitted','graded','pending_review']"),'only submitted/graded/pending-review workflow states qualify');
assert.ok(submission.includes('official.submitted_at'),'a submitted timestamp is required for a receipt');
assert.ok(submission.includes('fileIds.every'),'every expected finalized file ID must appear on the official submission');
assert.ok(submission.includes('phase441MarkSubmissionUncertain'),'ambiguous outcomes are persisted');
assert.ok(submission.includes('phase441RenderSubmissionReceipt'),'the receipt is rendered only after official confirmation');
const reconcile=between(premium,'async function phase441ReconcileSubmission','function submissionPanel','assignment reconciliation');
assert.ok(reconcile.includes('getAssignmentSubmission'),'uncertain submits are reconciled through a fresh Canvas read');
assert.ok(reconcile.includes('phase441ClearSubmissionUncertain'),'only a successful reconciliation clears the durable lock');
assert.ok(reconcile.includes('phase441SubmissionDetailsMarkup'),'submission history and comments are refreshed where available');

const assignmentRead=between(workspace,'async function getAssignmentSubmission','async function getExternalToolLaunch','assignment read API');
assert.ok(assignmentRead.includes('include%5B%5D=submission&include%5B%5D=can_submit'),'assignment retrieval includes current student submission and can_submit');
assert.ok(assignmentRead.includes('/api/v1/users/self'),'history is scoped to the authenticated student');
assert.ok(assignmentRead.includes("'/submissions/'+userId+'?include%5B%5D=submission_history"),'history/comments/rubric are retrieved for the current user');
const completion=between(workspace,'async function completeQuiz','function questionType','quiz completion API');
assert.ok(completion.includes("'/api/v1/courses/'+c+'/quizzes/'+q+'/submissions/'+id(submission.id)+'/complete'"),'the official quiz completion endpoint is called for the exact attempt');
assert.ok(completion.includes('getCurrentQuizSubmission'),'quiz completion is independently reconciled');
assert.ok(completion.includes('completionOutcomeUnknown'),'lost confirmation is not converted into success or retried');

const quizSave=between(premium,'async function phase4FlushQuizState','async function phase4AutoSaveQuizAnswers','quiz flush');
assert.ok(quizSave.includes('phase4CurrentQuizSignature'),'the flush checks the latest local answer/flag signature');
assert.ok(quizSave.includes('phase4LastQuizSavedSignature'),'the flush waits for Canvas save confirmation');
assert.ok(quizSave.includes('do not submit the quiz yet'),'a changing or unconfirmed answer state blocks final submit');
const quizComplete=between(premium,'async function phase4CompleteQuizAttempt','async function phase4ReconcileQuizAttempt','quiz complete UI');
assert.ok(quizComplete.includes('await phase4FlushQuizState(s)'),'all latest answers are flushed before completion');
assert.ok(quizComplete.includes('completion?.confirmed'),'the UI requires independently verified completion');
assert.ok(premium.includes('phase4QuizCompleting'),'a duplicate quiz completion click is blocked until the attempt is reconciled');
assert.ok(!quizComplete.includes('if(phase4QuizSaveInFlight){toast(\'Wait for the current answer save'),'completion waits for in-flight autosave through the flush routine');
assert.ok(quizComplete.includes('phase4RenderQuizReceipt'),'the UI renders a receipt only after verified completion');
assert.ok(quizComplete.includes('completionOutcomeUnknown'),'uncertain completion does not automatically repeat the final request');
const quizReconcile=between(premium,'async function phase4ReconcileQuizAttempt','function phase4RenderQuizReceipt','quiz status reconciliation');
assert.ok(quizReconcile.includes('getCurrentQuizSubmission'),'the same current Canvas attempt is fetched before retry is allowed');
assert.ok(quizReconcile.includes('Number(current.id)!==Number(s.submission.id)'),'a different Canvas attempt cannot replace the active one');
assert.ok(quizReconcile.includes("['complete','pending_review']"),'only a terminal Canvas attempt produces a receipt');
assert.ok(premium.includes('phase4ClearQuizSession(s.assignment)'),'the active quiz session is cleared only after a verified completion');

const quizFile=between(premium,'function phase4RenderQuizAttempt(){','async function phase4CompleteQuizAttempt(){','quiz attempt renderer and file upload');
assert.ok(quizFile.includes('uploadQuizSubmissionFile'),'quiz file uploads use the distinct Classic Quiz upload endpoint');
assert.ok(quizFile.includes('phase4FlushQuizState(s)'),'the file answer is saved before it is reported linked');
assert.ok(quizFile.includes('phase4LastQuizSavedSignature'),'the upload answer must be confirmed on the active attempt');

const newQuiz=between(premium,'function phase4RenderNewQuizPreview','async function openCanvasQuiz','New Quiz preview');
assert.ok(newQuiz.includes('Open official New Quizzes player inside NORTHSTAR'),'the official provider player remains the answer-entry owner');
assert.ok(newQuiz.includes('getAssignmentSubmission'),'NORTHSTAR refreshes the authoritative assignment completion state afterward');
assert.ok(newQuiz.includes('not inside NORTHSTAR'),'the UI does not claim that the provider attempt was native');

const discussion=between(premium,'let phase4DiscussionContext=null','function phase441StatusLabel','discussion workflow');
assert.ok(discussion.includes('phase4DiscussionDraftKey'),'initial posts, replies and edits have separate durable local drafts');
assert.ok(discussion.includes('phase4DiscussionUnknownKey'),'uncertain discussion posts are locked pending reconciliation');
assert.ok(discussion.includes('phase4VerifyDiscussionEntry'),'post/edit success requires reading the official Canvas entry');
assert.ok(discussion.includes('Number(found.entry.user_id)!==userId'),'edit is limited to the authenticated author');
assert.ok(discussion.includes('context.api.put(path,{message})'),'author edits use Canvas official PUT update');
assert.ok(discussion.includes('phase4DiscussionPlain(entry.message)!==wanted'),'reconciliation matches the actual post content');
assert.ok(discussion.includes('context.readOnly'),'locked/unpublished threads remain read-only');
assert.ok(discussion.includes('data-discussion-more'),'threads with more than the recent reply window expose a load-older control');
assert.ok(discussion.includes("'/entries/'+Number(marker.replyTo)+'/replies?per_page=100'"),'uncertain replies are verified against the exact parent thread');

assert.ok(worker.includes("const WORKER_BUILD = '0.4.22 (4.4.8.2)'"),'the Worker candidate is versioned independently');
assert.ok(worker.includes('isDiscussionEntryEditPath'),'discussion edits use an exact ID-scoped allowlist');
assert.ok(worker.includes('Invalid discussion edit message'),'the edit route accepts only a validated message payload');
assert.ok(worker.includes("key==='ids[]'"),'discussion entry verification reads only a bounded list of entry IDs');
assert.ok(worker.includes('const quizUploadInit='),'quiz upload initialization remains a dedicated Worker route');
assert.ok(worker.includes('create_success'),'file IDs are not returned before Canvas upload finalization');

console.log('PASS: Phase 3 source invariants — assignment reconciliation, durable staged files, Classic Quiz save/complete receipts, New Quiz provider boundary, discussion recovery/edit ownership, and Worker allowlists');
