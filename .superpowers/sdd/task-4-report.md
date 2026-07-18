# Task 4 Report — Backend Controller Tests for by-exercise Endpoint

## Steps completed

1. ✅ Read the existing test file at `workout_service/src/test/java/com/louisfiges/workout/controller/core/WorkoutEntryControllerTest.java`
2. ✅ Added two test methods:
   - `getByExercise()` — verifies `GET /workout-entries/by-exercise?exerciseDefinitionId=...` calls `service.getAllByExerciseDefinition()` and returns 200
   - `getByExerciseUnauthenticated()` — verifies the same endpoint returns 401 without a JWT
3. ✅ Ran `gradlew.bat test --tests "*WorkoutEntryControllerTest"` — **BUILD SUCCESSFUL** (4 tests total)
4. ✅ Committed

## Result

All 4 controller tests pass (2 existing + 2 new). The build is green.
