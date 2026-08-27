#!/usr/bin/env bash
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${AI_WRITING_BACKEND_DIR:-$(cd "$FRONTEND_DIR/../ai-writing-platform-backend" && pwd)}"
BASE_COMPOSE="$BACKEND_DIR/infrastructure/docker-compose.yml"
E2E_COMPOSE="$FRONTEND_DIR/e2e/docker-compose.e2e.yml"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

docker compose -f "$BASE_COMPOSE" -f "$E2E_COMPOSE" up -d --build \
  postgres redis ai_inference knowledge_retrieval pipelines api_gateway

for attempt in {1..60}; do
  if curl --fail --silent http://127.0.0.1:8000/health/ >/dev/null; then
    break
  fi
  if [[ "$attempt" == "60" ]]; then
    echo "API Gateway did not become healthy within 120 seconds." >&2
    exit 1
  fi
  sleep 2
done

docker compose -f "$BASE_COMPOSE" -f "$E2E_COMPOSE" exec -T postgres \
  psql --username "${POSTGRES_USER:-platform}" --dbname "${POSTGRES_DB:-platform}" \
  --set=db_user="${POSTGRES_USER:-platform}" \
  --set=db_password="${POSTGRES_PASSWORD:-platform}" \
  < "$FRONTEND_DIR/e2e/seed.sql"

cd "$FRONTEND_DIR"
npx playwright test "$@"
