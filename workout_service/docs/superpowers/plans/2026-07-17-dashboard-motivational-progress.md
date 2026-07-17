# Dashboard Motivational Progress -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `DashboardSummaryDTO` with lifetime workout count, days since last workout, and split-based weekly workout progress -- all computed from existing data.

**Architecture:** Add one new record DTO, add one repository method, add three fields to an existing DTO record, and update the dashboard summary service to populate them. No new tables, no migrations, no new controllers.

**Tech Stack:** Java 21, Spring Boot 3.3.4, JPA, Gradle, JUnit 5, Mockito, AssertJ

## Global Constraints

- Zero new database tables or Flyway migrations
- Zero new API endpoints -- extend existing `/dashboard/summary` only
- Follow existing code patterns (records for DTOs, constructor injection, `@Transactional(readOnly = true)`)
- All new code must compile against existing project conventions
- Reuse existing repository methods where possible; add minimal new ones

---

### Task 1: Create `DashboardWeeklyWorkoutProgressDTO`

**Files:**
- Create: `src/main/java/com/louisfiges/workout/dto/responses/dashboard/DashboardWeeklyWorkoutProgressDTO.java`

**Interfaces:**
- Produces: `DashboardWeeklyWorkoutProgressDTO(int completedThisWeek, int targetThisWeek, int remainingWorkouts, int daysRemaining)` -- a Java record

- [ ] **Step 1: Create the DTO file**

```java
package com.louisfiges.workout.dto.responses.dashboard;

public record DashboardWeeklyWorkoutProgressDTO(
        int completedThisWeek,
        int targetThisWeek,
        int remainingWorkouts,
        int daysRemaining
) {
}
```

- [ ] **Step 2: Verify compilation**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/louisfiges/workout/dto/responses/dashboard/DashboardWeeklyWorkoutProgressDTO.java
git commit -m "feat: add DashboardWeeklyWorkoutProgressDTO record"
```

---

### Task 2: Add `countByUserId` to `WorkoutEntryRepository`

**Files:**
- Modify: `src/main/java/com/louisfiges/workout/repository/WorkoutEntryRepository.java`

**Interfaces:**
- Produces: `long countByUserId(UUID userId)` -- standard Spring Data JPA derived query

- [ ] **Step 1: Add the method declaration**

Insert after the `existsByUserId` declaration at line 301:

```java
    long countByUserId(UUID userId);
```

So the full block reads:

```java
    // has the user logged any workout
    boolean existsByUserId(UUID userId);

    void deleteByIdAndUserId(UUID id, UUID userId);

    // find most recent by user id
    Optional<WorkoutEntry> findTopByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserId(UUID userId);
}
```

- [ ] **Step 2: Verify compilation**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/louisfiges/workout/repository/WorkoutEntryRepository.java
git commit -m "feat: add countByUserId to WorkoutEntryRepository"
```

---

### Task 3: Update `DashboardSummaryDTO` with new fields

**Files:**
- Modify: `src/main/java/com/louisfiges/workout/dto/responses/dashboard/DashboardSummaryDTO.java`

**Interfaces:**
- Consumes: `DashboardWeeklyWorkoutProgressDTO` (from Task 1)
- Produces: Updated `DashboardSummaryDTO` record with 3 new fields

- [ ] **Step 1: Add the three new fields**

Replace the file contents:

```java
package com.louisfiges.workout.dto.responses.dashboard;

public record DashboardSummaryDTO(
        int workoutTemplateCount,
        int splitCount,
        DashboardActiveSplitDTO activeSplit,
        DashboardNextWorkoutDTO nextWorkout,
        DashboardTopLiftDTO topLift,
        boolean hasLoggedWorkout,
        boolean hasCreatedProgramme,
        int lifetimeWorkoutCount,
        Integer daysSinceLastWorkout,
        DashboardWeeklyWorkoutProgressDTO weeklyProgress
) {
}
```

- [ ] **Step 2: Verify compilation**

Run: `./gradlew compileJava`
Expected: FAIL -- because `DashboardSummaryService` constructs the record with old arity. This is expected; we fix it in Task 4.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/com/louisfiges/workout/dto/responses/dashboard/DashboardSummaryDTO.java
git commit -m "feat: add lifetimeWorkoutCount, daysSinceLastWorkout, weeklyProgress to DashboardSummaryDTO"
```

---

### Task 4: Update `DashboardSummaryService` to populate new fields

**Files:**
- Modify: `src/main/java/com/louisfiges/workout/service/dashboard/DashboardSummaryService.java`

**Interfaces:**
- Consumes: `DashboardWeeklyWorkoutProgressDTO` (from Task 1), `DashboardSummaryDTO` (updated in Task 3), `countByUserId` (from Task 2)
- Produces: `getSummary` returns a fully populated `DashboardSummaryDTO`

- [ ] **Step 1: Add required imports**

Replace the import block (lines 1-27) with:

```java
package com.louisfiges.workout.service.dashboard;

import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dao.periodisation.Split;
import com.louisfiges.workout.dto.responses.dashboard.DashboardActiveSplitDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardNextWorkoutDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardPreviewExerciseDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardSummaryDTO;
import com.louisfiges.workout.dto.responses.dashboard.DashboardWeeklyWorkoutProgressDTO;
import com.louisfiges.workout.repository.ProgrammeRepository;
import com.louisfiges.workout.repository.SplitRepository;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import com.louisfiges.workout.repository.WorkoutTemplateRepository;
import com.louisfiges.workout.service.analysis.LiftSummaryService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
```

- [ ] **Step 2: Replace `getSummary` method body**

Replace the `getSummary` method (lines 56-85) with:

```java
    public DashboardSummaryDTO getSummary(UUID userId) {
        int workoutTemplateCount = Math.toIntExact(workoutTemplateRepository.countByUserId(userId));
        int splitCount = Math.toIntExact(splitRepository.countByUserId(userId));
        Optional<Split> activeSplit = splitRepository.findActiveByUserIdWithWorkouts(userId);
        boolean hasLoggedWorkout = workoutEntryRepository.existsByUserId(userId);
        boolean hasCreatedProgramme = programmeRepository.existsBySplitUserId(userId);

        int lifetimeWorkoutCount = (int) workoutEntryRepository.countByUserId(userId);

        Integer daysSinceLastWorkout = workoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc(userId)
                .map(entry -> (int) ChronoUnit.DAYS.between(
                        entry.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate(),
                        LocalDate.now(ZoneOffset.UTC)))
                .orElse(null);

        DashboardWeeklyWorkoutProgressDTO weeklyProgress = activeSplit
                .map(split -> buildWeeklyProgress(userId, split))
                .orElse(null);

        List<WorkoutEntry> recentHistory = workoutEntryRepository.findDetailedHistoryByUserId(
                userId,
                PageRequest.of(0, NEXT_WORKOUT_HISTORY_LIMIT)
        );

        Optional<DashboardNextWorkoutDTO> nextWorkoutDTO = Optional.empty();
        if (activeSplit.isPresent()) {
            nextWorkoutDTO = buildNextWorkoutFromSplit(activeSplit.get(), recentHistory);
        } else {
            nextWorkoutDTO = buildRandomNextWorkout(userId, recentHistory);
        }

        return new DashboardSummaryDTO(
                workoutTemplateCount,
                splitCount,
                activeSplit.map(split -> new DashboardActiveSplitDTO(split.getId(), split.getName())).orElse(null),
                nextWorkoutDTO.orElse(null),
                liftSummaryService.getOverallLiftSummary(userId).orElse(null),
                hasLoggedWorkout,
                hasCreatedProgramme,
                lifetimeWorkoutCount,
                daysSinceLastWorkout,
                weeklyProgress
        );
    }
```

- [ ] **Step 3: Add `buildWeeklyProgress` private method**

Insert after the `getSummary` method (after the closing `}` of getSummary, before `buildNextWorkoutFromSplit`):

```java
    private DashboardWeeklyWorkoutProgressDTO buildWeeklyProgress(UUID userId, Split split) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate monday = today.with(DayOfWeek.MONDAY);
        LocalDate sunday = today.with(DayOfWeek.SUNDAY);

        Instant weekStart = monday.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant weekEnd = sunday.atTime(23, 59, 59, 999_999_999).atZone(ZoneOffset.UTC).toInstant();

        Set<UUID> splitTemplateIds = split.getAssignments().stream()
                .map(assignment -> assignment.getWorkoutTemplate().getId())
                .collect(Collectors.toSet());

        List<WorkoutEntry> weekEntries = workoutEntryRepository.findByUserIdAndCreatedAtBetween(
                userId, weekStart, weekEnd);

        int completedThisWeek = (int) weekEntries.stream()
                .filter(entry -> entry.getTemplate() != null
                        && splitTemplateIds.contains(entry.getTemplate().getId()))
                .count();

        int targetThisWeek = split.getAssignments().stream()
                .mapToInt(assignment -> assignment.getSessionsPerWeek())
                .sum();

        int remainingWorkouts = Math.max(0, targetThisWeek - completedThisWeek);
        int daysRemaining = DayOfWeek.SUNDAY.getValue() - today.getDayOfWeek().getValue() + 1;

        return new DashboardWeeklyWorkoutProgressDTO(
                completedThisWeek, targetThisWeek, remainingWorkouts, daysRemaining);
    }
```

- [ ] **Step 4: Verify compilation**

Run: `./gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add src/main/java/com/louisfiges/workout/service/dashboard/DashboardSummaryService.java
git commit -m "feat: populate lifetime count, days since last workout, and weekly progress in dashboard summary"
```

---

### Task 5: Update tests for new dashboard fields

**Files:**
- Modify: `src/test/java/com/louisfiges/workout/service/dashboard/DashboardSummaryServiceTest.java`

**Interfaces:**
- Consumes: All new fields from Tasks 1-4

- [ ] **Step 1: Add import for `DashboardWeeklyWorkoutProgressDTO`**

Insert after the existing `DashboardSummaryDTO` import (line 14):

```java
import com.louisfiges.workout.dto.responses.dashboard.DashboardWeeklyWorkoutProgressDTO;
```

- [ ] **Step 2: Update `assemblesDashboardSummary` test with new mocks and assertions**

In the test method `assemblesDashboardSummary`, add mocks after the existing `splitRepository.findActiveByUserIdWithWorkouts` mock (line 72):

After line 72 (`when(splitRepository.findActiveByUserIdWithWorkouts(eq(userId))).thenReturn(Optional.of(split));`), insert:

```java
        when(workoutEntryRepository.countByUserId(eq(userId))).thenReturn(3L);
        when(workoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc(eq(userId)))
                .thenReturn(Optional.of(recentPullEntry));
        when(workoutEntryRepository.findByUserIdAndCreatedAtBetween(eq(userId), any(), any()))
                .thenReturn(List.of(benchEntry2, recentPullEntry));
```

Then at the end of the test assertions (before the closing `}` at line 106), add:

```java
        assertThat(summary.lifetimeWorkoutCount()).isEqualTo(3);
        assertThat(summary.daysSinceLastWorkout()).isNotNull();
        assertThat(summary.weeklyProgress()).isNotNull();
        assertThat(summary.weeklyProgress().targetThisWeek()).isEqualTo(2);
        assertThat(summary.weeklyProgress().completedThisWeek()).isEqualTo(2);
        assertThat(summary.weeklyProgress().remainingWorkouts()).isEqualTo(0);
```

- [ ] **Step 3: Update `picksTemplateAtRandomWhenNoActiveSplit` test with new mocks and assertions**

In the test method `picksTemplateAtRandomWhenNoActiveSplit`, after the existing mock for `splitRepository.findActiveByUserIdWithWorkouts` (line 185):

```java
        when(workoutEntryRepository.countByUserId(eq(userId))).thenReturn(0L);
        when(workoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc(eq(userId)))
                .thenReturn(Optional.empty());
```

Then at the end of the test assertions (before the closing `}` at line 213), add:

```java
        assertThat(summary.lifetimeWorkoutCount()).isEqualTo(0);
        assertThat(summary.daysSinceLastWorkout()).isNull();
        assertThat(summary.weeklyProgress()).isNull();
```

- [ ] **Step 4: Run tests to verify**

Run: `./gradlew test --tests "com.louisfiges.workout.service.dashboard.DashboardSummaryServiceTest"`
Expected: BUILD SUCCESSFUL, all 3 tests pass

- [ ] **Step 5: Run full test suite**

Run: `./gradlew test`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add src/test/java/com/louisfiges/workout/service/dashboard/DashboardSummaryServiceTest.java
git commit -m "test: add assertions for lifetime count, days since last, and weekly progress"
```
