#!/usr/bin/env bash
set -euo pipefail

cert_dir="deployment/certbot/conf/live/maliquespooner.com"
fullchain="${cert_dir}/fullchain.pem"
privkey="${cert_dir}/privkey.pem"

mkdir -p "$cert_dir"

if [[ -f "$fullchain" && -f "$privkey" ]]; then
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout "$privkey" \
  -out "$fullchain" \
  -subj "/CN=maliquespooner.com"
