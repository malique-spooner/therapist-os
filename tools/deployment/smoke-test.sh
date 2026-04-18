#!/usr/bin/env bash
set -euo pipefail

check() {
  local path="$1"
  docker compose exec -T nginx sh -lc "wget -qO- --no-check-certificate https://127.0.0.1${path}" >/dev/null
}

check /healthz
check /readyz
check /

echo "Smoke test passed"
