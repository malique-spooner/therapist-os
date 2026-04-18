# Project Structure

## Top Level

- `src`
  frontend app
- `backend`
  FastAPI app and backend services
- `tests`
  frontend and backend tests
- `docs`
  repo documentation
- `infra`
  nginx and deployment-related infra files
- `scripts`
  operational helper scripts

## Frontend Structure

- `frontend/app`
  Next.js entry and global styling
- `frontend/components`
  product components by feature
- `frontend/store`
  client state
- `frontend/lib`
  frontend utilities, API client, brain blueprint
- `frontend/hooks`
  reusable hooks
- `frontend/data`
  seeded or helper data still used by some surfaces

## Backend Structure

- `backend/models`
  SQLAlchemy models
- `backend/schemas`
  Pydantic schemas
- `backend/routers`
  FastAPI endpoints
- `backend/services`
  backend logic, ingestion, summaries, AI helpers
- `backend/migrations`
  migrations
- `backend/middleware`
  auth and request context
- `backend/core`
  logging and shared backend internals

## Feature Areas

Frontend feature folders include:
- `brain`
- `dashboard`
- `therapist`
- `habits`
- `health`
- `relationships`
- `finance`
- `consumption`
- `location`
- `settings`
- `checkin`

## Important Cross-Cutting Files

- `frontend/components/AppShell.tsx`
  main product shell and navigation
- `frontend/lib/api.ts`
  frontend API client
- `backend/main.py`
  backend app registration
- `docker-compose.yml`
  local and deployment service orchestration

## Notes

- The repo contains some legacy or transitional files from earlier phases.
- The current product direction is best understood through the Brain page, Settings page, AppShell, and the API-backed domain screens.
