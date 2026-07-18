### Task 1: Flyway Migration — `workout_inol` Table

**Files:**
- Create: `workout_service/src/main/resources/db/migration/V36__create_workout_inol.sql`

**Interfaces:**
- Produces: `workout_inol` table with columns `id`, `user_id`, `workout_entry_id`, `exercise_entry_id`, `exercise_name`, `inol_score`, `reference_1rm_kg`, `block_id`, `carry_forward`, `created_at`

- [ ] **Step 1: Write the migration**

```sql
CREATE TABLE workout_inol (
    id BLOB(16) NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    workout_entry_id BLOB(16) NOT NULL,
    exercise_entry_id BLOB(16),
    exercise_name TEXT NOT NULL,
    inol_score REAL NOT NULL DEFAULT 0,
    reference_1rm_kg REAL NOT NULL DEFAULT 0,
    block_id BLOB(16),
    carry_forward BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workout_entry_id) REFERENCES workout_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_entry_id) REFERENCES exercise_entries(id) ON DELETE SET NULL,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE SET NULL
);

CREATE INDEX idx_workout_inol_user_id ON workout_inol(user_id);
CREATE INDEX idx_workout_inol_workout_entry_id ON workout_inol(workout_entry_id);
CREATE INDEX idx_workout_inol_user_created ON workout_inol(user_id, created_at);
```

- [ ] **Step 2: Commit**

```powershell
git add workout_service/src/main/resources/db/migration/V36__create_workout_inol.sql; git commit -m "feat: add workout_inol table migration"
```
