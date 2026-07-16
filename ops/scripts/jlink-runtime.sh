#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <app-jar> <runtime-output-dir> <java-release>" >&2
  exit 1
fi

app_jar="$1"
runtime_dir="$2"
java_release="$3"

if [[ "$app_jar" != /* ]]; then
  app_jar="$(cd "$(dirname "$app_jar")" && pwd)/$(basename "$app_jar")"
fi

if [[ ! -f "$app_jar" ]]; then
  echo "Application jar not found: $app_jar" >&2
  exit 1
fi

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

mkdir -p "$workdir/extracted"
(
  cd "$workdir/extracted"
  jar -xf "$app_jar"
)

classpath=""
for dependency in "$workdir/extracted/BOOT-INF/lib/"*.jar; do
  [[ -e "$dependency" ]] || continue
  if [[ -z "$classpath" ]]; then
    classpath="$dependency"
  else
    classpath="$classpath:$dependency"
  fi
done

modules="$(
  jdeps \
    --ignore-missing-deps \
    --multi-release "$java_release" \
    --recursive \
    --print-module-deps \
    --class-path "$classpath" \
    "$workdir/extracted/BOOT-INF/classes"
)"

modules="$(
  printf '%s\n' "$modules" "jdk.crypto.ec" "java.management" |
    tr ',' '\n' |
    sed '/^$/d' |
    sort -u |
    paste -sd, -
)"

echo "Building custom runtime with modules: $modules"
jlink \
  --add-modules "$modules" \
  --bind-services \
  --compress=2 \
  --no-header-files \
  --no-man-pages \
  --strip-debug \
  --output "$runtime_dir"
