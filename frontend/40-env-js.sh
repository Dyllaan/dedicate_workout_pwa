#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_var() {
  key="$1"
  value="${2-}"
  escaped="$(json_escape "$value")"
  printf '  %s: "%s",\n' "$key" "$escaped"
}

{
  echo 'window.__APP_CONFIG__ = {'
  write_var 'VITE_API_URL' "${VITE_API_URL:-}"
  write_var 'VITE_MIN_SETS' "${VITE_MIN_SETS:-}"
  write_var 'VITE_MAX_SETS' "${VITE_MAX_SETS:-}"
  write_var 'VITE_MIN_REPS' "${VITE_MIN_REPS:-}"
  write_var 'VITE_MAX_REPS' "${VITE_MAX_REPS:-}"
  write_var 'VITE_MIN_STRING_LENGTH' "${VITE_MIN_STRING_LENGTH:-}"
  write_var 'VITE_MAX_STRING_LENGTH' "${VITE_MAX_STRING_LENGTH:-}"
  write_var 'VITE_GITHUB_URL' "${VITE_GITHUB_URL:-}"
  echo '};'
} > /usr/share/nginx/html/env.js
