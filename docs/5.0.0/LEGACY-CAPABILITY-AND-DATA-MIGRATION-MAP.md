# NORTHSTAR 5.0 — Legacy Capability and Data Migration Map

**Integrated master:** [Cross-Application Data Architecture](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md)  
**Workstream:** Engineering Foundation / Cross-Application Intelligence  
**Status:** Detailed planning specification — integrated; complete source-level inventory and mapping outstanding  
**Decision sources:** ADR-5-002/007; CAI-DEC-01/03/04; NS-DATA-003; NS-CAI-001/005/010  
**Authorization:** Planning only. No source modification, deletion, migration, import/export or runtime behavior change authorized.

## 1. Purpose
Preserve valuable existing NORTHSTAR workflows while replacing accidental coupling and duplicated state with explicit domain services. Migration is capability-led, not file-led. Existing files and behaviors remain until dependencies, data ownership, replacement parity and rollback are evidenced.

## 2. Inventory domains and preservation requirements

| Legacy capability area | Canonical destination | Preservation concern | Required mapping evidence |
|---|---|---|---|
| Dashboard summaries/priorities | Dashboard projections over Course/Assignment/GradeItem/Event | Rules, expectations, hidden filters | Inputs, formulas, sorting, empty/error states |
| Courses and terms | AcademicTerm/Course | Provider identity, local preferences | Source fields, IDs, relationships, archive behavior |
| Assignment workflows | Assignment/Submission/PersonalNote/FileAsset | Drafts, external handoffs, status distinctions | Lifecycle, save/submit semantics, external links |
| Calendar and due dates | AcademicEvent plus Assignment due-date projection | Duplicate deadlines, timezone, recurrence | Event source, timezone, update/delete propagation |
| Gradebook and feedback | GradeItem and provenance | Official vs projected grade confusion | Weighting assumptions, hidden/provisional grades |
| Materials and downloads | Resource/FileAsset | File bytes, bookmarks, metadata, references | Storage, checksum, ownership, retention |
| Document Studio/PDF/annotation/export | FileAsset and document workspace services | Annotations, autosave, export, recovery | Formats, annotation persistence, export parity |
| Study Lab/flashcards/practice | StudyArtifact/StudySession | User content and learning history | Content model, progress, scheduling rules |
| AI Workspace/Copilot | Provider-neutral AI boundary and approval service | Consent, context, draft history | Context sources, permissions, consequential actions |
| Canvas integration/worker | Canvas adapter and secure server boundary | Credentials, return-context hardening, official state | Call sites, scopes, handoffs, validation, secrets |
| Notifications/alerts | Notification domain over typed events | Coverage, deduplication, preferences | Trigger matrix, delivery and read states |
| Diagnostics/release history | Support surfaces and docs | Supportability and audit evidence | Access controls, operational dependencies |

## 3. Data migration mapping template
For every persisted object/browser-storage key record: legacy key/table/file and format; owning workflow and code read/write call sites; entity/field transformation; stable identity and duplicate detection; source authority/provenance; null/default/invalid handling; attachment relationships/checksums; user-authored vs provider-owned classification; version/checkpoint; conflict/rollback behavior; retention/deletion; and verification fixture/criteria.

No legacy value is discarded as “duplicate” until semantic equivalence is demonstrated.

## 4. Migration stages
1. Inventory: static search of storage keys, API calls, routes, forms, file handlers and event listeners.
2. Classify: map each behavior/data field to owner, source authority, sensitivity and lifecycle.
3. Reconcile: identify duplicate identities, conflicts and orphaned files; reports only.
4. Design: versioned transformations, checkpoints, idempotency and rollback.
5. Dry-run plan: use copies/fixtures in a non-production environment only after separate implementation/test authorization.
6. Parity qualification: compare counts, relationships, checksums, workflow outcomes and visible behavior.
7. Controlled cutover: explicit approval, backup/restore evidence, monitoring and rollback.
8. Retirement: remove legacy paths only after replacement acceptance and dependency proof.

## 5. Non-negotiable preservation set
Until separately verified and accepted: Canvas worker/security boundary; assignment routing/submission; external handoffs and return-context validation; document persistence, annotation, PDF export and recovery; grade/course data; file downloads/references; autosave/drafts; user-created study materials; regression tests.

## 6. Retirement criteria
A candidate can be retired only when all callers/data dependencies are mapped; unique behavior/data is migrated or explicitly deprecated by user choice; replacement meets approved criteria; automated/manual regression evidence exists; backup/restore and rollback are proven; no external handoff/security boundary/file reference is orphaned; and the change is isolated, reviewable and explicitly authorized.

## 7. Known retirement candidates (planning only)
Direct provider-key workflows; optional StudentVUE import; duplicate Copilot/autopilot controls; duplicate alert surfaces; runtime release-history UI; developer diagnostics in student navigation; overlapping CSS; monolithic JavaScript; duplicate/legacy documentation. These are candidates for analysis, not approved deletions.

## 8. Evidence required before migration approval
Complete inventory, source-to-target mapping, data classification, transformation catalogue, representative fixtures, reconciliation report, error handling, backup/restore rehearsal, parity test plan, cutover/rollback runbook and user acceptance criteria. The current source audit is static and does not establish runtime behavior or data completeness.

**Disposition:** Mapping framework drafted; actual legacy inventory and migration execution remain outstanding.



## 9. Current product-scope disposition — 2026-11-25

The following legacy capabilities must be mapped and preserved as legacy source, but are excluded from the target NORTHSTAR 5.0 application by NS-SCOPE-001:
- Canvas assignment submission, upload, re-submit and receipt flows;
- Classic/New Quizzes question/attempt/answer/flag/score flows;
- discussion posting/reply/edit workflows;
- PDF/document editor and document-draft editing suite;
- any provider write operation that would make NORTHSTAR a second source of truth.

Target 5.0 equivalents are organizer/intelligence capabilities only: assignment tracking and personal planning, external Canvas handoff, read-only provider status when authorized, course workspaces/editor for personal NORTHSTAR metadata, calendar, gradebook insights, resources, flashcards/spaced repetition/study guides, limited writing feedback and simulated AI.

Legacy root files, Worker routes, tests and release records are not deleted or disabled by this map. NSX-028 requires an explicit owner decision whether the 4.4.x legacy runtime remains a separately frozen product or is deactivated/decommissioned. Any migration/retirement must first complete the source-to-target mapping, preserve user data, pass parity tests, produce a backup and rollback plan, and receive separate authorization.
