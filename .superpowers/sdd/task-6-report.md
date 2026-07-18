# Task 6 Report: Remove entries dependency from `useAnalysisExerciseOptions`

## Status: ✅ Complete

## Changes

### `frontend/src/features/analysis/hooks/useAnalysis.ts`
- Removed import of `useAllWorkoutEntries` and `WorkoutEntry` type
- Removed `TemplateUsageSummary` type, `buildTemplateUsageSummary`, and the old `compareOptions` (with usage-frequency logic)
- Simplified `buildAnalysisExerciseOptions` — no `workoutEntries` parameter, uses alphabetical comparison for dedup
- Simplified `useAnalysisExerciseOptions` — no `useAllWorkoutEntries()` call, loads from templates only

### `frontend/tests/unit/hooks/workout/useAnalysis.test.tsx`
- Removed `workoutEntriesMock` and `vi.mock` for `useWorkoutEntries`
- Replaced single usage-frequency test with 5 tests:
  - Alphabetical sort by exercise name → variant → template name
  - Dedup by exercise definition ID (keeps alphabetically first)
  - Skips exercises without focus
  - Skips exercises without definition ID
  - Returns loading state from templates query

## Verification

| Test Suite | Result |
|---|---|
| `useAnalysis.test.tsx` (5 tests) | ✅ Pass |
| `AnalysisTab.test.tsx` (10 tests) | ✅ Pass |
| All hook tests (23 files, 80 tests) | ✅ Pass |

## Commit

`e21e2db` — `refactor: remove expensive useAllWorkoutEntries from useAnalysisExerciseOptions, sort alphabetically`
