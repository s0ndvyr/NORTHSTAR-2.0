# NORTHSTAR 5.0 — Cross-Application Intelligence Planning

**Parent stage:** NORTHSTAR 5.0.0 — Architecture & Product Foundation  
**Workstream:** Cross-Application Intelligence  
**Status:** Planning in progress — decisions pending  
**Authorization:** Planning only; no application implementation authorized  
**Opened:** 2026-11-25

## 1. Purpose

Define how NORTHSTAR coordinates academic information and user workflows across Dashboard, Courses, Assignments, Calendar, Gradebook, Resources, Study Lab, Review Center, AI Workspace, and approved external integrations.

This workstream establishes shared-data behavior and cross-workspace consistency before engineering implementation. It does not build services, modify runtime code, connect live providers, or migrate data.

## 2. Approved constraints carried forward

- Canvas is authoritative for institution-managed records, including official course/assignment records, grades, instructor feedback, and submission status.
- NORTHSTAR owns personal workflow information such as planning, notes, preferences, study artifacts, and user-created organization.
- A shared academic data layer must prevent workspaces from maintaining contradictory copies of the same academic fact.
- Field-level provenance and source authority must remain visible and testable.
- Synchronization must be observable, permission-aware, recoverable, and transparent about delay or failure.
- Conflicting edits must not be silently discarded or overwritten; preserve source and local versions for review.
- Offline behavior must preserve user work and reconcile safely when connectivity returns.
- Consequential actions require explicit user approval.
- No live Canvas or AI connection may be claimed unless implemented and verified under separate authorization.

## 3. Proposed planning scope

### 3.1 Canonical academic data layer

Define canonical entities and relationships for terms, courses, enrollments, assignments, submissions, grade items, feedback, events, resources, files, notes, study artifacts, notifications, and synchronization metadata.

Specify stable identifiers, ownership, lifecycle, provenance, timestamps, versioning, and relationships. Distinguish source records from NORTHSTAR projections and user-authored overlays.

### 3.2 Cross-workspace projections

Define how each workspace reads and presents shared records without owning competing copies. Dashboard priorities, calendar events, gradebook views, course hubs, assignment workflows, and AI context should derive from consistent canonical state.

### 3.3 Live and background updates

Specify event-driven updates where supported, refresh fallback, manual refresh, stale-data indicators, retry/backoff, rate limits, idempotency, and user-visible sync status.

### 3.4 Field-level authority

Create an authority matrix for every shared field: authoritative source, permitted local overlay, merge behavior, freshness policy, and conflict behavior. Canvas-owned official fields must not be overwritten by NORTHSTAR-only edits.

### 3.5 Conflict and offline recovery

Define version comparison, conflict detection, preservation of both versions, user review, queued local writes, reconnect reconciliation, duplicate prevention, and recovery after interrupted operations.

## 4. Five decisions required

The following questions are pending user selection. Recommended options are A; no choice is recorded until the user submits the interactive decision module.

1. **Shared data architecture**
   - A: One canonical academic data layer, with domain-owned models and workspace-specific read projections.
   - B: Separate data stores per workspace with synchronization between them.
   - C: A hybrid where only Canvas data is centralized and personal data remains independently stored by each workspace.

2. **Update propagation**
   - A: Event-driven internal updates, provider webhooks/polling where available, plus manual refresh and visible stale/error states.
   - B: Scheduled polling as the primary mechanism, with manual refresh.
   - C: Manual refresh only.

3. **Field-level authority**
   - A: Explicit per-field source authority and provenance; Canvas owns official institution records while NORTHSTAR owns personal workflow fields.
   - B: Prefer the newest timestamp across sources for most fields.
   - C: Let each workspace choose which value to display.

4. **Conflict resolution**
   - A: Never silently overwrite; preserve both versions, explain the conflict, and request user review when a safe automatic resolution is not possible.
   - B: Automatically prefer the designated authoritative source and retain a hidden audit copy.
   - C: Automatically prefer the most recently edited version.

5. **Offline behavior**
   - A: Offline-capable cached reads and queued permitted local edits, with idempotent reconciliation and visible conflict/recovery status.
   - B: Read-only offline access; all edits require connectivity.
   - C: No offline support in the initial architecture.

## 5. Required outputs after decisions

- Canonical entity and relationship model.
- Field-level ownership and provenance matrix.
- Cross-workspace data-flow and update-propagation diagrams.
- Sync lifecycle, status, retry, and recovery specification.
- Conflict-resolution and offline behavior specification.
- Security and permission boundary mapping.
- Requirement IDs, dependencies, implementation criteria, verification methods, and acceptance states.
- Updated risk register and phase sign-off checklist.

## 6. Exit criteria

This workstream is ready for sign-off when all five decisions are recorded, the supporting specifications are complete, cross-workspace ownership is unambiguous, and every requirement has measurable verification criteria. Approval remains planning approval only. Implementation requires separate explicit authorization.
