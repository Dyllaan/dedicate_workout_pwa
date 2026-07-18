# Dynamic 1RM Percentage Scaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded weight targets with auto-derived percentage-of-1RM prescriptions for focus exercises, computed from block RPE/rep parameters and user's best in-block sets.

**Architecture:** A new `RpePercentageLookup` utility maps (reps, RPE) to % of 1RM. Intensity is derived from block parameters + week number. A `ForecastEngine` service estimates 1RM per exercise from best in-block sets and applies the intensity %. A new `GET /analysis/forecast/week/{weekId}` endpoint returns computed target weights for focus exercises. The frontend displays derived intensity on `WeekCard` and target weight prescriptions on `LogSetsPanel`.

**Tech Stack:** Java 17+, Spring Boot, JPA/Hibernate, React 18, TypeScript, React Query, Vitest, MockMvc

## Global Constraints

- No database schema changes (intensity is always derived)
- Intensity percentage is derived from block RPE/rep range, week number, and deload flag
- 1RM estimates use median of Epley/Brzycki/Lombardi formulas
- Target weight rounded to nearest 2.5kg
- Only focus exercises (`ExerciseConfig.focus = true`) get forecasted
- No changes to existing DTOs beyond additive fields
- Frontend Week type gets `intensityPct?: number | null` field (additive)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `workout_service/.../analysis/RpePercentageLookup.java` | Create | RPE-to-percentage lookup table + linear interpolation |
| `workout_service/.../dto/responses/WeekDTO.java` | Modify | Add `intensityPct` field |
| `workout_service/.../service/mapper/WeekMapper.java` | Modify | Compute `intensityPct` via `RpePercentageLookup` |
| `workout_service/.../dto/responses/ForecastResponse.java` | Create | Response DTO for forecast endpoint |
| `workout_service/.../dto/responses/ForecastSource.java` | Create | Enum: CURRENT_BLOCK, PREVIOUS_BLOCK, NO_DATA |
| `workout_service/.../service/analysis/ForecastEngine.java` | Create | Service: derives intensity, estimates 1RM, builds response |
| `workout_service/.../repository/WorkoutEntryRepository.java` | Modify | Add `findBestSetsForExerciseInBlock` query |
| `workout_service/.../controller/analysis/TemplateAnalysisController.java` | Modify | Add `GET /analysis/forecast/week/{weekId}` endpoint |
| `frontend/src/features/periodisation/types/Periodisation.ts` | Modify | Add `intensityPct` to Week type |
| `frontend/src/features/insights/types/Insights.ts` | Modify | Add `ForecastInsight`, `WeekForecast` types |
| `frontend/src/api/queryKeys.ts` | Modify | Add `analysis.forecast()` key |
| `frontend/src/features/insights/hooks/useWeekForecast.ts` | Create | React Query hook for forecast |
| `frontend/src/features/periodisation/week/components/WeekCard.tsx` | Modify | Show intensity badge |
| `frontend/src/features/workout/entries/components/panels/LogSetsPanel.tsx` | Modify | Show target weight banner |

---

### Task 1: RPE-to-Percentage Lookup Table

**Files:**
- Create: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\analysis\RpePercentageLookup.java`
- Test: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\test\java\com\louisfiges\workout\analysis\RpePercentageLookupTest.java`

**Interfaces:**
- Produces: `RpePercentageLookup.getIntensityPct(int reps, double rpe)` returns `double` (percentage as whole number, e.g. 87.0)

- [ ] **Step 1: Write the failing test**

```java
package com.louisfiges.workout.analysis;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("RpePercentageLookup")
class RpePercentageLookupTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
        5  | 7.0  | 86.0
        5  | 8.0  | 89.0
        5  | 9.0  | 93.0
        3  | 7.0  | 89.0
        3  | 8.0  | 92.0
        3  | 9.0  | 94.0
        1  | 10.0 | 100.0
        10 | 6.0  | 76.0
        """)
    @DisplayName("returns known RPE to percentage mappings")
    void returnsKnownMappings(int reps, double rpe, double expectedPct) {
        assertThat(RpePercentageLookup.getIntensityPct(reps, rpe)).isEqualTo(expectedPct);
    }

    @Test
    @DisplayName("interpolates linearly for missing RPE values")
    void interpolatesMissingRpe() {
        // 5 reps, RPE 7.5 should be halfway between 86.0 (RPE 7) and 89.0 (RPE 8)
        double result = RpePercentageLookup.getIntensityPct(5, 7.5);
        assertThat(result).isEqualTo(87.5);
    }

    @Test
    @DisplayName("clamps RPE at 6.0 minimum")
    void clampsRpeMin() {
        double result = RpePercentageLookup.getIntensityPct(5, 5.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(5, 6.0));
    }

    @Test
    @DisplayName("clamps RPE at 10.0 maximum")
    void clampsRpeMax() {
        double result = RpePercentageLookup.getIntensityPct(5, 11.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(5, 10.0));
    }

    @Test
    @DisplayName("clamps reps at 1 minimum")
    void clampsRepsMin() {
        double result = RpePercentageLookup.getIntensityPct(0, 8.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(1, 8.0));
    }

    @Test
    @DisplayName("clamps reps at 15 maximum")
    void clampsRepsMax() {
        double result = RpePercentageLookup.getIntensityPct(20, 8.0);
        assertThat(result).isEqualTo(RpePercentageLookup.getIntensityPct(15, 8.0));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.analysis.RpePercentageLookupTest"`
Expected: FAIL (class not found)

- [ ] **Step 3: Implement the lookup table**

```java
package com.louisfiges.workout.analysis;

import java.util.Map;

public final class RpePercentageLookup {

    private static final Map<String, Double> TABLE = Map.ofEntries(
        // (reps, RPE) -> %1RM
        //  1 rep
        Map.entry("1-6.0", 95.0), Map.entry("1-7.0", 96.0), Map.entry("1-8.0", 97.0),
        Map.entry("1-9.0", 98.0), Map.entry("1-10.0", 100.0),
        //  2 reps
        Map.entry("2-6.0", 93.0), Map.entry("2-7.0", 94.0), Map.entry("2-8.0", 95.0),
        Map.entry("2-9.0", 96.0), Map.entry("2-10.0", 98.0),
        //  3 reps
        Map.entry("3-6.0", 86.0), Map.entry("3-7.0", 89.0), Map.entry("3-8.0", 92.0),
        Map.entry("3-9.0", 94.0), Map.entry("3-10.0", 96.0),
        //  4 reps
        Map.entry("4-6.0", 85.0), Map.entry("4-7.0", 87.0), Map.entry("4-8.0", 90.0),
        Map.entry("4-9.0", 93.0), Map.entry("4-10.0", 95.0),
        //  5 reps
        Map.entry("5-6.0", 83.0), Map.entry("5-7.0", 86.0), Map.entry("5-8.0", 89.0),
        Map.entry("5-9.0", 91.0), Map.entry("5-10.0", 93.0),
        //  6 reps
        Map.entry("6-6.0", 82.0), Map.entry("6-7.0", 85.0), Map.entry("6-8.0", 88.0),
        Map.entry("6-9.0", 90.0), Map.entry("6-10.0", 92.0),
        //  7 reps
        Map.entry("7-6.0", 81.0), Map.entry("7-7.0", 84.0), Map.entry("7-8.0", 87.0),
        Map.entry("7-9.0", 89.0), Map.entry("7-10.0", 91.0),
        //  8 reps
        Map.entry("8-6.0", 80.0), Map.entry("8-7.0", 83.0), Map.entry("8-8.0", 86.0),
        Map.entry("8-9.0", 88.0), Map.entry("8-10.0", 90.0),
        //  9 reps
        Map.entry("9-6.0", 78.0), Map.entry("9-7.0", 81.0), Map.entry("9-8.0", 84.0),
        Map.entry("9-9.0", 86.0), Map.entry("9-10.0", 88.0),
        // 10 reps
        Map.entry("10-6.0", 76.0), Map.entry("10-7.0", 79.0), Map.entry("10-8.0", 82.0),
        Map.entry("10-9.0", 84.0), Map.entry("10-10.0", 86.0),
        // 11 reps
        Map.entry("11-6.0", 74.0), Map.entry("11-7.0", 77.0), Map.entry("11-8.0", 80.0),
        Map.entry("11-9.0", 82.0), Map.entry("11-10.0", 84.0),
        // 12 reps
        Map.entry("12-6.0", 72.0), Map.entry("12-7.0", 75.0), Map.entry("12-8.0", 78.0),
        Map.entry("12-9.0", 80.0), Map.entry("12-10.0", 82.0),
        // 13 reps
        Map.entry("13-6.0", 70.0), Map.entry("13-7.0", 73.0), Map.entry("13-8.0", 76.0),
        Map.entry("13-9.0", 78.0), Map.entry("13-10.0", 80.0),
        // 14 reps
        Map.entry("14-6.0", 68.0), Map.entry("14-7.0", 71.0), Map.entry("14-8.0", 74.0),
        Map.entry("14-9.0", 76.0), Map.entry("14-10.0", 78.0),
        // 15 reps
        Map.entry("15-6.0", 66.0), Map.entry("15-7.0", 69.0), Map.entry("15-8.0", 72.0),
        Map.entry("15-9.0", 74.0), Map.entry("15-10.0", 76.0)
    );

    private RpePercentageLookup() {}

    public static double getIntensityPct(int reps, double rpe) {
        int clampedReps = Math.max(1, Math.min(15, reps));
        double clampedRpe = Math.max(6.0, Math.min(10.0, rpe));

        double lowerRpe = Math.floor(clampedRpe);
        double upperRpe = Math.ceil(clampedRpe);

        if (lowerRpe == upperRpe) {
            String key = clampedReps + "-" + String.format("%.1f", clampedRpe);
            return TABLE.getOrDefault(key, 100.0);
        }

        String lowerKey = clampedReps + "-" + String.format("%.1f", lowerRpe);
        String upperKey = clampedReps + "-" + String.format("%.1f", upperRpe);

        double lowerPct = TABLE.getOrDefault(lowerKey, 100.0);
        double upperPct = TABLE.getOrDefault(upperKey, 100.0);
        double t = (clampedRpe - lowerRpe) / (upperRpe - lowerRpe);

        return lowerPct + t * (upperPct - lowerPct);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.analysis.RpePercentageLookupTest"`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/analysis/RpePercentageLookup.java
git add workout_service/src/test/java/com/louisfiges/workout/analysis/RpePercentageLookupTest.java
git commit -m "feat: add RPE-to-percentage lookup table with interpolation"
```

---

### Task 2: Add intensityPct to WeekDTO and WeekMapper

**Files:**
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\dto\responses\WeekDTO.java`
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\service\mapper\WeekMapper.java`
- Test: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\test\java\com\louisfiges\workout\service\mapper\WeekMapperTest.java`

**Interfaces:**
- Consumes: `RpePercentageLookup.getIntensityPct(reps, rpe)`
- Produces: `WeekDTO` with new `Double intensityPct` field (nullable)
- Produces: `WeekMapper.toDTO(Week)` now computes intensity

- [ ] **Step 1: Add field to WeekDTO**

```java
package com.louisfiges.workout.dto.responses;

import com.louisfiges.workout.dto.responses.interfaces.DTO;

import java.util.UUID;

public record WeekDTO(
        UUID id,
        int weekNumber,
        boolean isDeload,
        int targetSetsPerExercise,
        Double rpeOverrideMin,
        Double rpeOverrideMax,
        Double intensityPct
) implements DTO {}
```

- [ ] **Step 2: Update WeekMapper to compute intensity**

```java
package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.analysis.RpePercentageLookup;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.WeekDTO;
import org.springframework.stereotype.Component;

@Component
public class WeekMapper {

    public WeekDTO toDTO(Week entity) {
        return new WeekDTO(
                entity.getId(),
                entity.getWeekNumber(),
                entity.isDeload(),
                entity.getTargetSetsPerExercise(),
                entity.getRpeOverrideMin(),
                entity.getRpeOverrideMax(),
                deriveIntensityPct(entity)
        );
    }

    Double deriveIntensityPct(Week week) {
        Block block = week.getBlock();
        if (block == null) return null;

        int durationWeeks = block.getDurationWeeks();
        if (durationWeeks <= 0) return null;

        double t = durationWeeks == 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        double targetRpeMin = week.getRpeOverrideMin() != null
                ? week.getRpeOverrideMin()
                : block.getTargetRpeMin();
        double targetRpeMax = week.getRpeOverrideMax() != null
                ? week.getRpeOverrideMax()
                : block.getTargetRpeMax();

        int repRangeMin = block.getRepRangeMin();
        int repRangeMax = block.getRepRangeMax();

        double interpolatedRpe;
        int interpolatedReps;

        if (week.isDeload()) {
            interpolatedReps = repRangeMin;
            interpolatedRpe = Math.min(targetRpeMin, 6.0);
        } else {
            interpolatedReps = (int) Math.round(repRangeMax - t * (repRangeMax - repRangeMin));
            interpolatedRpe = targetRpeMin + t * (targetRpeMax - targetRpeMin);
            interpolatedRpe = Math.round(interpolatedRpe * 10.0) / 10.0;
        }

        double rawPct = RpePercentageLookup.getIntensityPct(interpolatedReps, interpolatedRpe);
        return Math.round(rawPct * 2.0) / 2.0; // round to 0.5
    }
}
```

- [ ] **Step 3: Write and run WeekMapper test**

```java
package com.louisfiges.workout.service.mapper;

import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.WeekDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("WeekMapper")
class WeekMapperTest {

    private final WeekMapper mapper = new WeekMapper();

    @Test
    @DisplayName("returns null intensityPct when block is null")
    void nullWhenNoBlock() {
        Week week = createWeek(1, false);
        week.setBlock(null);
        WeekDTO dto = mapper.toDTO(week);
        assertThat(dto.intensityPct()).isNull();
    }

    @Test
    @DisplayName("computes intensity for non-deload week based on block params")
    void computesForTrainingWeek() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        // Week 1 of 4: reps=5, RPE=7.0 -> 86.0%
        assertThat(dto.intensityPct()).isEqualTo(86.0);
    }

    @Test
    @DisplayName("computes intensity for final week with max RPE")
    void computesForFinalWeek() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(4);
        week.setDeload(false);
        week.setTargetSetsPerExercise(3);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        // Week 4 of 4 (t=1.0): reps=3, RPE=9.0 -> 94.0%
        assertThat(dto.intensityPct()).isEqualTo(94.0);
    }

    @Test
    @DisplayName("caps RPE at 6.0 for deload weeks")
    void capsRpeForDeload() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(3);
        week.setDeload(true);
        week.setTargetSetsPerExercise(3);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        // Deload: reps=3, RPE=min(7.0,6.0)=6.0 -> 86.0%
        assertThat(dto.intensityPct()).isEqualTo(86.0);
    }

    @Test
    @DisplayName("uses rpeOverride from week when set")
    void usesRpeOverride() {
        Block block = new Block();
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setDurationWeeks(4);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(2);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setRpeOverrideMin(8.0);
        week.setRpeOverrideMax(8.5);
        week.setBlock(block);

        WeekDTO dto = mapper.toDTO(week);
        // t=0.33, reps=4, RPE=8.16 rounded to 8.2 -> ~90.0% (between 90 at RPE 8 and 93 at RPE 9 for 4 reps)
        assertThat(dto.intensityPct()).isBetween(90.0, 91.5);
    }

    private Week createWeek(int weekNumber, boolean deload) {
        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(weekNumber);
        week.setDeload(deload);
        week.setTargetSetsPerExercise(4);
        return week;
    }
}
```

- [ ] **Step 4: Run tests**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.service.mapper.WeekMapperTest"`
Expected: PASS (5 tests)

- [ ] **Step 5: Run existing Week tests to ensure backward compatibility**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.*Week*"`
Expected: Any existing Week-related tests pass

- [ ] **Step 6: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/dto/responses/WeekDTO.java
git add workout_service/src/main/java/com/louisfiges/workout/service/mapper/WeekMapper.java
git add workout_service/src/test/java/com/louisfiges/workout/service/mapper/WeekMapperTest.java
git commit -m "feat: add derived intensityPct to WeekDTO via WeekMapper"
```

---

### Task 3: ForecastEngine Service and DTOs

**Files:**
- Create: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\dto\responses\ForecastResponse.java`
- Create: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\dto\responses\ForecastSource.java`
- Create: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\service\analysis\ForecastEngine.java`
- Test: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\test\java\com\louisfiges\workout\service\analysis\ForecastEngineTest.java`

**Interfaces:**
- Consumes: `WorkoutEntryRepository.findBestSetsForExerciseInBlock()` (next task)
- Consumes: `RpePercentageLookup.getIntensityPct(reps, rpe)`
- Produces: `ForecastEngine.generateForecast(Week week)` → `ForecastResponse`
- Produces: `ForecastEngine.deriveIntensityPct(Block block, Week week)` → `double`
- Produces: `ForecastEngine.estimateOneRm(UUID exerciseDefId, Block block, UUID userId)` → `Optional<OneRmResult>`

- [ ] **Step 1: Create ForecastSource enum**

```java
package com.louisfiges.workout.dto.responses;

public enum ForecastSource {
    CURRENT_BLOCK,
    PREVIOUS_BLOCK,
    NO_DATA
}
```

- [ ] **Step 2: Create ForecastResponse DTO**

```java
package com.louisfiges.workout.dto.responses;

import java.util.List;
import java.util.UUID;

public record ForecastResponse(
        UUID weekId,
        UUID blockId,
        String blockName,
        int weekNumber,
        boolean deload,
        double intensityPct,
        List<ForecastInsight> insights
) {
    public record ForecastInsight(
            UUID exerciseDefinitionId,
            String exerciseName,
            Double estimatedOneRmKg,
            Double targetWeightKg,
            int targetReps,
            double targetRpe,
            ForecastSource source,
            BestSetInfo bestSet
    ) {}

    public record BestSetInfo(
            int reps,
            double weightKg,
            String setDate
    ) {}
}
```

- [ ] **Step 3: Write ForecastEngine test**

Since `ForecastEngine` depends on `WorkoutEntryRepository` (defined in Task 4), stub the repository with Mockito. The test verifies derivation logic and 1RM estimation independently.

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.dao.periodisation.*;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.ForecastSource;
import com.louisfiges.workout.repository.WorkoutEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ForecastEngine")
class ForecastEngineTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EXERCISE_DEF_ID = UUID.randomUUID();

    @Mock
    private WorkoutEntryRepository workoutEntryRepository;

    private ForecastEngine engine;

    @BeforeEach
    void setUp() {
        engine = new ForecastEngine(workoutEntryRepository, new StrengthCalculator());
    }

    @Test
    @DisplayName("returns NO_DATA when block has no resolvable dates")
    void noDataWhenNoBlockDates() {
        Week week = createWeekWithBlock(null, null);
        ForecastResponse response = engine.generateForecast(week, USER_ID);
        assertThat(response.insights()).allMatch(i -> i.source() == ForecastSource.NO_DATA);
    }

    @Test
    @DisplayName("computes e1RM and target weight from current block sets")
    void computesFromCurrentBlock() {
        Instant blockStart = Instant.parse("2026-07-01T00:00:00Z");
        Week week = createWeekWithBlock(blockStart, 4);
        week.setWeekNumber(1);

        SetEntry bestSet = new SetEntry(UUID.randomUUID(), 5, 100.0, 8.0, null, null, null, 0L);
        List<Object[]> queryResult = List.of(new Object[]{bestSet, Instant.parse("2026-07-02T10:00:00Z")});

        when(workoutEntryRepository.findBestSetsForExerciseInBlock(
                eq(EXERCISE_DEF_ID), eq(USER_ID), any(Instant.class), any(Instant.class), eq(PageRequest.of(0, 5))
        )).thenReturn(queryResult);

        ForecastResponse response = engine.generateForecast(week, USER_ID);
        ForecastResponse.ForecastInsight insight = response.insights().get(0);

        assertThat(insight.source()).isEqualTo(ForecastSource.CURRENT_BLOCK);
        assertThat(insight.estimatedOneRmKg()).isNotNull();
        assertThat(insight.targetWeightKg()).isNotNull();
        assertThat(insight.targetReps()).isEqualTo(5);
        assertThat(insight.bestSet()).isNotNull();
        assertThat(insight.bestSet().reps()).isEqualTo(5);
        assertThat(insight.bestSet().weightKg()).isEqualTo(100.0);
    }

    @Test
    @DisplayName("falls back to previous block when current block has no sets")
    void fallsBackToPreviousBlock() {
        // Current block: no sets
        when(workoutEntryRepository.findBestSetsForExerciseInBlock(
                eq(EXERCISE_DEF_ID), eq(USER_ID), any(Instant.class), any(Instant.class), eq(PageRequest.of(0, 5))
        )).thenReturn(Collections.emptyList());

        Instant blockStart = Instant.parse("2026-07-01T00:00:00Z");
        Block previousBlock = new Block();
        previousBlock.setStartDate(Instant.parse("2026-06-01T00:00:00Z"));
        previousBlock.setDurationWeeks(4);
        previousBlock.setBlockOrder(0);

        Week week = createWeekWithBlock(blockStart, 4);
        week.getBlock().setProgramme(createProgrammeWithPreviousBlock(previousBlock));
        week.setWeekNumber(1);

        ForecastResponse response = engine.generateForecast(week, USER_ID);
        assertThat(response.insights().get(0).source()).isEqualTo(ForecastSource.NO_DATA); // previous block has no sets either
    }

    @Test
    @DisplayName("only returns focus exercises")
    void onlyFocusExercises() {
        WorkoutTemplate template = new WorkoutTemplate();
        ExerciseConfig focusConfig = new ExerciseConfig();
        ExerciseDefinition focusDef = new ExerciseDefinition();
        focusDef.setId(EXERCISE_DEF_ID);
        focusDef.setExerciseName("Bench Press");
        focusConfig.setExerciseDefinition(focusDef);
        focusConfig.setFocus(true);

        ExerciseConfig accessoryConfig = new ExerciseConfig();
        ExerciseDefinition accessoryDef = new ExerciseDefinition();
        accessoryDef.setId(UUID.randomUUID());
        accessoryDef.setExerciseName("Tricep Pushdown");
        accessoryConfig.setExerciseDefinition(accessoryDef);
        accessoryConfig.setFocus(false);

        // Only the focus exercise should appear
        Instant blockStart = Instant.parse("2026-07-01T00:00:00Z");
        Week week = createWeekWithFocusExercises(blockStart, 4, List.of(focusConfig, accessoryConfig));
        week.setWeekNumber(1);

        SetEntry bestSet = new SetEntry(UUID.randomUUID(), 5, 100.0, 8.0, null, null, null, 0L);
        when(workoutEntryRepository.findBestSetsForExerciseInBlock(
                eq(EXERCISE_DEF_ID), eq(USER_ID), any(Instant.class), any(Instant.class), eq(PageRequest.of(0, 5))
        )).thenReturn(List.of(new Object[]{bestSet, Instant.parse("2026-07-02T10:00:00Z")}));

        ForecastResponse response = engine.generateForecast(week, USER_ID);
        assertThat(response.insights()).hasSize(1);
        assertThat(response.insights().get(0).exerciseName()).isEqualTo("Bench Press");
    }

    private Programme createProgrammeWithPreviousBlock(Block previousBlock) {
        Programme programme = new Programme();
        programme.setBlocks(List.of(previousBlock));
        return programme;
    }

    private Week createWeekWithBlock(Instant blockStart, int durationWeeks) {
        Block block = new Block();
        block.setId(UUID.randomUUID());
        block.setName("Strength Block");
        block.setBlockType(BlockType.STRENGTH);
        block.setProgressionStrategy(com.louisfiges.workout.analysis.types.ProgressionStrategy.WEIGHT_FIRST);
        block.setDurationWeeks(durationWeeks);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setBlockOrder(0);
        block.setStartDate(blockStart);
        block.setWeeks(Collections.emptyList());

        Programme programme = new Programme();
        programme.setStartDate(blockStart);
        programme.setBlocks(new ArrayList<>(List.of(block)));
        block.setProgramme(programme);

        Split split = new Split();
        WorkoutTemplate template = new WorkoutTemplate();

        ExerciseConfig focusConfig = new ExerciseConfig();
        ExerciseDefinition focusDef = new ExerciseDefinition();
        focusDef.setId(EXERCISE_DEF_ID);
        focusDef.setExerciseName("Bench Press");
        focusConfig.setExerciseDefinition(focusDef);
        focusConfig.setFocus(true);
        template.setExercises(List.of(focusConfig));
        split.setWorkoutTemplates(List.of(template));
        programme.setSplit(split);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setBlock(block);

        List<Week> weeks = new ArrayList<>();
        for (int i = 1; i <= durationWeeks; i++) {
            Week w = new Week();
            w.setId(UUID.randomUUID());
            w.setWeekNumber(i);
            w.setDeload(false);
            w.setTargetSetsPerExercise(4);
            w.setBlock(block);
            weeks.add(w);
        }
        block.setWeeks(weeks);

        return week;
    }

    private Week createWeekWithFocusExercises(Instant blockStart, int durationWeeks, List<ExerciseConfig> exerciseConfigs) {
        Block block = new Block();
        block.setId(UUID.randomUUID());
        block.setName("Strength Block");
        block.setBlockType(BlockType.STRENGTH);
        block.setProgressionStrategy(com.louisfiges.workout.analysis.types.ProgressionStrategy.WEIGHT_FIRST);
        block.setDurationWeeks(durationWeeks);
        block.setTargetRpeMin(7.0);
        block.setTargetRpeMax(9.0);
        block.setRepRangeMin(3);
        block.setRepRangeMax(5);
        block.setBlockOrder(0);
        block.setStartDate(blockStart);
        block.setWeeks(Collections.emptyList());

        Programme programme = new Programme();
        programme.setStartDate(blockStart);
        programme.setBlocks(new ArrayList<>(List.of(block)));
        block.setProgramme(programme);

        Split split = new Split();
        WorkoutTemplate template = new WorkoutTemplate();
        template.setExercises(exerciseConfigs);
        split.setWorkoutTemplates(List.of(template));
        programme.setSplit(split);

        Week week = new Week();
        week.setId(UUID.randomUUID());
        week.setWeekNumber(1);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);
        week.setBlock(block);

        return week;
    }
}
```

- [ ] **Step 4: Implement ForecastEngine**

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.analysis.RpePercentageLookup;
import com.louisfiges.workout.analysis.StrengthCalculator;
import com.louisfiges.workout.dto.responses.StrengthEstimate;
import com.louisfiges.workout.dao.periodisation.Block;
import com.louisfiges.workout.dao.periodisation.Programme;
import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.ForecastSource;
import com.louisfiges.workout.repository.WorkoutEntryRepository;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ForecastEngine {

    private final WorkoutEntryRepository workoutEntryRepository;
    private final StrengthCalculator strengthCalculator;

    public ForecastEngine(WorkoutEntryRepository workoutEntryRepository, StrengthCalculator strengthCalculator) {
        this.workoutEntryRepository = workoutEntryRepository;
        this.strengthCalculator = strengthCalculator;
    }

    public ForecastResponse generateForecast(Week week, UUID userId) {
        Block block = week.getBlock();
        if (block == null || block.getProgramme() == null) {
            return emptyResponse(week, 0.0);
        }

        double intensityPct = deriveIntensityPct(block, week);
        List<ForecastResponse.ForecastInsight> insights = buildInsights(block, week, intensityPct, userId);

        return new ForecastResponse(
                week.getId(),
                block.getId(),
                block.getName(),
                week.getWeekNumber(),
                week.isDeload(),
                intensityPct,
                insights
        );
    }

    double deriveIntensityPct(Block block, Week week) {
        int durationWeeks = block.getDurationWeeks();
        if (durationWeeks <= 0) return 0.0;

        double t = durationWeeks == 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        double rpeMin = week.getRpeOverrideMin() != null ? week.getRpeOverrideMin() : block.getTargetRpeMin();
        double rpeMax = week.getRpeOverrideMax() != null ? week.getRpeOverrideMax() : block.getTargetRpeMax();

        int repMin = block.getRepRangeMin();
        int repMax = block.getRepRangeMax();

        if (week.isDeload()) {
            int reps = repMin;
            double rpe = Math.min(rpeMin, 6.0);
            double raw = RpePercentageLookup.getIntensityPct(reps, rpe);
            return Math.round(raw * 2.0) / 2.0;
        }

        int reps = (int) Math.round(repMax - t * (repMax - repMin));
        double rpe = rpeMin + t * (rpeMax - rpeMin);
        rpe = Math.round(rpe * 10.0) / 10.0;

        double raw = RpePercentageLookup.getIntensityPct(reps, rpe);
        return Math.round(raw * 2.0) / 2.0;
    }

    private List<ForecastResponse.ForecastInsight> buildInsights(Block block, Week week, double intensityPct, UUID userId) {
        List<ExerciseConfig> focusExercises = getFocusExercises(block);
        if (focusExercises.isEmpty()) return Collections.emptyList();

        // Compute block date range
        BlockDateRange currentBlockRange = resolveEffectiveDateRange(block, week);
        if (currentBlockRange == null) return focusExercises.stream()
                .map(ec -> noDataInsight(ec, intensityPct, week))
                .collect(Collectors.toList());

        return focusExercises.stream()
                .map(ec -> buildInsight(ec, intensityPct, block, week, currentBlockRange, userId))
                .collect(Collectors.toList());
    }

    private ForecastResponse.ForecastInsight buildInsight(
            ExerciseConfig ec, double intensityPct, Block block, Week week,
            BlockDateRange currentRange, UUID userId) {
        UUID exerciseDefId = ec.getExerciseDefinition().getId();

        OneRmResult result = estimateOneRm(exerciseDefId, userId, currentRange.start, currentRange.end);

        if (result != null) {
            int targetReps = deriveTargetReps(block, week);
            double targetRpe = deriveTargetRpe(block, week);
            double estimated1Rm = roundToPlate(median(result.epley(), result.bryzycki(), result.lombardi()));
            double targetWeight = roundToPlate(estimated1Rm * intensityPct / 100.0);

            ForecastResponse.BestSetInfo bestSet = new ForecastResponse.BestSetInfo(
                    result.bestSet().getReps(),
                    result.bestSet().getWeight() != null ? result.bestSet().getWeight() : 0.0,
                    result.setDate().toString()
            );

            return new ForecastResponse.ForecastInsight(
                    exerciseDefId,
                    ec.getExerciseDefinition().getExerciseName(),
                    estimated1Rm,
                    targetWeight,
                    targetReps,
                    Math.round(targetRpe * 10.0) / 10.0,
                    ForecastSource.CURRENT_BLOCK,
                    bestSet
            );
        }

        // Fallback to previous block
        Block previousBlock = findPreviousBlock(block);
        if (previousBlock != null) {
            BlockDateRange prevRange = resolveEffectiveDateRange(previousBlock, null);
            if (prevRange != null) {
                OneRmResult prevResult = estimateOneRm(exerciseDefId, userId, prevRange.start, prevRange.end);
                if (prevResult != null) {
                    int targetReps = deriveTargetReps(block, week);
                    double targetRpe = deriveTargetRpe(block, week);
                    double estimated1Rm = roundToPlate(median(prevResult.epley(), prevResult.bryzycki(), prevResult.lombardi()));
                    double targetWeight = roundToPlate(estimated1Rm * intensityPct / 100.0);

                    ForecastResponse.BestSetInfo bestSet = new ForecastResponse.BestSetInfo(
                            prevResult.bestSet().getReps(),
                            prevResult.bestSet().getWeight() != null ? prevResult.bestSet().getWeight() : 0.0,
                            prevResult.setDate().toString()
                    );

                    return new ForecastResponse.ForecastInsight(
                            exerciseDefId,
                            ec.getExerciseDefinition().getExerciseName(),
                            estimated1Rm,
                            targetWeight,
                            targetReps,
                            Math.round(targetRpe * 10.0) / 10.0,
                            ForecastSource.PREVIOUS_BLOCK,
                            bestSet
                    );
                }
            }
        }

        return noDataInsight(ec, intensityPct, week);
    }

    private ForecastResponse.ForecastInsight noDataInsight(ExerciseConfig ec, double intensityPct, Week week) {
        Block block = week.getBlock();
        int targetReps = block != null ? deriveTargetReps(block, week) : 5;
        double targetRpe = block != null ? deriveTargetRpe(block, week) : 7.0;

        return new ForecastResponse.ForecastInsight(
                ec.getExerciseDefinition().getId(),
                ec.getExerciseDefinition().getExerciseName(),
                null,
                null,
                targetReps,
                Math.round(targetRpe * 10.0) / 10.0,
                ForecastSource.NO_DATA,
                null
        );
    }

    OneRmResult estimateOneRm(UUID exerciseDefId, UUID userId, Instant blockStart, Instant blockEnd) {
        List<Object[]> rows = workoutEntryRepository.findBestSetsForExerciseInBlock(
                exerciseDefId, userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        if (rows.isEmpty()) return null;

        OneRmResult best = null;
        double bestMedian = 0;

        for (Object[] row : rows) {
            SetEntry set = (SetEntry) row[0];
            Instant setDate = (Instant) row[1];
            if (set.getWeight() == null) continue;

            StrengthEstimate estimate = strengthCalculator.estimateOneRepMax(set.getWeight(), set.getReps());
            double median = median(estimate.epley(), estimate.bryzycki(), estimate.lombardi());

            if (median > bestMedian) {
                bestMedian = median;
                best = new OneRmResult(estimate.epley(), estimate.bryzycki(), estimate.lombardi(), set, setDate);
            }
        }

        return best;
    }

    private double median(double a, double b, double c) {
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }

    private double roundToPlate(double value) {
        return Math.round(value / 2.5) * 2.5;
    }

    int deriveTargetReps(Block block, Week week) {
        int durationWeeks = block.getDurationWeeks();
        double t = durationWeeks <= 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        if (week.isDeload()) return block.getRepRangeMin();
        return (int) Math.round(block.getRepRangeMax() - t * (block.getRepRangeMax() - block.getRepRangeMin()));
    }

    double deriveTargetRpe(Block block, Week week) {
        int durationWeeks = block.getDurationWeeks();
        double t = durationWeeks <= 1 ? 0.0
                : Math.max(0.0, (week.getWeekNumber() - 1.0) / (durationWeeks - 1.0));

        double rpeMin = week.getRpeOverrideMin() != null ? week.getRpeOverrideMin() : block.getTargetRpeMin();
        double rpeMax = week.getRpeOverrideMax() != null ? week.getRpeOverrideMax() : block.getTargetRpeMax();

        if (week.isDeload()) return Math.min(rpeMin, 6.0);
        return rpeMin + t * (rpeMax - rpeMin);
    }

    private List<ExerciseConfig> getFocusExercises(Block block) {
        return block.getProgramme().getSplit().getWorkoutTemplates().stream()
                .flatMap(t -> t.getExercises().stream())
                .filter(ec -> Boolean.TRUE.equals(ec.getFocus()))
                .collect(Collectors.toList());
    }

    private BlockDateRange resolveEffectiveDateRange(Block block, Week week) {
        if (block == null) return null;

        Instant start = block.getStartDate();
        if (start == null) {
            Programme programme = block.getProgramme();
            if (programme == null || programme.getStartDate() == null) return null;
            start = computeBlockStartFromProgramme(programme, block);
            if (start == null) return null;
        }

        Instant end = start.plusSeconds((long) block.getDurationWeeks() * 7 * 24 * 3600);
        return new BlockDateRange(start, end);
    }

    private Instant computeBlockStartFromProgramme(Programme programme, Block targetBlock) {
        Instant programmeStart = programme.getStartDate();
        if (programmeStart == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        long totalDays = 0;
        for (Block b : sorted) {
            if (b.getId().equals(targetBlock.getId())) {
                return programmeStart.plusSeconds(totalDays * 24 * 3600);
            }
            totalDays += (long) b.getDurationWeeks() * 7;
        }

        return null;
    }

    private Block findPreviousBlock(Block current) {
        Programme programme = current.getProgramme();
        if (programme == null) return null;

        List<Block> sorted = programme.getBlocks().stream()
                .sorted(Comparator.comparingInt(Block::getBlockOrder))
                .toList();

        for (int i = sorted.size() - 1; i >= 0; i--) {
            if (sorted.get(i).getBlockOrder() < current.getBlockOrder()) {
                return sorted.get(i);
            }
        }

        return null;
    }

    private ForecastResponse emptyResponse(Week week, double intensityPct) {
        return new ForecastResponse(
                week.getId(),
                null,
                null,
                week.getWeekNumber(),
                week.isDeload(),
                intensityPct,
                Collections.emptyList()
        );
    }

    private record BlockDateRange(Instant start, Instant end) {}

    record OneRmResult(double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate) {}
}
```

- [ ] **Step 5: Run tests**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.service.analysis.ForecastEngineTest"`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/dto/responses/ForecastResponse.java
git add workout_service/src/main/java/com/louisfiges/workout/dto/responses/ForecastSource.java
git add workout_service/src/main/java/com/louisfiges/workout/service/analysis/ForecastEngine.java
git add workout_service/src/test/java/com/louisfiges/workout/service/analysis/ForecastEngineTest.java
git commit -m "feat: add ForecastEngine service with 1RM estimation and intensity derivation"
```

---

### Task 4: Repository Query for Best Sets

**Files:**
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\repository\WorkoutEntryRepository.java`
- Test: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\test\java\com\louisfiges\workout\repository\WorkoutEntryRepositoryForecastTest.java`

**Interfaces:**
- Produces: `WorkoutEntryRepository.findBestSetsForExerciseInBlock(UUID exerciseDefId, UUID userId, Instant blockStart, Instant blockEnd, Pageable pageable)` → `List<Object[]>`
- Each `Object[]` has: `[0]` = `SetEntry`, `[1]` = `Instant` (workout entry createdAt)

- [ ] **Step 1: Add query method to WorkoutEntryRepository**

Add this method to the interface (right before the closing `}`):

```java
@Query("SELECT se, we.createdAt FROM WorkoutEntry we " +
       "JOIN we.exercises ee " +
       "JOIN ee.sets se " +
       "WHERE ee.exerciseDefinition.id = :exerciseDefId " +
       "AND we.userId = :userId " +
       "AND we.createdAt BETWEEN :blockStart AND :blockEnd " +
       "ORDER BY (se.weight * (1 + se.reps / 30.0)) DESC")
List<Object[]> findBestSetsForExerciseInBlock(
        @Param("exerciseDefId") UUID exerciseDefId,
        @Param("userId") UUID userId,
        @Param("blockStart") Instant blockStart,
        @Param("blockEnd") Instant blockEnd,
        Pageable pageable);
```

Also add this import (if not already present):

```java
import org.springframework.data.domain.Pageable;
```

- [ ] **Step 2: Write repository integration test**

```java
package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("WorkoutEntryRepository forecast query")
class WorkoutEntryRepositoryForecastTest {

    @Autowired
    private WorkoutEntryRepository repository;

    @Autowired
    private EntityManager em;

    @Test
    @DisplayName("returns sets ordered by Epley estimate descending")
    void returnsSetsOrderedByEpleyDesc() {
        UUID userId = UUID.randomUUID();
        UUID exerciseDefId = UUID.randomUUID();

        Instant blockStart = Instant.parse("2026-07-01T00:00:00Z");
        Instant blockEnd = Instant.parse("2026-07-28T23:59:59Z");

        ExerciseDefinition def = new ExerciseDefinition();
        def.setId(exerciseDefId);
        def.setUserId(userId);
        def.setExerciseName("Bench Press");
        def.setNormalizedExerciseName("bench press");
        def.setNormalizedVariant("");
        em.persist(def);

        WorkoutTemplate template = new WorkoutTemplate();
        template.setName("Test Template");
        template.setUserId(userId);
        template.setCategory("Push");
        em.persist(template);

        // Entry 1: 100kg x 5 reps (Epley ~116.7)
        WorkoutEntry entry1 = createEntry(userId, template, def, 100.0, 5,
                Instant.parse("2026-07-02T10:00:00Z"));
        // Entry 2: 110kg x 3 reps (Epley ~121.0) — should be first
        WorkoutEntry entry2 = createEntry(userId, template, def, 110.0, 3,
                Instant.parse("2026-07-09T10:00:00Z"));
        // Entry 3: 90kg x 8 reps (Epley ~114.0)
        WorkoutEntry entry3 = createEntry(userId, template, def, 90.0, 8,
                Instant.parse("2026-07-16T10:00:00Z"));

        em.persist(entry1);
        em.persist(entry2);
        em.persist(entry3);
        em.flush();

        List<Object[]> results = repository.findBestSetsForExerciseInBlock(
                exerciseDefId, userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        assertThat(results).hasSize(3);
        SetEntry first = (SetEntry) results.get(0)[0];
        Instant firstDate = (Instant) results.get(0)[1];
        assertThat(first.getWeight()).isEqualTo(110.0);
        assertThat(first.getReps()).isEqualTo(3);
        assertThat(firstDate).isNotNull();
    }

    @Test
    @DisplayName("returns empty when no sets in date range")
    void emptyWhenNoSetsInRange() {
        UUID userId = UUID.randomUUID();
        UUID exerciseDefId = UUID.randomUUID();

        Instant blockStart = Instant.parse("2026-08-01T00:00:00Z");
        Instant blockEnd = Instant.parse("2026-08-28T23:59:59Z");

        ExerciseDefinition def = new ExerciseDefinition();
        def.setId(exerciseDefId);
        def.setUserId(userId);
        def.setExerciseName("Bench Press");
        def.setNormalizedExerciseName("bench press");
        def.setNormalizedVariant("");
        em.persist(def);

        WorkoutTemplate template = new WorkoutTemplate();
        template.setName("Test Template");
        template.setUserId(userId);
        template.setCategory("Push");
        em.persist(template);

        // Entry is outside the date range
        WorkoutEntry entry = createEntry(userId, template, def, 100.0, 5,
                Instant.parse("2026-07-02T10:00:00Z"));
        em.persist(entry);
        em.flush();

        List<Object[]> results = repository.findBestSetsForExerciseInBlock(
                exerciseDefId, userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        assertThat(results).isEmpty();
    }

    private WorkoutEntry createEntry(UUID userId, WorkoutTemplate template,
                                      ExerciseDefinition def, double weight, int reps,
                                      Instant createdAt) {
        WorkoutEntry entry = new WorkoutEntry();
        entry.setUserId(userId);
        entry.setTemplate(template);
        entry.setCreatedAt(createdAt);
        entry.setUpdatedAt(createdAt);

        SetEntry set = new SetEntry(UUID.randomUUID(), reps, weight, 8.0, null, null, null, 0L);
        ExerciseEntry exEntry = new ExerciseEntry(def, def.getExerciseName(), null, 3, List.of(set));
        entry.setExercises(List.of(exEntry));

        return entry;
    }
}
```

- [ ] **Step 3: Run tests**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.repository.WorkoutEntryRepositoryForecastTest"`
Expected: PASS (2 tests) — note: may need `-PtestProfile` or similar profile setup; adjust based on project conventions

- [ ] **Step 4: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/repository/WorkoutEntryRepository.java
git add workout_service/src/test/java/com/louisfiges/workout/repository/WorkoutEntryRepositoryForecastTest.java
git commit -m "feat: add findBestSetsForExerciseInBlock query to WorkoutEntryRepository"
```

---

### Task 5: Forecast Endpoint and Controller Test

**Files:**
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\main\java\com\louisfiges\workout\controller\analysis\TemplateAnalysisController.java`
- Test: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\workout_service\src\test\java\com\louisfiges\workout\controller\analysis\TemplateAnalysisForecastControllerTest.java`

**Interfaces:**
- Consumes: `ForecastEngine.generateForecast(Week week, UUID userId)` → `ForecastResponse`
- Consumes: `WeekRepository` (to load week with block/programme data)
- Produces: `GET /analysis/forecast/week/{weekId}` → `ForecastResponse`

- [ ] **Step 1: Add endpoint to TemplateAnalysisController**

Add a new constructor parameter and endpoint method. The controller currently has only `TemplateAnalysisRecommendationService`. We need to add `ForecastEngine` and `WeekRepository`.

```java
// Add to imports:
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.service.analysis.ForecastEngine;
import com.louisfiges.workout.repository.WeekRepository;
import com.louisfiges.workout.dao.periodisation.Week;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

// Change the constructor to:
private final TemplateAnalysisRecommendationService templateAnalysisRecommendationService;
private final ForecastEngine forecastEngine;
private final WeekRepository weekRepository;

public TemplateAnalysisController(
        TemplateAnalysisRecommendationService templateAnalysisRecommendationService,
        ForecastEngine forecastEngine,
        WeekRepository weekRepository) {
    this.templateAnalysisRecommendationService = templateAnalysisRecommendationService;
    this.forecastEngine = forecastEngine;
    this.weekRepository = weekRepository;
}

// Add the new endpoint (before the class closing brace):
@GetMapping("/forecast/week/{weekId}")
public ForecastResponse getWeekForecast(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable UUID weekId) {
    UUID userId = UUID.fromString(jwt.getSubject());
    Week week = weekRepository.findByIdAndUserId(weekId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Week not found"));
    return forecastEngine.generateForecast(week, userId);
}
```

- [ ] **Step 2: Write controller test**

```java
package com.louisfiges.workout.controller.analysis;

import com.louisfiges.workout.dao.periodisation.Week;
import com.louisfiges.workout.dto.responses.ForecastResponse;
import com.louisfiges.workout.dto.responses.ForecastSource;
import com.louisfiges.workout.repository.WeekRepository;
import com.louisfiges.workout.service.analysis.ForecastEngine;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TemplateAnalysisController.class)
@AutoConfigureMockMvc
@DisplayName("GET /analysis/forecast/week/{weekId}")
class TemplateAnalysisForecastControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TemplateAnalysisRecommendationService recommendationService;

    @MockBean
    private ForecastEngine forecastEngine;

    @MockBean
    private WeekRepository weekRepository;

    @Test
    @DisplayName("returns forecast with intensity and insights for focus exercises")
    void returnsForecast() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID weekId = UUID.randomUUID();
        UUID blockId = UUID.randomUUID();

        Week week = new Week();
        week.setId(weekId);
        week.setWeekNumber(3);
        week.setDeload(false);
        week.setTargetSetsPerExercise(4);

        when(weekRepository.findByIdAndUserId(weekId, userId)).thenReturn(Optional.of(week));

        ForecastResponse response = new ForecastResponse(
                weekId,
                blockId,
                "Strength Block",
                3,
                false,
                87.0,
                Collections.singletonList(new ForecastResponse.ForecastInsight(
                        UUID.randomUUID(),
                        "Bench Press",
                        102.5,
                        90.0,
                        5,
                        8.3,
                        ForecastSource.CURRENT_BLOCK,
                        new ForecastResponse.BestSetInfo(3, 95.0, "2026-07-15T10:30:00Z")
                ))
        );

        when(forecastEngine.generateForecast(eq(week), eq(userId))).thenReturn(response);

        mockMvc.perform(get("/analysis/forecast/week/{weekId}", weekId)
                        .with(jwt().jwt((token) -> token.subject(userId.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekId").value(weekId.toString()))
                .andExpect(jsonPath("$.intensityPct").value(87.0))
                .andExpect(jsonPath("$.insights[0].exerciseName").value("Bench Press"))
                .andExpect(jsonPath("$.insights[0].targetWeightKg").value(90.0))
                .andExpect(jsonPath("$.insights[0].source").value("CURRENT_BLOCK"));
    }

    @Test
    @DisplayName("returns 404 when week not found")
    void returns404WhenWeekNotFound() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID weekId = UUID.randomUUID();

        when(weekRepository.findByIdAndUserId(weekId, userId)).thenReturn(Optional.empty());

        mockMvc.perform(get("/analysis/forecast/week/{weekId}", weekId)
                        .with(jwt().jwt((token) -> token.subject(userId.toString()))))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("returns 401 when unauthenticated")
    void returns401WhenUnauthenticated() throws Exception {
        mockMvc.perform(get("/analysis/forecast/week/{weekId}", UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 3: Run tests**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.controller.analysis.TemplateAnalysisForecastControllerTest"`
Expected: PASS (3 tests)

- [ ] **Step 4: Ensure existing controller tests still pass**

Run: `cd workout_service; ./gradlew test --tests "com.louisfiges.workout.controller.analysis.*"`
Expected: All tests in the analysis controller package pass

- [ ] **Step 5: Commit**

```bash
git add workout_service/src/main/java/com/louisfiges/workout/controller/analysis/TemplateAnalysisController.java
git add workout_service/src/test/java/com/louisfiges/workout/controller/analysis/TemplateAnalysisForecastControllerTest.java
git commit -m "feat: add GET /analysis/forecast/week/{weekId} endpoint"
```

---

### Task 6: Frontend Types and Query Client

**Files:**
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\src\features\periodisation\types\Periodisation.ts`
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\src\features\insights\types\Insights.ts`
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\src\api\queryKeys.ts`
- Create: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\src\features\insights\hooks\useWeekForecast.ts`

**Interfaces:**
- Produces: `Week` type with `intensityPct`
- Produces: `ForecastInsight` type, `WeekForecast` type
- Produces: `queryKeys.analysis.forecast(weekId)`
- Produces: `useWeekForecast(weekId)` hook

- [ ] **Step 1: Add intensityPct to Week type**

In `Periodisation.ts`, update the `Week` type:

```ts
type Week = {
  id: string;
  weekNumber: number;
  isDeload: boolean;
  targetSetsPerExercise: number;
  rpeOverrideMin?: number | null;
  rpeOverrideMax?: number | null;
  intensityPct?: number | null;
};
```

- [ ] **Step 2: Add forecast types to Insights.ts**

```ts
// Add after existing types:

type ForecastInsight = {
  exerciseDefinitionId: string;
  exerciseName: string;
  estimatedOneRmKg: number | null;
  targetWeightKg: number | null;
  targetReps: number;
  targetRpe: number;
  source: "CURRENT_BLOCK" | "PREVIOUS_BLOCK" | "NO_DATA";
  bestSet: {
    reps: number;
    weightKg: number;
    setDate: string;
  } | null;
};

type WeekForecast = {
  weekId: string;
  blockId: string | null;
  blockName: string | null;
  weekNumber: number;
  deload: boolean;
  intensityPct: number;
  insights: ForecastInsight[];
};

export type {
  // ... existing exports ...
  ForecastInsight,
  WeekForecast,
};
```

- [ ] **Step 3: Add forecast query key to queryKeys.ts**

Add inside the `analysis` object, after `recommendation`:

```ts
forecast: (weekId: string) => ["analysis", "forecast", weekId] as const,
```

- [ ] **Step 4: Create useWeekForecast hook**

```ts
import { useQuery } from "@tanstack/react-query";
import { workoutApi, unwrapApiResponse } from "@/api/api";
import { queryKeys } from "@/api/queryKeys";
import type { WeekForecast } from "@/features/insights/types/Insights";

export function useWeekForecast(weekId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.analysis.forecast(weekId!),
    queryFn: async () => {
      const response = await workoutApi.get<WeekForecast>(
        `/analysis/forecast/week/${weekId}`
      );
      return unwrapApiResponse(response);
    },
    enabled: !!weekId,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 5: Verify types compile**

Run: `cd frontend; npx tsc --noEmit`
Expected: No new type errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/periodisation/types/Periodisation.ts
git add frontend/src/features/insights/types/Insights.ts
git add frontend/src/api/queryKeys.ts
git add frontend/src/features/insights/hooks/useWeekForecast.ts
git commit -m "feat: add forecast types, query key, and useWeekForecast hook"
```

---

### Task 7: WeekCard Intensity Badge

**Files:**
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\src\features\periodisation\week\components\WeekCard.tsx`
- Test: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\tests\unit\components\WeekCard.test.tsx`

**Interfaces:**
- Consumes: `Week.intensityPct` (from props)

- [ ] **Step 1: Update WeekCard to show intensity badge**

Add the intensity badge between the deload toggle row and the sets stepper, only when `intensityPct` is present and the week is not a deload week:

```tsx
import { useState } from 'react';
import { CalendarDays, Gauge, Moon, Save, Sun } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CollapsiblePanel from '@/components/layout/section/CollapsiblePanel';
import type { Week } from '@/features/periodisation/types/Periodisation';
import { Stepper } from '@/components/ui/stepper';

export function WeekCard({
  week,
  onUpdateDeload,
  onUpdateTargetSets,
  isReadOnly = false,
}: {
  week: Week;
  onUpdateDeload: (weekId: string, deload: boolean) => Promise<void>;
  onUpdateTargetSets: (weekId: string, sets: number) => Promise<void>;
  isReadOnly?: boolean;
}) {
  const [localSets, setLocalSets] = useState(week.targetSetsPerExercise);
  const [localDeload, setLocalDeload] = useState(week.isDeload);
  const [savingSets, setSavingSets] = useState(false);
  const [togglingDeload, setTogglingDeload] = useState(false);

  const handleToggleDeload = async () => {
    if (isReadOnly) return;
    const next = !localDeload;
    setTogglingDeload(true);
    setLocalDeload(next);
    try {
      await onUpdateDeload(week.id, next);
    } catch {
      setLocalDeload(!next);
    } finally {
      setTogglingDeload(false);
    }
  };

  const handleSaveSets = async () => {
    if (isReadOnly) return;
    if (localSets === week.targetSetsPerExercise) return;
    setSavingSets(true);
    try {
      await onUpdateTargetSets(week.id, localSets);
      enqueueSnackbar('Target sets updated', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to update target sets', { variant: 'error' });
      setLocalSets(week.targetSetsPerExercise);
    } finally {
      setSavingSets(false);
    }
  };

  return (
    <CollapsiblePanel
      className={localDeload ? 'border-amber-500/30 bg-amber-500/5' : undefined}
      headerClassName={localDeload ? 'bg-amber-500/5' : undefined}
      icon={CalendarDays}
      title={`Week ${week.weekNumber}`}
    >
      <div className="flex items-center justify-between gap-4">
        <Label className="flex cursor-pointer items-center gap-2">
          {localDeload
            ? <Moon className="h-4 w-4 shrink-0 text-amber-500" />
            : <Sun className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="text-sm">{localDeload ? 'Deload week' : 'Training week'}</span>
        </Label>
        <button
          onClick={handleToggleDeload}
          disabled={togglingDeload || isReadOnly}
          aria-label="Toggle deload"
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full focus:outline-none disabled:opacity-50 ${
            localDeload ? 'bg-amber-500' : 'bg-muted-foreground/30'
          }`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ${
            localDeload ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {week.intensityPct != null && !localDeload && (
        <div
          className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm"
          title={`Based on rep range and RPE targets for week ${week.weekNumber}`}
        >
          <Gauge className="h-4 w-4 shrink-0 text-primary" />
          <span className="font-medium text-primary">{week.intensityPct}% 1RM</span>
        </div>
      )}

      <div className="space-y-2.5">
        <Stepper
          mode="row"
          value={localSets}
          onIncrement={() => setLocalSets((prev) => prev + 1)}
          onDecrement={() => setLocalSets((prev) => prev - 1)}
          min={1}
          max={20}
          label="Target sets per exercise"
          disabled={isReadOnly}
        />
        {localSets !== week.targetSetsPerExercise && (
          <Button
            icon={undefined}
            size="sm"
            onClick={handleSaveSets}
            disabled={savingSets || isReadOnly}
            className="w-full gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {savingSets ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

    </CollapsiblePanel>
  );
}
```

- [ ] **Step 2: Write WeekCard test for intensity badge**

Create the test file:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "../../../setup/test-utils";
import { WeekCard } from "@/features/periodisation/week/components/WeekCard";
import type { Week } from "@/features/periodisation/types/Periodisation";

function createWeek(overrides: Partial<Week> = {}): Week {
  return {
    id: "week-1",
    weekNumber: 1,
    isDeload: false,
    targetSetsPerExercise: 4,
    rpeOverrideMin: null,
    rpeOverrideMax: null,
    intensityPct: null,
    ...overrides,
  };
}

describe("WeekCard intensity badge", () => {
  it("shows intensity badge when intensityPct is provided and week is not deload", () => {
    const week = createWeek({ intensityPct: 87.0 });
    render(
      <WeekCard
        week={week}
        onUpdateDeload={async () => {}}
        onUpdateTargetSets={async () => {}}
      />
    );
    expect(screen.getByText("87% 1RM")).toBeInTheDocument();
  });

  it("does not show intensity badge when intensityPct is null", () => {
    const week = createWeek({ intensityPct: null });
    render(
      <WeekCard
        week={week}
        onUpdateDeload={async () => {}}
        onUpdateTargetSets={async () => {}}
      />
    );
    expect(screen.queryByText(/1RM/)).not.toBeInTheDocument();
  });

  it("does not show intensity badge on deload weeks", () => {
    const week = createWeek({ isDeload: true, intensityPct: 85.0 });
    render(
      <WeekCard
        week={week}
        onUpdateDeload={async () => {}}
        onUpdateTargetSets={async () => {}}
      />
    );
    expect(screen.queryByText(/1RM/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd frontend; npx vitest run tests/unit/components/WeekCard.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/periodisation/week/components/WeekCard.tsx
git add frontend/tests/unit/components/WeekCard.test.tsx
git commit -m "feat: show derived intensity % badge on WeekCard"
```

---

### Task 8: LogSetsPanel Target Weight Banner

**Files:**
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\src\features\workout\entries\components\panels\LogSetsPanel.tsx`
- Modify: `C:\Users\louis\Documents\GitHub\dedicate_workout_pwa\frontend\src\features\workout\entries\components\panels\LogSetsView.tsx` (if banner renders there)

**Interfaces:**
- Consumes: `useCurrentWeek()` to get active programme/block/week
- Consumes: `useWeekForecast(weekId)` to get forecast data
- Produces: Target weight banner shown above exercise sets

- [ ] **Step 1: Update LogSetsPanel to show forecast banner**

```tsx
import type { WorkoutEntryExerciseDraft } from "@/features/workout/entries/types/workoutEntryFormTypes";
import type { Block } from "@/features/periodisation/types/Periodisation";
import type { WorkoutTemplateExerciseInsight } from "@/features/insights/types/Insights";
import type { DashboardSummaryTopLift } from "@/features/workout/types/Workout";
import { useLogSets } from "@/features/workout/entries/hooks/useLogSets";
import { LogSetsView } from "@/features/workout/entries/components/panels/LogSetsView";
import { getExerciseIdentityDefinitionId, getExerciseIdentityName } from "@/features/workout/entries/types/ExerciseIdentity";
import { useWeekForecast } from "@/features/insights/hooks/useWeekForecast";
import { useCurrentWeek } from "@/features/periodisation/week/components/useCurrentWeek";
import { useMemo } from "react";
import { Target, Loader2 } from "lucide-react";

interface LogSetsPanelProps {
  exerciseItem: WorkoutEntryExerciseDraft;
  exerciseIdx: number;
  handleSetChange: (
    exerciseIdx: number,
    setIdx: number,
    field: "reps" | "weight" | "rpe" | "notes" | "setRole" | "restBeforeSeconds",
    value: string,
  ) => void;
  stepValue: (
    exerciseIdx: number,
    setIdx: number,
    field: "reps" | "weight",
    direction: "up" | "down",
  ) => void;
  addSet: (exerciseIdx: number) => void;
  removeSet: (exerciseIdx: number, setIdx: number) => void;
  copyFromPrevious: (exerciseIdx: number, setIdx: number) => void;
  onNext: () => void;
  block: Block | null;
  trainingInsight?: WorkoutTemplateExerciseInsight | null;
  workoutTemplateId?: string;
  targetRestSeconds?: number;
  sessionStartedAt: string;
  isFocusedLift?: boolean;
  focusLiftSummary?: DashboardSummaryTopLift | null;
  focusLiftSummaryLoading?: boolean;
}

export function LogSetsPanel(props: LogSetsPanelProps) {
  const logSets = useLogSets({
    exerciseItem: props.exerciseItem,
    exerciseIdx: props.exerciseIdx,
    exerciseDefinitionId: getExerciseIdentityDefinitionId(props.exerciseItem.identity),
    handleSetChange: props.handleSetChange,
    trainingInsight: props.trainingInsight,
    targetRestSeconds: props.targetRestSeconds,
    workoutTemplateId: props.workoutTemplateId,
    sessionStartedAt: props.sessionStartedAt,
  });

  const { context: activeWeekCtx } = useCurrentWeek();
  const weekId = activeWeekCtx?.week?.id ?? null;
  const { data: forecast, isLoading: forecastLoading } = useWeekForecast(weekId);

  const exerciseName = getExerciseIdentityName(props.exerciseItem.identity);
  const forecastInsight = useMemo(() => {
    if (!forecast) return null;
    return forecast.insights.find(
      (i) => i.exerciseDefinitionId === getExerciseIdentityDefinitionId(props.exerciseItem.identity)
    ) ?? null;
  }, [forecast, props.exerciseItem.identity]);

  const forecastBanner = useMemo(() => {
    if (forecastLoading && props.isFocusedLift) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading weight target...
        </div>
      );
    }

    if (!forecastInsight) return null;

    if (forecastInsight.source === "NO_DATA" || forecastInsight.targetWeightKg == null) {
      return (
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4 shrink-0" />
          Log a few sets this block to calibrate your 1RM
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
        <Target className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="font-semibold text-primary">{forecastInsight.targetWeightKg} kg</span>
          {" × "}{forecastInsight.targetReps} reps @ {forecast.intensityPct}% 1RM
        </span>
        {forecastInsight.estimatedOneRmKg != null && (
          <span className="text-xs text-muted-foreground">
            (e1RM: ~{forecastInsight.estimatedOneRmKg} kg)
          </span>
        )}
      </div>
    );
  }, [forecastInsight, forecastLoading, props.isFocusedLift, forecast?.intensityPct]);

  return (
    <div className="space-y-3">
      {forecastBanner}
      <LogSetsView
        exerciseItem={props.exerciseItem}
        exerciseIdx={props.exerciseIdx}
        handleSetChange={props.handleSetChange}
        stepValue={props.stepValue}
        addSet={props.addSet}
        removeSet={props.removeSet}
        copyFromPrevious={props.copyFromPrevious}
        onNext={props.onNext}
        block={props.block}
        isFocusedLift={props.isFocusedLift}
        focusLiftSummary={props.focusLiftSummary ?? null}
        focusLiftSummaryLoading={props.focusLiftSummaryLoading ?? false}
        {...logSets}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend; npx tsc --noEmit`
Expected: No new type errors (check that `Gauge`, `Target`, `Loader2` icons exist in lucide-react)

- [ ] **Step 3: Run existing LogSetsPanel tests**

Run: `cd frontend; npx vitest run tests/unit/components/workout/entries/panels/LogSetsView.test.tsx`
Expected: Existing tests pass

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/workout/entries/components/panels/LogSetsPanel.tsx
git commit -m "feat: show forecast target weight banner on LogSetsPanel"
```

---

### Task 9: Integration Verification

**Files:** None new (verification-only task)

- [ ] **Step 1: Build the backend**

Run: `cd workout_service; ./gradlew build -x test`
Expected: BUILD SUCCESSFUL

- [ ] **Step 2: Run all backend tests**

Run: `cd workout_service; ./gradlew test`
Expected: All tests pass (BUILD SUCCESSFUL, including new tests from Tasks 1-5 and existing tests unaffected)

- [ ] **Step 3: Build the frontend**

Run: `cd frontend; npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Run frontend unit tests**

Run: `cd frontend; npx vitest run`
Expected: All tests pass (Note: 3 new WeekCard tests from Task 7, existing tests unaffected)

- [ ] **Step 5: End-to-end smoke test (manual)**

1. Start backend and frontend
2. Create a programme with a Strength block (rep range 3-5, RPE 7-9, 4 weeks)
3. Ensure at least one workout template has focus exercises
4. Navigate to BlockPanel → verify intensity % badge on each WeekCard
5. Navigate to a workout → start logging a focus exercise → verify target weight banner shows prescription
6. Log some sets → after submission, verify the target weight updates on the next session

- [ ] **Step 6: Commit**

```bash
git commit --allow-empty -m "chore: integration verification passed"
```

---

## Execution Order

Tasks 1, 2, and 6 can run in parallel (independent files).
Tasks 3 and 4 are independent but both needed before Task 5.
Tasks 7 and 8 depend on 6.
Task 9 is last.

```
Task 1 (RPE lookup)  ─────┐
                           ├──→ Task 5 (Endpoint) ──→ Task 9 (Integration)
Task 2 (WeekDTO + Mapper) ─┘

Task 3 (ForecastEngine) ──┬──→ Task 5 (Endpoint) ──→ Task 9 (Integration)
Task 4 (Repository) ──────┘

Task 6 (Frontend types) ──→ Task 7 (WeekCard) ──→ Task 9 (Integration)
                        └─→ Task 8 (LogSetsPanel) ──→ Task 9 (Integration)
```
