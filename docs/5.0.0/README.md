# NORTHSTAR 5.0.0 — Setup Baseline

NORTHSTAR 5.0.0 is the controlled foundation for the next-generation, personal academic operating system. It is an iPad-first product for one user, not a public multi-tenant SaaS product.

## Phase 0 purpose

Prepare the repository, record the source baseline, define the migration and quality gates, inventory existing capabilities, and identify complexity that should be retired or consolidated before feature implementation.

## Source baseline

- Repository: [s0ndvyr/NORTHSTAR-2.0](https://github.com/s0ndvyr/NORTHSTAR-2.0)
- Audit branch: `northstar-4.4.8.3.1-stabilization`
- Audited commit: `df0427304e0f03aa822a1c8fe99547355e9c0bfc`
- Package metadata observed: `0.4.32`
- Release metadata observed: `4.4.8.3.1`
- Production metadata observed: `4.4.7.5 / 0.4.19`

The audited source includes later external return-context hardening changes that are not yet represented by the release metadata. Do not treat them as qualified.

## Authoritative documents

- [Phase 0 setup and audit](PHASE-0-SETUP-AND-AUDIT.md)
- [Implementation roadmap](IMPLEMENTATION-ROADMAP.md)
- [Requirements traceability](REQUIREMENTS-TRACEABILITY.md)
- [Decisions and retirement register](DECISIONS-AND-RETIREMENT-REGISTER.md)
- [Phase sign-off checklist](PHASE-SIGNOFF-CHECKLIST.md)
- [Engineering Foundation planning brief](ENGINEERING-FOUNDATION-PLANNING.md)
- [Cross-Application Intelligence planning](CROSS-APPLICATION-INTELLIGENCE-PLANNING.md)
- [Cross-Application data contracts and state machines](CROSS-APPLICATION-DATA-CONTRACTS-AND-STATE-MACHINES.md)
- [Integrated Cross-Application Data Architecture](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md)
- [Canonical academic data model](CANONICAL-ACADEMIC-DATA-MODEL.md)
- [Canvas capability and authority matrix](CANVAS-CAPABILITY-AND-AUTHORITY-MATRIX.md)
- [Offline cache, retention, backup and recovery policy](OFFLINE-CACHE-RETENTION-AND-RECOVERY-POLICY.md)
- [Legacy capability and data migration map](LEGACY-CAPABILITY-AND-DATA-MIGRATION-MAP.md)
- [Data architecture verification blueprint](DATA-ARCHITECTURE-VERIFICATION-BLUEPRINT.md)

## Phase tracker

| Phase | Name | Status |
|---|---|---|
| 5.0.0 | Product & Architecture Foundation | Approved planning baseline; Engineering Foundation planning in progress |
| 5.0.1 | Academic Data & Canvas Intelligence | **Planning complete and approved — closed; implementation not authorized** |
| 5.0.2 | Assignment & Coursework Experience | Planning decisions complete |
| 5.0.3 | Courses, Calendar & Resources | Planning decisions complete |
| 5.0.4 | Dashboard Studio & Personalization | Approved |
| 5.0.5 | AI & Intelligent Academic Assistance | Approved |
| 5.0.6 | Visual Refinement, Qualification & Release | Approved |
| Phase 0 | Setup & Repository Readiness | **Closed — user-approved 2026-11-25** |
| Cross-Application Intelligence | Shared data and cross-workspace coordination | **10 architecture/data decisions approved; integrated master and five supporting specs drafted; final review pending** |
| Application implementation | NORTHSTAR 5.0 coding | **Not authorized** |

## Phase 0 approval record

The user submitted the recurring five-question sign-off module with answers **1:A, 2:A, 3:A, 4:A, 5:A** on 2026-11-25.

1. **Source baseline — A:** Approve the dedicated 5.0.0 setup branch from the latest audited development source; production remains untouched.
2. **Setup deliverables — A:** Accept the version marker, audit, architecture roadmap, requirements register, retirement register, and sign-off documentation.
3. **Legacy bloat — A:** Preserve existing functionality until dependencies are mapped and replacements pass regression; then retire or consolidate through controlled changes.
4. **Target architecture — A:** Approve React + TypeScript + Vite, an iPad-first PWA, shared academic data, domain-separated workspaces, adapters, and one authoritative design system.
5. **Phase closure — A:** Accept Phase 0 as complete and prepare the engineering-foundation stage. This does not authorize application implementation.

**Decision:** Phase 0 is formally closed. Its closure certifies acceptance of setup artifacts only; it does not certify a working 5.0 application, build, test suite, Canvas connection, iPad acceptance, or production release.

## NORTHSTAR 5.0.1 status clarification

NORTHSTAR 5.0.1 — Academic Data & Canvas Intelligence — was already explicitly approved and closed as a planning phase on 2026-11-25. Its approved decisions remain authoritative. Cross-Application Intelligence is a related engineering-foundation planning workstream; it does not reopen or replace 5.0.1.

## Cross-Application Intelligence decision record

On 2026-11-25 the user approved **A / A / A / A / A**:
1. One canonical academic data layer with domain-owned models and workspace projections.
2. Event-driven internal propagation, provider-supported webhooks/polling, manual refresh, and visible freshness/error states.
3. Explicit field-level authority and provenance; Canvas owns official institution records and NORTHSTAR owns personal workflow data.
4. Preserve competing versions and require user review where safe deterministic resolution is unavailable.
5. Offline cached reads and queued permitted local edits with idempotent reconciliation and visible recovery/conflict status.

Supporting specifications are indexed above. Requirements NS-CAI-001 through NS-CAI-010 remain planned. The subsequent Data Architecture Planning checkpoint was approved **A / A / A / A / A** on 2026-11-25: comprehensive field-level model; comprehensive Canvas capability matrix; explicit data-class cache/retention/backup/restore policy; full legacy capability/data mapping; and complete verification blueprint. New supporting specifications and traceability requirements have been added. The workstream is still not signed off: dated provider endpoint evidence, exact retention parameters, complete source-level legacy inventory/mapping, final risk review and acceptance review remain.

## Data Architecture Planning checkpoint — 2026-11-25

The user approved **A / A / A / A / A**:
1. Comprehensive field-level canonical model with entities, fields, relationships, ownership, provenance and lifecycle.
2. Comprehensive Canvas capability matrix covering records, operations, fields, limitations, permissions and verification.
3. Explicit data-class policies for cache eligibility, freshness, quotas, retention, eviction protection, backup, restore and disconnect.
4. Full legacy capability/data mapping covering workflows, records, persistence, integrations, dependencies, preservation and replacement criteria.
5. Complete verification blueprint covering dependencies, acceptance criteria, tests, failure cases, recovery and evidence.

Supporting planning documents:
- [Canonical Academic Data Model](CANONICAL-ACADEMIC-DATA-MODEL.md)
- [Canvas Capability and Authority Matrix](CANVAS-CAPABILITY-AND-AUTHORITY-MATRIX.md)
- [Offline Cache, Retention, Backup and Recovery Policy](OFFLINE-CACHE-RETENTION-AND-RECOVERY-POLICY.md)
- [Legacy Capability and Data Migration Map](LEGACY-CAPABILITY-AND-DATA-MIGRATION-MAP.md)
- [Data Architecture Verification Blueprint](DATA-ARCHITECTURE-VERIFICATION-BLUEPRINT.md)

These are planning specifications. Canvas endpoint support is not yet verified in the target tenant; quantitative retention/cache parameters and actual legacy source mapping remain open. No application code or tests were changed or run.

## Integrated architecture planning checkpoint — 2026-11-25

The user approved **C / B / A / A / A**:
1. **C — Integrated specification structure:** one master architecture specification plus five detailed supporting specifications.
2. **B — Conventional technical decisions:** select the most conventional, maintainable technical approach for unresolved engineering choices.
3. **A — Full legacy mapping:** map every discovered feature, data source, dependency, workflow and replacement requirement.
4. **A — Complete planning sign-off evidence:** require all specifications, traceability, risks, open-decision review and acceptance criteria.
5. **A — Continue planning only:** after this workstream, continue cross-system planning and integration readiness; do not begin application coding.

The integrated master specification is [INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md](INTEGRATED-CROSS-APPLICATION-DATA-ARCHITECTURE.md). It recommends conventional defaults for the React/TypeScript/Vite PWA, local persistence, routing, state, validation, testing and secure provider boundaries. These are planning recommendations, not installed dependencies or implementation authorization.

The five detailed specifications are linked above. Their planning content is drafted, but source-level legacy inventory, dated Canvas endpoint research, measured retention/cache parameters, final security review and evidence-based acceptance remain open. Cross-Application Intelligence remains in planning review and is not signed off.

## Version semantics

`5.0.0` is the project/setup baseline. It is not a claim of a completed application migration, production build, Canvas verification, or public release.

## Change control and authorization boundary

The current authorization covers setup completion and engineering-foundation **planning**. It does not authorize writing or replacing application code, schema migrations, dependency installation, deleting legacy source, changing production, deploying, or claiming runtime qualification. Those actions require separate explicit authorization.
