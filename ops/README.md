# Ops Runbook

Each stack now lives in its own folder so you can run `docker compose` without a `-f` argument:

- `ops/local/` for the local all-in-one stack
- `ops/dbs/` for bundled stateful services
- `ops/app/` for the production-style app/services stack
- `ops/seed/` for the one-shot exercise catalog seeder
- `ops/scripts/` for readiness and smoke scripts

## Local Stack

`ops/local/.env` is the private local-dev env file. If you need to recreate it, copy from `.env.example`.
You can also override the workout autotune load steps there with `WORKOUT_AUTOTUNE_BARBELL_INCREMENT_KG` and `WORKOUT_AUTOTUNE_DUMBBELL_INCREMENT_KG`; the local compose file falls back to `1.25` and `2.5` respectively when they are unset.

Bring up the full local stack used by CI and smoke tests:

```bash
cd ops/local
docker compose --env-file .env up -d --build
```

The local stack now includes Grafana and Loki. Grafana is exposed on `http://localhost:3000` by default, and the Loki datasource is provisioned automatically.

Stop it again:

```bash
cd ops/local
docker compose --env-file .env down
```

Use `docker compose --env-file .env down -v` only when you intentionally want to delete the local DB volumes and start from scratch.

Set `VITE_API_URL=http://localhost:8080` for the frontend to target the local gateway.
If you run the Vite dev server locally, the default `/api/` proxy already mirrors the production ingress split, so the override is only needed when you want to bypass that proxy.
The optional exercise catalog seeder is behind the `seed` profile, so a normal first run does not require the third-party dataset.

## Local CI Verification

Use the local CI runner to exercise the same broad flow we run before merging:

```powershell
powershell -File .\ops\scripts\run-local-ci.ps1
```

If you're already inside `ops\scripts`, you can run:

```powershell
.\run-local-ci.ps1
```

For faster targeted reruns:

```powershell
powershell -File .\ops\scripts\run-local-ci.ps1 -Mode smoke
powershell -File .\ops\scripts\run-local-ci.ps1 -ComposeEnvFile ops/local/.env
powershell -File .\ops\scripts\run-local-ci.ps1 -KeepStackRunning
powershell -File .\ops\scripts\run-local-ci.ps1 -ComposeEnvFile ops/local/.env -ComposeProjectName local
```

`-Mode smoke` reruns only the compose-backed smoke checks. `-ComposeEnvFile` lets you swap the generated CI-safe env copy for your own local stack env file.
`run-local-ci.ps1` now generates an isolated Compose project name by default, so its cleanup (`down -v`) does not wipe your usual `ops/local` volumes.
Use `-ComposeProjectName` only when you intentionally want CI commands to target a shared Compose project (for example `local`).
On Windows, the local runner requires a real Python install such as `python.exe`; Microsoft Store aliases like `python3.exe` in `WindowsApps` are not sufficient.

## Restore Prod Dumps Into Local

Use this flow when you want the local app stack to run against prod-derived auth and workout data.

The recommended path is the helper script, which keeps the volumes unless you explicitly ask for a wipe:

```bash
./ops/scripts/restore_local_dbs.sh
```

If you want to rebuild the local DB volumes before restoring, use:

```bash
./ops/scripts/restore_local_dbs.sh --wipe
```

If you need the manual steps instead, stop without deleting volumes, bring up only the Postgres containers, restore the dumps, then bring the full stack back up:

```bash
cd ops/local
docker compose --env-file .env down
docker compose --env-file .env up -d dedicate-auth-db dedicate-workout-db
docker run --rm --network local_default -e PGPASSWORD=local-auth-password -v "${PWD}/../../dump:/dump:ro" postgres:17 pg_restore --verbose --clean --if-exists --no-owner --no-privileges -h dedicate-auth-db -U auth_user -d auth /dump/dump.dump
docker run --rm --network local_default -e PGPASSWORD=local-workout-password -v "${PWD}/../../dump:/dump:ro" postgres:17 pg_restore --verbose --clean --if-exists --no-owner --no-privileges -h dedicate-workout-db -U workout_user -d workout /dump/workout.dump
docker compose --env-file .env up -d --build
```

## Dashboard Benchmarking

Use the local restored stack for repeatable dashboard perf checks.

Turn on SQL statement metrics before starting the stack:

```bash
cd ops/local
export SPRING_JPA_PROPERTIES_HIBERNATE_GENERATE_STATISTICS=true
export APP_PERF_REQUEST_METRICS_ENABLED=true
docker compose --env-file .env up -d --build
```

On Windows PowerShell, the equivalent is:

```powershell
cd ops/local
$env:SPRING_JPA_PROPERTIES_HIBERNATE_GENERATE_STATISTICS = "true"
$env:APP_PERF_REQUEST_METRICS_ENABLED = "true"
docker compose --env-file .env up -d --build
```

Run the direct endpoint benchmark against the restored gateway and workout data:

```powershell
pwsh ./ops/scripts/benchmark_dashboard.ps1 -Samples 25
```

The script writes `ops/reports/dashboard-benchmark-latest.json` and records:

- median and p95 latency for `/workout/dashboard/summary`
- median and p95 latency for `/workout/insights/dashboard`
- median and p95 latency for `/workout/analysis/training-insights/weekly-volume`
- median and p95 payload bytes
- median and p95 SQL statement counts from `X-SQL-Statement-Count`

The dashboard request fan-out budget is guarded separately by the mocked browser test:

```bash
cd frontend
npm run test:e2e -- workflows.mocked.spec.ts --grep "dashboard initial load stays within the lightweight request budget"
```

That check ensures the dashboard does not regress into fetching full splits, workout templates, workout entries, or a second meet-prep request during initial load.

## Bundled DB Stack

`ops/dbs/.env` is the private local-dev env file. If you need to recreate it, copy from `.env.example`.

Create or refresh the env file beside the compose file:

```bash
cd ops/dbs
cp .env.example .env
```

Start the bundled stateful services:

```bash
cd ops/dbs
docker compose --env-file .env up -d
```

## App Stack

Create a private env file beside the compose file:

```bash
cd ops/app
cp .env.example .env
```

Start the production-style application stack:

```bash
cd ops/app
docker compose --env-file .env up -d
```

The production-style stack includes the same observability services, so browser and backend logs land in Loki the same way in local and app deployments.

Public browser traffic should terminate at the `frontend` service. That container serves the SPA shell for deep links and proxies `/api/*` to the gateway.

## Seed Job

Create a private env file beside the compose file:

```bash
cd ops/seed
cp .env.example .env
```

Download `gym_exercise_dataset.csv` from the [Kaggle dataset page](https://www.kaggle.com/datasets/rishitmurarka/gym-exercises-dataset) and place it at `ops/seed/data/gym_exercise_dataset.csv`.

Seed the workout exercise catalog after the DB stack is healthy:

```bash
cd ops/seed
docker compose --env-file .env up exercise-info-seeder
```

If you already have the local stack running and want to use its optional seed profile instead:

```bash
cd ops/local
docker compose --profile seed --env-file .env up exercise-info-seeder
```

The local seed profile now mounts the whole `ops/seed/data/` directory instead of binding the CSV file directly. Place `gym_exercise_dataset.csv` in that folder before running the seed job.
