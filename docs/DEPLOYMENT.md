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
