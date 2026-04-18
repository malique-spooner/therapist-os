#!/bin/sh
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-therapistos}" -d "${POSTGRES_DB:-therapistos}" > "$OUT_DIR/therapistos-$STAMP.sql"
echo "Backup written to $OUT_DIR/therapistos-$STAMP.sql"
