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

- [ ] **Step 2: Run specific test**

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
