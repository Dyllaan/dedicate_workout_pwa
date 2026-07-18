# Task 5 Report — Frontend `useExerciseHistory` refactor

## Summary
Refactored `useExerciseHistory` hook to call the new `/workout-entries/by-exercise` endpoint (plain `WorkoutEntry[]`), with `limit`/`startDate`/`endDate` as client-side filters. Updated tests accordingly.

## Files changed
- `frontend/src/features/workout/exercise-definitions/hooks/useExerciseHistory.ts`
- `frontend/tests/unit/hooks/useExerciseHistory.test.tsx`

## Hook changes
| Before | After |
|---|---|
| Called `/workout-entries/recent` or `/workout-entries/date-range` | Calls `/workout-entries/by-exercise?exerciseDefinitionId=<id>` |
| Used `buildPageParams`, `clampPageSize`, `PagedResponse` | Removed these imports |
| Query key included `limit`, `startDate`, `endDate` | Query key simplified to `['exercise-history', targetExerciseDefinitionId]` |
| `staleTime: 0` | `staleTime: 5 * 60 * 1000` |
| `workoutEntries = Array.isArray(data) ? data : data?.items ?? []` | `workoutEntries` computed via `useMemo` with client-side filter/slice logic |
| Filtering done server-side via pagination params | `limit` slices, `startDate`/`endDate` filter by `createdAt` comparison |

## Test changes
- Removed `pageResponse` helper (was wrapping data in `PagedResponse` shape)
- Mock returns plain `WorkoutEntry[]` arrays directly
- Added endpoint-verification test checking `workoutApi.get` was called with `"/workout-entries/by-exercise"` and `params: { exerciseDefinitionId: "definition-bench" }`

## Test results
```
✓ tests/unit/hooks/useExerciseHistory.test.tsx (4 tests) 260ms
Test Files  1 passed (1)
     Tests  4 passed (4)
```

## Commit
```
eeed3ee refactor: useExerciseHistory calls new by-exercise endpoint, drops fragile recent-filter pattern
```
