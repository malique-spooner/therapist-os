# Backend

## Purpose

The backend is the operational core of Therapist OS.

It is responsible for:
- storing life data
- syncing and ingesting source systems
- exposing a stable API to the frontend
- preparing context for therapist and Brain workflows
- running scheduled work

## Main Backend Modules

- `backend/app/main.py`
  FastAPI app entrypoint
- `backend/app/database.py`
  engine, session, base wiring
- `backend/app/config.py`
  environment and settings
- `backend/app/bootstrap.py`
  migration/bootstrap flow
- `backend/app/scheduler.py`
  APScheduler entrypoint

## Backend Structure

- `backend/app/models`
  ORM models
- `backend/app/schemas`
  API schemas
- `backend/app/routers`
  FastAPI endpoints
- `backend/app/services`
  business logic, ingestion, AI support, summaries
- `backend/migrations`
  migrations
- `backend/app/middleware`
  auth and request context middleware
- `backend/app/core`
  logging and shared backend internals

## Key Router Areas

- `dashboard`
- `health`
- `nutrition`
- `relationships`
- `finance`
- `consumption`
- `location`
- `checkins`
- `habits`
- `ai`
- `profile`
- `data_sources`
- `weather`

## Infrastructure Model

The repo is set up for:
- PostgreSQL in Docker
- FastAPI API container
- scheduler container
- nginx reverse proxy

The backend test path also runs in Docker so it matches the intended runtime.

## Current AI Direction

The backend already contains:
- provider modules for cloud AI providers
- context building logic
- live session plumbing
- Whisper transcription support

But the product direction is now moving toward:
- VPS for storage and API
- Mac for private local inference
- Brain and therapist generation offloaded to the Mac when available

That shift is already reflected in frontend language, but the backend still contains earlier cloud-oriented plumbing too.

## Important Operational Files

- `docker-compose.yml`
- `backend/Dockerfile`
- `backend/start-api.sh`
- `backend/start-scheduler.sh`
- `backend/start-test.sh`
- `deployment/nginx/default.conf`

## Current Priorities

- preserve stable API response shapes for the frontend
- keep Docker-based testability strong
- keep ingestion and sync routes resilient
- prepare for local private inference orchestration with the Mac
