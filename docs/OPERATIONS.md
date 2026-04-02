# Operations

## Health checks

- API liveness: `GET /healthz`
- API readiness: `GET /readyz`

## Frontend tests

```bash
npm test
```

## Backend tests

```bash
docker compose run --rm backend-tests
```

## Backups

```bash
./scripts/backup_postgres.sh
```

## Restore

```bash
./scripts/restore_postgres.sh ./backups/<file>.sql
```

Run restores only against a stopped or disposable environment first.
