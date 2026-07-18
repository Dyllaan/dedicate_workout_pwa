### Task 5 Report: Wire InolCalculator into WorkoutEntryService

**Status**: Complete

**Commits**: `757f4e3` — `feat: wire InolCalculator into WorkoutEntryService save flow`

**Files changed (7)**:

| File | Action |
|------|--------|
| `WorkoutInolDTO.java` | Created — per-exercise INOL DTO record |
| `WorkoutEntryInolDTO.java` | Created — aggregate INOL DTO with total + perExercise |
| `WorkoutEntryDTO.java` | Modified — added `WorkoutEntryInolDTO inol` field |
| `WorkoutEntryMapper.java` | Modified — injected `WorkoutInolRepository`, populates INOL in `toDTO()` |
| `WorkoutEntryService.java` | Modified — injected `InolCalculator`, calls `computeAndPersist()` after create/update |
| `WorkoutEntryControllerTest.java` | Modified — added `null` inol param to 2 `WorkoutEntryDTO` constructor calls |
| `WorkoutEntryServiceTest.java` | Modified — added `@Mock` for `InolCalculator`/`WorkoutInolRepository`, moved mapper construction into `@BeforeEach` |

**Test summary**:
- `WorkoutEntryServiceTest` — PASS
- `WorkoutEntryControllerTest` — PASS (3/3)
- `InolCalculatorTest` — PASS
- 22 pre-existing failures remain (all `NoSuchBeanDefinitionException` / `IllegalStateException` Spring context load issues unrelated to this task)

**Concerns**: None. The 22 pre-existing failures are all Spring context bootstrap issues (missing bean definitions in migration/integration tests) that predate this task. No regressions introduced.

**Report path**: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\.superpowers\sdd\task-5-report.md`
