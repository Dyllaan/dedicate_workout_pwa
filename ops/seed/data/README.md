# Local Seed Data

This folder is for local-only seed assets that should not be committed to the repo.

## Exercise Catalog CSV

1. Download `gym_exercise_dataset.csv` from the [Kaggle dataset page](https://www.kaggle.com/datasets/rishitmurarka/gym-exercises-dataset).

2. Place the file in this folder with the exact name:

`ops/seed/data/gym_exercise_dataset.csv`

3. Run the seed job from `ops/seed/`:

```bash
docker compose --env-file .env up exercise-info-seeder
```
