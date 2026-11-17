# NORTHSTAR 0.4.3 — StudentVUE Integration Research

Research date: 2026-11-17
District portal: Newport News Public Schools (NNPS), Virginia
Student portal: https://va-nnps-psv.edupoint.com/PXP2_Login_Student.aspx
District information: https://nn.k12.va.us/parentvue/index.html

## Executive finding

NNPS confirms that StudentVUE provides students access to school information including attendance, grades, and assignments. The district's public-facing StudentVUE instructions describe sign-in with a district-issued username and password. The public materials reviewed do not publish a supported student-facing API, OAuth client flow, developer registration process, API scopes, or third-party integration agreement.

**Decision: do not implement credential scraping, browser-session extraction, undocumented endpoints, or a reverse-engineered private API.** A community-maintained repository documents reverse-engineered StudentVUE mobile protocols, including authentication and service calls. That is useful evidence that private mobile interfaces exist, but it is not district authorization or a stable supported integration contract. NORTHSTAR will not depend on it without explicit written authorization from NNPS and confirmation that the specific interface is permitted for student use.

## Verified capabilities and limits

- NNPS describes StudentVUE as providing access to school-related information, including attendance, grades, and assignments.
- Edupoint's general ParentVUE/StudentVUE documentation says district-enabled capabilities vary by district. It lists grade/score and assignment-related functionality, but does not establish which optional features NNPS has enabled.
- The public NNPS portal exposes a conventional StudentVUE account login. No public developer/API documentation was found in the district materials reviewed.
- StudentVUE grades should be treated as a separate authoritative grade source from Canvas. Do not merge, overwrite, or infer one system's values from the other.
- Historical marking-period grades must only be shown when the portal or an authorized export explicitly supplies them. NORTHSTAR must not manufacture historical grades from current Canvas assignment data.

## Recommended integration path

1. Ask NNPS Student Information Systems / school Technology Support Specialist whether a student-authorized API, Ed-Fi endpoint, data export, or approved third-party integration is available.
2. If an official API is offered, obtain its documentation, authentication method, scopes, rate limits, terms, and confirmation that a personal single-user application is permitted.
3. Prefer district-approved OAuth or a narrowly scoped read-only token. Never ask the student to paste their password into NORTHSTAR or ChatGPT.
4. If the district only supports interactive login, keep StudentVUE as an authenticated external destination until an approved integration route exists.
5. If an authorized read-only data export is offered, evaluate a local import workflow as a lower-risk alternative.

## Proposed NORTHSTAR data contract (not yet connected)

Keep StudentVUE records separate from Canvas records and preserve provenance:

- source: `studentvue`
- retrievedAt: ISO timestamp
- schoolYear: source-provided school year
- course: source course identifier/name
- markingPeriod: source-provided period identifier/name
- currentGrade: source-provided numeric/letter value, or null when unavailable
- historicalGrades: only source-provided completed-period values
- completeness: explicit status and warnings

A null or absent grade displays as **N/A**, never as zero or an inferred F. Each displayed grade must identify its source and retrieval time. A failed sync must preserve the last successful snapshot and label it stale/offline.

## Phase 3 gate

Implementation of live StudentVUE synchronization is blocked pending district authorization and a supported interface or approved export. This is an intentional security and reliability gate, not a completed integration.

## Sources reviewed

- NNPS ParentVUE/StudentVUE information: https://nn.k12.va.us/parentvue/index.html
- NNPS StudentVUE login portal: https://va-nnps-psv.edupoint.com/PXP2_Login_Student.aspx
- Edupoint ParentVUE/StudentVUE support overview: https://www.edupoint.com/Services/Support/For-Parents-Students
- Community-maintained reverse-engineered protocol documentation (not an official API): https://github.com/StudentVue/docs
