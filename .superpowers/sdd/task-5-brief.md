### Task 5: Wire `InolCalculator` into `WorkoutEntryService`

**Files:**
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/workout/WorkoutEntryService.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutEntryDTO.java`
- Create: `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutInolDTO.java`
- Create: `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutEntryInolDTO.java`
- Modify: `workout_service/src/main/java/com/louisfiges/workout/service/mapper/WorkoutEntryMapper.java`

**Interfaces:**
- Consumes: `InolCalculator.computeAndPersist(WorkoutEntry, UUID)`
- Produces: `WorkoutEntryDTO` with new `inol()` field

---

**Step 1: Create DTO records**

Create `WorkoutInolDTO.java`:
```java
package com.louisfiges.workout.dto.responses;

import java.util.UUID;

public record WorkoutInolDTO(
        UUID id,
        String exerciseName,
        double inolScore,
        double reference1RmKg,
        boolean carryForward
) {}
```

Create `WorkoutEntryInolDTO.java`:
```java
package com.louisfiges.workout.dto.responses;

import java.util.List;

public record WorkoutEntryInolDTO(
        double total,
        List<WorkoutInolDTO> perExercise
) {}
```

**Step 2: Modify `WorkoutEntryDTO`**

Read `WorkoutEntryDTO.java` at `workout_service/src/main/java/com/louisfiges/workout/dto/responses/WorkoutEntryDTO.java`.

Add `WorkoutEntryInolDTO inol` as the last record parameter (nullable — it's null when no INOL data exists):

```java
public record WorkoutEntryDTO(
        UUID id,
        WorkoutTemplateDTO template,
        List<ExerciseEntryDTO> exercises,
        String notes,
        LocalDateTime createdAt,
        WorkoutEntryInolDTO inol
) implements DTO {}
```

IMPORTANT: Adding a field to a Java record changes the canonical constructor. Update ALL call sites that construct `WorkoutEntryDTO`. The existing call site is in `WorkoutEntryMapper.toDTO()` — you'll update it in Step 3.

There may also be tests that construct `WorkoutEntryDTO` directly — use the IDE to find them and update by adding `null` as the last parameter.

**Step 3: Update `WorkoutEntryMapper`**

Read `WorkoutEntryMapper.java` at `workout_service/src/main/java/com/louisfiges/workout/service/mapper/WorkoutEntryMapper.java`.

Inject `WorkoutInolRepository`:
```java
private final WorkoutInolRepository inolRepository;

public WorkoutEntryMapper(ExerciseEntryMapper exerciseEntryMapper, 
                           WorkoutTemplateMapper workoutTemplateMapper,
                           WorkoutInolRepository inolRepository) {
    this.exerciseEntryMapper = exerciseEntryMapper;
    this.workoutTemplateMapper = workoutTemplateMapper;
    this.inolRepository = inolRepository;
}
```

Update `toDTO()` method to populate INOL:
```java
public WorkoutEntryDTO toDTO(WorkoutEntry entity) {
    List<ExerciseEntryDTO> exerciseDTOs = entity.getExercises().stream()
            .map(exerciseEntryMapper::toDTO)
            .toList();

    LocalDateTime createdDateTime = entity.getCreatedAt() != null
            ? LocalDateTime.ofInstant(entity.getCreatedAt(), ZoneId.systemDefault())
            : LocalDateTime.now();

    List<WorkoutInol> inolRows = inolRepository.findByWorkoutEntryId(entity.getId());
    WorkoutEntryInolDTO inolDTO = null;
    if (!inolRows.isEmpty()) {
        double total = 0;
        List<WorkoutInolDTO> items = new ArrayList<>();
        for (WorkoutInol wi : inolRows) {
            total += wi.getInolScore();
            items.add(new WorkoutInolDTO(
                    wi.getId(),
                    wi.getExerciseName(),
                    wi.getInolScore(),
                    wi.getReference1rmKg(),
                    wi.getCarryForward()
            ));
        }
        inolDTO = new WorkoutEntryInolDTO(total, items);
    }

    return new WorkoutEntryDTO(entity.getId(), workoutTemplateMapper.toDTO(entity.getTemplate()), 
            exerciseDTOs, entity.getNotes(), createdDateTime, inolDTO);
}
```

Add imports:
```java
import com.louisfiges.workout.dao.workout.WorkoutInol;
import com.louisfiges.workout.repository.WorkoutInolRepository;
import java.util.ArrayList;
```

**Step 4: Wire `InolCalculator` into `WorkoutEntryService`**

Read `WorkoutEntryService.java`.

Inject `InolCalculator`:
```java
private final InolCalculator inolCalculator;

public WorkoutEntryService(
        WorkoutEntryRepository workoutEntryRepository,
        WorkoutTemplateRepository workoutTemplateRepository,
        ExerciseDefinitionService exerciseDefinitionService,
        ReadinessService readinessService,
        AnalysisCacheEvictor analysisCacheEvictor,
        WorkoutEntryMapper workoutEntryMapper,
        InolCalculator inolCalculator) {
    ...
    this.inolCalculator = inolCalculator;
}
```

Call `inolCalculator.computeAndPersist()` after save in `create()` (line 131):
```java
analysisCacheEvictor.evictAnalysisCachesAfterCommit();
inolCalculator.computeAndPersist(saved, userId);
return workoutEntryMapper.toDTO(saved);
```

And in `update()` (line 146):
```java
WorkoutEntryDTO response = workoutEntryMapper.toDTO(savedEntry);
analysisCacheEvictor.evictAnalysisCachesAfterCommit();
inolCalculator.computeAndPersist(savedEntry, userId);
return response;
```

**Step 5: Run all backend tests**

```
Set-Location workout_service; ./gradlew test
```

Fix any compilation errors (especially any other files constructing `WorkoutEntryDTO` that need the new parameter).

**Step 6: Commit**

```
git add .; git commit -m "feat: wire InolCalculator into WorkoutEntryService save flow"
```
