# Workout Service

The workout service owns workout logging, templates, periodisation, dashboard summaries, and exercise analysis for Dedicate.

## Responsibilities

- Workout entries and set history
- Workout templates and splits
- Programmes, blocks, and weeks
- Dashboard and progress analytics
- Exercise matching and muscle heatmap data

All routes are served under `/workout/**` through the gateway.

## Local Workflow

The easiest way to run this service is through the root compose stack in `ops/local/`.

Useful standalone commands from this directory:

```bash
./gradlew test
./gradlew bootRun
```

## Pagination

Most list endpoints now use a shared page-based response envelope:

- `page` is zero-based
- `size` defaults to `10`
- `size` is capped at `25`
- responses include `items`, `page`, `size`, `totalItems`, `totalPages`, `hasNext`, and `hasPrevious`

Small reference lists such as preset names and categories remain plain arrays. The readiness history response keeps its summary fields and nests the paged point list under `points`.

## Exercise Catalog Seed

The exercise catalog seed uses a third-party Kaggle CSV that is not committed to this repo. When you need to populate `exercise_info`, place `gym_exercise_dataset.csv` in `ops/seed/data/` and follow the seeder steps in [the ops runbook](../ops/README.md).
