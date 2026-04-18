# Testing

## Philosophy

The repo uses a mixed testing strategy:
- frontend tests locally with Vitest
- backend tests in Docker with Python 3.11
- production build checks for the Next.js app

This avoids relying on the host Python version for the backend stack.

## Frontend Tests

Run:

```bash
npm test
```

Current frontend tests cover things like:
- API client behavior
- settings screen behavior
- therapist page behavior
- habits page rendering behavior
- message and budget UI behavior

Frontend tests live in:

- `frontend/tests/unit`

## Backend Tests

Run:

```bash
docker compose run --rm backend-tests
```

Backend tests live in:

- `backend/tests/api`

They cover:
- router behavior
- health/readiness
- profile services
- notifications
- operational safety checks

## Production Build

Run:

```bash
npm run build
```

This catches:
- type issues
- import problems
- Next.js compile issues
- static generation regressions

## Browser Screenshot QA

The repo also supports Playwright-based screenshot regression checks for the main app pages in both:
- `real-only`
- `demo-only`

Install the browser tooling once:

```bash
npm install
npx playwright install chromium
```

Start the backend first:

```bash
docker compose up -d --build
```

Start the frontend in another terminal:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Then run the visual suite:

```bash
npm run test:e2e
```

To accept intentional visual changes:

```bash
npm run test:e2e:update
```

Notes:
- the Playwright config expects a running app and points at `http://127.0.0.1:3001` by default
- if you want to target a different running frontend, set `PLAYWRIGHT_BASE_URL`
- the backend should already be available on `127.0.0.1:8000`
- the suite stubs daily check-in API calls so screenshot runs are not blocked by the modal
- snapshots are stored under `frontend/tests/e2e/*-snapshots`
- runtime artifacts go to `playwright-report` and `test-results`, which are gitignored

## Recommended Release Check

Before pushing or deploying:

```bash
npm test
docker compose run --rm backend-tests
npm run build
npm run test:e2e
```

## Notes

- `public/sw.js` is regenerated during PWA builds.
- If the backend test environment is not available locally, use Docker rather than the host Python.
