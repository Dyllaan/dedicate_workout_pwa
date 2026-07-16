#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_DIR="$ROOT/ops/local"
DUMP_DIR="$ROOT/dump"
PROJECT_NAME="local"
AUTH_DUMP="$DUMP_DIR/auth_backup_20260615_003004.dump"
WORKOUT_DUMP="$DUMP_DIR/workout_backup_full_20260615_003331.dump"
AUTH_DUMP_FILE="$(basename "$AUTH_DUMP")"
WORKOUT_DUMP_FILE="$(basename "$WORKOUT_DUMP")"
WIPE_VOLUMES=false

usage() {
  cat <<'EOF'
Usage: restore_local_dbs.sh [--wipe]

Restore the local auth and workout databases from the canonical dumps.
Pass --wipe to remove the local compose volumes before restoring.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wipe)
      WIPE_VOLUMES=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but was not found in PATH." >&2
  exit 1
fi

if [[ ! -f "$AUTH_DUMP" ]]; then
  echo "Missing auth dump: $AUTH_DUMP" >&2
  exit 1
fi

if [[ ! -f "$WORKOUT_DUMP" ]]; then
  echo "Missing workout dump: $WORKOUT_DUMP" >&2
  exit 1
fi

cd "$LOCAL_DIR"
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  if [[ -z "$line" || "${line:0:1}" == "#" ]]; then
    continue
  fi

  key="${line%%=*}"
  value="${line#*=}"
  if [[ "$key" == "$line" || ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "Invalid env line in $ROOT/dump/.env.dbs: $line" >&2
    exit 1
  fi

  export "$key=$value"
done < <(tr -d '\r' < "$ROOT/dump/.env.dbs")

AUTH_DB_USERNAME="${AUTH_DATABASE_USERNAME:?Missing AUTH_DATABASE_USERNAME in dump/.env.dbs}"
AUTH_DB_PASSWORD="${AUTH_DATABASE_PASSWORD:?Missing AUTH_DATABASE_PASSWORD in dump/.env.dbs}"
WORKOUT_DB_USERNAME="${WORKOUT_DATABASE_USERNAME:?Missing WORKOUT_DATABASE_USERNAME in dump/.env.dbs}"
WORKOUT_DB_PASSWORD="${WORKOUT_DATABASE_PASSWORD:?Missing WORKOUT_DATABASE_PASSWORD in dump/.env.dbs}"

export AUTH_DB_USERNAME AUTH_DB_PASSWORD WORKOUT_DB_USERNAME WORKOUT_DB_PASSWORD

wait_for_health() {
  local container="$1"
  local status=""

  while :; do
    status="$(
      docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true
    )"
    case "$status" in
      healthy|running)
        return 0
        ;;
      unhealthy)
        echo "Container became unhealthy: $container" >&2
        exit 1
        ;;
    esac
    sleep 2
  done
}

if [[ "$WIPE_VOLUMES" == true ]]; then
  docker compose --project-name "$PROJECT_NAME" --env-file .env down -v
else
  docker compose --project-name "$PROJECT_NAME" --env-file .env down
fi
docker compose --project-name "$PROJECT_NAME" --env-file .env up -d dedicate-auth-db dedicate-workout-db

wait_for_health "${PROJECT_NAME}-dedicate-auth-db-1"
wait_for_health "${PROJECT_NAME}-dedicate-workout-db-1"

docker run --rm --network "${PROJECT_NAME}_default" \
  -e PGPASSWORD="$AUTH_DB_PASSWORD" \
  -v "$DUMP_DIR:/dump:ro" \
  postgres:17 \
  pg_restore --verbose --clean --if-exists --no-owner --no-privileges \
  -h dedicate-auth-db -U auth_user -d auth "/dump/$AUTH_DUMP_FILE"

docker run --rm --network "${PROJECT_NAME}_default" \
  -e PGPASSWORD="$WORKOUT_DB_PASSWORD" \
  -v "$DUMP_DIR:/dump:ro" \
  postgres:17 \
  pg_restore --verbose --clean --if-exists --no-owner --no-privileges \
  -h dedicate-workout-db -U workout_user -d workout "/dump/$WORKOUT_DUMP_FILE"

docker compose --project-name "$PROJECT_NAME" --env-file .env up -d --build
docker compose --project-name "$PROJECT_NAME" --env-file .env ps
