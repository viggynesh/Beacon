#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"

# Source .env from project root if present
ENV_FILE="${SCRIPT_DIR}/../../.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
fi

CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
CLICKHOUSE_DB="${CLICKHOUSE_DB:-beacon}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-}"

echo "Running migrations against ${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/${CLICKHOUSE_DB}"

for sql_file in "${MIGRATIONS_DIR}"/*.sql; do
    [ -f "$sql_file" ] || continue
    filename="$(basename "$sql_file")"
    echo "  Applying ${filename} ..."
    curl -sf \
        "http://${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/" \
        --user "${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}" \
        --data-urlencode "database=${CLICKHOUSE_DB}" \
        --data-binary "@${sql_file}"
    echo "  Done."
done

echo "All migrations applied."
