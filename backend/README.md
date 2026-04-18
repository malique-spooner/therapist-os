# Backend README

## What This Backend Does

The backend powers Therapist OS with:
- persistent storage
- API endpoints for the frontend
- ingestion and sync orchestration
- therapist and Brain support services
- scheduled jobs

## Local Runtime

Preferred local workflow:

```bash
docker compose up --build
```

This starts:
- postgres
- backend
- scheduler
- nginx

## Local Bootstrap

The backend uses a migration-first flow.

Bootstrap is handled by:

- `app/bootstrap.py`

This is used by the container startup scripts and can also be run locally in a Python 3.11 environment.

## Tests

Run backend tests with Docker:

```bash
docker compose run --rm backend-tests
```

## Key Entry Files

- `app/main.py`
- `app/bootstrap.py`
- `app/scheduler.py`
- `app/config.py`
- `app/database.py`

## Important Directories

- `app/models`
- `app/schemas`
- `app/routers`
- `app/services`
- `migrations`

## AI Direction

The backend contains cloud-provider-era AI plumbing and the newer private-local direction.

The intended future state is:
- backend prepares data and context
- Mac performs private local inference
- backend stores and serves the resulting outputs
