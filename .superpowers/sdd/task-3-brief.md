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
