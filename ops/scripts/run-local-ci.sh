#!/usr/bin/env bash
set -euo pipefail

MODE="all"
COMPOSE_ENV_FILE=""
COMPOSE_PROJECT_NAME=""
KEEP_STACK_RUNNING=false
SKIP_NPM_CI=false

usage() {
    echo "Usage: $0 [--mode all|tests|smoke|images] [--compose-env-file FILE] [--compose-project-name NAME] [--keep-stack-running] [--skip-npm-ci]"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode) MODE="$2"; shift 2 ;;
        --compose-env-file) COMPOSE_ENV_FILE="$2"; shift 2 ;;
        --compose-project-name) COMPOSE_PROJECT_NAME="$2"; shift 2 ;;
        --keep-stack-running) KEEP_STACK_RUNNING=true; shift ;;
        --skip-npm-ci) SKIP_NPM_CI=true; shift ;;
        *) usage ;;
    esac
done

case "$MODE" in
    all|tests|smoke|images) ;;
    *) echo "Invalid mode: $MODE"; usage ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/ops/local/docker-compose.yml"
COMPOSE_ENV_TEMPLATE="$REPO_ROOT/ops/local/.env.ci.example"
RUNTIME_HELPER_SCRIPT="$REPO_ROOT/ops/scripts/jlink-runtime.sh"
FRONTEND_DIR="$REPO_ROOT/frontend"
AUTH_SERVICE_DIR="$REPO_ROOT/auth-service"
GATEWAY_DIR="$REPO_ROOT/gateway"
WORKOUT_SERVICE_DIR="$REPO_ROOT/workout_service"
FRONTEND_SECURITY_CONTAINER_NAME="dedicate-frontend-security-test"
FRONTEND_SECURITY_IMAGE_NAME="dedicate-frontend-security-test"
AUTH_IMAGE_NAME="dedicate-auth-service-ci:local"
GATEWAY_IMAGE_NAME="dedicate-api-gateway-ci:local"
WORKOUT_IMAGE_NAME="dedicate-workout-service-ci:local"

COMPOSE_WAS_STARTED=false
GENERATED_COMPOSE_ENV_FILE=""
ACTIVE_COMPOSE_ENV_FILE=""
ACTIVE_COMPOSE_PROJECT_NAME=""
FRONTEND_DEPENDENCIES_READY=false
PLAYWRIGHT_BROWSERS_READY=false
RUN_FAILURE=""

write_phase() {
    echo ""
    echo -e "\033[36m==> $1\033[0m"
}

resolve_repo_path() {
    local path="$1"
    if [[ "$path" != /* ]]; then
        path="$REPO_ROOT/$path"
    fi
    realpath "$path"
}

get_required_command() {
    local name="$1"
    if ! command -v "$name" &>/dev/null; then
        echo "Required command '$name' was not found in PATH." >&2
        exit 1
    fi
    command -v "$name"
}

get_python_command() {
    for name in python3 python; do
        if command -v "$name" &>/dev/null; then
            echo "$name"
            return
        fi
    done
    echo "Required command 'python3' or 'python' was not found in PATH." >&2
    exit 1
}

invoke_logged_command() {
    local working_dir="$1"
    shift
    echo "[$(basename "$working_dir")] $*"
    (cd "$working_dir" && "$@")
}

invoke_python_script() {
    local script_path="$1"
    local working_dir="$2"
    shift 2
    local python_cmd
    python_cmd="$(get_python_command)"
    invoke_logged_command "$working_dir" "$python_cmd" "$script_path" "$@"
}

invoke_compose() {
    invoke_logged_command "$REPO_ROOT" docker compose \
        --project-name "$ACTIVE_COMPOSE_PROJECT_NAME" \
        --env-file "$ACTIVE_COMPOSE_ENV_FILE" \
        -f "$COMPOSE_FILE" \
        "$@"
}

ensure_dedicate_network_exists() {
    if ! docker network inspect dedicate_network >/dev/null 2>&1; then
        write_phase "Create shared Docker network"
        invoke_logged_command "$REPO_ROOT" docker network create dedicate_network
    fi
}

invoke_gradle_task() {
    local service_dir="$1"
    shift
    invoke_logged_command "$service_dir" ./gradlew "$@"
}

ensure_frontend_dependencies() {
    local install_playwright=false
    if [[ "${1:-}" == "--playwright" ]]; then
        install_playwright=true
    fi

    if [[ "$FRONTEND_DEPENDENCIES_READY" == false && "$SKIP_NPM_CI" == false ]]; then
        write_phase "Install frontend dependencies"
        invoke_logged_command "$FRONTEND_DIR" npm ci
        FRONTEND_DEPENDENCIES_READY=true
    fi

    if [[ "$install_playwright" == true && "$PLAYWRIGHT_BROWSERS_READY" == false ]]; then
        write_phase "Install Playwright browsers"
        invoke_logged_command "$FRONTEND_DIR" npx playwright install chromium webkit
        PLAYWRIGHT_BROWSERS_READY=true
    fi
}

wait_for_url() {
    local url="$1"
    local attempts="${2:-20}"
    local sleep_seconds="${3:-2}"

    for ((i = 1; i <= attempts; i++)); do
        local status
        status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || true)
        if [[ "$status" =~ ^[23] ]]; then
            return 0
        fi
        sleep "$sleep_seconds"
    done

    echo "Timed out waiting for $url" >&2
    exit 1
}

get_health_response_body() {
    local url="$1"
    curl -s --max-time 5 "$url" 2>/dev/null || true
}

test_endpoint_ready() {
    local name="$1"
    local url="$2"
    local body
    body="$(get_health_response_body "$url")"

    if [[ -z "$body" ]]; then
        echo "[$name] not ready yet: no successful response from $url"
        return 1
    fi

    if [[ "$body" != *'"UP"'* ]]; then
        echo "[$name] responded without UP status: $body"
        return 1
    fi

    echo "[$name] ready: $body"
    return 0
}

wait_for_gateway_stack_readiness() {
    local attempts="${1:-36}"
    local sleep_seconds="${2:-5}"

    local -a names=("gateway" "auth" "workout")
    local -a urls=(
        "http://127.0.0.1:8080/actuator/health"
        "http://127.0.0.1:8080/auth/actuator/health"
        "http://127.0.0.1:8080/workout/actuator/health"
    )

    for ((i = 1; i <= attempts; i++)); do
        echo "Readiness check $i/$attempts"
        local all_ready=true

        for idx in "${!names[@]}"; do
            if ! test_endpoint_ready "${names[$idx]}" "${urls[$idx]}"; then
                all_ready=false
                if [[ $i -lt $attempts ]]; then
                    sleep "$sleep_seconds"
                    break
                fi
                echo "${names[$idx]} did not become ready before timeout: ${urls[$idx]}" >&2
                exit 1
            fi
        done

        if [[ "$all_ready" == true ]]; then
            echo "Gateway, auth, and workout services are ready."
            return
        fi
    done

    echo "Gateway stack readiness check exhausted without success." >&2
    exit 1
}

remove_frontend_security_container() {
    docker rm -f "$FRONTEND_SECURITY_CONTAINER_NAME" &>/dev/null || true
}

test_docker_available() {
    docker version --format "{{.Server.Version}}" &>/dev/null
}

initialize_compose_env_file() {
    if [[ -z "$COMPOSE_ENV_FILE" ]]; then
        if [[ ! -f "$COMPOSE_ENV_TEMPLATE" ]]; then
            echo "Could not find CI compose env template at $COMPOSE_ENV_TEMPLATE" >&2
            exit 1
        fi
        GENERATED_COMPOSE_ENV_FILE="$(mktemp /tmp/ops-local-ci-XXXXXX.env)"
        cp "$COMPOSE_ENV_TEMPLATE" "$GENERATED_COMPOSE_ENV_FILE"
        ACTIVE_COMPOSE_ENV_FILE="$GENERATED_COMPOSE_ENV_FILE"
    else
        ACTIVE_COMPOSE_ENV_FILE="$(resolve_repo_path "$COMPOSE_ENV_FILE")"
    fi

    echo "Using compose env file: $ACTIVE_COMPOSE_ENV_FILE"
}

initialize_compose_project_name() {
    if [[ -n "$COMPOSE_PROJECT_NAME" ]]; then
        ACTIVE_COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME"
    else
        ACTIVE_COMPOSE_PROJECT_NAME="localci-$(cat /proc/sys/kernel/random/uuid | tr -d '-')"
    fi

    echo "Using compose project name: $ACTIVE_COMPOSE_PROJECT_NAME"
}

test_prerequisites() {
    write_phase "Check prerequisites"

    for tool in docker node npm npx java; do
        get_required_command "$tool" > /dev/null
    done
    get_python_command > /dev/null

    for path in "$COMPOSE_FILE" "$COMPOSE_ENV_TEMPLATE" "$REPO_ROOT/ops/scripts/test_user_deletion_propagation.py"; do
        if [[ ! -f "$path" ]]; then
            echo "Required file was not found: $path" >&2
            exit 1
        fi
    done

    if [[ ! -f "$RUNTIME_HELPER_SCRIPT" ]]; then
        echo "Required runtime helper script was not found: $RUNTIME_HELPER_SCRIPT" >&2
        exit 1
    fi
}

invoke_backend_tests() {
    write_phase "Run backend tests"
    invoke_gradle_task "$AUTH_SERVICE_DIR" test
    invoke_gradle_task "$GATEWAY_DIR" test
    invoke_gradle_task "$WORKOUT_SERVICE_DIR" test
}

invoke_security_checks() {
    ensure_frontend_dependencies

    write_phase "Run frontend vulnerability audit (high/critical gate)"
    invoke_logged_command "$FRONTEND_DIR" npm audit --audit-level=high
}

invoke_frontend_tests() {
    ensure_frontend_dependencies --playwright

    write_phase "Run frontend coverage"
    invoke_logged_command "$FRONTEND_DIR" npm run test:coverage

    write_phase "Run mocked browser tests"
    invoke_logged_command "$FRONTEND_DIR" npm run test:e2e
}

invoke_smoke_tests() {
    ensure_frontend_dependencies --playwright

    write_phase "Validate compose config"
    invoke_compose config

    ensure_dedicate_network_exists

    write_phase "Start local smoke stack"
    COMPOSE_WAS_STARTED=true
    invoke_compose up -d --build

    write_phase "Wait for gateway stack readiness"
    wait_for_gateway_stack_readiness

    write_phase "Run real-stack frontend smoke tests"
    invoke_logged_command "$FRONTEND_DIR" npm run test:e2e:smoke

    write_phase "Run user deletion propagation smoke"
    COMPOSE_FILE="$COMPOSE_FILE" \
    COMPOSE_ENV_FILE="$ACTIVE_COMPOSE_ENV_FILE" \
    COMPOSE_PROJECT_NAME="$ACTIVE_COMPOSE_PROJECT_NAME" \
    invoke_python_script "ops/scripts/test_user_deletion_propagation.py" "$REPO_ROOT"
}

invoke_image_verification() {
    ensure_frontend_dependencies --playwright

    write_phase "Validate WebKit launch"
    invoke_logged_command "$FRONTEND_DIR" node --input-type=module -e \
        "import { webkit } from '@playwright/test'; const browser = await webkit.launch(); await browser.close();"

    write_phase "Build frontend production assets"
    invoke_logged_command "$FRONTEND_DIR" npm run build -- --mode production

    write_phase "Build Docker images"
    invoke_logged_command "$REPO_ROOT" docker build -f frontend/docker/Dockerfile -t "$FRONTEND_SECURITY_IMAGE_NAME" ./frontend
    invoke_logged_command "$REPO_ROOT" docker build -f auth-service/Dockerfile -t "$AUTH_IMAGE_NAME" .
    invoke_logged_command "$REPO_ROOT" docker build -f gateway/Dockerfile -t "$GATEWAY_IMAGE_NAME" .
    invoke_logged_command "$REPO_ROOT" docker build -f workout_service/Dockerfile -t "$WORKOUT_IMAGE_NAME" .

    write_phase "Verify frontend security headers through Nginx"
    remove_frontend_security_container
    invoke_logged_command "$REPO_ROOT" docker run -d --rm --name "$FRONTEND_SECURITY_CONTAINER_NAME" -p 4180:80 "$FRONTEND_SECURITY_IMAGE_NAME"
    wait_for_url "http://127.0.0.1:4180/"
    invoke_logged_command "$REPO_ROOT" node frontend/tests/scripts/verify-nginx-security-headers.mjs "http://127.0.0.1:4180/"
    invoke_logged_command "$REPO_ROOT" node frontend/tests/scripts/verify-spa-fallback.mjs "http://127.0.0.1:4180/"
}

cleanup() {
    write_phase "Cleanup"

    if test_docker_available; then
        remove_frontend_security_container
    else
        echo "WARNING: Docker engine is unavailable during cleanup. Skipping frontend security container removal."
    fi

    if [[ "$COMPOSE_WAS_STARTED" == true && "$KEEP_STACK_RUNNING" == false ]]; then
        if test_docker_available; then
            invoke_compose down -v || echo "WARNING: Failed to stop compose stack during cleanup."
        else
            echo "WARNING: Docker engine is unavailable during cleanup. Skipping compose shutdown."
        fi
    fi

    if [[ "$KEEP_STACK_RUNNING" == true && "$COMPOSE_WAS_STARTED" == true ]]; then
        echo "Leaving compose stack running for debugging because --keep-stack-running was set."
    fi

    if [[ -n "$GENERATED_COMPOSE_ENV_FILE" && -f "$GENERATED_COMPOSE_ENV_FILE" ]]; then
        rm -f "$GENERATED_COMPOSE_ENV_FILE"
    fi
}

trap cleanup EXIT

test_prerequisites
initialize_compose_env_file
initialize_compose_project_name

case "$MODE" in
    all)
        invoke_backend_tests
        invoke_security_checks
        invoke_frontend_tests
        invoke_smoke_tests
        invoke_image_verification
        ;;
    tests)
        invoke_backend_tests
        invoke_security_checks
        invoke_frontend_tests
        ;;
    smoke)
        invoke_smoke_tests
        ;;
    images)
        invoke_image_verification
        ;;
esac

echo ""
echo -e "\033[32mLocal CI runner completed successfully.\033[0m"
