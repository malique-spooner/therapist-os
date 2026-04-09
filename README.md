# Therapist OS

Therapist OS is a mobile-first personal intelligence app that brings together life data, pattern detection, and a private AI therapist.

The project now has:
- a Next.js 14 frontend PWA
- a FastAPI backend with PostgreSQL and Alembic
- Docker-based local and deployment workflows
- a Dockerized production frontend path for VPS deployment
- backend ingestion and sync paths for multiple life domains
- a Brain system UI that maps how insights are meant to be generated over time

## What The App Does

Therapist OS tracks and connects:
- physical health
- nutrition
- relationships
- finance
- media consumption
- location
- daily check-ins
- habits
- therapist conversations

The long-term goal is not just logging. It is helping a single person notice patterns, understand what helps, and build a private, evolving intelligence layer around their real life.

## Current Product Direction

The app is now moving toward a privacy-first architecture:
- the VPS remains the always-on source of truth for app data and APIs
- the Mac is intended to run `Qwen 3.5 35B` through Ollama for local inference, plus local Whisper transcription and optional local TTS
- the phone app always talks to the VPS
- the VPS talks to the Mac when private local AI work is needed

That direction is reflected in the frontend already, especially in the Brain page and the updated Settings screen.

## Main Surfaces

- Dashboard
- Brain
- AI Therapist
- Habits
- Health
- Nutrition
- Relationships
- Finance
- Consumption
- Location
- Settings

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript |
| Styling | Tailwind CSS, CSS variables |
| State | Zustand |
| Animation | Framer Motion |
| Charts | Recharts |
| PWA | next-pwa |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Background jobs | APScheduler |
| Local/private voice | Whisper.cpp pathway |
| Deployment | Docker Compose + nginx |

## Quick Start

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Create env

```bash
cp .env.example .env
```

Important local values:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=dev-secret-key
DATA_SOURCE_ENCRYPTION_KEY=replace-this-with-a-long-random-secret
OLLAMA_BASE_URL=http://host.docker.internal:11434
LOCAL_QWEN_MODEL=qwen3.5:35b
```

### Local AI

`local-qwen` now expects a real Ollama server, not just a placeholder provider.

Recommended local setup on your Mac:

```bash
ollama pull qwen3.5:35b
```

Then keep Ollama running locally. The Dockerized backend reaches it through:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

### 3. Start backend services

```bash
docker compose up --build
```

API health:

- [http://localhost:8000/healthz](http://localhost:8000/healthz)
- [http://localhost:8000/readyz](http://localhost:8000/readyz)

### 4. Start frontend

```bash
npm run dev
```

Frontend:

- [http://localhost:3000](http://localhost:3000)

If port `3000` is already in use, Next may move to another port such as `3001`.

### VPS / live deployment shape

The production compose stack now expects:

- `frontend` for the Next.js app
- `api` for FastAPI
- `scheduler` for background jobs
- `postgres` for storage
- `nginx` as the public entry point

Public traffic should hit nginx on your domain, with:

- `/` -> frontend
- `/api/*` -> backend API
- `/healthz` and `/readyz` -> backend health checks

## Testing

Frontend:

```bash
npm test
```

Backend:

```bash
docker compose run --rm backend-tests
```

Production build:

```bash
npm run build
```

## Docs

High-level docs:

- [docs/FRONTEND.md](docs/FRONTEND.md)
- [docs/BACKEND.md](docs/BACKEND.md)
- [docs/BRAIN.md](docs/BRAIN.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/TESTING.md](docs/TESTING.md)
- [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [docs/PRIVACY.md](docs/PRIVACY.md)

Module-specific docs:

- [backend/README.md](backend/README.md)

## Current Status

Working today:
- backend app scaffold and migrations
- Dockerized backend + Postgres
- API-backed frontend wiring for the restored domain pages
- Brain page and updated Settings page
- local/private product direction reflected in the UI
- frontend tests, backend Docker tests, and production build all green

Still to be completed or fully verified:
- live account verification for external providers
- live local-Mac inference path from the therapist end to the actual Ollama runtime
- full Brain v3 implementation behind the frontend blueprint
- VPS deployment verification against real infrastructure

## Professional Workflow

Recommended flow:
- develop locally in git
- run frontend locally and backend through Docker Compose
- keep secrets in local `.env`, not in git
- push changes to GitHub
- deploy the VPS by pulling from GitHub and running the production compose stack there

This repo now separates those concerns better:
- `docker-compose.yml` is the safer base for VPS/runtime use
- `docker-compose.override.yml` keeps local source mounts for development

## Notes

- This repo contains both the product app and the backend infrastructure work for Phase 2.
- The Brain page is currently a frontend blueprint for the intended intelligence system. It does not yet mean every listed detector or model is implemented.
- Some legacy files still exist in the tree from earlier iterations; the current product direction is reflected best in the main app shell, Brain page, Therapist, Settings, and the API-backed domain pages.

## License

MIT — see [LICENSE](LICENSE).
