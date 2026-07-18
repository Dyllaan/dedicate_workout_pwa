### Task 4: `InolCalculator` Service

**Files:**
- Create: `workout_service/src/main/java/com/louisfiges/workout/service/analysis/InolCalculator.java`
- Create: `workout_service/src/test/java/com/louisfiges/workout/service/analysis/InolCalculatorTest.java`

**Interfaces:**
- Produces: `InolCalculator.computeAndPersist(WorkoutEntry entry, UUID userId)` — void, persists INOL rows
- Depends on: `BlockAwareOneRmService` (already created by Task 2), `WorkoutInolRepository` (already created by Task 3)
- Uses `BlockAwareOneRmService.OneRmResult` record which has 6 fields: (double epley, double bryzycki, double lombardi, SetEntry bestSet, Instant setDate, boolean carryForward)

**Algorithm:** For each exercise in the workout entry:
1. Skip if no ExerciseDefinition
2. Call `oneRmService.resolveOneRm(exerciseDefId, userId)` → Optional<OneRmResult>
3. If empty → skip exercise (no INOL row)
4. Compute ref1rm = median(epley, bryzycki, lombardi)
5. For each set with weight > 0:
   - intensityPct = (weight / ref1rm) * 100, clamped [1, 99]
   - setInol = reps / (100 - intensityPct)
6. exerciseInol = SUM(setInol)
7. Persist WorkoutInol row (block_id = null for now, carryForward from OneRmResult)

---

### Step 1: Write the failing test

Create `workout_service/src/test/java/com/louisfiges/workout/service/analysis/InolCalculatorTest.java`:

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.workout.*;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InolCalculator")
class InolCalculatorTest {

    @Mock private BlockAwareOneRmService oneRmService;
    @Mock private WorkoutInolRepository inolRepository;
    @InjectMocks private InolCalculator calculator;

    @Captor private ArgumentCaptor<WorkoutInol> inolCaptor;

    private UUID userId;
    private WorkoutEntry entry;
    private ExerciseEntry exerciseEntry;
    private ExerciseDefinition exerciseDef;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        exerciseDef = new ExerciseDefinition();
        exerciseDef.setId(UUID.randomUUID());
        exerciseDef.setExerciseName("Bench Press");

        SetEntry set1 = new SetEntry();
        set1.setReps(5);
        set1.setWeight(80.0);

        SetEntry set2 = new SetEntry();
        set2.setReps(3);
        set2.setWeight(90.0);

        exerciseEntry = new ExerciseEntry();
        exerciseEntry.setId(UUID.randomUUID());
        exerciseEntry.setExerciseDefinition(exerciseDef);
        exerciseEntry.setLoggedExerciseName("Bench Press");
        exerciseEntry.setSets(List.of(set1, set2));

        WorkoutTemplate template = new WorkoutTemplate();
        template.setId(UUID.randomUUID());
        template.setName("Push Day");

        entry = new WorkoutEntry();
        entry.setId(UUID.randomUUID());
        entry.setUserId(userId.toString());
        entry.setTemplate(template);
        entry.setExercises(List.of(exerciseEntry));
    }

    @Test
    @DisplayName("computes and persists INOL when reference 1RM is available")
    void computesInolWhenOneRmAvailable() {
        SetEntry bestSet = new SetEntry();
        bestSet.setReps(3);
        bestSet.setWeight(95.0);

        BlockAwareOneRmService.OneRmResult oneRmResult =
                new BlockAwareOneRmService.OneRmResult(95.5, 96.0, 94.8, bestSet, null, false);

        when(oneRmService.resolveOneRm(exerciseDef.getId(), userId))
                .thenReturn(Optional.of(oneRmResult));

        calculator.computeAndPersist(entry, userId);

        verify(inolRepository).save(inolCaptor.capture());
        WorkoutInol saved = inolCaptor.getValue();

        assertThat(saved.getExerciseName()).isEqualTo("Bench Press");
        assertThat(saved.getInolScore()).isGreaterThan(0.8);
        assertThat(saved.getInolScore()).isLessThan(0.85);
        assertThat(saved.getCarryForward()).isFalse();
    }

    @Test
    @DisplayName("skips exercise when no reference 1RM is available")
    void skipsWhenNoOneRm() {
        when(oneRmService.resolveOneRm(exerciseDef.getId(), userId))
                .thenReturn(Optional.empty());

        calculator.computeAndPersist(entry, userId);

        verify(inolRepository, never()).save(any());
    }

    @Test
    @DisplayName("skips exercise without exercise definition")
    void skipsWhenNoDefinition() {
        exerciseEntry.setExerciseDefinition(null);

        calculator.computeAndPersist(entry, userId);

        verify(oneRmService, never()).resolveOneRm(any(), any());
        verify(inolRepository, never()).save(any());
    }
}
```

### Step 2: Run test to confirm it fails

```
Set-Location workout_service; ./gradlew test --tests "*InolCalculatorTest*"
```

### Step 3: Implement `InolCalculator`

Create `workout_service/src/main/java/com/louisfiges/workout/service/analysis/InolCalculator.java`:

```java
package com.louisfiges.workout.service.analysis;

import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class InolCalculator {

    private static final Logger log = LoggerFactory.getLogger(InolCalculator.class);

    private final BlockAwareOneRmService oneRmService;
    private final WorkoutInolRepository inolRepository;

    public InolCalculator(BlockAwareOneRmService oneRmService, WorkoutInolRepository inolRepository) {
        this.oneRmService = oneRmService;
        this.inolRepository = inolRepository;
    }

    public void computeAndPersist(WorkoutEntry entry, UUID userId) {
        if (entry.getExercises() == null || entry.getExercises().isEmpty()) {
            return;
        }

        for (ExerciseEntry exerciseEntry : entry.getExercises()) {
            if (exerciseEntry.getExerciseDefinition() == null) {
                log.debug("Skipping INOL for exercise without definition: {}", exerciseEntry.getLoggedExerciseName());
                continue;
            }

            Optional<BlockAwareOneRmService.OneRmResult> oneRmOpt =
                    oneRmService.resolveOneRm(exerciseEntry.getExerciseDefinition().getId(), userId);

            if (oneRmOpt.isEmpty()) {
                log.debug("Skipping INOL for {} — no reference 1RM available",
                        exerciseEntry.getLoggedExerciseName());
                continue;
            }

            BlockAwareOneRmService.OneRmResult oneRm = oneRmOpt.get();
            double ref1rm = median(oneRm.epley(), oneRm.bryzycki(), oneRm.lombardi());
            double exerciseInol = computeExerciseInol(exerciseEntry, ref1rm);

            String exerciseName = exerciseEntry.getLoggedExerciseName() != null
                    ? exerciseEntry.getLoggedExerciseName()
                    : exerciseEntry.getExerciseDefinition().getExerciseName();

            WorkoutInol inol = new WorkoutInol(
                    userId.toString(),
                    entry,
                    exerciseEntry,
                    exerciseName,
                    roundTo2(exerciseInol),
                    roundTo1(ref1rm),
                    null,
                    oneRm.carryForward()
            );

            inolRepository.save(inol);
        }
    }

    double computeExerciseInol(ExerciseEntry exerciseEntry, double ref1rm) {
        double totalInol = 0.0;

        for (SetEntry set : exerciseEntry.getSets()) {
            if (set.getWeight() == null || set.getWeight() <= 0) {
                continue;
            }

            double intensityPct = (set.getWeight() / ref1rm) * 100.0;

            if (intensityPct >= 99.5) {
                intensityPct = 99.0;
            }
            if (intensityPct < 1.0) {
                intensityPct = 1.0;
            }

            double setInol = set.getReps() / (100.0 - intensityPct);
            totalInol += setInol;
        }

        return totalInol;
    }

    private double median(double a, double b, double c) {
        return Math.max(Math.min(a, b), Math.min(Math.max(a, b), c));
    }

    private double roundTo2(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private double roundTo1(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
```

### Step 4: Run tests to verify they pass

```
Set-Location workout_service; ./gradlew test --tests "*InolCalculatorTest*"
```

### Step 5: Commit

```
git add .; git commit -m "feat: add InolCalculator service with tests"
```
