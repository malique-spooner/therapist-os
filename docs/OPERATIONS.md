# Operations

## Health Checks

- API liveness: `GET /healthz`
- API readiness: `GET /readyz`

## Standard Local Verification

```bash
npm test
docker compose run --rm backend-tests
npm run build
```

## Logs

The backend uses structured logging.

Operational guidance:
- check API container logs after startup
- check scheduler logs after startup
- watch for migration warnings, missing env warnings, or failed source syncs

## Backups

```bash
./scripts/backup_postgres.sh
```

## Restore

```bash
./scripts/restore_postgres.sh ./backups/<file>.sql
```

Run restores only against a stopped or disposable environment first.

## Expected Ongoing Tasks

- confirm external data source health
- confirm frontend still matches backend contracts
- confirm Brain-facing UI still matches product direction
- verify local inference architecture once Mac integration is connected

## Local AI Checks

When using local inference:

- confirm Ollama is running on the Mac host
- confirm `OLLAMA_BASE_URL` points to the right runtime
- confirm the configured model exists locally
- confirm therapist responses are coming from `local-qwen` rather than the deterministic fallback
