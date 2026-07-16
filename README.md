# Dedicate

Dedicate is a workout tracking app with a React frontend, a Spring Cloud Gateway, and separate auth and workout Spring Boot services. The repo is set up for local Docker-based development first, with service-level docs and ops runbooks linked below.

## Quick Start

1. Copy `ops/local/.env.example` to `ops/local/.env`.
2. Start the local stack:

```bash
cd ops/local
docker compose --env-file .env up -d --build
```

3. Start the frontend with `cd frontend && npm install && npm run dev`.
4. Use the default same-origin `/api/` proxy for local browser work, or set `VITE_API_URL=http://localhost:8080` if you want the frontend to talk to the gateway directly.

The exercise catalog seed is optional. The third-party Kaggle CSV is not committed to this repo and is only needed when you want to seed `exercise_info`.

## Optional Exercise Catalog Seed

1. Download `gym_exercise_dataset.csv` from the [Kaggle dataset page](https://www.kaggle.com/datasets/rishitmurarka/gym-exercises-dataset).
2. Place it at `ops/seed/data/gym_exercise_dataset.csv`.
3. Copy `ops/seed/.env.example` to `ops/seed/.env`.
4. Run the one-shot seeder:

```bash
cd ops/seed
docker compose --env-file .env up exercise-info-seeder
```

## Repo Map

- `frontend/` contains the React 19 + Vite app.
- `gateway/` contains the Spring Cloud Gateway edge service.
- `auth-service/` contains authentication, JWT, MFA, and trusted-device logic.
- `workout_service/` contains workout logging, templates, periodisation, and analytics.
- `ops/` contains local, app, DB, and seed compose stacks plus helper scripts.
- `docs/` contains lightweight architecture and API notes.

## Common Workflows

- [Ops runbook](ops/README.md)
- [Architecture overview](docs/architecture.md)
- [API notes](docs/api-notes.md)
- [Frontend guide](frontend/README.md)
- [Auth service guide](auth-service/README.md)
- [Workout service guide](workout_service/README.md)
