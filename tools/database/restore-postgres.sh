#!/bin/sh
set -eu

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: ./scripts/restore_postgres.sh <backup.sql>"
  exit 1
fi

cat "$FILE" | docker compose exec -T postgres psql -U "${POSTGRES_USER:-therapistos}" -d "${POSTGRES_DB:-therapistos}"
echo "Restore completed from $FILE"
