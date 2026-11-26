# NORTHSTAR 5.0 — Module 1: Comprehensive Legacy and Integration Evidence Plan

**Decision date:** 2026-11-25  
**Decision set:** EFP-DEC-16 through EFP-DEC-20  
**User selections:** A / A / A / A / A  
**Status:** Planning scope approved; evidence collection and reconciliation in progress  
**Authorization:** Documentation and static source analysis only. Application implementation is not authorized.

## 1. Purpose and outcome

This module establishes the evidence required to understand the existing NORTHSTAR application before finalizing migration, replacement, consolidation, or retirement plans. It expands the prior source-tree and persistence checkpoint into a traceable, source-backed inventory and connects that inventory to the approved canonical data architecture and all major workspaces.

The intended outcome is not merely a list of files. It is a reconciled account of what the existing system does, where its behavior and data live, how components depend on one another, what must be preserved, and what evidence is still missing.

No capability may be classified as unused, redundant, safe to remove, or fully replaced solely because a reference was not found in a partial search. Unknowns must remain visible.

## 2. Approved decisions

| Decision | Approved direction | Required result |
|---|---|---|
| EFP-DEC-16 | Complete legacy source inventory | Path-level inventory of every source/configuration/test/deployment artifact, its purpose, dependencies, imports, consumers, execution role, workflows and preservation disposition. |
| EFP-DEC-17 | Full persistence trace | Key/store/schema/call-site matrix for every browser persistence mechanism, including data class, owner, readers, writers, migrations, fallbacks, cleanup, retention, export, backup and recovery. |
| EFP-DEC-18 | Route-level Canvas and integration evidence | Complete Worker route catalogue with methods, validation, permissions, upstream mappings, error behavior, security boundary, tests and official Canvas documentation evidence. |
| EFP-DEC-19 | Complete workspace contracts | Contract coverage for Assignments, Courses, Calendar, Gradebook, Resources, Study Lab and AI Workspace, including shared entities, ownership, commands, events, permissions, offline/conflict/freshness behavior and acceptance. |
| EFP-DEC-20 | Evidence before sign-off | Reconcile findings with requirements, architecture, migration, risks, preservation, parity, backup/restore and rollback gates before module sign-off. |

## 3. Evidence rules

Every material finding must record:
- exact repository path and symbol/route/key/store where applicable;
- source branch and commit inspected;
- evidence location (file and line or test reference where available);
- observed behavior, not inferred intent;
- upstream or downstream dependencies and known consumers;
- evidence class and confidence;
- unresolved questions and next verification action;
- preservation and migration implications.

Use these evidence classes consistently:

1. **Source-confirmed:** directly observed in the exact source revision.
2. **Test-described:** represented by an existing test, whether or not that test has been executed.
3. **Official-provider-documented:** supported by dated official provider documentation.
4. **Repository-documented:** described in repository documentation but not yet confirmed in source.
5. **Inferred:** plausible interpretation requiring confirmation; never treated as fact.
6. **Tenant/environment-unverified:** documented capability not verified in the user's actual Canvas tenant or deployment.
7. **Runtime-unverified:** no execution evidence; static analysis only.

Record negative findings with search scope and method. “No reference found” is not equivalent to “unused.”

## 4. Work package A — Complete source and dependency inventory

Inventory all tracked files, not just runtime scripts. Include:
- application entry points, HTML, scripts, styles, assets and static resources;
- package manifests, lockfiles, build/runtime configuration and environment templates;
- service workers, PWA manifest, caching and update behavior;
- Canvas Worker, routing, CORS, origin allowlists and deployment configuration;
- native iOS host/presenter code and handoff contracts;
- tests, fixtures, mocks, scripts, CI workflows and release automation;
- documentation that defines behavior, decisions, contracts or operational procedures.

For each path, capture:
- path, type, purpose and execution context;
- imports, dynamic imports, script-load ordering and external/CDN dependencies;
- exported symbols, global registrations, DOM selectors, event listeners and consumers;
- route/hash/navigation relationships and workflow entry/exit points;
- data read/write effects and provider calls;
- test and fixture coverage (clearly distinguish test existence from execution);
- security/privacy implications;
- preserve, replace, isolate, consolidate, archive, retire-candidate or unknown disposition;
- required parity evidence and rollback dependency.

Build dependency and workflow graphs where textual tables would obscure relationships. Reconcile the exact migration-source branch and commit against the earlier audited baseline before treating the current default-branch snapshot as authoritative.

## 5. Work package B — Complete persistence and data lifecycle trace

Inventory every use of localStorage, sessionStorage, IndexedDB, Cache Storage, service-worker-managed caches, files/blob storage, URL/session handoff state, and any server-side persistence discovered.

For every key, database, object store, schema, cache, or file class, capture:
- exact name/prefix/key construction and version;
- data class, sensitivity, ownership and source authority;
- schema/shape, identity and relationship to canonical entities;
- all creation, read, update, delete, migration and cleanup call sites;
- lifecycle triggers, expiry, retention, eviction and quota behavior;
- encryption/protection, key management and threat limitations;
- offline availability and synchronization behavior;
- export/import, backup, restore, disconnect and account-revocation behavior;
- corruption, quota-exceeded, interrupted-write and recovery behavior;
- source-to-canonical target mapping and migration disposition.

Do not invent cache quotas, freshness intervals or retention durations. Derive them from measured iPad/PWA constraints, data sensitivity, file-size distributions, recovery objectives and provider limits. Keep logical policy decisions separate from physical schema implementation.

Previously observed stores and key families are provisional evidence only: northstar-secure-vault v1 / secrets; northstar-document-studio v1 / documents and drafts; PDF markup/identity localStorage families; and session-scoped quiz-attempt state. Reconfirm all against the exact migration-source revision and enumerate every call site.

## 6. Work package C — Canvas Worker and external integration contracts

For every Worker route, record:
- route path/pattern, HTTP method and accepted content types;
- query, path and body schema, limits and validation;
- authentication assumptions, permission/scope requirements and ownership checks;
- frontend origin allowlist, CORS, cache/no-store behavior and secret boundary;
- exact upstream Canvas endpoint/method and documented request/response fields;
- pagination, rate limits, concurrency, versioning and unsupported cases;
- error mapping, retry policy, idempotency and ambiguous-outcome behavior;
- file upload/download behavior and data handling;
- corresponding source call sites, tests and operational configuration.

For Canvas capability claims, record the official documentation URL/title, retrieval date, endpoint and method, required scopes/permissions, limitations and evidence class. Keep official documentation evidence separate from tenant-specific verification. Do not access the live tenant or deploy/test the Worker under this planning authorization.

Inventory other external dependencies and handoffs, including StudentVUE, AI providers, PDF.js/CDN assets, native iOS secure-content presentation, external assignment/document links, and any discovered service endpoints. Identify where a secure BFF is required; defer hosting and database topology until evidence supports a choice.

## 7. Work package D — Seven workspace integration contracts

Create one contract per workspace using a common template.

| Workspace | Contract emphasis |
|---|---|
| Assignments | Assignment identity, due dates, status, drafts, submission artifacts, Canvas authority, ambiguous submission outcomes and calendar/gradebook propagation. |
| Courses | Course/section identity, enrollment/term metadata, course resources, course-scoped context and ownership. |
| Calendar | Academic events, due-date projections, timezone semantics, recurrence, user-created events and conflict handling. |
| Gradebook | Official grade/score authority, grading periods, unpublished/hidden states, freshness and distinction between estimates and official results. |
| Resources | Files, links, document metadata, source provenance, permissions, versioning and retention. |
| Study Lab | Study materials, flashcards, generated guides, practice attempts, learning progress and source links back to course content. |
| AI Workspace | Permission-bounded context assembly, provenance, provider-neutral operations, user approval, generated artifact ownership and privacy boundaries. |

Every contract must define:
- domain owner and canonical entities/fields;
- workspace read projections and write commands;
- event subscriptions/publications and propagation expectations;
- source authority and field-level provenance;
- permissions, user approval and provider boundary;
- offline reads/writes, queue eligibility and reconnect reconciliation;
- conflict detection, preservation and user resolution;
- freshness/staleness/error visibility;
- data lifecycle, retention and deletion implications;
- acceptance criteria, failure cases and end-to-end workflows;
- migration mapping from legacy source and parity/rollback evidence.

Shared academic facts must not be duplicated as independently authoritative workspace records. Workspace-specific views may be projections over the canonical data layer.

## 8. Work package E — Reconciliation and preservation gates

Before sign-off, reconcile every inventory item against:
- requirements traceability IDs and approved decisions;
- canonical academic data model and field authority;
- integrated architecture and provider/BFF boundaries;
- legacy capability/data migration map;
- Canvas endpoint/permission evidence;
- offline cache, retention, backup and recovery policy;
- security/privacy threat and risk register;
- regression tests, fixtures and workflow acceptance criteria;
- backup, restore, rollback and user-visible recovery requirements.

Preservation gate:
1. capability and data behavior are understood;
2. all dependencies and consumers are mapped;
3. target capability and ownership are specified;
4. parity criteria and regression coverage are defined;
5. migration and reconciliation behavior are documented;
6. backup/restore and rollback are defined;
7. separate implementation authorization is obtained before any code or data change.

No retirement recommendation may bypass these gates. An item may remain explicitly unresolved if evidence is unavailable.

## 9. Deliverables

1. Complete source-tree and dependency/consumer inventory.
2. Source-to-workflow and source-to-target capability map.
3. Browser persistence key/store/schema/call-site/lifecycle matrix.
4. Canvas Worker route and security contract catalogue.
5. Official Canvas endpoint and permission evidence matrix.
6. External integration/dependency inventory.
7. Seven workspace integration contracts.
8. Data lineage and migration mapping with preservation disposition.
9. Evidence-gap and risk register with owners/next actions.
10. Requirements reconciliation and module acceptance report.

Use grouped, coherent documents and appendices rather than creating many tiny planning files. Keep the integrated architecture as the governing reference and link supporting evidence from the inventory.

## 10. Acceptance criteria

Module 1 may be proposed for sign-off only when:
- the exact migration-source revision is identified and reconciled with the audited baseline;
- every tracked source/configuration/test/deployment/native artifact is accounted for or explicitly excluded with rationale;
- imports, script order, runtime consumers, routes, DOM/event relationships and external dependencies are traced;
- all persistence mechanisms, dynamic key families, stores, schemas and read/write/delete call sites are enumerated;
- every Worker route is mapped to its source, tests, security controls and documented upstream endpoint;
- official Canvas evidence is dated and separated from tenant-specific verification;
- all seven workspace contracts are complete and internally consistent;
- every finding maps to requirements, architecture, migration and preservation gates;
- unresolved evidence gaps and risks are explicit, with no unsupported completeness claims;
- no implementation, runtime, test, build, tenant or iPad verification is implied by static planning artifacts.

## 11. Current evidence and known gaps

The current repository checkpoint records an initial tree and selected static findings. It is not yet the complete inventory. Remaining work includes exact migration-source reconciliation; exhaustive file and dependency/consumer mapping; all storage call sites and dynamic keys; complete Worker route extraction; CI/workflow and release/deployment configuration; external CDN/dependency inventory; official Canvas endpoint evidence; full workspace contracts; and risk/preservation reconciliation.

Static analysis only. No dependency installation, test/build execution, browser or iPad qualification, live Canvas tenant access, Worker deployment, application code modification, migration, or legacy deletion has been performed or authorized.

## 12. Authorization and change control

This module authorizes documentation updates and static repository/source analysis. It does not authorize:
- application code or runtime configuration changes;
- database schema creation or migration;
- dependency installation or lockfile changes;
- live Canvas/StudentVUE/AI provider access or tenant verification;
- credential changes, Worker deployment or production changes;
- legacy deletion, feature disabling, data cleanup or destructive migration;
- build/test execution or claims of runtime qualification.

Any such work requires separate explicit user authorization. Planning approval and module sign-off do not imply implementation approval.


## 13. Superseding authorization record — 2026-11-25

The restriction in Section 12 records the authorization boundary at the time Module 1 was approved. It remains valid for live Canvas/StudentVUE/AI access, tenant verification, migration, Worker deployment, production changes and legacy deletion/disablement.

A later, separate owner authorization is recorded in the development-branch [README](README.md), [Implementation Readiness and Transition Plan](IMPLEMENTATION-READINESS-AND-TRANSITION-PLAN.md) and [Requirements Traceability](REQUIREMENTS-TRACEABILITY.md). It authorizes bounded local/demo application implementation and development-branch CI/build/test work. This later authorization does not reopen Phase 0 and does not authorize the excluded operations listed above.

The current controlling task sequence and evidence requirements are in [Authorized Execution Plan and Evidence Register](EXECUTION-PLAN-AND-EVIDENCE-REGISTER.md). Where this historical module text and the later authorization differ, the later explicit owner authorization controls only within its stated scope; all other restrictions remain.
