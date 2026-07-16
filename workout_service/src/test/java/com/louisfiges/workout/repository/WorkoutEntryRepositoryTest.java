package com.louisfiges.workout.repository;

import com.louisfiges.workout.analysis.types.PrimaryBenchmark;
import com.louisfiges.workout.analysis.types.ProgressionMode;
import com.louisfiges.workout.dao.workout.ExerciseConfig;
import com.louisfiges.workout.dao.workout.ExerciseDefinition;
import com.louisfiges.workout.dao.workout.ExerciseEntry;
import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dao.workout.WorkoutEntry;
import com.louisfiges.workout.dao.workout.WorkoutTemplate;
import com.louisfiges.workout.heatmap.MappingSource;
import org.hibernate.Hibernate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("WorkoutEntryRepository")
class WorkoutEntryRepositoryTest {

    @Autowired
    private WorkoutEntryRepository workoutEntryRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("loads the detailed workout graph without requiring an extra join fetch")
    void loadsDetailedWorkoutGraphAfterClear() {
        UUID userId = UUID.randomUUID();

        ExerciseDefinition definition = new ExerciseDefinition();
        definition.setUserId(userId);
        definition.setExerciseName("Bench Press");
        definition.setVariant("Barbell");
        definition.setNormalizedExerciseName("bench press");
        definition.setNormalizedVariant("barbell");
        definition.setMappingSource(MappingSource.MANUAL);
        entityManager.persist(definition);

        ExerciseConfig config = new ExerciseConfig();
        config.setExerciseDefinition(definition);
        config.setGoalSets(3);
        config.setGoalReps(5);
        config.setProgressionMode(ProgressionMode.WEIGHT_FIRST);
        config.setPrimaryBenchmark(PrimaryBenchmark.WORKING_SETS);

        WorkoutTemplate template = new WorkoutTemplate("Push Day", userId, "Push", List.of(config));
        entityManager.persist(template);

        ExerciseEntry exercise = new ExerciseEntry();
        exercise.setExerciseDefinition(definition);
        exercise.setLoggedExerciseName("Bench Press");
        exercise.setLoggedVariant("Barbell");
        exercise.setGoalSets(3);
        exercise.setSets(List.of(
                new SetEntry(5, 100.0, 8.0, null),
                new SetEntry(5, 102.5, 8.5, null)
        ));

        WorkoutEntry entry = new WorkoutEntry(template, userId, List.of(exercise), null);
        entry = workoutEntryRepository.saveAndFlush(entry);

        entityManager.clear();

        WorkoutEntry found = workoutEntryRepository.findDetailedByIdAndUserId(entry.getId(), userId)
                .orElseThrow();

        assertThat(Hibernate.isInitialized(found.getTemplate())).isTrue();
        assertThat(Hibernate.isInitialized(found.getExercises())).isTrue();
        assertThat(Hibernate.isInitialized(found.getExercises().get(0).getSets())).isTrue();
        assertThat(Hibernate.isInitialized(found.getExercises().get(0).getExerciseDefinition())).isTrue();
        assertThat(found.getTemplate().getName()).isEqualTo("Push Day");
        assertThat(found.getExercises()).hasSize(1);
        assertThat(found.getExercises().get(0).getLoggedExerciseName()).isEqualTo("Bench Press");
        assertThat(found.getExercises().get(0).getExerciseDefinition().getExerciseName()).isEqualTo("Bench Press");
    }
}
