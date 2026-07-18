# Task 4 Report: InolCalculator Service

## Status: COMPLETE

- **Commit:** d0fb5c0 — `feat: add InolCalculator service with tests`
- **Files created:**
  - `workout_service/src/main/java/com/louisfiges/workout/service/analysis/InolCalculator.java`
  - `workout_service/src/test/java/com/louisfiges/workout/service/analysis/InolCalculatorTest.java`

## Test Summary

3 tests, all passing (`BUILD SUCCESSFUL`):

| Test | Result |
|------|--------|
| `computesInolWhenOneRmAvailable` — computes INOL and persists when 1RM is available | PASS |
| `skipsWhenNoOneRm` — skips exercise when no reference 1RM is found | PASS |
| `skipsWhenNoDefinition` — skips exercise without exercise definition | PASS |

## Implementation Notes

- Followed the task brief algorithm exactly: median of 3 1RM formulas, INOL = reps / (100 - intensity%), clamped [1, 99]
- Uses `BlockAwareOneRmService.resolveOneRm()` (Task 2) and `WorkoutInolRepository.save()` (Task 3)
- Package-private `computeExerciseInol()` method for testability
- `block_id` set to null per spec; `carryForward` sourced from `OneRmResult`
- **Adaptation:** Test uses `ReflectionTestUtils.setField()` to set entity IDs since `ExerciseDefinition` and `WorkoutTemplate` lack public `setId()` setters

## Concerns

None.
