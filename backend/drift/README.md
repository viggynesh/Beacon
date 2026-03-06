# Drift Detection Service

Periodically checks for performance regressions across prompt versions by comparing recent ClickHouse metrics against a baseline. Fires alerts to Slack and/or PagerDuty when latency or cost degrades beyond a configurable threshold.

## How It Works

Every cycle (default 5 minutes), the service queries `llm_traces` using two sliding windows per prompt version:

- **Current window**: average of the most recent 100 traces
- **Baseline window**: average of the previous 100 traces (101–200)

If either `latency_ms` or `cost_usd` increased by more than the threshold (default 20%), an alert is fired.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLICKHOUSE_DSN` | Yes | — | ClickHouse connection string |
| `SLACK_WEBHOOK_URL` | No | — | Slack incoming webhook URL |
| `PAGERDUTY_ROUTING_KEY` | No | — | PagerDuty Events API v2 routing key |
| `DRIFT_INTERVAL` | No | `5m` | Check interval (Go duration) |
| `DRIFT_THRESHOLD` | No | `0.2` | Degradation threshold (0.2 = 20%) |

## Run Locally

```bash
export CLICKHOUSE_DSN="clickhouse://beacon:beacon@localhost:9000/beacon"
go run .
```

## Docker Compose

```bash
docker compose up drift
```

The service is configured in the root `docker-compose.yml` and connects to the shared ClickHouse instance on the `beacon` network.
