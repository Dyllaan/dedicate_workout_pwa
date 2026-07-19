# 1RM Testing Protocol — Design Specification

**Date:** 2026-07-19
**Status:** Design approved, implementation-ready (updated 2026-07-19 with codebase audit findings)

---

## Overview

A structured 1RM (One Rep Max) Testing Protocol that integrates into the existing programme architecture using PEAKING blocks, isDeload weeks, and existing lifting benchmarks. The feature guides users through a dedicated test session with progressive warm-ups, 1–3 competitive attempts, mandatory rest enforcement, and automatic post-test deload scheduling.

---

## 1. Type Layer

### State Machine Phases

```typescript
type TestPhase = "SETUP" | "WARM_UP" | "TESTING" | "COMPLETED";
```

During `TESTING`, the active attempt number is **derived** from `attempts.length` — not stored as a separate phase string. This eliminates phase/array sync bugs.

### Core Types

```typescript
type AttemptVerdict = "PENDING" | "SUCCESS" | "FAIL";

type WarmupSet = {
  percentage: number;        // 0.50, 0.70, 0.80, 0.90
  targetWeightKg: number;
  targetReps: number;        // 5, 3, 1, 1
  completed: boolean;
};

type MaxAttempt = {
  attemptNumber: number;     // 1, 2, 3 (UI caps at 3, user can stop early)
  plannedWeightKg: number;
  actualWeightKg: number | null;
  actualReps: 0 | 1 | null;
  actualRpe: number | null;
  verdict: AttemptVerdict;
};

type TestSessionState = {
  phase: TestPhase;
  focusExercise: ExerciseIdentityDraft & {
    exerciseDefinitionId?: string;
    exerciseInfoId?: number;
  };
  e1rmBaselineKg: number;

  warmupSets: WarmupSet[];
  attempts: MaxAttempt[];       // Flexible array, UI caps at length 3

  restStartedAt: number | null; // Date.now() timestamp, set on verdict save
  restDurationTarget: number;   // 180–300s (3–5 min), configurable

  is1rmTest: true;             // Serialization flag for analytics filtering
};
```

### Design Decisions

- **No REST phases in the enum.** Rest is a parallel timestamp flag (`restStartedAt`), triggered when a verdict is saved. The underlying phase stays at `TESTING` while the timer runs. The user can edit planned weights during rest.
- **Flexible `attempts: MaxAttempt[]`** instead of a rigid 3-tuple. UI enforces `attempts.length <= 3`. User can finish early after 1 or 2 attempts.
- **`is1rmTest: true`** marked at the entry level so downstream analytics (volume tracking, E1RM trends, RPE charts) can filter out failed 0-rep singles.

---

## 2. Reducer (`use1rmTestReducer`)

Pure reducer function wrapped in `useReducer`. Macro phases only: SETUP, WARM_UP, TESTING, COMPLETED.

### Actions

| Action | Phase | Effect |
|--------|-------|--------|
| `INIT_SESSION(e1rm, exercise)` | SETUP | Computes 4 warm-up sets (50/70/80/90% of E1RM) and first attempt planned weight (~92.5% E1RM). Phase → WARM_UP |
| `COMPLETE_WARMUP(index)` | WARM_UP | Marks warmupSets[i].completed = true |
| `FINISH_WARMUPS` | WARM_UP | Phase → TESTING. Pushes blank MaxAttempt to array |
| `SAVE_VERDICT(weight, reps, rpe, verdict)` | TESTING | Fills current attempt (index = attempts.length - 1). Sets `restStartedAt = Date.now()`. **Does NOT advance phase** |
| `UPDATE_ATTEMPT_WEIGHT(attemptIdx, weight)` | TESTING | Edits planned weight for any attempt (editable any time, including during rest) |
| `ADVANCE_TO_NEXT_ATTEMPT` | TESTING | Pushes new blank MaxAttempt with pre-calculated plannedWeight. Sets `restStartedAt = null`. If `attempts.length === 3`, phase → COMPLETED |
| `FINISH_EARLY` | TESTING | Phase → COMPLETED (available if at least 1 attempt has a verdict) |
| `RESET` | COMPLETED | Returns to initial SETUP state |

### Key Rule: SAVE_VERDICT ≠ ADVANCE

Saving a verdict and advancing to the next attempt are **separate actions**. This lets the lifter sit in rest, review a failed attempt, manually adjust the upcoming weight, and then click "Next Attempt" when mentally ready. The rest timer runs in the UI as a visual overlay — it never blocks state transitions.

### Attempt Weight Recalculation

- **SUCCESS on previous:** `prev.weight + roundToPlate(plateIncrement)` — typically 2.5kg or 5lb
- **FAIL on previous:** drops planned weight to ~97.5% of E1RM baseline

---

## 3. Scheduling & Mutations

### 3a. Taper Scheduling (`useInitiateTestProtocol`)

Fires when the user taps "Test 1RM" from the programme week view.

1. Finds the current active PEAKING block and its current week
2. Mutates the current week via the existing `updateWeek` endpoint:
   - `targetSetsPerExercise`: reduced by ~50% (volume slash)
   - `rpeOverrideMax`: capped at 7
   - **`intensityPct` preserved at 80–85%** (high intensity maintained to avoid detraining)
3. **Awaits the mutation** before navigating — the entire codebase uses `.mutateAsync()`. This follows the existing pattern seen in `CreateSplitPage.tsx`, `useWorkoutEntryForm.ts`, and `ProgrammeCustomPage.tsx`:

```typescript
// In useInitiateTestProtocol
await updateWeek({ id: currentWeek.id, updates: { targetSetsPerExercise: reducedSets, rpeOverrideMax: 7 } });
navigate(`/workout/${workoutId}/test-1rm`);
```

The `await` ensures React Query cache invalidation (from `updateWeek`'s `onSuccess`) fires before the test page mounts, so the test page sees the tapered week data.

### 3b. Test Session Completion (`useCompleteTestSession`)

Fires when phase hits COMPLETED. **Builds the payload inline** instead of using `buildWorkoutEntryPayload()` — this is critical because the existing builder filters out 0-rep sets (line 23: `.filter((set) => (parseInt(set.reps) || 0) > 0)`), which would strip failed maximum attempts from the record.

```typescript
// Inlined in useCompleteTestSession — bypasses buildWorkoutEntryPayload's 0-rep filter
const payload: CreateWorkoutEntryRequest = {
  workoutTemplateId: templateId,
  is1rmTest: true,
  exercises: [{
    exerciseDefinitionId: focusExercise.exerciseDefinitionId ?? undefined,
    exerciseName: focusExercise.exerciseName,
    variant: focusExercise.variant ?? undefined,
    goalSets: warmupSets.length + attempts.length,
    exerciseInfoId: focusExercise.exerciseInfoId ?? undefined,
    sets: [
      // Warm-up sets: regular sets, no TOP_SINGLE role
      ...warmupSets.filter(ws => ws.completed).map(ws => ({
        reps: ws.targetReps,
        weight: ws.targetWeightKg,
        rpe: null,
        setRole: null,
      })),
      // Attempt sets: TOP_SINGLE role, actualReps can be 0 (failed lift preserved)
      ...attempts.filter(a => a.verdict !== "PENDING").map(a => ({
        reps: a.actualReps ?? 0,
        weight: a.actualWeightKg ?? a.plannedWeightKg,
        rpe: a.actualRpe ?? 10,
        setRole: "TOP_SINGLE" as const,
      })),
    ],
  }],
  notes: undefined,
};

await createWorkoutEntry(payload);
```

Key points:
- **0-rep sets survive**: Unlike `buildWorkoutEntryPayload`, this payload includes all attempts regardless of rep count
- **setRole differentiates**: Warm-ups have no role; attempts are marked `TOP_SINGLE`
- **Only completed sets**: Warm-ups filtered to `completed: true`; attempts filtered to those with a verdict

### 3c. Post-Test Deload (`useProgrammeDeload`)

Fires alongside completion.

Finds the week immediately following the test week in the current PEAKING block, calls `updateWeek`:
- `isDeload: true`
- `rpeOverrideMax: 6`
- `targetSetsPerExercise`: reduced by 50%

---

## 4. Baseline Calculation (`use1rmBaseline`)

React Query hook that:
1. Fetches recent workout history for the selected focus exercise
2. Computes median E1RM across Epley, Brzycki, and Lombardi formulas (using existing `estimate1RM()` and `calculateBestSetE1rm()` utilities)
3. Falls back to manual weight input in the SETUP phase if no history exists

---

## 5. Rest Timer (`useTestRestTimer`)

Standalone hook — does **not** record `restBeforeSeconds` on sets.

```typescript
function useTestRestTimer(restStartedAt: number | null, targetSeconds: number) {
  // Uses requestAnimationFrame loop comparing Date.now() - restStartedAt delta
  // Returns { elapsedSeconds, isActive, isOverTarget, displayLabel }
}
```

- `requestAnimationFrame` instead of `setInterval` for smooth display
- Accuracy maintained across tab switches (compares absolute timestamps, not mutable counters)
- Returns `"M:SS"` format via existing `formatRestTime()`

---

## 6. UI Architecture

### Route

`/workout/:workoutId/test-1rm` — nested under `WorkoutLayout` (receives `workoutTemplate`, `format`, `lastEntry` via Outlet context).

### Entry Point

On the programme week view, PEAKING block workout templates show a "Test 1RM" action button. The button auto-selects the template's focus exercise. If no focus exercise exists, the SETUP phase shows a dropdown of all compound lifts from the template for manual selection (the page is never blocked from entry).

### Component Tree

```
TestSessionPage
├─ TestSetupPanel           (phase === "SETUP")
│   ├─ ExercisePicker       (dropdown of template exercises, defaults to focus)
│   └─ E1rmDisplay          (StatTile showing current estimated 1RM)
│
├─ WarmupPanel              (phase === "WARM_UP")
│   ├─ WarmupProgress       (4 progress circles)
│   └─ WarmupSetCard × 4    (DashCardRow: %, weight, reps, checkbox)
│
├─ AttemptPanel             (phase === "TESTING")
│   ├─ AttemptHeader        ("Attempt N of 3" — derived from attempts.length + 1)
│   ├─ WeightInput          (large numeric input, pre-filled with plannedWeight)
│   ├─ RepsInput            (0 or 1 selector)
│   ├─ RpeInput             (0–10)
│   ├─ VerdictButtons       (SUCCESS / FAIL — enabled when reps entered)
│   ├─ RestTimerOverlay     (conditional when restStartedAt within window)
│   ├─ NextAttemptButton    (visible when rest timer has passed or skipped)
│   └─ SkipLink             ("Finish testing" — FINISH_EARLY)
│
└─ CompletionPanel          (phase === "COMPLETED")
    ├─ ResultStatGrid       (new E1RM, best attempt, old vs new delta)
    └─ DeloadNotice         (StatTile: recovery week notice)
```

### Rest Timer Overlay

Rendered conditionally inside `AttemptPanel` when `restStartedAt` is set and elapsed < target:

- `bg-primary/10 border border-primary/20 rounded-2xl p-4` card
- Elapsed time in `text-3xl tabular-nums` (matches StatTile pattern)
- "Skip rest" link in `text-xs text-muted-foreground`
- Auto-dismisses when elapsed ≥ target, showing "Ready to go!" with pulsing "Next Attempt" trigger
- Does NOT block the weight input — user can edit next attempt's planned weight during rest

### UI Conventions

All components reuse existing patterns:
- `<Page>` wrapper with title/subtitle
- `<Panel>` for grouped sections
- `<StatTile>` + `<StatGrid>` for metric display
- `<DashCardRow>` for list items (warm-up set cards)
- Tailwind `bg-card`, `rounded-2xl`, `border`, `text-sm font-semibold`, `text-muted-foreground`

---

## 7. Backend Changes

Spring Boot's default `ObjectMapper` silently ignores unknown JSON fields. Sending `is1rmTest: true` from the frontend will be dropped unless the entire Java pipeline is updated. Three layers must change:

### Layer 1 — Database Migration

```sql
-- V11__add_1rm_test_flag.sql
ALTER TABLE workout_entries ADD COLUMN is_1rm_test BOOLEAN DEFAULT FALSE;
```

### Layer 2 — DTO (`WorkoutEntryRequest.java`)

Add `Boolean is1rmTest` as a record component:

```java
public record WorkoutEntryRequest(
        UUID workoutTemplateId,
        List<ExerciseEntryRequest> exercises,
        String notes,
        ReadinessCheckInRequestDTO readiness,
        Boolean is1rmTest       // <-- NEW: defaults to null (falsy) for normal entries
) implements DTO {
    public WorkoutEntryRequest(UUID workoutTemplateId, List<ExerciseEntryRequest> exercises, String notes) {
        this(workoutTemplateId, exercises, notes, null, null);
    }
}
```

### Layer 3 — Entity (`WorkoutEntry.java`)

Add the column and update the constructor:

```java
@Entity
@Table(name = "workout_entries")
public class WorkoutEntry {
    // ... existing fields ...

    @Column(name = "is_1rm_test")
    private Boolean is1rmTest;               // <-- NEW

    public WorkoutEntry(WorkoutTemplate template, UUID userId,
                        List<ExerciseEntry> exercises, String notes,
                        Boolean is1rmTest) {  // <-- NEW parameter
        this.template = template;
        this.userId = userId;
        this.exercises = exercises;
        this.notes = notes;
        this.is1rmTest = is1rmTest;
    }

    public Boolean getIs1rmTest() { return is1rmTest; }
    public void setIs1rmTest(Boolean is1rmTest) { this.is1rmTest = is1rmTest; }
}
```

### Layer 4 — Service (`WorkoutEntryService.java`)

Pass the new field through when constructing the entity:

```java
public WorkoutEntryDTO create(WorkoutEntryRequest request, UUID userId) {
    // ... existing template lookup ...
    WorkoutEntry saved = workoutEntryRepository.save(
            new WorkoutEntry(template, userId,
                    buildExerciseEntries(request.exercises(), userId),
                    request.notes(),
                    request.is1rmTest())   // <-- NEW argument
    );
    // ... rest unchanged ...
}
```

### API

No new endpoints. The `POST /workout-entries` endpoint already accepts the payload shape. Adding the new field to `WorkoutEntryRequest` makes it available for deserialization.

---

## 8. File Structure

```
frontend/src/features/workout/test-1rm/
├── types/
│   └── Test1rmTypes.ts              # All type definitions
├── hooks/
│   ├── use1rmTestReducer.ts         # useReducer + pure reducer function
│   ├── use1rmBaseline.ts            # React Query: fetch history → E1RM
│   ├── useInitiateTestProtocol.ts   # Mutation: taper PEAKING week
│   ├── useCompleteTestSession.ts    # Mutation: create WorkoutEntry
│   ├── useProgrammeDeload.ts        # Mutation: set next week isDeload
│   └── useTestRestTimer.ts          # Standalone rest timer hook
├── utils/
│   └── test1rmUtils.ts              # buildWarmupSets, calculateAttemptWeights, recalculateOnFail, roundToPlate
├── components/
│   ├── TestSessionPage.tsx          # Page — reads Outlet context, instantiates reducer
│   ├── TestSetupPanel.tsx           # SETUP phase
│   ├── WarmupPanel.tsx              # WARM_UP phase
│   ├── AttemptPanel.tsx             # TESTING phase
│   ├── RestTimerOverlay.tsx         # Conditional overlay card
│   └── CompletionPanel.tsx          # COMPLETED phase
└── __tests__/
    ├── test1rmReducer.test.ts       # Pure reducer unit tests
    ├── test1rmUtils.test.ts         # Math utility unit tests
    ├── TestSessionPage.test.tsx     # Integration: phase transitions
    └── RestTimerOverlay.test.tsx    # Timer behavior tests
```

### Existing Files Touched

| File | Change |
|------|--------|
| `AppRoutes.tsx` | Add `test-1rm` route under WorkoutLayout |
| `Workout.ts` (types) | Add `is1rmTest?: boolean` to `CreateWorkoutEntryRequest` |
| Programme week view component | Add "Test 1RM" button on PEAKING block workouts |
| `WorkoutEntryRequest.java` (backend DTO) | Add `Boolean is1rmTest` component to the record |
| `WorkoutEntry.java` (backend entity) | Add `is1rmTest` column + field + constructor param + getter/setter |
| `WorkoutEntryService.java` (backend service) | Pass `request.is1rmTest()` into entity constructor call |
| `V11__add_1rm_test_flag.sql` | Flyway migration (new file)

### Files NOT Touched

- `PeriodisationTypes.ts` — no new types needed (reuses existing `Week` fields)
- `useWorkoutContext.ts` — existing context already provides format, template, lastEntry
- `useRestTimer.ts` — new timer is a separate `useTestRestTimer`, no changes to existing
- `useWorkoutEntryForm.ts` — test session has its own reducer, doesn't touch entry form
- `buildWorkoutEntryPayload.ts` — not touched; test session builds its payload inline to preserve 0-rep failed attempts
- All backend analysis/services — filtering by `is1rmTest` is a future optimization, not part of this feature

---

## 9. Edge Cases & Guardrails

1. **No focus exercise on template:** SETUP phase shows dropdown of all template exercises instead of auto-selecting. Page never blocked from entry.
2. **No historical E1RM data:** SETUP phase allows manual weight input. Warm-up percentages calculated from that manual baseline.
3. **App switch mid-test:** Rest timer uses `Date.now() - restStartedAt` delta, immune to throttled timers.
4. **User aborts after 1 attempt:** `FINISH_EARLY` action available. Still commits the entry with whatever was completed.
5. **No PEAKING block exists:** "Test 1RM" button is disabled with tooltip "No active peaking block. 1RM tests require a PEAKING phase."
6. **Test on last week of block:** Post-test deload skips if no following week exists in the block. Deload notice in CompletionPanel says "No upcoming week to deload — take a light week manually."
