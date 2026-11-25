# NORTHSTAR Web Application

The NORTHSTAR 5.0 client lives in `apps/web/`, isolated from the legacy root application and Canvas Worker.

## Implemented foundation

- React 19 + TypeScript + Vite with strict TypeScript settings.
- React Router workspace navigation and Framer Motion route transitions.
- Midnight visual foundation, responsive iPad-first shell, and reduced-motion handling.
- Canonical local academic snapshot with runtime validation, revision tracking, and browser persistence.
- Connected Overview, Assignments, Courses, Calendar, Study Lab review cards, Gradebook progress views, course-linked Resources library, and a local Writing Review workspace.
- Resource create/edit/delete, course filtering, personal notes, references, and HTTPS-only external links. Resource records share the same versioned academic snapshot and revision counter as assignments.
- Assignment create, edit, delete, search, course/status filters, priority, notes, due dates, estimates, and status workflow.
- Storage-unavailable fallback that keeps the current session usable and surfaces a warning.
- Illustrative demo records only; no Canvas, institution, or AI provider is connected.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer

## Local development

From this directory:

```bash
npm install
npm run dev
```

Check types and create a production build:

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

The initial academic repository unit tests cover snapshot validation, assignment create/update/status/delete behavior, and resource lifecycle/HTTPS validation. The development-branch GitHub Actions workflow runs typecheck, domain tests, and production build on pushes and pull requests; it does not deploy the application. A committed dependency lockfile and broader component/integration/end-to-end coverage remain qualification work.

## Data and integration boundaries

- The academic repository validates parsed browser data before use and rejects invalid records rather than trusting localStorage blindly.
- All assignment mutations increment the snapshot revision and update the shared local snapshot used by workspace projections.
- Local assignment status is a personal workflow overlay, not proof of an official submission or grade.
- Do not import legacy runtime scripts directly.
- Never place Canvas credentials or AI provider secrets in client code.
- Keep provider calls behind typed service interfaces and a future secure server-side boundary.
- Do not treat illustrative dashboard values as real academic records.
- Do not change root production publishing or the Canvas Worker as part of this app foundation.
