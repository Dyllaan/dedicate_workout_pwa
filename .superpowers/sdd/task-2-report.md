# Task 2 Report: Extract BlockAwareOneRmService from ForecastEngine

## Status: DONE

## Summary

Created `BlockAwareOneRmService` as a new shared Spring service and refactored `ForecastEngine` to delegate 1RM estimation, block resolution, and date range computation to it. Updated `ForecastEngineTest` to mock the new service.

## Changes

### Created
- `workout_service/src/main/java/com/louisfiges/workout/service/analysis/BlockAwareOneRmService.java`
  - Exposes `resolveOneRm()`, `estimateOneRm()`, `resolveEffectiveDateRange()`, `findPreviousBlock()` as public methods
  - Contains records `OneRmResult` (6 fields incl. carryForward) and `BlockDateRange`
  - Injected with `WorkoutEntryRepository`, `StrengthCalculator`, `ActiveBlockContextResolver`, `BlockRepository`

### Modified
- `workout_service/src/main/java/com/louisfiges/workout/service/analysis/ForecastEngine.java`
  - Removed direct `WorkoutEntryRepository` and `StrengthCalculator` dependencies
  - Constructor now takes only `BlockAwareOneRmService`
  - `buildInsights()` and `buildInsight()` delegate to `oneRmService` for all 1RM/block resolution
  - Removed methods: `estimateOneRm()`, `findPreviousBlock()`, `resolveEffectiveDateRange()`, `computeBlockStartFromProgramme()`, and records `BlockDateRange`, `OneRmResult`
  - Kept private `median()` helper (still used in `buildInsight()`)

- `workout_service/src/test/java/com/louisfiges/workout/service/analysis/ForecastEngineTest.java`
  - Replaced `@Mock WorkoutEntryRepository` with `@Mock BlockAwareOneRmService oneRmService`
  - Constructor changed to `new ForecastEngine(oneRmService)`
  - All tests mock `oneRmService.estimateOneRm()` (5 params: exerciseDefId, userId, start, end, carryForward) instead of `workoutEntryRepository.findBestSetsForExerciseInBlock()`
  - `noDataWhenNoBlockDates`: mocks `resolveEffectiveDateRange` to return null
  - `fallsBackToPreviousBlock`: mocks both estimateOneRm calls to return null, `findPreviousBlock` returns a block

## Test Results

All 4 ForecastEngine tests pass:
- `returns NO_DATA when block has no resolvable dates`
- `computes e1RM and target weight from current block sets`
- `falls back to previous block when current block has no sets`
- `only returns focus exercises`

## Commit

`c86f99b` - refactor: extract BlockAwareOneRmService from ForecastEngine

## Concerns

None.
