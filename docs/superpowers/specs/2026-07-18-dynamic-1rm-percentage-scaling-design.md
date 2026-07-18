# Dynamic 1RM Percentage Scaling

**Date:** 2026-07-18
**Status:** In Design
**Approach:** Backend endpoint with RPE-to-%-mapped auto-calculated intensity

## Goal

Replace hardcoded weight targets in periodised training with percentage-of-1RM prescriptions. Each week in a block auto-derives an intensity percentage from the block's RPE and rep range parameters. Focus exercises get dynamically computed target weights (rounded to nearest 2.5kg) based on the user's estimated 1RM from the best set within the current block.

## Non-Goals

- Per-exercise percentage overrides (all focus exercises share the week's derived intensity)
- Manual 1RM entry or testing mode (fully auto-estimated)
- Historical 1RM tracking or PR tables (noted for future)
- Changing how accessory exercises are prescribed (remain RPE-based)
- Storing `targetIntensityPct` in the database (it is always derived)

## Sections

### 1. RPE-to-Percentage Lookup Table

A constant table mapping `(reps, RPE)` to `% of 1RM`. Sources: well-established powerlifting RPE charts (Mike Tuchscherer / Reactive Training Systems).

Implemented as a Java `static final` constant in the forecast service and a TypeScript constant for any client-side display validation. Both implementations must be in sync.

Coverage: reps 1-15, RPE 6.0-10.0 in 0.5 increments. Missing values interpolated linearly from nearest known points.

### 2. Intensity Percentage Derivation

**Inputs (from Block and Week):**
- `block.repRangeMin`, `block.repRangeMax`
- `block.targetRpeMin`, `block.targetRpeMax`
- `week.weekNumber`
- `block.durationWeeks` (total weeks)
- `week.deload`

**Algorithm (for a non-deload week):**
1. Compute fraction `t = max(0, (weekNumber - 1) / (durationWeeks - 1))` — position in the block (0 = start, 1 = end). If `durationWeeks == 1`, `t = 0`.
2. Interpolated reps = `round(repRangeMax - t * (repRangeMax - repRangeMin))`
3. Interpolated RPE = `targetRpeMin + t * (targetRpeMax - targetRpeMin)`, rounded to 1 decimal
4. Look up `(reps, RPE)` in the table to get `intensityPct`
5. Round `intensityPct` to 0.5 precision

**Deload weeks:**
- Reps = `repRangeMin`
- RPE = capped at 6.0
- Use standard table lookup with those values

**No-op fallback:**
- If `block` or `week` is null (no active programme), no percentages are computed

### 3. 1RM Estimation Engine

**Which sets to consider:**
- All `SetEntry` records for a given exercise definition, within the current block (effective date range = `Block.startDate` through `Block.startDate + durationWeeks * 7 days`)
- If zero sets exist in the current block: fall back to the previous block's best set (use the single best set across the entire previous block). The "previous block" is the block with the highest `blockOrder` less than the current block's `blockOrder` within the same programme.
- If no previous block exists: return `null` (no 1RM estimate available yet)

**Formula:**
- Compute all three estimates (Epley, Brzycki, Lombardi) using existing formulas
- Take the **median** of the three (more robust than the current `average` used in Results.tsx)
- Select the set with the highest median estimate

**Rounding:**
- Estimated 1RM rounded to nearest 2.5kg
- Target weight = `estimated1RM * intensityPct / 100`, rounded to nearest 2.5kg

### 4. API Endpoint

**`GET /analysis/forecast/week/{weekId}`**

**Authentication:** Required (JWT).

**Resolution chain:** Week → Block → Programme → Split → WorkoutTemplates → ExerciseConfigs (filtered: `focus = true`)

**Response (200):**
```json
{
  "weekId": "uuid",
  "blockId": "uuid",
  "blockName": "Strength Block",
  "weekNumber": 3,
  "deload": false,
  "intensityPct": 87.0,
  "insights": [
    {
      "exerciseDefinitionId": "uuid",
      "exerciseName": "Bench Press",
      "estimatedOneRmKg": 102.5,
      "targetWeightKg": 90.0,
      "targetReps": 3,
      "targetRpe": 8.3,
      "source": "CURRENT_BLOCK",
      "bestSet": {
        "reps": 3,
        "weightKg": 95.0,
        "setDate": "2026-07-15T10:30:00Z"
      }
    }
  ]
}
```

**`source` enum:** `CURRENT_BLOCK` | `PREVIOUS_BLOCK` | `NO_DATA`

**Error cases:**
- 404: Week not found
- 200 with empty `insights[]` if no active programme for this week
- 400: Week not linked to a programme

**Performance considerations:**
- Single query to fetch all relevant set entries for all focus exercises across the block (one round trip)
- In-memory ranking/selection per exercise
- Response size bounded by number of focus exercises per split (typically 3-5)

### 5. Backend Implementation Units

#### 5a. `RpePercentageLookup` (new, `analysis/` package)

```java
// Static utility class
class RpePercentageLookup {
    static double getIntensityPct(int reps, double rpe);
    // Pre-populated Map<String, Double> keyed on "reps-rpe"
    // Handles boundary clamping and interpolation
}
```

#### 5b. `ForecastEngine` (new service, `analysis/` package)

```java
@Service
class ForecastEngine {
    ForecastResponse generateForecast(Week week);

    // Internal:
    double deriveIntensityPct(Block block, Week week);
    Optional<OneRmResult> estimateOneRm(UUID exerciseDefinitionId, Block block);
    List<ExerciseConfig> getFocusExercises(Week week);
}
```

Depends on: `WorkoutEntryRepository` (new query method), `BlockRepository`, `ProgrammeRepository`.

#### 5c. Repository additions

New method on `WorkoutEntryRepository`:

```java
@Query("SELECT se FROM SetEntry se " +
       "JOIN se.exerciseEntry ee " +
       "JOIN ee.workoutEntry we " +
       "WHERE ee.exerciseDefinition.id = :exerciseDefId " +
       "AND we.createdAt BETWEEN :blockStart AND :blockEnd " +
       "ORDER BY (se.weight * (1 + se.reps / 30.0)) DESC")
List<SetEntry> findBestSetsForExerciseInBlock(
    UUID exerciseDefId, Instant blockStart, Instant blockEnd, Pageable pageable);
```

Uses `Pageable` with limit=1 for the top set. The ORDER BY uses the Epley formula directly in SQL for efficiency (the service layer then cross-checks all three formulas on the top-N sets, e.g., top 5, for robustness).

#### 5d. Controller addition

New method on `AnalysisController`:

```java
@GetMapping("/analysis/forecast/week/{weekId}")
ResponseEntity<ForecastResponse> getWeekForecast(@PathVariable UUID weekId);
```

Standard JWT auth via `@CurrentUserId`.

### 6. Frontend Changes

#### 6a. WeekCard — Display derived intensity %

**File:** `features/periodisation/week/components/WeekCard.tsx`

- Remove existing RPE override UI for weeks where intensity is auto-derived (deload weeks keep RPE UI)
- Show derived intensity percentage as a read-only badge: "87.0% 1RM"
- Include interpolation details in a tooltip: "Based on rep range 3-5 @ RPE 7-9, week 3/4"

#### 6b. LogSetsPanel — Show computed target weight

**File:** `features/workout/entries/components/LogSetsPanel.tsx`

- Detect if current exercise is a focus exercise and current week has an active programme
- Fetches `GET /analysis/forecast/week/{weekId}` via React Query: `useWeekForecast(weekId)`
- Contextual banner above the set entry fields showing target weight, target reps, and percentage
- If `source = "NO_DATA"`: show "Log a few sets this block to calibrate your 1RM"
- If no active programme: hide the banner entirely, fall back to existing behavior

#### 6c. React Query integration

**New query key:** `queryKeys.analysis.forecast(weekId)` in `api/queryKeys.ts`

**New hook:** `useWeekForecast(weekId)` — thin wrapper around `useQuery` with:
- Stale time: 5 minutes
- Invalidation on: `queryKeys.workouts.entries()` (any workout entry change refreshes forecasts)

#### 6d. Type definitions

**New frontend types** in `features/insights/types/Insights.ts`:

```typescript
type ForecastInsight = {
  exerciseDefinitionId: string;
  exerciseName: string;
  estimatedOneRmKg: number | null;
  targetWeightKg: number | null;
  targetReps: number;
  targetRpe: number;
  source: "CURRENT_BLOCK" | "PREVIOUS_BLOCK" | "NO_DATA";
  bestSet: {
    reps: number;
    weightKg: number;
    setDate: string;
  } | null;
};

type WeekForecast = {
  weekId: string;
  blockId: string;
  blockName: string;
  weekNumber: number;
  deload: boolean;
  intensityPct: number;
  insights: ForecastInsight[];
};
```

### 7. Block Boundaries for "Previous Block" Fallback

A block's effective date range:
- `block.startDate` (may be null if programme hasn't started)
- If `startDate` is null and the programme's `startDate` is set, the block's effective start is computed from programme start + sum of previous block durations
- End date = start date + (`block.durationWeeks * 7 days`) - 1 day

For "previous block" fallback: find the block in the same programme with the highest `blockOrder` less than the current block's `blockOrder`. Use its full date range.

If no block (including current) has a resolvable date range (startDate is null and programme startDate is null), return NO_DATA for all exercises.

## Execution Order

1. Backend: RPE lookup table + unit tests
2. Backend: Repository query method + integration tests
3. Backend: ForecastEngine service + unit tests
4. Backend: Forecast endpoint and response DTO + controller tests
5. Frontend: Types and React Query hook
6. Frontend: WeekCard intensity display
7. Frontend: LogSetsPanel target weight banner
8. Integration: End-to-end flow test

## Rollback Strategy

All changes are additive. No existing data model columns are removed or repurposed. The new endpoint can be removed without affecting existing functionality. The intensity percentage is derived at read time (not stored), so no migration.

## Future Considerations (Noted)

- Persisting computed target weights for historical analysis ("what was my prescribed vs actual weight?")
- Per-exercise intensity percentage overrides (e.g., squat at 85% while bench at 80% in the same week)
- 1RM history chart and PR tracking
- "Test day" mode: user marks a session as a true 1RM test, which anchors future estimates
- Autotune: adjust intensity % based on readiness check-in scores
