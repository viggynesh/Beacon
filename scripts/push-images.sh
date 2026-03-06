#!/usr/bin/env bash
set -euo pipefail

# Build and push Docker images to ECR.
# Use this during initial setup before ECS services exist.

: "${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
: "${AWS_REGION:=us-east-1}"

REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Logging in to ECR ($REGISTRY)"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

# --- beacon/api ---
echo "==> Building beacon/api"
docker build -t "${REGISTRY}/beacon/api:latest" "${ROOT_DIR}/backend/api"

echo "==> Pushing beacon/api"
docker push "${REGISTRY}/beacon/api:latest"

# --- beacon/drift ---
echo "==> Building beacon/drift"
docker build -t "${REGISTRY}/beacon/drift:latest" "${ROOT_DIR}/backend/drift"

echo "==> Pushing beacon/drift"
docker push "${REGISTRY}/beacon/drift:latest"

# --- beacon/frontend ---
API_URL="${VITE_API_URL:-}"
if [ -z "$API_URL" ] && command -v terraform &>/dev/null; then
  API_URL=$(terraform -chdir="${ROOT_DIR}/infra/terraform" output -raw api_url 2>/dev/null || true)
fi
if [ -z "$API_URL" ]; then
  echo "WARNING: VITE_API_URL not set and terraform output unavailable — frontend will use relative API paths"
fi

echo "==> Building beacon/frontend (VITE_API_URL=${API_URL:-<unset>})"
docker build \
  --build-arg "VITE_API_URL=${API_URL}" \
  -t "${REGISTRY}/beacon/frontend:latest" \
  "${ROOT_DIR}/frontend"

echo "==> Pushing beacon/frontend"
docker push "${REGISTRY}/beacon/frontend:latest"

echo "==> All images pushed to ${REGISTRY}"
