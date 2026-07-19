# 1RM Testing Protocol — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a structured 1RM Testing Protocol that integrates into the existing PEAKING block architecture, guiding users through warm-ups, competitive attempts, mandatory rest, and automatic deload scheduling.

**Architecture:** A dedicated test session page (`/workout/:workoutId/test-1rm`) with a `useReducer`-based state machine (SETUP → WARM_UP → TESTING → COMPLETED). React Query mutations handle taper scheduling and post-test deload. Payload is built inline (bypasses `buildWorkoutEntryPayload` to preserve 0-rep failed lifts). Backend requires a Flyway migration + DTO/Entity/Service updates across three Java layers.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Radix UI, React Router v7, TanStack React Query v5, Vitest v4 (jsdom, @testing-library/react), Java 21, Spring Boot, Flyway, PostgreSQL.

## Global Constraints

- Reuse existing PEAKING block architecture — no new block types
- Reuse existing `isDeload` week flag, `intensityPct`, `rpeOverrideMax`, `targetSetsPerExercise` fields
- Reuse existing `OneRMEstimate`, `estimate1RM()`, `calculateBestSetE1rm()`, `formatRestTime()` utilities
- Taper week preserves high intensity (80–85%) while slashing volume by ~50%
- Post-test deload sets `isDeload: true` + `rpeOverrideMax: 6` + halved target sets on the following week
- Rest timer uses `requestAnimationFrame` + `Date.now()` delta for cross-tab accuracy
- `SAVE_VERDICT` and `ADVANCE_TO_NEXT_ATTEMPT` are separate actions — verdict never auto-advances
- Do NOT modify `buildWorkoutEntryPayload.ts` — build the test session payload inline
- `is1rmTest: true` sent from frontend, persisted through all three Java backend layers
- Migration version: V37 (V36 is the latest existing migration)

---

## File Structure

```
frontend/src/features/workout/test-1rm/
├── types/
│   └── Test1rmTypes.ts              # All type definitions
├── hooks/
│   ├── use1rmTestReducer.ts         # useReducer wrapper + pure reducer function
│   ├── use1rmBaseline.ts            # React Query: fetch history → compute median E1RM
│   ├── useInitiateTestProtocol.ts   # Mutation: await updateWeek → navigate to test page
│   ├── useCompleteTestSession.ts    # Mutation: create WorkoutEntry with is1rmTest flag
│   ├── useProgrammeDeload.ts        # Mutation: set next week isDeload, halved sets, RPE cap
│   └── useTestRestTimer.ts          # Standalone timer hook (no set recording)
├── utils/
│   └── test1rmUtils.ts              # buildWarmupSets, calculateAttemptPlannedWeight, recalculateOnFail, roundToPlate
├── components/
│   ├── TestSessionPage.tsx          # Page — reads Outlet context, instantiates reducer
│   ├── TestSetupPanel.tsx           # SETUP phase: exercise picker + E1RM display
│   ├── WarmupPanel.tsx              # WARM_UP phase: 4 warmup set cards with checkboxes
│   ├── AttemptPanel.tsx             # TESTING phase: weight input, verdict, rest overlay
│   ├── RestTimerOverlay.tsx         # Conditional overlay card (rendered inside AttemptPanel)
│   └── CompletionPanel.tsx          # COMPLETED phase: results grid + deload notice
└── __tests__/
    ├── test1rmReducer.test.ts       # Pure reducer unit tests (Vitest renderHook)
    ├── test1rmUtils.test.ts         # Math utility unit tests
    ├── TestSessionPage.test.tsx     # Integration: phase transitions
    └── RestTimerOverlay.test.tsx    # Timer behavior tests
```

### Existing Files Touched

| File | Change |
|---|---|
| `frontend/src/AppRoutes.tsx` | Add `test-1rm` route under WorkoutLayout |
| `frontend/src/features/workout/types/Workout.ts` | Add `is1rmTest?: boolean` to `CreateWorkoutEntryRequest` |
| `frontend/src/features/periodisation/components/panels/BlockPanel.tsx` | Pass workouts to WeekCard |
| `frontend/src/features/periodisation/week/components/WeekCard.tsx` | Add workout template listing + "Test 1RM" buttons for PEAKING blocks |
| `workout_service/.../dto/request/WorkoutEntryRequest.java` | Add `Boolean is1rmTest` component |
| `workout_service/.../dao/workout/WorkoutEntry.java` | Add `is1rmTest` field, constructor param, getter/setter |
| `workout_service/.../service/workout/WorkoutEntryService.java` | Pass `request.is1rmTest()` into entity constructor |
| `workout_service/src/main/resources/db/migration/V37__add_1rm_test_flag.sql` | New migration (V36 is max) |

---

### Task 1: Backend — Flyway Migration + Java Pipeline

**Files:**
- Create: `workout_service/src/main/resources/db/migration/V37__add_1rm_test_flag.sql`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/dto/request/WorkoutEntryRequest.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/dao/workout/WorkoutEntry.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/workout/WorkoutEntryService.java`

**Interfaces:**
- Produces: `is1rmTest` column available on `workout_entries` table; `WorkoutEntryRequest` accepts `is1rmTest` from frontend JSON; `WorkoutEntry` entity stores it; Service passes it through.

- [x] **Step 1: Create the Flyway migration**

```sql
-- V37__add_1rm_test_flag.sql
ALTER TABLE workout_entries ADD COLUMN is_1rm_test BOOLEAN DEFAULT FALSE;
```

Note on `setRole`: The existing backend already persists `setRole` through `SetEntryRequest` → `SetEntry` → `set_role` column. The `SetRole` enum includes `TOP_SINGLE`. No backend changes needed for setRole serialization.

- [x] **Step 2: Read `WorkoutEntryRequest.java` to get exact current content**

- [x] **Step 3: Update `WorkoutEntryRequest.java` — add `Boolean is1rmTest` to the record**

The current file is:
```java
package com.louisfiges.workout.dto.request;

import com.louisfiges.workout.dto.request.insights.ReadinessCheckInRequestDTO;
import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.List;
import java.util.UUID;

public record WorkoutEntryRequest(
        UUID workoutTemplateId,
        List<ExerciseEntryRequest> exercises,
        String notes,
        ReadinessCheckInRequestDTO readiness
) implements DTO {
    public WorkoutEntryRequest(UUID workoutTemplateId, List<ExerciseEntryRequest> exercises, String notes) {
        this(workoutTemplateId, exercises, notes, null);
    }
}
```

Update to:
```java
public record WorkoutEntryRequest(
        UUID workoutTemplateId,
        List<ExerciseEntryRequest> exercises,
        String notes,
        ReadinessCheckInRequestDTO readiness,
        Boolean is1rmTest
) implements DTO {
    public WorkoutEntryRequest(UUID workoutTemplateId, List<ExerciseEntryRequest> exercises, String notes) {
        this(workoutTemplateId, exercises, notes, null, null);
    }
}
```

- [x] **Step 4: Read `WorkoutEntry.java` to get exact current content**

- [x] **Step 5: Update `WorkoutEntry.java` — add field, constructor param, getter/setter**

The current constructor at line 51 is:
```java
public WorkoutEntry(WorkoutTemplate template, UUID userId, List<ExerciseEntry> exercises, String notes) {
    this.template = template;
    this.userId = userId;
    this.exercises = exercises;
    this.notes = notes;
}
```

Add after the `notes` field (after line 36):
```java
    @Column(name = "is_1rm_test")
    private Boolean is1rmTest;
```

Update constructor to include the new parameter:
```java
public WorkoutEntry(WorkoutTemplate template, UUID userId, List<ExerciseEntry> exercises, String notes, Boolean is1rmTest) {
    this.template = template;
    this.userId = userId;
    this.exercises = exercises;
    this.notes = notes;
    this.is1rmTest = is1rmTest;
}
```

Add getter/setter after the `getNotes()`/`setNotes()` block (after line 71):
```java
    public Boolean getIs1rmTest() { return is1rmTest; }
    public void setIs1rmTest(Boolean is1rmTest) { this.is1rmTest = is1rmTest; }
```

- [x] **Step 6: Read `WorkoutEntryService.java` to get the exact `create()` method content**

- [x] **Step 7: Update `WorkoutEntryService.java` — pass `is1rmTest` through**

The current entity construction at line 130 is:
```java
new WorkoutEntry(template, userId, buildExerciseEntries(request.exercises(), userId), request.notes())
```

Update to:
```java
new WorkoutEntry(template, userId, buildExerciseEntries(request.exercises(), userId), request.notes(), request.is1rmTest())
```

- [x] **Step 8: Commit**

```bash
git add workout_service/src/main/resources/db/migration/V37__add_1rm_test_flag.sql workout_service/src/main/java/com/louisfiges/workout/dto/request/WorkoutEntryRequest.java workout_service/src/main/java/com/louisfiges/workout/dao/workout/WorkoutEntry.java workout_service/src/main/java/com/louisfiges/workout/service/workout/WorkoutEntryService.java
git commit -m "feat: add is1rmTest column and full Java pipeline for 1RM test entries"
```

---

### Task 2: Frontend Types

**Files:**
- Create: `frontend/src/features/workout/test-1rm/types/Test1rmTypes.ts`
- Modify: `frontend/src/features/workout/types/Workout.ts:166-185`

**Interfaces:**
- Produces: `TestPhase`, `AttemptVerdict`, `WarmupSet`, `MaxAttempt`, `TestSessionState`, `TestSessionAction` types; `CreateWorkoutEntryRequest` accepts optional `is1rmTest`

- [x] **Step 1: Create `Test1rmTypes.ts`**

```typescript
import type { ExerciseIdentityDraft } from "@/features/workout/entries/types/ExerciseIdentity";

export type TestPhase = "SETUP" | "WARM_UP" | "TESTING" | "COMPLETED";

export type AttemptVerdict = "PENDING" | "SUCCESS" | "FAIL";

export type WarmupSet = {
  percentage: number;
  targetWeightKg: number;
  targetReps: number;
  completed: boolean;
};

export type MaxAttempt = {
  attemptNumber: number;
  plannedWeightKg: number;
  actualWeightKg: number | null;
  actualReps: 0 | 1 | null;
  actualRpe: number | null;
  verdict: AttemptVerdict;
};

export type TestSessionState = {
  phase: TestPhase;
  focusExercise: ExerciseIdentityDraft & {
    exerciseDefinitionId?: string;
    exerciseInfoId?: number;
  };
  e1rmBaselineKg: number;
  warmupSets: WarmupSet[];
  attempts: MaxAttempt[];
  restStartedAt: number | null;
  restDurationTarget: number;
};

export type TestSessionAction =
  | { type: "INIT_SESSION"; e1rm: number; exercise: TestSessionState["focusExercise"] }
  | { type: "COMPLETE_WARMUP"; index: number }
  | { type: "FINISH_WARMUPS" }
  | { type: "SAVE_VERDICT"; weight: number; reps: 0 | 1; rpe: number; verdict: AttemptVerdict; timestamp: number }
  | { type: "UPDATE_ATTEMPT_WEIGHT"; attemptIdx: number; weight: number }
  | { type: "ADVANCE_TO_NEXT_ATTEMPT"; plannedWeight?: number }
  | { type: "FINISH_EARLY" }
  | { type: "RESET" };
```

- [x] **Step 2: Update `CreateWorkoutEntryRequest` in `Workout.ts`**

At line 166 in `Workout.ts`, add `is1rmTest?: boolean` to the type:

```typescript
type CreateWorkoutEntryRequest = {
  workoutTemplateId: string;
  exercises: {
    exerciseDefinitionId?: string | null;
    exerciseName: string;
    variant?: string;
    goalSets?: number;
    exerciseInfoId?: number | null;
    sets: {
      reps: number;
      weight?: number;
      rpe: number;
      notes?: string;
      setRole?: SetRole | null;
      restBeforeSeconds?: number | null;
    }[];
  }[];
  notes?: string;
  readiness?: ReadinessCheckInRequest | null;
  is1rmTest?: boolean;
};
```

- [x] **Step 3: Commit**

```bash
git add frontend/src/features/workout/test-1rm/types/Test1rmTypes.ts frontend/src/features/workout/types/Workout.ts
git commit -m "feat: add 1RM test types and is1rmTest field to CreateWorkoutEntryRequest"
```

---

### Task 3: Utility Functions (test1rmUtils.ts)

**Files:**
- Create: `frontend/src/features/workout/test-1rm/utils/test1rmUtils.ts`
- Create: `frontend/tests/unit/features/workout/test-1rm/utils/test1rmUtils.test.ts`

**Interfaces:**
- Consumes: `WarmupSet` type from `Test1rmTypes.ts`
- Produces: `buildWarmupSets(e1rmKg, unit)`, `calculateAttemptPlannedWeight(e1rmKg, attemptNumber, unit)`, `recalculateOnFail(e1rmKg, attemptNumber, unit)`, `roundToPlate(weight, unit)`

- [x] **Step 1: Write the failing tests**

```typescript
// tests/unit/features/workout/test-1rm/utils/test1rmUtils.test.ts
import { describe, it, expect } from "vitest";
import {
  buildWarmupSets,
  calculateAttemptPlannedWeight,
  recalculateOnFail,
  roundToPlate,
} from "@/features/workout/test-1rm/utils/test1rmUtils";

describe("buildWarmupSets", () => {
  it("returns 4 warm-up sets at 50%, 70%, 80%, 90% of E1RM", () => {
    const sets = buildWarmupSets(100, "kg");
    expect(sets).toHaveLength(4);
    expect(sets[0]).toMatchObject({ percentage: 0.50, targetReps: 5, completed: false });
    expect(sets[1]).toMatchObject({ percentage: 0.70, targetReps: 3, completed: false });
    expect(sets[2]).toMatchObject({ percentage: 0.80, targetReps: 1, completed: false });
    expect(sets[3]).toMatchObject({ percentage: 0.90, targetReps: 1, completed: false });
  });

  it("rounds weights to nearest plate increment (2.5kg)", () => {
    const sets = buildWarmupSets(137, "kg");
    // 50% of 137 = 68.5, rounded to nearest 2.5 = 67.5
    expect(sets[0].targetWeightKg).toBe(67.5);
    // 70% of 137 = 95.9, rounded = 95
    expect(sets[1].targetWeightKg).toBe(95);
  });

  it("rounds weights to nearest plate increment (5lb)", () => {
    const sets = buildWarmupSets(225, "lbs");
    // 50% of 225 = 112.5, rounded to nearest 5 = 115
    expect(sets[0].targetWeightKg).toBe(115);
  });
});

describe("calculateAttemptPlannedWeight", () => {
  it("returns ~92.5% of E1RM for attempt 1 (kg)", () => {
    const weight = calculateAttemptPlannedWeight(100, 1, "kg");
    expect(weight).toBe(92.5);
  });

  it("returns ~97.5% of E1RM for attempt 2 (kg)", () => {
    const weight = calculateAttemptPlannedWeight(100, 2, "kg");
    expect(weight).toBe(97.5);
  });

  it("returns ~102.5% of E1RM for attempt 3 (kg)", () => {
    const weight = calculateAttemptPlannedWeight(100, 3, "kg");
    expect(weight).toBe(102.5);
  });
});

describe("recalculateOnFail", () => {
  it("returns ~97.5% of E1RM for attempt 3 fallback", () => {
    const weight = recalculateOnFail(100, 3, "kg");
    expect(weight).toBe(97.5);
  });
});

describe("roundToPlate", () => {
  it("rounds to nearest 2.5 for kg", () => {
    expect(roundToPlate(91.3, "kg")).toBe(92.5);
    expect(roundToPlate(92.4, "kg")).toBe(92.5);
    expect(roundToPlate(92.6, "kg")).toBe(92.5);
    expect(roundToPlate(93.9, "kg")).toBe(95);
  });

  it("rounds to nearest 5 for lbs", () => {
    expect(roundToPlate(202, "lbs")).toBe(200);
    expect(roundToPlate(203, "lbs")).toBe(205);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
Set-Location -LiteralPath "frontend"; npx vitest run tests/unit/features/workout/test-1rm/utils/test1rmUtils.test.ts
```

Expected: FAIL — module not found

- [x] **Step 3: Write the implementation**

```typescript
// frontend/src/features/workout/test-1rm/utils/test1rmUtils.ts
import type { WarmupSet } from "../types/Test1rmTypes";

type WeightUnit = "kg" | "lbs";

const WARMUP_CONFIGS = [
  { percentage: 0.50, targetReps: 5 },
  { percentage: 0.70, targetReps: 3 },
  { percentage: 0.80, targetReps: 1 },
  { percentage: 0.90, targetReps: 1 },
] as const;

const ATTEMPT_PERCENTAGES: Record<number, number> = {
  1: 0.925,
  2: 0.975,
  3: 1.025,
};

const PLATE_INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lbs: 5 };

export function roundToPlate(weightKg: number, unit: WeightUnit): number {
  const increment = PLATE_INCREMENT[unit];
  return Math.round(weightKg / increment) * increment;
}

export function buildWarmupSets(e1rmKg: number, unit: WeightUnit): WarmupSet[] {
  return WARMUP_CONFIGS.map(({ percentage, targetReps }) => ({
    percentage,
    targetReps,
    targetWeightKg: roundToPlate(e1rmKg * percentage, unit),
    completed: false,
  }));
}

export function calculateAttemptPlannedWeight(
  e1rmKg: number,
  attemptNumber: number,
  unit: WeightUnit,
): number {
  const pct = ATTEMPT_PERCENTAGES[attemptNumber] ?? 0.925;
  return roundToPlate(e1rmKg * pct, unit);
}

export function recalculateOnFail(
  e1rmKg: number,
  _attemptNumber: number,
  unit: WeightUnit,
): number {
  return roundToPlate(e1rmKg * 0.975, unit);
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
Set-Location -LiteralPath "frontend"; npx vitest run tests/unit/features/workout/test-1rm/utils/test1rmUtils.test.ts
```

Expected: 4 describe blocks, all tests PASS

- [x] **Step 5: Commit**

```bash
git add frontend/src/features/workout/test-1rm/utils/test1rmUtils.ts frontend/tests/unit/features/workout/test-1rm/utils/test1rmUtils.test.ts
git commit -m "feat: add 1RM test utility functions with warm-up and attempt weight calculations"
```

---

### Task 4: Reducer (use1rmTestReducer.ts)

**Files:**
- Create: `frontend/src/features/workout/test-1rm/hooks/use1rmTestReducer.ts`
- Create: `frontend/tests/unit/features/workout/test-1rm/hooks/test1rmReducer.test.ts`

**Interfaces:**
- Consumes: `TestSessionState`, `TestSessionAction` types from `Test1rmTypes.ts`; `buildWarmupSets`, `calculateAttemptPlannedWeight`, `recalculateOnFail` from `test1rmUtils.ts`
- Produces: `use1rmTestReducer()` hook returning `{ state, dispatch }`

- [x] **Step 1: Write the failing reducer tests**

```typescript
// tests/unit/features/workout/test-1rm/hooks/test1rmReducer.test.ts
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { use1rmTestReducer } from "@/features/workout/test-1rm/hooks/use1rmTestReducer";

const mockExercise = {
  kind: "custom" as const,
  exerciseName: "Squat",
  exerciseDefinitionId: "def-1",
  exerciseInfoId: 1,
};

describe("use1rmTestReducer — INIT_SESSION", () => {
  it("computes warm-up sets and transitions to WARM_UP", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });

    expect(result.current.state.phase).toBe("WARM_UP");
    expect(result.current.state.e1rmBaselineKg).toBe(100);
    expect(result.current.state.warmupSets).toHaveLength(4);
    expect(result.current.state.warmupSets[0]).toMatchObject({
      percentage: 0.50,
      targetReps: 5,
      completed: false,
    });
  });
});

describe("use1rmTestReducer — WARM_UP phase", () => {
  it("marks a warm-up set as completed", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "COMPLETE_WARMUP", index: 0 });
    });

    expect(result.current.state.warmupSets[0].completed).toBe(true);
    expect(result.current.state.warmupSets[1].completed).toBe(false);
  });

  it("transitions to TESTING and pushes first attempt on FINISH_WARMUPS", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "FINISH_WARMUPS" });
    });

    expect(result.current.state.phase).toBe("TESTING");
    expect(result.current.state.attempts).toHaveLength(1);
    expect(result.current.state.attempts[0].attemptNumber).toBe(1);
    expect(result.current.state.attempts[0].verdict).toBe("PENDING");
  });
});

describe("use1rmTestReducer — TESTING phase", () => {
  function initAndFinishWarmups(result: ReturnType<typeof renderHook>) {
    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "FINISH_WARMUPS" });
    });
  }

  it("SAVE_VERDICT fills the current attempt and sets restStartedAt", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });

    const attempt = result.current.state.attempts[0];
    expect(attempt.actualWeightKg).toBe(92.5);
    expect(attempt.actualReps).toBe(1);
    expect(attempt.actualRpe).toBe(9);
    expect(attempt.verdict).toBe("SUCCESS");
    expect(result.current.state.restStartedAt).not.toBeNull();
  });

  it("SAVE_VERDICT does NOT advance the phase", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });

    expect(result.current.state.phase).toBe("TESTING");
    expect(result.current.state.attempts).toHaveLength(1);
  });

  it("ADVANCE_TO_NEXT_ATTEMPT pushes a new attempt and clears restStartedAt", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });
    act(() => {
      result.current.dispatch({ type: "ADVANCE_TO_NEXT_ATTEMPT" });
    });

    expect(result.current.state.attempts).toHaveLength(2);
    expect(result.current.state.attempts[1].attemptNumber).toBe(2);
    expect(result.current.state.attempts[1].verdict).toBe("PENDING");
    expect(result.current.state.restStartedAt).toBeNull();
  });

  it("advances planned weight on SUCCESS", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });
    act(() => {
      result.current.dispatch({ type: "ADVANCE_TO_NEXT_ATTEMPT" });
    });

    // Attempt 2 planned weight should be higher than Attempt 1
    expect(result.current.state.attempts[1].plannedWeightKg).toBeGreaterThan(
      result.current.state.attempts[0].actualWeightKg!,
    );
  });

  it("transitions to COMPLETED on ADVANCE after attempt 3", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    // Complete 3 attempts
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.dispatch({
          type: "SAVE_VERDICT",
          weight: 100,
          reps: 1,
          rpe: 10,
          verdict: "SUCCESS",
          timestamp: 1700000000000,
        });
      });
      if (i < 2) {
        act(() => {
          result.current.dispatch({ type: "ADVANCE_TO_NEXT_ATTEMPT" });
        });
      }
    }

    expect(result.current.state.phase).toBe("COMPLETED");
    expect(result.current.state.attempts).toHaveLength(3);
  });

  it("UPDATE_ATTEMPT_WEIGHT edits the planned weight of a specific attempt", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({ type: "UPDATE_ATTEMPT_WEIGHT", attemptIdx: 0, weight: 95 });
    });

    expect(result.current.state.attempts[0].plannedWeightKg).toBe(95);
  });

  it("FINISH_EARLY transitions to COMPLETED after at least one verdict", () => {
    const { result } = renderHook(() => use1rmTestReducer());
    initAndFinishWarmups(result);

    act(() => {
      result.current.dispatch({
        type: "SAVE_VERDICT",
        weight: 92.5,
        reps: 1,
        rpe: 9,
        verdict: "SUCCESS",
        timestamp: 1700000000000,
      });
    });
    act(() => {
      result.current.dispatch({ type: "FINISH_EARLY" });
    });

    expect(result.current.state.phase).toBe("COMPLETED");
  });
});

describe("use1rmTestReducer — RESET", () => {
  it("returns to initial SETUP state", () => {
    const { result } = renderHook(() => use1rmTestReducer());

    act(() => {
      result.current.dispatch({ type: "INIT_SESSION", e1rm: 100, exercise: mockExercise });
    });
    act(() => {
      result.current.dispatch({ type: "RESET" });
    });

    expect(result.current.state.phase).toBe("SETUP");
    expect(result.current.state.warmupSets).toHaveLength(0);
    expect(result.current.state.attempts).toHaveLength(0);
    expect(result.current.state.restStartedAt).toBeNull();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
Set-Location -LiteralPath "frontend"; npx vitest run tests/unit/features/workout/test-1rm/hooks/test1rmReducer.test.ts
```

Expected: FAIL — module not found

- [x] **Step 3: Write the implementation**

```typescript
// frontend/src/features/workout/test-1rm/hooks/use1rmTestReducer.ts
import { useReducer } from "react";
import type { TestSessionState, TestSessionAction } from "../types/Test1rmTypes";
import {
  buildWarmupSets,
  calculateAttemptPlannedWeight,
  recalculateOnFail,
} from "../utils/test1rmUtils";

const REST_DURATION_TARGET = 180; // 3 minutes default

function initialSessionState(): TestSessionState {
  return {
    phase: "SETUP",
    focusExercise: { kind: "custom", exerciseName: "" },
    e1rmBaselineKg: 0,
    warmupSets: [],
    attempts: [],
    restStartedAt: null,
    restDurationTarget: REST_DURATION_TARGET,
  };
}

function testSessionReducer(
  state: TestSessionState,
  action: TestSessionAction,
): TestSessionState {
  switch (action.type) {
    case "INIT_SESSION": {
      return {
        ...state,
        phase: "WARM_UP",
        focusExercise: action.exercise,
        e1rmBaselineKg: action.e1rm,
        warmupSets: buildWarmupSets(action.e1rm, "kg"),
        attempts: [],
        restStartedAt: null,
      };
    }

    case "COMPLETE_WARMUP": {
      const warmupSets = state.warmupSets.map((ws, i) =>
        i === action.index ? { ...ws, completed: true } : ws,
      );
      return { ...state, warmupSets };
    }

    case "FINISH_WARMUPS": {
      const firstPlannedWeight = calculateAttemptPlannedWeight(
        state.e1rmBaselineKg,
        1,
        "kg",
      );
      return {
        ...state,
        phase: "TESTING",
        attempts: [
          {
            attemptNumber: 1,
            plannedWeightKg: firstPlannedWeight,
            actualWeightKg: null,
            actualReps: null,
            actualRpe: null,
            verdict: "PENDING",
          },
        ],
      };
    }

    case "SAVE_VERDICT": {
      const currentIdx = state.attempts.length - 1;
      const attempts = state.attempts.map((a, i) =>
        i === currentIdx
          ? {
              ...a,
              actualWeightKg: action.weight,
              actualReps: action.reps,
              actualRpe: action.rpe,
              verdict: action.verdict,
            }
          : a,
      );
      return { ...state, attempts, restStartedAt: action.timestamp };
    }

    case "UPDATE_ATTEMPT_WEIGHT": {
      const attempts = state.attempts.map((a, i) =>
        i === action.attemptIdx
          ? { ...a, plannedWeightKg: action.weight }
          : a,
      );
      return { ...state, attempts };
    }

    case "ADVANCE_TO_NEXT_ATTEMPT": {
      const prevAttempt = state.attempts[state.attempts.length - 1];
      const attemptNumber = state.attempts.length + 1;
      const isSuccess = prevAttempt.verdict === "SUCCESS";

      const nextPlannedWeight = action.plannedWeight ?? (
        isSuccess
          ? calculateAttemptPlannedWeight(state.e1rmBaselineKg, attemptNumber, "kg")
          : recalculateOnFail(state.e1rmBaselineKg, attemptNumber, "kg")
      );

      const newAttempt = {
        attemptNumber,
        plannedWeightKg: nextPlannedWeight,
        actualWeightKg: null,
        actualReps: null,
        actualRpe: null,
        verdict: "PENDING" as const,
      };

      const phase = attemptNumber >= 3 ? "COMPLETED" as const : "TESTING" as const;
      return {
        ...state,
        phase,
        attempts: [...state.attempts, newAttempt],
        restStartedAt: null,
      };
    }

    case "FINISH_EARLY": {
      return { ...state, phase: "COMPLETED" };
    }

    case "RESET": {
      return initialSessionState();
    }

    default:
      return state;
  }
}

export function use1rmTestReducer() {
  const [state, dispatch] = useReducer(testSessionReducer, null, initialSessionState);
  return { state, dispatch } as const;
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
Set-Location -LiteralPath "frontend"; npx vitest run tests/unit/features/workout/test-1rm/hooks/test1rmReducer.test.ts
```

Expected: All tests PASS

- [x] **Step 5: Commit**

```bash
git add frontend/src/features/workout/test-1rm/hooks/use1rmTestReducer.ts frontend/tests/unit/features/workout/test-1rm/hooks/test1rmReducer.test.ts
git commit -m "feat: add 1RM test reducer with SAVE_VERDICT / ADVANCE separation"
```

---

### Task 5: Rest Timer Hook (useTestRestTimer.ts)

**Files:**
- Create: `frontend/src/features/workout/test-1rm/hooks/useTestRestTimer.ts`
- Create: `frontend/tests/unit/features/workout/test-1rm/hooks/useTestRestTimer.test.ts`

**Interfaces:**
- Produces: `useTestRestTimer(restStartedAt, targetSeconds)` returning `{ elapsedSeconds, isActive, isOverTarget, displayLabel }`

- [x] **Step 1: Write the failing tests**

```typescript
// tests/unit/features/workout/test-1rm/hooks/useTestRestTimer.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTestRestTimer } from "@/features/workout/test-1rm/hooks/useTestRestTimer";

describe("useTestRestTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is inactive when restStartedAt is null", () => {
    const { result } = renderHook(() => useTestRestTimer(null, 180));
    expect(result.current.isActive).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("ticks elapsed seconds after restStartedAt is set", () => {
    const now = Date.now();
    const { result } = renderHook(() => useTestRestTimer(now, 180));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(5);
    expect(result.current.isActive).toBe(true);
    expect(result.current.isOverTarget).toBe(false);
  });

  it("marks isOverTarget when elapsed exceeds target", () => {
    const now = Date.now();
    const { result } = renderHook(() => useTestRestTimer(now, 3));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isOverTarget).toBe(true);
    expect(result.current.displayLabel).toContain("0:05");
  });

  it("resets when restStartedAt changes to a new timestamp", () => {
    const now = Date.now();
    const { result, rerender } = renderHook(
      ({ startedAt }) => useTestRestTimer(startedAt, 180),
      { initialProps: { startedAt: now as number | null } },
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    const later = Date.now() + 20000;
    rerender({ startedAt: later });

    expect(result.current.elapsedSeconds).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Expected: FAIL — module not found

- [x] **Step 3: Write the implementation**

```typescript
// frontend/src/features/workout/test-1rm/hooks/useTestRestTimer.ts
import { useState, useEffect, useRef } from "react";
import { formatRestTime } from "@/features/workout/entries/utils/restTime";

export function useTestRestTimer(
  restStartedAt: number | null,
  targetSeconds: number,
) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const rafRef = useRef<number | null>(null);
  const resetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (restStartedAt === null) {
      setElapsedSeconds(0);
      return;
    }

    const key = String(restStartedAt);
    if (key !== resetKeyRef.current) {
      resetKeyRef.current = key;
      setElapsedSeconds(0);
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - restStartedAt) / 1000);
      setElapsedSeconds(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [restStartedAt]);

  const safeTarget = Math.max(0, Math.round(targetSeconds));
  const isActive = restStartedAt !== null;
  const isOverTarget = isActive && elapsedSeconds > safeTarget;

  return {
    elapsedSeconds,
    isActive,
    isOverTarget,
    displayLabel: `${formatRestTime(elapsedSeconds)} / ${formatRestTime(safeTarget)}`,
  };
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
Set-Location -LiteralPath "frontend"; npx vitest run tests/unit/features/workout/test-1rm/hooks/useTestRestTimer.test.ts
```

Expected: All tests PASS

- [x] **Step 5: Commit**

```bash
git add frontend/src/features/workout/test-1rm/hooks/useTestRestTimer.ts frontend/tests/unit/features/workout/test-1rm/hooks/useTestRestTimer.test.ts
git commit -m "feat: add standalone useTestRestTimer hook with requestAnimationFrame"
```

---

### Task 6: React Query Hooks (Baseline, Initiate, Complete, Deload)

**Files:**
- Create: `frontend/src/features/workout/test-1rm/hooks/use1rmBaseline.ts`
- Create: `frontend/src/features/workout/test-1rm/hooks/useInitiateTestProtocol.ts`
- Create: `frontend/src/features/workout/test-1rm/hooks/useCompleteTestSession.ts`
- Create: `frontend/src/features/workout/test-1rm/hooks/useProgrammeDeload.ts`

**Interfaces:**
- Consumes: `TestSessionState` from `Test1rmTypes.ts`; `useWorkoutEntries` (for `createWorkoutEntry`); `useWeeks` (for `updateWeek`, `setDeloadWeek`); `estimate1RM` from `1rmEstimateHelper.ts`; `calculateBestSetE1rm` from `workoutEntryHelpers.ts`
- Produces: `use1rmBaseline(exerciseDefinitionId)` returns `{ e1rm: number | null, isLoading }`; `useInitiateTestProtocol()` returns `{ initiate: (weekId, workoutId, sets) => void, isTapering: boolean }`; `useCompleteTestSession()` returns `{ complete: (state, templateId) => void, isCompleting: boolean }`; `useProgrammeDeload()` returns `{ applyDeload: (weekId) => void, isApplying: boolean }`

- [x] **Step 1: Create `use1rmBaseline.ts`**

```typescript
// frontend/src/features/workout/test-1rm/hooks/use1rmBaseline.ts
import { useQuery } from "@tanstack/react-query";
import { workoutApi } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import { estimate1RM } from "@/features/workout/entries/utils/1rmEstimateHelper";
import { calculateBestSetE1rm } from "@/features/workout/entries/utils/workoutEntryHelpers";

type SetLike = { reps: string | number; weight?: string | number | null };

export function use1rmBaseline(exerciseDefinitionId: string | undefined) {
  return useQuery({
    queryKey: ["1rm-baseline", exerciseDefinitionId],
    queryFn: async () => {
      if (!exerciseDefinitionId) return null;
      const { data } = await workoutApi.get(
        `/workout-entries/by-exercise/${exerciseDefinitionId}?page=0&size=10`,
      );
      const entries = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items ?? [];

      let bestE1rm = 0;
      for (const entry of entries as Array<{
        exercises: Array<{ sets: SetLike[] }>;
      }>) {
        const exerciseEntry = entry.exercises?.[0];
        if (!exerciseEntry?.sets?.length) continue;

        for (const set of exerciseEntry.sets) {
          const reps = Number(set.reps);
          const weight = Number(set.weight ?? 0);
          if (reps <= 0 || weight <= 0) continue;

          const { epley, brzycki, lombardi } = estimate1RM(weight, reps);
          const medianE1rm = Math.max(
            Math.min(epley, brzycki),
            Math.min(Math.max(epley, brzycki), lombardi),
          );
          if (medianE1rm > bestE1rm) bestE1rm = medianE1rm;
        }
      }

      return bestE1rm > 0 ? Math.round(bestE1rm * 100) / 100 : null;
    },
    enabled: !!exerciseDefinitionId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
```

- [x] **Step 2: Create `useInitiateTestProtocol.ts`**

```typescript
// frontend/src/features/workout/test-1rm/hooks/useInitiateTestProtocol.ts
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import useWeeks from "@/features/periodisation/week/hooks/useWeeks";

export function useInitiateTestProtocol() {
  const navigate = useNavigate();
  const { updateWeek } = useWeeks();
  const [isTapering, setIsTapering] = useState(false);

  const initiate = async (
    weekId: string,
    workoutTemplateId: string,
    currentTargetSets: number,
    nextWeekDeloadInfo?: { nextWeekId: string; nextWeekTargetSets: number },
  ) => {
    setIsTapering(true);
    try {
      const reducedSets = Math.max(1, Math.round(currentTargetSets * 0.5));
      await updateWeek({
        id: weekId,
        updates: { targetSetsPerExercise: reducedSets, rpeOverrideMax: 7 },
      });
      navigate(`/workout/${workoutTemplateId}/test-1rm`, {
        state: nextWeekDeloadInfo ?? null,
      });
    } catch {
      enqueueSnackbar("Failed to initiate test protocol", { variant: "error" });
    } finally {
      setIsTapering(false);
    }
  };

  return { initiate, isTapering };
}
```

- [x] **Step 3: Create `useCompleteTestSession.ts`**

```typescript
// frontend/src/features/workout/test-1rm/hooks/useCompleteTestSession.ts
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { enqueueSnackbar } from "notistack";
import useWorkoutEntries from "@/features/workout/entries/hooks/useWorkoutEntries";
import type { TestSessionState } from "../types/Test1rmTypes";
import type { CreateWorkoutEntryRequest } from "@/features/workout/types/Workout";

export function useCompleteTestSession() {
  const navigate = useNavigate();
  const { createWorkoutEntry } = useWorkoutEntries();
  const [isCompleting, setIsCompleting] = useState(false);

  const complete = async (state: TestSessionState, workoutTemplateId: string) => {
    setIsCompleting(true);
    try {
      const payload: CreateWorkoutEntryRequest = {
        workoutTemplateId,
        is1rmTest: true,
        exercises: [
          {
            exerciseDefinitionId: state.focusExercise.exerciseDefinitionId ?? undefined,
            exerciseName: state.focusExercise.exerciseName,
            variant: state.focusExercise.variant ?? undefined,
            goalSets: state.warmupSets.length + state.attempts.length,
            exerciseInfoId: state.focusExercise.exerciseInfoId ?? undefined,
            sets: [
              ...state.warmupSets.filter((ws) => ws.completed).map((ws) => ({
                reps: ws.targetReps,
                weight: ws.targetWeightKg,
                rpe: 7,
                setRole: null,
              })),
              ...state.attempts.filter((a) => a.verdict !== "PENDING").map((a) => ({
                reps: a.actualReps ?? 0,
                weight: a.actualWeightKg ?? a.plannedWeightKg,
                rpe: a.actualRpe ?? 10,
                setRole: "TOP_SINGLE" as const,
              })),
            ],
          },
        ],
        notes: undefined,
      };

      await createWorkoutEntry(payload);
      enqueueSnackbar("1RM test saved", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to save 1RM test", { variant: "error" });
      throw new Error("Save failed");
    } finally {
      setIsCompleting(false);
    }
  };

  return { complete, isCompleting };
}
```

- [x] **Step 4: Create `useProgrammeDeload.ts`**

```typescript
// frontend/src/features/workout/test-1rm/hooks/useProgrammeDeload.ts
import { useState } from "react";
import { enqueueSnackbar } from "notistack";
import useWeeks from "@/features/periodisation/week/hooks/useWeeks";

export function useProgrammeDeload() {
  const { updateWeek, setDeloadWeek } = useWeeks();
  const [isApplying, setIsApplying] = useState(false);

  const applyDeload = async (nextWeekId: string, currentTargetSets: number) => {
    setIsApplying(true);
    try {
      const reducedSets = Math.max(1, Math.round(currentTargetSets * 0.5));
      await Promise.all([
        setDeloadWeek({ id: nextWeekId, updates: { deload: true } }),
        updateWeek({
          id: nextWeekId,
          updates: { targetSetsPerExercise: reducedSets, rpeOverrideMax: 6 },
        }),
      ]);
      enqueueSnackbar("Recovery week scheduled", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to schedule recovery week", { variant: "error" });
    } finally {
      setIsApplying(false);
    }
  };

  return { applyDeload, isApplying };
}
```

- [x] **Step 5: Commit**

```bash
git add frontend/src/features/workout/test-1rm/hooks/use1rmBaseline.ts frontend/src/features/workout/test-1rm/hooks/useInitiateTestProtocol.ts frontend/src/features/workout/test-1rm/hooks/useCompleteTestSession.ts frontend/src/features/workout/test-1rm/hooks/useProgrammeDeload.ts
git commit -m "feat: add React Query hooks for baseline, taper, completion, and deload"
```

---

### Task 7: UI Components

**Files:**
- Create: `frontend/src/features/workout/test-1rm/components/RestTimerOverlay.tsx`
- Create: `frontend/src/features/workout/test-1rm/components/TestSetupPanel.tsx`
- Create: `frontend/src/features/workout/test-1rm/components/WarmupPanel.tsx`
- Create: `frontend/src/features/workout/test-1rm/components/AttemptPanel.tsx`
- Create: `frontend/src/features/workout/test-1rm/components/CompletionPanel.tsx`
- Create: `frontend/src/features/workout/test-1rm/components/TestSessionPage.tsx`

**Interfaces:**
- Consumes: `useTestRestTimer`, `use1rmTestReducer`, `use1rmBaseline`, `useCompleteTestSession`, `useProgrammeDeload`; `useWorkoutContext` (for `format`, `workoutTemplate`, `lastEntry`)
- Produces: `TestSessionPage` component (default export); sub-panels consume `state` + `dispatch` via props

- [x] **Step 1: Create `RestTimerOverlay.tsx`**

```tsx
// frontend/src/features/workout/test-1rm/components/RestTimerOverlay.tsx
import { useTestRestTimer } from "../hooks/useTestRestTimer";
import { Clock } from "lucide-react";

type RestTimerOverlayProps = {
  restStartedAt: number | null;
  targetSeconds: number;
  onSkip: () => void;
};

export default function RestTimerOverlay({
  restStartedAt,
  targetSeconds,
  onSkip,
}: RestTimerOverlayProps) {
  const { elapsedSeconds, isActive, isOverTarget, displayLabel } =
    useTestRestTimer(restStartedAt, targetSeconds);

  if (!isActive) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-primary">
          {isOverTarget ? "Ready to go" : "Rest period"}
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {displayLabel}
      </p>
      {isOverTarget ? (
        <p className="text-xs text-muted-foreground">
          Rest complete. Continue when ready.
        </p>
      ) : (
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip rest
        </button>
      )}
    </div>
  );
}
```

- [x] **Step 2: Create `TestSetupPanel.tsx`**

```tsx
// frontend/src/features/workout/test-1rm/components/TestSetupPanel.tsx
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Panel from "@/components/layout/frames/Panel";
import StatTile from "@/components/ui/stat-tile";
import StatGrid from "@/components/ui/StatGrid";
import { use1rmBaseline } from "../hooks/use1rmBaseline";
import type { TestSessionState } from "../types/Test1rmTypes";
import type { ExerciseConfig, ExerciseDefinition } from "@/features/workout/types/Workout";

type TestSetupPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<{ type: "INIT_SESSION"; e1rm: number; exercise: TestSessionState["focusExercise"] }>;
  exercises: (ExerciseConfig & { exerciseDefinition: ExerciseDefinition })[];
};

export default function TestSetupPanel({ state, dispatch, exercises }: TestSetupPanelProps) {
  const focusExercise = exercises.find((ex) => ex.focus) ?? exercises[0];
  const exerciseDefId = focusExercise?.exerciseDefinition?.id;
  const { data: e1rm, isLoading } = use1rmBaseline(exerciseDefId);

  const handleStart = () => {
    if (!focusExercise || !e1rm) return;
    dispatch({
      type: "INIT_SESSION",
      e1rm,
      exercise: {
        kind: "definition" as const,
        exerciseDefinitionId: focusExercise.exerciseDefinition?.id,
        exerciseInfoId: focusExercise.exerciseDefinition?.exerciseInfo?.id ?? undefined,
        exerciseName: focusExercise.exerciseDefinition?.exerciseName ?? "",
        variant: focusExercise.exerciseDefinition?.variant ?? undefined,
      },
    });
  };

  return (
    <Panel title="Setup" icon={Dumbbell} subtitle="Select your lift and review your baseline 1RM estimate">
      <StatGrid>
        <StatTile
          label="Estimated 1RM"
          value={isLoading ? "..." : e1rm ? `${e1rm} kg` : "No data"}
          icon={Dumbbell}
        />
      </StatGrid>
      {exercises.length > 1 && !focusExercise && (
        <p className="text-xs text-muted-foreground">
          Select a target exercise to begin the test protocol.
        </p>
      )}
      <Button
        onClick={handleStart}
        disabled={!e1rm || !focusExercise}
        className="w-full"
      >
        Start 1RM Test
      </Button>
      {!e1rm && !isLoading && (
        <p className="text-xs text-muted-foreground text-center">
          No historical data for this lift. Log at least one session to auto-calculate baseline.
        </p>
      )}
    </Panel>
  );
}
```

- [x] **Step 3: Create `WarmupPanel.tsx`**

```tsx
// frontend/src/features/workout/test-1rm/components/WarmupPanel.tsx
import { Check } from "lucide-react";
import Panel from "@/components/layout/frames/Panel";
import { Button } from "@/components/ui/button";
import type { TestSessionState, TestSessionAction } from "../types/Test1rmTypes";

type WarmupPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<TestSessionAction>;
  format: (kg: number) => string;
};

export default function WarmupPanel({ state, dispatch, format }: WarmupPanelProps) {
  const allCompleted = state.warmupSets.every((ws) => ws.completed);

  return (
    <Panel title="Warm-Up" subtitle="Complete each warm-up set before moving to attempts">
      <div className="space-y-2">
        {state.warmupSets.map((ws, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              ws.completed
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <div>
              <span className="text-sm font-semibold">
                {Math.round(ws.percentage * 100)}% — {format(ws.targetWeightKg)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                {ws.targetReps} {ws.targetReps === 1 ? "rep" : "reps"}
              </span>
            </div>
            <Button
              size="sm"
              variant={ws.completed ? "secondary" : "default"}
              onClick={() => dispatch({ type: "COMPLETE_WARMUP", index: i })}
              disabled={ws.completed}
            >
              {ws.completed ? <Check className="h-4 w-4" /> : "Done"}
            </Button>
          </div>
        ))}
      </div>
      <Button
        onClick={() => dispatch({ type: "FINISH_WARMUPS" })}
        disabled={!allCompleted}
        className="w-full mt-3"
      >
        Begin Attempts
      </Button>
    </Panel>
  );
}
```

- [x] **Step 4: Create `AttemptPanel.tsx`**

```tsx
// frontend/src/features/workout/test-1rm/components/AttemptPanel.tsx
import { useState } from "react";
import { Target } from "lucide-react";
import Panel from "@/components/layout/frames/Panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import RestTimerOverlay from "./RestTimerOverlay";
import type { TestSessionState, TestSessionAction, AttemptVerdict } from "../types/Test1rmTypes";

type AttemptPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<TestSessionAction>;
  format: (kg: number) => string;
};

export default function AttemptPanel({ state, dispatch, format }: AttemptPanelProps) {
  const currentIdx = state.attempts.length - 1;
  const currentAttempt = state.attempts[currentIdx];
  const isAtMax = state.attempts.length >= 3;
  const hasVerdict = state.attempts.some((a) => a.verdict !== "PENDING");
  const currentHasVerdict = currentAttempt?.verdict !== "PENDING";

  const getNextDefaultWeight = () => {
    if (!currentAttempt) return 0;
    const nextNum = currentIdx + 2;
    const isSuccess = currentAttempt.verdict === "SUCCESS";
    return isSuccess
      ? calculateAttemptPlannedWeight(state.e1rmBaselineKg, nextNum, "kg")
      : recalculateOnFail(state.e1rmBaselineKg, nextNum, "kg");
  };

  const [weightInput, setWeightInput] = useState(
    currentAttempt ? String(currentAttempt.plannedWeightKg) : "",
  );

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const num = parseFloat(value);
    if (!isNaN(num)) {
      dispatch({ type: "UPDATE_ATTEMPT_WEIGHT", attemptIdx: currentIdx, weight: num });
    }
  };

  const handleVerdict = (verdict: AttemptVerdict) => {
    const weight = parseFloat(weightInput) || currentAttempt.plannedWeightKg;
    dispatch({
      type: "SAVE_VERDICT",
      weight,
      reps: verdict === "SUCCESS" ? 1 : 0,
      rpe: verdict === "SUCCESS" ? 9 : 10,
      verdict,
      timestamp: Date.now(),
    });
    // Pre-fill the weight input with the next attempt's auto-calculated weight
    // so the user can edit it during rest
    const nextWeight = verdict === "SUCCESS"
      ? calculateAttemptPlannedWeight(state.e1rmBaselineKg, currentIdx + 2, "kg")
      : recalculateOnFail(state.e1rmBaselineKg, currentIdx + 2, "kg");
    setWeightInput(String(nextWeight));
  };

  const handleAdvance = () => {
    const plannedWeight = parseFloat(weightInput);
    dispatch({
      type: "ADVANCE_TO_NEXT_ATTEMPT",
      plannedWeight: isNaN(plannedWeight) ? undefined : plannedWeight,
    });
    setWeightInput("");
  };

  if (!currentAttempt) return null;

  return (
    <Panel
      title={`Attempt ${currentIdx + 1} of ${Math.min(state.attempts.length + (isAtMax ? 0 : 1), 3)}`}
      icon={Target}
    >
      <div className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground">Weight</Label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={weightInput}
              onChange={(e) => handleWeightChange(e.target.value)}
              placeholder={currentHasVerdict ? "Weight for next attempt" : format(currentAttempt.plannedWeightKg)}
              className="h-12 w-full rounded-md border bg-background px-4 text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {!currentHasVerdict && (
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => handleVerdict("SUCCESS")}
              disabled={!weightInput}
            >
              Success
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => handleVerdict("FAIL")}
              disabled={!weightInput}
            >
              Fail
            </Button>
          </div>
        )}

        <RestTimerOverlay
          restStartedAt={state.restStartedAt}
          targetSeconds={state.restDurationTarget}
          onSkip={handleAdvance}
        />

        {currentHasVerdict && !isAtMax && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleAdvance}
          >
            Next Attempt
          </Button>
        )}

        {hasVerdict && !isAtMax && (
          <button
            type="button"
            onClick={() => dispatch({ type: "FINISH_EARLY" })}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            Finish testing early
          </button>
        )}
      </div>
    </Panel>
  );
}
```

- [x] **Step 5: Create `CompletionPanel.tsx`**

```tsx
// frontend/src/features/workout/test-1rm/components/CompletionPanel.tsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Trophy, Flame } from "lucide-react";
import Panel from "@/components/layout/frames/Panel";
import { Button } from "@/components/ui/button";
import StatTile from "@/components/ui/stat-tile";
import StatGrid from "@/components/ui/StatGrid";
import { estimate1RM } from "@/features/workout/entries/utils/1rmEstimateHelper";
import { useCompleteTestSession } from "../hooks/useCompleteTestSession";
import { useProgrammeDeload } from "../hooks/useProgrammeDeload";
import type { TestSessionState, TestSessionAction } from "../types/Test1rmTypes";

type CompletionPanelProps = {
  state: TestSessionState;
  dispatch: React.Dispatch<TestSessionAction>;
  workoutTemplateId: string;
  format: (kg: number) => string;
};

export default function CompletionPanel({
  state,
  dispatch,
  workoutTemplateId,
  format,
}: CompletionPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const deloadInfo = location.state as
    | { nextWeekId: string; nextWeekTargetSets: number }
    | null
    | undefined;
  const { complete, isCompleting } = useCompleteTestSession();
  const { applyDeload } = useProgrammeDeload();

  const bestAttempt = state.attempts
    .filter((a) => a.verdict === "SUCCESS")
    .reduce(
      (best, a) => ((a.actualWeightKg ?? 0) > (best?.actualWeightKg ?? 0) ? a : best),
      null as typeof state.attempts[number] | null,
    );

  const newE1rm = bestAttempt
    ? (() => {
        const { epley, brzycki, lombardi } = estimate1RM(
          bestAttempt.actualWeightKg!,
          bestAttempt.actualReps ?? 1,
        );
        const median = Math.max(
          Math.min(epley, brzycki),
          Math.min(Math.max(epley, brzycki), lombardi),
        );
        return Math.round(median * 100) / 100;
      })()
    : null;

  const delta = newE1rm !== null ? newE1rm - state.e1rmBaselineKg : null;

  useEffect(() => {
    const save = async () => {
      try {
        await complete(state, workoutTemplateId);
        if (deloadInfo?.nextWeekId) {
          await applyDeload(deloadInfo.nextWeekId, deloadInfo.nextWeekTargetSets);
        }
      } catch {
        // Errors already shown via snackbar in hooks
      }
    };
    save();
  }, []);

  return (
    <Panel title="Test Complete" icon={Trophy} subtitle="Your results">
      <StatGrid>
        {bestAttempt && (
          <StatTile
            label="Best Lift"
            value={format(bestAttempt.actualWeightKg!)}
            icon={Trophy}
          />
        )}
        {newE1rm !== null && (
          <StatTile
            label="New E1RM"
            value={`${newE1rm} kg`}
            icon={Flame}
          />
        )}
        {delta !== null && (
          <StatTile
            label="Improvement"
            value={`${delta > 0 ? "+" : ""}${delta} kg`}
            description={delta > 0 ? "From previous baseline" : "No change from baseline"}
          />
        )}
      </StatGrid>

      {deloadInfo ? (
        <p className="text-sm text-muted-foreground">
          Recovery week scheduled — volume reduced for the next 7 days.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No upcoming week to deload — take a light week manually.
        </p>
      )}

      <Button
        onClick={() => navigate(-1 as unknown as string)}
        className="w-full"
      >
        Back to Programme
      </Button>
    </Panel>
  );
}
```

- [x] **Step 6: Create `TestSessionPage.tsx`**

```tsx
// frontend/src/features/workout/test-1rm/components/TestSessionPage.tsx
import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";
import Page from "@/components/layout/frames/Page";
import { use1rmTestReducer } from "../hooks/use1rmTestReducer";
import TestSetupPanel from "./TestSetupPanel";
import WarmupPanel from "./WarmupPanel";
import AttemptPanel from "./AttemptPanel";
import CompletionPanel from "./CompletionPanel";
import { Dumbbell } from "lucide-react";

export default function TestSessionPage() {
  const { workoutTemplate, format } = useWorkoutContext();
  const { state, dispatch } = use1rmTestReducer();

  const exercises = workoutTemplate?.exercises ?? [];

  return (
    <Page
      title="1RM Test"
      subtitle={
        workoutTemplate
          ? `${workoutTemplate.name} — ${state.phase === "COMPLETED" ? "Complete" : "In Progress"}`
          : undefined
      }
      icon={Dumbbell}
    >
      {state.phase === "SETUP" && (
        <TestSetupPanel state={state} dispatch={dispatch} exercises={exercises} />
      )}
      {state.phase === "WARM_UP" && (
        <WarmupPanel state={state} dispatch={dispatch} format={format} />
      )}
      {state.phase === "TESTING" && (
        <AttemptPanel state={state} dispatch={dispatch} format={format} />
      )}
      {state.phase === "COMPLETED" && (
        <CompletionPanel
          state={state}
          dispatch={dispatch}
          workoutTemplateId={workoutTemplate?.id ?? ""}
          format={format}
        />
      )}
    </Page>
  );
}
```

- [x] **Step 7: Commit**

```bash
git add frontend/src/features/workout/test-1rm/components/RestTimerOverlay.tsx frontend/src/features/workout/test-1rm/components/TestSetupPanel.tsx frontend/src/features/workout/test-1rm/components/WarmupPanel.tsx frontend/src/features/workout/test-1rm/components/AttemptPanel.tsx frontend/src/features/workout/test-1rm/components/CompletionPanel.tsx frontend/src/features/workout/test-1rm/components/TestSessionPage.tsx
git commit -m "feat: add 1RM test session UI components"
```

---

### Task 8: Route Integration

**Files:**
- Modify: `frontend/src/AppRoutes.tsx`

**Interfaces:**
- Consumes: `TestSessionPage` from `test-1rm/components/TestSessionPage`
- Produces: `/workout/:workoutId/test-1rm` route under WorkoutLayout

- [x] **Step 1: Read `AppRoutes.tsx` to find the WorkoutLayout route block**

- [x] **Step 2: Add the test route**

Find the WorkoutLayout route segment, it will look similar to:
```tsx
<Route path="/workout/:workoutId" element={<WorkoutLayout />}>
  <Route index element={<SelectedWorkoutPage />} />
  <Route path="create" element={<WorkoutEntryEditorPage />} />
  <Route path="edit" element={<ModifyWorkoutPage />} />
  <Route path="entry/:id/edit" element={<WorkoutEntryEditorPage />} />
</Route>
```

Add the new route before the closing `</Route>`:
```tsx
  <Route path="test-1rm" element={<TestSessionPage />} />
```

And add the import at the top of the file:
```tsx
import TestSessionPage from "@/features/workout/test-1rm/components/TestSessionPage";
```

- [x] **Step 3: Verify the route is added before the closing WorkoutLayout Route tag**

- [x] **Step 4: Commit**

```bash
git add frontend/src/AppRoutes.tsx
git commit -m "feat: add /workout/:workoutId/test-1rm route"
```

---

### Task 9: Programme Week "Test 1RM" Button

**Files:**
- Modify: `frontend/src/features/periodisation/components/panels/BlockPanel.tsx`
- Modify: `frontend/src/features/periodisation/week/components/WeekCard.tsx`

**Interfaces:**
- Consumes: `useInitiateTestProtocol`; programme context (split workouts)
- Produces: "Test 1RM" button visible on PEAKING block weeks

- [x] **Step 1: Read `BlockPanel.tsx` and `WeekCard.tsx` to get exact current content**

- [x] **Step 2: Update `WeekCard.tsx` to accept and render workout template buttons**

Add new props to `WeekCard`:
```typescript
type WorkoutTemplateInfo = {
  id: string;
  name: string;
  hasFocusExercise: boolean;
};

// Add to existing props:
workoutTemplates?: WorkoutTemplateInfo[];
onTest1rm?: (workoutTemplateId: string, weekId: string, currentTargetSets: number) => void;
isPeakingBlock?: boolean;
```

Inside the `WeekCard` JSX, after the existing deload/intensity/sets controls, add:
```tsx
{isPeakingBlock && workoutTemplates && workoutTemplates.length > 0 && (
  <div className="mt-3 space-y-2">
    {workoutTemplates.map((wt) => (
      <div key={wt.id} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2">
        <span className="text-sm font-medium">{wt.name}</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTest1rm?.(wt.id, week.id, week.targetSetsPerExercise)}
            disabled={!wt.hasFocusExercise}
            title={!wt.hasFocusExercise ? "No focus exercise set on this workout" : undefined}
          >
            Test 1RM
          </Button>
        </div>
      </div>
    ))}
  </div>
)}
```

- [x] **Step 3: Update `BlockPanel.tsx` to pass workout templates, PEAKING flag, and next week info to `WeekCard`**

The `BlockPanel` needs access to the split's workout templates and must compute the next week ID for the deload. Update the component to receive workout template info and pass it through:

```tsx
// In BlockPanel, add a new prop:
workoutTemplates?: Array<{ id: string; name: string; hasFocusExercise: boolean }>;

// Helper to compute next week info for deload
const computeNextWeekInfo = (weekIdx: number) => {
  const nextWeek = sortedWeeks[weekIdx + 1];
  return nextWeek
    ? { nextWeekId: nextWeek.id, nextWeekTargetSets: nextWeek.targetSetsPerExercise }
    : undefined;
};

const handleTest1rm = async (
  workoutTemplateId: string,
  weekId: string,
  currentTargetSets: number,
  nextWeekInfo?: { nextWeekId: string; nextWeekTargetSets: number },
) => {
  await initiateTestProtocol(weekId, workoutTemplateId, currentTargetSets, nextWeekInfo);
};
```

Then in the `WeekCard` loop:
```tsx
{sortedWeeks.map((week, idx) => (
  <WeekCard
    key={week.id}
    week={week}
    onUpdateDeload={handleUpdateDeload}
    onUpdateTargetSets={handleUpdateTargetSets}
    isReadOnly={isArchivedProgramme}
    isPeakingBlock={block?.blockType === "PEAKING"}
    workoutTemplates={workoutTemplates}
    onTest1rm={(workoutTemplateId, weekId, sets) =>
      handleTest1rm(workoutTemplateId, weekId, sets, computeNextWeekInfo(idx))
    }
  />
))}
```

- [x] **Step 4: Update `PeriodisationSplitDetailPage.tsx` to pass workout templates to `BlockPanel`**

Read the programme context at the page level to get the split's workout templates, and pass them to BlockPanel. The split has `workoutFrequencies` which links to workout templates.

- [x] **Step 5: Commit**

```bash
git add frontend/src/features/periodisation/components/panels/BlockPanel.tsx frontend/src/features/periodisation/week/components/WeekCard.tsx frontend/src/pages/periodisation/PeriodisationSplitDetailPage.tsx
git commit -m "feat: add Test 1RM button to PEAKING block weeks"
```

---

### Task 10: Integration Tests

**Files:**
- Create: `frontend/tests/unit/features/workout/test-1rm/components/TestSessionPage.test.tsx`
- Create: `frontend/tests/unit/features/workout/test-1rm/components/RestTimerOverlay.test.tsx`

- [x] **Step 1: Create `RestTimerOverlay.test.tsx`**

```tsx
// tests/unit/features/workout/test-1rm/components/RestTimerOverlay.test.tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import { renderWithProviders } from "tests/setup/test-utils";
import RestTimerOverlay from "@/features/workout/test-1rm/components/RestTimerOverlay";

describe("RestTimerOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when restStartedAt is null", () => {
    const { container } = renderWithProviders(
      <RestTimerOverlay restStartedAt={null} targetSeconds={180} onSkip={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows elapsed time and target", () => {
    const now = Date.now();
    renderWithProviders(
      <RestTimerOverlay restStartedAt={now} targetSeconds={180} onSkip={vi.fn()} />,
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText(/0:10 \/ 3:00/)).toBeInTheDocument();
  });

  it("calls onSkip when skip button is clicked", async () => {
    const now = Date.now();
    const onSkip = vi.fn();
    renderWithProviders(
      <RestTimerOverlay restStartedAt={now} targetSeconds={180} onSkip={onSkip} />,
    );

    const skipButton = screen.getByText("Skip rest");
    skipButton.click();
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
```

- [x] **Step 2: Create `TestSessionPage.test.tsx`**

```tsx
// tests/unit/features/workout/test-1rm/components/TestSessionPage.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "tests/setup/test-utils";
import TestSessionPage from "@/features/workout/test-1rm/components/TestSessionPage";

vi.mock("@/features/workout/hooks/useWorkoutContext", () => ({
  default: vi.fn(),
}));

import useWorkoutContext from "@/features/workout/hooks/useWorkoutContext";

const mockedUseWorkoutContext = vi.mocked(useWorkoutContext);

function buildContext(overrides: Record<string, unknown> = {}) {
  mockedUseWorkoutContext.mockReturnValue({
    workoutTemplate: {
      id: "tpl-1",
      name: "Heavy Squat Day",
      category: "Lower",
      exercises: [
        {
          exerciseConfigId: "ec-1",
          exerciseDefinition: {
            id: "def-1",
            exerciseName: "Squat",
            variant: "Competition",
          },
          goalSets: 5,
          focus: true,
        },
      ],
      createdAt: "2026-01-01T00:00:00Z",
    },
    lastEntry: null,
    entries: [],
    stats: null,
    isLoading: false,
    format: (kg: number) => `${kg} kg`,
    ...overrides,
  });
}

describe("TestSessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the SETUP phase with exercise info", () => {
    buildContext();
    renderWithProviders(<TestSessionPage />);

    expect(screen.getByText("1RM Test")).toBeInTheDocument();
    expect(screen.getByText("Start 1RM Test")).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Run integration tests**

```bash
Set-Location -LiteralPath "frontend"; npx vitest run tests/unit/features/workout/test-1rm/
```

- [x] **Step 4: Commit**

```bash
git add frontend/tests/unit/features/workout/test-1rm/components/
git commit -m "test: add integration tests for 1RM test session components"
```

---

### Task 11: Final Verification

- [x] **Step 1: Run all unit tests**

```bash
Set-Location -LiteralPath "frontend"; npx vitest run
```

Expected: All tests pass, no failures.

- [x] **Step 2: TypeScript check**

```bash
Set-Location -LiteralPath "frontend"; npx tsc --noEmit
```

Expected: No type errors.

- [x] **Step 3: Verify backend compiles** (if Java environment available)

```bash
Set-Location -LiteralPath "workout_service"; ./mvnw compile -q
```

Expected: BUILD SUCCESS.
