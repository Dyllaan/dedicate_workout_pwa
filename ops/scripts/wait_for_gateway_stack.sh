#!/usr/bin/env bash

set -euo pipefail

readonly gateway_url="http://127.0.0.1:8080/actuator/health"
readonly auth_url="http://127.0.0.1:8080/auth/actuator/health"
readonly workout_url="http://127.0.0.1:8080/workout/actuator/health"

readonly total_attempts="${WAIT_FOR_GATEWAY_ATTEMPTS:-36}"
readonly sleep_seconds="${WAIT_FOR_GATEWAY_SLEEP_SECONDS:-5}"

check_endpoint() {
  local name="$1"
  local url="$2"
  local response

  if ! response="$(curl -fsS "$url" 2>&1)"; then
    echo "[$name] not ready yet: $response"
    return 1
  fi

  if [[ "$response" != *'"UP"'* ]]; then
    echo "[$name] responded without UP status: $response"
    return 1
  fi

  echo "[$name] ready: $response"
  return 0
}

for ((attempt = 1; attempt <= total_attempts; attempt++)); do
  echo "Readiness check $attempt/$total_attempts"

  if ! check_endpoint "gateway" "$gateway_url"; then
    if (( attempt < total_attempts )); then
      sleep "$sleep_seconds"
      continue
    fi
    echo "Gateway did not become ready before timeout: $gateway_url"
    exit 1
  fi

  if ! check_endpoint "auth" "$auth_url"; then
    if (( attempt < total_attempts )); then
      sleep "$sleep_seconds"
      continue
    fi
    echo "Auth service did not become ready before timeout: $auth_url"
    exit 1
  fi

  if ! check_endpoint "workout" "$workout_url"; then
    if (( attempt < total_attempts )); then
      sleep "$sleep_seconds"
      continue
    fi
    echo "Workout service did not become ready before timeout: $workout_url"
    exit 1
  fi

  echo "Gateway, auth, and workout services are ready."
  exit 0
done

echo "Gateway stack readiness check exhausted without success."
exit 1
