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

## Phase tracker

| Phase | Name | Status |
|---|---|---|
| 5.0.0 | Product & Architecture Foundation | Planning approved |
| 5.0.1 | Academic Data & Canvas Intelligence | Planning approved |
| 5.0.2 | Assignment & Coursework Experience | Planning decisions complete |
| 5.0.3 | Courses, Calendar & Resources | Planning decisions complete |
| 5.0.4 | Dashboard Studio & Personalization | Approved |
| 5.0.5 | AI & Intelligent Academic Assistance | Approved |
| 5.0.6 | Visual Refinement, Qualification & Release | Approved |
| Phase 0 | Setup & Repository Readiness | **Closed — user-approved 2026-11-25** |
| Next stage | Engineering Foundation planning | **Planning authorized; implementation not authorized** |

## Phase 0 approval record

The user submitted the recurring five-question sign-off module with answers **1:A, 2:A, 3:A, 4:A, 5:A** on 2026-11-25.

1. **Source baseline — A:** Approve the dedicated 5.0.0 setup branch from the latest audited development source; production remains untouched.
2. **Setup deliverables — A:** Accept the version marker, audit, architecture roadmap, requirements register, retirement register, and sign-off documentation.
3. **Legacy bloat — A:** Preserve existing behavior until dependencies are mapped and replacements pass regression; then retire or consolidate through controlled changes.
4. **Target architecture — A:** Approve React + TypeScript + Vite, an iPad-first PWA, shared academic data, domain-separated workspaces, adapters, and one authoritative design system.
5. **Phase closure — A:** Accept Phase 0 as complete and prepare the engineering-foundation stage. This does not authorize application implementation.

**Decision:** Phase 0 is formally closed. Its closure certifies completion and acceptance of the setup artifacts only; it does not certify a working 5.0 application, build, test suite, Canvas connection, iPad acceptance, or production release.

## Version semantics

`5.0.0` is the project/setup baseline. It is not a claim of a completed application migration, production build, Canvas verification, or public release.

## Change control and authorization boundary

This baseline is version-controlled. Changes to scope, architecture, source-retirement decisions, or acceptance criteria must be recorded in the decision/traceability documents and approved before implementation when they materially change the approved NORTHSTAR 5.0 plan.

The current authorization covers setup completion and engineering-foundation **planning**. It does not authorize writing or replacing application code, deleting legacy source, changing production, deploying, or claiming runtime qualification. Those actions require a separate explicit authorization.
