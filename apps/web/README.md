# NORTHSTAR Web Application

The NORTHSTAR 5.0 client lives in `apps/web/`, isolated from the legacy root application and Canvas Worker.

## Foundation
- React + TypeScript + Vite
- Strict TypeScript configuration
- React Router workspace navigation
- Midnight visual foundation and responsive application shell
- Illustrative dashboard data only; no real academic account data
- Canvas and AI providers are not connected

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
npm run build
npm run preview
```

The first dependency installation should generate and commit `package-lock.json` before shared or automated use.

## Boundaries
- Do not import legacy runtime scripts directly.
- Never place Canvas credentials or AI provider secrets in client code.
- Keep provider calls behind typed service interfaces and a future secure server-side boundary.
- Do not treat illustrative dashboard values as real academic records.
- Do not change root production publishing or the Canvas Worker as part of this app foundation.
