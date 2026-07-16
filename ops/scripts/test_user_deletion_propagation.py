#!/usr/bin/env python3
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request


BASE_URL = os.environ.get("GATEWAY_URL", "http://127.0.0.1:8080")
DEFAULT_COMPOSE_FILE = Path(__file__).resolve().parents[1] / "local" / "docker-compose.yml"
DEFAULT_COMPOSE_ENV_FILE = Path(__file__).resolve().parents[1] / "local" / ".env"
COMPOSE_FILE = os.environ.get("COMPOSE_FILE", str(DEFAULT_COMPOSE_FILE))
COMPOSE_ENV_FILE = os.environ.get("COMPOSE_ENV_FILE", str(DEFAULT_COMPOSE_ENV_FILE))
COMPOSE_PROJECT_NAME = os.environ.get("COMPOSE_PROJECT_NAME")
AUTH_DB_SERVICE = os.environ.get("AUTH_DB_SERVICE", "dedicate-auth-db")
AUTH_DB_NAME = os.environ.get("AUTH_DB_NAME", "auth")
AUTH_DB_USER = os.environ.get("AUTH_DB_USER", "auth_user")
WORKOUT_DB_SERVICE = os.environ.get("WORKOUT_DB_SERVICE", "dedicate-workout-db")
WORKOUT_DB_NAME = os.environ.get("WORKOUT_DB_NAME", "workout")
WORKOUT_DB_USER = os.environ.get("WORKOUT_DB_USER", "workout_user")


def api_request(method, path, payload=None, token=None, expected_status=None):
    url = f"{BASE_URL}{path}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response_body = response.read().decode("utf-8")
            status = response.getcode()
    except urllib.error.HTTPError as exc:
        status = exc.code
        response_body = exc.read().decode("utf-8")

    if expected_status is not None and status != expected_status:
        raise AssertionError(f"{method} {path} returned {status}, expected {expected_status}: {response_body}")

    if not response_body:
        return status, None
    return status, json.loads(response_body)


def register_user(username):
    _, body = api_request(
        "POST",
        "/auth/user/register",
        {"username": username, "password": "Password123!"},
        expected_status=201,
    )
    return body["accessToken"]


def create_template(token, name):
    _, body = api_request(
        "POST",
        "/workout/workout-templates",
        {
            "name": name,
            "category": "Strength",
            "exercises": [
                {
                    "exerciseName": "Bench Press",
                    "goalSets": 3,
                    "variant": "Barbell",
                    "goalReps": 8,
                }
            ],
        },
        token=token,
        expected_status=201,
    )
    return body["id"]


def create_split(token, name, template_id):
    _, body = api_request(
        "POST",
        "/workout/splits",
        {"name": name, "workoutTemplateIds": [template_id]},
        token=token,
        expected_status=201,
    )
    return body["id"]


def create_programme(token, split_id):
    api_request(
        "POST",
        "/workout/programmes/preset",
        {
            "splitId": split_id,
            "presetType": "STRENGTH",
            "startDate": "2026-01-01T00:00:00Z",
        },
        token=token,
        expected_status=201,
    )


def create_workout_entry(token, template_id):
    api_request(
        "POST",
        "/workout/workout-entries",
        {
            "workoutTemplateId": template_id,
            "exercises": [
                {
                    "exerciseName": "Bench Press",
                    "variant": "Barbell",
                    "goalSets": 3,
                    "sets": [
                        {
                            "reps": 8,
                            "weight": 100.0,
                            "rpe": 8.0,
                            "notes": "solid",
                        }
                    ],
                }
            ],
            "notes": "Propagation smoke session",
        },
        token=token,
        expected_status=201,
    )


def docker_compose_exec(service, *args):
    command = [
        "docker",
        "compose",
    ]
    if COMPOSE_PROJECT_NAME:
        command.extend(["--project-name", COMPOSE_PROJECT_NAME])
    command.extend(
        [
            "--env-file",
            COMPOSE_ENV_FILE,
            "-f",
            COMPOSE_FILE,
            "exec",
            "-T",
            service,
            *args,
        ]
    )
    return subprocess.check_output(command, text=True).strip()


def docker_psql(service, user, database, query):
    command = [
        "psql",
        "-U",
        user,
        "-d",
        database,
        "-tAc",
        query,
    ]
    return docker_compose_exec(service, *command)


def sql_count(query):
    return int(docker_psql(WORKOUT_DB_SERVICE, WORKOUT_DB_USER, WORKOUT_DB_NAME, query))


def scoped_programme_count(user_id):
    return sql_count(
        "SELECT COUNT(DISTINCT p.id) "
        "FROM programmes p "
        "JOIN splits s ON s.id = p.split_id "
        f"WHERE s.user_id = '{user_id}'"
    )


def scoped_block_count(user_id):
    return sql_count(
        "SELECT COUNT(DISTINCT b.id) "
        "FROM blocks b "
        "JOIN programmes p ON p.id = b.programme_id "
        "JOIN splits s ON s.id = p.split_id "
        f"WHERE s.user_id = '{user_id}'"
    )


def scoped_week_count(user_id):
    return sql_count(
        "SELECT COUNT(DISTINCT w.id) "
        "FROM block_weeks w "
        "JOIN blocks b ON b.id = w.block_id "
        "JOIN programmes p ON p.id = b.programme_id "
        "JOIN splits s ON s.id = p.split_id "
        f"WHERE s.user_id = '{user_id}'"
    )


def get_auth_user_id(username):
    return docker_psql(
        AUTH_DB_SERVICE,
        AUTH_DB_USER,
        AUTH_DB_NAME,
        f"SELECT id FROM users WHERE username = '{username}'",
    )


def seed_user_workout_data(token, prefix):
    template_id = create_template(token, f"{prefix} Template")
    split_id = create_split(token, f"{prefix} Split", template_id)
    create_programme(token, split_id)
    create_workout_entry(token, template_id)


def fetch_cleanup_snapshot(deleted_token, survivor_token, deleted_user_id, survivor_user_id):
    deleted_templates = api_request("GET", "/workout/workout-templates", token=deleted_token, expected_status=200)[1]
    deleted_entries = api_request("GET", "/workout/workout-entries", token=deleted_token, expected_status=200)[1]
    deleted_splits = api_request("GET", "/workout/splits", token=deleted_token, expected_status=200)[1]
    survivor_templates = api_request("GET", "/workout/workout-templates", token=survivor_token, expected_status=200)[1]
    survivor_entries = api_request("GET", "/workout/workout-entries", token=survivor_token, expected_status=200)[1]
    survivor_splits = api_request("GET", "/workout/splits", token=survivor_token, expected_status=200)[1]
    deleted_me_status, _ = api_request("GET", "/auth/user/me", token=deleted_token)

    return {
        "deleted_templates": deleted_templates,
        "deleted_entries": deleted_entries,
        "deleted_splits": deleted_splits,
        "survivor_templates": survivor_templates,
        "survivor_entries": survivor_entries,
        "survivor_splits": survivor_splits,
        "deleted_me_status": deleted_me_status,
        "deleted_template_count": sql_count(f"SELECT COUNT(*) FROM workout_templates WHERE user_id = '{deleted_user_id}'"),
        "deleted_entry_count": sql_count(f"SELECT COUNT(*) FROM workout_entries WHERE user_id = '{deleted_user_id}'"),
        "deleted_split_count": sql_count(f"SELECT COUNT(*) FROM splits WHERE user_id = '{deleted_user_id}'"),
        "deleted_programme_count": scoped_programme_count(deleted_user_id),
        "deleted_block_count": scoped_block_count(deleted_user_id),
        "deleted_week_count": scoped_week_count(deleted_user_id),
        "survivor_template_count": sql_count(f"SELECT COUNT(*) FROM workout_templates WHERE user_id = '{survivor_user_id}'"),
        "survivor_entry_count": sql_count(f"SELECT COUNT(*) FROM workout_entries WHERE user_id = '{survivor_user_id}'"),
        "survivor_split_count": sql_count(f"SELECT COUNT(*) FROM splits WHERE user_id = '{survivor_user_id}'"),
        "survivor_programme_count": scoped_programme_count(survivor_user_id),
        "survivor_block_count": scoped_block_count(survivor_user_id),
        "survivor_week_count": scoped_week_count(survivor_user_id),
    }


def response_items(response):
    if isinstance(response, dict):
        items = response.get("items")
        if items is not None:
            return items

    return response


def cleanup_complete(snapshot):
    return (
        response_items(snapshot["deleted_templates"]) == []
        and response_items(snapshot["deleted_entries"]) == []
        and response_items(snapshot["deleted_splits"]) == []
        and len(response_items(snapshot["survivor_templates"])) == 1
        and len(response_items(snapshot["survivor_entries"])) == 1
        and len(response_items(snapshot["survivor_splits"])) == 1
        and snapshot["deleted_me_status"] in {401, 403}
        and snapshot["deleted_template_count"] == 0
        and snapshot["deleted_entry_count"] == 0
        and snapshot["deleted_split_count"] == 0
        and snapshot["deleted_programme_count"] == 0
        and snapshot["deleted_block_count"] == 0
        and snapshot["deleted_week_count"] == 0
        and snapshot["survivor_template_count"] == 1
        and snapshot["survivor_entry_count"] == 1
        and snapshot["survivor_split_count"] == 1
        and snapshot["survivor_programme_count"] == 1
        and snapshot["survivor_block_count"] == 1
        and snapshot["survivor_week_count"] == 4
    )


def assert_eventual_cleanup(deleted_token, survivor_token, deleted_user_id, survivor_user_id):
    deadline = time.time() + 60
    last_error = None

    while time.time() < deadline:
        try:
            snapshot = fetch_cleanup_snapshot(
                deleted_token,
                survivor_token,
                deleted_user_id,
                survivor_user_id,
            )

            if cleanup_complete(snapshot):
                return

            last_error = snapshot
        except Exception as exc:  # pragma: no cover - smoke debugging
            last_error = str(exc)

        time.sleep(2)

    raise AssertionError(f"Timed out waiting for workout cleanup propagation: {last_error}")


def main():
    suffix = str(int(time.time()))

    deleted_username = f"delete_target_{suffix}"
    survivor_username = f"survivor_{suffix}"

    deleted_token = register_user(deleted_username)
    survivor_token = register_user(survivor_username)

    _, deleted_me = api_request("GET", "/auth/user/me", token=deleted_token, expected_status=200)
    _, survivor_me = api_request("GET", "/auth/user/me", token=survivor_token, expected_status=200)

    deleted_user_id = get_auth_user_id(deleted_me["username"])
    survivor_user_id = get_auth_user_id(survivor_me["username"])

    seed_user_workout_data(deleted_token, "Delete Target")
    seed_user_workout_data(survivor_token, "Survivor")

    api_request("DELETE", "/auth/user/delete", token=deleted_token, expected_status=200)
    assert_eventual_cleanup(deleted_token, survivor_token, deleted_user_id, survivor_user_id)
    print("User deletion propagation smoke passed")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
