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

## Version semantics

`5.0.0` is the project/setup baseline. It is not a claim of a completed application migration, production build, Canvas verification, or public release.

## Change control

This baseline is version-controlled. Changes to scope, architecture, source-retirement decisions, or acceptance criteria must be recorded in the decision/traceability documents and approved before implementation when they materially change the approved NORTHSTAR 5.0 plan.
