# NORTHSTAR 5.0.0 — Implementation Readiness and Transition Plan

**Status:** Consolidated planning proposal — ready for user review  
**Purpose:** Finish the minimum planning needed to begin the 5.0 application transition without carrying an endless planning process into development.  
**Authorization:** Planning only. This document does not authorize application implementation.

## 1. Direction

NORTHSTAR 5.0.0 has an approved product and architecture baseline, approved workspace plans for 5.0.1–5.0.6, and substantial engineering/data specifications. The remaining work should be treated as a short readiness pass, not a new series of planning modules.

The project should move into implementation as soon as the small set of safeguards below is accepted. Not every integration, edge case, retention number, or release detail must be settled before the first application shell exists.

## 2. Decisions already carried forward

Do not reopen these without material new evidence:

- Personal, single-user academic operating system; iPad Pro is the primary target.
- React + TypeScript + Vite, delivered as an iPad-first PWA.
- Dedicated 5.0 development branch and an isolated application directory; preserve legacy source and production history.
- One authoritative design system and canonical academic data layer; domain-owned records feed workspace projections.
- Canvas/provider access through adapters and a secure server-side boundary; no privileged secrets in the browser.
- Provider facts and personal workflow data remain distinct, with provenance and field-level authority.
- Preserve conflicting versions; no silent overwrites or unsafe automatic retries.
- Local-first reads and protected user-authored work; offline actions are queued only when safe and revalidated before replay.
- Demo AI/provider behavior must be clearly identified as simulated until a real service is deliberately integrated.
- No legacy deletion until replacement, parity, backup and rollback evidence exists.
- Comprehensive, varied planning modules; no repetitive questionnaires or redundant sign-offs.

Authoritative details remain in the approved product/workspace decisions, Integrated Cross-Application Data Architecture, Modules 1 and 2, and the supporting data, Canvas, offline, migration and verification specifications.

## 3. Minimum gates before the first application implementation

These are the only items that should block the initial application foundation.

### Gate A — Protect and identify the migration source

- **Source identity confirmed:** the repository branch `northstar-4.4.8.3.1-stabilization` currently resolves to the audited commit `df0427304e0f03aa822a1c8fe99547355e9c0bfc`. The 5.0 setup branch was based on this audited commit. Keep this exact commit as the migration reference; do not substitute the separate default-branch snapshot used for the initial partial source review.
- Before importing or transforming user data, establish and verify a recoverable backup/archive and record its provenance. The branch/commit reference is source identity, not a substitute for a data backup.
- Keep all legacy runtime files untouched while the new app is introduced.

**Boundary:** A complete file-by-file migration map is required before migrating or retiring legacy capabilities, but it does not need to block building a separate empty application shell.

### Gate B — Fix the application boundary

- Use a dedicated application directory, with `apps/web/` as the recommended default for the React/Vite client.
- Keep `docs/5.0.0/`, existing legacy runtime files, Worker/native assets and the new app source clearly separated.
- Static configuration review found no Vite configuration, Vite build script or lockfile in the setup branch's current legacy root. The existing root `package.json` contains legacy test scripts/dependencies; `wrangler.jsonc` targets the Canvas Worker, not a Vite frontend.
- The existing GitHub Pages workflow assembles the legacy site by copying root `index.html`, `manifest.json`, `styles/` and `scripts/`, and publishes a preview from the stabilization branch. A new `apps/web/` Vite app will therefore require an intentional Pages workflow adaptation to build and publish its `dist/` output. Do not let the legacy copy/deploy workflow accidentally publish the wrong application.
- Keep the Canvas Worker deployment separate. Confirm the Vite base path and Pages build/output settings before preview deployment; do not change production deployment during the initial local foundation step.

### Gate C — Agree the first implementation slice

The first slice should prove the foundation, not attempt the entire product at once:

1. Reproducible React/TypeScript/Vite application shell and route structure.
2. NORTHSTAR visual foundation: Midnight theme, typography, surfaces, responsive layout, motion primitives and accessible interaction states.
3. Primary navigation and empty/loading/error states for the agreed workspaces.
4. Typed domain/service boundaries and synthetic demo fixtures; no real Canvas or AI credentials.
5. A small smoke-test baseline and documented local run/build commands.

This creates a working product foundation early and gives later planning real implementation evidence to respond to.

## 4. Recommended implementation sequence

| Sequence | Build focus | Exit evidence |
|---|---|---|
| 0. Foundation | App shell, toolchain, routing, design tokens/components, responsive iPad layout, basic CI checks | Reproducible local start/build; shell navigation and accessibility smoke checks |
| 1. Academic core | Canonical types, demo data, persistence boundary, Courses, Assignments, Calendar and Gradebook projections | Cross-workspace updates remain consistent; refresh/reopen preserves permitted local work |
| 2. Learning workflows | Resources, document/PDF workflows, Study Lab, Review Center and assignment execution | Core study/document journeys and recovery behavior work with demo data |
| 3. Intelligence | AI Workspace demo, priority logic, provenance/freshness UI, event propagation and conflict review | Simulated behavior is clearly labeled; domain events update dependent views predictably |
| 4. Provider integration | Canvas capability implementation, secure BFF, auth, sync and provider writes | Each operation is backed by current official API evidence and tenant-specific verification; secrets remain server-side |
| 5. Qualification and release | Regression, accessibility, security, performance, offline, physical iPad and release/rollback checks | Evidence is tied to an exact commit, environment, device/browser and requirement |

This sequence is intentionally incremental. Work can proceed in parallel only when boundaries are stable and dependencies are clear.

## 5. What does not block the first slice

The following remain important, but can be completed when the relevant implementation reaches them:

- Exhaustive source-by-source legacy dependency and consumer mapping — required before porting/removing the affected legacy capability.
- Full localStorage/sessionStorage and IndexedDB lifecycle trace — required before data migration or replacement of those stores.
- Complete Canvas route/endpoint and permission matrix — required before implementing each real provider operation; not needed for mock/demo adapters.
- Numeric cache, freshness and retention limits — required before final offline retention behavior; derive from device measurements and data sensitivity, not guesses.
- Final hosting/database topology — defer until the BFF, cross-device recovery and operational needs are evidenced.
- Full CI branch protection and production release configuration — required before shared preview/release operation, not before local foundation work.
- Physical iPad acceptance — required before declaring iPad qualification, not before creating the first responsive shell.

No unresolved item may be silently treated as complete. It is simply assigned to the stage where evidence can be gathered efficiently.

## 6. Non-negotiable safeguards during implementation

- No production branch or production deployment changes without separate approval.
- No destructive migration, legacy deletion or data-format replacement without verified backup, restore and rollback.
- No privileged Canvas credentials or AI provider secrets in browser code, Vite-exposed variables, fixtures or commits.
- No claims of live Canvas/AI connectivity when the feature is simulated or unverified.
- No blind retries for consequential writes or ambiguous submissions.
- No silent data conflict resolution or loss of unsynced user-authored work.
- No release claim based only on the existence of tests; record actual results and environment.
- Preserve approved requirements and record material deviations in concise ADRs.

## 7. Remaining readiness checklist

| Item | Current assessment | Required timing |
|---|---|---|
| Product/workspace scope | Approved planning baseline | Carry forward |
| Core architecture and data ownership | Approved planning specifications | Carry forward |
| Engineering standards and qualification approach | Approved policy direction; detailed settings remain | Before relevant toolchain/CI work |
| Exact migration-source branch/commit | **Confirmed:** stabilization branch currently points to audited commit `df0427304e0f03aa822a1c8fe99547355e9c0bfc` | Preserve as immutable migration reference |
| Recoverable source/data backup plan | Policy defined; source-specific evidence pending | Before data migration |
| Application directory | Isolated directory approved; `apps/web/` recommended here | Confirm before first implementation |
| Vite/Cloudflare path and output compatibility | Static review: legacy Pages workflow copies root assets; Worker config is separate; Vite build/output adaptation required | Before preview deployment |
| Complete legacy inventory | Partial static evidence only | Before porting/retiring each affected capability |
| Official Canvas endpoint evidence and tenant verification | Pending | Before real Canvas operation |
| Measured offline/retention parameters | Pending | Before final offline policy implementation |
| Production release controls | Policy planned; live settings unverified | Before production release |

## 8. Transition decision

The planning objective is to make the initial implementation safe and unambiguous—not to finish every future engineering decision in advance.

The migration-source identity is now confirmed. Once the user confirms the recommended `apps/web/` boundary, the first implementation slice is sufficiently defined to request explicit authorization. The Pages workflow adaptation can be planned as part of the initial foundation, but production publishing must remain untouched. That authorization should be a short, separate decision covering the app shell/toolchain scope only; it should not imply approval for Canvas integration, data migration, legacy deletion, production deployment or the full release.

## 9. Planning-process rule

Planning should be proportional to risk and should accelerate delivery. Use one consolidated review when a coherent set of decisions is ready. Ask for user input only where a real product choice or risk trade-off cannot be resolved through approved decisions, conventional defaults or evidence. Carry settled decisions forward and keep free-text additions available. Do not create new modules or sign-off cycles solely to document additional detail.
