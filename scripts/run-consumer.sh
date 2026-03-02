#!/usr/bin/env bash
set -euo pipefail

# Source .env from project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

export BEACON_KINESIS_STREAM="${BEACON_KINESIS_STREAM:-beacon-traces}"
export S3_BUCKET="${S3_BUCKET:-beacon-raw-traces}"

cd "$PROJECT_ROOT/backend/consumer"
exec go run ./cmd/local/
