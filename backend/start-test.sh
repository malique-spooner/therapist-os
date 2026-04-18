#!/bin/sh
set -eu

python -m pytest tests/api "$@"
