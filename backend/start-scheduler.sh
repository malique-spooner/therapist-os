#!/bin/sh
set -eu

python -m backend.bootstrap
exec python -m backend.scheduler
