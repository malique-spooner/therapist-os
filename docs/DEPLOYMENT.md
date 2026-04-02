# Deployment

## Baseline

- Ubuntu 24.04
- Docker + Docker Compose
- Reverse proxy via nginx
- PostgreSQL in Docker volume

## Pre-deploy checklist

- `.env` present with strong `API_SECRET_KEY`
- PostgreSQL credentials set
- API provider keys configured as needed
- `docker compose run --rm backend-tests`
- `npm test`
- `npm run build`

## Deploy

```bash
docker compose up --build -d
```

## Post-deploy checks

- `curl http://127.0.0.1:8000/healthz`
- `curl http://127.0.0.1:8000/readyz`
- inspect container logs for startup warnings
