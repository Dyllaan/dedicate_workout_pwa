#!/usr/bin/env python3
import json
import shutil
import sys
import unittest
import uuid
from contextlib import contextmanager
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import bump_versions


class BumpVersionsTest(unittest.TestCase):
    def test_parse_semver_normalizes_snapshot_and_release(self):
        self.assertEqual((2, 0, 0), bump_versions.parse_semver("2.0.0-SNAPSHOT"))
        self.assertEqual((2, 0, 0), bump_versions.parse_semver("2.0.0-RELEASE"))

    def test_bump_math(self):
        self.assertEqual((3, 0, 0), bump_versions.bump_semver((2, 4, 9), "major"))
        self.assertEqual((2, 5, 0), bump_versions.bump_semver((2, 4, 9), "minor"))
        self.assertEqual((2, 4, 10), bump_versions.bump_semver((2, 4, 9), "patch"))

    def test_only_targeted_services_are_modified(self):
        with self._workspace_tmp_dir() as root:
            self._write_fixture_files(root)

            updated = bump_versions.bump_selected_services(
                repo_root=root,
                services=["auth-service", "frontend"],
                level="minor",
            )

            self.assertEqual({"auth-service": "2.1.0", "frontend": "3.1.0"}, updated)

            auth_text = (root / "auth-service/build.gradle").read_text(encoding="utf-8")
            gateway_text = (root / "gateway/build.gradle").read_text(encoding="utf-8")
            workout_text = (root / "workout_service/build.gradle").read_text(encoding="utf-8")
            frontend_data = json.loads((root / "frontend/package.json").read_text(encoding="utf-8"))

            self.assertIn("version = '2.1.0'", auth_text)
            self.assertIn("version = '2.0.0-SNAPSHOT'", gateway_text)
            self.assertIn("version = '1.9.9'", workout_text)
            self.assertEqual("3.1.0", frontend_data["version"])

    def test_noop_when_no_services_selected(self):
        with self._workspace_tmp_dir() as root:
            self._write_fixture_files(root)

            updated = bump_versions.bump_selected_services(
                repo_root=root,
                services=[],
                level="patch",
            )

            self.assertEqual({}, updated)
            auth_text = (root / "auth-service/build.gradle").read_text(encoding="utf-8")
            self.assertIn("version = '2.0.0-RELEASE'", auth_text)

    @staticmethod
    def _write_fixture_files(root: Path) -> None:
        (root / "auth-service").mkdir(parents=True, exist_ok=True)
        (root / "gateway").mkdir(parents=True, exist_ok=True)
        (root / "workout_service").mkdir(parents=True, exist_ok=True)
        (root / "frontend").mkdir(parents=True, exist_ok=True)

        (root / "auth-service/build.gradle").write_text(
            "plugins {}\nversion = '2.0.0-RELEASE'\n",
            encoding="utf-8",
        )
        (root / "gateway/build.gradle").write_text(
            "plugins {}\nversion = '2.0.0-SNAPSHOT'\n",
            encoding="utf-8",
        )
        (root / "workout_service/build.gradle").write_text(
            "plugins {}\nversion = '1.9.9'\n",
            encoding="utf-8",
        )
        (root / "frontend/package.json").write_text(
            json.dumps({"name": "frontend", "version": "3.0.0"}, indent=2) + "\n",
            encoding="utf-8",
        )

    @staticmethod
    @contextmanager
    def _workspace_tmp_dir():
        base = SCRIPT_DIR / ".tmp-bump-tests"
        base.mkdir(parents=True, exist_ok=True)
        root = base / f"case-{uuid.uuid4().hex}"
        root.mkdir(parents=True, exist_ok=True)
        try:
            yield root
        finally:
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
