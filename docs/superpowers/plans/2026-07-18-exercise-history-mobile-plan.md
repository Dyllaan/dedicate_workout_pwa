# Exercise History Data Fix + Mobile UX — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "No history yet" false-negative by adding a backend exercise-filtered endpoint and refactoring the frontend hook, then redesign both AnalysisTab and ProgressPanel for mobile with progressive disclosure.

**Architecture:** New `GET /workout-entries/by-exercise` backend endpoint returns all entries for a specific exerciseDefinitionId. Frontend `useExerciseHistory` hook is refactored to call it, eliminating the fragile recent-8 + client-filter pattern. `useAnalysisExerciseOptions` drops its expensive `useAllWorkoutEntries` dependency. Mobile UX gains a SummaryHero bar, CollapsibleSection wrappers, compact StatTile variant, chart touch support, and condensed expandable history cards.

**Tech Stack:** Spring Boot 3 (Java), JPA/Hibernate, JUnit 5 + MockMvc; React 18, React Query 5, TypeScript, Vitest + React Testing Library, Tailwind CSS, custom SVG charts.

## Global Constraints

- No horizontal scrolling anywhere in the mobile layout
- All existing hook return shapes preserved (zero breaking changes to consumers)
- Backend page size hard-cap of 25 unchanged (new endpoint bypasses pagination entirely — returns unpaged array)
- CollapsibleSection: all expanded on `md:` and up, Recommendation + Plateau expanded by default on mobile, Trend + History collapsed on mobile
- Chart touch must not interfere with vertical page scroll
- No new npm or Maven dependencies

---

### Task 1: Backend — Repository query for exercise-filtered entries

**Files:**
- Modify: `workout_service/src/main/java/com/louisfiges/workout/repository/WorkoutEntryRepository.java`

**Interfaces:**
- Produces: `List<WorkoutEntry> findAllByUserIdAndExerciseDefinitionId(UUID userId, UUID exerciseDefinitionId)` — ordered by `createdAt DESC`, eager-loads template + exercises + sets + exercise definitions

- [ ] **Step 1: Add the repository query method**

Add after line 298 (after `findRecentByUserAndExercise`):

```java
@EntityGraph(attributePaths = {"template", "exercises", "exercises.sets", "exercises.exerciseDefinition"})
@Query("""
SELECT DISTINCT we
FROM WorkoutEntry we
JOIN we.exercises ee
WHERE we.userId = :userId
  AND ee.exerciseDefinition.id = :exerciseDefinitionId
ORDER BY we.createdAt DESC
""")
List<WorkoutEntry> findAllByUserIdAndExerciseDefinitionId(
        @Param("userId") UUID userId,
        @Param("exerciseDefinitionId") UUID exerciseDefinitionId
);
```

- [ ] **Step 2: Verify compilation**

```bash
cd workout_service && ./mvnw compile
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/repository/WorkoutEntryRepository.java
git commit -m "feat: add repository query for exercise-filtered workout entries"
```

---

### Task 2: Backend — Service method

**Files:**
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/workout/WorkoutEntryService.java`

**Interfaces:**
- Consumes: `WorkoutEntryRepository.findAllByUserIdAndExerciseDefinitionId(userId, exerciseDefinitionId)` from Task 1
- Produces: `List<WorkoutEntryDTO> getAllByExerciseDefinition(UUID userId, UUID exerciseDefinitionId)`

- [ ] **Step 1: Add the service method**

Add after line 70 (after the existing `getAllByUser(userId, workoutTemplateId)` overload):

```java
@Transactional(readOnly = true)
public List<WorkoutEntryDTO> getAllByExerciseDefinition(UUID userId, UUID exerciseDefinitionId) {
    return workoutEntryRepository.findAllByUserIdAndExerciseDefinitionId(userId, exerciseDefinitionId)
            .stream().map(workoutEntryMapper::toDTO).toList();
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd workout_service && ./mvnw compile
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/service/workout/WorkoutEntryService.java
git commit -m "feat: add service method for exercise-filtered workout entries"
```

---

### Task 3: Backend — Controller endpoint

**Files:**
- Modify: `workout_service/src/main/java/com/louisfiges/workout/controller/core/WorkoutEntryController.java`

**Interfaces:**
- Consumes: `WorkoutEntryService.getAllByExerciseDefinition(userId, exerciseDefinitionId)` from Task 2
- Produces: `GET /workout-entries/by-exercise?exerciseDefinitionId=<UUID>` → `List<WorkoutEntryDTO>`

- [ ] **Step 1: Add the controller method**

Add after line 55 (after the `getRecent` method):

```java
@GetMapping("/by-exercise")
public List<WorkoutEntryDTO> getByExercise(
        @RequestParam UUID exerciseDefinitionId,
        @AuthenticationPrincipal Jwt jwt) {
    UUID userId = UUID.fromString(jwt.getSubject());
    return workoutEntryService.getAllByExerciseDefinition(userId, exerciseDefinitionId);
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd workout_service && ./mvnw compile
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/controller/core/WorkoutEntryController.java
git commit -m "feat: add GET /workout-entries/by-exercise endpoint"
```

---

### Task 4: Backend — Tests

**Files:**
- Modify: `workout_service/src/test/java/com/louisfiges/workout/controller/core/WorkoutEntryControllerTest.java`

**Interfaces:**
- Consumes: `WorkoutEntryService.getAllByExerciseDefinition(userId, exerciseDefinitionId)` from Task 2

- [ ] **Step 1: Add controller test for the new endpoint**

Add after the last test method (line 83):

```java
@Test
@DisplayName("GET /by-exercise returns entries filtered by exercise definition id")
void getByExercise() throws Exception {
    UUID userId = UUID.randomUUID();
    UUID exerciseDefinitionId = UUID.randomUUID();

    when(workoutEntryService.getAllByExerciseDefinition(eq(userId), eq(exerciseDefinitionId)))
            .thenReturn(List.of(
                    new WorkoutEntryDTO(
                            UUID.randomUUID(),
                            null,
                            Collections.emptyList(),
                            null,
                            LocalDateTime.now()
                    )
            ));

    mockMvc.perform(get("/workout-entries/by-exercise")
                    .queryParam("exerciseDefinitionId", exerciseDefinitionId.toString())
                    .with(jwt().jwt((token) -> token.subject(userId.toString())))
                    .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk());

    verify(workoutEntryService).getAllByExerciseDefinition(userId, exerciseDefinitionId);
}

@Test
@DisplayName("GET /by-exercise returns 401 when unauthenticated")
void getByExerciseUnauthenticated() throws Exception {
    mockMvc.perform(get("/workout-entries/by-exercise")
                    .queryParam("exerciseDefinitionId", UUID.randomUUID().toString())
                    .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized());
}
```

- [ ] **Step 2: Run backend tests**

```bash
cd workout_service && ./mvnw test -Dtest=WorkoutEntryControllerTest
```

Expected: Tests pass (4 tests total including existing 2)

- [ ] **Step 3: Run all backend tests**

```bash
cd workout_service && ./mvnw test
```

Expected: BUILD SUCCESS, all tests pass

- [ ] **Step 4: Commit**

```bash
git add workout_service/src/test/java/com/louisfiges/workout/controller/core/WorkoutEntryControllerTest.java
git commit -m "test: add controller tests for by-exercise endpoint"
```

---

### Task 5: Frontend — Refactor `useExerciseHistory` hook

**Files:**
- Modify: `frontend/src/features/workout/exercise-definitions/hooks/useExerciseHistory.ts`
- Modify: `frontend/tests/unit/hooks/useExerciseHistory.test.tsx`

**Interfaces:**
- Consumes: `GET /workout-entries/by-exercise?exerciseDefinitionId=<UUID>` from Task 3
- Produces: same `{ sessions, bestKg, sessionCount, isLoading, isError, error, refetch }` shape — unchanged

- [ ] **Step 1: Update the failing test**

In `frontend/tests/unit/hooks/useExerciseHistory.test.tsx`, replace the mock to target the new endpoint and return an unpaged array:

Replace line 40-43:
```ts
beforeEach(() => {
  vi.mocked(workoutApi.get).mockResolvedValue({
    status: 200,
    data: pageResponse([]),
  } as never);
});
```

With:
```ts
beforeEach(() => {
  vi.mocked(workoutApi.get).mockResolvedValue({
    status: 200,
    data: [],
  } as never);
});
```

Replace `pageResponse([entry1, entry2, entry3])` on line 104 with:
```ts
vi.mocked(workoutApi.get).mockResolvedValue({
  status: 200,
  data: [entry1, entry2, entry3],
} as never);
```

Replace `pageResponse([entry])` on line 141 with:
```ts
vi.mocked(workoutApi.get).mockResolvedValue({
  status: 200,
  data: [entry],
} as never);
```

Replace `pageResponse([entry])` on line 170 with:
```ts
vi.mocked(workoutApi.get).mockResolvedValue({
  status: 200,
  data: [entry],
} as never);
```

Remove the unused `pageResponse` helper function (lines 28-36).

Add a new test at the end:
```ts
it("calls the by-exercise endpoint with the exercise definition id", async () => {
  const { result } = renderHook(() => useExerciseHistory("definition-bench"), {
    wrapper: createWrapper(),
  });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
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

Expected: Tests FAIL — still calling old endpoint

- [ ] **Step 3: Refactor the hook**

Replace `frontend/src/features/workout/exercise-definitions/hooks/useExerciseHistory.ts` with:

```ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unwrapApiResponse, workoutApi } from '@/api/api';
import type { WorkoutEntry } from '@/features/workout/types/Workout';
import type { SetEntry } from '@/features/workout/types/Workout';

type ExerciseHistorySession = {
  entryId: string;
  templateName: string;
  performedAt: string;
  sets: SetEntry[];
  topWeightKg: number;
  volumeKg: number;
  averageRestSeconds: number | null;
};

type ExerciseHistoryOptions = {
  limit?: number;
  startDate?: string;
  endDate?: string;
};

export function useExerciseHistory(
  exerciseDefinitionId: string,
  options: ExerciseHistoryOptions = {},
) {
  const targetExerciseDefinitionId = exerciseDefinitionId.trim();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exercise-history', targetExerciseDefinitionId],
    queryFn: async () => {
      const response = await workoutApi.get<WorkoutEntry[]>(
        '/workout-entries/by-exercise',
        { params: { exerciseDefinitionId: targetExerciseDefinitionId } },
      );
      return unwrapApiResponse(response);
    },
    enabled: targetExerciseDefinitionId.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const workoutEntries = Array.isArray(data) ? data : [];

  const sessions = useMemo((): ExerciseHistorySession[] => {
    const result: ExerciseHistorySession[] = [];

    for (const entry of workoutEntries) {
      const match = entry.exercises.find((ex: WorkoutEntry["exercises"][number]) => {
        return ex.exerciseDefinitionId === targetExerciseDefinitionId;
      });

      if (!match) continue;

      const sets = match.sets;
      const topWeightKg = sets.reduce((max: number, s: SetEntry) => Math.max(max, s.weight ?? 0), 0);
      const volumeKg = sets.reduce((sum: number, s: SetEntry) => sum + (s.weight ?? 0) * s.reps, 0);
      const rests = sets
        .map((set: SetEntry) => set.restBeforeSeconds)
        .filter((rest: number | null | undefined): rest is number => typeof rest === "number");

      result.push({
        entryId: entry.id,
        templateName: entry.template.name,
        performedAt: entry.createdAt,
        sets,
        topWeightKg,
        volumeKg,
        averageRestSeconds: rests.length > 0
          ? Math.round(rests.reduce((sum: number, rest: number) => sum + rest, 0) / rests.length)
          : null,
      });
    }

    const limited = options.limit != null ? result.slice(0, options.limit) : result;

    return limited.sort(
      (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
    );
  }, [workoutEntries, targetExerciseDefinitionId, options.limit]);

  const bestKg = useMemo(
    () => sessions.reduce((max, s) => Math.max(max, s.topWeightKg), 0),
    [sessions],
  );

  return { sessions, isLoading, isError, error, refetch, bestKg, sessionCount: sessions.length };
}
```

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

---

### Task 6: Frontend — Remove entries dependency from `useAnalysisExerciseOptions`

**Files:**
- Modify: `frontend/src/features/analysis/hooks/useAnalysis.ts`
- Modify: `frontend/tests/unit/hooks/workout/useAnalysis.test.tsx`

**Interfaces:**
- Produces: `useAnalysisExerciseOptions()` → same `{ options, isLoading, error, refetch }` shape, but options sorted alphabetically (no usage-frequency sort)

- [ ] **Step 1: Update the test**

Replace `frontend/tests/unit/hooks/workout/useAnalysis.test.tsx` with:

```ts
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const templatesMock = vi.fn();

vi.mock("@/features/workout/templates/hooks/useWorkoutTemplates", () => ({
  useAllWorkoutTemplates: () => templatesMock(),
}));

import { useAnalysisExerciseOptions } from "@/features/analysis/hooks/useAnalysis";

describe("useAnalysisExerciseOptions", () => {
  beforeEach(() => {
    templatesMock.mockReset();
  });

  it("returns focused exercises sorted alphabetically by name, variant, template", () => {
    templatesMock.mockReturnValue({
      data: [
        {
          id: "template-b",
          name: "B Day",
          category: "Pull",
          createdAt: "2026-06-01T10:00:00.000Z",
          exercises: [
            {
              focus: true,
              exerciseDefinition: {
                id: "bench-press",
                exerciseName: "Bench Press",
                variant: null,
              },
            },
          ],
        },
        {
          id: "template-a",
          name: "A Day",
          category: "Push",
          createdAt: "2026-06-02T10:00:00.000Z",
          exercises: [
            {
              focus: true,
              exerciseDefinition: {
                id: "bench-press",
                exerciseName: "Bench Press",
                variant: null,
              },
            },
            {
              focus: true,
              exerciseDefinition: {
                id: "squat",
                exerciseName: "Squat",
                variant: "High Bar",
              },
            },
            {
              focus: false,
              exerciseDefinition: {
                id: "accessory",
                exerciseName: "Curls",
                variant: null,
              },
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.options).toHaveLength(3);
    expect(result.current.options[0]?.exerciseName).toBe("Bench Press");
    expect(result.current.options[1]?.exerciseName).toBe("Bench Press");
    expect(result.current.options[2]?.exerciseName).toBe("Squat");
  });

  it("skips exercises without focus or definition id", () => {
    templatesMock.mockReturnValue({
      data: [
        {
          id: "template-x",
          name: "X Day",
          category: "Push",
          createdAt: "2026-06-01T10:00:00.000Z",
          exercises: [
            {
              focus: false,
              exerciseDefinition: {
                id: "warmup",
                exerciseName: "Warmup",
                variant: null,
              },
            },
            {
              focus: true,
              exerciseDefinition: {
                id: "",
                exerciseName: "No ID",
                variant: null,
              },
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAnalysisExerciseOptions());

    expect(result.current.options).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run tests/unit/hooks/workout/useAnalysis.test.tsx
```

Expected: Tests FAIL — module mock references removed `useAllWorkoutEntries`

- [ ] **Step 3: Refactor the hook**

In `frontend/src/features/analysis/hooks/useAnalysis.ts`, replace the imports section and `useAnalysisExerciseOptions` function:

Remove:
```ts
import { useAllWorkoutEntries } from "@/features/workout/entries/hooks/useWorkoutEntries";
import type { WorkoutEntry } from "@/features/workout/types/Workout";
```

Remove the `buildTemplateUsageSummary` function (lines 17-41) and `compareOptions` function (lines 43-68).

Replace `buildAnalysisExerciseOptions` (beginning at ~line 70) with:
```ts
function buildAnalysisExerciseOptions(templates: WorkoutTemplate[]): AnalysisExerciseOption[] {
  const resolved = new Map<string, AnalysisExerciseOption>();

  templates.forEach((template) => {
    template.exercises.forEach((exercise) => {
      if (!exercise.focus) {
        return;
      }

      const exerciseDefinitionId = exercise.exerciseDefinition.id?.trim();
      if (!exerciseDefinitionId) {
        return;
      }

      const option: AnalysisExerciseOption = {
        exerciseDefinitionId,
        exerciseName: exercise.exerciseDefinition.exerciseName,
        variant: exercise.exerciseDefinition.variant ?? null,
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category,
        templateCreatedAt: template.createdAt,
      };

      resolved.set(exerciseDefinitionId, option);
    });
  });

  return [...resolved.values()].sort((left, right) => {
    const nameComparison = left.exerciseName.localeCompare(right.exerciseName);
    if (nameComparison !== 0) {
      return nameComparison;
    }

    const variantComparison = (left.variant ?? "").localeCompare(right.variant ?? "");
    if (variantComparison !== 0) {
      return variantComparison;
    }

    return left.templateName.localeCompare(right.templateName);
  });
}
```

Replace `useAnalysisExerciseOptions` with:
```ts
export function useAnalysisExerciseOptions() {
  const templatesQuery = useAllWorkoutTemplates();

  const options = useMemo(
    () => buildAnalysisExerciseOptions(templatesQuery.data ?? []),
    [templatesQuery.data],
  );

  return {
    options,
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error ?? null,
    refetch: templatesQuery.refetch,
  };
}
```

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

- [ ] **Step 6: Run all hook tests to ensure no regression**

```bash
cd frontend && npx vitest run tests/unit/hooks
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/analysis/hooks/useAnalysis.ts frontend/tests/unit/hooks/workout/useAnalysis.test.tsx
git commit -m "refactor: remove expensive useAllWorkoutEntries from useAnalysisExerciseOptions, sort alphabetically"
```

---

### Task 7: Frontend — Add `size="sm"` variant to StatTile

**Files:**
- Modify: `frontend/src/components/ui/stat-tile.tsx`

**Interfaces:**
- Produces: `StatTile` accepts optional `size?: "sm" | "default"` prop — defaults to `"default"`, `"sm"` reduces padding/value size/hides icon

- [ ] **Step 1: Add the size prop to the type**

Add `size?: "sm" | "default";` to the `StatTileProps` type. Add `size = "default"` to the function destructuring.

- [ ] **Step 2: Add compact styles**

Replace the JSX to use `compact` helper:
```tsx
const compact = size === "sm";
```
Use `compact ? "p-3" : "p-4 sm:p-5"` for container padding.
Use `compact ? "text-[11px]" : "text-xs"` for label.
Use `compact ? "text-lg" : "text-2xl sm:text-3xl"` for value.
Hide icon when compact: `{!compact && Icon ? ... : null}`.

- [ ] **Step 3: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/stat-tile.tsx
git commit -m "feat: add size=sm variant to StatTile for compact summary views"
```

---

### Task 8: Frontend — Create `CollapsibleSection` component

**Files:**
- Create: `frontend/src/components/layout/section/CollapsibleSection.tsx`

**Interfaces:**
- Produces: `<CollapsibleSection icon={Icon} title="..." summary="..." defaultExpanded={false}>children</CollapsibleSection>`

- [ ] **Step 1: Create the component**

```tsx
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type CollapsibleSectionProps = {
  icon?: LucideIcon;
  title: string;
  summary?: ReactNode;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
};

export default function CollapsibleSection({
  icon: Icon,
  title,
  summary,
  defaultExpanded = false,
  children,
  className,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("rounded-2xl border border-border bg-card", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/5 transition-colors rounded-2xl"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon ? <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : null}
          <span className="text-sm font-semibold text-foreground truncate">{title}</span>
          {summary && !expanded ? (
            <span className="text-xs text-muted-foreground truncate">· {summary}</span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/section/CollapsibleSection.tsx
git commit -m "feat: add CollapsibleSection component with CSS grid-rows transition"
```

---

### Task 9: Frontend — Create `SummaryHero` component

**Files:**
- Create: `frontend/src/components/ui/SummaryHero.tsx`

**Interfaces:**
- Produces: `<SummaryHero tiles={[{ label, value }]}>` — renders a 3-column grid of compact StatTiles

- [ ] **Step 1: Create the component**

```tsx
import type { ReactNode } from "react";
import StatTile from "@/components/ui/stat-tile";

type SummaryHeroTile = {
  label: string;
  value: ReactNode;
};

type SummaryHeroProps = {
  tiles: SummaryHeroTile[];
  className?: string;
};

export default function SummaryHero({ tiles, className }: SummaryHeroProps) {
  if (tiles.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/SummaryHero.tsx
git commit -m "feat: add SummaryHero component for 3-tile compact stat bar"
```

---

### Task 10: Frontend — Add touch support to `SimpleLineChart`

**Files:**
- Modify: `frontend/src/components/charts/SimpleLineChart.tsx`

**Interfaces:**
- Consumes: existing `SimpleLineChart` props unchanged
- Produces: Same visual output, touch interaction mirrors mouse hover

- [ ] **Step 1: Add touch handlers**

Add `touchAction: "none"` to the hover grid container style.

Add `onTouchMove` handler to the grid div:
```tsx
onTouchMove={(event) => {
  const touch = event.touches[0];
  if (!touch) return;
  const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
  const button = target?.closest("button");
  if (!button) return;
  const index = Array.from(button.parentElement?.children ?? []).indexOf(button);
  if (index >= 0 && index < data.length) {
    setHoveredIndex(index);
  }
}}
onTouchEnd={() => setHoveredIndex(null)}
```

Add `onTouchStart` handler to each button:
```tsx
onTouchStart={(event) => {
  event.preventDefault();
  setHoveredIndex(index);
}}
```

- [ ] **Step 2: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/charts/SimpleLineChart.tsx
git commit -m "feat: add touch support to SimpleLineChart hover interaction"
```

---

### Task 11: Frontend — Redesign `ProgressPanel` for mobile

**Files:**
- Modify: `frontend/src/features/progress/components/ProgressPanel.tsx`

**Interfaces:**
- Consumes: `useExerciseHistory` (Task 5), `SummaryHero` (Task 9), `CollapsibleSection` (Task 8), `StatTile` with `size="sm"` (Task 7)
- Produces: Same visual page — redesigned with hero bar, collapsible sections, condensed history cards

- [ ] **Step 1: Add imports**

```tsx
import CollapsibleSection from "@/components/layout/section/CollapsibleSection";
import SummaryHero from "@/components/ui/SummaryHero";
import { ChevronDown } from "lucide-react";
```

- [ ] **Step 2: Add SummaryHero after exercise picker**

Add hero tiles computation:
```tsx
const heroTiles = useMemo(() => [
  { label: "Best", value: historyQuery.bestKg > 0 ? format(historyQuery.bestKg) : "—" },
  { label: "Latest", value: historySessions.length > 0 && historySessions[0].topWeightKg > 0 ? format(historySessions[0].topWeightKg) : "—" },
  { label: "Sessions", value: historyQuery.sessionCount },
], [historyQuery.bestKg, historyQuery.sessionCount, historySessions, format]);
```

Add `<SummaryHero tiles={heroTiles} className="px-1" />` after the exercise picker.

- [ ] **Step 3: Replace Recommendation section header with CollapsibleSection**

Wrap the recommendation content in `<CollapsibleSection>` with `defaultExpanded`. Replace `Section` imports with `CollapsibleSection`.

- [ ] **Step 4: Replace Estimates section header with CollapsibleSection**

Wrap in `<CollapsibleSection>` with `defaultExpanded`.

- [ ] **Step 5: Replace History section header with CollapsibleSection**

Wrap in `<CollapsibleSection>` with `defaultExpanded={false}`.

- [ ] **Step 6: Add HistoryCard sub-component**

```tsx
function HistoryCard({ session, format: fmt }: { session: ReturnType<typeof useExerciseHistory>['sessions'][number]; format: (v: number) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/5 transition-colors rounded-2xl"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{formatShortDateTime(session.performedAt)}</p>
          {open ? <p className="text-xs text-muted-foreground">{session.templateName}</p> : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-semibold tabular-nums">{fmt(session.topWeightKg)}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open ? (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">Volume {fmt(session.volumeKg)}</p>
          <ExerciseSetsTable sets={session.sets} format={fmt} />
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/progress/components/ProgressPanel.tsx
git commit -m "feat: redesign ProgressPanel for mobile with SummaryHero, CollapsibleSection, condensed HistoryCards"
```

---

### Task 12: Frontend — Redesign `AnalysisTab` for mobile

**Files:**
- Modify: `frontend/src/features/analysis/components/AnalysisTab.tsx`

**Interfaces:**
- Consumes: `SummaryHero` (Task 9), `CollapsibleSection` (Task 8), `StatTile` with `size="sm"` (Task 7)
- Produces: Same analysis view — redesigned with hero bar and collapsible sections

- [ ] **Step 1: Add imports**

```tsx
import CollapsibleSection from "@/components/layout/section/CollapsibleSection";
import SummaryHero from "@/components/ui/SummaryHero";
```

- [ ] **Step 2: Add hero tiles**

```tsx
const heroTiles = useMemo(() => [
  {
    label: "Suggested",
    value: recommendationQuery.data?.suggestion.suggestedWeightKg != null
      ? format(recommendationQuery.data.suggestion.suggestedWeightKg)
      : "—",
  },
  {
    label: "Trend",
    value: recommendationQuery.data?.trend.direction
      ? formatStatusToken(recommendationQuery.data.trend.direction)
      : "—",
  },
  {
    label: "Sessions",
    value: recommendationQuery.data?.trend.comparableObservationCount ?? "—",
  },
], [recommendationQuery.data, format]);
```

Add `<SummaryHero tiles={heroTiles} />` after the exercise picker `<DashCardRow>`.

- [ ] **Step 3: Replace the three bottom sections with CollapsibleSection**

Replace `<Section>` for Recommendation, Plateau, and Trend with `CollapsibleSection` wrappers.

Recommendation: `defaultExpanded`, summary = "X kg · Increase/Maintain/Decrease"
Plateau: `defaultExpanded`, summary = "Detected" / "No plateau"
Trend: `defaultExpanded={false}`, summary = "N sessions"

- [ ] **Step 4: Remove unused imports**

Remove `Section` and `StatGrid` from imports.

- [ ] **Step 5: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Run AnalysisTab tests**

```bash
cd frontend && npx vitest run tests/unit/components/insights/AnalysisTab.test.tsx
```

Expected: Tests pass (may need minor adjustments for new layout)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/analysis/components/AnalysisTab.tsx
git commit -m "feat: redesign AnalysisTab for mobile with SummaryHero and collapsible sections"
```

---

### Task 13: Integration — Run all tests and verify

**Files:**
- None (verification only)

- [ ] **Step 1: Run all backend tests**

```bash
cd workout_service && ./mvnw test
```

Expected: BUILD SUCCESS

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend && npx vitest run
```

Expected: All tests pass

- [ ] **Step 3: Run frontend typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit any test fixes or changes from verification**
