### Task 5: Frontend — Refactor `useExerciseHistory` hook

**Files:**
- Modify: `frontend/src/features/workout/exercise-definitions/hooks/useExerciseHistory.ts`
- Modify: `frontend/tests/unit/hooks/useExerciseHistory.test.tsx`

**Interfaces:**
- Consumes: `GET /workout-entries/by-exercise?exerciseDefinitionId=<UUID>` from Task 3
- Produces: same `{ sessions, bestKg, sessionCount, isLoading, isError, error, refetch }` shape — unchanged

- [ ] **Step 1: Update the failing test**

In `frontend/tests/unit/hooks/useExerciseHistory.test.tsx`, replace the mock to target the new endpoint and return an unpaged array.

The pageResponse helper (lines 28-36) should be removed since the new endpoint returns a plain array, not a `PagedResponse`.

The mock for the API call needs to change: instead of wrapping data in `pageResponse(...)`, return the array directly.

Also add a new test case at the end that verifies the endpoint URL:
```ts
it("calls the by-exercise endpoint with the exercise definition id", async () => {
  ...
  expect(workoutApi.get).toHaveBeenCalledWith(
    "/workout-entries/by-exercise",
    expect.objectContaining({
      params: { exerciseDefinitionId: "definition-bench" },
    })
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run tests/unit/hooks/useExerciseHistory.test.tsx
```

Expected: Tests FAIL — still calling old endpoint with pagination params

- [ ] **Step 3: Refactor the hook**

Replace `frontend/src/features/workout/exercise-definitions/hooks/useExerciseHistory.ts` to:
- Call the new endpoint `/workout-entries/by-exercise` with `{ params: { exerciseDefinitionId: targetExerciseDefinitionId } }`
- Remove `buildPageParams`, `clampPageSize`, `PagedResponse` and `PaginationHelper` imports
- Accept the response as a plain `WorkoutEntry[]` array
- `limit`, `startDate`, `endDate` options become client-side filters on the retrieved data:
  - `limit` — slice the results array
  - `startDate`/`endDate` — filter by comparing `entry.createdAt` against date boundaries
- Use `staleTime: 5 * 60 * 1000` instead of `staleTime: 0`
- Simplify queryKey to `['exercise-history', targetExerciseDefinitionId]`

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run tests/unit/hooks/useExerciseHistory.test.tsx
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/workout/exercise-definitions/hooks/useExerciseHistory.ts frontend/tests/unit/hooks/useExerciseHistory.test.tsx
git commit -m "refactor: useExerciseHistory calls new by-exercise endpoint, drops fragile recent-filter pattern"
```
