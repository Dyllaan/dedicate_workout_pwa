package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.*;
import com.louisfiges.workout.heatmap.MappingSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
    private TestEntityManager em;

    @Test
    @DisplayName("returns sets for exercise definition within date range")
    void returnsSetsInDateRange() {
        UUID userId = UUID.randomUUID();

        ExerciseDefinition def = new ExerciseDefinition();
        def.setUserId(userId);
        def.setExerciseName("Bench Press");
        def.setNormalizedExerciseName("bench press");
        def.setNormalizedVariant("");
        def.setMappingSource(MappingSource.MANUAL);
        em.persistAndFlush(def);

        WorkoutTemplate template = new WorkoutTemplate("Push Day", userId, "Push", List.of());
        em.persistAndFlush(template);

        SetEntry set = new SetEntry(5, 100.0, 8.0, null);
        ExerciseEntry exEntry = new ExerciseEntry(def, def.getExerciseName(), null, 3, List.of(set));

        WorkoutEntry entry = new WorkoutEntry(template, userId, List.of(exEntry), null);
        entry = em.persistAndFlush(entry);
        em.clear();

        Instant now = Instant.now();
        Instant blockStart = now.minus(1, ChronoUnit.DAYS);
        Instant blockEnd = now.plus(1, ChronoUnit.DAYS);

        List<Object[]> results = repository.findBestSetsForExerciseInBlock(
                def.getId(), userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        assertThat(results).hasSize(1);
        SetEntry resultSet = (SetEntry) results.get(0)[0];
        assertThat(resultSet.getWeight()).isEqualTo(100.0);
        assertThat(resultSet.getReps()).isEqualTo(5);
        Instant resultDate = (Instant) results.get(0)[1];
        assertThat(resultDate).isNotNull();
    }

    @Test
    @DisplayName("returns empty when no sets in date range")
    void emptyWhenNoSetsInRange() {
        UUID userId = UUID.randomUUID();

        ExerciseDefinition def = new ExerciseDefinition();
        def.setUserId(userId);
        def.setExerciseName("Bench Press");
        def.setNormalizedExerciseName("bench press");
        def.setNormalizedVariant("");
        def.setMappingSource(MappingSource.MANUAL);
        em.persistAndFlush(def);

        WorkoutTemplate template = new WorkoutTemplate("Push Day", userId, "Push", List.of());
        em.persistAndFlush(template);

        SetEntry set = new SetEntry(5, 100.0, 8.0, null);
        ExerciseEntry exEntry = new ExerciseEntry(def, def.getExerciseName(), null, 3, List.of(set));

        WorkoutEntry entry = new WorkoutEntry(template, userId, List.of(exEntry), null);
        em.persistAndFlush(entry);
        em.clear();

        // Use a future date range that doesn't include the just-created entry
        Instant blockStart = Instant.now().plus(7, ChronoUnit.DAYS);
        Instant blockEnd = blockStart.plus(30, ChronoUnit.DAYS);

        List<Object[]> results = repository.findBestSetsForExerciseInBlock(
                def.getId(), userId, blockStart, blockEnd, PageRequest.of(0, 5)
        );

        assertThat(results).isEmpty();
    }
}
