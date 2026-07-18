### Task 6: Frontend — Remove entries dependency from `useAnalysisExerciseOptions`

**Files:**
- Modify: `frontend/src/features/analysis/hooks/useAnalysis.ts`
- Modify: `frontend/tests/unit/hooks/workout/useAnalysis.test.tsx`

**Interfaces:**
- Produces: `useAnalysisExerciseOptions()` → same `{ options, isLoading, error, refetch }` shape, but options sorted alphabetically (no usage-frequency sort)

- [ ] **Step 1: Update the test**

Replace `frontend/tests/unit/hooks/workout/useAnalysis.test.tsx` with a new version that:
- Only mocks `useAllWorkoutTemplates` (NOT `useAllWorkoutEntries`)
- Tests alphabetical sorting by name/variant/template
- Tests that exercises without focus or definition ID are skipped
- Does NOT test usage-frequency sorting (that's being removed)

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run tests/unit/hooks/workout/useAnalysis.test.tsx
```

Expected: Tests FAIL — the mock setup still references removed `useAllWorkoutEntries` import

- [ ] **Step 3: Refactor the hook**

In `frontend/src/features/analysis/hooks/useAnalysis.ts`:
- Remove import of `useAllWorkoutEntries` from `@/features/workout/entries/hooks/useWorkoutEntries`
- Remove import of `WorkoutEntry` type from `@/features/workout/types/Workout`
- Remove the `buildTemplateUsageSummary` function
- Remove the `compareOptions` function
- Replace `buildAnalysisExerciseOptions` to not depend on `workoutEntries`:
  - Remove `workoutEntries` parameter
  - Remove usage-frequency dedup logic
  - Sort alphabetically by exerciseName → variant → templateName
  - Keep the same `AnalysisExerciseOption` shape
- Replace `useAnalysisExerciseOptions` to:
  - Remove `useAllWorkoutEntries()` call
  - Remove `workoutEntriesQuery` from the loading/error checks
  - Simplify to only depend on `useAllWorkoutTemplates()`

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run tests/unit/hooks/workout/useAnalysis.test.tsx
```

Expected: All tests PASS

- [ ] **Step 5: Run AnalysisTab tests to ensure no regression**

```bash
cd frontend && npx vitest run tests/unit/components/insights/AnalysisTab.test.tsx
```

Expected: All tests PASS

- [ ] **Step 6: Run all hook tests**

```bash
cd frontend && npx vitest run tests/unit/hooks
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/analysis/hooks/useAnalysis.ts frontend/tests/unit/hooks/workout/useAnalysis.test.tsx
git commit -m "refactor: remove expensive useAllWorkoutEntries from useAnalysisExerciseOptions, sort alphabetically"
```
