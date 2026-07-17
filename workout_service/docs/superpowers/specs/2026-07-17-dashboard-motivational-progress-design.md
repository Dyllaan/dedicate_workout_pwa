# Dashboard Motivational Progress -- Design Spec

**Date:** 2026-07-17
**Status:** Approved

## Overview

Extend the existing `DashboardSummaryDTO` (`/dashboard/summary`) with lightweight motivational progress fields computed from data already stored. No new database tables, no migrations.

## Motivation

The dashboard already serves as the user's entry point. It currently returns template/split counts, the next workout suggestion, and a top lift summary. Adding simple progress signals (lifetime stats, weekly split adherence, recency) makes the dashboard more engaging without requiring new data collection.

## Design

### New DTO: `DashboardWeeklyWorkoutProgressDTO`

```java
package com.louisfiges.workout.dto.responses.dashboard;

public record DashboardWeeklyWorkoutProgressDTO(
    int completedThisWeek,
    int targetThisWeek,
    int remainingWorkouts,
    int daysRemaining
) {}
```

- `completedThisWeek` -- count of workout entries this calendar week whose template belongs to the user's active split
- `targetThisWeek` -- sum of all `sessionsPerWeek` from the active split's assignments
- `remainingWorkouts` -- `targetThisWeek - completedThisWeek` (clamped to >= 0)
- `daysRemaining` -- days left in the calendar week (Monday=7 ... Sunday=1)

Returns `null` when there is no active split.

### Updated `DashboardSummaryDTO`

Add three fields to the existing record:

```java
public record DashboardSummaryDTO(
    // ... existing fields unchanged ...
    int lifetimeWorkoutCount,
    Integer daysSinceLastWorkout,
    DashboardWeeklyWorkoutProgressDTO weeklyProgress
) {}
```

| Field | Type | Source |
|-------|------|--------|
| `lifetimeWorkoutCount` | `int` | `WorkoutEntryRepository.countByUserId(userId)` |
| `daysSinceLastWorkout` | `Integer` (nullable) | `WorkoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc(userId)` → `ChronoUnit.DAYS.between(lastEntry.createdAt.toLocalDate(), today)`; `null` if user has never logged |
| `weeklyProgress` | `DashboardWeeklyWorkoutProgressDTO?` | Computed from active split assignments + this week's entries; `null` if no active split |

### New Repository Method

Add to `WorkoutEntryRepository`:
```java
long countByUserId(UUID userId);
```

### Service Changes (`DashboardSummaryService`)

`getSummary(userId)` already has:
- `workoutEntryRepository.existsByUserId(userId)` → replaces with `countByUserId`
- `splitRepository.findActiveByUserIdWithWorkouts(userId)` → already present, the split's assignments carry `sessionsPerWeek` and `workoutTemplate.id`
- `workoutEntryRepository.findDetailedHistoryByUserId(userId, pageRequest)` → already called for recent history

Three additions to `getSummary()`:

1. **`lifetimeWorkoutCount`** -- `workoutEntryRepository.countByUserId(userId)`

2. **`daysSinceLastWorkout`** -- call `workoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc(userId)`, map the result to `ChronoUnit.DAYS.between(date, today)` or `null`

3. **`weeklyProgress`** (only when active split is present, which is already resolved by line ~42 in the service):
   - Compute Monday 00:00 UTC of the current week → `Instant weekStart`
   - Compute Sunday 23:59:59.999 UTC → `Instant weekEnd`
   - `workoutEntryRepository.findByUserIdAndCreatedAtBetween(userId, weekStart, weekEnd)` → lightweight list (no exercise/set fetches)
   - Collect template IDs from the active split's assignments into a `Set<UUID>`
   - Count entries whose `template.id` is in that set → `completedThisWeek`
   - Sum `sessionsPerWeek` across all split assignments → `targetThisWeek`
   - `remainingWorkouts = Math.max(0, targetThisWeek - completedThisWeek)`
   - `daysRemaining = DayOfWeek.SUNDAY.getValue() - today.getDayOfWeek().getValue()` (or equivalent, yielding 7=Monday through 1=Sunday)

### Data Flow

```
GET /dashboard/summary
  → DashboardSummaryService.getSummary(userId)
    → WorkoutEntryRepository.countByUserId(userId)                  // lifetime
    → WorkoutEntryRepository.findTopByUserIdOrderByCreatedAtDesc()  // days since
    → SplitRepository.findActiveByUserIdWithWorkouts(userId)        // existing call
    → WorkoutEntryRepository.findByUserIdAndCreatedAtBetween()      // this week
  → DashboardSummaryDTO (populated with all fields)
```

## Files Changed

| File | Change |
|------|--------|
| `dto/responses/dashboard/DashboardWeeklyWorkoutProgressDTO.java` | New file |
| `dto/responses/dashboard/DashboardSummaryDTO.java` | Add 3 fields |
| `repository/WorkoutEntryRepository.java` | Add `countByUserId` |
| `service/dashboard/DashboardSummaryService.java` | Compute new fields |

## Non-Goals

- Streaks (encourages daily training; counterproductive for strength programs)
- New database tables or migrations
- New API endpoints
- Client-side messaging/rendering logic

## Risks / Edge Cases

- **No active split:** `weeklyProgress` is `null`
- **Never logged:** `daysSinceLastWorkout` is `null`, `lifetimeWorkoutCount` is `0`
- **Sunday is end-of-week:** on Sunday `daysRemaining` = 1 (the current day still counts), `remainingWorkouts` could be > `daysRemaining` -- this is intentional; the UI decides how to present urgency
- **Multiple entries for the same template on the same day:** each entry counts as one completed workout (treats separate log sessions as distinct workouts, which is the user's intent)
