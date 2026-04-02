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

- `tests/frontend`

## Backend Tests

Run:

```bash
docker compose run --rm backend-tests
```

Backend tests live in:

- `tests/backend`

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

## Recommended Release Check

Before pushing or deploying:

```bash
npm test
docker compose run --rm backend-tests
npm run build
```

## Notes

- `public/sw.js` is regenerated during PWA builds.
- If the backend test environment is not available locally, use Docker rather than the host Python.
