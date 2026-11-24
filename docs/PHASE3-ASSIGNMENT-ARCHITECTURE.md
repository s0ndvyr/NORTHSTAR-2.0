# NORTHSTAR 4.4.8.3 — Canvas-aligned assignment execution

## Purpose
NORTHSTAR is the academic command center and assignment control room. Canvas and configured LTI providers remain the execution and submission authorities. NORTHSTAR retains native text, URL and file submissions where Canvas metadata and documented APIs permit them; provider-owned editing, quiz attempts, discussions and Student Annotation are not recreated.

## Metadata classifier
`scripts/assignment-execution.js` classifies from Canvas `submission_types`, availability fields and explicit external-tool metadata. It never infers a provider from an assignment title or arbitrary URL. External tools without explicit provider identity remain generic until Canvas returns launch metadata. Multiple submission types are preserved; provider-owned workflows take precedence over generic upload UI. Unknown types fail safely.

## Canvas API findings
- Assignments API documents `online_quiz`, `none`, `on_paper`, `discussion_topic`, `external_tool`, `online_upload`, `online_text_entry`, `online_url`, `media_recording`, and `student_annotation`. Multiple online types may be configured. https://developerdocs.instructure.com/services/canvas/resources/assignments
- Submissions API documents text body, URL, uploaded file IDs, and `annotatable_attachment_id` for Student Annotation. It does not document a general custom-editor annotation-payload upload. A local annotation draft or flattened PDF is not a native Canvas DocViewer submission. https://developerdocs.instructure.com/services/canvas/resources/submissions
- External-tool assignment launch uses `GET /api/v1/courses/:course_id/external_tools/sessionless_launch?launch_type=assessment&assignment_id=:assignment_id`. Canvas resolves the configured resource link and returns the launch URL. NORTHSTAR requests it at launch time, validates HTTPS, and does not persist the one-time URL. https://developerdocs.instructure.com/services/canvas/resources/external_tools
- LTI 1.3 uses the platform/tool OIDC launch flow. NORTHSTAR must not forge an LTI JWT, identity assertion, resource-link claim or provider session. https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.lti_launch_overview
- LTI Advantage providers may return grades/submissions through Assignment and Grade Services. https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.assignment_tools

## Google Assignments vs Google Drive
Google documents Assignments LTI as an LMS-integrated tool. In Canvas it is selected as an External Tool; students link their school Google account, edit Docs/Drive files and use Google's Turn In/resubmission interface. NORTHSTAR must use Canvas's assignment-specific LTI launch and let Google own editing, attachments, permissions, turn-in and provider resubmission.
- https://support.google.com/edu/assignments/answer/9381694
- https://support.google.com/edu/assignments/answer/9069054
- https://support.google.com/edu/assignments/answer/9069149

A Canvas Online > File Upload assignment can separately expose Google Drive as a file picker. That remains Canvas `online_upload`, not Google Assignments LTI. NORTHSTAR must not infer Google Assignments from a Google URL, title or Drive attachment. Where the student needs Canvas's Google Drive picker or institution-specific permissions, use the official Canvas assignment page. Google Drive LTI module/resource launches are separate and should be identified only by explicit Canvas tool metadata.

## Quiz and discussion policy
Classic Quizzes and New Quizzes are separate Canvas products/APIs. Both use the official Canvas assignment/quiz experience. NORTHSTAR does not create a parallel attempt, timer or completion receipt. The prior custom quiz implementation remains in source as legacy code but is no longer the default live execution path.
- https://developerdocs.instructure.com/services/canvas/resources/quizzes
- https://developerdocs.instructure.com/services/canvas/resources/new_quizzes
- https://developerdocs.instructure.com/services/canvas/resources/quiz_submissions

Live graded discussions route to Canvas. A local draft or post is not represented as a confirmed Canvas submission.

## External return and synchronization
The browser stores only a bounded return-context record: course ID, assignment ID, NORTHSTAR assignment key, provider label, launch timestamp, return hash, last known submission state and last successful sync timestamp. It never stores the one-time LTI launch URL or credentials in this record. On Safari/PWA return or in-app provider-view close, NORTHSTAR performs read-only Canvas synchronization, updates the dashboard and reopens the original assignment when appropriate. No submission POST is replayed. Context is cleared only after successful refresh.

## Qualification boundaries
Automated classifier tests cover file, text, URL, quiz, discussion, Student Annotation, external tools, explicit Google provider metadata, unknown types and availability restrictions. Existing transport and submission tests remain in the standard suite. Real Canvas, Google Workspace LTI, school-account, Respondus and physical iPad Safari acceptance require authorized accounts and hardware; CI alone does not establish those gates.
