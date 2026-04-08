# Deployment

## Baseline

Current deployment target:
- Ubuntu 24.04
- Docker + Docker Compose
- nginx reverse proxy
- PostgreSQL in Docker volume

Long-term intended production shape:
- VPS for the app, API, database, and sync jobs
- Mac for private local inference

## Recommended Professional Flow

Use this project in two environments:

1. Local development
- work in git locally
- keep secrets in local `.env`
- use Docker Compose for backend infrastructure
- use the automatic `docker-compose.override.yml` only on your dev machine

2. VPS deployment
- clone or pull from GitHub onto the VPS
- use the base `docker-compose.yml`
- do not bind-mount source code into the running API in production
- keep a VPS-only `.env`

That gives you the normal safe workflow:
- develop locally
- commit and push to GitHub
- pull and deploy on the VPS

## Pre-deploy Checklist

- `.env` present with strong `API_SECRET_KEY`
- PostgreSQL credentials set
- required source credentials configured
- `docker compose run --rm backend-tests`
- `npm test`
- `npm run build`

## Deploy

```bash
docker compose up --build -d
```

If you are on the VPS and want to avoid local-only overrides explicitly:

```bash
docker compose -f docker-compose.yml up --build -d
```

## Post-deploy Checks

- `curl http://127.0.0.1:8000/healthz`
- `curl http://127.0.0.1:8000/readyz`
- inspect container logs
- confirm frontend can reach backend
- confirm scheduler started
- confirm migrations applied

## Future Privacy-First Deployment Model

Planned architecture:
- phone app -> VPS
- VPS -> Mac over private network
- Mac handles private Brain and therapist inference when available

This is not fully wired yet, but it is now the intended direction of the product.

## Local AI Runtime

The current local AI target is:
- Ollama on the Mac host
- model: `qwen3.5:35b`

Local Dockerized backend access:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
LOCAL_QWEN_MODEL=qwen3.5:35b
```

For VPS deployment later, keep the same app code and change only the runtime endpoint:
- point `OLLAMA_BASE_URL` at your private Mac inference bridge when that piece is ready
