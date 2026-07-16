#!/usr/bin/env python3
"""Bump versions for selected deployable services."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, Iterable, Tuple

SEMVER_RE = re.compile(r"^\s*(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?\s*$")
GRADLE_VERSION_RE = re.compile(
    r"(?m)^(?P<prefix>\s*version\s*=\s*['\"])(?P<version>[^'\"]+)(?P<suffix>['\"].*)$"
)

SERVICE_CONFIG = {
    "auth-service": {"path": "auth-service/build.gradle", "kind": "gradle"},
    "gateway": {"path": "gateway/build.gradle", "kind": "gradle"},
    "workout_service": {"path": "workout_service/build.gradle", "kind": "gradle"},
    "frontend": {"path": "frontend/package.json", "kind": "package_json"},
}


class VersionBumpError(RuntimeError):
    """Raised when a service version cannot be read or updated."""


def parse_semver(raw_version: str) -> Tuple[int, int, int]:
    match = SEMVER_RE.match(raw_version)
    if not match:
        raise ValueError(f"Invalid version format: {raw_version!r}")
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


def format_semver(parts: Tuple[int, int, int]) -> str:
    return f"{parts[0]}.{parts[1]}.{parts[2]}"


def bump_semver(parts: Tuple[int, int, int], level: str) -> Tuple[int, int, int]:
    major, minor, patch = parts
    if level == "major":
        return major + 1, 0, 0
    if level == "minor":
        return major, minor + 1, 0
    if level == "patch":
        return major, minor, patch + 1
    raise ValueError(f"Unsupported bump level: {level}")


def read_version(service: str, file_path: Path, kind: str) -> str:
    if kind == "gradle":
        text = file_path.read_text(encoding="utf-8")
        match = GRADLE_VERSION_RE.search(text)
        if not match:
            raise VersionBumpError(f"Could not find version assignment in {file_path}")
        return match.group("version").strip()

    if kind == "package_json":
        data = json.loads(file_path.read_text(encoding="utf-8"))
        version = data.get("version")
        if not isinstance(version, str):
            raise VersionBumpError(f"Missing string version in {file_path}")
        return version.strip()

    raise VersionBumpError(f"Unsupported service kind for {service}: {kind}")


def write_version(service: str, file_path: Path, kind: str, new_version: str) -> None:
    if kind == "gradle":
        text = file_path.read_text(encoding="utf-8")
        new_text, replacements = GRADLE_VERSION_RE.subn(
            lambda match: f"{match.group('prefix')}{new_version}{match.group('suffix')}",
            text,
            count=1,
        )
        if replacements != 1:
            raise VersionBumpError(f"Could not update version assignment in {file_path}")
        file_path.write_text(new_text, encoding="utf-8")
        return

    if kind == "package_json":
        data = json.loads(file_path.read_text(encoding="utf-8"))
        data["version"] = new_version
        file_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        return

    raise VersionBumpError(f"Unsupported service kind for {service}: {kind}")


def bump_selected_services(
    repo_root: Path,
    services: Iterable[str],
    level: str,
) -> Dict[str, str]:
    updated_versions: Dict[str, str] = {}

    for service in services:
        if service not in SERVICE_CONFIG:
            raise VersionBumpError(f"Unknown service: {service}")

        config = SERVICE_CONFIG[service]
        file_path = repo_root / config["path"]
        if not file_path.exists():
            raise VersionBumpError(f"Version file not found for {service}: {file_path}")

        current = read_version(service, file_path, config["kind"])
        normalized_parts = parse_semver(current)
        bumped_parts = bump_semver(normalized_parts, level)
        new_version = format_semver(bumped_parts)

        write_version(service, file_path, config["kind"], new_version)
        updated_versions[service] = new_version

    return updated_versions


def parse_services_arg(raw_services: str) -> list[str]:
    if not raw_services.strip():
        return []
    services = [part.strip() for part in raw_services.split(",") if part.strip()]
    seen = set()
    ordered_unique = []
    for service in services:
        if service not in seen:
            ordered_unique.append(service)
            seen.add(service)
    return ordered_unique


def main() -> int:
    parser = argparse.ArgumentParser(description="Bump deployable versions for selected services")
    parser.add_argument("--level", choices=["major", "minor", "patch"], required=True)
    parser.add_argument("--services", default="", help="Comma-separated list of services")
    parser.add_argument("--repo-root", default=".", help="Repository root path")
    parser.add_argument("--output-json", default="", help="Optional path for JSON output")
    args = parser.parse_args()

    services = parse_services_arg(args.services)
    repo_root = Path(args.repo_root).resolve()

    if not services:
        print("No services selected; nothing to bump.")
        result = {}
    else:
        result = bump_selected_services(repo_root=repo_root, services=services, level=args.level)
        for service, version in result.items():
            print(f"{service} -> {version}")

    if args.output_json:
        output_path = Path(args.output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, sort_keys=True), encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())