#!/usr/bin/env bash

set -euo pipefail

readonly gateway_url="${GATEWAY_URL:-http://127.0.0.1:8080}"
readonly loki_url="${LOKI_URL:-http://127.0.0.1:3100}"
readonly grafana_url="${GRAFANA_URL:-http://127.0.0.1:3000}"
readonly grafana_user="${GRAFANA_ADMIN_USER:-admin}"
readonly grafana_password="${GRAFANA_ADMIN_PASSWORD:-admin}"
readonly request_id="${REQUEST_ID:-loki-smoke-$(date +%s)}"
readonly smoke_message="Loki smoke test browser error ${request_id}"
readonly wait_seconds="${SMOKE_WAIT_SECONDS:-3}"

check_health() {
  local name="$1"
  local url="$2"

  echo "Checking $name at $url"
  curl -fsS "$url" >/dev/null
}

grafana_get() {
  local path="$1"

  curl -fsS -u "${grafana_user}:${grafana_password}" "$grafana_url$path"
}

emit_browser_error() {
  local payload
  payload=$(cat <<JSON
{"events":[{"level":"error","message":"${smoke_message}","url":"http://localhost/dashboard","referrer":"http://localhost/","userAgent":"loki-smoke","stack":"Error: ${smoke_message}"}]}
JSON
  )

  echo "Sending browser log batch with request id $request_id"
  curl -fsS \
    -X POST "$gateway_url/browser-logs" \
    -H "Content-Type: application/json" \
    -H "X-Request-Id: $request_id" \
    -d "$payload" \
    >/dev/null
}

verify_loki() {
  local query response
  query="{service=\"api-gateway\"} |= \"$smoke_message\""

  echo "Querying Loki for the emitted browser error"
  response="$(
    curl -fsS --get \
      --data-urlencode "query=$query" \
      --data-urlencode "limit=5" \
      "$loki_url/loki/api/v1/query"
  )"

  local response_file
  response_file="$(mktemp)"
  trap 'rm -f "$response_file"' RETURN
  printf '%s' "$response" > "$response_file"

  python3 - "$request_id" "$response_file" <<'PY'
import json
from pathlib import Path
import sys

request_id = sys.argv[1]
payload = json.loads(Path(sys.argv[2]).read_text())

if payload.get("status") != "success":
    raise SystemExit(f"Loki query failed for {request_id}: {payload}")

results = payload.get("data", {}).get("result", [])
if not results:
    raise SystemExit(f"No Loki results found for smoke message {request_id}")

print(f"Found {len(results)} Loki result stream(s) for smoke message {request_id}")
PY
}

verify_dashboard() {
  local uid="$1"
  local expected_title="$2"
  local expected_snippet="$3"
  local response response_file

  echo "Verifying Grafana dashboard $uid"
  response="$(grafana_get "/api/dashboards/uid/$uid")"
  response_file="$(mktemp)"
  trap 'rm -f "$response_file"' RETURN
  printf '%s' "$response" > "$response_file"

  python3 - "$uid" "$expected_title" "$expected_snippet" "$response_file" <<'PY'
import json
from pathlib import Path
import sys

uid, expected_title, expected_snippet, path = sys.argv[1:5]
payload = json.loads(Path(path).read_text())
dashboard = payload.get("dashboard", {})
if dashboard.get("uid") != uid:
    raise SystemExit(f"Dashboard {uid} not found: {payload}")
if dashboard.get("title") != expected_title:
    raise SystemExit(f"Dashboard {uid} title mismatch: {dashboard.get('title')} != {expected_title}")

panel_text = json.dumps(dashboard.get("panels", []), sort_keys=True)
if expected_snippet not in panel_text:
    raise SystemExit(f"Dashboard {uid} does not contain required snippet: {expected_snippet}")

templating = json.dumps(dashboard.get("templating", {}), sort_keys=True)
if "request_id" in expected_snippet and "request_id" not in templating:
    raise SystemExit(f"Dashboard {uid} is missing request_id variable")

print(f"Verified dashboard {uid}: {expected_title}")
PY
}

verify_alert_rules() {
  local response response_file

  echo "Verifying Grafana alert rule provisioning"
  response="$(grafana_get "/api/ruler/grafana/api/v1/rules")"
  response_file="$(mktemp)"
  trap 'rm -f "$response_file"' RETURN
  printf '%s' "$response" > "$response_file"

  python3 - "$response_file" <<'PY'
import json
from pathlib import Path
import sys

payload = json.loads(Path(sys.argv[1]).read_text())
text = json.dumps(payload, sort_keys=True)
for snippet in ["App Error Spike", "Browser Error Spike", "Loki Ingestion Failure"]:
    if snippet not in text:
        raise SystemExit(f"Missing provisioned alert rule: {snippet}")

print("Verified Grafana alert provisioning for app, browser, and ingestion rules")
PY
}

check_health "Grafana" "$grafana_url/api/health"
check_health "Loki" "$loki_url/ready"
emit_browser_error
sleep "$wait_seconds"
verify_loki
verify_dashboard "dedicate-overview" "Dedicate Overview" "App error spike"
verify_dashboard "dedicate-logs" "Dedicate App Logs" "request_id"
verify_dashboard "dedicate-browser-logs" "Dedicate Browser Logs" "browser_level"
verify_alert_rules

echo "Loki smoke test completed successfully."
