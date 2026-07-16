package com.louisfiges.workout.repository;

import com.louisfiges.workout.dao.workout.SetEntry;
import com.louisfiges.workout.dto.responses.SetEntryWithDateDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SetEntryRepository extends JpaRepository<SetEntry, UUID> {
    @Query("""
    SELECT new com.louisfiges.workout.dto.responses.SetEntryWithDateDTO(
        se.id, se.reps, se.weight, se.rpe, se.notes, se.restBeforeSeconds, we.createdAt
    )
    FROM SetEntry se
    JOIN ExerciseEntry ee ON se MEMBER OF ee.sets
    JOIN WorkoutEntry we ON ee MEMBER OF we.exercises
    WHERE we.userId = :userId
    AND LOWER(ee.loggedExerciseName) = LOWER(:exerciseName)
    AND se.weight IS NOT NULL
    AND se.reps BETWEEN 1 AND 12
    ORDER BY (se.weight * (1 + se.reps / 30.0)) DESC, we.createdAt DESC
""")
    List<SetEntryWithDateDTO> findBestSetsForExercise(
            @Param("userId") UUID userId,
            @Param("exerciseName") String exerciseName
    );
}
