# Deployment

## Baseline

Current deployment target:
- Ubuntu 24.04
- Docker + Docker Compose
- nginx reverse proxy
- PostgreSQL in Docker volume
- Next.js frontend container
- FastAPI API container
- scheduler container

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
- `FRONTEND_URL` set to the live app URL
- `TRUSTED_HOSTS` includes the live domain
- required source credentials configured
- `docker compose run --rm backend-tests`
- `npm test`
- `npm run build`

Recommended live values:

```env
ENVIRONMENT=production
FRONTEND_URL=https://app.example.com
NEXT_PUBLIC_API_URL=
TRUSTED_HOSTS=app.example.com,www.app.example.com,localhost,127.0.0.1
SEED_DEMO_DATA=false
```

Notes:

- Leave `NEXT_PUBLIC_API_URL` empty if nginx will serve both the app and API on the same domain.
- Keep `NEXT_PUBLIC_API_KEY` aligned with the backend only if this remains a single-user private deployment.
- For VPS deployment, `OLLAMA_BASE_URL` should point at the Mac inference bridge once that exists rather than `host.docker.internal`.

## DNS And Domain

1. Create an `A` record for your app domain pointing at the VPS public IP.
2. Wait for DNS to resolve publicly.
3. Set `FRONTEND_URL` and `TRUSTED_HOSTS` to that exact domain before deployment.

Example:

```env
FRONTEND_URL=https://app.example.com
TRUSTED_HOSTS=app.example.com,www.app.example.com,localhost,127.0.0.1
```

## Deploy

```bash
docker compose up --build -d
```

If you are on the VPS and want to avoid local-only overrides explicitly:

```bash
docker compose -f docker-compose.yml up --build -d
```

## Post-deploy Checks

- `curl http://127.0.0.1/healthz`
- `curl http://127.0.0.1/readyz`
- inspect container logs
- confirm nginx is serving the frontend
- confirm frontend can reach backend through `/api`
- confirm scheduler started
- confirm migrations applied

Useful checks:

```bash
docker compose ps
docker compose logs api --tail=100
docker compose logs frontend --tail=100
docker compose logs scheduler --tail=100
docker compose logs nginx --tail=100
curl -I http://127.0.0.1/
curl http://127.0.0.1/healthz
curl http://127.0.0.1/readyz
```

## Current Public Routing

The nginx config now routes:

- `/` to the Next.js frontend container
- `/api/` to the FastAPI container
- `/api/ai/message/stream` to the FastAPI container with buffering disabled for streamed therapist responses
- `/healthz` and `/readyz` to the FastAPI health endpoints

## HTTPS

This repo now has the live app routing in place, but certificate issuance is still an operational step you need to complete on the VPS.

You have two good options:

1. Terminate TLS in front of this stack using your provider or an external proxy.
2. Extend the nginx setup with Certbot once DNS is pointed correctly.

For the immediate goal of validating the live topology, get the domain resolving and the stack reachable first, then add HTTPS once the app is serving correctly end to end.

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
