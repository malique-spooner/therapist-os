#!/usr/bin/env bash
set -euo pipefail

# Rebuild the stack, then restart nginx so it re-resolves the fresh backend/frontend containers.
docker compose up -d --build --remove-orphans
docker compose restart nginx
bash tools/deployment/smoke-test.sh
