# Frontend

The frontend is a React 19 + TypeScript + Vite app for the Dedicate workout tracker. It talks to the API gateway and contains the dashboard, workout flows, progress views, onboarding, and account settings UI.

## Local Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

By default the dev server uses the same-origin `/api/` proxy so browser requests match the production ingress shape.
Set `VITE_API_URL=http://localhost:8080` if you want the app to talk to the local gateway stack from `ops/local/` directly instead.

## Common Commands

```bash
npm run build
npm run test:unit
npm run test:coverage
npm run test:e2e
npm run test:e2e:smoke
```

## Key Folders

- `src/pages/` for route-level screens.
- `src/components/` for reusable UI and feature components.
- `src/hooks/` for app state, data loading, and feature hooks.
- `src/types/` for shared frontend types.
- `tests/` for unit, shared, and Playwright coverage.

For full-stack setup and compose workflows, go back to the repo root and `ops/README.md`.
