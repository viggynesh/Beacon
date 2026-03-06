#!/usr/bin/env bash
set -euo pipefail

# Build, push, and deploy all services to ECS.

: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${AWS_REGION:=us-east-1}"
: "${ENVIRONMENT:=dev}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLUSTER="beacon-${ENVIRONMENT}"

# Step 1: Build and push images (reuse push-images.sh)
echo "==> Building and pushing images"
"${ROOT_DIR}/scripts/push-images.sh"

# Step 2: Force new ECS deployments
echo "==> Updating ECS service: beacon-api (cluster: ${CLUSTER})"
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service beacon-api \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --no-cli-pager

echo "==> Updating ECS service: beacon-drift (cluster: ${CLUSTER})"
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service beacon-drift \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --no-cli-pager

echo "==> Deployment triggered. Waiting for services to stabilize..."
aws ecs wait services-stable \
  --cluster "$CLUSTER" \
  --services beacon-api beacon-drift \
  --region "$AWS_REGION"

echo "==> Deployment complete"
