# Beacon

**Open-source LLM observability platform — trace every call, track cost and latency, detect regressions automatically.**

---

## Architecture

```
                                        +-------------------+
                                        |   React Dashboard |
                                        |   (port 3000)     |
                                        +---------+---------+
                                                  |
                                                  | HTTP
                                                  v
+-------------+       +----------+       +--------+--------+       +-----------------+
|  Python SDK |  -->  |  Kinesis |  -->  | Lambda Consumer |  -->  |   ClickHouse    |
|  @trace()   |       |  Stream  |       |     (Go)        |       | (analytics DB)  |
+-------------+       +----------+       +--------+--------+       +--------+--------+
                                                  |                         |
                                                  v                         v
                                         +--------+--------+       +-------+-------+
                                         |    S3 Bucket    |       | Drift Service |
                                         | (raw JSON logs) |       |  (Go, 5m poll)|
                                         +-----------------+       +-------+-------+
                                                                           |
                                                                    +------+------+
                                                                    | Slack / PD  |
                                                                    +-------------+
```

## Features

- **Python SDK** — drop-in `@trace()` decorator for OpenAI and Anthropic calls; captures tokens, latency, cost, and model automatically
- **Hallucination scoring** — built-in heuristic scorer (repetition + hedging detection) with optional auto-attach to traces
- **Real-time ingestion** — traces flow through Kinesis to a Go Lambda consumer that writes to ClickHouse and archives raw JSON to S3
- **Analytics API** — Go HTTP API with filtered trace queries, model-level stats, and a `/health` endpoint with ClickHouse status
- **Graceful degradation** — API starts in degraded mode if ClickHouse is unreachable, returns 503 with JSON errors instead of crashing
- **CloudWatch logging** — optional dual-write to CloudWatch Logs via `CLOUDWATCH_LOG_GROUP` env var
- **React dashboard** — dark-themed UI with KPI cards, cost-per-model bar chart, latency trend area chart, traces table with click-to-inspect detail panel
- **Trace waterfall** — visual breakdown of prompt processing, model inference, and response parsing phases
- **Auto-refresh** — dashboard polls for new data every 10 seconds with a live indicator
- **Drift detection** — standalone Go service queries ClickHouse every 5 minutes, compares recent vs baseline metrics, alerts on >20% regression
- **Alerting** — Slack webhook and PagerDuty Events API v2 integrations
- **Infrastructure as code** — full Terraform config for VPC, ECS Fargate, Kinesis, S3, ClickHouse EC2, ALB, and auto-scaling
- **One-command deploy** — `scripts/deploy.sh` builds, pushes to ECR, and rolls out ECS services

## Tech Stack

| Layer          | Technology                                    |
|----------------|-----------------------------------------------|
| SDK            | Python 3.10+, zero dependencies               |
| Ingestion      | AWS Kinesis, Go Lambda                         |
| Storage        | ClickHouse (analytics), S3 (raw archive)      |
| API            | Go, Chi router, clickhouse-go/v2              |
| Frontend       | React 19, TypeScript, Tailwind CSS 4, Recharts|
| Drift Detection| Go, clickhouse-go/v2                          |
| Infrastructure | Terraform, ECS Fargate, ALB, CloudWatch       |
| CI/CD          | Docker, shell scripts                         |

## Quickstart

### Prerequisites

- Docker and Docker Compose
- Go 1.24+
- Python 3.10+
- Node 20+ (for frontend development)

### Run locally

```bash
# Clone and start all services
git clone https://github.com/your-org/beacon.git
cd beacon

# Start ClickHouse, API, frontend, and drift detector
make up

# Run the ClickHouse migrations
bash infra/clickhouse/migrate.sh

# Install the SDK
cd sdk && pip install -e . && cd ..

# Send test traces
python test_beacon.py
```

The dashboard is available at **http://localhost:3000** and the API at **http://localhost:8080**.

### Run the consumer locally

```bash
bash scripts/run-consumer.sh
```

## SDK Usage

Install the SDK and add the `@trace()` decorator to any LLM call:

```python
from openai import OpenAI
from beacon_sdk import trace

client = OpenAI()

@trace(prompt_version="v2", score_hallucination_flag=True)
def summarize(text: str):
    return client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": f"Summarize: {text}"}],
    )

summarize("Beacon is an LLM observability platform.")
```

Each call emits a structured JSON trace:

```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "model": "gpt-4o",
  "prompt_tokens": 15,
  "completion_tokens": 42,
  "latency_ms": 823.45,
  "estimated_cost_usd": 0.000315,
  "hallucination_score": 0.05,
  "prompt_version": "v2"
}
```

To ship traces to Kinesis instead of stdout:

```bash
export BEACON_EMITTER=kinesis
export BEACON_KINESIS_STREAM=beacon-traces
```

## Dashboard

> **INSERT SCREENSHOT HERE**

The dashboard includes:
- **KPI cards** — total cost, average latency, token count, trace count
- **Cost by model** — bar chart showing spend per LLM
- **Latency trend** — area chart of response times over recent traces
- **Traces table** — sortable list with click-to-inspect detail panel
- **Trace waterfall** — visual phase breakdown (prompt processing, inference, response parsing)
- **Live refresh** — auto-updates every 10 seconds

## AWS Deployment

### 1. Provision infrastructure

```bash
cd infra/terraform

# Initialize and review
terraform init
terraform plan -var="clickhouse_password=YOUR_PASSWORD"

# Apply
terraform apply -var="clickhouse_password=YOUR_PASSWORD"
```

This creates: VPC with public/private subnets, ECS Fargate cluster, ALB, Kinesis stream, S3 bucket, ClickHouse EC2 instance, CloudWatch log groups, and auto-scaling policies (CPU > 70%, 1–4 tasks).

### 2. Push images and deploy

```bash
# First deploy — push images before ECS services exist
AWS_ACCOUNT_ID=123456789012 ./scripts/push-images.sh

# Subsequent deploys — build, push, and roll out
AWS_ACCOUNT_ID=123456789012 ENVIRONMENT=dev ./scripts/deploy.sh
```

### Environment variables

| Variable                  | Required | Description                          |
|---------------------------|----------|--------------------------------------|
| `CLICKHOUSE_DSN`          | Yes      | ClickHouse connection string         |
| `CLOUDWATCH_LOG_GROUP`    | No       | Ship API error logs to CloudWatch    |
| `SLACK_WEBHOOK_URL`       | No       | Drift alerts to Slack                |
| `PAGERDUTY_ROUTING_KEY`   | No       | Drift alerts to PagerDuty            |
| `DRIFT_INTERVAL`          | No       | Drift check interval (default `5m`)  |
| `DRIFT_THRESHOLD`         | No       | Regression threshold (default `0.2`) |

## Project Structure

```
beacon/
├── sdk/                          # Python SDK
│   ├── beacon_sdk/
│   │   ├── trace.py              # @trace() decorator
│   │   ├── hallucination.py      # Hallucination scoring
│   │   ├── emitter.py            # Stdout / Kinesis emitters
│   │   └── pricing.py            # Per-model cost estimation
│   └── tests/
│
├── backend/
│   ├── api/                      # Go HTTP API
│   │   ├── main.go               # Server with graceful degradation
│   │   ├── handlers.go           # REST endpoints
│   │   ├── clickhouse.go         # Query layer
│   │   ├── cloudwatch.go         # CloudWatch log writer
│   │   └── Dockerfile
│   ├── consumer/                 # Go Lambda — Kinesis → ClickHouse + S3
│   │   ├── main.go
│   │   └── internal/consumer/
│   └── drift/                    # Drift detection service
│       ├── main.go               # Ticker loop
│       ├── drift.go              # Regression detection SQL
│       ├── slack.go              # Slack alerter
│       ├── pagerduty.go          # PagerDuty alerter
│       └── Dockerfile
│
├── frontend/                     # React dashboard
│   └── src/
│       ├── App.tsx               # Layout + auto-refresh
│       └── components/
│           ├── StatsBar.tsx      # KPI cards
│           ├── CostChart.tsx     # Cost bar chart
│           ├── LatencyChart.tsx  # Latency area chart
│           ├── TracesTable.tsx   # Traces list
│           └── TraceDetail.tsx   # Waterfall + metadata panel
│
├── infra/
│   ├── terraform/                # AWS infrastructure
│   │   ├── main.tf, vpc.tf, ecs.tf, kinesis.tf
│   │   ├── s3.tf, clickhouse.tf
│   │   ├── variables.tf, outputs.tf
│   └── clickhouse/migrations/   # Table schemas
│
├── scripts/
│   ├── deploy.sh                 # Build + push + ECS deploy
│   ├── push-images.sh            # Build + push to ECR
│   └── run-consumer.sh           # Local consumer runner
│
├── docker-compose.yml            # Local dev environment
└── Makefile                      # make up / down / logs
```

## License

MIT
