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
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` set for the single-user login
- PostgreSQL credentials set
- `FRONTEND_URL` set to the live app URL
- `TRUSTED_HOSTS` includes the live domain
- required source credentials configured
- `docker compose run --rm backend-tests`
- `npm test`
- `npm run build`
- `bash tools/deployment/smoke-test.sh`

Recommended live values:

```env
ENVIRONMENT=production
FRONTEND_URL=https://app.example.com
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_API_KEY=
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=replace-with-a-strong-password
ADMIN_NAME=Malique
TRUSTED_HOSTS=app.example.com,www.app.example.com,localhost,127.0.0.1
SEED_DEMO_DATA=false
```

Notes:

- Leave `NEXT_PUBLIC_API_URL` empty if nginx will serve both the app and API on the same domain.
- Leave `NEXT_PUBLIC_API_KEY` empty in production so the browser uses the secure auth cookie instead of a public API key.
- The API boot path will create or update the single admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
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

Recommended one-step deploy:

```bash
bash tools/deployment/deploy.sh
```

Or via npm:

```bash
npm run deploy:vps
```

If you prefer the raw compose flow, make sure you restart nginx after the rebuild:

```bash
docker compose up --build -d
docker compose restart nginx
```

If you are on the VPS and want to avoid local-only overrides explicitly:

```bash
docker compose -f docker-compose.yml up --build -d
docker compose restart nginx
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
docker compose logs backend --tail=100
docker compose logs frontend --tail=100
docker compose logs scheduler --tail=100
docker compose logs nginx --tail=100
curl -I http://127.0.0.1/
curl http://127.0.0.1/healthz
curl http://127.0.0.1/readyz
bash tools/deployment/smoke-test.sh
```

## Current Public Routing

The nginx config now routes:

- `/` to the Next.js frontend container
- `/api/` to the FastAPI container
- `/api/ai/message/stream` to the FastAPI container with buffering disabled for streamed therapist responses
- `/healthz` and `/readyz` to the FastAPI health endpoints

## HTTPS

This repo now has the live app routing in place, but certificate issuance is still an operational step you need to complete on the VPS.

The included nginx config is now set up for a Let's Encrypt webroot flow:

1. ensure DNS for `maliquespooner.com` and `app.maliquespooner.com` points at the VPS
2. pull the latest repo on the VPS
3. create the certbot directories if needed:

```bash
mkdir -p deployment/certbot/www deployment/certbot/conf
```

4. stop nginx if it is already running without TLS:

```bash
docker compose stop nginx
```

5. issue the certificate from the VPS host:

```bash
apt install -y certbot
certbot certonly --standalone -d maliquespooner.com -d app.maliquespooner.com
```

6. copy the generated certificates into the mounted compose path:

```bash
mkdir -p /root/therapist-os/deployment/certbot/conf
cp -R /etc/letsencrypt/* /root/therapist-os/deployment/certbot/conf/
```

7. start the stack again:

```bash
docker compose up -d nginx
```

8. verify:

```bash
curl -I https://app.maliquespooner.com
curl -I https://maliquespooner.com
```

Notes:

- The nginx config expects certificate files under `deployment/certbot/conf/live/maliquespooner.com/`.
- If you reissue or renew certificates on the host, copy the updated `/etc/letsencrypt` contents back into `deployment/certbot/conf/` before restarting nginx.

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
