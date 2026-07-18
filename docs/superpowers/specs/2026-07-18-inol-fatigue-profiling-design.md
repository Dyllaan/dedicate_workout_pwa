# Fatigue & Stress Profiling (INOL)

**Date:** 2026-07-18
**Status:** In Design
**Approach:** Backend-persisted per-exercise INOL with block-aware 1RM resolution and carry-forward fallback

## Goal

Implement the Intensity Number of Lifts (INOL) calculation to quantify systemic stress per lift and per workout. INOL = Reps / (100 - Intensity %), summed across sets. Display INOL retrospectively in workout history (per-exercise + total) and as a weekly cumulative indicator on the dashboard. Persist INOL scores in a new database table, computed synchronously at workout entry save time.

## Non-Goals

- Live INOL display during workout logging
- Per-set INOL granularity (aggregated to exercise-level)
- INOL influencing training recommendations (read-only metric, initially)
- Stress metrics for exercises without a resolved 1RM reference
- Multi-block 1RM history or PR tables (reuses existing ForecastEngine resolution)

## Sections

### 1. Data Model

New entity `WorkoutInol` in `workout_service`:

```
workout_inol
├── id (UUID, PK, auto-generated)
├── user_id (VARCHAR, NOT NULL, indexed)
├── workout_entry_id (UUID, FK → workout_entries.id, NOT NULL, indexed)
├── exercise_entry_id (UUID, FK → exercise_entries.id, NULLABLE)
├── exercise_name (VARCHAR, NOT NULL, denormalized for display)
├── inol_score (DECIMAL(6,2), NOT NULL)
├── reference_1rm_kg (DECIMAL(6,1), NOT NULL)
├── block_id (UUID, FK → blocks.id, NULLABLE)
├── carry_forward (BOOLEAN, NOT NULL, DEFAULT FALSE)
├── created_at (TIMESTAMP, NOT NULL, DEFAULT now)
```

- One row per exercise per workout entry
- Workout total INOL = `SUM(inol_score)` grouped by `workout_entry_id`
- Cascading delete: when `workout_entry` is deleted, associated INOL rows are deleted
- `carry_forward` = true when the reference 1RM came from a previous block fallback
- `exercise_entry_id` is nullable for exercises logged without a formal exercise definition

Flyway migration: new versioned migration file (e.g. `V35__create_workout_inol.sql`).

### 2. Reference 1RM Resolution — BlockAwareOneRmService

Extract block-aware 1RM resolution from `ForecastEngine` into a shared service.

**Existing logic** (in `ForecastEngine.java:179-204`):
- Queries `WorkoutEntryRepository.findBestSetsForExerciseInBlock()` with block date range
- Gets top 5 sets, iterates to find best median (Epley/Brzycki/Lombardi)
- Returns `Optional<OneRmResult>(epley, bryzycki, lombardi, bestSet, setDate)`

**New shared service: `BlockAwareOneRmService`**

```java
@Service
@Transactional(readOnly = true)
class BlockAwareOneRmService {
    Optional<OneRmResult> resolveOneRm(UUID exerciseDefId, UUID userId);

    // Internal:
    // 1. ActiveBlockContextResolver.resolve(userId) → current block
    // 2. Resolve block date range (from ForecastEngine.resolveEffectiveDateRange)
    // 3. Query findBestSetsForExerciseInBlock for current block
    // 4. If no results → findPreviousBlock() → query that block's range
    // 5. If still no results → Optional.empty()
}
```

**Refactoring impact on `ForecastEngine`:**
- `estimateOneRm()` moves to `BlockAwareOneRmService` (becomes public)
- `findPreviousBlock()` moves to `BlockAwareOneRmService`
- `BlockDateRange` record moves to shared location
- `OneRmResult` record moves to shared location
- `ForecastEngine` gets `BlockAwareOneRmService` injected and delegates

**No change to:** `ActiveBlockContextResolver`, `WorkoutEntryRepository.findBestSetsForExerciseInBlock()`, `StrengthCalculator` — all reused as-is.

### 3. INOL Computation — InolCalculator

New service, called synchronously after `WorkoutEntry` is saved:

```java
@Service
@Transactional
class InolCalculator {
    void computeAndPersist(WorkoutEntry entry, UUID userId);
}
```

**Algorithm per exercise in the entry:**
1. Resolve exercise definition (may be null for custom exercises)
2. Call `blockAwareOneRmService.resolveOneRm(exerciseDefId, userId)`
3. If no 1RM → skip exercise, do not create INOL row
4. For each set with weight > 0:
   - `intensityPct = (weight / reference1rm) * 100`
   - Clamp `intensityPct` to [1, 99] — avoid division by near-zero
   - `setInol = reps / (100.0 - intensityPct)`
5. `exerciseInol = SUM(setInol)`
6. Persist one `WorkoutInol` row

**Edge cases:**
- Sets with `weight = null` or `0`: skipped
- `intensityPct >= 99.5`: treated as 99 to cap set INOL at `reps / 1.0`
- Bodyweight-only exercises with no weight logged: skipped
- No active block/programme: uses best e1RM from current workout entry's own sets
- Previous block fallback: sets `carry_forward = true`

**Invocation point:** In `WorkoutEntryService` save flow, after persisting the entity graph. Same transaction.

### 4. API Changes

#### 4a. Extended workout entry response

Add `inol` field to workout entry response DTO:

```json
{
  "id": "...",
  "exercises": [...],
  "inol": {
    "total": 1.85,
    "perExercise": [
      {
        "id": "uuid",
        "exerciseName": "Bench Press",
        "inolScore": 0.75,
        "reference1RmKg": 100.0,
        "carryForward": false
      }
    ]
  }
}
```

#### 4b. New dashboard endpoint

`GET /analysis/inol/weekly` — returns weekly cumulative INOL:

```json
{
  "totalInol": 3.45,
  "weekStart": "2026-07-13T00:00:00Z",
  "zone": "MODERATE",
  "perExercise": [
    { "exerciseName": "Bench Press", "totalInol": 1.20 },
    { "exerciseName": "Squat", "totalInol": 2.25 }
  ]
}
```

Weekly range: Monday 00:00 UTC to Sunday 23:59 UTC.

### 5. Frontend Changes

#### 5a. Workout history panel

**File:** `features/workout/components/panels/WorkoutEntriesPanel.tsx`

- Change `StatGrid` from `cols={2}` to `cols={3}`
- Add third `StatTile` with icon `Activity`, label "INOL", value `totalInol.toFixed(2)`
- Below each exercise entry, display INOL score next to volume

#### 5b. New dashboard card

**New file:** `features/dashboard/components/summary/WeeklyInolCard.tsx`

- Placed in `DashboardSummaryContainer` between `WeeklyWorkoutProgressCard` and `LiftSummaryCard`
- Horizontal color-coded bar: green (0–1), yellow (1–2), orange (2–3), red (3+)
- Card header: "Weekly Stress (INOL)" with total number
- Expandable per-exercise breakdown

#### 5c. Types

```typescript
type WorkoutInol = {
  id: string;
  exerciseName: string;
  inolScore: number;
  reference1RmKg: number;
  carryForward: boolean;
};

type WorkoutEntryInol = {
  total: number;
  perExercise: WorkoutInol[];
};

type WeeklyInol = {
  totalInol: number;
  weekStart: string;
  zone: "LOW" | "MODERATE" | "HIGH" | "VERY_HIGH";
  perExercise: { exerciseName: string; totalInol: number }[];
};
```

#### 5d. React Query

- `queryKeys.analysis.weeklyInol()` key
- New hook: `useWeeklyInol()` — stale time 10 minutes, invalidates on `queryKeys.workouts.entries()`

#### 5e. Stress zone coloring

```typescript
const INOL_ZONES = {
  VERY_LOW:  { max: 0.4,  color: "bg-slate-400",   label: "Recovery" },
  LOW:       { max: 1.0,  color: "bg-green-500",   label: "Low" },
  MODERATE:  { max: 2.0,  color: "bg-yellow-500",  label: "Moderate" },
  HIGH:      { max: 3.0,  color: "bg-orange-500",  label: "High" },
  VERY_HIGH: { max: Infinity, color: "bg-red-500", label: "Very High" },
};
```

### 6. Backend Implementation Units

#### 6a. Shared extraction: `BlockAwareOneRmService`
- Refactors `estimateOneRm()` and `findPreviousBlock()` out of `ForecastEngine`
- `ForecastEngine` delegates to `BlockAwareOneRmService`

#### 6b. New: `WorkoutInol` JPA entity + repository
- `WorkoutInolRepository` with `findByWorkoutEntryId`, `findByUserIdAndCreatedAtBetween`, `deleteByWorkoutEntryId`

#### 6c. New: `InolCalculator` service
- Depends on `BlockAwareOneRmService`, `WorkoutInolRepository`, `StrengthCalculator`

#### 6d. New: `WeeklyInolController` (or method on existing controller)
- `GET /analysis/inol/weekly` — returns `WeeklyInolResponse`

#### 6e. Migration
- `V35__create_workout_inol.sql` — `CREATE TABLE workout_inol` with FK constraints and `ON DELETE CASCADE`

### 7. Testing

#### Backend
- **`InolCalculatorTest`**: correct INOL per exercise with weights, skipped exercise with no block data, carry-forward flag, near-100% intensity cap, multiple exercises totals
- **`WeeklyInolControllerTest`**: returns weekly sum grouped correctly, empty when no workouts
- **Existing `ForecastEngineTest`**: updated for refactored dependency

#### Frontend
- **`WorkoutEntriesPanel.test.tsx`**: INOL StatTile renders with correct value
- **`WeeklyInolCard.test.tsx`**: color zone matches score, breakdown renders

### 8. Rollback Strategy

All changes are additive:
- New table `workout_inol` — can be dropped without affecting existing data
- New `inol` field on DTO responses — frontend handles missing field gracefully (optional)
- `BlockAwareOneRmService` extraction — internal refactor, no API contract change
- `ForecastEngine` public API unchanged

## Execution Order

1. Backend: Flyway migration `V35__create_workout_inol.sql`
2. Backend: `BlockAwareOneRmService` extraction + update `ForecastEngine` to delegate
3. Backend: `WorkoutInol` entity + repository
4. Backend: `InolCalculator` service + unit tests
5. Backend: Wire `InolCalculator` into `WorkoutEntryService` save flow
6. Backend: `WeeklyInol` endpoint + controller
7. Frontend: Types + `useWeeklyInol` hook
8. Frontend: `WorkoutEntriesPanel` INOL display
9. Frontend: `WeeklyInolCard` dashboard card
10. Integration: End-to-end flow test
11. Verification: lint + typecheck frontend, gradle test backend

## Future Considerations

- Live INOL estimation during workout logging
- Per-lift INOL history chart (trend over time)
- INOL-based autotune: adjust next workout's volume/intensity based on accumulated stress
- Weekly INOL target configuration (user-set cap)
- Exercise-specific stress weighting (deadlifts more fatiguing per INOL point than curls)
