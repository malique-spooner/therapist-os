#!/bin/sh
set -eu

python -m app.bootstrap
exec python -m app.scheduler
